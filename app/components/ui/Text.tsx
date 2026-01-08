import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const textVariants = cva("", {
  variants: {
    variant: {
      h1: "text-4xl font-black text-[#06054e] uppercase italic tracking-tighter",
      h2: "text-2xl font-black text-[#06054e] uppercase italic tracking-tight",
      h3: "text-xl font-black text-[#06054e] uppercase italic",
      h4: "text-lg font-black text-slate-900 uppercase",
      body: "text-base text-slate-900",
      small: "text-sm text-slate-600",
      tiny: "text-xs text-slate-500",
      label: "text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]",
      muted: "text-slate-400",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
  },
  defaultVariants: {
    variant: "body",
    align: "left",
  },
});

export interface TextProps
  extends React.HTMLAttributes<HTMLParagraphElement>,
    VariantProps<typeof textVariants> {
  as?: "p" | "span" | "div" | "label" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
}

export default function Text({
  className,
  variant,
  align,
  as: Component = "p",
  ...props
}: TextProps) {
  return (
    <Component
      className={cn(textVariants({ variant, align }), className)}
      {...props}
    />
  );
}

export { textVariants };
