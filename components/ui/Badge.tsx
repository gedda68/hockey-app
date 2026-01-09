import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full font-black uppercase transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-slate-100 text-slate-600 border border-slate-200",
        primary: "bg-[#06054e] text-white",
        secondary: "bg-red-600 text-white",
        success: "bg-green-600 text-white",
        warning: "bg-yellow-600 text-white",
        danger: "bg-red-600 text-white",
        outline: "border-2 border-slate-200 text-slate-600 bg-white",
        ghost: "bg-transparent text-slate-600",
      },
      size: {
        sm: "text-[8px] px-2 py-0.5",
        md: "text-[10px] px-3 py-1",
        lg: "text-xs px-4 py-1.5",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export default function Badge({
  className,
  variant,
  size,
  ...props
}: BadgeProps) {
  return (
    <div
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { badgeVariants };
