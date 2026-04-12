import { NextRequest, NextResponse } from "next/server";
import { readdir, unlink } from "fs/promises";
import path from "path";
import { requireRole } from "@/lib/auth/middleware";
import { MEDIA_CONTENT_ADMIN_ROLES } from "@/lib/auth/mediaContentRoles";
import { HOME_GALLERY_CATEGORY } from "@/lib/constants/homeGallery";
import { adminHomeGallerySegment } from "@/lib/tenant/homeGalleryScope";

const safeBasename = (name: string): string | null => {
  const base = path.basename(name.trim());
  if (!base || base !== name.trim() || base.includes("..")) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(base)) return null;
  if (!/\.(jpe?g|png|gif|webp|svg)$/i.test(base)) return null;
  return base;
};

function scopeDir(segment: string) {
  return path.join(
    process.cwd(),
    "public",
    "icons",
    HOME_GALLERY_CATEGORY,
    segment,
  );
}

export async function GET(request: NextRequest) {
  const { user, response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  const scopeParam = request.nextUrl.searchParams.get("scope");
  const seg = adminHomeGallerySegment(user, scopeParam);
  if (!seg.ok) {
    return NextResponse.json({ error: seg.error }, { status: 403 });
  }

  try {
    const files = await readdir(scopeDir(seg.segment));
    const images = files
      .filter((f) => /\.(jpe?g|png|gif|webp|svg)$/i.test(f))
      .sort((a, b) => b.localeCompare(a))
      .map((filename) => ({
        filename,
        url: `/icons/${HOME_GALLERY_CATEGORY}/${seg.segment}/${filename}`,
      }));
    return NextResponse.json({
      images,
      scopeKey: seg.segment,
      scopeLocked: user.role !== "super-admin",
    });
  } catch {
    return NextResponse.json({
      images: [],
      scopeKey: seg.segment,
      scopeLocked: user.role !== "super-admin",
    });
  }
}

export async function DELETE(request: NextRequest) {
  const { user, response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  let body: { filename?: string; scope?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const seg = adminHomeGallerySegment(user, body.scope ?? null);
  if (!seg.ok) {
    return NextResponse.json({ error: seg.error }, { status: 403 });
  }

  const base = safeBasename(body.filename ?? "");
  if (!base) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filepath = path.join(scopeDir(seg.segment), base);

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
