// components/ui/Badge.tsx
// Reusable badge/tag component

import React from "react";

export interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "danger" | "warning" | "info" | "default";
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  size = "md",
  className = "",
}: BadgeProps) {
  const variantStyles = {
    success: "bg-green-100 text-green-700",
    danger: "bg-red-100 text-red-700",
    warning: "bg-orange-100 text-orange-700",
    info: "bg-blue-100 text-blue-700",
    default: "bg-slate-100 text-slate-600",
  };

  const sizeStyles = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-3 py-1 text-sm",
    lg: "px-4 py-2 text-base",
  };

  return (
    <span
      className={`inline-block rounded-lg font-black ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  );
}

// Status badge (Active/Inactive)
export function StatusBadge({
  status,
  className = "",
}: {
  status: "Active" | "Inactive" | string;
  className?: string;
}) {
  const variant = status === "Active" ? "success" : "default";

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
}

// Priority badge (for emergency contacts, etc.)
export function PriorityBadge({
  priority,
  className = "",
}: {
  priority: number;
  className?: string;
}) {
  return (
    <Badge variant="danger" size="sm" className={className}>
      Priority {priority}
    </Badge>
  );
}
