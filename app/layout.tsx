// app/layout.tsx
// Root layout with proper padding for fixed header

import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { Toaster } from "sonner";
import Header from "@/components/layout/Header";

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
          {/* Fixed Header - always at top */}
          <Header />

          {/* Body content wrapper with MORE padding for fixed header */}
          {/* Increased to 180px to ensure "HOCKEY MANAGEMENT" is fully visible */}
          <div>
            <main className="pt-16">{children}</main>
          </div>

          {/* Toast Notifications */}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
