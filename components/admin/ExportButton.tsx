"use client";

/**
 * components/admin/ExportButton.tsx
 *
 * Reusable export dropdown that offers CSV and PDF options.
 *
 * Usage:
 *   <ExportButton
 *     label="Export"
 *     rows={filteredRows}
 *     columns={EXPORT_COLUMNS}
 *     filename="role-requests"
 *     pdfTitle="Role Requests"
 *     pdfSubtitle="Awaiting Approval — 2025"
 *   />
 *
 * The component is fully self-contained — it imports jspdf dynamically so
 * the PDF library is only loaded when the user actually clicks "Export PDF".
 */

import { useState, useRef, useEffect } from "react";
import { Download, FileText, Table, Loader2 } from "lucide-react";
import { exportToCsv, exportToPdf } from "@/lib/export";
import type { ExportColumn, PdfOptions } from "@/lib/export";

interface ExportButtonProps {
  /** Rows to export — must already be filtered/sorted as desired */
  rows: Record<string, unknown>[];
  columns: ExportColumn[];
  /** Base filename without extension */
  filename: string;
  pdfTitle: string;
  pdfSubtitle?: string;
  pdfOrientation?: PdfOptions["orientation"];
  /** Button label (default "Export") */
  label?: string;
  /** Tailwind class overrides for the button */
  className?: string;
  disabled?: boolean;
  /**
   * Optional async function to fetch rows before exporting.
   * When provided, this is called instead of using the `rows` prop.
   * Useful when the displayed rows are paginated and you want to export all.
   */
  fetchRows?: () => Promise<Record<string, unknown>[]>;
}

export default function ExportButton({
  rows,
  columns,
  filename,
  pdfTitle,
  pdfSubtitle,
  pdfOrientation,
  label = "Export",
  className = "",
  disabled = false,
  fetchRows,
}: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleCsv() {
    setExporting("csv");
    setOpen(false);
    try {
      const exportRows = fetchRows ? await fetchRows() : rows;
      exportToCsv(exportRows, columns, filename);
    } catch (err) {
      console.error("CSV export failed:", err);
    } finally {
      setExporting(null);
    }
  }

  async function handlePdf() {
    setExporting("pdf");
    setOpen(false);
    try {
      const exportRows = fetchRows ? await fetchRows() : rows;
      await exportToPdf(exportRows, columns, filename, {
        title: pdfTitle,
        subtitle: pdfSubtitle,
        orientation: pdfOrientation,
      });
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setExporting(null);
    }
  }

  const isExporting = exporting !== null;
  // When fetchRows is provided the button is always enabled (count unknown until fetch)
  const count = rows.length;

  return (
    <div ref={ref} className="relative inline-block">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled || isExporting || (!fetchRows && count === 0)}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-300 bg-white text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-gray-400 transition disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
        title={!fetchRows && count === 0 ? "No data to export" : fetchRows ? "Export all records" : `Export ${count} row${count !== 1 ? "s" : ""}`}
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        {isExporting ? (exporting === "pdf" ? "Generating PDF…" : "Exporting…") : label}
        {!isExporting && (fetchRows || count > 0) && (
          <span className="bg-gray-100 text-gray-500 text-xs px-1.5 py-0.5 rounded-full font-normal">
            {fetchRows && count === 0 ? "All" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <button
            onClick={handleCsv}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
          >
            <Table className="w-4 h-4 text-green-600" />
            <div>
              <p className="font-medium">Export CSV</p>
              <p className="text-xs text-gray-400">Spreadsheet compatible</p>
            </div>
          </button>
          <div className="border-t border-gray-100" />
          <button
            onClick={handlePdf}
            className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition text-left"
          >
            <FileText className="w-4 h-4 text-red-500" />
            <div>
              <p className="font-medium">Export PDF</p>
              <p className="text-xs text-gray-400">Print-ready document</p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
