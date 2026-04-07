"use client";

/**
 * /admin/nomination-windows
 * Manage nomination windows for rep-team, grade-pref, club-position, assoc-position.
 * Admins can create, open, close, and finalise windows from here.
 */

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  CalendarDays,
  CheckCircle,
  Clock,
  XCircle,
  ChevronRight,
  Loader2,
  AlertCircle,
  Users,
  Pencil,
  Trash2,
  Send,
  Lock,
  Trophy,
  Briefcase,
  Vote,
  Star,
} from "lucide-react";
import type { NominationWindow, NominationCategory, NominationWorkflow, WindowStatus } from "@/types/nominations";

// ── Types ─────────────────────────────────────────────────────────────────────

type TabFilter = "all" | WindowStatus;

interface CreateForm {
  category: NominationCategory;
  workflow: NominationWorkflow;
  title: string;
  description: string;
  ageGroup: string;
  gender: string;
  positionTitle: string;
  positionRole: string;
  scopeType: "club" | "association";
  scopeId: string;
  scopeName: string;
  seasonYear: string;
  openDate: string;
  closeDate: string;
  requiresFinancialMembership: boolean;
  requiresStatement: boolean;
  electorateType: "committee" | "all-members";
}

// ── Constants ─────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear().toString();
const YEARS = [CURRENT_YEAR, String(Number(CURRENT_YEAR) + 1), String(Number(CURRENT_YEAR) - 1)];

const STATUS_STYLES: Record<WindowStatus, string> = {
  draft:      "bg-slate-100 text-slate-600 border-slate-200",
  open:       "bg-green-100 text-green-700 border-green-200",
  closed:     "bg-red-100 text-red-700 border-red-200",
  balloting:  "bg-purple-100 text-purple-700 border-purple-200",
  completed:  "bg-blue-100 text-blue-700 border-blue-200",
  finalised:  "bg-amber-100 text-amber-700 border-amber-200",
  ratified:   "bg-teal-100 text-teal-700 border-teal-200",
  published:  "bg-emerald-100 text-emerald-700 border-emerald-200",
};

const STATUS_ICONS: Record<WindowStatus, React.ReactNode> = {
  draft:     <Pencil size={11} />,
  open:      <CheckCircle size={11} />,
  closed:    <Lock size={11} />,
  balloting: <Vote size={11} />,
  completed: <Trophy size={11} />,
  finalised: <CheckCircle size={11} />,
  ratified:  <CheckCircle size={11} />,
  published: <Send size={11} />,
};

const CATEGORY_ICONS: Record<NominationCategory, React.ReactNode> = {
  "rep-team":       <Trophy size={14} />,
  "grade-pref":     <Star size={14} />,
  "club-position":  <Briefcase size={14} />,
  "assoc-position": <Users size={14} />,
};

const CATEGORY_LABELS: Record<NominationCategory, string> = {
  "rep-team":       "Rep Team",
  "grade-pref":     "Grade Preference",
  "club-position":  "Club Position",
  "assoc-position": "Association Position",
};

