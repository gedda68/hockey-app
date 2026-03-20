// app/admin/layout.tsx
// Updated: Added AdminBrandingBar for club/association-scoped users

import { Metadata } from "next";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminBrandingBar from "@/components/admin/AdminBrandingBar";

export const metadata: Metadata = {
  title: "Admin Panel - Hockey Management",
  description: "Hockey administration and roster management",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <AdminSidebar />

      {/* Main Content */}
      <div className="flex-1 overflow-x-hidden flex flex-col">
        <AdminBrandingBar />
        <div className="flex-1 pt-16">{children}</div>
      </div>
    </div>
  );
}
