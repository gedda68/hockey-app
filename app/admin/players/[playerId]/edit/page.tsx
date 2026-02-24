// app/admin/players/[id]/edit/page.tsx
import { notFound } from "next/navigation";
import PlayerForm from "@/components/admin/players/PlayerForm";

export const metadata = {
  title: "Edit Player - Hockey Management",
  description: "Update player details",
};

async function getPlayer(playerId: string) {
  try {
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/admin/players/${playerId}`, {
      cache: "no-store",
    });

    if (!res.ok) {
      console.error(`Failed to fetch player ${playerId}:`, res.status);
      return null;
    }

    const data = await res.json();
    return data.player || null;
  } catch (error) {
    console.error("Error fetching player:", error);
    return null;
  }
}

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
    return [];
  } catch (error) {
    console.error("Error fetching teams:", error);
    return [];
  }
}

export default async function EditPlayerPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  // Next.js 15+ requires awaiting params
  const { playerId } = await params;

  const [player, clubs, teams] = await Promise.all([
    getPlayer(playerId),
    getClubs(),
    getTeams(),
  ]);

  if (!player) {
    notFound();
  }

  return (
    <PlayerForm
      playerId={playerId}
      initialData={player}
      clubs={clubs}
      teams={teams}
    />
  );
}
