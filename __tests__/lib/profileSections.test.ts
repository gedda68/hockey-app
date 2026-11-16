import { describe, it, expect } from "vitest";
import { sectionsFromCodes, fullSections, redactBySections, preserveBySections } from "@/lib/access/profileSections";

const codes = (members: any, medical: any = "-", childSafety: any = "-", usersRoles: any = "-") => ({ members, medical, childSafety, usersRoles });

const member = {
  memberId: "M1",
  personalInfo: { firstName: "Mia", lastName: "Lee", dateOfBirth: "2012-01-01", gender: "F" },
  contact: { primaryEmail: "a@b.c", emergencyContact: { name: "Mum" } },
  address: { suburb: "X" },
  membership: { status: "Active" },
  roles: ["role-player"],
  emergencyContacts: [{ name: "Mum" }],
  medical: { conditions: "Asthma" },
  healthcare: { medicare: { number: "123" } },
  blueCard: { number: "B1" },
  notes: "private",
};

describe("sectionsFromCodes", () => {
  it("a coach (Members R, Medical R) sees medical but cannot edit members, notes or healthcare", () => {
    const s = sectionsFromCodes(codes("R", "R"));
    expect(s.medical).toEqual({ view: true, edit: false });
    expect(s.contact).toEqual({ view: true, edit: false });
    expect(s.notes.view).toBe(false);
    expect(s.healthcare.view).toBe(false);
    expect(s.safeguarding.view).toBe(false);
  });
  it("a registrar (Members A) sees everything about the person but not medical detail without Medical access", () => {
    const s = sectionsFromCodes(codes("A", "-"));
    expect(s.notes.edit).toBe(true);
    expect(s.healthcare.view).toBe(true);
    expect(s.medical.view).toBe(false);
  });
  it("Members V only shows names; nothing else", () => {
    const s = sectionsFromCodes(codes("V"));
    expect(s.personal.view).toBe(true);
    expect(s.contact.view).toBe(false);
    expect(s.emergency.view).toBe(false);
  });
  it("Child Safety R reveals the Blue Card section; Users & Roles R reveals roles", () => {
    expect(sectionsFromCodes(codes("-", "-", "R")).safeguarding.view).toBe(true);
    expect(sectionsFromCodes(codes("R", "-", "-", "R")).roles.view).toBe(true);
    expect(sectionsFromCodes(codes("R")).roles.view).toBe(false);
  });
  it("Medical V alone lets a first aider see emergency contacts", () => {
    expect(sectionsFromCodes(codes("-", "V")).emergency.view).toBe(true);
  });
});

describe("redactBySections", () => {
  it("removes hidden sections and keeps the rest", () => {
    const r = redactBySections(member, sectionsFromCodes(codes("R", "R")));
    expect(r.medical).toBeDefined();
    expect(r.notes).toBeUndefined();
    expect(r.healthcare).toBeUndefined();
    expect(r.blueCard).toBeUndefined();
    expect(r.contact.primaryEmail).toBe("a@b.c");
  });
  it("shrinks personal info to names for Members V", () => {
    const r = redactBySections(member, sectionsFromCodes(codes("V")));
    expect(r.personalInfo).toEqual({ firstName: "Mia", lastName: "Lee" });
    expect(r.contact).toBeUndefined();
    expect(r.medical).toBeUndefined();
  });
  it("removes only the emergency contact from contact when contact is visible", () => {
    const r = redactBySections(member, sectionsFromCodes(codes("R")));
    expect(r.contact.primaryEmail).toBe("a@b.c");
    expect(r.contact.emergencyContact).toBeDefined(); // members R sees emergency
    const r2 = redactBySections(member, { ...fullSections(), emergency: { view: false, edit: false } });
    expect(r2.contact.emergencyContact).toBeUndefined();
    expect(r2.contact.primaryEmail).toBe("a@b.c");
    expect(r2.emergencyContacts).toBeUndefined();
  });
  it("full access leaves the record alone", () => {
    expect(redactBySections(member, fullSections())).toEqual(member);
  });
});

describe("fields the edit form saves outside the main sections", () => {
  const m = { ...member, socialMedia: { x: "1" }, communicationPreferences: { sms: true }, privacy: { contactPrivate: true }, playerInfo: { goals: 3 } };
  it("social, preferences and privacy follow Contact; player info follows Membership", () => {
    const viewOnly = sectionsFromCodes(codes("R"));
    const out = preserveBySections(m, { ...m, socialMedia: { x: "hacked" }, privacy: { contactPrivate: false }, playerInfo: { goals: 99 } }, viewOnly);
    expect(out.socialMedia).toEqual({ x: "1" });
    expect(out.privacy).toEqual({ contactPrivate: true });
    expect(out.playerInfo).toEqual({ goals: 3 });
    const editor = sectionsFromCodes(codes("E"));
    expect(preserveBySections(m, { ...m, playerInfo: { goals: 5 } }, editor).playerInfo).toEqual({ goals: 5 });
  });
  it("are hidden from people who cannot view those sections", () => {
    const r = redactBySections(m, sectionsFromCodes(codes("V")));
    expect(r.socialMedia).toBeUndefined();
    expect(r.playerInfo).toBeUndefined();
  });
});

describe("preserveBySections", () => {
  it("restores sections the person may not change, so a save can't wipe or alter them", () => {
    const secs = sectionsFromCodes(codes("E", "R"));
    const posted = { ...member, medical: { conditions: "changed" }, notes: undefined, contact: { primaryEmail: "new@x.y" } };
    const out = preserveBySections(member, posted, secs);
    expect(out.medical).toEqual(member.medical);   // Medical R: can't edit
    expect(out.notes).toBeUndefined();             // editable and not posted: left out of the update, so unchanged in the database
    expect(out.contact.primaryEmail).toBe("new@x.y");
    expect(out.healthcare).toEqual(member.healthcare);
  });
  it("keeps the stored emergency contact when emergency is not editable but contact is", () => {
    const secs = { ...fullSections(), emergency: { view: true, edit: false } };
    const out = preserveBySections(member, { ...member, contact: { primaryEmail: "n@n.n", emergencyContact: { name: "Hacker" } } }, secs);
    expect(out.contact.emergencyContact).toEqual({ name: "Mum" });
    expect(out.contact.primaryEmail).toBe("n@n.n");
  });
});
