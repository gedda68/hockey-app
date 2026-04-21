// app/api/admin/upload/document/route.ts
// Upload any document type — PDFs, images, Word, Excel, CSV, etc.
// Stores files under /public/uploads/events/documents/ (or /images/ for images).
// Returns: { url, name, type, size, mimeType }

import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/middleware";
import { MEDIA_CONTENT_ADMIN_ROLES } from "@/lib/auth/mediaContentRoles";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Max file sizes
const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10 MB
const MAX_DOC_SIZE = 50 * 1024 * 1024;   // 50 MB

type DocType = "pdf" | "doc" | "docx" | "xls" | "xlsx" | "csv" | "txt" | "image" | "other";

interface FileConfig {
  docType: DocType;
  subdir: string;
  maxSize: number;
}

const MIME_MAP: Record<string, FileConfig> = {
  "image/jpeg":       { docType: "image", subdir: "events/images", maxSize: MAX_IMAGE_SIZE },
  "image/png":        { docType: "image", subdir: "events/images", maxSize: MAX_IMAGE_SIZE },
  "image/webp":       { docType: "image", subdir: "events/images", maxSize: MAX_IMAGE_SIZE },
  "image/gif":        { docType: "image", subdir: "events/images", maxSize: MAX_IMAGE_SIZE },
  "image/svg+xml":    { docType: "image", subdir: "events/images", maxSize: MAX_IMAGE_SIZE },
  "application/pdf":  { docType: "pdf",   subdir: "events/documents", maxSize: MAX_DOC_SIZE },
  "application/msword": { docType: "doc", subdir: "events/documents", maxSize: MAX_DOC_SIZE },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
                       { docType: "docx", subdir: "events/documents", maxSize: MAX_DOC_SIZE },
  "application/vnd.ms-excel": { docType: "xls", subdir: "events/documents", maxSize: MAX_DOC_SIZE },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
                       { docType: "xlsx", subdir: "events/documents", maxSize: MAX_DOC_SIZE },
  "text/csv":          { docType: "csv",  subdir: "events/documents", maxSize: MAX_DOC_SIZE },
  "text/plain":        { docType: "txt",  subdir: "events/documents", maxSize: MAX_DOC_SIZE },
};

export async function POST(request: NextRequest) {
  const { response } = await requireRole(request, MEDIA_CONTENT_ADMIN_ROLES);
  if (response) return response;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mime = file.type;
    const config = MIME_MAP[mime];

    if (!config) {
      return NextResponse.json(
        {
          error: `File type "${mime}" is not supported. Accepted: images, PDF, Word, Excel, CSV, TXT.`,
        },
        { status: 400 },
      );
    }

    if (file.size > config.maxSize) {
      const maxMb = config.maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File exceeds maximum size of ${maxMb} MB` },
        { status: 400 },
      );
    }

    // Write to disk
    const uploadsDir = path.join(process.cwd(), "public", "uploads", config.subdir);
    await mkdir(uploadsDir, { recursive: true });

    const timestamp = Date.now();
    const ext = path.extname(file.name) || `.${config.docType}`;
    const filename = `${timestamp}${ext}`;
    const filepath = path.join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    await writeFile(filepath, Buffer.from(bytes));

    const url = `/uploads/${config.subdir}/${filename}`;

    return NextResponse.json({
      url,
      name: file.name,
      type: config.docType,
      size: file.size,
      mimeType: mime,
    });
  } catch (error: unknown) {
    console.error("❌ Document upload error:", error);
    return NextResponse.json(
      { error: "Upload failed", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
