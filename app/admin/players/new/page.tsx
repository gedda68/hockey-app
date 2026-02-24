// app/admin/players/new/page.tsx
import PlayerForm from "@/components/admin/players/PlayerForm";

export const metadata = {
  title: "New Player - Hockey Management",
  description: "Register a new player",
};

async function getClubs() {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/clubs`, {
      cache: "no-store",
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
  const [clubs, teams] = await Promise.all([getClubs(), getTeams()]);

  return <PlayerForm clubs={clubs} teams={teams} />;
}
