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
import RenewalReminderBanner from "@/components/admin/RenewalReminderBanner";
import ComingUpPanel from "@/components/admin/ComingUpPanel";
import SponsorBar from "@/components/admin/SponsorBar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <BrandProvider>
      <BrandShell>
        <AdminEditingScopeProvider>
          {/* Fixed branded header */}
          <AdminHeader />

          {/* The header publishes its real height (it grows when the club name wraps); 4rem until it has measured */}
          <div className="flex flex-col pt-[var(--admin-header-h,4rem)] min-h-screen">
            {/* Membership renewal reminder — shown to members with expiring memberships */}
            <RenewalReminderBanner />
            <AdminScopeMismatchBanner />
            <div className="flex flex-1 min-h-0">
              <AdminSidebar />
              <main className="min-w-0 flex-1 min-h-[calc(100vh-64px)] pt-2 pb-2 md:pt-3 md:pb-4">
                {children}
              </main>
              <ComingUpPanel />
            </div>
            <SponsorBar />
          </div>
        </AdminEditingScopeProvider>
      </BrandShell>
    </BrandProvider>
  );
}
