// app/admin/layout.tsx
// FIXED: Removed incorrect pt-20 padding

import { Metadata } from "next";
import AdminSidebar from "@/components/admin/AdminSidebar";

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

      {/* Main Content - NO pt-20 */}
      <div className="flex-1 overflow-x-hidden pt-32">{children}</div>
    </div>
  );
}
