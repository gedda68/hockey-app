import Link from "next/link";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const filterButtonVariants = cva(
  "inline-flex items-center justify-center rounded-full font-black uppercase transition-all border-2",
  {
    variants: {
      variant: {
        primary: "hover:shadow-md",
        secondary: "hover:shadow-md",
        status: "hover:shadow-md",
      },
      size: {
        sm: "text-[9px] px-3 py-1.5",
        md: "text-[10px] px-4 py-2",
        lg: "text-xs px-6 py-3",
      },
      active: {
        true: "",
        false: "",
      },
    },
    compoundVariants: [
      {
        variant: "primary",
        active: true,
        className: "bg-[#06054e] text-white border-[#06054e]",
      },
      {
        variant: "primary",
        active: false,
        className:
          "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
      },
      {
        variant: ["secondary", "status"],
        active: true,
        className: "bg-red-600 text-white border-red-600 shadow-md",
      },
      {
        variant: ["secondary", "status"],
        active: false,
        className:
          "bg-white text-slate-500 border-slate-200 hover:border-slate-300",
      },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
      active: false,
    },
  }
);

interface FilterButtonProps extends VariantProps<typeof filterButtonVariants> {
  href: string;
  isActive: boolean;
  children: React.ReactNode;
  className?: string;
}

export default function FilterButton({
  href,
  isActive,
  children,
  variant,
  size,
  className,
}: FilterButtonProps) {
  return (
    <Link
      href={href}
      className={cn(
        filterButtonVariants({ variant, size, active: isActive }),
        className
      )}
    >
      {children}
    </Link>
  );
}

export { filterButtonVariants };
