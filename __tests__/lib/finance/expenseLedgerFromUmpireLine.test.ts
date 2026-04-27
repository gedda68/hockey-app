import { describe, it, expect, vi } from "vitest";
import { recordExpenseLedgerForPaidUmpireLine } from "@/lib/finance/expenseLedgerFromUmpireLine";

function makeDb() {
  const insertOne = vi.fn(async () => ({ insertedId: "x" }));
  const findOne = vi.fn(async () => null);
  return {
    collection: () => ({ findOne, insertOne }),
    __insertOne: insertOne,
    __findOne: findOne,
  };
}

describe("recordExpenseLedgerForPaidUmpireLine", () => {
  it("does not insert when amount is missing or non-positive", async () => {
    const db = makeDb() as any;
    await recordExpenseLedgerForPaidUmpireLine({
      db,
      associationId: "assoc-1",
      paymentLineId: "pl-1",
      amountCents: null,
      fixtureId: "fx",
      seasonCompetitionId: "sc",
      umpireId: "u1",
      paidAtIso: new Date().toISOString(),
      createdBy: "admin",
    });
    expect(db.__insertOne).not.toHaveBeenCalled();
  });

  it("inserts once when amount is positive and no existing row", async () => {
    const db = makeDb() as any;
    await recordExpenseLedgerForPaidUmpireLine({
      db,
      associationId: "assoc-1",
      paymentLineId: "pl-2",
      amountCents: 5500,
      fixtureId: "fx-1",
      seasonCompetitionId: "sc-1",
      umpireId: "u9",
      paidAtIso: "2026-04-28T00:00:00.000Z",
      createdBy: "treasurer",
    });
    expect(db.__findOne).toHaveBeenCalled();
    expect(db.__insertOne).toHaveBeenCalledTimes(1);
    const doc = db.__insertOne.mock.calls[0][0];
    expect(doc.referenceType).toBe("umpire_payment_line");
    expect(doc.referenceId).toBe("pl-2");
    expect(doc.amountCents).toBe(5500);
    expect(doc.source).toBe("umpire_honorarium");
  });

  it("is a no-op when a row already exists", async () => {
    const insertOne = vi.fn();
    const findOne = vi.fn(async () => ({ entryId: "exp-existing" }));
    const db = { collection: () => ({ findOne, insertOne }) };
    await recordExpenseLedgerForPaidUmpireLine({
      db: db as any,
      associationId: "assoc-1",
      paymentLineId: "pl-3",
      amountCents: 100,
      fixtureId: "fx",
      seasonCompetitionId: "sc",
      umpireId: "u1",
      paidAtIso: new Date().toISOString(),
      createdBy: "admin",
    });
    expect(insertOne).not.toHaveBeenCalled();
  });
});
