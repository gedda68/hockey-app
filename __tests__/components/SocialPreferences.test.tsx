import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SocialPreferences, { mergedSocial } from "@/components/admin/members/SocialPreferences";
import MemberRecordDetails from "@/components/admin/members/MemberRecordDetails";

const base = { socialMedia: { facebook: "fb.com/x" }, communicationPreferences: {}, privacy: {} };

describe("SocialPreferences", () => {
  it("defaults to private and flips an item to public", () => {
    const onChange = vi.fn();
    render(<SocialPreferences value={base} onChange={onChange} />);
    const sw = screen.getByRole("switch", { name: "Facebook: private" });
    fireEvent.click(sw);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ privacy: { socialMedia: { facebook: true } } }));
  });
  it("edits a handle", () => {
    const onChange = vi.fn();
    render(<SocialPreferences value={base} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Instagram"), { target: { value: "@me" } });
    expect(onChange.mock.calls[0][0].socialMedia).toEqual({ facebook: "fb.com/x", instagram: "@me" });
  });
  it("merges list-style and object-style social links", () => {
    expect(mergedSocial({ personalInfo: { socialMedia: [{ platform: "Instagram", handle: "@a" }] }, socialMedia: { facebook: "f" } })).toEqual({ instagram: "@a", facebook: "f" });
  });
});

describe("MemberRecordDetails history cards", () => {
  const member = {
    memberId: "m1",
    personalInfo: { relatedMembers: [{ memberId: "m2", relationship: "parent" }] },
    emergencyContacts: [{ name: "Pat Jones", relationship: "Mother", phone: "0400" }, { name: "Sam Kid", linkedMemberId: "m3" }],
    privacy: { socialMedia: { facebook: true } },
    socialMedia: { facebook: "fb.com/x" },
  };
  const related = {
    memberNames: { m2: "Ann Smith" },
    clubRegistrations: [{ registrationId: "r1", seasonYear: 2025, clubId: "c", status: "approved" }, { registrationId: "r2", seasonYear: 2026, clubId: "c", status: "approved" }],
    clubNames: { c: "Commercial HC" },
  };
  const teamHistory = [
    { year: "2026", team: "CHC Men 1", roles: ["Player", "Captain"], goals: 7, games: 12 },
    { year: "2025", team: "CHC Men 2", roles: ["Coach"], goals: 0, games: 0 },
  ];

  it("shows every team year with roles and goals, registrations with roles, family and emergency contacts", () => {
    render(<MemberRecordDetails member={member} related={related} teamHistory={teamHistory} />);
    expect(screen.getByText("CHC Men 1")).toBeTruthy();
    expect(screen.getByText("7")).toBeTruthy();
    expect(screen.getAllByText("Captain").length).toBeGreaterThan(0);
    // 2025 registration picks up the Coach role from that year's team history
    expect(screen.getAllByText("Coach").length).toBeGreaterThan(0);
    expect(screen.getByText("Ann Smith")).toBeTruthy();
    expect(screen.getByText("Pat Jones")).toBeTruthy();
    expect(screen.getByText("Not a member")).toBeTruthy();
    expect(screen.getByText("Public")).toBeTruthy();
  });
});
