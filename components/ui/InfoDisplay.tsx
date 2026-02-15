// components/ui/InfoDisplay.tsx
// Reusable components for displaying information (read-only)

import React from "react";

export interface InfoFieldProps {
  label: string;
  value: string | number | React.ReactNode;
  className?: string;
  valueClassName?: string;
}

export function InfoField({
  label,
  value,
  className = "",
  valueClassName = "",
}: InfoFieldProps) {
  return (
    <div className={className}>
      <label className="text-xs font-black uppercase text-slate-400">
        {label}
      </label>
      <p className={`text-lg font-bold text-slate-800 mt-1 ${valueClassName}`}>
        {value}
      </p>
    </div>
  );
}

// Grid of info fields
export function InfoGrid({
  children,
  cols = 3,
  className = "",
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
  className?: string;
}) {
  const colsClass = {
    1: "grid-cols-1",
    2: "md:grid-cols-2",
    3: "lg:grid-cols-3",
    4: "lg:grid-cols-4",
  };

  return (
    <div className={`grid grid-cols-1 ${colsClass[cols]} gap-6 ${className}`}>
      {children}
    </div>
  );
}

// Divider with optional text
export function Divider({
  text,
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  if (text) {
    return (
      <div className={`relative my-6 ${className}`}>
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-slate-200"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-white px-4 text-sm font-bold text-slate-500">
            {text}
          </span>
        </div>
      </div>
    );
  }

  return <div className={`border-t border-slate-100 my-6 ${className}`} />;
}

// Empty state component
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = "",
}: {
  icon?: React.ComponentType<{ size?: number; className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`text-center py-12 bg-slate-50 rounded-xl ${className}`}>
      {Icon && <Icon size={48} className="mx-auto text-slate-300 mb-4" />}
      <h3 className="text-lg font-bold text-slate-700 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// Loading state component
export function LoadingState({
  message = "Loading...",
  className = "",
}: {
  message?: string;
  className?: string;
}) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-slate-600 font-bold">{message}</p>
    </div>
  );
}

// Error state component
export function ErrorState({
  title = "Something went wrong",
  description,
  action,
  className = "",
}: {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`text-center py-12 bg-red-50 rounded-xl border-2 border-red-200 ${className}`}
    >
      <div className="text-4xl mb-4">⚠️</div>
      <h3 className="text-lg font-bold text-red-700 mb-2">{title}</h3>
      {description && (
        <p className="text-red-600 mb-4 max-w-md mx-auto">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
