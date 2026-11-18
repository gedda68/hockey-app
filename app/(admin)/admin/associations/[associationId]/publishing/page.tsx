import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import clientPromise from "@/lib/mongodb";
import { getSession } from "@/lib/auth/session";
import { userCanAccessAssociationResource } from "@/lib/auth/resourceAccessDb";
import SeasonPublishing from "@/components/admin/associations/SeasonPublishing";

export default async function PublishingPage({ params }: { params: Promise<{ associationId: string }> }) {
  const { associationId } = await params;
  const db = (await clientPromise).db(process.env.DB_NAME || "hockey-app");
  const association = await db.collection("associations").findOne({ associationId });
  if (!association) notFound();
  const session = await getSession();
  if (!session) redirect(`/login?next=/admin/associations/${encodeURIComponent(associationId)}/publishing`);
  if (!(await userCanAccessAssociationResource(session, associationId))) {
    const own = session.associationId?.trim();
    redirect(own ? `/admin/associations/${encodeURIComponent(own)}/publishing` : "/admin/competition-panel");
  }
  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/admin/associations/${associationId}`} className="font-bold text-slate-600 hover:text-[#06054e]">{association.name as string}</Link>
        <span className="text-slate-400">/</span>
        <Link href={`/admin/associations/${associationId}/competition-panel`} className="font-bold text-slate-600 hover:text-[#06054e]">Competition panel</Link>
        <span className="text-slate-400">/</span>
        <span className="font-bold text-[#06054e]">Publishing</span>
      </div>
      <h1 className="text-2xl font-black text-[#06054e]">Publishing</h1>
      <p className="max-w-3xl text-sm font-semibold text-slate-600">Choose a season, then the divisions to publish, then publish a whole division or one round at a time. People only see a division once its competition is published and the match itself is published.</p>
      <SeasonPublishing associationId={associationId} />
    </div>
  );
}
