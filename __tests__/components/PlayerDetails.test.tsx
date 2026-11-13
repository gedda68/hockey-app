import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import PlayerDetails from "@/components/admin/members/PlayerDetails";

const stats = { gamesSeason: 12, gamesTotal: 140, goalsSeason: 5, goalsTotal: 61, season: 2026 };

describe("PlayerDetails", () => {
  it("shows games and goals, no preferred foot", () => {
    render(<PlayerDetails playerInfo={{ primaryPosition: "Forward", jerseyNumber: 9 }} stats={stats} />);
    expect(screen.getByText("140")).toBeTruthy();
    expect(screen.getByText("61")).toBeTruthy();
    expect(screen.getByText("Games 2026")).toBeTruthy();
    expect(screen.queryByText(/preferred foot/i)).toBeNull();
    expect(screen.getByText("Forward")).toBeTruthy();
  });
  it("edits jersey number when editable", () => {
    const onChange = vi.fn();
    render(<PlayerDetails playerInfo={{ primaryPosition: "Forward" }} stats={stats} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Jersey number"), { target: { value: "11" } });
    expect(onChange).toHaveBeenCalledWith({ primaryPosition: "Forward", jerseyNumber: 11 });
  });
});
