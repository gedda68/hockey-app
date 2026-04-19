"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import type {
  CommunicationHubPushTopic,
  CommunicationHubSettings,
} from "@/lib/communications/communicationHubSettings";
import { COMMUNICATION_HUB_PUSH_TOPICS } from "@/lib/communications/communicationHubSettings";

const TOPIC_LABEL: Record<CommunicationHubPushTopic, string> = {
  fixture_changes: "Fixture change push (fans who follow teams)",
  weekly_digest: "Weekly digest (reserved — cron wiring next)",
  news_alerts: "News alerts (reserved)",
};

export default function AssociationCommunicationHubClient({
  associationId,
  associationName,
  initial,
}: {
  associationId: string;
  associationName: string;
  initial: CommunicationHubSettings;
}) {
  const [saving, setSaving] = useState(false);
  const [fixtureSupplement, setFixtureSupplement] = useState(
    initial.fixtureChangeEmailSupplementText ?? "",
  );
  const [weeklyDigestEnabled, setWeeklyDigestEnabled] = useState(
    initial.weeklyDigestEnabled,
  );
  const [weeklyDigestIntro, setWeeklyDigestIntro] = useState(
    initial.weeklyDigestIntroText ?? "",
  );
  const [topics, setTopics] = useState<Set<CommunicationHubPushTopic>>(
    () => new Set(initial.enabledPushTopics),
  );

  const toggleTopic = useCallback((t: CommunicationHubPushTopic) => {
    setTopics((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }, []);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/associations/${encodeURIComponent(associationId)}/communications`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fixtureChangeEmailSupplementText: fixtureSupplement.trim() || null,
            weeklyDigestEnabled,
            weeklyDigestIntroText: weeklyDigestIntro.trim() || null,
            enabledPushTopics: [...topics],
          }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(typeof data?.error === "string" ? data.error : "Save failed");
        return;
      }
      toast.success("Communication settings saved");
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }, [
    associationId,
    fixtureSupplement,
    weeklyDigestEnabled,
    weeklyDigestIntro,
    topics,
  ]);

  return (
    <div className="max-w-3xl space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-xl font-black text-[#06054e]">Communications hub</h2>
        <p className="mt-1 text-sm text-slate-600">
          Tenant-scoped defaults for <span className="font-semibold">{associationName}</span>.
          Fixture-change emails always send the standard layout; you can prepend a short plain-text
          message. Push topics control whether this association sends fixture-change web pushes to
          opted-in fans (member preferences still apply).
        </p>
      </div>

      <section className="space-y-2">
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
          Fixture change email — extra message (plain text)
        </label>
        <textarea
          value={fixtureSupplement}
          onChange={(e) => setFixtureSupplement(e.target.value)}
          rows={5}
          maxLength={4000}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner focus:border-[#06054e] focus:outline-none"
          placeholder="Optional note shown above the automated fixture details (e.g. wet weather policy, parking, or who to contact)."
        />
        <p className="text-xs text-slate-500">{fixtureSupplement.length} / 4000</p>
      </section>

      <section className="space-y-3">
        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">
          Push topics (association)
        </h3>
        <ul className="space-y-2">
          {COMMUNICATION_HUB_PUSH_TOPICS.map((t) => (
            <li key={t} className="flex items-start gap-3">
              <input
                id={`topic-${t}`}
                type="checkbox"
                checked={topics.has(t)}
                onChange={() => toggleTopic(t)}
                className="mt-1 h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor={`topic-${t}`} className="text-sm text-slate-800">
                <span className="font-bold">{TOPIC_LABEL[t]}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-slate-100 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <input
            id="weekly-digest"
            type="checkbox"
            checked={weeklyDigestEnabled}
            onChange={(e) => setWeeklyDigestEnabled(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300"
          />
          <label htmlFor="weekly-digest" className="text-sm font-bold text-slate-800">
            Weekly digest (reserved)
          </label>
        </div>
        <p className="text-xs text-slate-600">
          Stores preference for a future curated digest job. No emails are sent from this toggle
          yet.
        </p>
        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500">
          Digest intro (plain text, optional)
        </label>
        <textarea
          value={weeklyDigestIntro}
          onChange={(e) => setWeeklyDigestIntro(e.target.value)}
          rows={3}
          maxLength={4000}
          disabled={!weeklyDigestEnabled}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 shadow-inner disabled:bg-slate-100"
          placeholder="When digest is implemented, this can open each weekly email."
        />
      </section>

      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="rounded-full bg-[#06054e] px-6 py-2 text-sm font-black uppercase tracking-widest text-white hover:bg-yellow-400 hover:text-[#06054e] disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
