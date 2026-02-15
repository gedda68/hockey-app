// components/layout/TopNavbarWrapper.tsx
// Server component that fetches clubs and passes to TopNavbar

import { MongoClient } from "mongodb";
import TopNavbar from "./TopNavbar";

async function getActiveClubs(): Promise<any[]> {
  const client = new MongoClient(process.env.MONGODB_URI!);

  try {
    await client.connect();
    const database = client.db(process.env.DB_NAME || "hockey-app");
    const clubsCollection = database.collection("clubs");

    const clubs = await clubsCollection.find({ active: true }).toArray();

    const plainClubs = clubs.map((club) => ({
      name: club.name || club.title || "Unknown Club",
      slug: club.slug || "",
      icon: club.icon,
      iconSrc: club.iconSrc,
      logo: club.logo,
      shortName: club.shortName || club.abbreviation,
      colors: {
        primary: club.colors?.primary || "#06054e",
      },
    }));

    // Sort by name
    plainClubs.sort((a, b) => a.name.localeCompare(b.name));

    return plainClubs;
  } catch (error) {
    console.error("Error fetching clubs for navbar:", error);
    return [];
  } finally {
    await client.close();
  }
}

export default async function TopNavbarWrapper() {
  const clubs = await getActiveClubs();
  return <TopNavbar clubs={clubs} />;
}
