// app/admin/players/[playerId]/edit/page.tsx
// Edit player page - Loads ALL data from database including consent, status, notes

import PlayerForm from "@/components/admin/players/PlayerForm";
import { notFound } from "next/navigation";

interface EditPlayerPageProps {
  params: Promise<{ playerId: string }>;
}

async function getPlayerData(playerId: string) {
  try {
    console.log("📋 Fetching all data for player:", playerId);

    // Fetch main player data
    const playerRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/admin/players/${playerId}`,
      { cache: "no-store" },
    );

    if (!playerRes.ok) {
      console.error(`Failed to fetch player ${playerId}:`, playerRes.status);
      return null;
    }

    const playerData = await playerRes.json();
    console.log("✅ Player data loaded");

    // Fetch consent data (if exists)
    let consentsData = null;
    try {
      const consentsRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/admin/players/${playerId}/consent`,
        { cache: "no-store" },
      );
      if (consentsRes.ok) {
        consentsData = await consentsRes.json();
        console.log("✅ Consent data loaded");
      }
    } catch (err) {
      console.log("ℹ️ No consent data found");
    }

    // Fetch status data (if exists)
    let statusData = null;
    try {
      const statusRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/admin/players/${playerId}/status`,
        { cache: "no-store" },
      );
      if (statusRes.ok) {
        statusData = await statusRes.json();
        console.log("✅ Status data loaded");
      }
    } catch (err) {
      console.log("ℹ️ No status data found");
    }

    // Fetch notes data (if exists)
    let notesData = null;
    try {
      const notesRes = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/admin/players/${playerId}/notes`,
        { cache: "no-store" },
      );
      if (notesRes.ok) {
        notesData = await notesRes.json();
        console.log("✅ Notes data loaded");
      }
    } catch (err) {
      console.log("ℹ️ No notes data found");
    }

    // Merge all data together
    const completePlayerData = {
      ...playerData.player,
      // Override with subsection data if exists
      consents: consentsData?.consents ||
        playerData.player.consents || {
          photoConsent: false,
          mediaConsent: false,
          transportConsent: false,
          firstAidConsent: false,
          emergencyTreatmentConsent: false,
        },
      status: statusData?.status ||
        playerData.player.status || {
          current: "pending",
          registrationDate: "",
          expiryDate: "",
          renewalReminderDate: "",
          seasons: [],
        },
      notes: notesData?.notes || playerData.player.notes || [],
    };

    console.log("✅ Complete player data assembled:", {
      playerId: completePlayerData.playerId,
      name: `${completePlayerData.firstName} ${completePlayerData.lastName}`,
      hasConsents: !!completePlayerData.consents,
      hasStatus: !!completePlayerData.status,
      notesCount: completePlayerData.notes?.length || 0,
    });

    return completePlayerData;
  } catch (error: any) {
    console.error("❌ Error loading player data:", error);
    return null;
  }
}

export default async function EditPlayerPage({ params }: EditPlayerPageProps) {
  const { playerId } = await params;

  const player = await getPlayerData(playerId);

  if (!player) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
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

      {/* Form */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <PlayerForm mode="edit" existingPlayer={player} />
      </div>
    </div>
  );
}
