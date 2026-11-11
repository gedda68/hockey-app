import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
import ClubPeopleSearch from "@/components/clubs/ClubPeopleSearch";

const options = [
  { memberId: "a", name: "Zoë Adams", teams: ["CHC BHL 1"] },
  { memberId: "b", name: "Adam Brown", teams: ["CHC JHL U14A"] },
];

describe("ClubPeopleSearch", () => {
  it("shows a dropdown while typing and goes to the chosen player", async () => {
    push.mockClear();
    const user = userEvent.setup();
    render(<ClubPeopleSearch basePath="/clubs/c/players" options={options} />);
    await user.type(screen.getByRole("combobox"), "ada");
    const opts = screen.getAllByRole("option");
    expect(opts.map((o) => o.textContent)).toEqual(["Adam BrownCHC JHL U14A", "Zoë AdamsCHC BHL 1"]);
    await user.keyboard("{ArrowDown}{ArrowDown}{Enter}");
    expect(push).toHaveBeenCalledWith("/clubs/c/players?q=Zo%C3%AB%20Adams");
  });

  it("Enter without a choice filters by the typed text; clicking an option chooses it", async () => {
    push.mockClear();
    const user = userEvent.setup();
    render(<ClubPeopleSearch basePath="/clubs/c/players" options={options} />);
    await user.type(screen.getByRole("combobox"), "bhl{Enter}");
    expect(push).toHaveBeenLastCalledWith("/clubs/c/players?q=bhl");
    await user.clear(screen.getByRole("combobox"));
    await user.type(screen.getByRole("combobox"), "brown");
    await user.click(screen.getByRole("option"));
    expect(push).toHaveBeenLastCalledWith("/clubs/c/players?q=Adam%20Brown");
  });
});
