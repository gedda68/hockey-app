// app/admin/associations/[associationId]/fees/page.tsx

import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import clientPromise from "@/lib/mongodb";
import FeeManager from "@/components/admin/FeeManager";

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
    code: association.code as string,
    branding: (association.branding as { primaryColor?: string }) || { primaryColor: "#06054e" },
  };
}

export default async function AssociationFeesPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  const association = await getAssociation(associationId);

  if (!association) {
    notFound();
  }

  const primaryColor = association.branding?.primaryColor || "#06054e";

  return (
    <div className="p-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/associations" className="font-bold text-slate-600 hover:text-[#06054e]">
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
        <span className="font-bold text-[#06054e]">Fees</span>
      </div>

      {/* Back link */}
      <Link
        href={`/admin/associations/${associationId}`}
        className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#06054e] transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Association
      </Link>

      <FeeManager
        entityType="association"
        entityId={associationId}
        entityName={association.name}
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
    title: `Fee Management | ${associationId.toUpperCase()} | Hockey Admin`,
  };
}
