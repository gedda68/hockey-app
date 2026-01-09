import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href: string;
  label?: string;
  className?: string;
  showArrow?: boolean;
}

/**
 * BackButton Component
 *
 * Standardized back navigation button used across all pages.
 * Eliminates duplication of back button code.
 *
 * @example
 * <BackButton href="/competitions" />
 * <BackButton href="/dashboard" label="Back to Home" />
 */
export default function BackButton({
  href,
  label = "Back to Dashboard",
  className = "",
  showArrow = true,
}: BackButtonProps) {
  return (
    <Link
      href={href}
      className={`text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group transition-colors ${className}`}
    >
      {showArrow && (
        <span className="transition-transform group-hover:-translate-x-1">
          ←
        </span>
      )}
      {label}
    </Link>
  );
}

// Alternative with lucide-react icon
export function BackButtonWithIcon({
  href,
  label = "Back to Dashboard",
  className = "",
}: Omit<BackButtonProps, "showArrow">) {
  return (
    <Link
      href={href}
      className={`text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group transition-colors ${className}`}
    >
      <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
      {label}
    </Link>
  );
}
