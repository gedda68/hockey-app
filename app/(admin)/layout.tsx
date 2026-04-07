// app/(admin)/layout.tsx
// Admin-specific layout — fixed branded header + sidebar + content.
// BrandProvider fetches club/association colors once; BrandShell applies
// them as CSS custom properties (--brand-primary, --brand-secondary, --brand-accent).

import { ReactNode } from "react";
import { BrandProvider } from "@/lib/contexts/BrandContext";
import BrandShell from "@/components/admin/BrandShell";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <BrandProvider>
      <BrandShell>
        {/* Fixed branded header */}
        <AdminHeader />

        {/* pt-16 clears the fixed header (64 px tall) */}
        <div className="flex pt-16">
          <AdminSidebar />
          <main className="flex-1 min-h-[calc(100vh-64px)]">{children}</main>
        </div>
      </BrandShell>
    </BrandProvider>
  );
}
