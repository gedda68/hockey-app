// app/admin/layout.tsx
// Admin layout — fixed branded header (via root layout) + sidebar + content

import { Metadata } from "next";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

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
    <div className="min-h-screen bg-slate-50">
      {/* Fixed branded header (club gradient / super-admin navy) */}
      <AdminHeader />

      {/* pt-16 clears the fixed header */}
      <div className="flex pt-16">
        <AdminSidebar />
        <main className="flex-1 min-h-[calc(100vh-64px)] overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
