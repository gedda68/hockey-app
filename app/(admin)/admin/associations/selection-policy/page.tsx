// Hub: pick an association to edit team selection policy (national → state → metro).

import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { ClipboardList } from "lucide-react";

async function getAssociations() {
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const associations = await db
    .collection("associations")
    .find({ status: "active" })
    .sort({ level: 1, name: 1 })
    .toArray();

  return associations.map((a) => ({
    associationId: a.associationId as string,
    name: a.name as string,
    level: a.level as number,
    code: a.code as string | undefined,
  }));
}

function levelLabel(level: number): string {
  if (level === 0) return "National";
  if (level === 1) return "State";
  if (level === 2) return "City / metro";
  if (level >= 3) return "Region / district";
  return `Level ${level}`;
}

export default async function AssociationSelectionPolicyHubPage() {
  const associations = await getAssociations();

  return (
    <div className="p-6">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-700">
          <ClipboardList size={32} className="text-white" />
        </div>
        <div>
          <h1 className="text-4xl font-black uppercase text-[#06054e]">
            Team selection policy
          </h1>
          <p className="text-lg font-bold text-slate-600">
            Set movement, portal visibility, and roster rules at each association tier
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {associations.map((a) => {
          const badge = levelLabel(a.level);
          return (
            <Link
              key={a.associationId}
              href={`/admin/associations/${a.associationId}/selection-policy`}
              className="group block rounded-2xl border-2 border-slate-200 bg-white p-6 shadow-xl transition-all hover:border-[#06054e]"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-xl font-black text-[#06054e] group-hover:underline">
                  {a.name}
                </h2>
                <span className="shrink-0 rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-black uppercase text-indigo-800">
                  {badge}
                </span>
              </div>
              {a.code && (
                <p className="text-sm font-bold text-slate-500">{a.code}</p>
              )}
              <p className="mt-3 text-sm text-slate-600">
                National and state set defaults; metro/regional layers add league rules;
                clubs override under their parent body.
              </p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
