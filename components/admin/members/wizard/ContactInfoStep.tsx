// components/admin/members/wizard/ContactInfoStep.tsx
"use client";

export default function ContactInfoStep({
  data: incomingData, // Rename prop to apply safety fallback
  onChange,
  errors,
}: {
  data: any;
  onChange: (data: any) => void;
  errors: Record<string, string>;
}) {
  /**
   * DEFENSIVE CHECK:
   * Ensures 'data' is always at least an empty object so property
   * access (e.g., data.email) does not throw a TypeError.
   */
  const data = incomingData || {};

  return (
    <div className="space-y-6">
      {/* Email */}
      <div>
        <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
          Email Address *
        </label>
        <input
          type="email"
          /**
           * CONTROLLED INPUT SAFETY:
           * Using '|| ""' ensures the value is never undefined,
           * which prevents React from switching between controlled
           * and uncontrolled states.
           */
          value={data.email || ""}
          onChange={(e) => onChange({ ...data, email: e.target.value })}
          className={`w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400 transition-all ${
            errors?.email ? "border-red-500 ring-red-200" : "border-slate-200"
          }`}
          placeholder="member@example.com"
        />
        {errors?.email && (
          <p className="text-red-500 text-xs mt-1 font-bold">{errors.email}</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Phone */}
        <div>
          <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
            Home Phone (optional)
          </label>
          <input
            type="tel"
            value={data.phone || ""}
            onChange={(e) => onChange({ ...data, phone: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            placeholder="07 1234 5678"
          />
        </div>

        {/* Mobile */}
        <div>
          <label className="text-xs font-black uppercase text-slate-400 mb-2 block">
            Mobile Number (optional)
          </label>
          <input
            type="tel"
            value={data.mobile || ""}
            onChange={(e) => onChange({ ...data, mobile: e.target.value })}
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            placeholder="0400 123 456"
          />
        </div>
      </div>
    </div>
  );
}
