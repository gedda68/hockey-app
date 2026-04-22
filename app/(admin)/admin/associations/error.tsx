"use client";

/**
 * Segment-level error boundary for all /admin/associations/** pages.
 *
 * Next.js renders this component automatically when a page in this segment
 * throws an unhandled error (e.g. DB connection failure, serialisation error).
 * This replaces the old pattern of constructing JSX inside try/catch blocks
 * in server components (which breaks React concurrent rendering).
 *
 * "Try again" calls `reset()` which re-renders the page server component.
 */

import Link from "next/link";
import { ArrowLeft, AlertCircle, RefreshCw } from "lucide-react";

export default function AssociationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-8">
          <div className="flex items-start gap-4">
            <AlertCircle size={32} className="text-red-600 flex-shrink-0 mt-1" />

            <div className="flex-1">
              <h2 className="text-2xl font-black text-red-800 mb-2">
                Error Loading Page
              </h2>

              <p className="text-red-700 font-bold mb-1">
                {error.message || "An unexpected error occurred."}
              </p>

              {/* digest is the server-side error ID — useful for support tickets */}
              {error.digest && (
                <p className="text-red-500 text-xs font-mono mb-6">
                  Error ID: {error.digest}
                </p>
              )}
              {!error.digest && <div className="mb-6" />}

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                >
                  <RefreshCw size={16} />
                  Try Again
                </button>

                <Link
                  href="/admin/associations"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white text-red-700 border-2 border-red-500 rounded-xl font-bold hover:bg-red-50 transition-all"
                >
                  <ArrowLeft size={16} />
                  Back to Associations
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
