// app/(website)/competitions/events/[slug]/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import Image from "next/image";
import {
  Calendar,
  Clock,
  MapPin,
  Building2,
  DollarSign,
  Globe,
  Users,
  Lock,
  FileText,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  Download,
  Share2,
  ExternalLink,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { Event } from "@/types/event";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatDateRange(startDate: string, endDate?: string) {
  const start = new Date(startDate);
  const opts: Intl.DateTimeFormatOptions = {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  };
  if (!endDate || endDate === startDate) {
    return start.toLocaleDateString("en-AU", opts);
  }
  const end = new Date(endDate);
  const shortOpts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  return `${start.toLocaleDateString("en-AU", shortOpts)} – ${end.toLocaleDateString("en-AU", opts)}`;
}

function formatFileSize(bytes?: number) {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocumentIcon({ type }: { type: string }) {
  switch (type) {
    case "pdf":
      return <FileText size={20} className="text-red-500 flex-shrink-0" />;
    case "image":
      return <ImageIcon size={20} className="text-purple-500 flex-shrink-0" />;
    case "xls":
    case "xlsx":
    case "csv":
      return <FileSpreadsheet size={20} className="text-green-500 flex-shrink-0" />;
    default:
      return <File size={20} className="text-slate-400 flex-shrink-0" />;
  }
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; text: string; label: string }> = {
    scheduled:  { bg: "bg-green-500/80",  text: "text-white", label: "Scheduled" },
    completed:  { bg: "bg-slate-500/80",  text: "text-white", label: "Completed" },
    cancelled:  { bg: "bg-red-600/80",    text: "text-white", label: "Cancelled" },
    postponed:  { bg: "bg-orange-500/80", text: "text-white", label: "Postponed" },
    draft:      { bg: "bg-yellow-500/80", text: "text-slate-900", label: "Draft" },
  };
  const s = map[status] ?? map.scheduled;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${s.bg} ${s.text}`}>
      {s.label}
    </span>
  );
}

function CategoryBadge({ category }: { category: string }) {
  const map: Record<string, { bg: string; text: string }> = {
    competition:    { bg: "bg-blue-500/80",    text: "text-white" },
    finals:         { bg: "bg-yellow-500/80",  text: "text-slate-900" },
    representative: { bg: "bg-purple-500/80",  text: "text-white" },
    clinic:         { bg: "bg-green-500/80",   text: "text-white" },
    officials:      { bg: "bg-orange-500/80",  text: "text-white" },
    social:         { bg: "bg-pink-500/80",    text: "text-white" },
    training:       { bg: "bg-cyan-500/80",    text: "text-white" },
    meeting:        { bg: "bg-slate-500/80",   text: "text-white" },
    other:          { bg: "bg-gray-500/80",    text: "text-white" },
  };
  const s = map[category] ?? map.other;
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${s.bg} ${s.text}`}>
      {category}
    </span>
  );
}

