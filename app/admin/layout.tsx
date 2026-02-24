// app/admin/layout.tsx
// FIXED: Admin layout with proper spacing for content below navbar

import { Metadata } from "next";
import AdminSidebar from "../../components/admin/AdminSidebar";

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

      {/* Main Content - NO pt-20, let children handle their own spacing */}
      <div className="flex-1 overflow-x-hidden">{children}</div>
    </div>
  );
}
