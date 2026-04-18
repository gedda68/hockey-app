// sections/ColorsSection.tsx
// Club colors + optional admin / public header banner images

import { Image as ImageIcon } from "lucide-react";
import type {
  BaseSectionProps,
  ColorsSectionBrandingProps,
} from "../types/club.types";

type Props = BaseSectionProps & ColorsSectionBrandingProps;

export default function ColorsSection({
  formData,
  onChange,
  clubIdForUpload,
  isEditMode,
  adminHeaderUploading,
  onAdminHeaderBannerFile,
  publicHeaderUploading,
  onPublicHeaderBannerFile,
}: Props) {
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

      <div className="rounded-2xl border-2 border-slate-200 bg-slate-50/80 p-6 space-y-4">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
            Admin top bar background (optional)
          </label>
          <p className="text-xs text-slate-500 font-semibold mb-3">
            Wide horizontal image replaces the coloured gradient behind the admin
            header for this club. Leave empty to use club colours only.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={formData.adminHeaderBannerUrl}
              onChange={(e) =>
                onChange("adminHeaderBannerUrl", e.target.value)
              }
              className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-yellow-400 outline-none"
              placeholder="https://… or /icons/clubs/…/image.png"
            />
            <label
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 font-black text-xs uppercase transition-colors ${
                clubIdForUpload && isEditMode
                  ? "bg-slate-700 text-white hover:bg-yellow-400 hover:text-[#06054e]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <ImageIcon size={18} />
              {adminHeaderUploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                disabled={
                  !clubIdForUpload ||
                  !isEditMode ||
                  adminHeaderUploading ||
                  !onAdminHeaderBannerFile
                }
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f && onAdminHeaderBannerFile) onAdminHeaderBannerFile(f);
                }}
              />
            </label>
          </div>
          {formData.adminHeaderBannerUrl.trim() ? (
            <div className="mt-4 space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={formData.adminHeaderBannerUrl}
                alt="Admin header preview"
                className="max-h-20 w-full max-w-2xl object-cover rounded-lg border border-slate-200"
              />
              <button
                type="button"
                onClick={() => onChange("adminHeaderBannerUrl", "")}
                className="text-xs font-black uppercase text-red-600 hover:underline"
              >
                Clear admin header image
              </button>
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
            Public site top bar background (optional)
          </label>
          <p className="text-xs text-slate-500 font-semibold mb-3">
            Wide horizontal image replaces the coloured gradient behind the public navigation
            bar for this club&apos;s portal. Leave empty to use club colours only. Independent from
            the admin header image.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={formData.publicHeaderBannerUrl}
              onChange={(e) =>
                onChange("publicHeaderBannerUrl", e.target.value)
              }
              className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold text-sm focus:border-yellow-400 outline-none"
              placeholder="https://… or /icons/clubs/…/image.png"
            />
            <label
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 font-black text-xs uppercase transition-colors ${
                clubIdForUpload && isEditMode
                  ? "bg-slate-700 text-white hover:bg-yellow-400 hover:text-[#06054e]"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
            >
              <ImageIcon size={18} />
              {publicHeaderUploading ? "Uploading…" : "Upload"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="hidden"
                disabled={
                  !clubIdForUpload ||
                  !isEditMode ||
                  publicHeaderUploading ||
                  !onPublicHeaderBannerFile
                }
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f && onPublicHeaderBannerFile) onPublicHeaderBannerFile(f);
                }}
              />
            </label>
          </div>
          {formData.publicHeaderBannerUrl.trim() ? (
            <div className="mt-4 space-y-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={formData.publicHeaderBannerUrl}
                alt="Public header preview"
                className="max-h-20 w-full max-w-2xl object-cover rounded-lg border border-slate-200"
              />
              <button
                type="button"
                onClick={() => onChange("publicHeaderBannerUrl", "")}
                className="text-xs font-black uppercase text-red-600 hover:underline"
              >
                Clear public site header image
              </button>
            </div>
          ) : null}
        </div>
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
          💡 Tip: Use your club&apos;s official colors for consistency across all
          platforms
        </p>
      </div>
    </div>
  );
}
