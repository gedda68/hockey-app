// components/ui/buttonStyles.ts
export function buttonStyles({
  bgColor,
  textColor,
  borderColor,
  shadowColor,
  hoverBgColor,
  hoverTextColor,
  size,
  fullWidth,
  className,
}: {
  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  shadowColor?: string;
  hoverBgColor?: string; // e.g. "hover:bg-orange-600"
  hoverTextColor?: string; // e.g. "hover:text-white"
  size: "sm" | "md" | "lg";
  fullWidth?: boolean;
  className?: string;
}) {
  const base =
    "font-bold rounded-xl transition-all flex items-center justify-center gap-2";

  const sizeStyles = {
    sm: "px-3 py-2 text-sm",
    md: "px-5 py-2.5",
    lg: "px-8 py-4 text-lg",
  };

  return [
    base,
    sizeStyles[size],
    bgColor || "",
    textColor || "",
    borderColor || "",
    shadowColor || "",
    hoverBgColor || "",
    hoverTextColor || "",
    fullWidth ? "w-full" : "",
    className || "",
  ].join(" ");
}
