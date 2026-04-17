"use client";

import { useState } from "react";
import { Plus, Trash2, Image as ImageIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export type ClubPartnerRow = { name: string; url: string; logoUrl: string };

type Props = {
  partners: ClubPartnerRow[];
  onChangePartners: (rows: ClubPartnerRow[]) => void;
  /** Canonical club id for scoped uploads (`clubs/{id}/partners`) */
  clubId?: string;
  isEdit: boolean;
};

export default function ClubPartnersEditor({
  partners,
  onChangePartners,
  clubId,
  isEdit,
}: Props) {
  const { success, error: toastError } = useToast();
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);

  const uploadLogo = async (index: number, file: File) => {
    if (!isEdit || !clubId?.trim()) {
      toastError(
        "Save the club first",
        "Create or save the club, then open edit to upload partner logos.",
      );
      return;
    }
    setUploadingIndex(index);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("category", `clubs/${clubId.trim()}/partners`);
      const res = await fetch("/api/admin/upload/image", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Upload failed",
        );
      }
      const url = typeof data.url === "string" ? data.url : "";
      if (!url) throw new Error("No file URL returned");
      const rows = [...partners];
      rows[index] = { ...(rows[index] || { name: "", url: "", logoUrl: "" }), logoUrl: url };
      onChangePartners(rows);
      success(
        "Partner logo uploaded",
        "Logo URL set for this row — click Save to persist on the club record.",
      );
    } catch (e) {
      toastError(
        "Upload failed",
        e instanceof Error ? e.message : "Unknown error",
      );
    } finally {
      setUploadingIndex(null);
    }
  };

  return (
    <div className="mt-10 space-y-4 rounded-2xl border-2 border-slate-100 bg-slate-50/50 p-6">
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-1 ml-1">
          Partners &amp; sponsors (public site)
        </label>
        <p className="text-xs text-slate-500 font-semibold">
          Shown in the public footer on the club portal. Website links open in a new tab. Upload
          logos after the club has been saved at least once (edit mode).
        </p>
      </div>

      {partners.map((row, idx) => (
        <div
          key={`club-partner-${idx}`}
          className="space-y-3 rounded-xl border border-slate-200 bg-white p-4"
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">
                Name
              </label>
              <input
                type="text"
                value={row.name}
                onChange={(e) => {
                  const rows = [...partners];
                  rows[idx] = { ...rows[idx], name: e.target.value };
                  onChangePartners(rows);
                }}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold focus:border-yellow-400 outline-none"
                placeholder="Partner or sponsor name"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">
                Website (optional)
              </label>
              <input
                type="url"
                value={row.url}
                onChange={(e) => {
                  const rows = [...partners];
                  rows[idx] = { ...rows[idx], url: e.target.value };
                  onChangePartners(rows);
                }}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold focus:border-yellow-400 outline-none"
                placeholder="https://…"
              />
              <p className="mt-1 text-[10px] font-semibold text-slate-400">
                Opens in a new browser tab on the public site.
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1">
              <label className="mb-1 block text-[10px] font-black uppercase text-slate-400">
                Logo image URL
              </label>
              <input
                type="text"
                value={row.logoUrl}
                onChange={(e) => {
                  const rows = [...partners];
                  rows[idx] = { ...rows[idx], logoUrl: e.target.value };
                  onChangePartners(rows);
                }}
                className="w-full rounded-xl border-2 border-slate-200 px-3 py-2.5 text-sm font-bold focus:border-yellow-400 outline-none"
                placeholder="/icons/clubs/…/partners/… or https://…"
              />
            </div>
            <label
              className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase transition-colors ${
                isEdit && clubId
                  ? "bg-[#06054e] text-white hover:bg-yellow-400 hover:text-[#06054e]"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              {uploadingIndex === idx ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ImageIcon size={16} />
              )}
              {uploadingIndex === idx ? "Uploading…" : "Upload logo"}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                className="hidden"
                disabled={!isEdit || !clubId || uploadingIndex !== null}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void uploadLogo(idx, f);
                }}
              />
            </label>
            <button
              type="button"
              onClick={() => onChangePartners(partners.filter((_, i) => i !== idx))}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-red-100 text-red-600 hover:bg-red-50"
              aria-label="Remove partner"
            >
              <Trash2 size={16} />
            </button>
          </div>
          {row.logoUrl.trim() ? (
            <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
              {/* eslint-disable-next-line @next/next/no-img-element -- admin preview */}
              <img
                src={row.logoUrl.trim()}
                alt=""
                className="max-h-14 max-w-[180px] rounded-lg border border-slate-200 object-contain"
              />
              <span className="text-xs text-slate-500">Preview</span>
            </div>
          ) : null}
        </div>
      ))}

      <button
        type="button"
        onClick={() => onChangePartners([...partners, { name: "", url: "", logoUrl: "" }])}
        disabled={partners.length >= 20}
        className="inline-flex items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-2 text-xs font-black uppercase text-slate-600 hover:border-yellow-400 hover:text-[#06054e] disabled:opacity-40"
      >
        <Plus size={14} />
        Add partner
      </button>
    </div>
  );
}
