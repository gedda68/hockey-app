// sections/AddressSection.tsx
// Physical address and geographic region

import FormField from "../shared/FormField";
import { BaseSectionProps } from "../types/association.types";

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
          label="City / Town"
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
          name="addressState"
          value={formData.addressState}
          onChange={(val) => onChange("addressState", val)}
          required
          placeholder="QLD"
          error={errors.addressState}
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
          name="addressCountry"
          value={formData.addressCountry}
          onChange={(val) => onChange("addressCountry", val)}
          placeholder="Australia"
          error={errors.addressCountry}
        />
      </div>

      <div className="pt-2 border-t-2 border-slate-100">
        <p className="text-xs font-black uppercase text-slate-400 mb-4">
          Geographic Region
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FormField
            label="Region"
            name="region"
            value={formData.region}
            onChange={(val) => onChange("region", val)}
            required={false}
            placeholder="e.g. Brisbane (Optional)"
            hint="Optional - Administrative region"
            error={errors.region}
          />
          <FormField
            label="State / Territory"
            name="state"
            value={formData.state}
            onChange={(val) => onChange("state", val)}
            placeholder="QLD"
            error={errors.state}
          />
          <FormField
            label="Timezone"
            name="timezone"
            value={formData.timezone}
            onChange={(val) => onChange("timezone", val)}
            placeholder="Australia/Brisbane"
            error={errors.timezone}
          />
        </div>
      </div>
    </div>
  );
}
