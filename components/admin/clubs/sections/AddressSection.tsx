// sections/AddressSection.tsx
// Club address: street, suburb, city, state, postcode

import FormField from "../shared/FormField";
import { BaseSectionProps } from "../types/club.types";

export default function AddressSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  return (
    <div className="space-y-6">
      <FormField
        label="Street Address"
        name="street"
        value={formData.street}
        onChange={(val) => onChange("street", val)}
        required
        placeholder="123 Hockey Drive"
        error={errors.street}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Suburb"
          name="suburb"
          value={formData.suburb}
          onChange={(val) => onChange("suburb", val)}
          required
          placeholder="Suburb"
          error={errors.suburb}
        />

        <FormField
          label="City"
          name="city"
          value={formData.city}
          onChange={(val) => onChange("city", val)}
          placeholder="City (defaults to suburb)"
          error={errors.city}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <FormField
          label="State"
          name="state"
          value={formData.state}
          onChange={(val) => onChange("state", val)}
          placeholder="QLD"
          error={errors.state}
        />

        <FormField
          label="Postcode"
          name="postcode"
          value={formData.postcode}
          onChange={(val) => onChange("postcode", val)}
          required
          placeholder="4000"
          error={errors.postcode}
        />

        <FormField
          label="Country"
          name="country"
          value={formData.country}
          onChange={(val) => onChange("country", val)}
          placeholder="Australia"
          error={errors.country}
        />
      </div>

      <div className="pt-2 border-t-2 border-slate-100">
        <p className="text-xs font-black uppercase text-slate-400 mb-4">
          Geographic Region (Optional)
        </p>

        <FormField
          label="Region"
          name="region"
          value={formData.region}
          onChange={(val) => onChange("region", val)}
          placeholder="e.g. Brisbane North, Gold Coast"
          hint="Geographic area or district"
          error={errors.region}
        />
      </div>
    </div>
  );
}
