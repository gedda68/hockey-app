// components/layout/ConditionalBodyPadding.tsx
// Public pages need pt-16 to clear the fixed BHA header.
// Admin pages manage their own header spacing, so no padding needed here.

"use client";

import { usePathname } from "next/navigation";

export default function ConditionalBodyPadding({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");

  return <div className={isAdmin ? "" : "pt-16"}>{children}</div>;
}
