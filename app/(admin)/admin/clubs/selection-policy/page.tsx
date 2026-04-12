// Hub: choose a club to edit club-level overrides (parent association policies still apply).

import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { ClipboardList } from "lucide-react";

async function getClubs() {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const clubs = await db
    .collection("clubs")
    .find({})
    .sort({ name: 1 })
    .limit(400)
    .toArray();

  return clubs.map((c) => ({
    id: c.id as string,
    slug: (c.slug as string) || "",
    name: (c.name as string) || c.id,
  }));
}

export default async function ClubSelectionPolicyHubPage() {
  const clubs = await getClubs();

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700">
          <ClipboardList size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black uppercase text-[#06054e]">
            Club selection policy
          </h1>
          <p className="text-lg font-bold text-slate-600">
            Club-level overrides on top of national → state → metro rules
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {clubs.map((c) => {
          const hrefId = encodeURIComponent(c.slug || c.id);
          return (
            <Link
              key={c.id}
              href={`/admin/clubs/${hrefId}/selection-policy`}
              className="block rounded-2xl border-2 border-slate-200 bg-white p-5 shadow-lg transition-all hover:border-[#06054e]"
            >
              <h2 className="text-lg font-black text-[#06054e]">{c.name}</h2>
              <p className="mt-1 font-mono text-xs text-slate-500">{c.id}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
