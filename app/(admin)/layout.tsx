// app/(admin)/layout.tsx
// Admin-specific layout — fixed branded header + sidebar + content

import { ReactNode } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Fixed branded header (club gradient / super-admin navy) */}
      <AdminHeader />

      {/* pt-16 clears the fixed header (64px tall) */}
      <div className="flex pt-16">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-64px)]">{children}</main>
      </div>
    </div>
  );
}
