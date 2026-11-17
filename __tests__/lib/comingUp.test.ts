import { describe, expect, it } from "vitest";
import { assemble, dayLabel, matchItem, rolesOnTeam, roleTag, type ComingUpItem } from "@/lib/comingUp/build";

const NOW = new Date("2026-11-18T00:00:00Z"); // 10am Brisbane
const team = { teamId: "t1", roster: [{ memberId: "M1", roleId: "role-player", status: "active" }, { memberId: "M2", roleId: "coach", status: "active" }, { memberId: "M3", roleId: "team-manager", status: "inactive" }] };

describe("rolesOnTeam", () => {
  it("reads playing, coaching and managing from the roster", () => {
    expect(rolesOnTeam(team, "M1", [], NOW)).toEqual(["Playing"]);
    expect(rolesOnTeam(team, "M2", [], NOW)).toEqual(["Coaching"]);
    expect(rolesOnTeam(team, "M3", [], NOW)).toEqual([]);
  });
  it("adds coach/manager role holdings scoped to the team, ignoring ended and other-team ones", () => {
    const holdings = [
      { roleKey: "club:head-coach", teamIds: ["t1"] },
      { roleKey: "club:team-manager", teamIds: ["t1"], status: "ended" },
      { roleKey: "club:assistant-coach", teamIds: ["t9"] },
    ];
    expect(rolesOnTeam(team, "M1", holdings, NOW).sort()).toEqual(["Coaching", "Playing"]);
    expect(roleTag(["Playing", "Coaching"])).toBe("Coaching · Playing");
  });
});

describe("matchItem", () => {
  const f = { fixtureId: "F1", homeTeamId: "t1", awayTeamId: "t2", scheduledStart: "2026-11-19T02:00:00Z", venueName: "Main", round: 5 };
  const names = new Map([["t1", "MHL 1"], ["t2", "Rivals"]]);
  it("names my team first and tags my role", () => {
    const m = matchItem(f, new Set(["t2"]), names, ["Managing"])!;
    expect(m.title).toBe("Rivals v MHL 1");
    expect(m.tag).toBe("Managing");
    expect(m.detail).toBe("Round 5 · Main");
  });
  it("ignores fixtures with no start or none of my teams", () => {
    expect(matchItem({ ...f, scheduledStart: null }, new Set(["t1"]), names, [])).toBeNull();
    expect(matchItem(f, new Set(["t9"]), names, [])).toBeNull();
  });
});

describe("assemble and dayLabel", () => {
  const it_ = (id: string, at: string, kind: ComingUpItem["kind"] = "event"): ComingUpItem => ({ id, kind, title: id, detail: "", at, link: "/" });
  it("orders by time, drops the past and duplicates, and keeps notifications separate", () => {
    const r = assemble([
      it_("b", "2026-11-20T00:00:00Z"), it_("a", "2026-11-19T00:00:00Z"), it_("a", "2026-11-19T00:00:00Z"), it_("old", "2026-11-10T00:00:00Z"),
      it_("n1", "2026-11-17T00:00:00Z", "notification"),
    ], NOW);
    expect(r.upcoming.map((i) => i.id)).toEqual(["a", "b"]);
    expect(r.notifications.map((i) => i.id)).toEqual(["n1"]);
  });
  it("labels days in Brisbane time", () => {
    expect(dayLabel("2026-11-18T05:00:00Z", NOW)).toBe("Today");
    expect(dayLabel("2026-11-19T05:00:00Z", NOW)).toBe("Tomorrow");
    expect(dayLabel("2026-11-25T05:00:00Z", NOW)).toMatch(/Wednesday/);
  });
});
