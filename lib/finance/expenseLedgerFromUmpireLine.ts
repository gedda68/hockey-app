import type { Db } from "mongodb";
import { v4 as uuidv4 } from "uuid";

const EXPENSE_LEDGER_COL = "expense_ledger";

/**
 * When an umpire match payment line is marked **paid**, mirror one row into the
 * association expense ledger (F3). Idempotent via unique index on
 * `{ referenceType: "umpire_payment_line", referenceId: paymentLineId }`.
 */
export async function recordExpenseLedgerForPaidUmpireLine(opts: {
  db: Db;
  associationId: string;
  paymentLineId: string;
  amountCents: number | null | undefined;
  fixtureId: string;
  seasonCompetitionId: string;
  umpireId: string;
  paidAtIso: string;
  createdBy: string;
}): Promise<void> {
  const amount =
    typeof opts.amountCents === "number" && Number.isFinite(opts.amountCents) && opts.amountCents > 0
      ? Math.floor(opts.amountCents)
      : 0;
  if (amount <= 0) return;

  const referenceId = opts.paymentLineId.trim();
  if (!referenceId) return;

  const existing = await opts.db.collection(EXPENSE_LEDGER_COL).findOne({
    referenceType: "umpire_payment_line",
    referenceId,
  });
  if (existing) return;

  const nowIso = new Date().toISOString();
  const desc =
    `Umpire honorarium — fixture ${opts.fixtureId} — official ${opts.umpireId} — line ${referenceId}`;

  await opts.db.collection(EXPENSE_LEDGER_COL).insertOne({
    entryId: `exp-${uuidv4()}`,
    scopeType: "association",
    scopeId: opts.associationId,
    date: opts.paidAtIso,
    amountCents: amount,
    gstIncluded: false,
    gstAmountCents: 0,
    accountId: null,
    costCentreId: null,
    categoryName: "Umpire honorarium",
    description: desc,
    source: "umpire_honorarium",
    status: "paid",
    referenceType: "umpire_payment_line",
    referenceId,
    seasonCompetitionId: opts.seasonCompetitionId,
    fixtureId: opts.fixtureId,
    payeeLabel: opts.umpireId,
    createdAt: nowIso,
    updatedAt: nowIso,
    createdBy: opts.createdBy,
    updatedBy: opts.createdBy,
  });
}
