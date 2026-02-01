// app/admin/layout.tsx
// Admin layout with sidebar navigation

import { Metadata } from "next";
import AdminSidebar from "../../components/admin/AdminSidebar";
import TopNavbar from "../../components/layout/TopNavbar";

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
    <div>
      <div className="flex min-h-screen bg-slate-50">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content */}
        <div className="flex-1 overflow-x-hidden">{children}</div>
      </div>
    </div>
  );
}
