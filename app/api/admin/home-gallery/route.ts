import { NextRequest, NextResponse } from "next/server";
import { readdir, unlink } from "fs/promises";
import path from "path";
import { requirePermission } from "@/lib/auth/middleware";
import { HOME_GALLERY_CATEGORY } from "@/lib/constants/homeGallery";

const uploadDir = () =>
  path.join(process.cwd(), "public", "icons", HOME_GALLERY_CATEGORY);

const safeBasename = (name: string): string | null => {
  const base = path.basename(name.trim());
  if (!base || base !== name.trim() || base.includes("..")) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  if (!/\.(jpe?g|png|gif|webp|svg)$/i.test(base)) return null;
  return base;
};

export async function GET(request: NextRequest) {
  const { response } = await requirePermission(request, "club.settings");
  if (response) return response;

  try {
    const files = await readdir(uploadDir());
    const images = files
      .filter((f) => /\.(jpe?g|png|gif|webp|svg)$/i.test(f))
      .sort((a, b) => b.localeCompare(a))
      .map((filename) => ({
        filename,
        url: `/icons/${HOME_GALLERY_CATEGORY}/${filename}`,
      }));
    return NextResponse.json({ images });
  } catch {
    return NextResponse.json({ images: [] });
  }
}

export async function DELETE(request: NextRequest) {
  const { response } = await requirePermission(request, "club.settings");
  if (response) return response;

  let body: { filename?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const base = safeBasename(body.filename ?? "");
  if (!base) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filepath = path.join(uploadDir(), base);

  try {
    await unlink(filepath);
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Failed to delete file",
      },
      { status: 500 },
    );
  }
}
