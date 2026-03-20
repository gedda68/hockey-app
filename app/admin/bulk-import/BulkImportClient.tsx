"use client";
// app/admin/bulk-import/BulkImportClient.tsx
// Super-admin bulk upload page — CSV / XLSX import for all major entities.

import { useState, useRef, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import * as XLSX from "xlsx";
import {
  Upload, Download, CheckCircle, XCircle, AlertCircle,
  ChevronDown, ChevronRight, RefreshCw, FileSpreadsheet, Info,
} from "lucide-react";

// ── Entity definitions ────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  required: boolean;
  example: string;
  note?: string;
}

interface EntityDef {
  key: string;
  label: string;
  icon: string;
  color: string;
  description: string;
  fields: FieldDef[];
}

const ENTITIES: EntityDef[] = [
  {
    key: "members",
    label: "Members",
    icon: "📝",
    color: "from-cyan-500 to-cyan-600",
    description: "Club members with personal and contact information.",
    fields: [
      { key: "firstName",      label: "First Name",       required: true,  example: "Jane" },
      { key: "lastName",       label: "Last Name",        required: true,  example: "Smith" },
      { key: "email",          label: "Email",            required: false, example: "jane@example.com" },
      { key: "phone",          label: "Phone",            required: false, example: "0412 345 678" },
      { key: "dateOfBirth",    label: "Date of Birth",    required: false, example: "15/06/1995", note: "DD/MM/YYYY or YYYY-MM-DD" },
      { key: "gender",         label: "Gender",           required: false, example: "Female" },
      { key: "address",        label: "Address",          required: false, example: "12 Main St" },
      { key: "suburb",         label: "Suburb",           required: false, example: "Brisbane" },
      { key: "state",          label: "State",            required: false, example: "QLD" },
      { key: "postcode",       label: "Postcode",         required: false, example: "4000" },
      { key: "clubName",       label: "Club Name",        required: false, example: "Commercial Hockey Club", note: "Or use clubId" },
      { key: "clubId",         label: "Club ID",          required: false, example: "abc123", note: "Optional if clubName provided" },
      { key: "membershipType", label: "Membership Type",  required: false, example: "standard" },
    ],
  },
  {
    key: "players",
    label: "Players",
    icon: "⭐",
    color: "from-yellow-500 to-yellow-600",
    description: "Player profiles — linked to a club with registration details.",
    fields: [
      { key: "firstName",          label: "First Name",         required: true,  example: "Tom" },
      { key: "lastName",           label: "Last Name",          required: true,  example: "Jones" },
      { key: "dateOfBirth",        label: "Date of Birth",      required: true,  example: "22/03/2005", note: "DD/MM/YYYY or YYYY-MM-DD" },
      { key: "gender",             label: "Gender",             required: false, example: "Male" },
      { key: "email",              label: "Email",              required: false, example: "tom@example.com" },
      { key: "phone",              label: "Phone",              required: false, example: "0400 111 222" },
      { key: "address",            label: "Address",            required: false, example: "45 Park Rd" },
      { key: "suburb",             label: "Suburb",             required: false, example: "Toowong" },
      { key: "state",              label: "State",              required: false, example: "QLD" },
      { key: "postcode",           label: "Postcode",           required: false, example: "4066" },
      { key: "clubName",           label: "Club Name",          required: false, example: "Commercial Hockey Club", note: "Or use clubId" },
      { key: "clubId",             label: "Club ID",            required: false, example: "abc123" },
      { key: "position",           label: "Position",           required: false, example: "Midfielder" },
      { key: "preferredHand",      label: "Preferred Hand",     required: false, example: "Right" },
      { key: "registrationNumber", label: "Registration No.",   required: false, example: "1042", note: "Auto-assigned if blank" },
    ],
  },
  {
    key: "users",
    label: "Users",
    icon: "👤",
    color: "from-pink-500 to-pink-600",
    description: "Admin/portal user accounts. A temporary password is generated and users must change it on first login.",
    fields: [
      { key: "firstName",       label: "First Name",       required: true,  example: "Sarah" },
      { key: "lastName",        label: "Last Name",        required: true,  example: "Connor" },
      { key: "email",           label: "Email",            required: true,  example: "sarah@club.com.au" },
      { key: "role",            label: "Role",             required: true,  example: "club-admin", note: "club-admin, registrar, coach, manager, association-admin, etc." },
      { key: "clubName",        label: "Club Name",        required: false, example: "Commercial Hockey Club", note: "Or use clubId" },
      { key: "clubId",          label: "Club ID",          required: false, example: "abc123" },
      { key: "associationName", label: "Association Name", required: false, example: "Brisbane Hockey Association" },
      { key: "associationId",   label: "Association ID",   required: false, example: "bha" },
    ],
  },
  {
    key: "clubs",
    label: "Clubs",
    icon: "🏢",
    color: "from-indigo-500 to-indigo-600",
    description: "Club records. Existing clubs (matched by name) will be updated.",
    fields: [
      { key: "name",           label: "Club Name",       required: true,  example: "Commercial Hockey Club" },
      { key: "shortName",      label: "Short Name",      required: true,  example: "CHC" },
      { key: "email",          label: "Email",           required: false, example: "info@chc.com.au" },
      { key: "phone",          label: "Phone",           required: false, example: "07 3456 7890" },
      { key: "website",        label: "Website",         required: false, example: "https://chc.com.au" },
      { key: "address",        label: "Address",         required: false, example: "1 Hockey Way" },
      { key: "suburb",         label: "Suburb",          required: false, example: "Everton Park" },
      { key: "state",          label: "State",           required: false, example: "QLD" },
      { key: "postcode",       label: "Postcode",        required: false, example: "4053" },
      { key: "primaryColor",   label: "Primary Color",   required: false, example: "#0033cc", note: "Hex colour code" },
      { key: "secondaryColor", label: "Secondary Color", required: false, example: "#FFD700", note: "Hex colour code" },
    ],
  },
  {
    key: "associations",
    label: "Associations",
    icon: "🏛️",
    color: "from-teal-500 to-teal-600",
    description: "Association records. Existing associations (matched by name) will be updated.",
    fields: [
      { key: "name",           label: "Association Name", required: true,  example: "Brisbane Hockey Association" },
      { key: "shortName",      label: "Short Name / Code",required: true,  example: "BHA" },
      { key: "email",          label: "Email",            required: false, example: "admin@bha.com.au" },
      { key: "phone",          label: "Phone",            required: false, example: "07 3000 0000" },
      { key: "website",        label: "Website",          required: false, example: "https://bha.com.au" },
      { key: "address",        label: "Address",          required: false, example: "100 Sport Ave" },
      { key: "suburb",         label: "Suburb",           required: false, example: "Milton" },
      { key: "state",          label: "State",            required: false, example: "QLD" },
      { key: "postcode",       label: "Postcode",         required: false, example: "4064" },
      { key: "primaryColor",   label: "Primary Color",    required: false, example: "#003399", note: "Hex colour code" },
      { key: "secondaryColor", label: "Secondary Color",  required: false, example: "#FFCC00", note: "Hex colour code" },
    ],
  },
  {
    key: "teams",
    label: "Teams",
    icon: "👥",
    color: "from-blue-500 to-blue-600",
    description: "Club teams. Provide clubName or clubId to associate the team with a club.",
    fields: [
      { key: "name",     label: "Team Name",  required: true,  example: "U16 Girls A" },
      { key: "ageGroup", label: "Age Group",  required: true,  example: "U16" },
      { key: "season",   label: "Season",     required: false, example: "2025", note: "Defaults to current year" },
      { key: "clubName", label: "Club Name",  required: false, example: "Commercial Hockey Club", note: "Or use clubId — one is required" },
      { key: "clubId",   label: "Club ID",    required: false, example: "abc123" },
      { key: "division", label: "Division",   required: false, example: "Division 1" },
      { key: "gender",   label: "Gender",     required: false, example: "Female" },
      { key: "coach",    label: "Coach",      required: false, example: "John Brown" },
      { key: "manager",  label: "Manager",    required: false, example: "Mary White" },
    ],
  },
  {
    key: "rep-teams",
    label: "Rep Teams",
    icon: "🏆",
    color: "from-purple-500 to-purple-600",
    description: "Representative / association teams.",
    fields: [
      { key: "name",          label: "Team Name",        required: true,  example: "QLD U18 Men" },
      { key: "ageGroup",      label: "Age Group",        required: true,  example: "U18" },
      { key: "season",        label: "Season",           required: false, example: "2025", note: "Defaults to current year" },
      { key: "division",      label: "Division",         required: false, example: "State League" },
      { key: "gender",        label: "Gender",           required: false, example: "Male" },
      { key: "coach",         label: "Coach",            required: false, example: "Kim Lee" },
      { key: "manager",       label: "Manager",          required: false, example: "Pat Green" },
      { key: "associationId", label: "Association ID",   required: false, example: "bha" },
    ],
  },
];

