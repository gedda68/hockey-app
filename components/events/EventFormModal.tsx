"use client";

// components/events/EventFormModal.tsx
// Create / Edit event form modal.
// Pass `event` to edit an existing event; omit for create mode.
// Pass `defaultDate` to pre-fill the start date when creating from a calendar day.

import { useState, useEffect, useRef } from "react";
import { X, Loader, CalendarDays, Clock, MapPin, Tag } from "lucide-react";
import { Event, EventCategory, EventScope, EventStatus } from "@/types/event";

// ── Types ──────────────────────────────────────────────────────────────────────

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: EventFormData) => Promise<void>;
  event?: Event | null;         // if supplied → edit mode
  defaultDate?: Date | null;    // pre-fill start date in create mode
}

export interface EventFormData {
  name: string;
  shortDescription: string;
  category: EventCategory;
  scope: EventScope;
  status: EventStatus;
  startDate: string;   // YYYY-MM-DD
  endDate: string;
  startTime: string;   // HH:mm or ""
  endTime: string;
  isAllDay: boolean;
  location: string;
  visibility: "public" | "private" | "members-only";
}

const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = [
  { value: "competition",    label: "Competition" },
  { value: "finals",         label: "Finals" },
  { value: "representative", label: "Representative" },
  { value: "clinic",         label: "Clinic" },
  { value: "officials",      label: "Officials" },
  { value: "social",         label: "Social" },
  { value: "training",       label: "Training" },
  { value: "meeting",        label: "Meeting" },
  { value: "other",          label: "Other" },
];

const SCOPE_OPTIONS: { value: EventScope; label: string }[] = [
  { value: "city",          label: "City" },
  { value: "regional",      label: "Regional" },
  { value: "state",         label: "State" },
  { value: "national",      label: "National" },
  { value: "international", label: "International" },
];

const STATUS_OPTIONS: { value: EventStatus; label: string }[] = [
  { value: "scheduled",  label: "Scheduled" },
  { value: "draft",      label: "Draft" },
  { value: "cancelled",  label: "Cancelled" },
  { value: "postponed",  label: "Postponed" },
  { value: "completed",  label: "Completed" },
];

// ── Helpers ────────────────────────────────────────────────────────────────────

function toDateInput(iso?: string | Date | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().split("T")[0]; // YYYY-MM-DD
}

function blankForm(defaultDate?: Date | null): EventFormData {
  return {
    name: "",
    shortDescription: "",
    category: "competition",
    scope: "city",
    status: "scheduled",
    startDate: defaultDate ? toDateInput(defaultDate) : "",
    endDate: defaultDate ? toDateInput(defaultDate) : "",
    startTime: "",
    endTime: "",
    isAllDay: false,
    location: "",
    visibility: "public",
  };
}

function eventToForm(event: Event): EventFormData {
  return {
    name: event.name,
    shortDescription: event.shortDescription || "",
    category: event.category,
    scope: event.scope,
    status: event.status,
    startDate: toDateInput(event.startDate),
    endDate: toDateInput(event.endDate) || toDateInput(event.startDate),
    startTime: event.startTime || "",
    endTime: event.endTime || "",
    isAllDay: event.isAllDay ?? false,
    location: event.location || "",
    visibility: event.visibility || "public",
  };
}

// ── Field components ──────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-1.5">
      {children}
    </label>
  );
}

