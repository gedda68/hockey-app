// @vitest-environment node
import { describe, expect, it } from "vitest";
import { loadMatchPlayers, memberPhotoIfConsented, memberPublicName } from "@/lib/data/matchPlayers";

const docs: Record<string, any[]> = {
  fixture_lineups: [
    { fixtureId: "fx-1", teamId: "t-home", players: [{ memberId: "m-1", shirtNumber: 9, isGoalkeeper: false, isCaptain: true }] },
  ],
  teams: [{ teamId: "t-away", roster: [{ memberId: "m-2", jerseyNumber: 14 }] }],
  members: [
    { memberId: "m-1", personalInfo: { displayName: "Jasper Quill", photoUrl: "/p/1.jpg" }, consents: { photoConsent: true } },
    { memberId: "m-2", personalInfo: { firstName: "Dana", lastName: "Kestrel", photoUrl: "/p/2.jpg" } },
  ],
};
const db: any = {
  collection: (n: string) => ({
    find: (q: any) => ({
      toArray: async () =>
        (docs[n] ?? []).filter((d) =>
          Object.entries(q).every(([k, v]: any) => (v?.$in ? v.$in.includes(d[k]) : d[k] === v)),
        ),
    }),
  }),
};

describe("match players", () => {
  it("only exposes a photo when consent is recorded", () => {
    expect(memberPhotoIfConsented({ personalInfo: { photoUrl: "/a.jpg" } })).toBeNull();
    expect(memberPhotoIfConsented({ personalInfo: { photoUrl: "/a.jpg" }, consents: { photoConsent: true } })).toBe("/a.jpg");
    expect(memberPhotoIfConsented({ personalInfo: { photoUrl: "/a.jpg" }, preferences: { photoConsent: true } })).toBe("/a.jpg");
    expect(memberPublicName({ personalInfo: { firstName: "Ana", lastName: "Zee" } }, "x")).toBe("Ana Zee");
  });

  it("uses lineup shirt numbers, falls back to the roster, and links to the player page", async () => {
    const players = await loadMatchPlayers(db, "fx-1", ["t-home", "t-away"], ["m-1", "m-2"]);
    expect(players["m-1"]).toMatchObject({ name: "Jasper Quill", shirtNumber: 9, isCaptain: true, teamId: "t-home", photoUrl: "/p/1.jpg", href: "/competitions/players/m-1" });
    expect(players["m-2"]).toMatchObject({ name: "Dana Kestrel", shirtNumber: 14, teamId: "t-away", photoUrl: null });
  });
});
