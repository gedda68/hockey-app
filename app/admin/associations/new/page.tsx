// app/(admin)/admin/associations/new/page.tsx
// Complete new association page with proper serialization

import AssociationForm from "@/components/admin/associations/AssociationForm";
import clientPromise from "@/lib/mongodb";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NewAssociationPage() {
  try {
    const client = await clientPromise;
    const db = client.db();

    // Fetch all active associations to use as potential parents
    const parentAssociations = await db
      .collection("associations")
      .find({ status: "active" })
      .sort({ level: 1, name: 1 }) // Sort by level then name
      .toArray();

    // Serialize: Only send what's needed (remove MongoDB-specific fields)
    const serializedParents = parentAssociations.map((a) => ({
      associationId: a.associationId,
      code: a.code,
      name: a.name,
      level: a.level,
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
  } catch (error: any) {
    console.error("Error loading new association page:", error);

    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-8">
            <h2 className="text-2xl font-black text-red-800 mb-2">
              Error Loading Page
            </h2>
            <p className="text-red-700 font-bold mb-4">
              {error.message || "Failed to load association form"}
            </p>
            <Link
              href="/admin/associations"
              className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
            >
              <ArrowLeft size={20} />
              Back to Associations
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

// Optional: Add metadata
export const metadata = {
  title: "New Association | Hockey Admin",
  description: "Create a new hockey association",
};
