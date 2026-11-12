// lib/clubs/publicClubDirectory.ts
// Loads clubs for the public /clubs page straight from MongoDB.
//
// The page used to fetch the admin API (/api/clubs), which requires a logged-in
// user with club.view — a server-side fetch carries no session cookie, so the
// public page always got 401 and rendered "No Clubs Yet".
//
// Output is normalised to the `Club` shape ClubsGrid / ContactModal expect, and
// committee emails/phones are only included when the member has opted in
// (showEmailOnPublicSite / showPhoneOnPublicSite).

import type { Db } from "mongodb";
import type { Club } from "@/app/(admin)/admin/types/clubs";

type Doc = Record<string, any>;

const str = (v: unknown): string => (typeof v === "string" ? v : "");

export function toPublicClub(d: Doc): Club {
  const colors = d.colors ?? {};
  const address = d.address ?? {};
  const contact = d.contact ?? {};
  const social = d.socialMedia ?? {};
  return {
    id: str(d.id) || String(d._id ?? ""),
    name: str(d.name),
    shortName: str(d.shortName) || undefined,
    slug: str(d.slug),
    logo: str(d.logo) || str(d.iconSrc) || undefined,
    colors: {
      primary: str(colors.primary) || "#06054e",
      secondary: str(colors.secondary) || "#1a1870",
      accent: str(colors.accent) || undefined,
    },
    address: {
      street: str(address.street),
      suburb: str(address.suburb),
      state: str(address.state) || "QLD",
      postcode: str(address.postcode),
      country: str(address.country) || "Australia",
    },
    contact: {
      email: str(contact.email),
      phone: str(contact.phone) || undefined,
      website: str(contact.website) || undefined,
    },
    socialMedia: {
      facebook: str(social.facebook) || undefined,
      instagram: str(social.instagram) || undefined,
      twitter: str(social.twitter) || undefined,
    },
    committee: (Array.isArray(d.committee) ? d.committee : [])
      .filter((m: Doc) => str(m?.name) || str(m?.position))
      .map((m: Doc, i: number) => ({
        id: str(m.id) || `member-${i}`,
        name: str(m.name),
        position: str(m.position),
        email: m.showEmailOnPublicSite === true ? str(m.email) || undefined : undefined,
        phone: m.showPhoneOnPublicSite === true ? str(m.phone) || undefined : undefined,
      })),
    established: str(d.established) || undefined,
    homeGround: str(d.homeGround) || undefined,
    description: str(d.description) || undefined,
    about: str(d.about) || undefined,
    active: d.active !== false && d.status !== "inactive",
    createdAt: str(d.createdAt),
    updatedAt: str(d.updatedAt),
  };
}

export async function getPublicClubs(db: Db): Promise<Club[]> {
  const docs = await db
    .collection("clubs")
    .find(
      { active: { $ne: false }, status: { $ne: "inactive" } },
      { projection: { _id: 1, id: 1, name: 1, shortName: 1, slug: 1, logo: 1, iconSrc: 1, colors: 1,
        address: 1, contact: 1, socialMedia: 1, committee: 1, established: 1, homeGround: 1,
        description: 1, about: 1, active: 1, status: 1, createdAt: 1, updatedAt: 1 } },
    )
    .sort({ name: 1 })
    .toArray();
  return docs.map(toPublicClub);
}
