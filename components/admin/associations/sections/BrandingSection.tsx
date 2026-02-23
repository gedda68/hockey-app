// sections/BrandingSection.tsx
// Branding: colors with optional accent color

import { BaseSectionProps } from "../types/association.types";
import { LEVEL_MAP } from "../AssociationsList";

interface BrandingSectionProps extends BaseSectionProps {
  selectedLevel: number | "";
}

export default function BrandingSection({
  formData,
  onChange,
  selectedLevel,
}: BrandingSectionProps) {
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
        Choose colours that represent the association.
      </p>

      {/* Primary and Secondary Colors */}
      <ColorPicker label="Primary Colour" colorKey="primaryColor" />
      <ColorPicker label="Secondary Colour" colorKey="secondaryColor" />

      {/* Optional Accent Color */}
      <div className="pt-4 border-t-2 border-slate-100">
        <label className="flex items-center gap-3 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.useAccentColor}
            onChange={(e) => onChange("useAccentColor", e.target.checked)}
            className="w-5 h-5 accent-[#06054e]"
          />
          <span className="font-bold text-slate-700">
            Use Custom Accent Colour
          </span>
          <span className="text-xs text-slate-400">(Optional)</span>
        </label>

        {formData.useAccentColor && (
          <ColorPicker label="Accent Colour" colorKey="accentColor" />
        )}
      </div>

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
            className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-sm"
            style={{
              backgroundColor: formData.secondaryColor,
              color: formData.primaryColor,
            }}
          >
            {formData.code || "XXX"}
          </div>
          <div>
            <p className="font-black text-white">
              {formData.name || "Association Name"}
            </p>
            <p
              className="text-xs font-bold opacity-70"
              style={{
                color: formData.useAccentColor
                  ? formData.accentColor
                  : formData.secondaryColor,
              }}
            >
              {selectedLevel !== "" && LEVEL_MAP[selectedLevel as number]
                ? LEVEL_MAP[selectedLevel as number].label
                : "Select a level"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
