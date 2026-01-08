import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  // Base styles
  "inline-flex items-center justify-center rounded-full font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "bg-[#06054e] text-white hover:bg-[#06054e]/90 border-2 border-[#06054e]",
        secondary:
          "bg-red-600 text-white hover:bg-red-700 border-2 border-red-600",
        outline:
          "bg-white text-slate-600 border-2 border-slate-200 hover:bg-slate-50 hover:border-slate-300",
        ghost: "bg-transparent hover:bg-slate-100 text-slate-600",
        active: "bg-red-600 text-white border-2 border-red-600 shadow-md",
      },
      size: {
        sm: "text-[9px] px-3 py-1.5 h-7",
        md: "text-[10px] px-4 py-2 h-9",
        lg: "text-xs px-6 py-3 h-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export default function Button({
  className,
  variant,
  size,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { buttonVariants };
