import { describe, it, expect } from "vitest";
import { playerViewFields, playerEditToMemberSet } from "@/lib/players/memberPlayerMap";

const member = {
  personalInfo: { gender: "gender-male", salutation: "Mr" },
  address: { street: "1 High St", suburb: "Carina", state: "QLD", postcode: "4152" },
  playerInfo: { primaryPosition: "Forward", jerseyNumber: 9 },
  medical: { allergies: "Nuts", medicare: { number: "123" }, privateHealth: { provider: "HCF", membershipNumber: "55" } },
};

describe("player view inherits member data", () => {
  it("exposes address, salutation, positions and medical flat", () => {
    const v = playerViewFields(member);
    expect(v).toMatchObject({ salutation: "Mr", street: "1 High St", state: "QLD", postcode: "4152", primaryPosition: "Forward", jerseyNumber: 9 });
    expect(v.medical).toMatchObject({ allergies: "Nuts", healthFundName: "HCF", healthFundNumber: "55", medicareNumber: "123" });
  });
  it("falls back to healthcare for medicare/provider and tolerates empty members", () => {
    expect(playerViewFields({ healthcare: { medicare: { number: "9" } } }).medical.medicareNumber).toBe("9");
    expect(playerViewFields({}).street).toBe("");
  });
});

describe("player edits write back to the member", () => {
  it("maps flat fields to member paths without touching others", () => {
    const set = playerEditToMemberSet({ gender: "gender-female", street: "2 Low Rd", state: "NSW", primaryPosition: "Goalkeeper", medical: { allergies: "None", healthFundName: "Bupa" } });
    expect(set).toEqual({
      "personalInfo.gender": "gender-female",
      "address.street": "2 Low Rd",
      "address.state": "NSW",
      "playerInfo.primaryPosition": "Goalkeeper",
      "medical.allergies": "None",
      "medical.privateHealth.provider": "Bupa",
    });
  });
});
