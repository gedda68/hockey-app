import React from "react";
import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const filterButtonVariants = cva(
  "px-4 py-2 rounded-full text-[10px] font-black border transition-all",
  {
    variants: {
      variant: {
        primary: "",
        secondary: "",
      },
      isActive: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      // Primary variant styles
      {
        variant: "primary",
        isActive: true,
        className: "bg-red-600 text-white border-red-600 shadow-md",
      },
      {
        variant: "primary",
        isActive: false,
        className:
          "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]",
      },
      // Secondary variant styles
      {
        variant: "secondary",
        isActive: true,
        className: "bg-[#06054e] text-white border-[#06054e] shadow-md",
      },
      {
        variant: "secondary",
        isActive: false,
        className:
          "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]",
      },
    ],
    defaultVariants: {
      variant: "secondary",
      isActive: false,
    },
  }
);

export interface FilterButtonProps
  extends VariantProps<typeof filterButtonVariants> {
  href: string;
  children: React.ReactNode;
  className?: string;
}

export default function FilterButton({
  href,
  children,
  variant,
  isActive,
  className,
}: FilterButtonProps) {
  return (
    <Link
      href={href}
      className={cn(filterButtonVariants({ variant, isActive }), className)}
    >
      {children}
    </Link>
  );
}

export { filterButtonVariants };
