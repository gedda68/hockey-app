// app/unauthorized/page.tsx
// Shown when a user tries to access a route they don't have permission for

import Link from "next/link";
import { ShieldX } from "lucide-react";

export const metadata = {
  title: "Access Denied | Hockey App",
};

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-[#0a0970] to-[#06054e] flex items-center justify-center p-4">
      <div className="w-full max-w-md text-center">
        <div className="bg-white rounded-[2rem] shadow-2xl p-10">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <ShieldX size={40} className="text-red-500" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-[#06054e] uppercase mb-3">
            Access Denied
          </h1>
          <p className="text-slate-600 font-bold mb-2">
            You don&apos;t have permission to view this page.
          </p>
          <p className="text-slate-500 text-sm mb-8">
            If you believe this is an error, please contact your administrator.
          </p>

          <div className="flex flex-col gap-3">
            <Link
              href="/"
              className="w-full px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all text-center"
            >
              Go to Homepage
            </Link>
            <Link
              href="/login"
              className="w-full px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all text-center"
            >
              Sign in with a different account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
