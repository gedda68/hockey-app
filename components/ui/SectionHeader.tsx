// components/ui/SectionHeader.tsx
// Reusable section header component

import React from "react";
import { LucideIcon } from "lucide-react";

export interface SectionHeaderProps {
  title: string;
  icon?: LucideIcon;
  iconSize?: number;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "primary" | "secondary";
}

export function SectionHeader({
  title,
  icon: Icon,
  iconSize = 24,
  description,
  action,
  variant = "default",
}: SectionHeaderProps) {
  const colorStyles = {
    default: "text-[#06054e]",
    primary: "text-purple-600",
    secondary: "text-slate-700",
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h2
          className={`text-2xl font-black ${colorStyles[variant]} flex items-center gap-2`}
        >
          {Icon && <Icon size={iconSize} />}
          {title}
        </h2>
        {action && <div>{action}</div>}
      </div>
      {description && (
        <p className="text-slate-600 mt-2 text-sm">{description}</p>
      )}
    </div>
  );
}

// Subsection header (smaller)
export function SubsectionHeader({
  title,
  icon: Icon,
  iconSize = 20,
  action,
}: {
  title: string;
  icon?: LucideIcon;
  iconSize?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-xl font-black text-[#06054e] flex items-center gap-2">
        {Icon && <Icon size={iconSize} />}
        {title}
      </h3>
      {action && <div>{action}</div>}
    </div>
  );
}
