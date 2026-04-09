// Umpire honoraria: schedule, preview, and payment lines (treasurer).

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import clientPromise from "@/lib/mongodb";
import UmpirePaymentsTreasurerPanel from "@/components/admin/associations/UmpirePaymentsTreasurerPanel";

async function getAssociation(associationId: string) {
  const client = await clientPromise;
  const db = client.db("hockey-app");
  const association = await db
    .collection("associations")
    .findOne({ associationId });
  if (!association) return null;
  return {
    associationId: association.associationId as string,
    name: association.name as string,
    branding: (association.branding as { primaryColor?: string }) || {},
  };
}

export default async function AssociationUmpirePaymentsPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  const association = await getAssociation(associationId);
  if (!association) notFound();

  const primaryColor = association.branding?.primaryColor || "#06054e";

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/admin/associations"
          className="font-bold text-slate-600 hover:text-[#06054e]"
        >
          Associations
        </Link>
        <span className="text-slate-400">/</span>
        <Link
          href={`/admin/associations/${associationId}`}
          className="font-bold text-slate-600 hover:text-[#06054e]"
        >
          {association.name}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-bold text-[#06054e]">Umpire honoraria</span>
      </div>

      <Link
        href={`/admin/associations/${associationId}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#06054e] transition-colors"
      >
        <ArrowLeft size={16} />
        Back to association
      </Link>

      <UmpirePaymentsTreasurerPanel
        associationId={associationId}
        associationName={association.name}
        primaryColor={primaryColor}
      />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  return {
    title: `Umpire honoraria | ${associationId} | Admin`,
  };
}
