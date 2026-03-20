// app/unauthorized/page.tsx
// Shown when a user tries to access a route they don't have permission for

import Link from "next/link";
import { Lock, ArrowLeft, Home } from "lucide-react";

export const metadata = {
  title: "Access Denied | Hockey App",
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-[#0a0970] to-[#06054e] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Card */}
        <div className="bg-white rounded-[2rem] shadow-2xl overflow-hidden">
          {/* Red header strip */}
          <div className="bg-red-600 px-8 py-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Lock size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white uppercase tracking-wide">
                Access Denied
              </h1>
              <p className="text-red-100 font-semibold text-sm mt-0.5">
                You don&apos;t have permission to view this page
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-8 py-6 space-y-6">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 font-semibold text-sm leading-relaxed">
                Your current role does not grant access to this section. If you
                believe this is a mistake, please contact your club or
                association administrator.
              </p>
            </div>

            <div>
              <p className="text-xs font-black uppercase text-slate-400 mb-3">
                What you can do
              </p>
              <ul className="space-y-2 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-[#06054e] font-black mt-0.5">•</span>
                  <span>
                    <strong>Go back</strong> to the previous page
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#06054e] font-black mt-0.5">•</span>
                  <span>
                    <strong>Contact your administrator</strong> to request
                    access
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[#06054e] font-black mt-0.5">•</span>
                  <span>
                    <strong>Log in with a different account</strong> if you have
                    one
                  </span>
                </li>
              </ul>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-sm transition-colors"
              >
                <Home size={16} />
                Home
              </Link>
              <Link
                href="/login"
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-[#06054e] hover:bg-yellow-400 hover:text-[#06054e] text-white rounded-xl font-bold text-sm transition-colors"
              >
                <ArrowLeft size={16} />
                Switch Account
              </Link>
            </div>
          </div>
        </div>

        {/* Help text */}
        <p className="text-center text-white/50 text-xs font-semibold mt-6">
          Error 403 &mdash; Forbidden
        </p>
      </div>
    </div>
  );
}
