import { describe, expect, it } from "vitest";
import { cleanAnswers, cleanQuestions, cleanSurvey } from "@/lib/surveys/validate";
import { aggregate, toCsv } from "@/lib/surveys/aggregate";
import { SURVEY_TEMPLATES } from "@/lib/surveys/templates";
import { descendantAssociationIds, inGroups } from "@/lib/surveys/audience";
import { surveyCandidates } from "@/lib/surveys/candidates";
import { MIN_ANONYMOUS_RESPONSES, type SurveyQuestion } from "@/lib/surveys/types";

const qs: SurveyQuestion[] = [
  { id: "a", type: "single", text: "Pick", required: true, options: [{ id: "o1", label: "One" }, { id: "o2", label: "Two" }], allowOther: true },
  { id: "b", type: "multi", text: "Many", required: false, options: [{ id: "o1", label: "X" }, { id: "o2", label: "Y" }] },
  { id: "c", type: "scale10", text: "Score", required: true },
  { id: "d", type: "ranking", text: "Order", required: true, options: [{ id: "o1", label: "A" }, { id: "o2", label: "B" }, { id: "o3", label: "C" }] },
  { id: "e", type: "text", text: "Say", required: false },
  { id: "f", type: "yes_no", text: "Yes?", required: true },
];

describe("every ready-made template is valid", () => {
  for (const t of SURVEY_TEMPLATES) {
    it(t.name, () => { expect(cleanQuestions(t.questions).ok).toBe(true); });
  }
});

describe("cleanSurvey", () => {
  const base = { title: "T", level: "club", scopeId: "club-1", questions: qs, closesAt: "2030-01-10T00:00:00Z", opensAt: "2030-01-01T00:00:00Z" };
  it("accepts a complete survey", () => expect(cleanSurvey(base).ok).toBe(true));
  it("needs a scope below global", () => expect(cleanSurvey({ ...base, scopeId: "" })).toMatchObject({ ok: false }));
  it("must close after it opens", () => expect(cleanSurvey({ ...base, closesAt: "2029-01-01T00:00:00Z" })).toMatchObject({ ok: false }));
  it("a topic or competition survey needs a subject", () => {
    expect(cleanSurvey({ ...base, purpose: "topic" })).toMatchObject({ ok: false });
    expect(cleanSurvey({ ...base, purpose: "event", subject: { type: "event", label: "U16 State Titles, Maryborough", startDate: "2026-06-14", endDate: "2026-06-18" } }).ok).toBe(true);
  });
  it("global needs no scope and association reaches the ones below by default", () => {
    const g = cleanSurvey({ ...base, level: "global", scopeId: "" });
    expect(g).toMatchObject({ ok: true });
    const a = cleanSurvey({ ...base, level: "association", scopeId: "bha" });
    expect(a.ok && a.value.includeBelow).toBe(true);
  });
  it("keeps at least one way in", () => {
    const r = cleanSurvey({ ...base, delivery: { inApp: false, popup: false, email: false } });
    expect(r.ok && r.value.delivery.inApp).toBe(true);
  });
  it("rejects a choice question with fewer than two options", () => {
    expect(cleanQuestions([{ type: "single", text: "x", options: [{ label: "only" }] }])).toMatchObject({ ok: false });
  });
});

describe("cleanAnswers", () => {
  const good = [
    { questionId: "a", value: "o1" }, { questionId: "c", value: 8 }, { questionId: "d", value: ["o2", "o1", "o3"] }, { questionId: "f", value: "yes" },
  ];
  it("accepts valid answers", () => expect(cleanAnswers(qs, good).ok).toBe(true));
  it("requires required questions", () => expect(cleanAnswers(qs, good.slice(1))).toMatchObject({ ok: false }));
  it("rejects an option that isn't offered", () => expect(cleanAnswers(qs, [{ ...good[0], value: "zzz" }, ...good.slice(1)])).toMatchObject({ ok: false }));
  it("rejects a score out of range", () => expect(cleanAnswers(qs, [good[0], { questionId: "c", value: 11 }, good[2], good[3]])).toMatchObject({ ok: false }));
  it("rejects a partial ranking when required", () => expect(cleanAnswers(qs, [good[0], good[1], { questionId: "d", value: ["o1"] }, good[3]])).toMatchObject({ ok: false }));
  it("rejects answers to unknown questions", () => expect(cleanAnswers(qs, [...good, { questionId: "zz", value: 1 }])).toMatchObject({ ok: false }));
  it("allows 'other' text instead of a choice", () => expect(cleanAnswers(qs, [{ questionId: "a", value: null, other: "Something else" }, ...good.slice(1)]).ok).toBe(true));
});

