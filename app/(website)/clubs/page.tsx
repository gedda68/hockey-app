// app/clubs/page.tsx
// Server component that fetches data and passes to ClubsGrid client component

import ClubsGrid from "@/components/clubs/ClubsGrid";
import { Club } from "../admin/types/clubs";

async function getClubsFromDB(): Promise<Club[]> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const res = await fetch(`${baseUrl}/api/clubs`, {
      cache: "no-store", // Always get fresh data
    });

    if (!res.ok) {
      console.error("Failed to fetch clubs");
      return [];
    }

    const data = await res.json();
    return data.clubs || [];
  } catch (error) {
    console.error("Error fetching clubs:", error);
    return [];
  }
}

export default async function ClubsPage() {
  // Fetch clubs from database
  const clubs = await getClubsFromDB();
  const activeClubs = clubs.filter((club) => club.active);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase italic text-[#06054e] mb-2">
          Clubs
        </h1>
        <p className="text-sm font-bold text-slate-600">
          Explore all Brisbane Hockey League clubs
        </p>
      </div>

      {/* Clubs Grid (Client Component with Modals) */}
      <ClubsGrid clubs={activeClubs} />

      {/* Empty State */}
      {activeClubs.length === 0 && (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🏑</div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            No Clubs Yet
          </h2>
          <p className="text-slate-600">
            Clubs will appear here once they are added to the system.
          </p>
        </div>
      )}

      {/* Stats Section */}
      {activeClubs.length > 0 && (
        <div className="mt-12 bg-white rounded-3xl p-8 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
            <div>
              <div className="text-4xl font-black text-[#06054e] mb-2">
                {activeClubs.length}
              </div>
              <div className="text-xs font-black uppercase text-slate-400 tracking-wide">
                Total Clubs
              </div>
            </div>
            <div>
              <div className="text-4xl font-black text-[#06054e] mb-2">
                {
                  activeClubs.filter(
                    (c) => c.committee && c.committee.length > 0
                  ).length
                }
              </div>
              <div className="text-xs font-black uppercase text-slate-400 tracking-wide">
                Clubs with Contact Info
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
