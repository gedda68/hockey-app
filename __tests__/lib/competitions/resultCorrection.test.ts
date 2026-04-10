import { describe, expect, it } from "vitest";
import {
  evaluateResultCorrectionPolicy,
  mergeResultPatch,
  normalizeResultForCompare,
} from "@/lib/competitions/resultCorrection";

describe("resultCorrection (E7)", () => {
  it("mergeResultPatch fills missing fields from prior", () => {
    const merged = mergeResultPatch(
      { resultType: "normal", homeScore: 1, awayScore: 0 },
      {},
    );
    expect(normalizeResultForCompare(merged)).toBe(
      normalizeResultForCompare({
        resultType: "normal",
        homeScore: 1,
        awayScore: 0,
        shootoutHomeScore: null,
        shootoutAwayScore: null,
        forfeitingTeamId: null,
        notes: null,
      }),
    );
  });

  it("requires correctionReason when editing submitted scores", () => {
    const prior = { resultType: "normal", homeScore: 1, awayScore: 0 };
    const merged = mergeResultPatch(prior, { homeScore: 2 });
    const r = evaluateResultCorrectionPolicy({
      priorStatus: "submitted",
      priorResultRaw: prior,
      mergedResult: merged,
      nextStatus: "submitted",
      correctionReason: undefined,
      hasApprovePermission: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it("allows submitted score change with reason", () => {
    const prior = { resultType: "normal", homeScore: 1, awayScore: 0 };
    const merged = mergeResultPatch(prior, { homeScore: 2 });
    const r = evaluateResultCorrectionPolicy({
      priorStatus: "submitted",
      priorResultRaw: prior,
      mergedResult: merged,
      nextStatus: "submitted",
      correctionReason: "Score entry typo corrected",
      hasApprovePermission: false,
    });
    expect(r.ok).toBe(true);
  });

  it("blocks approved result edits without results.approve", () => {
    const prior = { resultType: "normal", homeScore: 1, awayScore: 0 };
    const merged = mergeResultPatch(prior, { homeScore: 2 });
    const r = evaluateResultCorrectionPolicy({
      priorStatus: "approved",
      priorResultRaw: prior,
      mergedResult: merged,
      nextStatus: "approved",
      correctionReason: "Official sheet showed 2-0 not 1-0",
      hasApprovePermission: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(403);
  });

  it("allows approved result edits with approver + reason", () => {
    const prior = { resultType: "normal", homeScore: 1, awayScore: 0 };
    const merged = mergeResultPatch(prior, { homeScore: 2 });
    const r = evaluateResultCorrectionPolicy({
      priorStatus: "approved",
      priorResultRaw: prior,
      mergedResult: merged,
      nextStatus: "approved",
      correctionReason: "Official sheet showed 2-0 not 1-0",
      hasApprovePermission: true,
    });
    expect(r.ok).toBe(true);
  });
});
