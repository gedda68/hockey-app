// sections/DetailsSection.tsx
// Club details: logo, established, home ground, description

import FormField from "../shared/FormField";
import { BaseSectionProps } from "../types/club.types";

export default function DetailsSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  return (
    <div className="space-y-6">
      <FormField
        label="Logo URL"
        name="logo"
        value={formData.logo}
        onChange={(val) => onChange("logo", val)}
        placeholder="/logos/club-logo.png"
        hint="URL to club logo (file upload coming soon)"
        error={errors.logo}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Established (Year)"
          name="established"
          value={formData.established}
          onChange={(val) => onChange("established", val)}
          placeholder="e.g. 1944"
          hint="Year the club was founded"
          error={errors.established}
        />

        <FormField
          label="Home Ground"
          name="homeGround"
          value={formData.homeGround}
          onChange={(val) => onChange("homeGround", val)}
          placeholder="e.g. Finsbury Park"
          hint="Primary playing venue"
          error={errors.homeGround}
        />
      </div>

      <FormField
        label="Short Description"
        name="description"
        value={formData.description}
        onChange={(val) => onChange("description", val)}
        placeholder="Brief description of the club (1-2 sentences)"
        hint="Used for listings and search results"
        error={errors.description}
      />

      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          About / History (HTML)
        </label>
        <textarea
          value={formData.about}
          onChange={(e) => onChange("about", e.target.value)}
          rows={8}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none resize-y"
          placeholder="Detailed history and information about the club. HTML tags are supported (e.g. <strong>, <br />, <p>)"
        />
        <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
          Full club history and information. HTML formatting supported.
        </p>
      </div>
    </div>
  );
}
