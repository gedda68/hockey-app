/**
 * Rendered when notFound() is called from any page in the
 * /admin/associations/[associationId]/** segment — e.g. when an association ID
 * does not exist in the database.
 *
 * This replaces the inline "Association Not Found" JSX that was previously
 * returned from inside an if-block in the server component.
 */

import Link from "next/link";
import { ArrowLeft, AlertCircle } from "lucide-react";

export default function AssociationNotFound() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={32} className="text-yellow-600 flex-shrink-0 mt-1" />

            <div>
              <h2 className="text-2xl font-black text-yellow-800 mb-2">
                Association Not Found
              </h2>
              <p className="text-yellow-700 font-bold mb-6">
                This association doesn&apos;t exist or has been removed.
              </p>

              <Link
                href="/admin/associations"
                className="inline-flex items-center gap-2 px-6 py-3 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 transition-all"
              >
                <ArrowLeft size={20} />
                Back to Associations
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
