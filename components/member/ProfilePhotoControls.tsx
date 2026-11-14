// components/member/ProfilePhotoControls.tsx
// Choose / replace / remove your profile photo. The image is cropped square and resized in the
// browser (400px JPEG) before upload so it stays small.

"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera, Loader2, Trash2 } from "lucide-react";

async function toSquareJpeg(file: File, size = 400): Promise<string> {
  const bmp = await createImageBitmap(file);
  const side = Math.min(bmp.width, bmp.height);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not process the image");
  ctx.drawImage(bmp, (bmp.width - side) / 2, (bmp.height - side) / 2, side, side, 0, 0, size, size);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export default function ProfilePhotoControls({ hasPhoto, onChanged }: { hasPhoto: boolean; onChanged: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) return void toast.error("Please choose an image file");
    setBusy(true);
    try {
      const dataUrl = await toSquareJpeg(file);
      const res = await fetch("/api/member/my-profile/photo", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dataUrl }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Upload failed");
      toast.success("Photo updated");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    setBusy(true);
    try {
      const res = await fetch("/api/member/my-profile/photo", { method: "DELETE", credentials: "include" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Could not remove photo");
      toast.success("Photo removed");
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not remove photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3 mt-2">
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => void pick(e.target.files?.[0])} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()}
        className="inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:underline disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
        {hasPhoto ? "Change photo" : "Add photo"}
      </button>
      {hasPhoto && (
        <button type="button" disabled={busy} onClick={() => void remove()}
          className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:underline disabled:opacity-50">
          <Trash2 className="h-3.5 w-3.5" /> Remove
        </button>
      )}
    </div>
  );
}
