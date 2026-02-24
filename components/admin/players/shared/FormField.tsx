// shared/FormField.tsx
// Reusable form input component with validation

interface FormFieldProps {
  label: string;
  name: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  error?: string;
}

export default function FormField({
  label,
  name,
  value,
  onChange,
  type = "text",
  placeholder,
  required = false,
  disabled = false,
  hint,
  error,
}: FormFieldProps) {
  return (
    <div>
      <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        type={type}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-5 py-4 bg-slate-50 border-2 rounded-2xl outline-none font-bold transition-all focus:ring-4 ring-yellow-400/20 ${
          error ? "border-red-400" : "border-slate-100 focus:border-yellow-400"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      />
      {error && (
        <p className="text-xs text-red-500 font-bold mt-1 ml-1">{error}</p>
      )}
      {hint && (
        <p className="text-xs text-slate-400 font-bold mt-1 ml-1">{hint}</p>
      )}
    </div>
  );
}
