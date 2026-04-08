// app/(admin)/admin/associations/[associationId]/positions/page.tsx
// Position management for specific association

import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { ArrowLeft, AlertCircle } from "lucide-react";
//import { AssociationPositionManager } from "@/components/AssociationPositionManager";

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
    positions: association.positions || [],
    branding: association.branding || { primaryColor: "#06054e" },
  };
}

export default async function AssociationPositionsPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  const association = await getAssociation(associationId);

  if (!association) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={32} className="text-yellow-600 flex-shrink-0" />
            <div>
              <h2 className="text-2xl font-black text-yellow-800 mb-2">
                Association Not Found
              </h2>
              <p className="text-yellow-700 font-bold mb-4">
                The association "{associationId}" could not be found.
              </p>
              <Link
                href="/admin/associations"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700"
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
    <div className="p-6">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link
          href="/admin/associations"
          className="text-slate-600 hover:text-[#06054e] font-bold transition-colors"
        >
          Associations
        </Link>
        <span className="text-slate-400">/</span>
        <Link
          href={`/admin/associations/${associationId}`}
          className="text-slate-600 hover:text-[#06054e] font-bold transition-colors"
        >
          {association.name}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-[#06054e] font-bold">Position Management</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-2xl text-white flex items-center justify-center font-black text-xl"
            style={{ backgroundColor: association.branding.primaryColor }}
          >
            {association.code}
          </div>
          <div>
            <h1 className="text-3xl font-black text-[#06054e] uppercase">
              Position Management
            </h1>
            <p className="text-lg text-slate-600 font-bold">
              {association.name}
            </p>
          </div>
        </div>
      </div>

      {/* Position Manager Component */}
      {/* <AssociationPositionManager
        associationId={association.associationId}
        initialPositions={association.positions}
      /> */}
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  const association = await getAssociation(associationId);

  return {
    title: association
      ? `${association.name} - Position Management | Hockey Admin`
      : "Position Management | Hockey Admin",
  };
}
