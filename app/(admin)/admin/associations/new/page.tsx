// app/(admin)/admin/associations/new/page.tsx
//
// Async server component — data fetching errors bubble up to the nearest
// error.tsx (app/(admin)/admin/associations/error.tsx), which Next.js renders
// automatically.  No try/catch JSX pattern (React anti-pattern under concurrent
// rendering — see X3 in the platform roadmap).

import AssociationForm from "@/components/admin/associations/AssociationForm";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "New Association | Hockey Admin",
  description: "Create a new hockey association",
};

export default async function NewAssociationPage() {
  const client = await clientPromise;
  const db = client.db();

  // Fetch all active associations to use as potential parents.
  // Any DB error propagates to associations/error.tsx automatically.
  const parentAssociations = await db
    .collection("associations")
    .find({ status: "active" })
    .sort({ level: 1, name: 1 })
    .toArray();

  // Serialise: only send what the client component needs (no _id / Date objects).
  const serializedParents = parentAssociations.map((a) => ({
    associationId: a.associationId,
    code:          a.code,
    name:          a.name,
    level:         a.level,
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Back Button */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/admin/associations"
            className="inline-flex items-center gap-2 text-slate-600 hover:text-[#06054e] font-bold transition-colors"
          >
            <ArrowLeft size={20} />
            Back to Associations
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <AssociationForm parentAssociations={serializedParents} />
      </div>
    </div>
  );
}
