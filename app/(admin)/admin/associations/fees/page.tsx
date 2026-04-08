// app/(admin)/admin/associations/fees/page.tsx
// Global fee configuration - select association to configure

import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { DollarSign, Settings } from "lucide-react";

async function getAssociations() {
  const client = await clientPromise;
  const db = client.db();

  const associations = await db
    .collection("associations")
    .find({ status: "active" })
    .sort({ level: 1, name: 1 })
    .toArray();

  return associations.map((a) => ({
    associationId: a.associationId,
    code: a.code,
    name: a.name,
    level: a.level,
    feesCount: a.fees?.length || 0,
    branding: a.branding || { primaryColor: "#06054e" },
  }));
}

export default async function FeeConfigurationPage() {
  const associations = await getAssociations();

  const getLevelBadge = (level: number) => {
    const badges = {
      0: {
        label: "National",
        color: "bg-purple-100 text-purple-700 border-purple-300",
      },
      1: { label: "State", color: "bg-blue-100 text-blue-700 border-blue-300" },
      2: {
        label: "Regional",
        color: "bg-green-100 text-green-700 border-green-300",
      },
    };
    return (
      badges[level as keyof typeof badges] || {
        label: `Level ${level}`,
        color: "bg-slate-100 text-slate-700 border-slate-300",
      }
    );
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
            <DollarSign size={32} className="text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-[#06054e] uppercase">
              Fee Configuration
            </h1>
            <p className="text-lg text-slate-600 font-bold">
              Configure fees for associations
            </p>
          </div>
        </div>
      </div>

      {/* Associations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {associations.map((association) => {
          const levelBadge = getLevelBadge(association.level);

          return (
            <Link
              key={association.associationId}
              href={`/admin/associations/${association.associationId}/fees`}
              className="block bg-white rounded-2xl shadow-xl border-2 border-slate-200 hover:border-[#06054e] transition-all p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div
                  className="w-14 h-14 rounded-xl text-white flex items-center justify-center font-black text-lg"
                  style={{ backgroundColor: association.branding.primaryColor }}
                >
                  {association.code}
                </div>
                <span
                  className={`px-3 py-1 rounded-lg text-xs font-bold border-2 ${levelBadge.color}`}
                >
                  {levelBadge.label}
                </span>
              </div>

              <h3 className="text-xl font-black text-[#06054e] mb-2 group-hover:text-yellow-600 transition-colors">
                {association.name}
              </h3>

              <div className="flex items-center gap-2 text-slate-600">
                <DollarSign size={18} />
                <span className="font-bold">
                  {association.feesCount}{" "}
                  {association.feesCount === 1 ? "fee" : "fees"} configured
                </span>
              </div>

              <div className="mt-4 flex items-center gap-2 text-[#06054e] font-bold group-hover:gap-3 transition-all">
                <Settings size={18} />
                <span>Configure Fees</span>
              </div>
            </Link>
          );
        })}
      </div>

      {associations.length === 0 && (
        <div className="bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
          <DollarSign size={48} className="mx-auto text-slate-400 mb-4" />
          <h3 className="text-xl font-black text-slate-600 mb-2">
            No Associations Found
          </h3>
          <p className="text-slate-500 font-bold mb-4">
            Create an association first to configure fees
          </p>
          <Link
            href="/admin/associations/new"
            className="inline-block px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            Create Association
          </Link>
        </div>
      )}
    </div>
  );
}

export const metadata = {
  title: "Fee Configuration | Hockey Admin",
  description: "Configure association fees",
};
