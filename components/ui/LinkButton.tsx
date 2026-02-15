"use client";

import Link from "next/link";
import { useState } from "react";
import { LucideIcon } from "lucide-react";
import { buttonStyles } from "./buttonStyles";

interface LinkButtonProps {
  href: string;
  children?: React.ReactNode;

  bgColor?: string;
  textColor?: string;
  borderColor?: string;
  shadowColor?: string;

  hoverBgColor?: string;
  hoverTextColor?: string;

  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;

  icon?: LucideIcon;
  iconPosition?: "left" | "right";

  /** NEW: toggle text + icon */
  toggleText?: {
    on: string;
    off: string;
    initial?: "on" | "off";
  };

  toggleIcon?: {
    on: LucideIcon;
    off: LucideIcon;
  };

  className?: string;
}

export function LinkButton({
  href,
  children,
  bgColor,
  textColor,
  borderColor,
  shadowColor,
  hoverBgColor,
  hoverTextColor,
  size = "md",
  fullWidth = false,
  icon: Icon,
  iconPosition = "left",
  toggleText,
  toggleIcon,
  className = "",
}: LinkButtonProps) {
  const [state, setState] = useState(toggleText?.initial || "off");

  const classes = buttonStyles({
    bgColor,
    textColor,
    borderColor,
    shadowColor,
    hoverBgColor,
    hoverTextColor,
    size,
    fullWidth,
    className,
  });

  const label = toggleText
    ? state === "on"
      ? toggleText.on
      : toggleText.off
    : children;

  const ActiveIcon = toggleIcon
    ? state === "on"
      ? toggleIcon.on
      : toggleIcon.off
    : Icon;

  const handleToggle = () => {
    if (toggleText || toggleIcon) {
      setState((prev) => (prev === "on" ? "off" : "on"));
    }
  };

  return (
    <Link href={href} onClick={handleToggle} className={classes}>
      {ActiveIcon && iconPosition === "left" && <ActiveIcon size={18} />}
      {label}
      {ActiveIcon && iconPosition === "right" && <ActiveIcon size={18} />}
    </Link>
  );
}
