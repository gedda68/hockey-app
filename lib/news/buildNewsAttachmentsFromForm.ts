import { ObjectId } from "mongodb";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import type { NewsAttachment } from "@/types/news";
import {
  assertAttachmentFileLimits,
  inferAttachmentKind,
  validatePersistedAttachmentUrl,
} from "@/lib/news/newsAttachments";
import { parseVideoEmbed } from "@/lib/website/videoEmbeds";

export type BuildNewsAttachmentsResult =
  | { ok: true; attachments: NewsAttachment[] }
  | { ok: false; error: string; status: number };

export async function buildNewsAttachmentsFromFormData(
  formData: FormData,
): Promise<BuildNewsAttachmentsResult> {
  const attachmentsJson = (formData.get("attachmentsJson") as string | null) ?? "";
  if (!attachmentsJson.trim()) {
    return { ok: true, attachments: [] };
  }

  let meta: unknown;
  try {
    meta = JSON.parse(attachmentsJson);
  } catch {
    return { ok: false, error: "Invalid attachments payload", status: 400 };
  }
  if (!Array.isArray(meta)) {
    return { ok: false, error: "Invalid attachments payload", status: 400 };
  }

  const uploadsDir = path.join(process.cwd(), "public", "uploads", "news");
  await mkdir(uploadsDir, { recursive: true });

  const attachments: NewsAttachment[] = [];
  let order = 0;

  for (const row of meta) {
    if (!row || typeof row !== "object") continue;
    const r = row as Record<string, unknown>;
    const id =
      typeof r.id === "string" && r.id.trim() ? r.id.trim() : new ObjectId().toString();
    const kind = r.kind;
    if (
      kind !== "image" &&
      kind !== "video" &&
      kind !== "document" &&
      kind !== "file" &&
      kind !== "video_link"
    ) {
      continue;
    }

    if (kind === "video_link") {
      const url = typeof r.url === "string" ? r.url.trim() : "";
      if (!url) continue;
      if (!parseVideoEmbed(url)) {
        return { ok: false, error: "Unsupported video URL (YouTube/Vimeo only)", status: 400 };
      }
      attachments.push({
        id,
        kind: "video_link",
        url,
        title: typeof r.title === "string" ? r.title : undefined,
        sortOrder: order++,
      });
      continue;
    }

    const file = formData.get(`attachmentFile:${id}`) as File | null;
    if (!file || file.size <= 0) {
      const existingUrl = typeof r.url === "string" ? r.url.trim() : "";
      if (!existingUrl) continue;
      if (!validatePersistedAttachmentUrl(kind, existingUrl)) {
        return { ok: false, error: "Invalid attachment URL in payload", status: 400 };
      }
      attachments.push({
        id,
        kind,
        url: existingUrl,
        title: typeof r.title === "string" ? r.title : undefined,
        mime: typeof r.mime === "string" ? r.mime : undefined,
        filename: typeof r.filename === "string" ? r.filename : undefined,
        sortOrder: order++,
      });
      continue;
    }

    const originalName = file.name || "upload";
    const inferred = inferAttachmentKind(file);
    if (inferred !== kind) {
      return { ok: false, error: `Attachment kind mismatch for ${originalName}`, status: 400 };
    }

    const limitErr = assertAttachmentFileLimits(file, kind);
    if (limitErr) return { ok: false, error: limitErr, status: 400 };

    const mime = file.type || "application/octet-stream";
    const extension = path.extname(originalName) || "";
    const filename = `news-${id}-${Date.now()}${extension}`;
    const filepath = path.join(uploadsDir, filename);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filepath, buffer);

    attachments.push({
      id,
      kind,
      url: `/uploads/news/${filename}`,
      title: typeof r.title === "string" ? r.title : undefined,
      mime,
      filename: originalName,
      sortOrder: order++,
    });
  }

  return { ok: true, attachments };
}
