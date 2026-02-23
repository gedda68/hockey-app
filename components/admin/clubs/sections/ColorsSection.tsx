// sections/ColorsSection.tsx
// Club colors: primary, secondary, accent with preview

import { BaseSectionProps } from "../types/club.types";

export default function ColorsSection({
  formData,
  onChange,
}: BaseSectionProps) {
  const ColorPicker = ({
    label,
    colorKey,
  }: {
    label: string;
    colorKey: string;
  }) => (
    <div>
      <label className="block text-xs font-black uppercase text-slate-400 mb-3 ml-1">
        {label}
      </label>
      <div className="flex gap-4 items-center">
        <input
          type="color"
          value={(formData as any)[colorKey]}
          onChange={(e) => onChange(colorKey, e.target.value)}
          className="w-16 h-16 rounded-2xl border-2 border-slate-100 cursor-pointer flex-shrink-0"
        />
        <input
          type="text"
          value={(formData as any)[colorKey]}
          onChange={(e) => onChange(colorKey, e.target.value)}
          className="flex-1 px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-mono font-bold focus:border-yellow-400 outline-none"
          placeholder="#000000"
        />
        <div
          className="w-16 h-16 rounded-2xl border-2 border-slate-100 flex-shrink-0"
          style={{ backgroundColor: (formData as any)[colorKey] }}
        />
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <p className="text-sm font-bold text-slate-500">
        Choose colors that represent your club. These will appear throughout the
        system.
      </p>

      <ColorPicker label="Primary Color" colorKey="primaryColor" />
      <ColorPicker label="Secondary Color" colorKey="secondaryColor" />
      <ColorPicker label="Accent Color" colorKey="accentColor" />

      {/* Preview */}
      <div>
        <p className="text-xs font-black uppercase text-slate-400 mb-3">
          Preview
        </p>
        <div
          className="rounded-2xl p-6 flex items-center gap-4"
          style={{ backgroundColor: formData.primaryColor }}
        >
          <div
            className="w-16 h-16 rounded-xl flex items-center justify-center font-black text-lg"
            style={{
              backgroundColor: formData.secondaryColor,
              color: formData.primaryColor,
            }}
          >
            {formData.shortName || "XXX"}
          </div>
          <div>
            <p className="font-black text-white text-xl">
              {formData.name || "Club Name"}
            </p>
            <p
              className="text-sm font-bold mt-1"
              style={{ color: formData.accentColor }}
            >
              {formData.established
                ? `Est. ${formData.established}`
                : "Established YYYY"}
              {formData.homeGround && ` • ${formData.homeGround}`}
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-2xl">
        <p className="text-sm font-bold text-blue-900">
          💡 Tip: Use your club's official colors for consistency across all
          platforms
        </p>
      </div>
    </div>
  );
}
