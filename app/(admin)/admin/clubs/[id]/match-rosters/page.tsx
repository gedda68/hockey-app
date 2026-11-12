"use client";

import { useParams } from "next/navigation";
import ClubMatchRosters from "@/components/admin/clubs/ClubMatchRosters";

export default function ClubMatchRostersPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-5 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-black text-[#06054e] sm:text-3xl">Match rosters</h1>
        <p className="text-sm text-slate-500">Choose who plays in each match. Changes close 5 minutes before the scheduled start.</p>
      </div>
      <ClubMatchRosters clubRef={id} />
    </div>
  );
}
