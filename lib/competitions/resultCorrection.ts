// lib/competitions/resultCorrection.ts
// Validation rules for editing existing fixture results (E7).

const CORRECTION_REASON_MIN = 10;
const CORRECTION_REASON_MAX = 2000;

export type ResultShape = {
  resultType: string;
  homeScore: number | null;
  awayScore: number | null;
  shootoutHomeScore: number | null;
  shootoutAwayScore: number | null;
  forfeitingTeamId: string | null;
  notes: string | null;
};

export function mergeResultPatch(
  prev: Record<string, unknown> | null | undefined,
  body: {
    resultType?: string;
    homeScore?: number | null;
    awayScore?: number | null;
    shootoutHomeScore?: number | null;
    shootoutAwayScore?: number | null;
    forfeitingTeamId?: string | null;
    notes?: string | null;
  },
): ResultShape {
  const p = prev ?? {};
  return {
    resultType: (body.resultType ?? p.resultType ?? "normal") as string,
    homeScore:
      body.homeScore !== undefined
        ? body.homeScore
        : ((p.homeScore as number | null | undefined) ?? null),
    awayScore:
      body.awayScore !== undefined
        ? body.awayScore
        : ((p.awayScore as number | null | undefined) ?? null),
    shootoutHomeScore:
      body.shootoutHomeScore !== undefined
        ? body.shootoutHomeScore
        : ((p.shootoutHomeScore as number | null | undefined) ?? null),
    shootoutAwayScore:
      body.shootoutAwayScore !== undefined
        ? body.shootoutAwayScore
        : ((p.shootoutAwayScore as number | null | undefined) ?? null),
    forfeitingTeamId:
      body.forfeitingTeamId !== undefined
        ? body.forfeitingTeamId
        : ((p.forfeitingTeamId as string | null | undefined) ?? null),
    notes: body.notes !== undefined ? body.notes : ((p.notes as string | null | undefined) ?? null),
  };
}

export function normalizeResultForCompare(r: ResultShape): string {
  return JSON.stringify({
    resultType: r.resultType,
    homeScore: r.homeScore,
    awayScore: r.awayScore,
    shootoutHomeScore: r.shootoutHomeScore,
    shootoutAwayScore: r.shootoutAwayScore,
    forfeitingTeamId: r.forfeitingTeamId,
    notes: r.notes,
  });
}

export function parsePriorResult(
  raw: unknown,
): ResultShape | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  return {
    resultType: (o.resultType as string) ?? "normal",
    homeScore: typeof o.homeScore === "number" ? o.homeScore : null,
    awayScore: typeof o.awayScore === "number" ? o.awayScore : null,
    shootoutHomeScore:
      typeof o.shootoutHomeScore === "number" ? o.shootoutHomeScore : null,
    shootoutAwayScore:
      typeof o.shootoutAwayScore === "number" ? o.shootoutAwayScore : null,
    forfeitingTeamId:
      typeof o.forfeitingTeamId === "string" ? o.forfeitingTeamId : null,
    notes: typeof o.notes === "string" ? o.notes : null,
  };
}

export type CorrectionPolicyOutcome =
  | { ok: true }
  | {
      ok: false;
      status: number;
      error: string;
    };

/**
 * E7: corrections to approved results need an approver; substantive edits to
 * submitted results need a reason; optional replay link is audit-only.
 */
export function evaluateResultCorrectionPolicy(input: {
  priorStatus: string | null | undefined;
  priorResultRaw: unknown;
  mergedResult: ResultShape;
  nextStatus: string;
  correctionReason: string | undefined;
  hasApprovePermission: boolean;
}): CorrectionPolicyOutcome {
  const prior = parsePriorResult(input.priorResultRaw);
  const priorNorm = prior ? normalizeResultForCompare(prior) : null;
  const mergedNorm = normalizeResultForCompare(input.mergedResult);
  const resultBodyChanged = priorNorm !== mergedNorm;
  const priorStatus = input.priorStatus ?? null;
  const statusChanged = priorStatus !== input.nextStatus;

  const reason = (input.correctionReason ?? "").trim();
  const reasonOk = reason.length >= CORRECTION_REASON_MIN && reason.length <= CORRECTION_REASON_MAX;

  if (priorStatus === "approved") {
    const isCorrection = resultBodyChanged || statusChanged;
    if (isCorrection) {
      if (!input.hasApprovePermission) {
        return {
          ok: false,
          status: 403,
          error:
            "Changing an approved result requires results.approve (corrections / replays).",
        };
      }
      if (!reasonOk) {
        return {
          ok: false,
          status: 400,
          error: `correctionReason is required (${CORRECTION_REASON_MIN}–${CORRECTION_REASON_MAX} chars) when modifying an approved result.`,
        };
      }
    }
  }

  if (priorStatus === "submitted" && resultBodyChanged) {
    if (!reasonOk) {
      return {
        ok: false,
        status: 400,
        error: `correctionReason is required (${CORRECTION_REASON_MIN}–${CORRECTION_REASON_MAX} chars) when changing a submitted result before approval.`,
      };
    }
  }

  return { ok: true };
}