function ScopeBadge({ scope }: { scope: string }) {
  const map: Record<string, { bg: string; text: string; icon: string }> = {
    city:          { bg: "bg-cyan-500/80",   text: "text-white", icon: "🏙️" },
    regional:      { bg: "bg-teal-500/80",   text: "text-white", icon: "🗺️" },
    state:         { bg: "bg-indigo-500/80", text: "text-white", icon: "📍" },
    national:      { bg: "bg-red-500/80",    text: "text-white", icon: "🇦🇺" },
    international: { bg: "bg-pink-500/80",   text: "text-white", icon: "🌏" },
  };
  const s = map[scope] ?? { bg: "bg-gray-500/80", text: "text-white", icon: "📌" };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${s.bg} ${s.text}`}>
      {s.icon} {scope}
    </span>
  );
}

function VisibilityIcon({ visibility }: { visibility: string }) {
  if (visibility === "public") return <Globe size={16} className="text-green-500" />;
  if (visibility === "members-only") return <Users size={16} className="text-amber-500" />;
  return <Lock size={16} className="text-red-500" />;
}

function VisibilityLabel({ visibility }: { visibility: string }) {
  if (visibility === "public") return "Public Event";
  if (visibility === "members-only") return "Members Only";
  return "Private";
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function LoadingSpinner() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">
          Loading event…
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 404 state
// ---------------------------------------------------------------------------

function NotFoundState({ slug }: { slug: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="bg-white/5 border border-white/10 rounded-2xl p-10 max-w-md w-full text-center">
        <AlertCircle size={48} className="text-red-400 mx-auto mb-4" />
        <h1 className="text-2xl font-black text-white mb-2">Event Not Found</h1>
        <p className="text-slate-400 mb-6 text-sm">
          The event <span className="font-mono text-slate-300">&ldquo;{slug}&rdquo;</span> could not be found.
          It may have been removed or the link may be incorrect.
        </p>
        <Link
          href="/competitions/events"
          className="inline-flex items-center gap-2 px-6 py-3 bg-amber-400 hover:bg-amber-300 text-[#06054e] font-black rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Events
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 403 / access gate states
// ---------------------------------------------------------------------------

function MembersOnlyGate({ slug }: { slug: string }) {
  const returnUrl = encodeURIComponent(`/competitions/events/${slug}`);
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="bg-[#06054e] border border-amber-400/30 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-amber-400/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} className="text-amber-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Members Only</h1>
        <p className="text-slate-300 mb-8 leading-relaxed">
          This event is for members only. Please log in to view the details.
        </p>
        <Link
          href={`/login?returnUrl=/competitions/events/${slug}`}
          className="inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-amber-400 hover:bg-amber-300 text-[#06054e] font-black text-lg rounded-xl transition-colors"
        >
          Log In to View Event
        </Link>
        <Link
          href="/competitions/events"
          className="mt-4 flex items-center justify-center gap-2 text-slate-400 hover:text-white text-sm font-bold transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Events
        </Link>
      </div>
    </div>
  );
}

function PrivateEventGate() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#06054e] via-slate-900 to-slate-800 flex items-center justify-center px-4">
      <div className="bg-[#06054e] border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock size={32} className="text-slate-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-3">Private Event</h1>
        <p className="text-slate-400 mb-8 leading-relaxed">
          This event is not publicly accessible.
        </p>
        <Link
          href="/competitions/events"
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 text-white font-black rounded-xl transition-colors"
        >
          <ArrowLeft size={18} />
          Back to Events
        </Link>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Registration CTA logic
// ---------------------------------------------------------------------------

function RegistrationCTA({ event }: { event: Event }) {
  if (!event.requiresRegistration || !event.registrationConfig) return null;

  const now = new Date();
  const deadline = event.registrationConfig.deadline
    ? new Date(event.registrationConfig.deadline)
    : null;
  const isOpen = !deadline || deadline > now;

  const { maxParticipants, currentParticipants, waitlistEnabled, url } =
    event.registrationConfig;
  const remaining =
    maxParticipants != null
      ? maxParticipants - (currentParticipants ?? 0)
      : null;
  const isFull = remaining !== null && remaining <= 0;
  const isLimited = !isFull && remaining !== null && remaining <= 5;

  if (!isOpen) {
    return (
      <div className="mt-6 p-4 bg-slate-100 rounded-xl text-center">
        <p className="text-slate-500 font-bold text-sm">Registration Closed</p>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="mt-6 space-y-3">
        <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl text-center">
          <p className="text-red-700 font-black text-sm uppercase tracking-wide">Sold Out</p>
        </div>
        {waitlistEnabled && (
          <a
            href={url ?? "#"}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-amber-400 hover:bg-amber-300 text-[#06054e] font-black rounded-xl transition-colors"
          >
            Join Waitlist
          </a>
        )}
      </div>
    );
  }

  const buttonClass = isLimited
    ? "flex items-center justify-center gap-2 w-full px-4 py-4 bg-amber-400 hover:bg-amber-300 text-[#06054e] font-black text-base rounded-xl transition-colors shadow-lg"
    : "flex items-center justify-center gap-2 w-full px-4 py-4 bg-green-600 hover:bg-green-500 text-white font-black text-base rounded-xl transition-colors shadow-lg";

  return (
    <div className="mt-6">
      <a href={url ?? "#"} className={buttonClass}>
        <CheckCircle size={20} />
        {isLimited ? `Register Now (${remaining} spot${remaining === 1 ? "" : "s"} left)` : "Register Now"}
      </a>
      {event.registrationConfig.deadline && (
        <p className="text-xs text-slate-500 text-center mt-2">
          Registration closes{" "}
          {new Date(event.registrationConfig.deadline).toLocaleDateString("en-AU", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function EventDetailPage() {
  const params = useParams();
  const slug = typeof params.slug === "string" ? params.slug : Array.isArray(params.slug) ? params.slug[0] : "";
  const { user } = useAuth();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorStatus, setErrorStatus] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setErrorStatus(null);

    fetch(`/api/events/${slug}`)
      .then(async (res) => {
        if (res.status === 404) { setErrorStatus(404); setLoading(false); return; }
        if (res.status === 403) { setErrorStatus(403); setLoading(false); return; }
        if (!res.ok) { setErrorStatus(res.status); setLoading(false); return; }
        const data = await res.json();
        setEvent(data.event ?? data);
        setLoading(false);
      })
      .catch(() => {
        setErrorStatus(500);
        setLoading(false);
      });
  }, [slug]);

  const handleShare = () => {
    const pageUrl =
      typeof window !== "undefined" ? window.location.href : `https://example.com/competitions/events/${slug}`;
    if (navigator.share) {
      navigator.share({
        title: event?.name ?? "Event",
        text: event?.shortDescription ?? "",
        url: pageUrl,
      });
    } else {
      navigator.clipboard.writeText(pageUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ------ States -----------------------------------------------------------

  if (loading) return <LoadingSpinner />;

  if (errorStatus === 404) return <NotFoundState slug={slug} />;

  if (errorStatus === 403) {
    // We don't know visibility from the response body at this point,
    // but if the user is logged in it's likely "private", otherwise "members-only".
    if (user) return <PrivateEventGate />;
    return <MembersOnlyGate slug={slug} />;
  }

  if (errorStatus !== null || !event) {
    return <NotFoundState slug={slug} />;
  }

  // ------ Event is accessible — render full detail -------------------------

  const hasFeaturedImage = !!event.images?.featured;
  const heroStyle = hasFeaturedImage
    ? {}
    : {
        background: "linear-gradient(135deg, #06054e 0%, #1e1b4b 50%, #312e81 100%)",
      };

  const eventSlugOrId = (event as unknown as { slug?: string }).slug || event.id;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ------------------------------------------------------------------ */}
      {/* BACK BUTTON (floating over hero)                                    */}
      {/* ------------------------------------------------------------------ */}
      <div className="absolute top-4 left-4 z-20">
        <Link
          href="/competitions/events"
          className="inline-flex items-center gap-2 px-4 py-2 bg-black/40 hover:bg-black/60 backdrop-blur-sm text-white font-bold text-sm rounded-full transition-colors"
        >
          <ArrowLeft size={16} />
          <span>Events</span>
        </Link>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* HERO                                                                */}
      {/* ------------------------------------------------------------------ */}
      <div
        className="relative w-full overflow-hidden"
        style={{ height: "40vh", minHeight: 240, ...heroStyle }}
      >
        {hasFeaturedImage && (
          <Image
            src={event.images!.featured!}
            alt={event.name}
            fill
            className="object-cover"
            priority
          />
        )}

        {/* Dark overlay for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

        {/* Hero content */}
        <div className="absolute inset-0 flex flex-col justify-end px-6 pb-8 max-w-4xl mx-auto w-full left-0 right-0">
          {/* Badges row */}
          <div className="flex flex-wrap gap-2 mb-3">
            <CategoryBadge category={event.category} />
            {event.scope && <ScopeBadge scope={event.scope} />}
            <StatusBadge status={event.status} />
          </div>

          {/* Event name */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight mb-1">
            {event.name}
          </h1>

          {/* Organisation */}
          {event.organization && (
            <p className="text-amber-400 font-bold text-base">
              {event.organization.name}
            </p>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* CONTENT                                                             */}
      {/* ------------------------------------------------------------------ */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 -mt-8 relative z-10 pb-20">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* ============================================================== */}
          {/* LEFT COLUMN                                                     */}
          {/* ============================================================== */}
          <div className="flex-1 min-w-0">

            {/* About card */}
            <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-100 mb-6">
              <h2 className="text-xl font-black text-slate-900 mb-4">
                About this event
              </h2>

              {event.fullDescription ? (
                <div
                  className="prose prose-slate max-w-none text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: event.fullDescription }}
                />
              ) : (
                <p className="text-slate-600 leading-relaxed">
                  {event.shortDescription}
                </p>
              )}

              {/* Tags */}
              {event.tags && event.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {event.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-bold"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Documents section */}
            {event.documents && event.documents.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-100 mb-6">
                <h2 className="text-xl font-black text-slate-900 mb-4">
                  Downloads &amp; Documents
                </h2>
                <ul className="space-y-3">
                  {event.documents.map((doc, idx) => (
                    <li
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-amber-300 transition-colors group"
                    >
                      <DocumentIcon type={doc.type} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-slate-800 text-sm truncate">{doc.name}</p>
                        {doc.size && (
                          <p className="text-xs text-slate-400">{formatFileSize(doc.size)}</p>
                        )}
                      </div>
                      <a
                        href={doc.url}
                        download={doc.name}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 bg-[#06054e] hover:bg-[#0a0870] text-white text-xs font-black rounded-lg transition-colors"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Download size={14} />
                        Download
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Updates section */}
            {event.updates && event.updates.length > 0 && (
              <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border border-slate-100">
                <h2 className="text-xl font-black text-slate-900 mb-4">Updates</h2>
                <ol className="relative border-l-2 border-slate-200 space-y-6 pl-6">
                  {event.updates.map((update, idx) => (
                    <li key={idx} className="relative">
                      <div className="absolute -left-[1.65rem] top-0.5 w-3 h-3 rounded-full bg-amber-400 border-2 border-white" />
                      <time className="text-xs font-black uppercase tracking-wider text-slate-400 mb-1 block">
                        {new Date(update.date).toLocaleDateString("en-AU", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })}
                      </time>
                      <p className="text-slate-700 text-sm leading-relaxed">{update.message}</p>
                      {update.authorName && (
                        <p className="text-xs text-slate-400 mt-1">— {update.authorName}</p>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* RIGHT COLUMN — sticky info card                                 */}
          {/* ============================================================== */}
          <aside className="w-full lg:w-80 shrink-0 lg:sticky lg:top-8">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
              {/* Card header accent */}
              <div className="h-2 bg-gradient-to-r from-[#06054e] to-amber-400" />

              <div className="p-6 space-y-4">
                {/* Date */}
                <div className="flex items-start gap-3">
                  <Calendar size={18} className="text-[#06054e] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Date</p>
                    <p className="text-sm font-bold text-slate-800 leading-snug">
                      {formatDateRange(event.startDate, event.endDate)}
                    </p>
                  </div>
                </div>

                {/* Time */}
                {event.startTime && (
                  <div className="flex items-start gap-3">
                    <Clock size={18} className="text-[#06054e] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Time</p>
                      <p className="text-sm font-bold text-slate-800">
                        {event.startTime}
                        {event.endTime && ` – ${event.endTime}`}
                      </p>
                    </div>
                  </div>
                )}

                {/* Location */}
                {event.location && (
                  <div className="flex items-start gap-3">
                    <MapPin size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Location</p>
                      <p className="text-sm font-bold text-slate-800">{event.location}</p>
                    </div>
                  </div>
                )}

                {/* Venue */}
                {event.venue?.name && (
                  <div className="flex items-start gap-3">
                    <Building2 size={18} className="text-indigo-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Venue</p>
                      <p className="text-sm font-bold text-slate-800">{event.venue.name}</p>
                      {event.venue.address && (
                        <p className="text-xs text-slate-500 mt-0.5">{event.venue.address}</p>
                      )}
                      {(event.venue.suburb || event.venue.state) && (
                        <p className="text-xs text-slate-500">
                          {[event.venue.suburb, event.venue.state, event.venue.postcode]
                            .filter(Boolean)
                            .join(", ")}
                        </p>
                      )}
                      {event.venue.fieldNumber && (
                        <p className="text-xs text-slate-500">Field {event.venue.fieldNumber}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Cost */}
                <div className="flex items-start gap-3">
                  <DollarSign size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Cost</p>
                    {!event.cost || event.cost.isFree ? (
                      <p className="text-sm font-black text-green-600">Free</p>
                    ) : (
                      <>
                        <p className="text-sm font-black text-slate-800">
                          ${event.cost.amount} {event.cost.currency}
                        </p>
                        {event.cost.description && (
                          <p className="text-xs text-slate-500 mt-0.5">{event.cost.description}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Visibility */}
                <div className="flex items-start gap-3">
                  <VisibilityIcon visibility={event.visibility} />
                  <div>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider">Access</p>
                    <p className="text-sm font-bold text-slate-800">
                      <VisibilityLabel visibility={event.visibility} />
                    </p>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Registration CTA */}
                <RegistrationCTA event={event} />

                {/* Share */}
                <button
                  onClick={handleShare}
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
                >
                  {copied ? (
                    <>
                      <CheckCircle size={18} className="text-green-600" />
                      <span className="text-green-700">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Share2 size={18} />
                      Share Event
                    </>
                  )}
                </button>

                {/* View full page link (for modal contexts) */}
                <Link
                  href={`/competitions/events/${eventSlugOrId}`}
                  className="hidden"
                  aria-hidden="true"
                />

                {/* Contact */}
                {event.contactPerson && (
                  <div className="pt-2">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                      Contact
                    </p>
                    <p className="text-sm font-bold text-slate-800">{event.contactPerson.name}</p>
                    {event.contactPerson.role && (
                      <p className="text-xs text-slate-500">{event.contactPerson.role}</p>
                    )}
                    {event.contactPerson.email && (
                      <a
                        href={`mailto:${event.contactPerson.email}`}
                        className="text-xs text-amber-600 hover:text-amber-700 font-bold block mt-1"
                      >
                        {event.contactPerson.email}
                      </a>
                    )}
                    {event.contactPerson.phone && (
                      <a
                        href={`tel:${event.contactPerson.phone}`}
                        className="text-xs text-amber-600 hover:text-amber-700 font-bold block"
                      >
                        {event.contactPerson.phone}
                      </a>
                    )}
                  </div>
                )}

                {/* External links */}
                {(event.externalLink || event.ticketingUrl || event.livestreamUrl) && (
                  <div className="pt-2 space-y-2">
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                      Links
                    </p>
                    {event.externalLink && (
                      <a
                        href={event.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#06054e] hover:text-amber-600 font-bold transition-colors"
                      >
                        <ExternalLink size={14} />
                        Event Website
                      </a>
                    )}
                    {event.ticketingUrl && (
                      <a
                        href={event.ticketingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#06054e] hover:text-amber-600 font-bold transition-colors"
                      >
                        <ExternalLink size={14} />
                        Buy Tickets
                      </a>
                    )}
                    {event.livestreamUrl && (
                      <a
                        href={event.livestreamUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 text-sm text-[#06054e] hover:text-amber-600 font-bold transition-colors"
                      >
                        <ExternalLink size={14} />
                        Watch Livestream
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Back link repeated below card for convenience */}
            <Link
              href="/competitions/events"
              className="mt-4 flex items-center justify-center gap-2 text-slate-500 hover:text-slate-700 text-sm font-bold transition-colors"
            >
              <ArrowLeft size={16} />
              All Events
            </Link>
          </aside>
        </div>
      </div>
    </div>
  );
}
