// components/layout/ClubsNavWrapper.tsx
// Server component that fetches clubs from database

import { MongoClient } from "mongodb";
import ClubsNavClient from "./ClubsNav";

async function getActiveClubs(): Promise<any[]> {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const clubsCollection = database.collection("clubs");

    // Fetch active clubs - don't sort by name since it doesn't exist
    const clubs = await clubsCollection.find({ active: true }).toArray();

    // Convert MongoDB documents to plain objects and ensure slug is preserved
    const plainClubs = clubs.map((club) => ({
      _id: club._id.toString(),
      id: club.id,
      title: club.title,
      name: club.name,
      abbreviation: club.abbreviation,
      shortName: club.shortName,
      slug: club.slug, // ← Explicitly include slug
      description: club.description,
      icon: club.icon,
      iconSrc: club.iconSrc,
      logo: club.logo,
      href: club.href,
      color: club.color,
      bgColor: club.bgColor,
      colors: club.colors,
      about: club.about,
      address: club.address,
      contact: club.contact,
      socialMedia: club.socialMedia,
      facebookUrl: club.facebookUrl,
      instagramUrl: club.instagramUrl,
      twitterUrl: club.twitterUrl,
      committee: club.committee,
      contacts: club.contacts,
      established: club.established,
      homeGround: club.homeGround,
      active: club.active,
      createdAt: club.createdAt,
      updatedAt: club.updatedAt,
    }));

    console.log(`wrapper: `);

    // Sort by title or name
    plainClubs.sort((a, b) => {
      const nameA = (a.name || a.title || "").toLowerCase();
      const nameB = (b.name || b.title || "").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    return plainClubs;
  } catch (error) {
    console.error("❌ Error fetching clubs for nav:", error);
    return [];
  } finally {
    await client.close();
  }
}

export default async function ClubsNavWrapper() {
  const clubs = await getActiveClubs();
  return <ClubsNavClient clubs={clubs} />;
}
