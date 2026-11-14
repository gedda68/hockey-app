import { describe, it, expect } from "vitest";
import { validatePhotoDataUrl, MAX_PHOTO_CHARS } from "@/lib/members/photo";

describe("validatePhotoDataUrl", () => {
  it("accepts small jpeg/png/webp data urls", () => {
    expect(validatePhotoDataUrl("data:image/jpeg;base64,AAAA").ok).toBe(true);
    expect(validatePhotoDataUrl("data:image/webp;base64,AAAA").ok).toBe(true);
  });
  it("rejects other types, junk and oversize", () => {
    expect(validatePhotoDataUrl("data:image/svg+xml;base64,AAAA").ok).toBe(false);
    expect(validatePhotoDataUrl("http://x/y.jpg").ok).toBe(false);
    expect(validatePhotoDataUrl("").ok).toBe(false);
    expect(validatePhotoDataUrl("data:image/png;base64," + "A".repeat(MAX_PHOTO_CHARS)).ok).toBe(false);
  });
});
