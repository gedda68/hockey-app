// components/admin/events/InlineDocumentViewer.tsx
// Full-screen modal that renders documents inline with PDF, image, and fallback support.

"use client";

import { useEffect, useCallback } from "react";
import {
  X,
  Download,
  FileText,
  FileSpreadsheet,
  FileImage,
  File,
  FileCode,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface DocumentItem {
  url: string;
  name: string;
  type:
    | "pdf"
    | "doc"
    | "docx"
    | "xls"
    | "xlsx"
    | "csv"
    | "txt"
    | "image"
    | "other";
  size: number;
  mimeType?: string;
}

interface InlineDocumentViewerProps {
  document: DocumentItem | null;
  isOpen: boolean;
  onClose: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

const TYPE_LABELS: Record<DocumentItem["type"], string> = {
  pdf: "PDF",
  doc: "Word",
  docx: "Word",
  xls: "Excel",
  xlsx: "Excel",
  csv: "CSV",
  txt: "Text",
  image: "Image",
  other: "File",
};

const TYPE_BADGE_COLORS: Record<DocumentItem["type"], string> = {
  pdf: "bg-red-100 text-red-700 border-red-200",
  doc: "bg-blue-100 text-blue-700 border-blue-200",
  docx: "bg-blue-100 text-blue-700 border-blue-200",
  xls: "bg-green-100 text-green-700 border-green-200",
  xlsx: "bg-green-100 text-green-700 border-green-200",
  csv: "bg-emerald-100 text-emerald-700 border-emerald-200",
  txt: "bg-slate-100 text-slate-600 border-slate-200",
  image: "bg-purple-100 text-purple-700 border-purple-200",
  other: "bg-gray-100 text-gray-600 border-gray-200",
};

function FileTypeIcon({
  type,
  size = 48,
}: {
  type: DocumentItem["type"];
  size?: number;
}) {
  const cls = `text-slate-400`;
  switch (type) {
    case "pdf":
      return <FileText size={size} className="text-red-400" />;
    case "doc":
    case "docx":
      return <FileText size={size} className="text-blue-400" />;
    case "xls":
    case "xlsx":
    case "csv":
      return <FileSpreadsheet size={size} className="text-green-400" />;
    case "image":
      return <FileImage size={size} className="text-purple-400" />;
    case "txt":
      return <FileCode size={size} className={cls} />;
    default:
      return <File size={size} className={cls} />;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function InlineDocumentViewer({
  document,
  isOpen,
  onClose,
}: InlineDocumentViewerProps) {
  // Keyboard: Escape closes
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      // Prevent body scroll while open (use globalThis.document to avoid
      // shadowing the `document` prop passed to this component)
      globalThis.document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      globalThis.document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen || !document) return null;

  const typeBadgeClass =
    TYPE_BADGE_COLORS[document.type] ?? TYPE_BADGE_COLORS.other;
  const typeLabel = TYPE_LABELS[document.type] ?? "File";

  // ── Backdrop click ──────────────────────────────────────────────────────────
  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    /* Overlay */
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      style={{ transition: "opacity 150ms ease" }}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={`Viewing ${document.name}`}
    >
      {/* Modal container */}
      <div
        className="relative max-w-5xl w-full max-h-[90vh] bg-white rounded-2xl overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── HEADER ─────────────────────────────────────────────────────── */}
        <div
          className="flex items-center gap-3 px-5 py-3 shrink-0"
          style={{ backgroundColor: "#06054e" }}
        >
          {/* File name */}
          <span
            className="flex-1 min-w-0 text-sm font-black text-white uppercase truncate"
            title={document.name}
          >
            {document.name}
          </span>

          {/* Type badge */}
          <span
            className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wide whitespace-nowrap ${typeBadgeClass}`}
          >
            {typeLabel}
          </span>

          {/* File size */}
          <span className="shrink-0 text-xs text-white/60 font-medium">
            {formatBytes(document.size)}
          </span>

          {/* Download button */}
          <a
            href={document.url}
            download={document.name}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#06054e] text-xs font-black uppercase tracking-wide transition-colors duration-150"
            aria-label={`Download ${document.name}`}
          >
            <Download size={13} />
            Download
          </a>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-colors duration-150"
            aria-label="Close document viewer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── CONTENT ────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-hidden min-h-0">
          {/* PDF */}
          {document.type === "pdf" && (
            <div className="w-full h-full min-h-[70vh]">
              <iframe
                src={document.url}
                className="w-full h-full min-h-[70vh] border-0"
                title={document.name}
              />
              <noscript>
                <div className="p-6 text-center">
                  <p className="text-slate-600 mb-3">
                    JavaScript is required to preview PDFs.
                  </p>
                  <a
                    href={document.url}
                    download={document.name}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-500 text-[#06054e] font-black uppercase text-sm transition-colors"
                  >
                    <Download size={15} />
                    Download PDF
                  </a>
                </div>
              </noscript>
            </div>
          )}

          {/* Image */}
          {document.type === "image" && (
            <div className="w-full h-full min-h-[70vh] overflow-auto flex items-center justify-center bg-slate-50 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={document.url}
                alt={document.name}
                className="max-w-full max-h-full object-contain mx-auto rounded-lg shadow"
              />
            </div>
          )}

          {/* Other — no browser preview */}
          {document.type !== "pdf" && document.type !== "image" && (
            <div className="w-full h-full min-h-[70vh] flex flex-col items-center justify-center gap-5 bg-slate-50 p-8">
              <FileTypeIcon type={document.type} size={64} />

              <div className="text-center space-y-1">
                <p className="text-base font-black text-slate-800 uppercase">
                  {document.name}
                </p>
                <p className="text-sm text-slate-500">
                  {formatBytes(document.size)}
                </p>
              </div>

              <p className="text-sm text-slate-500 text-center max-w-xs">
                This file type cannot be previewed in the browser.
              </p>

              <a
                href={document.url}
                download={document.name}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-amber-400 hover:bg-amber-500 text-[#06054e] font-black uppercase text-sm tracking-wide transition-colors duration-150 shadow"
              >
                <Download size={16} />
                Download File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
