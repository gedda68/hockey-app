// app/admin/components/AdminHeader.tsx

import Link from "next/link";

export default function AdminHeader() {
  return (
    <div className="bg-[#06054e] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black uppercase">Admin Panel</h1>
            <p className="text-sm text-slate-300 mt-1">
              Representatives Team Management
            </p>
          </div>
          <Link
            href="/"
            className="px-6 py-3 bg-white text-[#06054e] rounded-full font-black uppercase text-sm hover:bg-slate-100 transition-all"
          >
            ← Back
          </Link>
        </div>
      </div>
    </div>
  );
}
