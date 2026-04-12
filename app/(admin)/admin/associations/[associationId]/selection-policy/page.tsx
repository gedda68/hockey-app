import Link from "next/link";
import { notFound } from "next/navigation";
import clientPromise from "@/lib/mongodb";
import SelectionPolicyForm from "@/components/admin/selection/SelectionPolicyForm";

function levelLabel(level: number): string {
  if (level === 0) return "National";
  if (level === 1) return "State";
  if (level === 2) return "City / metro";
  if (level >= 3) return "Region / district";
  return `Level ${level}`;
}

export default async function AssociationSelectionPolicyPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  const aid = associationId?.trim();
  if (!aid) notFound();

  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const assoc = await db.collection("associations").findOne({ associationId: aid });
  if (!assoc) notFound();

  const name = String(assoc.name ?? aid);
  const tier = levelLabel(Number(assoc.level ?? 0));

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link
          href="/admin/associations/selection-policy"
          className="font-bold text-slate-600 hover:text-[#06054e]"
        >
          Selection policy
        </Link>
        <span className="text-slate-400">/</span>
        <span className="font-bold text-slate-800">{name}</span>
      </div>

      <SelectionPolicyForm
        apiUrl={`/api/admin/associations/${encodeURIComponent(aid)}/selection-policy`}
        title={`${name}`}
        subtitle="Team selection & roster governance for this association and its subtree"
        tierHint={tier}
        associationLevel={Number(assoc.level ?? 0)}
      />
    </div>
  );
}
