// app/(admin)/admin/layout.tsx
// Metadata + page chrome only. Header/sidebar live in app/(admin)/layout.tsx
// so they are not rendered twice for /admin/* routes.

import type { ReactNode } from "react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin Panel - Hockey Management",
  description: "Hockey administration and roster management",
};

export default function AdminSegmentLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 overflow-x-hidden">{children}</div>
  );
}
