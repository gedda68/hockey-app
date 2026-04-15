// app/layout.tsx
// Root layout with proper padding for fixed header

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { PublicTenantProvider } from "@/lib/contexts/PublicTenantContext";
import { Toaster } from "sonner";
import ConditionalPublicHeader from "@/components/layout/ConditionalPublicHeader";
import ConditionalBodyPadding from "@/components/layout/ConditionalBodyPadding";
import TopNavbarWrapper from "@/components/layout/TopNavbarWrapper";
import { loadPublicTenantFromIncomingHost } from "@/lib/tenant/serverTenant";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brisbane Hockey Association",
  description: "Brisbane Hockey Association Management System",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialTenant = await loadPublicTenantFromIncomingHost();

  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <PublicTenantProvider initialTenant={initialTenant}>
            {/* Public header — hidden automatically on /admin routes */}
            <ConditionalPublicHeader>
              <TopNavbarWrapper />
            </ConditionalPublicHeader>

            {/* Body content — public pages get top padding for fixed header; admin routes handle their own top spacing */}
            <ConditionalBodyPadding>{children}</ConditionalBodyPadding>
          </PublicTenantProvider>

          {/* Toast Notifications */}
          <Toaster
            position="top-right"
            richColors
            closeButton
            duration={4000}
            toastOptions={{
              classNames: {
                toast: "font-sans rounded-2xl shadow-xl border",
                title: "font-black text-sm",
                description: "font-medium text-xs opacity-80",
                closeButton: "rounded-xl",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}
