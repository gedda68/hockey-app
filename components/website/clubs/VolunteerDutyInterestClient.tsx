"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  VOLUNTEER_DUTY_KIND_IDS,
  VOLUNTEER_DUTY_KIND_LABELS,
  type VolunteerDutyKindId,
} from "@/lib/volunteerDuty/volunteerDutyKinds";

type Props = {
  clubName: string;
  clubSlug: string;
  /** Path segment for API (slug preferred). */
  apiClubRef: string;
  hubHref: string;
};

export default function VolunteerDutyInterestClient({
  clubName,
  clubSlug,
  apiClubRef,
  hubHref,
}: Props) {
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState("");
  const [kinds, setKinds] = useState<Set<VolunteerDutyKindId>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleKind = useCallback((k: VolunteerDutyKindId) => {
    setKinds((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  }, []);

  const dutyKinds = useMemo(() => [...kinds], [kinds]);

  const submit = useCallback(async () => {
    setError(null);
    if (dutyKinds.length === 0) {
      setError("Choose at least one duty you might help with.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(
        `/api/public/clubs/${encodeURIComponent(apiClubRef)}/volunteer-duty-interest`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: displayName.trim(),
            email: email.trim(),
            phone: phone.trim() || undefined,
            dutyKinds,
            message: message.trim() || undefined,
            company: company.trim() || undefined,
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Submit failed");
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submit failed");
    } finally {
      setSubmitting(false);
    }
  }, [apiClubRef, company, displayName, dutyKinds, email, message, phone]);

  if (done) {
    return (
      <div className="rounded-2xl border border-emerald-400/40 bg-emerald-950/40 p-6 text-emerald-50">
        <p className="text-lg font-black">Thanks — you&apos;re on the list.</p>
        <p className="mt-2 text-sm text-emerald-100/85">
          {clubName} will follow up when they need help (canteen, goal judge, and other game-day
          roles stay separate from the umpire register).
        </p>
        <Link
          href={hubHref}
          className="mt-4 inline-flex text-sm font-bold text-yellow-300 underline decoration-yellow-400/40 hover:decoration-yellow-200"
        >
          ← Back to club hub
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-white/15 bg-black/30 p-6 text-white shadow-xl backdrop-blur-sm">
      <p className="text-sm leading-relaxed text-white/80">
        This form is for <strong className="text-white">game-day and club volunteers</strong>{" "}
        (canteen, goal judge, table, setup, etc.). Umpiring and technical-official pathways still go
        through the separate{" "}
        <Link href={`${hubHref}#pathways`} className="font-bold text-sky-300 underline">
          umpire pathway
        </Link>{" "}
        and association official register.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-xs font-black uppercase tracking-widest text-white/50">
          Your name
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white placeholder:text-white/35"
            autoComplete="name"
            required
          />
        </label>
        <label className="block text-xs font-black uppercase tracking-widest text-white/50">
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white placeholder:text-white/35"
            autoComplete="email"
            required
          />
        </label>
      </div>

      <label className="block text-xs font-black uppercase tracking-widest text-white/50">
        Phone <span className="font-semibold normal-case text-white/35">(optional)</span>
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white placeholder:text-white/35"
          autoComplete="tel"
        />
      </label>

      <fieldset>
        <legend className="text-xs font-black uppercase tracking-widest text-white/50">
          I can help with
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {VOLUNTEER_DUTY_KIND_IDS.map((id) => {
            const on = kinds.has(id);
            return (
              <button
                key={id}
                type="button"
                onClick={() => toggleKind(id)}
                className={`rounded-full border px-3 py-1.5 text-xs font-bold transition ${
                  on
                    ? "border-yellow-400/70 bg-yellow-400/20 text-yellow-50"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-white/30"
                }`}
              >
                {VOLUNTEER_DUTY_KIND_LABELS[id]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <label className="block text-xs font-black uppercase tracking-widest text-white/50">
        Anything else we should know?
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-semibold text-white placeholder:text-white/35"
        />
      </label>

      {/* Honeypot — leave hidden; bots often fill visible “company” fields */}
      <div className="hidden" aria-hidden="true">
        <label>
          Company
          <input value={company} onChange={(e) => setCompany(e.target.value)} tabIndex={-1} />
        </label>
      </div>

      {error ? (
        <p className="text-sm font-bold text-rose-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={submitting}
          className="rounded-xl bg-yellow-400 px-6 py-2.5 text-sm font-black uppercase tracking-wide text-[#06054e] shadow hover:bg-yellow-300 disabled:opacity-60"
        >
          {submitting ? "Sending…" : "Send interest"}
        </button>
        <Link
          href={hubHref}
          className="text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white/80"
        >
          Cancel
        </Link>
      </div>

      <p className="text-[10px] font-semibold uppercase tracking-wider text-white/35">
        Club: {clubName} · slug {clubSlug}
      </p>
    </div>
  );
}