function Input({
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all ${props.className ?? ""}`}
    />
  );
}

function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all ${props.className ?? ""}`}
    >
      {children}
    </select>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function EventFormModal({
  isOpen,
  onClose,
  onSave,
  event,
  defaultDate,
}: EventFormModalProps) {
  const isEdit = !!event;
  const [form, setForm] = useState<EventFormData>(
    event ? eventToForm(event) : blankForm(defaultDate),
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  // Re-initialise when modal opens or event changes
  useEffect(() => {
    if (isOpen) {
      setForm(event ? eventToForm(event) : blankForm(defaultDate));
      setError(null);
      setSaving(false);
      // Focus the name field on next tick
      setTimeout(() => firstInputRef.current?.focus(), 50);
    }
  }, [isOpen, event, defaultDate]);

  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const set = <K extends keyof EventFormData>(key: K, value: EventFormData[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Event name is required.");
      return;
    }
    if (!form.startDate) {
      setError("Start date is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave(form);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save event.");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Modal panel */}
      <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-8 pt-7 pb-5 border-b border-slate-100 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-black text-slate-900 uppercase">
              {isEdit ? "Edit Event" : "New Event"}
            </h2>
            {isEdit && (
              <p className="text-xs text-slate-400 font-bold mt-0.5">
                {event?.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-400 hover:text-slate-700"
            aria-label="Close"
          >
            <X size={22} />
          </button>
        </div>

        {/* Scrollable body */}
        <form
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto px-8 py-6 space-y-6"
        >
          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm font-bold">
              {error}
            </div>
          )}

          {/* ── Name ── */}
          <div>
            <Label>Event Name *</Label>
            <Input
              ref={firstInputRef}
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. State Championship Round 1"
              required
              maxLength={150}
            />
          </div>

          {/* ── Short Description ── */}
          <div>
            <Label>Short Description</Label>
            <textarea
              value={form.shortDescription}
              onChange={(e) => set("shortDescription", e.target.value)}
              placeholder="Brief summary shown on event cards (max 150 chars)"
              maxLength={150}
              rows={2}
              className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition-all resize-none"
            />
            <p className="text-xs text-slate-400 mt-1 text-right">
              {form.shortDescription.length}/150
            </p>
          </div>

          {/* ── Category + Scope ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                <Tag size={12} className="inline mr-1" />
                Category *
              </Label>
              <Select
                value={form.category}
                onChange={(e) => set("category", e.target.value as EventCategory)}
                required
              >
                {CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Scope *</Label>
              <Select
                value={form.scope}
                onChange={(e) => set("scope", e.target.value as EventScope)}
                required
              >
                {SCOPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* ── Status + Visibility ── */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Status</Label>
              <Select
                value={form.status}
                onChange={(e) => set("status", e.target.value as EventStatus)}
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <Label>Visibility</Label>
              <Select
                value={form.visibility}
                onChange={(e) =>
                  set("visibility", e.target.value as EventFormData["visibility"])
                }
              >
                <option value="public">Public</option>
                <option value="members-only">Members Only</option>
                <option value="private">Private</option>
              </Select>
            </div>
          </div>

          {/* ── Dates ── */}
          <div>
            <Label>
              <CalendarDays size={12} className="inline mr-1" />
              Dates *
            </Label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-[10px] font-bold text-slate-400 mb-1">Start Date</p>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => {
                    set("startDate", e.target.value);
                    // Auto-set end date if not set or before start
                    if (!form.endDate || form.endDate < e.target.value) {
                      set("endDate", e.target.value);
                    }
                  }}
                  required
                />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 mb-1">End Date</p>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.startDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── All Day toggle ── */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("isAllDay", !form.isAllDay)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                form.isAllDay ? "bg-blue-600" : "bg-slate-200"
              }`}
              role="switch"
              aria-checked={form.isAllDay}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                  form.isAllDay ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
            <span className="text-sm font-bold text-slate-700">All Day Event</span>
          </div>

          {/* ── Times (hidden when all-day) ── */}
          {!form.isAllDay && (
            <div>
              <Label>
                <Clock size={12} className="inline mr-1" />
                Times
              </Label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 mb-1">Start Time</p>
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => set("startTime", e.target.value)}
                  />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 mb-1">End Time</p>
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => set("endTime", e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {/* ── Location ── */}
          <div>
            <Label>
              <MapPin size={12} className="inline mr-1" />
              Location
            </Label>
            <Input
              type="text"
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Brisbane Hockey Centre, Field 1"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-8 py-5 border-t border-slate-100 flex-shrink-0 bg-slate-50 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-6 py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            type="submit"
            form="event-form"
            onClick={handleSubmit}
            disabled={saving}
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-md flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <Loader size={18} className="animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Event"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
