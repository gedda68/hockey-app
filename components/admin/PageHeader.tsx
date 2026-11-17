"use client";

// components/admin/PageHeader.tsx
// The heading card every admin page opens with: a small label, the page title, and a smaller line beneath.
// Uses the club or association's brand colours; text is light or dark by contrast with the gradient.

import type { ReactNode } from "react";
import { useBrand } from "@/lib/contexts/BrandContext";
import { toneAlongGradient } from "@/lib/ui/readableText";

export interface PageHeaderProps {
  /** Small caps label above the title (a section, or who the page is about). */
  eyebrow?: string;
  title: string;
  /** The smaller line below the title. */
  subtitle?: ReactNode;
  /** Extra line under the subtitle, e.g. a breadcrumb. */
  detail?: ReactNode;
  /** Controls on the right (a filter, a button). */
  aside?: ReactNode;
  /** Override the brand gradient (the registration page uses the member's own club colours). */
  colors?: { primary: string; secondary: string };
}

export default function PageHeader({ eyebrow, title, subtitle, detail, aside, colors }: PageHeaderProps) {
  const { brand } = useBrand();
  const primary = colors?.primary ?? brand?.primaryColor ?? "#06054e";
  const secondary = colors?.secondary ?? brand?.secondaryColor ?? "#1a1870";
  const light = toneAlongGradient(primary, secondary, 0.35) === "light";
  return (
    <header
      className={`rounded-3xl p-6 shadow-lg ${light ? "text-white" : "text-gray-900"}`}
      style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-bold uppercase tracking-widest opacity-80">{eyebrow}</p>}
          <h1 className="text-3xl font-black">{title}</h1>
          {subtitle && <p className="mt-1 text-sm opacity-90">{subtitle}</p>}
          {detail && <div className="mt-2 text-sm font-bold opacity-95">{detail}</div>}
        </div>
        {aside && <div className="flex-shrink-0">{aside}</div>}
      </div>
    </header>
  );
}
