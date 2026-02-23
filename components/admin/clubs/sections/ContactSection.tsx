// sections/ContactSection.tsx
// Club contact: email, phone, website, social media

import { Facebook, Instagram, Twitter } from "lucide-react";
import FormField from "../shared/FormField";
import { BaseSectionProps } from "../types/club.types";

export default function ContactSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  return (
    <div className="space-y-6">
      <p className="text-sm font-bold text-slate-500">
        Contact information and social media links
      </p>

      {/* Primary Contact */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FormField
          label="Email"
          name="email"
          value={formData.email}
          onChange={(val) => onChange("email", val)}
          type="email"
          placeholder="info@club.com"
          error={errors.email}
        />

        <FormField
          label="Phone"
          name="phone"
          value={formData.phone}
          onChange={(val) => onChange("phone", val)}
          type="tel"
          placeholder="+61 7 1234 5678"
          error={errors.phone}
        />
      </div>

      <FormField
        label="Website"
        name="website"
        value={formData.website}
        onChange={(val) => onChange("website", val)}
        type="url"
        placeholder="https://www.club.com"
        error={errors.website}
      />

      {/* Social Media */}
      <div className="pt-4 border-t-2 border-slate-100">
        <p className="text-xs font-black uppercase text-slate-400 mb-4">
          Social Media (Optional)
        </p>

        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Facebook size={22} className="text-blue-600" />
            </div>
            <div className="flex-1">
              <FormField
                label="Facebook"
                name="facebook"
                value={formData.facebook}
                onChange={(val) => onChange("facebook", val)}
                placeholder="https://facebook.com/yourclub"
                error={errors.facebook}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-pink-100 flex items-center justify-center flex-shrink-0">
              <Instagram size={22} className="text-pink-600" />
            </div>
            <div className="flex-1">
              <FormField
                label="Instagram"
                name="instagram"
                value={formData.instagram}
                onChange={(val) => onChange("instagram", val)}
                placeholder="https://instagram.com/yourclub"
                error={errors.instagram}
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-100 flex items-center justify-center flex-shrink-0">
              <Twitter size={22} className="text-sky-600" />
            </div>
            <div className="flex-1">
              <FormField
                label="Twitter / X"
                name="twitter"
                value={formData.twitter}
                onChange={(val) => onChange("twitter", val)}
                placeholder="https://twitter.com/yourclub"
                error={errors.twitter}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
