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
    await userEvent.click(await screen.findByRole("option", { name: /Smith, Ann/ }));
    await userEvent.click(await screen.findByRole("option", { name: /Smith, Bob/ }));

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
    expect(await screen.findByRole("option", { name: /Smith, Ann/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /Smith, Bob/ })).toBeNull();
    expect(screen.queryByRole("option", { name: /Smith, Cat/ })).toBeNull();
    expect(screen.getByText(/2 members not eligible/)).toBeTruthy();
  });
});

import { sortPlayers } from "@/components/admin/teams/modals/AddPlayerModal";
describe("sortPlayers", () => {
  const l = [
    { firstName: "Z", lastName: "Brown", memberNumber: "M-10" },
    { firstName: "A", lastName: "Adams", memberNumber: "M-9" },
    { firstName: "B", lastName: "Adams", memberNumber: "M-11" },
  ];
  it("orders by surname then first name", () => {
    expect(sortPlayers(l, "surname").map((p) => p.firstName)).toEqual(["A", "B", "Z"]);
  });
  it("orders by member number numerically", () => {
    expect(sortPlayers(l, "number").map((p) => p.memberNumber)).toEqual(["M-9", "M-10", "M-11"]);
  });
});
