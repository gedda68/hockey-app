// sections/IdentitySection.tsx
// Club identity: name, association, slug

import FormField from "../shared/FormField";
import { IdentitySectionProps } from "../types/club.types";

export default function IdentitySection({
  formData,
  onChange,
  errors,
  associations,
  isEdit,
}: IdentitySectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Club Name"
          name="name"
          value={formData.name}
          onChange={(val) => onChange("name", val)}
          required
          placeholder="e.g. Commercial Hockey Club"
          error={errors.name}
        />

        <FormField
          label="Short Name"
          name="shortName"
          value={formData.shortName}
          onChange={(val) => onChange("shortName", val)}
          required
          placeholder="e.g. CHC"
          hint="Used for abbreviations"
          error={errors.shortName}
        />
      </div>

      <FormField
        label="Slug"
        name="slug"
        value={formData.slug}
        onChange={(val) => onChange("slug", val)}
        disabled={isEdit}
        hint={
          isEdit
            ? "Cannot be changed after creation"
            : "Auto-generated from name"
        }
        error={errors.slug}
      />

      <FormField
        label="Portal subdomain"
        name="portalSlug"
        value={formData.portalSlug}
        onChange={(val) => onChange("portalSlug", val)}
        placeholder="e.g. chcbrisbane"
        hint="Optional URL label for your club portal (letters, numbers, hyphens). If empty, Slug is used for host matching."
        error={errors.portalSlug}
      />

      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Association <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.parentAssociationId}
          onChange={(e) => onChange("parentAssociationId", e.target.value)}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
        >
          <option value="">Select association…</option>
          {associations.map((assoc) => (
            <option key={assoc.associationId} value={assoc.associationId}>
              {assoc.code} – {assoc.name}
            </option>
          ))}
        </select>
        {errors.parentAssociationId && (
          <p className="text-xs text-red-500 font-bold mt-1 ml-1">
            {errors.parentAssociationId}
          </p>
        )}
        <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
          The governing association this club belongs to
        </p>
      </div>

      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
          Club ID
        </label>
        <input
          type="text"
          value={formData.id}
          disabled
          className="w-full px-5 py-4 bg-slate-100 border-2 border-slate-100 rounded-2xl font-mono font-bold text-slate-500 cursor-not-allowed"
        />
        <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
          Auto-generated unique identifier
        </p>
      </div>
    </div>
  );
}
