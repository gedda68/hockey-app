import { describe, it, expect } from "vitest";
import { buildReport, change, cleanRange, ctr, daysIn, fillDays, previousRange, reportCsv } from "@/lib/sponsors/report";
import { renderSponsorPage } from "@/lib/sponsors/reportHtml";
import { cleanSource, isAutomated } from "@/lib/sponsors/track";
import { recordImpressions, sponsorReport } from "@/lib/sponsors/service";
import { partnerRefFromRow } from "@/lib/analytics/partnerStripClick";
import { writableDb, type Doc } from "../helpers/writableDb";

describe("ranges", () => {
  it("defaults to the last 30 days, puts dates the right way round and caps at a year", () => {
    expect(cleanRange(null, null, "2026-11-18")).toEqual({ from: "2026-10-20", to: "2026-11-18" });
    expect(cleanRange("2026-11-10", "2026-11-01")).toEqual({ from: "2026-11-01", to: "2026-11-10" });
    expect(cleanRange("junk", "2026-11-18")).toEqual({ from: "2026-10-20", to: "2026-11-18" });
    const long = cleanRange("2020-01-01", "2026-11-18");
    expect(daysIn(long.from, long.to)).toBe(366);
  });
  it("the previous period is the same length straight before", () => {
    expect(previousRange("2026-11-01", "2026-11-10")).toEqual({ from: "2026-10-22", to: "2026-10-31" });
    expect(fillDays("2026-02-27", "2026-03-02")).toEqual(["2026-02-27", "2026-02-28", "2026-03-01", "2026-03-02"]);
  });
  it("click-through and change are sensible with nothing to divide by", () => {
    expect(ctr(5, 200)).toBe(2.5);
    expect(ctr(5, 0)).toBe(0);
    expect(change(150, 100)).toBe(50);
    expect(change(50, 100)).toBe(-50);
    expect(change(10, 0)).toBeNull();
  });
});

const range = { from: "2026-11-01", to: "2026-11-03" };
const r = (partnerRef: string, label: string, day: string, extra: Doc) => ({ partnerRef, label, day, ...extra });
describe("buildReport", () => {
  const rows = [
    r("a", "Acme Sports", "2026-11-01", { source: "site", impressions: 100, clicks: 4 }),
    r("a", "Acme Sports", "2026-11-02", { source: "portal", impressions: 50, clicks: 1 }),
    r("a", "Acme Sports", "2026-11-02", { impressions: 10 }), // older rows have no source: they were the public site
    r("b", "Bakery", "2026-11-03", { source: "site", impressions: 20, clicks: 0 }),
    r("a", "Acme Sports", "2026-12-25", { source: "site", impressions: 999 }), // outside the range
  ];
  const prev = [r("a", "Acme Sports", "2026-10-30", { impressions: 80, clicks: 2 })];
  const rep = buildReport(rows, prev, range, [{ partnerRef: "c", label: "Quiet Co" }]);
  it("adds up per sponsor with the split by where it was seen, and compares with before", () => {
    const a = rep.sponsors[0];
    expect(a).toMatchObject({ partnerRef: "a", impressions: 160, clicks: 5, ctr: 3.13, impressionsChange: 100, clicksChange: 150 });
    expect(a.bySource.site).toEqual({ impressions: 110, clicks: 4 });
    expect(a.bySource.portal).toEqual({ impressions: 50, clicks: 1 });
    expect(a.daily.map((d) => d.impressions)).toEqual([100, 60, 0]);
    expect(rep.totals).toEqual({ impressions: 180, clicks: 5, ctr: 2.78 });
  });
  it("lists a sponsor with no activity, with zeros", () => {
    expect(rep.sponsors.find((s) => s.partnerRef === "c")).toMatchObject({ label: "Quiet Co", impressions: 0, clicks: 0, impressionsChange: null });
  });
  it("makes a spreadsheet that can't run formulas", () => {
    const evil = buildReport([r("x", "=HYPERLINK(\"http://evil\")", "2026-11-01", { impressions: 1 })], [], range);
    expect(reportCsv(evil)).toContain("\"'=HYPERLINK(");
    const csv = reportCsv(rep).split("\n");
    expect(csv[0]).toContain("Impressions");
    expect(csv[1]).toBe("Acme Sports,160,5,3.13,80,2,110,4,50,1");
    expect(csv).toContain("2026-11-02,Acme Sports,60,1");
  });
});

