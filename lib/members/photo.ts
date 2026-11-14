// Profile photo rules: a small image stored on the member record as a data URL
// (the browser resizes it first, so it stays tens of KB and needs no file storage).

export const MAX_PHOTO_CHARS = 450_000; // ~330 KB of image
const DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;

export function validatePhotoDataUrl(v: unknown): { ok: true; value: string } | { ok: false; error: string } {
  const s = typeof v === "string" ? v.trim() : "";
  if (!s) return { ok: false, error: "No image supplied" };
  if (s.length > MAX_PHOTO_CHARS) return { ok: false, error: "Image is too large — choose a smaller photo" };
  if (!DATA_URL.test(s)) return { ok: false, error: "Only JPEG, PNG or WebP images are allowed" };
  return { ok: true, value: s };
}
