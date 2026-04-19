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

          {/* pt-16 clears the fixed header (64 px tall); main gets extra top air below the bar */}
          <div className="flex flex-col pt-16 min-h-screen">
            <AdminScopeMismatchBanner />
            <div className="flex flex-1 min-h-0">
              <AdminSidebar />
              <main className="flex-1 min-h-[calc(100vh-64px)] pt-5 pb-2 md:pt-7 md:pb-4">
                {children}
              </main>
            </div>
          </div>
        </AdminEditingScopeProvider>
      </BrandShell>
    </BrandProvider>
  );
}
