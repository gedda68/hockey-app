import { describe, expect, it } from "vitest";
import { partnerRefFromRow } from "@/lib/analytics/partnerStripClick";

describe("partnerRefFromRow", () => {
  it("is stable for same name and URL", () => {
    const a = partnerRefFromRow("Acme Sports", "https://acme.example/sponsor");
    const b = partnerRefFromRow("Acme Sports", "https://acme.example/sponsor");
    expect(a).toBe(b);
    expect(a.length).toBe(20);
  });

  it("differs when URL changes", () => {
    const a = partnerRefFromRow("Acme", "https://a.example");
    const b = partnerRefFromRow("Acme", "https://b.example");
    expect(a).not.toBe(b);
  });

  it("is case-insensitive on name and URL", () => {
    const a = partnerRefFromRow("ACME", "HTTPS://X.EXAMPLE");
    const b = partnerRefFromRow("acme", "https://x.example");
    expect(a).toBe(b);
  });
});
