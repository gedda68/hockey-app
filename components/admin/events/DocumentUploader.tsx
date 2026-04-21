// components/admin/events/DocumentUploader.tsx
// Drag-and-drop document uploader for event attachments.

"use client";

import {
  useRef,
  useState,
  useCallback,
  DragEvent,
  ChangeEvent,
} from "react";
import {
  Upload,
  FileText,
  Image,
  FileSpreadsheet,
  File,
  X,
  Loader2,
  Eye,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────

export interface DocumentItem {
  url: string;
  name: string;
  type: "pdf" | "doc" | "docx" | "xls" | "xlsx" | "csv" | "txt" | "image" | "other";
  size: number;
  mimeType?: string;
}

interface DocumentUploaderProps {
  documents: DocumentItem[];
  onChange: (docs: DocumentItem[]) => void;
  onView?: (doc: DocumentItem) => void;
  disabled?: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type DocType = DocumentItem["type"];

function inferDocType(file: File): DocType {
  const mime = file.type.toLowerCase();
  const ext  = file.name.split(".").pop()?.toLowerCase() ?? "";

  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (mime.startsWith("image/") || ["jpg","jpeg","png","webp","gif","svg"].includes(ext)) return "image";
  if (["application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(mime) || ext === "doc") return "doc";
  if (ext === "docx") return "docx";
  if (["application/vnd.ms-excel", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"].includes(mime) || ext === "xls") return "xls";
  if (ext === "xlsx") return "xlsx";
  if (mime === "text/csv" || ext === "csv") return "csv";
  if (mime === "text/plain" || ext === "txt") return "txt";
  return "other";
}

// ── File-type icon + colour ──────────────────────────────────────────────────

const DOC_ICON_CLASS: Record<DocType, string> = {
  pdf:   "text-red-500",
  image: "text-blue-500",
  doc:   "text-slate-500",
  docx:  "text-slate-500",
  xls:   "text-green-600",
  xlsx:  "text-green-600",
  csv:   "text-green-500",
  txt:   "text-slate-400",
  other: "text-gray-400",
};

function DocTypeIcon({ type, size = 18 }: { type: DocType; size?: number }) {
  const cls = `${DOC_ICON_CLASS[type] ?? "text-gray-400"} shrink-0`;
  if (type === "image")                       return <Image          size={size} className={cls} />;
  if (type === "xls" || type === "xlsx" || type === "csv") return <FileSpreadsheet size={size} className={cls} />;
  if (type === "pdf" || type === "doc" || type === "docx" || type === "txt") return <FileText size={size} className={cls} />;
  return <File size={size} className={cls} />;
}

// ── Per-file upload state ────────────────────────────────────────────────────

interface UploadingFile {
  id: string; // temp ID for tracking
  name: string;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function DocumentUploader({
  documents,
  onChange,
  onView,
  disabled = false,
}: DocumentUploaderProps) {
  const inputRef           = useRef<HTMLInputElement>(null);
  const [dragging, setDragging]   = useState(false);
  const [uploading, setUploading] = useState<UploadingFile[]>([]);
  const [errors, setErrors]       = useState<string[]>([]);

  // ── Upload a single File object ──────────────────────────────────────────

  const uploadFile = useCallback(
    async (file: File) => {
      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      // Track in-flight
      setUploading((prev) => [...prev, { id: tempId, name: file.name }]);
      setErrors([]);

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/upload/document", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body?.error ?? `Upload failed (${res.status})`);
        }

        const data = await res.json() as { url: string };

        const newDoc: DocumentItem = {
          url:      data.url,
          name:     file.name,
          type:     inferDocType(file),
          size:     file.size,
          mimeType: file.type || undefined,
        };

        onChange([...documents, newDoc]);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Unknown upload error";
        setErrors((prev) => [...prev, `${file.name}: ${message}`]);
      } finally {
        setUploading((prev) => prev.filter((u) => u.id !== tempId));
      }
    },
    [documents, onChange],
  );

  // ── Process a FileList (from input or drop) ──────────────────────────────

  const processFiles = useCallback(
    (files: FileList | null) => {
      if (!files || disabled) return;
      Array.from(files).forEach((f) => uploadFile(f));
    },
    [disabled, uploadFile],
  );

  // ── Drag handlers ────────────────────────────────────────────────────────

  const onDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      if (!disabled) setDragging(true);
    },
    [disabled],
  );

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  const onDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setDragging(false);
      processFiles(e.dataTransfer.files);
    },
    [processFiles],
  );

  // ── Input change ─────────────────────────────────────────────────────────

  const onInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      processFiles(e.target.files);
      // Reset so the same file can be re-selected after removal
      e.target.value = "";
    },
    [processFiles],
  );

  // ── Remove a document (client-side only) ────────────────────────────────

  const removeDoc = useCallback(
    (index: number) => {
      const next = documents.filter((_, i) => i !== index);
      onChange(next);
    },
    [documents, onChange],
  );

  // ── Derived ──────────────────────────────────────────────────────────────

  const isUploading = uploading.length > 0;
  const zoneBase =
    "relative rounded-xl border-2 border-dashed transition-colors duration-150 flex flex-col items-center justify-center gap-3 px-6 py-10 text-center";
  const zoneClass = disabled
    ? `${zoneBase} border-slate-200 bg-slate-50 cursor-not-allowed opacity-60`
    : dragging
    ? `${zoneBase} border-[#06054e] bg-blue-50/40 cursor-copy`
    : `${zoneBase} border-slate-200 bg-white hover:border-[#06054e] hover:bg-slate-50/60 cursor-pointer`;

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── DROP ZONE ─────────────────────────────────────────────────── */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Upload documents — click or drag files here"
        aria-disabled={disabled}
        className={zoneClass}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => { if (!disabled && (e.key === "Enter" || e.key === " ")) inputRef.current?.click(); }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          multiple
          disabled={disabled}
          className="sr-only"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.jpg,.jpeg,.png,.webp,.gif,.svg"
          onChange={onInputChange}
          tabIndex={-1}
        />

        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center">
          <Upload size={22} className={disabled ? "text-slate-300" : "text-slate-500"} />
        </div>

        {/* Text */}
        <div>
          <p className={`text-sm font-bold ${disabled ? "text-slate-400" : "text-slate-600"}`}>
            Drop files here or{" "}
            <span className={disabled ? "text-slate-400" : "text-[#06054e] underline underline-offset-2"}>
              click to browse
            </span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            PDF, Word, Excel, CSV, TXT, or image files
          </p>
        </div>

        {/* In-flight spinners */}
        {isUploading && (
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {uploading.map((u) => (
              <span
                key={u.id}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold text-slate-600 shadow-sm"
              >
                <Loader2 size={12} className="animate-spin text-[#06054e]" />
                {u.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── ERROR MESSAGES ────────────────────────────────────────────── */}
      {errors.length > 0 && (
        <ul className="space-y-1">
          {errors.map((err, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-red-600 font-medium">
              <X size={13} className="shrink-0 mt-0.5" />
              {err}
            </li>
          ))}
        </ul>
      )}

      {/* ── DOCUMENT LIST ─────────────────────────────────────────────── */}
      {documents.length > 0 && (
        <ul className="space-y-2">
          {documents.map((doc, idx) => (
            <li
              key={`${doc.url}-${idx}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-slate-200 px-3 py-2.5 shadow-sm"
            >
              {/* File type icon */}
              <DocTypeIcon type={doc.type} size={18} />

              {/* Name + size */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-bold text-slate-800 truncate"
                  title={doc.name}
                >
                  {doc.name}
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  {formatFileSize(doc.size)}
                </p>
              </div>

              {/* View button */}
              {onView && (
                <button
                  type="button"
                  onClick={() => onView(doc)}
                  title="View document"
                  aria-label={`View ${doc.name}`}
                  className="shrink-0 p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors duration-150"
                >
                  <Eye size={15} />
                </button>
              )}

              {/* Remove button */}
              <button
                type="button"
                onClick={() => removeDoc(idx)}
                disabled={disabled}
                title="Remove document"
                aria-label={`Remove ${doc.name}`}
                className="shrink-0 p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 disabled:pointer-events-none transition-colors duration-150"
              >
                <X size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
