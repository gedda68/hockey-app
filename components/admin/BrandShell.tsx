// components/admin/BrandShell.tsx
// Client wrapper that reads BrandContext and writes CSS custom properties
// onto the root admin div, so any component can use var(--brand-primary) etc.

"use client";

import { ReactNode } from "react";
import { useBrand } from "@/lib/contexts/BrandContext";

export default function BrandShell({ children }: { children: ReactNode }) {
  const { brand } = useBrand();

  const primary   = brand?.primaryColor   ?? "#06054e";
  const secondary = brand?.secondaryColor ?? "#1a1870";
  const tertiary  = brand?.tertiaryColor ?? secondary;
  const accent    = brand?.accentColor    ?? "#FFD700";

  return (
    <div
      className="min-h-screen bg-slate-50"
      style={
        {
          "--brand-primary":   primary,
          "--brand-secondary": secondary,
          "--brand-tertiary":  tertiary,
          "--brand-accent":    accent,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
