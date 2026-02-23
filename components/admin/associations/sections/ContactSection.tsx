// sections/ContactSection.tsx
// Contact information: emails, phones, website

import FormField from "../shared/FormField";
import { BaseSectionProps } from "../types/association.types";

export default function ContactSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Primary Email"
          name="primaryEmail"
          value={formData.primaryEmail}
          onChange={(val) => onChange("primaryEmail", val)}
          type="email"
          required
          placeholder="info@association.com"
          error={errors.primaryEmail}
        />
        <FormField
          label="Secondary Email"
          name="secondaryEmail"
          value={formData.secondaryEmail}
          onChange={(val) => onChange("secondaryEmail", val)}
          type="email"
          placeholder="Optional secondary email"
          error={errors.secondaryEmail}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={(val) => onChange("phone", val)}
          type="tel"
          required
          placeholder="+61 7 1234 5678"
          error={errors.phone}
        />
        <FormField
          label="Mobile"
          name="mobile"
          value={formData.mobile}
          onChange={(val) => onChange("mobile", val)}
          type="tel"
          placeholder="Optional mobile"
          error={errors.mobile}
        />
      </div>

      <FormField
        label="Website"
        name="website"
        value={formData.website}
        onChange={(val) => onChange("website", val)}
        type="url"
        placeholder="https://www.association.com"
        error={errors.website}
      />
    </div>
  );
}