describe("the page for a sponsor", () => {
  it("shows the numbers and escapes names", () => {
    const rep = buildReport([r("a", "Acme <b>&</b>", "2026-11-01", { impressions: 1234, clicks: 12 })], [], range);
    const html = renderSponsorPage({ orgName: "Chermside \"Hawks\"", sponsor: rep.sponsors[0], range, reach: { members: 310 }, color: "#112233", generatedAt: new Date("2026-11-18T00:00:00Z") });
    expect(html).toContain("1,234");
    expect(html).toContain("Acme &lt;b&gt;&amp;&lt;/b&gt;");
    expect(html).toContain("Chermside &quot;Hawks&quot;");
    expect(html).toContain("310");
    expect(html).toContain("#112233");
    expect(html).not.toContain("<b>&</b>");
    expect(renderSponsorPage({ orgName: "X", sponsor: rep.sponsors[0], range, color: "red; background:url(x)", generatedAt: new Date() })).not.toContain("url(x)");
  });
});

describe("tracking", () => {
  it("leaves out crawlers and link previews, and unknown sources count as the website", () => {
    expect(isAutomated("Googlebot/2.1")).toBe(true);
    expect(isAutomated("WhatsApp/2.23")).toBe(true);
    expect(isAutomated("")).toBe(true);
    expect(isAutomated("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0) AppleWebKit/605.1.15 Safari/604.1")).toBe(false);
    expect(cleanSource("portal")).toBe("portal");
    expect(cleanSource("anything")).toBe("site");
  });
});

describe("recording and reading", () => {
  const partners = [{ name: "Acme", url: "https://acme.test" }, { name: "Bakery" }];
  const ref = (i: number) => partnerRefFromRow(partners[i].name, (partners[i] as { url?: string }).url);
  const mk = () => ({ clubs: [{ id: "chc", publicPartners: partners }], partner_strip_click_daily: [] as Doc[] });
  it("counts each listed sponsor once per call, per day and source, and ignores bad slots", async () => {
    const t = mk(), db = writableDb(t);
    const now = new Date("2026-11-02T03:00:00Z");
    expect(await recordImpressions(db, { scopeType: "club", scopeId: "chc", slots: [0, 1, 1, 7, -1], source: "site", now })).toBe(2);
    await recordImpressions(db, { scopeType: "club", scopeId: "chc", slots: [0], source: "site", now });
    await recordImpressions(db, { scopeType: "club", scopeId: "chc", slots: [0], source: "portal", now });
    const acmeSite = t.partner_strip_click_daily.find((d) => d.partnerRef === ref(0) && d.source === "site")!;
    expect(acmeSite).toMatchObject({ day: "2026-11-02", impressions: 2, label: "Acme" });
    expect(t.partner_strip_click_daily.find((d) => d.partnerRef === ref(0) && d.source === "portal")!.impressions).toBe(1);
    expect(await recordImpressions(db, { scopeType: "club", scopeId: "nope", slots: [0], source: "site", now })).toBe(0);
  });
  it("reports clicks that were recorded before impressions existed, under any id the club is known by", async () => {
    const t = mk();
    t.partner_strip_click_daily.push({ scopeType: "club", scopeId: "chc", partnerRef: ref(0), label: "Acme", day: "2026-11-01", clicks: 3 });
    t.partner_strip_click_daily.push({ scopeType: "club", scopeId: "chc-slug", partnerRef: ref(0), label: "Acme", day: "2026-11-01", impressions: 40, source: "portal" });
    t.partner_strip_click_daily.push({ scopeType: "club", scopeId: "someone-else", partnerRef: ref(0), label: "Acme", day: "2026-11-01", impressions: 9999 });
    const rep = await sponsorReport(writableDb(t), "club", ["chc", "chc-slug"], range);
    const acme = rep.sponsors.find((s) => s.partnerRef === ref(0))!;
    expect(acme).toMatchObject({ impressions: 40, clicks: 3 });
    expect(rep.sponsors.map((s) => s.label).sort()).toEqual(["Acme", "Bakery"]);
  });
});
