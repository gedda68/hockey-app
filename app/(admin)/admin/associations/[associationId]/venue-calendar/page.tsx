import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import clientPromise from "@/lib/mongodb";
import AdminPitchCalendarClient from "@/components/admin/associations/AdminPitchCalendarClient";

type Props = { params: Promise<{ associationId: string }> };

export default async function AdminVenueCalendarPage({ params }: Props) {
  const { associationId } = await params;
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");
  const a = await db
    .collection("associations")
    .findOne({ associationId }, { projection: { name: 1 } });
  const associationName = String(a?.name ?? associationId);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto mb-6">
        <Link
          href={`/admin/associations/${encodeURIComponent(associationId)}`}
          className="inline-flex items-center gap-2 text-sm font-black text-slate-600 hover:text-[#06054e]"
        >
          <ArrowLeft size={18} />
          Association admin
        </Link>
      </div>
      <AdminPitchCalendarClient associationId={associationId} associationName={associationName} />
    </div>
  );
}
