// components/admin/events/EventCreateEditForm.tsx
// Comprehensive 7-tab create / edit form for hockey association events.

"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  ChangeEvent,
} from "react";
import {
  ArrowLeft,
  Info,
  Loader2,
  X,
  Upload,
  ImageIcon,
  FileText,
  Calendar,
  MapPin,
  Building2,
  Users,
  ClipboardList,
  Phone,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";

import type {
  Event,
  EventStatus,
  EventCategory,
  EventScope,
  EventVisibility,
  OrgType,
  CalendarPropagation,
} from "@/types/event";

import DocumentUploader, {
  type DocumentItem,
} from "@/components/admin/events/DocumentUploader";
import InlineDocumentViewer from "@/components/admin/events/InlineDocumentViewer";
import type { DocumentItem as ViewerDocItem } from "@/components/admin/events/InlineDocumentViewer";

// ── Props ─────────────────────────────────────────────────────────────────────

export interface EventCreateEditFormProps {
  /** If provided: editing existing event; if null: creating new */
  event?: Event | null;
  /** Pre-fill context from URL params */
  defaultScope?: "association" | "club" | "team";
  defaultScopeId?: string;
  defaultScopeName?: string;
  /** Called after successful save */
  onSaved?: (eventId: string) => void;
  onCancel?: () => void;
}

// ── Tab definitions ───────────────────────────────────────────────────────────

type TabId =
  | "general"
  | "schedule"
  | "location"
  | "organisation"
  | "media"
  | "registration"
  | "contact";

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const TABS: Tab[] = [
  { id: "general",      label: "General",        icon: <ClipboardList size={15} /> },
  { id: "schedule",     label: "Schedule",        icon: <Calendar      size={15} /> },
  { id: "location",     label: "Location",        icon: <MapPin        size={15} /> },
  { id: "organisation", label: "Organisation",    icon: <Building2     size={15} /> },
  { id: "media",        label: "Media & Docs",    icon: <FileText      size={15} /> },
  { id: "registration", label: "Registration",    icon: <Users         size={15} /> },
  { id: "contact",      label: "Contact",         icon: <Phone         size={15} /> },
];

// ── Australian state options ──────────────────────────────────────────────────

const AU_STATES = ["QLD", "NSW", "VIC", "SA", "WA", "TAS", "NT", "ACT"] as const;

const AU_TIMEZONES = [
  { value: "Australia/Brisbane", label: "Queensland (Brisbane) — AEST" },
  { value: "Australia/Sydney",   label: "New South Wales (Sydney) — AEST/AEDT" },
  { value: "Australia/Melbourne",label: "Victoria (Melbourne) — AEST/AEDT" },
  { value: "Australia/Adelaide", label: "South Australia (Adelaide) — ACST/ACDT" },
  { value: "Australia/Perth",    label: "Western Australia (Perth) — AWST" },
  { value: "UTC",                label: "UTC" },
];

const PROPAGATION_DESCRIPTIONS: Record<CalendarPropagation, string> = {
  none:        "Only visible in the creating organisation's calendar",
  team:        "Visible to all teams in this club",
  club:        "Visible to all clubs in this association",
  association: "Association-wide (same as club)",
  global:      "All calendars under this association",
};

// ── Form state type ───────────────────────────────────────────────────────────

interface FormState {
  // General
  name: string;
  shortDescription: string;
  fullDescription: string;
  category: EventCategory | "";
  scope: EventScope | "";
  status: EventStatus | "";
  visibility: EventVisibility | "";
  tagsRaw: string;           // comma-separated input value
  tags: string[];
  ageGroup: string;
  gender: "all" | "men" | "women" | "mixed" | "";
  weatherDependent: boolean;
  cancelReason: string;

  // Schedule
  isAllDay: boolean;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  timezone: string;

  // Location
  location: string;
  isOnline: boolean;
  venueName: string;
  venueAddress: string;
  venueSuburb: string;
  venueState: string;
  venuePostcode: string;
  venueFieldNumber: string;

  // Organisation
  orgType: OrgType | "";
  orgName: string;
  associationId: string;
  clubId: string;
  teamIdsRaw: string;
  teamIds: string[];
  calendarPropagation: CalendarPropagation;

  // Media (file refs handled separately)
  currentFeaturedImage: string;   // URL if editing
  currentFlyer: string;           // URL if editing
  documents: DocumentItem[];

  // Registration
  requiresRegistration: boolean;
  registrationDeadline: string;
  maxParticipants: string;
  externalRegistrationUrl: string;
  waitlistEnabled: boolean;
  isFree: boolean;
  costAmount: string;
  costCurrency: string;
  costDescription: string;

  // Contact
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  contactRole: string;
  externalLink: string;
  ticketingUrl: string;
  livestreamUrl: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isoToDateInput(iso?: string | null): string {
  if (!iso) return "";
  // "YYYY-MM-DD" from ISO like "2024-08-15T00:00:00.000Z"
  return iso.split("T")[0] ?? "";
}

function parseTags(raw: string): string[] {
  return raw
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
}

function buildInitialState(
  event: Event | null | undefined,
  defaultScope?: "association" | "club" | "team",
  defaultScopeId?: string,
  defaultScopeName?: string,
): FormState {
  if (event) {
    // Editing — pre-populate all fields from event prop
    return {
      name:              event.name ?? "",
      shortDescription:  event.shortDescription ?? "",
      fullDescription:   event.fullDescription ?? "",
      category:          event.category ?? "",
      scope:             event.scope ?? "",
      status:            event.status ?? "",
      visibility:        event.visibility ?? "",
      tagsRaw:           (event.tags ?? []).join(", "),
      tags:              event.tags ?? [],
      ageGroup:          event.ageGroup ?? "",
      gender:            event.gender ?? "",
      weatherDependent:  event.weatherDependent ?? false,
      cancelReason:      event.cancelReason ?? "",

      isAllDay:   event.isAllDay ?? false,
      startDate:  isoToDateInput(event.startDate),
      endDate:    isoToDateInput(event.endDate),
      startTime:  event.startTime ?? "",
      endTime:    event.endTime ?? "",
      timezone:   event.timezone ?? "Australia/Brisbane",

      location:         event.location ?? "",
      isOnline:         false,
      venueName:        event.venue?.name ?? "",
      venueAddress:     event.venue?.address ?? "",
      venueSuburb:      event.venue?.suburb ?? "",
      venueState:       event.venue?.state ?? "",
      venuePostcode:    event.venue?.postcode ?? "",
      venueFieldNumber: event.venue?.fieldNumber ?? "",

      orgType:            (event.organization?.type ?? "") as OrgType | "",
      orgName:            event.organization?.name ?? "",
      associationId:      event.references?.associationId ?? "",
      clubId:             event.references?.clubId ?? event.organization?.clubId ?? "",
      teamIdsRaw:         (event.references?.teamIds ?? []).join(", "),
      teamIds:            event.references?.teamIds ?? [],
      calendarPropagation: event.calendarPropagation ?? "none",

      currentFeaturedImage: event.images?.featured ?? "",
      currentFlyer:         event.flyer ?? "",
      documents:            (event.documents ?? []).map((d) => ({
        url:  d.url,
        name: d.name,
        type: d.type,
        size: d.size ?? 0,
      })),

      requiresRegistration:    event.requiresRegistration ?? false,
      registrationDeadline:    isoToDateInput(
        event.registrationConfig?.deadline
          ? String(event.registrationConfig.deadline)
          : undefined,
      ),
      maxParticipants:         event.registrationConfig?.maxParticipants
                                 ? String(event.registrationConfig.maxParticipants)
                                 : "",
      externalRegistrationUrl: event.registrationConfig?.url ?? "",
      waitlistEnabled:         event.registrationConfig?.waitlistEnabled ?? false,
      isFree:                  event.cost?.isFree ?? true,
      costAmount:              event.cost?.amount ? String(event.cost.amount) : "",
      costCurrency:            event.cost?.currency ?? "AUD",
      costDescription:         event.cost?.description ?? "",

      contactName:    event.contactPerson?.name ?? "",
      contactEmail:   event.contactPerson?.email ?? "",
      contactPhone:   event.contactPerson?.phone ?? "",
      contactRole:    event.contactPerson?.role ?? "",
      externalLink:   event.externalLink ?? "",
      ticketingUrl:   event.ticketingUrl ?? "",
      livestreamUrl:  event.livestreamUrl ?? "",
    };
  }

  // Creating — apply defaultScope pre-fills
  const base: FormState = {
    name: "", shortDescription: "", fullDescription: "",
    category: "", scope: "", status: "draft", visibility: "public",
    tagsRaw: "", tags: [], ageGroup: "", gender: "",
    weatherDependent: false, cancelReason: "",

    isAllDay: false, startDate: "", endDate: "", startTime: "", endTime: "",
    timezone: "Australia/Brisbane",

    location: "", isOnline: false,
    venueName: "", venueAddress: "", venueSuburb: "", venueState: "",
    venuePostcode: "", venueFieldNumber: "",

    orgType: "", orgName: "",
    associationId: "", clubId: "", teamIdsRaw: "", teamIds: [],
    calendarPropagation: "none",

    currentFeaturedImage: "", currentFlyer: "", documents: [],

    requiresRegistration: false,
    registrationDeadline: "", maxParticipants: "",
    externalRegistrationUrl: "", waitlistEnabled: false,
    isFree: true, costAmount: "", costCurrency: "AUD", costDescription: "",

    contactName: "", contactEmail: "", contactPhone: "", contactRole: "",
    externalLink: "", ticketingUrl: "", livestreamUrl: "",
  };

  if (defaultScope === "association") {
    base.orgType        = "association";
    base.orgName        = defaultScopeName ?? "";
    base.associationId  = defaultScopeId  ?? "";
  } else if (defaultScope === "club") {
    base.orgType   = "club";
    base.orgName   = defaultScopeName ?? "";
    base.clubId    = defaultScopeId  ?? "";
  } else if (defaultScope === "team") {
    base.orgType   = "team";
    base.orgName   = defaultScopeName ?? "";
    base.teamIdsRaw = defaultScopeId ?? "";
    base.teamIds    = defaultScopeId ? [defaultScopeId] : [];
  }

  return base;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-black uppercase tracking-widest text-[#06054e] border-b border-slate-200 pb-2 mb-4 mt-6 first:mt-0">
      {children}
    </h3>
  );
}

function FieldWrap({
  label,
  required,
  error,
  hint,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={["flex flex-col gap-1", className].filter(Boolean).join(" ")}>
      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 ml-0.5">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
      {hint && !error && (
        <p className="text-[11px] text-slate-400 ml-0.5">{hint}</p>
      )}
      {error && (
        <p className="text-[11px] text-red-500 font-bold ml-0.5 flex items-center gap-1">
          <AlertCircle size={11} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

const INPUT_CLS =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 " +
  "placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#06054e]/30 focus:border-[#06054e] " +
  "transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed";

const TEXTAREA_CLS =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 " +
  "placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#06054e]/30 focus:border-[#06054e] " +
  "transition-colors duration-150 resize-y";

const SELECT_CLS =
  "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 " +
  "focus:outline-none focus:ring-2 focus:ring-[#06054e]/30 focus:border-[#06054e] " +
  "transition-colors duration-150 cursor-pointer";

function ToggleCheckbox({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div className="relative mt-0.5 shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div
          className={[
            "w-10 h-6 rounded-full border-2 transition-colors duration-200",
            checked
              ? "bg-[#06054e] border-[#06054e]"
              : "bg-slate-200 border-slate-300 group-hover:border-slate-400",
          ].join(" ")}
        />
        <div
          className={[
            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0",
          ].join(" ")}
        />
      </div>
      <div>
        <span className="text-sm font-bold text-slate-700">{label}</span>
        {description && (
          <p className="text-xs text-slate-400 mt-0.5">{description}</p>
        )}
      </div>
    </label>
  );
}

// ── Tag pill display ──────────────────────────────────────────────────────────

function TagPills({
  tags,
  onRemove,
}: {
  tags: string[];
  onRemove: (tag: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#06054e]/10 text-[#06054e] rounded-full text-xs font-bold"
        >
          {tag}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            className="text-[#06054e]/60 hover:text-[#06054e] transition-colors"
            aria-label={`Remove tag ${tag}`}
          >
            <X size={11} />
          </button>
        </span>
      ))}
    </div>
  );
}

// ── Image uploader (inline) ───────────────────────────────────────────────────

interface ImageUploaderProps {
  currentUrl?: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  accept?: string;
  maxMB?: number;
  label: string;
}

function ImageUploader({
  currentUrl,
  onFileSelect,
  selectedFile,
  accept = "image/jpeg,image/png,image/webp,image/gif",
  maxMB = 10,
  label,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedFile) { setPreview(null); return; }
    const url = URL.createObjectURL(selectedFile);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selectedFile]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (!file) { onFileSelect(null); return; }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`File must be under ${maxMB} MB`);
      e.target.value = "";
      return;
    }
    onFileSelect(file);
  }

  const displayUrl = preview ?? currentUrl ?? null;

  return (
    <div className="space-y-3">
      {displayUrl && (
        <div className="relative w-full max-w-xs">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayUrl}
            alt={label}
            className="w-full h-40 object-cover rounded-xl border border-slate-200 shadow-sm"
          />
          {selectedFile && (
            <button
              type="button"
              onClick={() => { onFileSelect(null); setPreview(null); if (inputRef.current) inputRef.current.value = ""; }}
              className="absolute top-2 right-2 p-1 bg-white/90 rounded-full shadow text-slate-500 hover:text-red-500 transition-colors"
              aria-label="Remove selected image"
            >
              <X size={14} />
            </button>
          )}
          {currentUrl && !selectedFile && (
            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-white/90 text-[10px] font-black uppercase text-slate-500 rounded-full shadow">
              Current
            </span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:border-[#06054e] hover:text-[#06054e] transition-colors duration-150"
      >
        <Upload size={15} />
        {displayUrl ? "Replace Image" : "Upload Image"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={handleChange}
        tabIndex={-1}
      />

      <p className="text-[11px] text-slate-400">
        JPG, PNG, WebP, GIF · max {maxMB} MB
      </p>

      {error && (
        <p className="text-xs text-red-500 font-bold flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

// ── PDF uploader (inline) ─────────────────────────────────────────────────────

function PdfUploader({
  currentUrl,
  onFileSelect,
  selectedFile,
  maxMB = 50,
}: {
  currentUrl?: string;
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  maxMB?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setError(null);
    if (!file) { onFileSelect(null); return; }
    if (file.size > maxMB * 1024 * 1024) {
      setError(`File must be under ${maxMB} MB`);
      e.target.value = "";
      return;
    }
    onFileSelect(file);
  }

  return (
    <div className="space-y-2">
      {currentUrl && !selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <FileText size={16} className="text-red-500 shrink-0" />
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-bold text-[#06054e] underline underline-offset-2 hover:text-amber-500 transition-colors truncate"
          >
            View current flyer
          </a>
        </div>
      )}

      {selectedFile && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 size={16} className="text-green-500 shrink-0" />
          <span className="text-sm font-bold text-green-700 truncate">{selectedFile.name}</span>
          <button
            type="button"
            onClick={() => { onFileSelect(null); if (inputRef.current) inputRef.current.value = ""; }}
            className="ml-auto p-1 text-green-400 hover:text-red-500 transition-colors"
            aria-label="Remove selected PDF"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-sm font-bold text-slate-500 hover:border-[#06054e] hover:text-[#06054e] transition-colors duration-150"
      >
        <Upload size={15} />
        {selectedFile || currentUrl ? "Replace PDF" : "Upload PDF Flyer"}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="sr-only"
        onChange={handleChange}
        tabIndex={-1}
      />

      <p className="text-[11px] text-slate-400">PDF only · max {maxMB} MB</p>

      {error && (
        <p className="text-xs text-red-500 font-bold flex items-center gap-1">
          <AlertCircle size={12} />
          {error}
        </p>
      )}
    </div>
  );
}

// ── Validation ────────────────────────────────────────────────────────────────

interface FormErrors {
  name?: string;
  startDate?: string;
  orgType?: string;
  orgName?: string;
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim())          errors.name      = "Event name is required";
  if (!form.startDate)            errors.startDate  = "Start date is required";
  if (!form.orgType)              errors.orgType    = "Organisation type is required";
  if (!form.orgName.trim())       errors.orgName    = "Organisation name is required";
  return errors;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function EventCreateEditForm({
  event,
  defaultScope,
  defaultScopeId,
  defaultScopeName,
  onSaved,
  onCancel,
}: EventCreateEditFormProps) {
  const isEditing = Boolean(event?.id);

  const [form, setForm] = useState<FormState>(() =>
    buildInitialState(event, defaultScope, defaultScopeId, defaultScopeName),
  );

  const [activeTab, setActiveTab] = useState<TabId>("general");
  const [errors, setErrors]       = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [featuredImageFile, setFeaturedImageFile] = useState<File | null>(null);
  const [flyerFile, setFlyerFile] = useState<File | null>(null);
  const [viewingDoc, setViewingDoc] = useState<ViewerDocItem | null>(null);

  // Re-sync when the event prop changes (e.g. parent refetch)
  useEffect(() => {
    setForm(buildInitialState(event, defaultScope, defaultScopeId, defaultScopeName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id]);

  // ── Field helpers ─────────────────────────────────────────────────────────

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  const handleTagsChange = useCallback((raw: string) => {
    set("tagsRaw", raw);
    set("tags", parseTags(raw));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function removeTag(tag: string) {
    const next = form.tags.filter((t) => t !== tag);
    set("tags", next);
    set("tagsRaw", next.join(", "));
  }

  function handleStartDateChange(val: string) {
    set("startDate", val);
    if (!form.endDate) set("endDate", val);
  }

  function handleTeamIdsChange(raw: string) {
    set("teamIdsRaw", raw);
    set("teamIds", parseTags(raw));
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(asDraft = false) {
    const currentStatus = asDraft ? "draft" : (form.status || "draft");
    const formToValidate = { ...form, status: currentStatus as EventStatus };
    const validationErrors = validate(formToValidate);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      // Navigate to the first tab that has an error
      if (validationErrors.name)               setActiveTab("general");
      else if (validationErrors.startDate)     setActiveTab("schedule");
      else if (validationErrors.orgType || validationErrors.orgName) setActiveTab("organisation");
      toast.error("Please fix the errors before saving.");
      return;
    }

    setSubmitting(true);

    try {
      // Build the event JSON payload
      const payload = {
        name:             form.name.trim(),
        shortDescription: form.shortDescription.trim(),
        fullDescription:  form.fullDescription.trim(),
        category:         form.category || undefined,
        scope:            form.scope || undefined,
        status:           currentStatus,
        visibility:       form.visibility || "public",
        tags:             form.tags,
        ageGroup:         form.ageGroup.trim() || undefined,
        gender:           form.gender || undefined,
        weatherDependent: form.weatherDependent,
        cancelReason:     form.status === "cancelled" ? form.cancelReason.trim() : undefined,

        isAllDay:   form.isAllDay,
        startDate:  form.startDate,
        endDate:    form.endDate || undefined,
        startTime:  form.isAllDay ? undefined : form.startTime || undefined,
        endTime:    form.isAllDay ? undefined : form.endTime || undefined,
        timezone:   form.timezone,

        location:   form.location.trim() || undefined,
        isOnline:   form.isOnline,
        venue:      form.isOnline ? undefined : {
          name:        form.venueName.trim()        || undefined,
          address:     form.venueAddress.trim()     || undefined,
          suburb:      form.venueSuburb.trim()      || undefined,
          state:       form.venueState              || undefined,
          postcode:    form.venuePostcode.trim()    || undefined,
          fieldNumber: form.venueFieldNumber.trim() || undefined,
        },

        organization: {
          type: form.orgType,
          name: form.orgName.trim(),
        },
        references: {
          associationId: form.associationId.trim() || undefined,
          clubId:        form.clubId.trim()        || undefined,
          teamIds:       form.teamIds.length > 0 ? form.teamIds : undefined,
        },
        calendarPropagation: form.calendarPropagation,

        // Documents are already uploaded URLs
        documents: form.documents,

        requiresRegistration: form.requiresRegistration,
        registrationConfig: form.requiresRegistration
          ? {
              deadline:        form.registrationDeadline || undefined,
              url:             form.externalRegistrationUrl.trim() || undefined,
              maxParticipants: form.maxParticipants ? Number(form.maxParticipants) : undefined,
              waitlistEnabled: form.waitlistEnabled,
            }
          : undefined,

        cost: {
          isFree:      form.isFree,
          amount:      !form.isFree && form.costAmount ? Number(form.costAmount) : undefined,
          currency:    form.costCurrency || "AUD",
          description: !form.isFree ? form.costDescription.trim() : undefined,
        },

        contactPerson: {
          name:  form.contactName.trim()  || undefined,
          email: form.contactEmail.trim() || undefined,
          phone: form.contactPhone.trim() || undefined,
          role:  form.contactRole.trim()  || undefined,
        },
        externalLink:  form.externalLink.trim()  || undefined,
        ticketingUrl:  form.ticketingUrl.trim()  || undefined,
        livestreamUrl: form.livestreamUrl.trim() || undefined,
      };

      const fd = new FormData();
      fd.append("event", JSON.stringify(payload));
      if (featuredImageFile) fd.append("featuredImage", featuredImageFile);
      if (flyerFile)         fd.append("flyer", flyerFile);

      const url    = isEditing ? `/api/admin/events/${event!.id}` : "/api/admin/events";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, { method, body: fd });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json() as { id?: string; event?: { id: string } };
      const savedId = data.id ?? data.event?.id ?? event?.id ?? "";

      toast.success(isEditing ? "Event updated successfully!" : "Event created successfully!");
      onSaved?.(savedId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Tab content ───────────────────────────────────────────────────────────

  function renderGeneral() {
    return (
      <div className="space-y-5">
        <SectionHeading>Basic Information</SectionHeading>

        <FieldWrap label="Event Name" required error={errors.name}>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="e.g. Ipswich Regional Hockey Championships"
            className={[INPUT_CLS, errors.name ? "border-red-400 focus:ring-red-300 focus:border-red-400" : ""].join(" ")}
          />
        </FieldWrap>

        <FieldWrap
          label="Short Description"
          hint={`${form.shortDescription.length}/150 characters — shown on event cards`}
        >
          <textarea
            value={form.shortDescription}
            maxLength={150}
            rows={2}
            onChange={(e) => set("shortDescription", e.target.value)}
            placeholder="One-liner shown in calendar and event cards…"
            className={TEXTAREA_CLS}
          />
        </FieldWrap>

        <FieldWrap label="Full Description" hint="Detailed event description shown in the event modal">
          <textarea
            value={form.fullDescription}
            rows={5}
            onChange={(e) => set("fullDescription", e.target.value)}
            placeholder="Full event details, schedule, rules, etc…"
            className={TEXTAREA_CLS}
          />
        </FieldWrap>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          <FieldWrap label="Category">
            <select value={form.category} onChange={(e) => set("category", e.target.value as EventCategory)} className={SELECT_CLS}>
              <option value="">Select category…</option>
              <option value="competition">Competition</option>
              <option value="finals">Finals</option>
              <option value="representative">Representative</option>
              <option value="clinic">Clinic</option>
              <option value="officials">Officials</option>
              <option value="social">Social</option>
              <option value="training">Training</option>
              <option value="meeting">Meeting</option>
              <option value="other">Other</option>
            </select>
          </FieldWrap>

          <FieldWrap label="Scope">
            <select value={form.scope} onChange={(e) => set("scope", e.target.value as EventScope)} className={SELECT_CLS}>
              <option value="">Select scope…</option>
              <option value="city">City</option>
              <option value="regional">Regional</option>
              <option value="state">State</option>
              <option value="national">National</option>
              <option value="international">International</option>
            </select>
          </FieldWrap>

          <FieldWrap label="Status">
            <select value={form.status} onChange={(e) => set("status", e.target.value as EventStatus)} className={SELECT_CLS}>
              <option value="">Select status…</option>
              <option value="draft">Draft</option>
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
              <option value="completed">Completed</option>
            </select>
          </FieldWrap>

          {/* Visibility — radio cards */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-black text-slate-600 uppercase tracking-wider mb-2">
              Visibility
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(
                [
                  {
                    value: "public" as const,
                    icon: "🌐",
                    title: "Public",
                    desc: "Anyone can see this event — no login required. Great for open registrations and community events.",
                    border: "border-green-400",
                    bg: "bg-green-50",
                    ring: "ring-green-400",
                  },
                  {
                    value: "members-only" as const,
                    icon: "👥",
                    title: "Members Only",
                    desc: "Visible to signed-in users only. Perfect for club training sessions and internal competitions.",
                    border: "border-blue-400",
                    bg: "bg-blue-50",
                    ring: "ring-blue-400",
                  },
                  {
                    value: "private" as const,
                    icon: "🔒",
                    title: "Private",
                    desc: "Admin and staff eyes only. Use for planning drafts or events that haven't been announced yet.",
                    border: "border-red-400",
                    bg: "bg-red-50",
                    ring: "ring-red-400",
                  },
                ] as const
              ).map((opt) => {
                const selected = (form.visibility || "public") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => set("visibility", opt.value)}
                    className={[
                      "text-left rounded-xl border-2 p-3 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1",
                      selected
                        ? `${opt.border} ${opt.bg} ${opt.ring}`
                        : "border-slate-200 bg-white hover:border-slate-300",
                    ].join(" ")}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg leading-none">{opt.icon}</span>
                      <span className={`text-sm font-black ${selected ? "text-slate-900" : "text-slate-700"}`}>
                        {opt.title}
                      </span>
                      {selected && (
                        <span className="ml-auto text-[10px] font-black uppercase tracking-wide text-slate-500">✓ selected</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 leading-snug">{opt.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <FieldWrap label="Age Group" hint='e.g. "U12", "U18", "Open", "Masters 35+"'>
            <input type="text" value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)} placeholder="Open" className={INPUT_CLS} />
          </FieldWrap>

          <FieldWrap label="Gender">
            <select value={form.gender} onChange={(e) => set("gender", e.target.value as FormState["gender"])} className={SELECT_CLS}>
              <option value="">Select gender…</option>
              <option value="all">All</option>
              <option value="men">Men</option>
              <option value="women">Women</option>
              <option value="mixed">Mixed</option>
            </select>
          </FieldWrap>
        </div>

        {form.status === "cancelled" && (
          <FieldWrap label="Cancellation Reason">
            <input
              type="text"
              value={form.cancelReason}
              onChange={(e) => set("cancelReason", e.target.value)}
              placeholder="Reason for cancellation…"
              className={INPUT_CLS}
            />
          </FieldWrap>
        )}

        <SectionHeading>Tags &amp; Options</SectionHeading>

        <FieldWrap label="Tags" hint="Separate with commas — e.g. junior, women, beginners">
          <input
            type="text"
            value={form.tagsRaw}
            onChange={(e) => handleTagsChange(e.target.value)}
            onBlur={() => handleTagsChange(form.tagsRaw)}
            placeholder="junior, women, beginners…"
            className={INPUT_CLS}
          />
          <TagPills tags={form.tags} onRemove={removeTag} />
        </FieldWrap>

        <ToggleCheckbox
          checked={form.weatherDependent}
          onChange={(v) => set("weatherDependent", v)}
          label="Weather Dependent"
          description="This event may be cancelled or modified based on weather conditions"
        />
      </div>
    );
  }

  function renderSchedule() {
    return (
      <div className="space-y-5">
        <SectionHeading>Date &amp; Time</SectionHeading>

        <ToggleCheckbox
          checked={form.isAllDay}
          onChange={(v) => set("isAllDay", v)}
          label="All Day Event"
          description="No specific start or end time — spans the entire day(s)"
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldWrap label="Start Date" required error={errors.startDate}>
            <input
              type="date"
              value={form.startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              className={[INPUT_CLS, errors.startDate ? "border-red-400 focus:ring-red-300 focus:border-red-400" : ""].join(" ")}
            />
          </FieldWrap>

          <FieldWrap label="End Date" hint="Defaults to start date if left blank">
            <input
              type="date"
              value={form.endDate}
              min={form.startDate || undefined}
              onChange={(e) => set("endDate", e.target.value)}
              className={INPUT_CLS}
            />
          </FieldWrap>

          {!form.isAllDay && (
            <>
              <FieldWrap label="Start Time">
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => set("startTime", e.target.value)}
                  className={INPUT_CLS}
                />
              </FieldWrap>

              <FieldWrap label="End Time">
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => set("endTime", e.target.value)}
                  className={INPUT_CLS}
                />
              </FieldWrap>
            </>
          )}
        </div>

        <SectionHeading>Timezone</SectionHeading>

        <FieldWrap label="Timezone" hint="All times are stored and displayed in the selected timezone">
          <select
            value={form.timezone}
            onChange={(e) => set("timezone", e.target.value)}
            className={SELECT_CLS}
          >
            {AU_TIMEZONES.map((tz) => (
              <option key={tz.value} value={tz.value}>
                {tz.label}
              </option>
            ))}
          </select>
        </FieldWrap>
      </div>
    );
  }

  function renderLocation() {
    return (
      <div className="space-y-5">
        <SectionHeading>Location</SectionHeading>

        <FieldWrap label="Simple Location" hint='Short display text, e.g. "Ipswich Hockey Centre"'>
          <input
            type="text"
            value={form.location}
            onChange={(e) => set("location", e.target.value)}
            placeholder="Ipswich Hockey Centre"
            className={INPUT_CLS}
          />
        </FieldWrap>

        <ToggleCheckbox
          checked={form.isOnline}
          onChange={(v) => set("isOnline", v)}
          label="Online / Virtual Event"
          description="This event takes place online — venue address fields will be hidden"
        />

        {!form.isOnline && (
          <>
            <SectionHeading>Detailed Venue <span className="text-slate-400 font-medium normal-case tracking-normal">(optional)</span></SectionHeading>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FieldWrap label="Venue Name">
                <input type="text" value={form.venueName} onChange={(e) => set("venueName", e.target.value)} placeholder="Ipswich Hockey Centre" className={INPUT_CLS} />
              </FieldWrap>

              <FieldWrap label="Field / Court Number">
                <input type="text" value={form.venueFieldNumber} onChange={(e) => set("venueFieldNumber", e.target.value)} placeholder="Field 3" className={INPUT_CLS} />
              </FieldWrap>

              <FieldWrap label="Street Address" className="sm:col-span-2">
                <input type="text" value={form.venueAddress} onChange={(e) => set("venueAddress", e.target.value)} placeholder="123 Hockey Drive" className={INPUT_CLS} />
              </FieldWrap>

              <FieldWrap label="Suburb">
                <input type="text" value={form.venueSuburb} onChange={(e) => set("venueSuburb", e.target.value)} placeholder="Ipswich" className={INPUT_CLS} />
              </FieldWrap>

              <FieldWrap label="State">
                <select value={form.venueState} onChange={(e) => set("venueState", e.target.value)} className={SELECT_CLS}>
                  <option value="">Select state…</option>
                  {AU_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Postcode">
                <input type="text" value={form.venuePostcode} onChange={(e) => set("venuePostcode", e.target.value)} placeholder="4305" maxLength={4} className={INPUT_CLS} />
              </FieldWrap>
            </div>
          </>
        )}
      </div>
    );
  }

  function renderOrganisation() {
    const propagationLabels: Record<CalendarPropagation, string> = {
      none:        "None — creating org only",
      team:        "Team — all teams in this club",
      club:        "Club — all clubs in this association",
      association: "Association — association-wide",
      global:      "Global — all calendars under association",
    };

    const calPropagation = form.calendarPropagation;

    return (
      <div className="space-y-5">
        <SectionHeading>Organisation Details</SectionHeading>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldWrap label="Organisation Type" required error={errors.orgType}>
            <select
              value={form.orgType}
              onChange={(e) => set("orgType", e.target.value as OrgType)}
              className={[SELECT_CLS, errors.orgType ? "border-red-400 focus:ring-red-300 focus:border-red-400" : ""].join(" ")}
            >
              <option value="">Select type…</option>
              <option value="association">Association</option>
              <option value="club">Club</option>
              <option value="team">Team</option>
              <option value="competition">Competition</option>
            </select>
          </FieldWrap>

          <FieldWrap label="Organisation Name" required error={errors.orgName}>
            <input
              type="text"
              value={form.orgName}
              onChange={(e) => set("orgName", e.target.value)}
              placeholder="Ipswich Hockey Association"
              className={[INPUT_CLS, errors.orgName ? "border-red-400 focus:ring-red-300 focus:border-red-400" : ""].join(" ")}
            />
          </FieldWrap>

          <FieldWrap label="Association ID">
            <input type="text" value={form.associationId} onChange={(e) => set("associationId", e.target.value)} placeholder="MongoDB ObjectId" className={INPUT_CLS} />
          </FieldWrap>

          <FieldWrap label="Club ID">
            <input type="text" value={form.clubId} onChange={(e) => set("clubId", e.target.value)} placeholder="MongoDB ObjectId" className={INPUT_CLS} />
          </FieldWrap>

          <FieldWrap label="Team IDs" hint="Comma-separated — for events involving multiple teams" className="sm:col-span-2">
            <input
              type="text"
              value={form.teamIdsRaw}
              onChange={(e) => handleTeamIdsChange(e.target.value)}
              placeholder="teamId1, teamId2, teamId3…"
              className={INPUT_CLS}
            />
          </FieldWrap>
        </div>

        <SectionHeading>Calendar Propagation</SectionHeading>

        <FieldWrap label="Calendar Propagation" hint="Controls which calendars this event automatically appears in">
          <select
            value={calPropagation}
            onChange={(e) => set("calendarPropagation", e.target.value as CalendarPropagation)}
            className={SELECT_CLS}
          >
            {(["none", "team", "club", "association", "global"] as CalendarPropagation[]).map((v) => (
              <option key={v} value={v}>
                {propagationLabels[v]}
              </option>
            ))}
          </select>
        </FieldWrap>

        {/* Description of selected option */}
        <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-3 border border-slate-200">
          <Info size={13} className="inline mr-1.5 text-slate-400 mb-0.5" />
          {PROPAGATION_DESCRIPTIONS[calPropagation]}
        </p>

        {/* Propagation info box */}
        {calPropagation !== "none" && (
          <div className="flex items-start gap-3 px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Info size={16} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-amber-800">
                Calendar propagation is active
              </p>
              <p className="text-xs text-amber-700 mt-0.5">
                This event will appear in calendars beyond the creating organisation ({calPropagation} level). Ensure the event details are accurate before publishing.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderMedia() {
    return (
      <div className="space-y-8">
        <div>
          <SectionHeading>Featured Image</SectionHeading>
          <ImageUploader
            currentUrl={form.currentFeaturedImage || undefined}
            onFileSelect={setFeaturedImageFile}
            selectedFile={featuredImageFile}
            label="Featured Image"
          />
        </div>

        <div>
          <SectionHeading>Event Flyer (PDF)</SectionHeading>
          <PdfUploader
            currentUrl={form.currentFlyer || undefined}
            onFileSelect={setFlyerFile}
            selectedFile={flyerFile}
          />
        </div>

        <div>
          <SectionHeading>Additional Documents</SectionHeading>
          <p className="text-xs text-slate-400 mb-3">
            Attachments are uploaded immediately. Supported: PDF, Word, Excel, CSV, TXT, and images.
          </p>
          <DocumentUploader
            documents={form.documents}
            onChange={(docs) => set("documents", docs)}
            onView={(doc) => setViewingDoc(doc as ViewerDocItem)}
          />
        </div>
      </div>
    );
  }

  function renderRegistration() {
    return (
      <div className="space-y-5">
        <SectionHeading>Registration</SectionHeading>

        <ToggleCheckbox
          checked={form.requiresRegistration}
          onChange={(v) => set("requiresRegistration", v)}
          label="Requires Registration"
          description="Participants must register before attending this event"
        />

        {form.requiresRegistration && (
          <div className="space-y-5 pt-2 pl-1 border-l-2 border-[#06054e]/20 ml-1 pl-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FieldWrap label="Registration Deadline">
                <input
                  type="date"
                  value={form.registrationDeadline}
                  max={form.startDate || undefined}
                  onChange={(e) => set("registrationDeadline", e.target.value)}
                  className={INPUT_CLS}
                />
              </FieldWrap>

              <FieldWrap label="Max Participants">
                <input
                  type="number"
                  min={1}
                  value={form.maxParticipants}
                  onChange={(e) => set("maxParticipants", e.target.value)}
                  placeholder="Unlimited"
                  className={INPUT_CLS}
                />
              </FieldWrap>

              <FieldWrap label="External Registration URL" hint="Link to external registration form or website" className="sm:col-span-2">
                <input
                  type="url"
                  value={form.externalRegistrationUrl}
                  onChange={(e) => set("externalRegistrationUrl", e.target.value)}
                  placeholder="https://…"
                  className={INPUT_CLS}
                />
              </FieldWrap>
            </div>

            <ToggleCheckbox
              checked={form.waitlistEnabled}
              onChange={(v) => set("waitlistEnabled", v)}
              label="Enable Waitlist"
              description="Allow participants to join a waitlist when the event is full"
            />
          </div>
        )}

        <SectionHeading>Cost</SectionHeading>

        <ToggleCheckbox
          checked={form.isFree}
          onChange={(v) => set("isFree", v)}
          label="This event is free"
          description="No cost to attend or register for this event"
        />

        {!form.isFree && (
          <div className="space-y-5 pt-2 border-l-2 border-amber-400/40 ml-1 pl-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <FieldWrap label="Amount (AUD)">
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.costAmount}
                  onChange={(e) => set("costAmount", e.target.value)}
                  placeholder="0.00"
                  className={INPUT_CLS}
                />
              </FieldWrap>

              <FieldWrap label="Currency">
                <input
                  type="text"
                  value={form.costCurrency}
                  onChange={(e) => set("costCurrency", e.target.value)}
                  placeholder="AUD"
                  maxLength={3}
                  className={INPUT_CLS}
                />
              </FieldWrap>

              <FieldWrap label="Cost Description" hint='e.g. "Members: $15, Non-members: $25"' className="sm:col-span-2">
                <input
                  type="text"
                  value={form.costDescription}
                  onChange={(e) => set("costDescription", e.target.value)}
                  placeholder="Members: $15, Non-members: $25"
                  className={INPUT_CLS}
                />
              </FieldWrap>
            </div>
          </div>
        )}
      </div>
    );
  }

  function renderContact() {
    return (
      <div className="space-y-5">
        <SectionHeading>Contact Person</SectionHeading>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldWrap label="Contact Name">
            <input type="text" value={form.contactName} onChange={(e) => set("contactName", e.target.value)} placeholder="Jane Smith" className={INPUT_CLS} />
          </FieldWrap>

          <FieldWrap label="Role / Title">
            <input type="text" value={form.contactRole} onChange={(e) => set("contactRole", e.target.value)} placeholder="Event Coordinator" className={INPUT_CLS} />
          </FieldWrap>

          <FieldWrap label="Email">
            <input type="email" value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} placeholder="jane@example.com" className={INPUT_CLS} />
          </FieldWrap>

          <FieldWrap label="Phone">
            <input type="tel" value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} placeholder="+61 400 000 000" className={INPUT_CLS} />
          </FieldWrap>
        </div>

        <SectionHeading>Links</SectionHeading>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <FieldWrap label="External Link" hint="General info page or website">
            <input type="url" value={form.externalLink} onChange={(e) => set("externalLink", e.target.value)} placeholder="https://…" className={INPUT_CLS} />
          </FieldWrap>

          <FieldWrap label="Ticketing URL" hint="Link to purchase or collect tickets">
            <input type="url" value={form.ticketingUrl} onChange={(e) => set("ticketingUrl", e.target.value)} placeholder="https://…" className={INPUT_CLS} />
          </FieldWrap>

          <FieldWrap label="Livestream URL" hint="YouTube, Facebook Live, etc." className="sm:col-span-2">
            <input type="url" value={form.livestreamUrl} onChange={(e) => set("livestreamUrl", e.target.value)} placeholder="https://…" className={INPUT_CLS} />
          </FieldWrap>
        </div>
      </div>
    );
  }

  function renderTabContent() {
    switch (activeTab) {
      case "general":       return renderGeneral();
      case "schedule":      return renderSchedule();
      case "location":      return renderLocation();
      case "organisation":  return renderOrganisation();
      case "media":         return renderMedia();
      case "registration":  return renderRegistration();
      case "contact":       return renderContact();
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const pageTitle = isEditing ? `Edit: ${event!.name}` : "Create Event";

  return (
    <>
      {/* Inline document viewer overlay */}
      {viewingDoc && (
        <InlineDocumentViewer
          document={viewingDoc}
          isOpen={true}
          onClose={() => setViewingDoc(null)}
        />
      )}

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-32">

        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-4">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-[#06054e] transition-colors duration-150 mb-6 group"
          >
            <ArrowLeft
              size={16}
              className="group-hover:-translate-x-0.5 transition-transform duration-150"
            />
            Back to Events
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-3xl font-black uppercase text-[#06054e] leading-tight">
                {pageTitle}
              </h1>
              {isEditing && (
                <p className="text-sm text-slate-500 mt-1 font-medium">
                  ID: {event!.id}
                </p>
              )}
            </div>

            {/* Quick status badge */}
            {form.status && (
              <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-[#06054e]/10 text-[#06054e] text-xs font-black uppercase tracking-wide mt-1">
                {form.status}
              </span>
            )}
          </div>
        </div>

        {/* ── Tab navigation ───────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {TABS.map((tab) => {
              const isActive  = activeTab === tab.id;
              const hasError  =
                (tab.id === "general"      && (errors.name))                       ||
                (tab.id === "schedule"     && errors.startDate)                    ||
                (tab.id === "organisation" && (errors.orgType || errors.orgName));

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={[
                    "inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-black uppercase tracking-wide whitespace-nowrap border transition-all duration-150 shrink-0",
                    isActive
                      ? "bg-[#06054e] text-white border-[#06054e] shadow-md"
                      : hasError
                      ? "bg-red-50 text-red-600 border-red-300 hover:border-red-400"
                      : "bg-white text-slate-500 border-slate-200 hover:border-[#06054e] hover:text-[#06054e]",
                  ].join(" ")}
                  aria-current={isActive ? "page" : undefined}
                >
                  {tab.icon}
                  {tab.label}
                  {hasError && !isActive && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" aria-label="Has errors" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Tab content card ─────────────────────────────────────────── */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            {renderTabContent()}
          </div>
        </div>
      </div>

      {/* ── Sticky action bar ────────────────────────────────────────────── */}
      <div className="fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-2xl">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3 justify-between flex-wrap">
          {/* Left: cancel */}
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-5 py-2.5 rounded-xl border border-slate-300 text-sm font-black uppercase text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>

          {/* Right: draft + save */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl border-2 border-slate-300 text-sm font-black uppercase text-slate-600 hover:border-[#06054e] hover:text-[#06054e] transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin" />
                  Saving…
                </span>
              ) : (
                "Save as Draft"
              )}
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-black uppercase tracking-wide transition-colors duration-150 shadow-md disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {submitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 size={15} />
                  {isEditing ? "Update Event" : "Save Event"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
