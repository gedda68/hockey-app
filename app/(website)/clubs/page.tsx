// app/clubs/page.tsx
// Server component: reads active clubs from MongoDB and passes them to ClubsGrid

import ClubsGrid from "@/components/clubs/ClubsGrid";
import type { Club } from "@/app/(admin)/admin/types/clubs";
import { getDatabase } from "@/lib/mongodb";
import { getPublicClubs } from "@/lib/clubs/publicClubDirectory";

async function getClubsFromDB(): Promise<Club[]> {
  try {
    return await getPublicClubs(await getDatabase());
  } catch (error) {
    console.error("Error fetching clubs:", error);
    return [];
  }
}

export const dynamic = "force-dynamic";

export default async function ClubsPage() {
  // Fetch clubs from database
  const clubs = await getClubsFromDB();
  const activeClubs = clubs.filter((club) => club.active);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black uppercase italic text-[#06054e] mb-2">
          All Brisbane Clubs
        </h1>
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
                    (c) => c.committee && c.committee.length > 0,
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