// ── template helpers ──────────────────────────────────────────────────────────

function downloadTemplate(entity: EntityDef) {
  // Build header row and one example row
  const headers = entity.fields.map((f) => f.key);
  const examples = entity.fields.map((f) => f.example);

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, examples]);

  // Column widths
  ws["!cols"] = headers.map(() => ({ wch: 24 }));

  XLSX.utils.book_append_sheet(wb, ws, entity.label);
  XLSX.writeFile(wb, `template_${entity.key}.xlsx`);
}

// ── parse uploaded file → rows ────────────────────────────────────────────────

function parseFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error("File read error"));
    reader.readAsArrayBuffer(file);
  });
}

// ── result types ──────────────────────────────────────────────────────────────

interface ImportResult {
  imported: number;
  updated:  number;
  skipped:  number;
  errors:   Array<{ row: number; message: string }>;
}

// ── sub-component: EntityPanel ────────────────────────────────────────────────

function EntityPanel({ entity }: { entity: EntityDef }) {
  const [file, setFile]           = useState<File | null>(null);
  const [rows, setRows]           = useState<Record<string, string>[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [dragging, setDragging]   = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult]       = useState<ImportResult | null>(null);
  const [showSchema, setShowSchema] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (f: File) => {
    setFile(f);
    setResult(null);
    setParseError(null);
    try {
      const parsed = await parseFile(f);
      setRows(parsed);
    } catch {
      setParseError("Could not parse file. Please use the template or ensure columns match.");
      setRows([]);
    }
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/bulk-import/${entity.key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import failed");
      setResult(data);
    } catch (err: any) {
      setResult({ imported: 0, updated: 0, skipped: 0, errors: [{ row: 0, message: err.message }] });
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setFile(null);
    setRows([]);
    setResult(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const requiredCols = entity.fields.filter((f) => f.required).map((f) => f.key);
  const previewCols  = entity.fields.slice(0, 6).map((f) => f.key);
  const previewRows  = rows.slice(0, 5);

  return (
    <div className="space-y-5">

      {/* Header strip */}
      <div className={`rounded-2xl bg-gradient-to-r ${entity.color} p-5 text-white flex items-start justify-between gap-4`}>
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{entity.icon}</span>
            <h2 className="text-xl font-black uppercase">{entity.label}</h2>
          </div>
          <p className="text-sm text-white/80">{entity.description}</p>
        </div>
        <button
          onClick={() => downloadTemplate(entity)}
          className="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-colors"
        >
          <Download size={15} />
          Download Template
        </button>
      </div>

      {/* Schema toggle */}
      <button
        onClick={() => setShowSchema((s) => !s)}
        className="flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
      >
        {showSchema ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        <Info size={15} />
        Column reference ({entity.fields.length} columns, {requiredCols.length} required)
      </button>

      {showSchema && (
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-4 py-2 font-black text-slate-600 w-1/4">Column (key)</th>
                <th className="text-left px-4 py-2 font-black text-slate-600 w-1/4">Label</th>
                <th className="text-left px-4 py-2 font-black text-slate-600 w-1/6">Required</th>
                <th className="text-left px-4 py-2 font-black text-slate-600 w-1/4">Example</th>
                <th className="text-left px-4 py-2 font-black text-slate-600">Notes</th>
              </tr>
            </thead>
            <tbody>
              {entity.fields.map((f, i) => (
                <tr key={f.key} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                  <td className="px-4 py-2 font-mono text-xs text-indigo-700">{f.key}</td>
                  <td className="px-4 py-2 text-slate-700">{f.label}</td>
                  <td className="px-4 py-2">
                    {f.required
                      ? <span className="text-xs font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">Required</span>
                      : <span className="text-xs text-slate-400">Optional</span>}
                  </td>
                  <td className="px-4 py-2 text-slate-500 font-mono text-xs">{f.example}</td>
                  <td className="px-4 py-2 text-slate-400 text-xs">{f.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drop zone */}
      {!file && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragging
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-300 hover:border-indigo-300 hover:bg-slate-50"
          }`}
        >
          <FileSpreadsheet size={40} className="mx-auto mb-3 text-slate-400" />
          <p className="font-black text-slate-600 text-lg">Drop your CSV or Excel file here</p>
          <p className="text-slate-400 text-sm mt-1">or click to browse  ·  .csv, .xlsx, .xls</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>
      )}

      {/* Parse error */}
      {parseError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <XCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-bold text-red-700">Could not read file</p>
            <p className="text-sm text-red-600 mt-0.5">{parseError}</p>
          </div>
        </div>
      )}

      {/* File loaded — preview */}
      {file && rows.length > 0 && !result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={18} className="text-indigo-600" />
              <span className="font-bold text-slate-700">{file.name}</span>
              <span className="text-sm bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                {rows.length} row{rows.length !== 1 ? "s" : ""}
              </span>
            </div>
            <button onClick={reset} className="text-sm text-slate-500 hover:text-red-500 font-bold transition-colors">
              Remove file
            </button>
          </div>

          {/* Preview table */}
          <div className="border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-3 py-2 text-left font-black text-slate-500 text-xs">#</th>
                  {previewCols.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-black text-slate-600 text-xs uppercase whitespace-nowrap">
                      {col}
                      {requiredCols.includes(col) && <span className="text-red-400 ml-0.5">*</span>}
                    </th>
                  ))}
                  {entity.fields.length > 6 && (
                    <th className="px-3 py-2 text-slate-400 text-xs">+{entity.fields.length - 6} more</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {previewRows.map((row, i) => (
                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                    <td className="px-3 py-2 text-slate-400 text-xs">{i + 2}</td>
                    {previewCols.map((col) => (
                      <td key={col} className={`px-3 py-2 text-slate-700 ${
                        requiredCols.includes(col) && !row[col]
                          ? "bg-red-50 text-red-600 font-bold"
                          : ""
                      }`}>
                        {row[col] || <span className="text-slate-300">—</span>}
                      </td>
                    ))}
                    {entity.fields.length > 6 && <td />}
                  </tr>
                ))}
                {rows.length > 5 && (
                  <tr>
                    <td colSpan={previewCols.length + 2} className="px-3 py-2 text-center text-slate-400 text-xs">
                      … {rows.length - 5} more rows not shown
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Validation hints */}
          {requiredCols.some((col) => previewRows.some((r) => !r[col])) && (
            <div className="flex items-start gap-2 text-sm bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertCircle size={16} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <span className="text-amber-700">Some required fields appear empty in the preview. Rows with missing required fields will be skipped.</span>
            </div>
          )}

          {/* Import button */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={onImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white rounded-xl font-black transition-colors"
            >
              {importing ? (
                <><RefreshCw size={16} className="animate-spin" />Importing…</>
              ) : (
                <><Upload size={16} />Import {rows.length} row{rows.length !== 1 ? "s" : ""}</>
              )}
            </button>
            <button onClick={reset} className="px-4 py-3 text-slate-500 hover:text-red-500 font-bold transition-colors text-sm">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <ResultCard label="Imported" value={result.imported} color="bg-green-50 text-green-700 border-green-200" />
            <ResultCard label="Updated"  value={result.updated}  color="bg-blue-50 text-blue-700 border-blue-200" />
            <ResultCard label="Skipped"  value={result.skipped}  color="bg-slate-50 text-slate-600 border-slate-200" />
            <ResultCard label="Errors"   value={result.errors.length} color="bg-red-50 text-red-700 border-red-200" />
          </div>

          {/* Success banner */}
          {result.errors.length === 0 && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl p-4">
              <CheckCircle size={20} className="text-green-600 flex-shrink-0" />
              <div>
                <p className="font-black text-green-700">Import complete!</p>
                <p className="text-sm text-green-600">
                  {result.imported} new record{result.imported !== 1 ? "s" : ""} added
                  {result.updated > 0 ? `, ${result.updated} updated` : ""}.
                </p>
              </div>
            </div>
          )}

          {/* Error list */}
          {result.errors.length > 0 && (
            <div className="border border-red-200 rounded-xl overflow-hidden">
              <div className="bg-red-50 px-4 py-2 border-b border-red-200 flex items-center gap-2">
                <XCircle size={15} className="text-red-500" />
                <span className="font-black text-red-700 text-sm">{result.errors.length} error{result.errors.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-red-100 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 px-4 py-2 text-sm">
                    <span className="text-red-400 font-mono text-xs mt-0.5">Row {e.row || "?"}</span>
                    <span className="text-red-700">{e.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              onClick={reset}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-bold text-slate-700 transition-colors"
            >
              <Upload size={14} />
              Upload another file
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ResultCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className={`border rounded-xl p-4 text-center ${color}`}>
      <div className="text-3xl font-black">{value}</div>
      <div className="text-xs font-bold uppercase mt-1 opacity-75">{label}</div>
    </div>
  );
}

// ── main page component ───────────────────────────────────────────────────────

export default function BulkImportClient() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initial = ENTITIES.find((e) => e.key === tabParam) ?? ENTITIES[0];
  const [activeKey, setActiveKey] = useState(initial.key);

  // Sync tab with URL param changes
  useEffect(() => {
    const key = searchParams.get("tab");
    const found = ENTITIES.find((e) => e.key === key);
    if (found) setActiveKey(found.key);
  }, [searchParams]);

  const activeEntity = ENTITIES.find((e) => e.key === activeKey) ?? ENTITIES[0];

  return (
    <div className="p-6 max-w-5xl mx-auto">

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg">
            📥
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase">Bulk Import</h1>
            <p className="text-slate-500 text-sm">Upload CSV or Excel files to import data in bulk</p>
          </div>
        </div>

        <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-800">
            <strong>Before you start:</strong> Download the template for the entity you want to import.
            Fill it in, then upload it here. Existing records are matched and updated — duplicates are not created.
            <strong> This feature is only visible to super-admins.</strong>
          </div>
        </div>
      </div>

      {/* Entity tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ENTITIES.map((e) => (
          <button
            key={e.key}
            onClick={() => setActiveKey(e.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              activeKey === e.key
                ? "bg-gradient-to-r " + e.color + " text-white shadow-md"
                : "bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            <span>{e.icon}</span>
            {e.label}
          </button>
        ))}
      </div>

      {/* Active entity panel */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        <EntityPanel key={activeKey} entity={activeEntity} />
      </div>
    </div>
  );
}
