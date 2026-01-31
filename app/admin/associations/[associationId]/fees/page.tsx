// app/(admin)/admin/associations/[associationId]/fees/page.tsx

import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { ArrowLeft, AlertCircle } from "lucide-react";
import AssociationFeeManager from "@/components/admin/AssociationFeeManager";

async function getAssociation(associationId: string) {
  const client = await clientPromise;
  const db = client.db();

  const association = await db
    .collection("associations")
    .findOne({ associationId });

  if (!association) return null;

  return {
    associationId: association.associationId,
    name: association.name,
    code: association.code,
    level: association.level,
    fees: association.fees || [],
    branding: association.branding || { primaryColor: "#06054e" },
  };
}

export default async function AssociationFeesPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params; // ✅ REQUIRED
  const association = await getAssociation(associationId);

  if (!association) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={32} className="text-yellow-600" />
            <div>
              <h2 className="text-2xl font-black text-yellow-800">
                Association Not Found
              </h2>
              <Link
                href="/admin/associations"
                className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-yellow-600 text-white rounded-xl font-bold"
              >
                <ArrowLeft size={20} />
                Back to Associations
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/associations" className="font-bold text-slate-600">
          Associations
        </Link>
        <span>/</span>
        <Link
          href={`/admin/associations/${associationId}`}
          className="font-bold text-slate-600"
        >
          {association.name}
        </Link>
        <span>/</span>
        <span className="font-bold text-[#06054e]">Fees</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-2xl shadow p-6 flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-xl text-white flex items-center justify-center font-black"
          style={{ backgroundColor: association.branding.primaryColor }}
        >
          {association.code}
        </div>
        <div>
          <h1 className="text-3xl font-black text-[#06054e]">
            Fee Configuration
          </h1>
          <p className="text-slate-600 font-bold">{association.name}</p>
        </div>
      </div>

      <AssociationFeeManager
        ownerType="association"
        ownerId={association.associationId}
        initialFees={association.fees}
      />
    </div>
  );
}
