import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const cardVariants = cva("bg-white transition-all", {
  variants: {
    variant: {
      default:
        "shadow-sm hover:shadow-xl border-2 border-transparent hover:border-[#06054e]",
      elevated: "shadow-2xl border-4 border-[#06054e]",
      outline: "border-2 border-slate-200",
      ghost: "shadow-none",
    },
    rounded: {
      default: "rounded-[32px]",
      lg: "rounded-[40px]",
      sm: "rounded-2xl",
      none: "rounded-none",
    },
    interactive: {
      true: "cursor-pointer",
      false: "",
    },
  },
  defaultVariants: {
    variant: "default",
    rounded: "default",
    interactive: false,
  },
});

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

export default function Card({
  className,
  variant,
  rounded,
  interactive,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(cardVariants({ variant, rounded, interactive }), className)}
      {...props}
    />
  );
}

export { cardVariants };
