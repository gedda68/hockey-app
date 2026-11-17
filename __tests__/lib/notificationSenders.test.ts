import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendEmail = vi.hoisted(() => vi.fn(async () => ({ success: true })));
vi.mock("@/lib/email/client", () => ({ sendEmail, APP_URL: "https://app.example.com/" }));

import { liveChannels, senderFor } from "@/lib/notifications/channels";
import { sendNotificationEmail } from "@/lib/notifications/senders/email";
import { sendNotificationSms, smsText, toE164 } from "@/lib/notifications/senders/sms";
import { sendNotificationWhatsApp, templateField } from "@/lib/notifications/senders/whatsapp";
import { matchCandidates } from "@/lib/notifications/candidates";

const n = { dedupeKey: "k", level: "club", category: "matches", type: "t", title: "Lions v Tigers", message: "Sat 9am <b>", link: "/admin/notifications", eventAt: "", expiresAt: "" } as never;
const db = {} as never;
const ENV = ["WHATSAPP_PHONE_NUMBER_ID", "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_TEMPLATE_NAME", "WHATSAPP_TEMPLATE_LANG", "RESEND_API_KEY", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_FROM"];

beforeEach(() => { vi.clearAllMocks(); ENV.forEach((k) => delete process.env[k]); });
afterEach(() => vi.unstubAllGlobals());

describe("channel availability", () => {
  it("only offers in-app until keys are configured", () => {
    expect(liveChannels()).toEqual(["inApp"]);
    process.env.RESEND_API_KEY = "re_x";
    expect(liveChannels()).toEqual(["inApp", "email"]);
    Object.assign(process.env, { TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "t", TWILIO_FROM: "+61400000000" });
    expect(liveChannels()).toEqual(["inApp", "email", "sms"]);
    expect(senderFor("social")).toBeUndefined();
    Object.assign(process.env, { WHATSAPP_PHONE_NUMBER_ID: "1", WHATSAPP_ACCESS_TOKEN: "t", WHATSAPP_TEMPLATE_NAME: "alert" });
    expect(liveChannels()).toEqual(["inApp", "email", "sms", "social"]);
  });
});

describe("email sender", () => {
  it("sends an escaped email with an absolute link", async () => {
    await sendNotificationEmail(n, { memberId: "m", email: "a@b.com" }, db);
    const arg = (sendEmail.mock.calls[0] as unknown as [{ to: string; html: string; text: string }])[0];
    expect(arg.to).toBe("a@b.com");
    expect(arg.html).toContain("&lt;b&gt;");
    expect(arg.html).toContain("https://app.example.com/admin/notifications");
  });
  it("does nothing without an address, and throws when sending fails", async () => {
    await expect(sendNotificationEmail(n, { memberId: "m", email: null }, db)).rejects.toThrow(/No email/);
    expect(sendEmail).not.toHaveBeenCalled();
    sendEmail.mockResolvedValueOnce({ success: false });
    await expect(sendNotificationEmail(n, { memberId: "m", email: "a@b.com" }, db)).rejects.toThrow();
  });
});

describe("sms sender", () => {
  it("normalises Australian mobiles and rejects junk", () => {
    expect(toE164("0412 345 678")).toBe("+61412345678");
    expect(toE164("+14155550100")).toBe("+14155550100");
    expect(toE164("12345")).toBeNull();
    expect(toE164(null)).toBeNull();
  });
  it("trims long texts", () => { expect(smsText("T", "x".repeat(500)).length).toBe(300); });
  it("posts to Twilio only when configured and a valid number exists", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await sendNotificationSms(n, { memberId: "m", mobile: "0412345678" }, db);
    expect(fetchMock).not.toHaveBeenCalled();
    Object.assign(process.env, { TWILIO_ACCOUNT_SID: "AC1", TWILIO_AUTH_TOKEN: "t", TWILIO_FROM: "+61400000000" });
    await expect(sendNotificationSms(n, { memberId: "m", mobile: "nope" }, db)).rejects.toThrow(/mobile/);
    expect(fetchMock).not.toHaveBeenCalled();
    await sendNotificationSms(n, { memberId: "m", mobile: "0412345678" }, db);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: URLSearchParams }];
    expect(url).toContain("/Accounts/AC1/Messages.json");
    expect(init.body.get("To")).toBe("+61412345678");
    expect(init.body.get("From")).toBe("+61400000000");
  });
});

describe("guardian match notifications", () => {
  const fx = [{ fixtureId: "F1", homeTeamId: "T1", awayTeamId: "T2", scheduledStart: "2026-06-02T00:00:00Z", status: "scheduled" }];
  const names = new Map([["T1", "Lions"], ["T2", "Tigers"]]);
  const now = new Date("2026-06-01T00:00:00Z");
  it("names the child and keeps keys distinct from the guardian's own", () => {
    const [mine] = matchCandidates(fx, new Set(["T1"]), names, new Map(), now);
    const [kid] = matchCandidates(fx, new Set(["T1"]), names, new Map(), now, 72, { memberId: "MBR-K", name: "Sam" });
    expect(kid.title).toBe("Sam: Lions v Tigers");
    expect(kid.dedupeKey).not.toBe(mine.dedupeKey);
    expect(kid.dedupeKey.endsWith(":MBR-K")).toBe(true);
  });
});

describe("whatsapp sender", () => {
  it("cleans template fields", () => {
    expect(templateField("a\nb\t c")).toBe("a b c");
    expect(templateField("")).toBe("-");
    expect(templateField("x".repeat(300)).length).toBe(200);
  });
  it("sends the template to the number without a plus, only when configured", async () => {
    const fetchMock = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal("fetch", fetchMock);
    await sendNotificationWhatsApp(n, { memberId: "m", mobile: "0412345678" }, db);
    expect(fetchMock).not.toHaveBeenCalled();
    Object.assign(process.env, { WHATSAPP_PHONE_NUMBER_ID: "999", WHATSAPP_ACCESS_TOKEN: "tok", WHATSAPP_TEMPLATE_NAME: "alert" });
    await expect(sendNotificationWhatsApp(n, { memberId: "m", mobile: "bad" }, db)).rejects.toThrow(/mobile/);
    expect(fetchMock).not.toHaveBeenCalled();
    await sendNotificationWhatsApp(n, { memberId: "m", mobile: "0412345678" }, db);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, { body: string; headers: Record<string, string> }];
    const body = JSON.parse(init.body);
    expect(url).toContain("/999/messages");
    expect(init.headers.Authorization).toBe("Bearer tok");
    expect(body.to).toBe("61412345678");
    expect(body.template).toMatchObject({ name: "alert", language: { code: "en_AU" } });
    expect(body.template.components[0].parameters[0].text).toBe("Lions v Tigers");
  });
  it("throws when WhatsApp refuses", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 400 })));
    Object.assign(process.env, { WHATSAPP_PHONE_NUMBER_ID: "999", WHATSAPP_ACCESS_TOKEN: "tok", WHATSAPP_TEMPLATE_NAME: "alert" });
    await expect(sendNotificationWhatsApp(n, { memberId: "m", mobile: "0412345678" }, db)).rejects.toThrow();
  });
});
