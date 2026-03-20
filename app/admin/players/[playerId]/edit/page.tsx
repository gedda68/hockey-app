// app/admin/players/[playerId]/edit/page.tsx

import { headers } from "next/headers";
import PlayerForm from "@/components/admin/players/PlayerForm";
import { notFound } from "next/navigation";

interface EditPlayerPageProps {
  params: Promise<{ playerId: string }>;
}

async function getPlayerData(playerId: string, cookie: string) {
  const base = process.env.NEXTAUTH_URL || "http://localhost:3000";
  const opts = { cache: "no-store" as const, headers: cookie ? { cookie } : {} };

  try {
    const playerRes = await fetch(`${base}/api/admin/players/${playerId}`, opts);

    if (!playerRes.ok) {
      console.error(`Failed to fetch player ${playerId}:`, playerRes.status);
      return null;
    }

    const playerData = await playerRes.json();

    // Fetch optional sub-sections (ignore failures)
    let consentsData = null;
    let statusData = null;
    let notesData = null;

    try {
      const r = await fetch(`${base}/api/admin/players/${playerId}/consent`, opts);
      if (r.ok) consentsData = await r.json();
    } catch {}

    try {
      const r = await fetch(`${base}/api/admin/players/${playerId}/status`, opts);
      if (r.ok) statusData = await r.json();
    } catch {}

    try {
      const r = await fetch(`${base}/api/admin/players/${playerId}/notes`, opts);
      if (r.ok) notesData = await r.json();
    } catch {}

    return {
      ...playerData.player,
      consents: consentsData?.consents || playerData.player.consents || {
        photoConsent: false,
        mediaConsent: false,
        transportConsent: false,
        firstAidConsent: false,
        emergencyTreatmentConsent: false,
      },
      status: statusData?.status || playerData.player.status || {
        current: "pending",
        registrationDate: "",
        expiryDate: "",
        renewalReminderDate: "",
        seasons: [],
      },
      notes: notesData?.notes || playerData.player.notes || [],
    };
  } catch (error: any) {
    console.error("Error loading player data:", error);
    return null;
  }
}

export default async function EditPlayerPage({ params }: EditPlayerPageProps) {
  const { playerId } = await params;

  const reqHeaders = await headers();
  const cookie = reqHeaders.get("cookie") || "";

  const player = await getPlayerData(playerId, cookie);

  if (!player) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-8 shadow-lg">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-4xl font-black mb-2">
            Edit Player: {player.firstName} {player.lastName}
          </h1>
          <p className="text-blue-100 text-sm font-bold">
            Player ID: {player.playerId}
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <PlayerForm mode="edit" existingPlayer={player} />
      </div>
    </div>
  );
}
