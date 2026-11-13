import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import TypeaheadMultiSelect from "@/components/ui/TypeaheadMultiSelect";
import { normalisePicks } from "@/lib/members/membershipOptions";

const opts = [
  { value: "role-player", label: "Player" },
  { value: "role-coach", label: "Coach" },
  { value: "role-umpire", label: "Umpire" },
];
function Harness({ start = [] as string[], spy = vi.fn() }) {
  const [v, setV] = useState(start);
  return <TypeaheadMultiSelect options={opts} values={v} onChange={(x) => { spy(x); setV(x); }} ariaLabel="Roles" />;
}

describe("TypeaheadMultiSelect", () => {
  it("filters, selects several and removes with the chip ×", async () => {
    const spy = vi.fn();
    render(<Harness spy={spy} />);
    const box = screen.getByRole("combobox");
    await userEvent.click(box);
    await userEvent.type(box, "co");
    expect(screen.queryByRole("option", { name: /Player/ })).toBeNull();
    await userEvent.click(screen.getByRole("option", { name: /Coach/ }));
    await userEvent.clear(box);
    await userEvent.click(screen.getByRole("option", { name: /Umpire/ }));
    expect(spy).toHaveBeenLastCalledWith(["role-coach", "role-umpire"]);
    await userEvent.click(screen.getByRole("button", { name: "Remove Coach" }));
    expect(spy).toHaveBeenLastCalledWith(["role-umpire"]);
  });
  it("shows already-saved values as chips and keeps unknown ids visible", () => {
    render(<Harness start={["role-player", "role-old"]} />);
    expect(screen.getByText("Player")).toBeTruthy();
    expect(screen.getByText("role-old")).toBeTruthy();
  });
});

describe("normalisePicks", () => {
  it("uses typeId/roleId, drops inactive, sorts", () => {
    const r = normalisePicks([
      { roleId: "role-b", name: "B" }, { roleId: "role-a", name: "A" }, { roleId: "role-x", name: "X", active: false },
    ], ["roleId"]);
    expect(r.map((x) => x.id)).toEqual(["role-a", "role-b"]);
  });
});
