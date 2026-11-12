import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { userCanAccessAssociationResource } from "@/lib/auth/resourceAccessDb";
import CompetitionPanelOverview from "@/components/admin/associations/CompetitionPanelOverview";

export default async function CompetitionPanelPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = await params;
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const association = await db.collection("associations").findOne({ associationId });
  if (!association) notFound();

  const session = await getSession();
  if (!session) {
    redirect(`/login?next=/admin/associations/${encodeURIComponent(associationId)}/competition-panel`);
  }
  // Each association sees only its own competitions.
  if (!(await userCanAccessAssociationResource(session, associationId))) {
    const own = session.associationId?.trim();
    if (own) redirect(`/admin/associations/${encodeURIComponent(own)}/competition-panel`);
    redirect("/admin/competition-panel");
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href="/admin/associations" className="font-bold text-slate-600 hover:text-[#06054e]">Associations</Link>
        <span className="text-slate-400">/</span>
        <Link href={`/admin/associations/${associationId}`} className="font-bold text-slate-600 hover:text-[#06054e]">{association.name as string}</Link>
        <span className="text-slate-400">/</span>
        <span className="font-bold text-[#06054e]">Competition panel</span>
      </div>
      <h1 className="text-2xl font-black text-[#06054e]">Competition panel</h1>
      <CompetitionPanelOverview associationId={associationId} />
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ associationId: string }> }) {
  const { associationId } = await params;
  return { title: `Competition panel | ${associationId} | Admin` };
}
