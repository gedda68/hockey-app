import { describe, it, expect } from "vitest";
import { BulkOfficialRegisterImportSchema } from "@/lib/db/schemas/officialRegister.schema";

describe("BulkOfficialRegisterImportSchema", () => {
  it("accepts wrapper with one valid record", () => {
    const parsed = BulkOfficialRegisterImportSchema.parse({
      records: [
        {
          displayName: "Alex Umpire",
          umpireNumber: "00042",
        },
      ],
    });
    expect(parsed.records).toHaveLength(1);
    expect(parsed.records[0].displayName).toBe("Alex Umpire");
  });

  it("rejects empty records array", () => {
    expect(() =>
      BulkOfficialRegisterImportSchema.parse({ records: [] }),
    ).toThrow();
  });

  it("rejects more than 100 records", () => {
    const records = Array.from({ length: 101 }, (_, i) => ({
      displayName: `Name ${i}`,
      umpireNumber: String(i),
    }));
    expect(() =>
      BulkOfficialRegisterImportSchema.parse({ records }),
    ).toThrow();
  });

  it("rejects record without memberId or umpireNumber", () => {
    expect(() =>
      BulkOfficialRegisterImportSchema.parse({
        records: [{ displayName: "Only name" }],
      }),
    ).toThrow();
  });

  it("accepts optional homeRegion and nationalRegisterId", () => {
    const parsed = BulkOfficialRegisterImportSchema.parse({
      records: [
        {
          displayName: "Pat",
          memberId: "CHC-0000001",
          homeRegion: "QLD — Brisbane",
          nationalRegisterId: "AB12/CD-34",
        },
      ],
    });
    expect(parsed.records[0].homeRegion).toBe("QLD — Brisbane");
    expect(parsed.records[0].nationalRegisterId).toBe("AB12/CD-34");
  });
});
