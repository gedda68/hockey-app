// app/admin/players/new/page.tsx
import { headers } from "next/headers";
import PlayerForm from "@/components/admin/players/PlayerForm";

export const metadata = {
  title: "New Player - Hockey Management",
  description: "Register a new player",
};

async function getClubs(cookie: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/clubs`, {
      cache: "no-store",
      headers: cookie ? { cookie } : {},
    });

    if (!res.ok) {
      console.error("Failed to fetch clubs:", res.status);
      return [];
    }

    const data = await res.json();
    return data.clubs || [];
  } catch (error) {
    console.error("Error fetching clubs:", error);
    return [];
  }
}

async function getTeams() {
  try {
    // Teams API will be created later
    // For now, return empty array
    return [];
  } catch (error) {
    console.error("Error fetching teams:", error);
    return [];
  }
}

export default async function NewPlayerPage() {
  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";
  const [clubs, teams] = await Promise.all([getClubs(cookie), getTeams()]);

  return <PlayerForm clubs={clubs} teams={teams} />;
}
