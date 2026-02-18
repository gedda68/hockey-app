// app/(admin)/layout.tsx
// Admin-specific layout with header and sidebar

import { ReactNode } from "react";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Admin Header with Logout */}
      <AdminHeader />

      <div className="flex">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-73px)]">{children}</main>
      </div>
    </div>
  );
}
