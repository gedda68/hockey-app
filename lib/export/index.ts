/**
 * lib/export/index.ts
 *
 * Client-side export utilities for CSV and PDF.
 *
 * CSV  — built manually (no library needed for simple tabular data).
 * PDF  — uses jspdf + jspdf-autotable.
 *
 * Both functions are browser-only (they trigger a file download).
 */

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExportColumn {
  /** Header label shown in the file */
  header: string;
  /** Key to read from each row object, or a transform function */
  key: string | ((row: Record<string, unknown>) => string | number | null | undefined);
}

// ── CSV ───────────────────────────────────────────────────────────────────────

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Wrap in quotes if the value contains commas, quotes, or newlines
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function exportToCsv(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string
): void {
  const header = columns.map((c) => escapeCell(c.header)).join(",");

  const body = rows
    .map((row) =>
      columns
        .map((col) => {
          const val =
            typeof col.key === "function"
              ? col.key(row)
              : (row[col.key] as unknown);
          return escapeCell(val);
        })
        .join(",")
    )
    .join("\n");

  const csv = `${header}\n${body}`;
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

// ── PDF ───────────────────────────────────────────────────────────────────────

export interface PdfOptions {
  title: string;
  subtitle?: string;
  orientation?: "portrait" | "landscape";
}

export async function exportToPdf(
  rows: Record<string, unknown>[],
  columns: ExportColumn[],
  filename: string,
  options: PdfOptions
): Promise<void> {
  // Dynamic import keeps jspdf out of the server bundle
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;

  const doc = new jsPDF({
    orientation: options.orientation ?? "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // ── Header ────────────────────────────────────────────────────────────────
  doc.setFillColor(6, 5, 78); // #06054e — app navy
  doc.rect(0, 0, pageWidth, 22, "F");

  doc.setTextColor(255, 215, 0); // #FFD700 — app gold
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("🏑 HOCKEY APP", 14, 10);

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.text(options.title, 14, 17);

  if (options.subtitle) {
    doc.setFontSize(8);
    doc.setTextColor(200, 200, 200);
    doc.text(options.subtitle, 14, 22);
  }

  // ── Generated timestamp ───────────────────────────────────────────────────
  const generated = `Generated ${new Date().toLocaleString("en-AU")}`;
  doc.setFontSize(7);
  doc.setTextColor(150, 150, 150);
  doc.text(generated, pageWidth - 14, 19, { align: "right" });

  // ── Table ─────────────────────────────────────────────────────────────────
  const tableHeaders = columns.map((c) => c.header);
  const tableRows = rows.map((row) =>
    columns.map((col) => {
      const val =
        typeof col.key === "function"
          ? col.key(row)
          : (row[col.key] as unknown);
      return val === null || val === undefined ? "" : String(val);
    })
  );

  autoTable(doc, {
    head: [tableHeaders],
    body: tableRows,
    startY: options.subtitle ? 26 : 24,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [6, 5, 78],
      textColor: [255, 215, 0],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    margin: { left: 14, right: 14 },
    didDrawPage: (data) => {
      // Page number footer
      const pageCount = (doc as unknown as { internal: { getNumberOfPages: () => number } }).internal.getNumberOfPages();
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Page ${data.pageNumber} of ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" }
      );
    },
  });

  doc.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}

// ── Shared download trigger ───────────────────────────────────────────────────

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Helper: fetch all pages from a paginated API then export ─────────────────

export async function fetchAllAndExport(
  apiUrl: string,
  exportFn: (rows: Record<string, unknown>[]) => void
): Promise<void> {
  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`Export fetch failed: ${res.status}`);
  const data = await res.json();

  // Support both flat arrays and paginated responses
  const rows: Record<string, unknown>[] =
    data.rows ?? data.members ?? data.players ?? data.requests ?? data.fees ?? data.entries ?? data;

  exportFn(rows);
}
