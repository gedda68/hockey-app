import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import TypeaheadSelect from "@/components/ui/TypeaheadSelect";

const options = [
  { value: "gender-male", label: "Male" },
  { value: "gender-female", label: "Female" },
  { value: "gender-other", label: "Other" },
];

describe("TypeaheadSelect", () => {
  it("lists every option on focus, even inside an overflow-hidden parent", async () => {
    render(<div style={{ overflow: "hidden", height: 10 }}><TypeaheadSelect options={options} value="" onChange={() => {}} ariaLabel="Gender" /></div>);
    await userEvent.click(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option").map((o) => o.textContent)).toEqual(["Male", "Female", "Other"]);
  });
  it("filters as you type and selects with Enter", async () => {
    const onChange = vi.fn();
    render(<TypeaheadSelect options={options} value="" onChange={onChange} ariaLabel="Gender" />);
    await userEvent.type(screen.getByRole("combobox"), "fem{Enter}");
    expect(onChange).toHaveBeenCalledWith("gender-female");
  });
  it("shows the selected label", () => {
    render(<TypeaheadSelect options={options} value="gender-male" onChange={() => {}} ariaLabel="Gender" />);
    expect(screen.getByRole("combobox")).toHaveValue("Male");
  });
});
