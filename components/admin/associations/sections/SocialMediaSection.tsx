// sections/SocialMediaSection.tsx
// Social media links

import { Facebook, Instagram, Twitter } from "lucide-react";
import FormField from "../shared/FormField";
import { BaseSectionProps } from "../types/association.types";

export default function SocialMediaSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const socialPlatforms = [
    {
      name: "facebook",
      label: "Facebook",
      icon: Facebook,
      color: "bg-blue-100 text-blue-600",
      placeholder: "https://facebook.com/yourpage",
    },
    {
      name: "instagram",
      label: "Instagram",
      icon: Instagram,
      color: "bg-pink-100 text-pink-600",
      placeholder: "https://instagram.com/yourpage",
    },
    {
      name: "twitter",
      label: "Twitter / X",
      icon: Twitter,
      color: "bg-sky-100 text-sky-600",
      placeholder: "https://twitter.com/yourpage",
    },
  ];

  return (
    <div className="space-y-6">
      <p className="text-sm font-bold text-slate-500">
        All social media fields are optional.
      </p>
      <div className="space-y-4">
        {socialPlatforms.map((platform) => {
          const Icon = platform.icon;
          return (
            <div key={platform.name} className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl ${platform.color} flex items-center justify-center flex-shrink-0`}
              >
                <Icon size={22} />
              </div>
              <div className="flex-1">
                <FormField
                  label={platform.label}
                  name={platform.name}
                  value={(formData as any)[platform.name]}
                  onChange={(val) => onChange(platform.name, val)}
                  placeholder={platform.placeholder}
                  error={errors[platform.name]}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
