// components/admin/forms/FormComponents.tsx
// Reusable form components for consistent styling across admin pages

import React from "react";
import { Trash2 } from "lucide-react";

/* ---------------------------------------------
   Form Input Components
--------------------------------------------- */

export function Label({
  children,
  required,
}: {
  children: React.ReactNode;
  required?: boolean;
}) {
  return (
    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 block mb-2">
      {children}
      {required && <span className="text-red-500 ml-1">*</span>}
    </label>
  );
}

export function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  return (
    <input
      type={type}
      required={required}
      disabled={disabled}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold disabled:opacity-50 disabled:cursor-not-allowed"
    />
  );
}

export function TextArea({
  value,
  onChange,
  placeholder,
  required,
  rows = 4,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  rows?: number;
}) {
  return (
    <textarea
      required={required}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold resize-y"
    />
  );
}

export function SelectInput({
  value,
  onChange,
  options,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[] | string[];
  placeholder?: string;
  required?: boolean;
}) {
  const normalizedOptions =
    typeof options[0] === "string"
      ? (options as string[]).map((o) => ({ value: o, label: o }))
      : (options as { value: string; label: string }[]);

  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
    >
      {placeholder && <option value="">{placeholder}</option>}
      {normalizedOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export function ColorInput({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label?: string;
}) {
  return (
    <div className="flex gap-3 items-center">
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-16 h-16 rounded-xl cursor-pointer border-4 border-slate-200 hover:border-[#06054e] transition-colors"
      />
      <div className="flex-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full p-3 bg-slate-50 border border-slate-100 rounded-xl font-bold uppercase focus:ring-2 ring-yellow-400 outline-none"
          placeholder="#06054e"
        />
        {label && (
          <p className="text-xs text-slate-500 mt-1 font-bold">{label}</p>
        )}
      </div>
    </div>
  );
}

export function CheckboxInput({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-5 h-5 rounded border-2 border-slate-300 text-[#06054e] focus:ring-2 ring-yellow-400"
      />
      <span className="font-bold text-slate-700">{label}</span>
    </label>
  );
}

/* ---------------------------------------------
   Section Card
--------------------------------------------- */

export function SectionCard({
  title,
  icon,
  children,
  right,
  className,
}: {
  title: string;
  icon?: React.ReactNode;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 ${className || ""}`}
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-black uppercase text-[#06054e] flex items-center gap-3">
          {icon}
          {title}
        </h2>
        {right}
      </div>
      {children}
    </div>
  );
}

/* ---------------------------------------------
   Form Grid Layout
--------------------------------------------- */

export function FormGrid({
  children,
  cols = 2,
}: {
  children: React.ReactNode;
  cols?: 1 | 2 | 3 | 4;
}) {
  const colsClass = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };

  return <div className={`grid ${colsClass[cols]} gap-6`}>{children}</div>;
}

export function FormField({ children }: { children: React.ReactNode }) {
  return <div>{children}</div>;
}

/* ---------------------------------------------
   Buttons
--------------------------------------------- */

export function PrimaryButton({
  children,
  onClick,
  type = "button",
  disabled,
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="px-8 py-4 bg-[#06054e] text-white rounded-2xl font-black uppercase flex items-center gap-2 hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {icon}
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  onClick,
  type = "button",
  icon,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  icon?: React.ReactNode;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="px-8 py-4 bg-slate-200 hover:bg-slate-300 rounded-2xl font-black uppercase flex items-center gap-2 transition-all"
    >
      {icon}
      {children}
    </button>
  );
}

export function DangerButton({
  children,
  onClick,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all flex items-center gap-2"
    >
      {icon || <Trash2 size={18} />}
      {children}
    </button>
  );
}

export function IconButton({
  onClick,
  icon,
  title,
  variant = "default",
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title?: string;
  variant?: "default" | "danger" | "success";
}) {
  const variants = {
    default: "text-slate-600 hover:bg-slate-100",
    danger: "text-red-600 hover:bg-red-50",
    success: "text-green-600 hover:bg-green-50",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-2 rounded-lg transition-colors ${variants[variant]}`}
    >
      {icon}
    </button>
  );
}

/* ---------------------------------------------
   Empty State
--------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12 text-slate-400">
      <div className="flex justify-center mb-4">{icon}</div>
      <p className="font-bold text-lg">{title}</p>
      {description && <p className="text-sm mt-2">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ---------------------------------------------
   Page Header
--------------------------------------------- */

export function PageHeader({
  title,
  description,
  backLink,
  actions,
}: {
  title: string;
  description?: string;
  backLink?: { href: string; label: string };
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-8">
      {backLink && (
        <a
          href={backLink.href}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-[#06054e] font-bold mb-4 transition-colors"
        >
          ← {backLink.label}
        </a>
      )}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-4xl font-black text-[#06054e] uppercase mb-2">
            {title}
          </h1>
          {description && (
            <p className="text-lg text-slate-600 font-bold">{description}</p>
          )}
        </div>
        {actions && <div className="flex gap-3">{actions}</div>}
      </div>
    </div>
  );
}