const EMPTY_FORM: CreateForm = {
  category:                    "rep-team",
  workflow:                    "approval",
  title:                       "",
  description:                 "",
  ageGroup:                    "",
  gender:                      "",
  positionTitle:               "",
  positionRole:                "",
  scopeType:                   "association",
  scopeId:                     "",
  scopeName:                   "",
  seasonYear:                  CURRENT_YEAR,
  openDate:                    "",
  closeDate:                   "",
  requiresFinancialMembership: true,
  requiresStatement:           false,
  electorateType:              "committee",
};

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function isWindowCurrentlyOpen(win: NominationWindow): boolean {
  if (win.status !== "open") return false;
  const today = new Date().toISOString().split("T")[0];
  return today >= win.openDate && today <= win.closeDate;
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: WindowStatus }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_STYLES[status]}`}>
      {STATUS_ICONS[status]}
      {status}
    </span>
  );
}

// ── Window card ───────────────────────────────────────────────────────────────

interface WindowCardProps {
  win: NominationWindow;
  onTransition: (windowId: string, status: WindowStatus) => void;
  onStartBallot: (windowId: string) => void;
  onDelete: (windowId: string) => void;
  transitioning: string | null;
}

function WindowCard({ win, onTransition, onStartBallot, onDelete, transitioning }: WindowCardProps) {
  const isActive = transitioning === win.windowId;
  const nowOpen  = isWindowCurrentlyOpen(win);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 hover:border-[#06054e]/20 hover:shadow-md transition-all p-5">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 text-[#06054e] opacity-70 flex-shrink-0">
            {CATEGORY_ICONS[win.category]}
          </div>
          <div className="min-w-0">
            <h3 className="font-black text-[#06054e] text-sm leading-tight truncate">{win.title}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {CATEGORY_LABELS[win.category]} · {win.workflow} · {win.seasonYear}
            </p>
          </div>
        </div>
        <StatusBadge status={win.status} />
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-4">
        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} className="text-slate-400" />
          <span>Opens {fmtDate(win.openDate)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CalendarDays size={12} className="text-slate-400" />
          <span>Closes {fmtDate(win.closeDate)}</span>
        </div>
        {win.ageGroup && (
          <div className="flex items-center gap-1.5">
            <Users size={12} className="text-slate-400" />
            <span>{win.ageGroup}{win.gender ? ` · ${win.gender}` : ""}</span>
          </div>
        )}
        {win.positionTitle && (
          <div className="flex items-center gap-1.5">
            <Briefcase size={12} className="text-slate-400" />
            <span>{win.positionTitle}</span>
          </div>
        )}
        <div className="flex items-center gap-1.5 col-span-2">
          <span className="text-slate-400">Scope:</span>
          <span className="font-medium truncate">{win.scopeName}</span>
        </div>
        {win.finalisedAt && (
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-amber-500" />
            <span className="text-amber-700">Finalised {fmtDate(win.finalisedAt)}</span>
          </div>
        )}
        {win.ratifiedAt && (
          <div className="flex items-center gap-1.5">
            <CheckCircle size={12} className="text-teal-500" />
            <span className="text-teal-700">Ratified {fmtDate(win.ratifiedAt)}</span>
          </div>
        )}
        {win.publishedAt && (
          <div className="flex items-center gap-1.5">
            <Send size={12} className="text-emerald-500" />
            <span className="text-emerald-700">Published {fmtDate(win.publishedAt)}</span>
          </div>
        )}
      </div>

      {win.description && (
        <p className="text-xs text-slate-500 mb-4 line-clamp-2">{win.description}</p>
      )}

      {/* Active indicator */}
      {nowOpen && (
        <div className="flex items-center gap-1.5 text-xs text-green-700 bg-green-50 rounded-xl px-3 py-1.5 mb-3 font-semibold">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          Nominations currently open
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        {win.status === "draft" && (
          <>
            <button
              onClick={() => onTransition(win.windowId, "open")}
              disabled={isActive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#06054e] text-white rounded-xl text-xs font-black uppercase hover:bg-[#0a0870] disabled:opacity-50 transition-colors"
            >
              {isActive ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
              Publish
            </button>
            <button
              onClick={() => onDelete(win.windowId)}
              disabled={isActive}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-xl text-xs font-black uppercase hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              <Trash2 size={11} />
              Delete
            </button>
          </>
        )}

        {win.status === "open" && (
          <button
            onClick={() => onTransition(win.windowId, "closed")}
            disabled={isActive}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-xl text-xs font-black uppercase hover:bg-orange-100 disabled:opacity-50 transition-colors"
          >
            {isActive ? <Loader2 size={11} className="animate-spin" /> : <Lock size={11} />}
            Close Window
          </button>
        )}

        {win.status === "closed" && (
          <>
            {win.workflow === "ballot" && (
              <button
                onClick={() => onStartBallot(win.windowId)}
                disabled={isActive}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-black uppercase hover:bg-purple-100 disabled:opacity-50 transition-colors"
              >
                {isActive ? <Loader2 size={11} className="animate-spin" /> : <Vote size={11} />}
                Start Ballot
              </button>
            )}
            {win.category === "rep-team" && win.workflow === "approval" && (
              <button
                onClick={() => onTransition(win.windowId, "finalised")}
                disabled={isActive}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-black uppercase hover:bg-amber-100 disabled:opacity-50 transition-colors"
              >
                {isActive ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
                Finalise Squad
              </button>
            )}
            {(win.workflow !== "ballot" && win.category !== "rep-team") && (
              <button
                onClick={() => onTransition(win.windowId, "completed")}
                disabled={isActive}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black uppercase hover:bg-blue-100 disabled:opacity-50 transition-colors"
              >
                {isActive ? <Loader2 size={11} className="animate-spin" /> : <Trophy size={11} />}
                Mark Complete
              </button>
            )}
          </>
        )}

        {win.status === "balloting" && (
          <button
            onClick={() => onTransition(win.windowId, "completed")}
            disabled={isActive}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-xl text-xs font-black uppercase hover:bg-blue-100 disabled:opacity-50 transition-colors"
          >
            {isActive ? <Loader2 size={11} className="animate-spin" /> : <Trophy size={11} />}
            Finalise Ballot
          </button>
        )}

        {win.status === "finalised" && (
          <button
            onClick={() => onTransition(win.windowId, "ratified")}
            disabled={isActive}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-xl text-xs font-black uppercase hover:bg-teal-100 disabled:opacity-50 transition-colors"
          >
            {isActive ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle size={11} />}
            Ratify Squad
          </button>
        )}

        {win.status === "ratified" && (
          <button
            onClick={() => onTransition(win.windowId, "published")}
            disabled={isActive}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-black uppercase hover:bg-emerald-100 disabled:opacity-50 transition-colors"
          >
            {isActive ? <Loader2 size={11} className="animate-spin" /> : <Send size={11} />}
            Publish Squad
          </button>
        )}

        {/* Links */}
        <div className="flex items-center gap-3 ml-auto">
          {win.status === "balloting" && (
            <a
              href={`/admin/windows/${win.windowId}/ballot`}
              className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-xl text-xs font-black uppercase hover:bg-purple-100 transition-colors"
            >
              <Vote size={11} />
              Manage Ballot
            </a>
          )}
          {win.status !== "draft" && (
            <a
              href={`/admin/nominations?windowId=${win.windowId}`}
              className="flex items-center gap-1 px-3 py-1.5 text-[#06054e] text-xs font-bold hover:underline"
            >
              View Nominations
              <ChevronRight size={12} />
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────

interface CreateModalProps {
  onClose: () => void;
  onCreated: (win: NominationWindow) => void;
}

function CreateModal({ onClose, onCreated }: CreateModalProps) {
  const [form, setForm]       = useState<CreateForm>(EMPTY_FORM);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  function set<K extends keyof CreateForm>(key: K, val: CreateForm[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  // Derive sensible workflow default when category changes
  function handleCategoryChange(cat: NominationCategory) {
    const workflow: NominationWorkflow =
      cat === "rep-team" || cat === "grade-pref" ? "approval" : "approval";
    setForm((prev) => ({ ...prev, category: cat, workflow }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const body: Record<string, unknown> = {
      category:  form.category,
      workflow:  form.workflow,
      title:     form.title.trim(),
      scopeType: form.scopeType,
      scopeId:   form.scopeId.trim(),
      scopeName: form.scopeName.trim(),
      seasonYear: form.seasonYear,
      openDate:  form.openDate,
      closeDate: form.closeDate,
      requiresFinancialMembership: form.requiresFinancialMembership,
      requiresStatement:           form.requiresStatement,
      electorateType:              form.electorateType,
    };
    if (form.description.trim())  body.description  = form.description.trim();
    if (form.ageGroup.trim())     body.ageGroup     = form.ageGroup.trim();
    if (form.gender)              body.gender       = form.gender;
    if (form.positionTitle.trim()) body.positionTitle = form.positionTitle.trim();
    if (form.positionRole.trim())  body.positionRole  = form.positionRole.trim();

    setSaving(true);
    try {
      const res = await fetch("/api/admin/nomination-windows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        setError(err.error ?? "Failed to create window");
        return;
      }
      const data = await res.json();
      onCreated(data.window);
    } finally {
      setSaving(false);
    }
  }

  const needsAgeGroup    = form.category === "rep-team" || form.category === "grade-pref";
  const needsPosition    = form.category === "club-position" || form.category === "assoc-position";
  const showElectorate   = form.workflow === "ballot";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-black uppercase text-[#06054e]">New Nomination Window</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <XCircle size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Category + Workflow */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Category</label>
              <select
                value={form.category}
                onChange={(e) => handleCategoryChange(e.target.value as NominationCategory)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
              >
                <option value="rep-team">Rep Team</option>
                <option value="grade-pref">Grade Preference</option>
                <option value="club-position">Club Position</option>
                <option value="assoc-position">Association Position</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Workflow</label>
              <select
                value={form.workflow}
                onChange={(e) => set("workflow", e.target.value as NominationWorkflow)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
              >
                <option value="approval">Approval (admin decides)</option>
                <option value="ballot">Ballot (elected members vote)</option>
              </select>
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. 2026 Under 16 Rep Team Nominations"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              placeholder="Optional description shown to nominees"
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent resize-none"
            />
          </div>

          {/* Age group (rep-team / grade-pref) */}
          {needsAgeGroup && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Age Group</label>
                <input
                  type="text"
                  value={form.ageGroup}
                  onChange={(e) => set("ageGroup", e.target.value)}
                  placeholder="e.g. Under 16, Open, Masters 40"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => set("gender", e.target.value as CreateForm["gender"])}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
                >
                  <option value="">Open / Not specified</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="open">Open</option>
                </select>
              </div>
            </div>
          )}

          {/* Position (club/assoc position) */}
          {needsPosition && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Position Title</label>
                <input
                  type="text"
                  value={form.positionTitle}
                  onChange={(e) => set("positionTitle", e.target.value)}
                  placeholder="e.g. Club Secretary"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">System Role (optional)</label>
                <input
                  type="text"
                  value={form.positionRole}
                  onChange={(e) => set("positionRole", e.target.value)}
                  placeholder="e.g. registrar, coach"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
                />
                <p className="text-[10px] text-slate-400 mt-1">Auto-assigns this system role on acceptance</p>
              </div>
            </div>
          )}

          {/* Scope */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Scope Type *</label>
              <select
                value={form.scopeType}
                onChange={(e) => set("scopeType", e.target.value as "club" | "association")}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
              >
                <option value="association">Association</option>
                <option value="club">Club</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Scope ID *</label>
              <input
                type="text"
                required
                value={form.scopeId}
                onChange={(e) => set("scopeId", e.target.value)}
                placeholder="assoc-123 or club-456"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Scope Name *</label>
              <input
                type="text"
                required
                value={form.scopeName}
                onChange={(e) => set("scopeName", e.target.value)}
                placeholder="Association or Club name"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
              />
            </div>
          </div>

          {/* Season + Dates */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Season Year *</label>
              <select
                value={form.seasonYear}
                onChange={(e) => set("seasonYear", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
              >
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Open Date *</label>
              <input
                type="date"
                required
                value={form.openDate}
                onChange={(e) => set("openDate", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Close Date *</label>
              <input
                type="date"
                required
                value={form.closeDate}
                onChange={(e) => set("closeDate", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
              />
            </div>
          </div>

          {/* Flags */}
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requiresFinancialMembership}
                onChange={(e) => set("requiresFinancialMembership", e.target.checked)}
                className="rounded text-[#06054e]"
              />
              <span className="text-sm font-semibold text-slate-700">Requires financial membership</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.requiresStatement}
                onChange={(e) => set("requiresStatement", e.target.checked)}
                className="rounded text-[#06054e]"
              />
              <span className="text-sm font-semibold text-slate-700">Requires nomination statement</span>
            </label>
          </div>

          {/* Electorate (ballot only) */}
          {showElectorate && (
            <div>
              <label className="block text-xs font-black uppercase text-slate-500 mb-1.5">Electorate</label>
              <select
                value={form.electorateType}
                onChange={(e) => set("electorateType", e.target.value as "committee" | "all-members")}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#06054e] focus:border-transparent"
              >
                <option value="committee">Committee members only</option>
                <option value="all-members">All financial members</option>
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 rounded-xl">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2 bg-[#06054e] text-white text-sm font-black uppercase rounded-xl hover:bg-[#0a0870] disabled:opacity-50 transition-colors"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
              Create Window
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NominationWindowsPage() {
  const [windows, setWindows]           = useState<NominationWindow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [tab, setTab]                   = useState<TabFilter>("all");
  const [seasonFilter, setSeasonFilter] = useState(CURRENT_YEAR);
  const [showCreate, setShowCreate]     = useState(false);
  const [transitioning, setTransitioning] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState("");

  const fetchWindows = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ seasonYear: seasonFilter });
      if (tab !== "all") params.set("status", tab);
      const res = await fetch(`/api/admin/nomination-windows?${params}`);
      if (!res.ok) { setError("Failed to load windows"); return; }
      const data = await res.json();
      setWindows(data.windows ?? []);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [seasonFilter, tab]);

  useEffect(() => { fetchWindows(); }, [fetchWindows]);

  async function handleTransition(windowId: string, newStatus: WindowStatus) {
    if (newStatus === "published") {
      const ok = confirm(
        "Publish squad? This will announce the squad and send congratulations emails to all selected players. This action cannot be undone."
      );
      if (!ok) return;
    }
    setTransitionError("");
    setTransitioning(windowId);
    try {
      const res = await fetch(`/api/admin/nomination-windows/${windowId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const err = await res.json();
        setTransitionError(err.error ?? "Transition failed");
        return;
      }
      await fetchWindows();
    } finally {
      setTransitioning(null);
    }
  }

  async function handleStartBallot(windowId: string) {
    setTransitionError("");
    setTransitioning(windowId);
    try {
      const res = await fetch("/api/admin/ballots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windowId }),
      });
      if (!res.ok) {
        const err = await res.json();
        setTransitionError(err.error ?? "Failed to start ballot");
        return;
      }
      await fetchWindows();
    } finally {
      setTransitioning(null);
    }
  }

  async function handleDelete(windowId: string) {
    if (!confirm("Delete this draft window? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/nomination-windows/${windowId}`, { method: "DELETE" });
    if (res.ok) {
      setWindows((prev) => prev.filter((w) => w.windowId !== windowId));
    } else {
      const err = await res.json();
      setTransitionError(err.error ?? "Delete failed");
    }
  }

  const TABS: { key: TabFilter; label: string }[] = [
    { key: "all",       label: "All" },
    { key: "draft",     label: "Draft" },
    { key: "open",      label: "Open" },
    { key: "closed",    label: "Closed" },
    { key: "balloting", label: "Balloting" },
    { key: "completed", label: "Completed" },
    { key: "finalised", label: "Finalised" },
    { key: "ratified",  label: "Ratified" },
    { key: "published", label: "Published" },
  ];

  const counts: Partial<Record<TabFilter, number>> = { all: windows.length };
  for (const w of windows) {
    counts[w.status] = (counts[w.status] ?? 0) + 1;
  }

  // When "all" is selected we show everything already loaded; otherwise filter client-side
  const displayed = tab === "all" ? windows : windows.filter((w) => w.status === tab);

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black uppercase text-[#06054e]">Nomination Windows</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Manage nomination periods for rep teams, grade preferences, and positions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={seasonFilter}
              onChange={(e) => setSeasonFilter(e.target.value)}
              className="px-3 py-2 bg-slate-100 rounded-xl text-sm font-bold text-[#06054e] border-0 focus:ring-2 focus:ring-[#06054e]"
            >
              {YEARS.map((y) => <option key={y} value={y}>{y} Season</option>)}
            </select>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white text-sm font-black uppercase rounded-xl hover:bg-[#0a0870] transition-colors"
            >
              <Plus size={14} />
              New Window
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-6 flex gap-1 overflow-x-auto pb-0">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-2.5 text-xs font-black uppercase whitespace-nowrap border-b-2 transition-colors ${
                tab === key
                  ? "border-[#06054e] text-[#06054e]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              {label}
              {counts[key] != null && counts[key]! > 0 && (
                <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                  tab === key ? "bg-[#06054e] text-white" : "bg-slate-100 text-slate-500"
                }`}>
                  {counts[key]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Transition error */}
        {transitionError && (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 text-red-700 rounded-xl text-sm mb-6">
            <AlertCircle size={16} />
            {transitionError}
            <button onClick={() => setTransitionError("")} className="ml-auto text-red-500 hover:text-red-700">
              <XCircle size={14} />
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#06054e] animate-spin" />
          </div>
        )}

        {/* Error */}
        {!loading && error && (
          <div className="flex items-center gap-3 px-5 py-4 bg-red-50 text-red-700 rounded-2xl">
            <AlertCircle size={18} />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && displayed.length === 0 && (
          <div className="text-center py-20">
            <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-bold uppercase text-sm">
              {tab === "all" ? "No windows yet for this season" : `No ${tab} windows`}
            </p>
            <p className="text-slate-400 text-xs mt-1 mb-5">
              Create a window to start accepting nominations
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-5 py-2 bg-[#06054e] text-white text-sm font-black uppercase rounded-xl hover:bg-[#0a0870] transition-colors"
            >
              <Plus size={14} />
              New Window
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && displayed.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayed.map((win) => (
              <WindowCard
                key={win.windowId}
                win={win}
                onTransition={handleTransition}
                onStartBallot={handleStartBallot}
                onDelete={handleDelete}
                transitioning={transitioning}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <CreateModal
          onClose={() => setShowCreate(false)}
          onCreated={(win) => {
            setWindows((prev) => [win, ...prev]);
            setShowCreate(false);
          }}
        />
      )}
    </div>
  );
}
