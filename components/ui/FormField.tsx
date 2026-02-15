// components/ui/FormField.tsx
// Reusable form field components

"use client";

import React from "react";

export interface FormFieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

export function FormField({
  label,
  required = false,
  hint,
  error,
  children,
  className = "",
}: FormFieldProps) {
  return (
    <div className={className}>
      <label className="text-xs font-black uppercase text-slate-400 ml-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-xs text-slate-500 mt-1 ml-2">{hint}</p>
      )}
      {error && <p className="text-xs text-red-500 mt-1 ml-2">{error}</p>}
    </div>
  );
}

// Input component with consistent styling
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({ error, className = "", ...props }: InputProps) {
  const baseStyles =
    "w-full p-3 border rounded-xl outline-none font-bold transition-all";
  const normalStyles =
    "bg-slate-50 border-slate-200 focus:ring-2 ring-yellow-400";
  const errorStyles = "bg-red-50 border-red-300 focus:ring-2 ring-red-400";

  return (
    <input
      className={`${baseStyles} ${error ? errorStyles : normalStyles} ${className}`}
      {...props}
    />
  );
}

// Select component with consistent styling
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export function Select({
  error,
  className = "",
  children,
  ...props
}: SelectProps) {
  const baseStyles =
    "w-full p-3 border rounded-xl outline-none font-bold transition-all";
  const normalStyles =
    "bg-slate-50 border-slate-200 focus:ring-2 ring-yellow-400";
  const errorStyles = "bg-red-50 border-red-300 focus:ring-2 ring-red-400";

  return (
    <select
      className={`${baseStyles} ${error ? errorStyles : normalStyles} ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

// Textarea component with consistent styling
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export function Textarea({ error, className = "", ...props }: TextareaProps) {
  const baseStyles =
    "w-full p-3 border rounded-xl outline-none font-bold transition-all resize-none";
  const normalStyles =
    "bg-slate-50 border-slate-200 focus:ring-2 ring-yellow-400";
  const errorStyles = "bg-red-50 border-red-300 focus:ring-2 ring-red-400";

  return (
    <textarea
      className={`${baseStyles} ${error ? errorStyles : normalStyles} ${className}`}
      {...props}
    />
  );
}

// Checkbox with label
export interface CheckboxProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  label: string;
}

export function Checkbox({
  label,
  id,
  className = "",
  ...props
}: CheckboxProps) {
  const checkboxId =
    id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex items-center gap-2">
      <input
        type="checkbox"
        id={checkboxId}
        className={`w-4 h-4 rounded border-slate-300 text-[#06054e] focus:ring-yellow-400 ${className}`}
        {...props}
      />
      <label
        htmlFor={checkboxId}
        className="text-base font-bold text-slate-700 cursor-pointer"
      >
        {label}
      </label>
    </div>
  );
}

// Helper component for grid layouts
export function FormGrid({
  children,
  cols = 2,
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
