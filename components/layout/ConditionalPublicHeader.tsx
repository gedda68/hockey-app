// components/layout/ConditionalPublicHeader.tsx
// Hides the public BHA header when inside /admin routes.
// Server components (like TopNavbarWrapper) can be passed as children
// so they are still fetched server-side but conditionally rendered client-side.

"use client";

import { usePathname } from "next/navigation";

export default function ConditionalPublicHeader({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Hide the public header entirely on all admin pages
  if (pathname?.startsWith("/admin")) return null;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-[1000] overflow-hidden"
      style={{ height: "var(--public-header-height)" }}
    >
      {children}
    </header>
  );
}
