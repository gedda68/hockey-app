import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import BlueCardSection from "@/components/admin/members/BlueCardSection";
import MemberRecordDetails from "@/components/admin/members/MemberRecordDetails";

describe("BlueCardSection", () => {
  it("warns when required and nothing recorded, and saves typed details", () => {
    const onChange = vi.fn();
    render(<BlueCardSection value={undefined} required onChange={onChange} roleNames={["coach"]} />);
    expect(screen.getByRole("status").textContent).toMatch(/valid blue card is required/i);
    fireEvent.change(screen.getByLabelText("Card number"), { target: { value: "1234567/1" } });
    expect(onChange).toHaveBeenCalledWith({ cardNumber: "1234567/1" });
    fireEvent.change(screen.getByLabelText("Expiry date"), { target: { value: "2029-05-01" } });
    expect(onChange).toHaveBeenLastCalledWith({ expiryDate: "2029-05-01" });
  });
  it("shows an exemption reason instead of card fields when exempt", () => {
    render(<BlueCardSection value={{ exempt: true }} required onChange={() => {}} />);
    expect(screen.getByLabelText("Reason for exemption")).toBeTruthy();
    expect(screen.queryByLabelText("Card number")).toBeNull();
  });
});

describe("profile blue card card visibility", () => {
  const adult = (roles: string[], extra = {}) => ({ memberId: "m", personalInfo: { dateOfBirth: "1990-01-01" }, roles, ...extra });
  it("is hidden for players and under-16s, shown for non-player adults", () => {
    const hide = render(<MemberRecordDetails member={adult(["role-player"])} related={{}} />);
    expect(hide.queryByText("Blue Card (Working with Children)")).toBeNull();
    hide.unmount();
    const young = render(<MemberRecordDetails member={{ ...adult(["role-coach"]), personalInfo: { dateOfBirth: new Date(Date.now() - 14 * 365.25 * 864e5).toISOString() } }} related={{}} />);
    expect(young.queryByText("Blue Card (Working with Children)")).toBeNull();
    young.unmount();
    render(<MemberRecordDetails member={adult(["role-coach"])} related={{}} />);
    expect(screen.getByText("Blue Card (Working with Children)")).toBeTruthy();
  });
});

import { waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach } from "vitest";

describe("verification controls", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, json: async () => ({ items: [{ memberId: "adm1", name: "Ada Admin" }, { memberId: "adm2", name: "Bob Boss" }] }) })));
  });
  afterEach(() => vi.unstubAllGlobals());

  it("nominates a verifier from the club admin list", async () => {
    const onChange = vi.fn();
    render(<BlueCardSection value={{}} required clubId="club-1" canVerify={false} onChange={onChange} />);
    const box = screen.getByRole("combobox", { name: "Verifier" });
    await userEvent.click(box);
    await userEvent.click(await screen.findByRole("option", { name: "Ada Admin" }));
    expect(onChange).toHaveBeenCalledWith({ verifierMemberId: "adm1", verifierName: "Ada Admin" });
  });

  it("locks the link tick and verification date unless the user is a club admin", async () => {
    const { unmount } = render(<BlueCardSection value={{}} required clubId="club-1" canVerify={false} onChange={() => {}} />);
    expect((screen.getByLabelText(/linked to our club/i) as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText("Last verified") as HTMLInputElement).disabled).toBe(true);
    expect(screen.getByText(/can only be updated by a club admin/i)).toBeTruthy();
    unmount();
    render(<BlueCardSection value={{}} required clubId="club-1" canVerify onChange={() => {}} />);
    await waitFor(() => expect((screen.getByLabelText("Last verified") as HTMLInputElement).disabled).toBe(false));
  });
});
