// app/layout.tsx
// Root layout with proper padding for fixed header

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "sonner";
import ConditionalPublicHeader from "@/components/layout/ConditionalPublicHeader";
import ConditionalBodyPadding from "@/components/layout/ConditionalBodyPadding";
import TopNavbarWrapper from "@/components/layout/TopNavbarWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Brisbane Hockey Association",
  description: "Brisbane Hockey Association Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          {/* Public header — hidden automatically on /admin routes */}
          <ConditionalPublicHeader>
            <TopNavbarWrapper />
          </ConditionalPublicHeader>

          {/* Body content — public pages get pt-16 for fixed header; admin routes handle their own top spacing */}
          <ConditionalBodyPadding>{children}</ConditionalBodyPadding>

          {/* Toast Notifications */}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
