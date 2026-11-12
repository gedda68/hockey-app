import { beforeEach, describe, expect, it } from "vitest";
import { act } from "react";
import { createRoot } from "react-dom/client";
import StandingsRow from "@/components/standings/StandingsRow";
import { FAVOURITES_STORAGE_KEY } from "@/lib/favourites/localFavourites";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const team = { club: "Bulimba BHL 1", teamId: "t-1", clubId: "c-1", pos: 1, pts: 12, p: 5, gd: 3 };

function mount() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  act(() => createRoot(host).render(<StandingsRow team={team} href="/competitions/matches?team=t-1" />));
  return host;
}

describe("StandingsRow favourite star", () => {
  beforeEach(() => window.localStorage.clear());

  it("shows the team and keeps the matches link", () => {
    const host = mount();
    expect(host.textContent).toContain("Bulimba BHL 1");
    expect(host.querySelector('a[href="/competitions/matches?team=t-1"]')).not.toBeNull();
  });

  it("toggles the favourite and stores it", () => {
    const host = mount();
    const btn = () => host.querySelector("button") as HTMLButtonElement;
    expect(btn().getAttribute("aria-pressed")).toBe("false");
    act(() => btn().click());
    expect(btn().getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem(FAVOURITES_STORAGE_KEY)).toContain("t-1");
    act(() => btn().click());
    expect(btn().getAttribute("aria-pressed")).toBe("false");
  });
});
