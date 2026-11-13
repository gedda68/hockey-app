import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import AddPlayerModal from "@/components/admin/teams/modals/AddPlayerModal";

const roster: any = {
  id: "r1",
  clubId: "c1",
  clubName: "Club",
  division: "BHL1",
  category: "senior",
  gender: "male",
  season: "2026",
  teams: [{ name: "BHL2", players: [] }],
  shadowPlayers: [],
  withdrawn: [],
};
const mk = (id: string, first: string, extra: any = {}) => ({
  id, playerId: id, memberId: id, firstName: first, lastName: "Smith",
  dateOfBirth: "2000-01-01", memberNumber: id, ...extra,
});

beforeEach(() => {
  globalThis.fetch = vi.fn().mockResolvedValue({
    json: async () => ({
      players: [mk("M1", "Ann", { primaryPosition: "Forward" }), mk("M2", "Bob")],
    }),
  }) as any;
});

describe("AddPlayerModal", () => {
  it("selects several players and submits a number + position for each", async () => {
    const onSubmit = vi.fn();
    render(<AddPlayerModal roster={roster} teamIndex={0} onClose={() => {}} onSubmit={onSubmit} />);
    const box = await screen.findByRole("combobox", { name: "Players" });
    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    await userEvent.click(box);
    await userEvent.click(await screen.findByRole("option", { name: /Ann Smith/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Bob Smith/ }));

    await userEvent.type(screen.getByLabelText("Jersey number for Ann Smith"), "7");
    await userEvent.type(screen.getByLabelText("Jersey number for Bob Smith"), "9");
    const pos = screen.getByLabelText("Position for Bob Smith");
    await userEvent.click(pos);
    await userEvent.click(await screen.findByRole("option", { name: "Goalkeeper" }));

    await userEvent.click(screen.getByRole("button", { name: "Add 2 players" }));
    expect(onSubmit).toHaveBeenCalledWith([
      { playerId: "M1", number: "7", position: "Forward" }, // defaulted from primary position
      { playerId: "M2", number: "9", position: "Goalkeeper" },
    ]);
  });
});

describe("AddPlayerModal eligibility", () => {
  it("hides members two grades apart or under 15 and explains why", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      json: async () => ({
        players: [
          mk("M1", "Ann", { dateOfBirth: "1990-01-01", currentTeams: [{ teamName: "BHL2", rosterId: "x" }] }),
          mk("M2", "Bob", { dateOfBirth: "1990-01-01", currentTeams: [{ teamName: "BHL1", rosterId: "x" }] }),
          mk("M3", "Cat", { dateOfBirth: "2014-01-01" }),
        ],
      }),
    }) as any;
    const r: any = { ...roster, teams: [{ name: "BHL3", players: [] }] };
    render(<AddPlayerModal roster={r} teamIndex={0} onClose={() => {}} onSubmit={vi.fn()} />);
    const box = await screen.findByRole("combobox", { name: "Players" });
    await userEvent.click(box);
    expect(await screen.findByRole("option", { name: /Ann Smith/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Bob Smith/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /Cat Smith/ })).toBeNull();
    expect(screen.getByText(/2 members not eligible/)).toBeTruthy();
  });
});
