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
