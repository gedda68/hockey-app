// components/ui/StatCard.tsx
import React from "react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: string | React.ReactNode;
  borderColor?: string;
  subtitle?: string;
  // Customization Props
  containerClassName?: string;
  labelClassName?: string;
  valueClassName?: string;
  subtitleClassName?: string;
  iconClassName?: string;
}

export default function StatCard({
  label,
  value,
  icon,
  borderColor = "border-slate-100",
  subtitle,
  containerClassName = "p-6",
  labelClassName = "text-sm text-slate-500",
  valueClassName = "text-3xl text-[#06054e]",
  subtitleClassName = "text-xs text-slate-500",
  iconClassName = "text-4xl",
}: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl shadow-lg border-2 ${borderColor} ${containerClassName} transition-all hover:shadow-xl`}
    >
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <p className={`${labelClassName} font-bold uppercase tracking-wider`}>
            {label}
          </p>
          <p className={`${valueClassName} font-black mt-1`}>{value}</p>
          {subtitle && (
            <p className={`${subtitleClassName} mt-1 italic`}>{subtitle}</p>
          )}
        </div>
        <div className={`${iconClassName} flex items-center justify-center`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
