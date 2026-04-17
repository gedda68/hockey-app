import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir } from "fs/promises";
import path from "path";
import {
  requirePermission,
  requireResourceAccess,
  requireRole,
} from "@/lib/auth/middleware";
import { MEDIA_CONTENT_ADMIN_ROLES } from "@/lib/auth/mediaContentRoles";
import { adminHomeGallerySegment } from "@/lib/tenant/homeGalleryScope";

const HOME_GALLERY_PREFIX = "home-gallery/";

function isHomeGalleryCategory(category: string): boolean {
  return category.startsWith(HOME_GALLERY_PREFIX);
}

// POST - Upload a new image to a specific category (e.g., clubs, staff)
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "clubs";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (isHomeGalleryCategory(category)) {
      const { user, response } = await requireRole(
        request,
        MEDIA_CONTENT_ADMIN_ROLES,
      );
      if (response) return response;
      const segment = category.slice(HOME_GALLERY_PREFIX.length);
      const seg = adminHomeGallerySegment(user, segment);
      if (!seg.ok) {
        return NextResponse.json({ error: seg.error }, { status: 403 });
      }
      if (`${HOME_GALLERY_PREFIX}${seg.segment}` !== category) {
        return NextResponse.json(
          { error: "Gallery path does not match your org scope" },
          { status: 403 },
        );
      }
    } else if (category.startsWith("associations/")) {
      const parts = category.split("/").filter(Boolean);
      const assocId = parts[1]?.trim();
      if (!assocId || parts[0] !== "associations") {
        return NextResponse.json(
          { error: "Invalid category — use associations/{associationId}" },
          { status: 400 },
        );
      }
      const { response: permRes } = await requirePermission(
        request,
        "association.edit",
      );
      if (permRes) return permRes;
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "association",
        assocId,
      );
      if (scopeRes) return scopeRes;
    } else if (category.startsWith("clubs/")) {
      const parts = category.split("/").filter(Boolean);
      const clubDocId = parts[1]?.trim();
      if (!clubDocId || parts[0] !== "clubs") {
        return NextResponse.json(
          {
            error:
              "Invalid category — use clubs/{clubId}/… (e.g. clubs/{id}/partners)",
          },
          { status: 400 },
        );
      }
      const { response: permRes } = await requirePermission(
        request,
        "club.settings",
      );
      if (permRes) return permRes;
      const { response: scopeRes } = await requireResourceAccess(
        request,
        "club",
        clubDocId,
      );
      if (scopeRes) return scopeRes;
    } else {
      const { response } = await requirePermission(request, "club.settings");
      if (response) return response;
    }

    // 1. Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed.",
        },
        { status: 400 }
      );
    }

    // 2. Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // 3. Prepare file data
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 4. Generate safe unique filename
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${timestamp}-${originalName}`;

    // 5. Define local storage path (category may be nested e.g. home-gallery/platform)
    const uploadDir = path.join(process.cwd(), "public", "icons", ...category.split("/"));
    const filepath = path.join(uploadDir, filename);

    // 6. Ensure directory exists
    try {
      await mkdir(uploadDir, { recursive: true });
    } catch (err) {
      // Directory exists or permission issue handled by writeFile
    }

    // 7. Save file to disk
    await writeFile(filepath, buffer);

    // 8. Construct public URL
    const publicUrl = `/icons/${category.replace(/\\/g, "/")}/${filename}`;

    console.log(`✅ Uploaded to ${category}:`, publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error: unknown) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      {
        error:
          "Failed to upload file: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}

// GET - Retrieve all images within a specific category
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "clubs";

    const uploadDir = path.join(
      process.cwd(),
      "public",
      "icons",
      ...category.split("/").filter(Boolean),
    );

    try {
      const files = await readdir(uploadDir);

      const catPath = category.replace(/\\/g, "/");
      const images = files
        .filter((file) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file))
        .map((file) => ({
          filename: file,
          url: `/icons/${catPath}/${file}`,
        }));

      // Sort by filename (most recent timestamp first)
      images.sort((a, b) => b.filename.localeCompare(a.filename));

      return NextResponse.json({ images });
    } catch (error) {
      // Directory doesn't exist yet, return empty list
      return NextResponse.json({ images: [] });
    }
  } catch (error: unknown) {
    console.error("❌ Error listing images:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
