// app/layout.tsx
// Root layout with AuthProvider and public header

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
          {/* Public Header (shows on all pages) */}
          <Header />

          {/* Page Content */}
          {children}

          {/* Toast Notifications */}
          <Toaster position="top-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
