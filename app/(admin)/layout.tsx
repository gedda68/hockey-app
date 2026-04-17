// app/(admin)/layout.tsx
// Admin-specific layout — fixed branded header + sidebar + content.
// BrandProvider fetches club/association colors once; BrandShell applies
// them as CSS custom properties (--brand-primary, --brand-secondary, --brand-accent).

import { ReactNode } from "react";
import { BrandProvider } from "@/lib/contexts/BrandContext";
import BrandShell from "@/components/admin/BrandShell";
import AdminSidebar from "@/components/admin/AdminSidebar";
import AdminHeader from "@/components/admin/AdminHeader";
import {
  AdminEditingScopeProvider,
  AdminScopeMismatchBanner,
} from "@/components/admin/AdminEditingScopeProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <BrandProvider>
      <BrandShell>
        <AdminEditingScopeProvider>
          {/* Fixed branded header */}
          <AdminHeader />

          {/* pt-16 clears the fixed header (64 px tall) */}
          <div className="flex flex-col pt-16 min-h-screen">
            <AdminScopeMismatchBanner />
            <div className="flex flex-1 min-h-0">
              <AdminSidebar />
              <main className="flex-1 min-h-[calc(100vh-64px)]">{children}</main>
            </div>
          </div>
        </AdminEditingScopeProvider>
      </BrandShell>
    </BrandProvider>
  );
}
