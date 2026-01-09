import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const sectionHeaderVariants = cva(
  "flex justify-between items-start md:items-center",
  {
    variants: {
      border: {
        none: "",
        bottom: "border-b-2 border-[#06054e] pb-4",
        bottomLight: "border-b-2 border-slate-200 pb-4",
      },
      spacing: {
        none: "",
        sm: "mb-4",
        md: "mb-6",
        lg: "mb-8",
      },
    },
    defaultVariants: {
      border: "bottom",
      spacing: "md",
    },
  }
);

interface SectionHeaderProps
  extends VariantProps<typeof sectionHeaderVariants> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * SectionHeader Component
 *
 * Standardized section header used in tables, cards, and page sections.
 * Provides consistent styling for titles, subtitles, and action buttons.
 *
 * @example
 * <SectionHeader
 *   title="Top Scorers"
 *   subtitle="BHL1 · 2025 Season"
 * />
 *
 * @example
 * <SectionHeader
 *   title="Match Statistics"
 *   action={
 *     <Button size="sm">Export</Button>
 *   }
 * />
 */
export default function SectionHeader({
  title,
  subtitle,
  action,
  border,
  spacing,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn(sectionHeaderVariants({ border, spacing }), className)}>
      <div className="flex flex-col">
        <h3 className="text-lg font-black uppercase italic text-[#06054e] mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Variant for larger headers (full page sections)
export function LargeSectionHeader({
  title,
  subtitle,
  action,
  className,
}: Omit<SectionHeaderProps, "border" | "spacing">) {
  return (
    <div
      className={cn(
        "mb-6 pb-6 border-b-2 border-[#06054e] flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
        className
      )}
    >
      <div className="flex flex-col">
        <h2 className="text-3xl font-black uppercase italic text-[#06054e] mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Variant for card headers (inside white cards)
export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: Omit<SectionHeaderProps, "border" | "spacing">) {
  return (
    <div
      className={cn(
        "mb-4 pb-4 border-b border-slate-200 flex justify-between items-center",
        className
      )}
    >
      <div className="flex flex-col">
        <h4 className="text-base font-black uppercase text-slate-900">
          {title}
        </h4>
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Variant for table headers (with statistics table styling)
export function TableHeader({
  title,
  subtitle,
  action,
  className,
}: Omit<SectionHeaderProps, "border" | "spacing">) {
  return (
    <div
      className={cn(
        "mb-6 pb-4 border-b-2 border-[#06054e] flex justify-between items-center",
        className
      )}
    >
      <div className="flex flex-col">
        <h3 className="text-xl font-black uppercase italic text-[#06054e] mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export { sectionHeaderVariants };
