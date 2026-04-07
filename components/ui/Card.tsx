"use client";

import {
  type HTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "outline" | "ghost";
  interactive?: boolean;
  children?: ReactNode;
}

function Card({
  variant = "default",
  interactive,
  className,
  children,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-white",
        variant === "default" &&
          "border-slate-200 shadow-sm",
        variant === "outline" && "border-slate-200 bg-transparent shadow-none",
        variant === "ghost" && "border-transparent bg-transparent shadow-none",
        interactive &&
          "cursor-pointer transition hover:shadow-md hover:border-slate-300",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export default Card;
export { Card };

/** Section layout shell (forms / admin blocks). */
export function SectionCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-6 shadow-sm",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

/** Form panel with subtle fill. */
export function FormCard({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-slate-50/90 p-6",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