describe("aggregate", () => {
  const r = (a: string, c: number, d: string[], f = "yes", extra: any = {}) => ({ answers: [{ questionId: "a", value: a, ...extra }, { questionId: "c", value: c }, { questionId: "d", value: d }, { questionId: "f", value: f }] });
  const rows = [r("o1", 10, ["o1", "o2", "o3"]), r("o1", 9, ["o1", "o3", "o2"]), r("o2", 3, ["o2", "o1", "o3"], "no"), r("o1", 8, ["o3", "o1", "o2"]), r("o2", 7, ["o1", "o2", "o3"])];
  it("counts choices, averages, NPS and rankings", () => {
    const res = aggregate(qs, rows, { anonymous: false, invited: 10 });
    expect(res.responseRate).toBe(50);
    expect(res.questions[0].choices).toMatchObject([{ id: "o1", count: 3, percent: 60 }, { id: "o2", count: 2, percent: 40 }]);
    expect(res.questions[2].average).toBe(7.4);
    expect(res.questions[2].nps).toBe(20); // 2 promoters (9–10), 1 detractor (0–6), of 5
  });
  it("anonymous surveys hold everything back until enough have answered", () => {
    const few = aggregate(qs, rows.slice(0, MIN_ANONYMOUS_RESPONSES - 1), { anonymous: true, invited: 20 });
    expect(few.visible).toBe(false);
    expect(few.questions).toEqual([]);
    expect(few.needed).toBe(1);
    expect(aggregate(qs, rows, { anonymous: true, invited: 20 }).visible).toBe(true);
  });
  it("ranking puts the highest priority first", () => {
    const rk = aggregate(qs, rows, { anonymous: false, invited: 5 }).questions[3].ranking!;
    expect(rk[0].id).toBe("o1");
  });
});

describe("toCsv", () => {
  const rows = [{ answers: [{ questionId: "a", value: "o1" }, { questionId: "e", value: "=SUM(A1)" }], memberId: "MBR-1", memberName: "Sam", submittedAt: "2026-01-01T10:00:00Z" }];
  it("names people only on a non-anonymous survey, and neutralises formulas", () => {
    const named = toCsv(qs, rows, false);
    expect(named).toContain("Sam");
    expect(named).toContain("'=SUM(A1)");
    const anon = toCsv(qs, rows, true);
    expect(anon).not.toContain("Sam");
    expect(anon).not.toContain("MBR-1");
    expect(anon).not.toContain("10:00");
  });
});

describe("audience helpers", () => {
  it("finds an association and everything below it", () => {
    const rows = [{ associationId: "ha" }, { associationId: "hq", parentAssociationId: "ha" }, { associationId: "bha", parentAssociationId: "hq" }, { associationId: "other", parentAssociationId: "x" }];
    expect(descendantAssociationIds(rows, "hq").sort()).toEqual(["bha", "hq"]);
    expect(descendantAssociationIds(rows, "ha").sort()).toEqual(["bha", "ha", "hq"]);
  });
  it("groups match on roles or being rostered; none chosen means everyone", () => {
    expect(inGroups([], [], false)).toBe(true);
    expect(inGroups(["umpire"], ["umpire"], false)).toBe(true);
    expect(inGroups(["player"], [], true)).toBe(true);
    expect(inGroups(["coach"], ["umpire"], true)).toBe(false);
  });
});

describe("surveyCandidates", () => {
  const now = new Date("2026-06-10T00:00:00Z");
  const base = { surveyId: "SRV-1", title: "Season feedback", level: "club" as const, scopeId: "club-1", opensAt: "2026-06-01T00:00:00Z", closesAt: "2026-06-30T00:00:00Z", status: "open" };
  it("notifies for an open survey, once per survey", () => {
    const [c] = surveyCandidates([base], now);
    expect(c.dedupeKey).toBe("survey:SRV-1");
    expect(c.category).toBe("surveys");
    expect(c.link).toBe("/admin/my-surveys/SRV-1");
  });
  it("names the child when answering for one", () => expect(surveyCandidates([{ ...base, onBehalfOf: "Sam" }], now)[0].title).toContain("Sam"));
  it("skips closed, not-yet-open and past-deadline surveys", () => {
    expect(surveyCandidates([{ ...base, status: "closed" }], now)).toEqual([]);
    expect(surveyCandidates([{ ...base, opensAt: "2026-06-20T00:00:00Z" }], now)).toEqual([]);
    expect(surveyCandidates([{ ...base, closesAt: "2026-06-05T00:00:00Z" }], now)).toEqual([]);
  });
});
