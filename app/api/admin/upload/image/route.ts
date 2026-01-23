import { NextResponse } from "next/server";
import { writeFile, mkdir, readdir } from "fs/promises";
import path from "path";

// POST - Upload a new image to a specific category (e.g., clubs, staff)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const category = (formData.get("category") as string) || "clubs";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
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

    // 5. Define local storage path
    const uploadDir = path.join(process.cwd(), "public", "icons", category);
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
    const publicUrl = `/icons/${category}/${filename}`;

    console.log(`✅ Uploaded to ${category}:`, publicUrl);

    return NextResponse.json({
      success: true,
      url: publicUrl,
      filename,
      size: file.size,
      type: file.type,
    });
  } catch (error: any) {
    console.error("❌ Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file: " + error.message },
      { status: 500 }
    );
  }
}

// GET - Retrieve all images within a specific category
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category") || "clubs";

    const uploadDir = path.join(process.cwd(), "public", "icons", category);

    try {
      const files = await readdir(uploadDir);

      // Filter for image extensions only and map to URLs
      const images = files
        .filter((file) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file))
        .map((file) => ({
          filename: file,
          url: `/icons/${category}/${file}`,
        }));

      // Sort by filename (most recent timestamp first)
      images.sort((a, b) => b.filename.localeCompare(a.filename));

      return NextResponse.json({ images });
    } catch (error) {
      // Directory doesn't exist yet, return empty list
      return NextResponse.json({ images: [] });
    }
  } catch (error: any) {
    console.error("❌ Error listing images:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
