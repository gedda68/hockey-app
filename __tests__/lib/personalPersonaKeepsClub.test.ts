import { describe, expect, it } from "vitest";
import { ObjectId } from "mongodb";
import { sessionWithPersona, PERSONAL_PERSONA_KEY } from "@/lib/auth/sessionPersona";

const memberId = new ObjectId();
const club = { _id: new ObjectId(), id: "club-1", name: "Commercial Hockey Club", slug: "commercial-hockey", parentAssociationId: "bha" };

function fakeDb(member: any) {
  return {
    collection: (name: string) => ({
      findOne: async (q: any) => {
        if (name === "members") return member;
        if (name === "clubs") return club;
        return null;
      },
      updateOne: async () => ({}),
    }),
  } as any;
}
const session = { userId: String(memberId), memberId: String(memberId), email: "a@b.c", name: "A B", role: "coach", clubId: "club-1", clubSlug: "commercial-hockey", clubName: "Commercial Hockey Club" } as any;

describe("personal (Member) profile", () => {
  it("keeps the member's home club so colours, host and club pages still work", async () => {
    const next = await sessionWithPersona(fakeDb({ membership: { clubId: "club-1" } }), session, PERSONAL_PERSONA_KEY);
    expect(next?.role).toBe("member");
    expect(next?.clubId).toBe("club-1");
    expect(next?.clubName).toBe("Commercial Hockey Club");
  });

  it("is club-less only when the member has no home club", async () => {
    const next = await sessionWithPersona(fakeDb({}), session, PERSONAL_PERSONA_KEY);
    expect(next?.role).toBe("member");
    expect(next?.clubId).toBeNull();
  });
});
