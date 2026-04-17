"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import type { FanPreferences } from "@/lib/member/fanPreferences";

type TeamOption = { teamId: string; name: string; clubId: string };
type AssociationClubOption = { clubId: string; name: string; slug: string };

const MATCH_DAY_TIPS = [
  "Turn on fixture change emails or push so you never miss a kick-off or venue move for teams you follow.",
  "Use This round with your club filter to see everything your teams are playing this week.",
  "Spoiler-free mode on match day pages helps when you are watching later.",
];

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function FanPreferencesPanel() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [associationClubs, setAssociationClubs] = useState<AssociationClubOption[]>([]);
  const [clubId, setClubId] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<FanPreferences | null>(null);
  const [pushAvailable, setPushAvailable] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/member/fan-preferences");
      if (res.status === 401) {
        setPrefs(null);
        setTeams([]);
        setAssociationClubs([]);
        return;
      }
      if (!res.ok) throw new Error("Failed to load preferences");
      const data = await res.json();
      setPrefs(data.preferences as FanPreferences);
      setTeams(Array.isArray(data.teams) ? data.teams : []);
      setAssociationClubs(Array.isArray(data.associationClubs) ? data.associationClubs : []);
      setClubId(typeof data.clubId === "string" ? data.clubId : null);

      const vk = await fetch("/api/member/push/vapid-public-key");
      setPushAvailable(vk.ok);
    } catch {
      toast.error("Could not load fan preferences");
      setPrefs(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleTeam = (teamId: string) => {
    if (!prefs) return;
    const set = new Set(prefs.followedTeamIds);
    if (set.has(teamId)) set.delete(teamId);
    else set.add(teamId);
    setPrefs({ ...prefs, followedTeamIds: [...set] });
  };

  const toggleFavouriteClub = (clubIdToToggle: string) => {
    if (!prefs) return;
    const set = new Set(prefs.favouriteClubIds);
    if (set.has(clubIdToToggle)) set.delete(clubIdToToggle);
    else set.add(clubIdToToggle);
    setPrefs({ ...prefs, favouriteClubIds: [...set] });
  };

  const save = async () => {
    if (!prefs) return;
    setSaving(true);
    try {
      const {
        pushSubscriptions: _ps,
        ...rest
      } = prefs;
      const res = await fetch("/api/member/fan-preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rest),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Save failed");
      }
      const data = await res.json();
      setPrefs(data.preferences as FanPreferences);
      toast.success("Saved your preferences");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const subscribeThisBrowser = async () => {
    if (!pushAvailable) {
      toast.error("Push is not configured for this site yet.");
      return;
    }
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      toast.error("This browser does not support web push.");
      return;
    }
    setPushBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast.error("Notification permission was not granted.");
        return;
      }
      const vk = await fetch("/api/member/push/vapid-public-key");
      if (!vk.ok) {
        toast.error("Could not load push configuration.");
        return;
      }
      const { publicKey } = (await vk.json()) as { publicKey?: string };
      if (!publicKey) {
        toast.error("Invalid push configuration.");
        return;
      }
      const reg = await navigator.serviceWorker.register("/competitions/fan-sw.js", {
        scope: "/competitions/",
      });
      await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });
      }
      const json = sub.toJSON();
      const saveRes = await fetch("/api/member/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json),
      });
      if (!saveRes.ok) {
        const err = await saveRes.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "Could not save subscription");
      }
      await load();
      toast.success("This browser is subscribed to push");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Subscribe failed");
    } finally {
      setPushBusy(false);
    }
  };

  const unsubscribeThisBrowser = async () => {
    if (!("serviceWorker" in navigator)) return;
    setPushBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration("/competitions/");
      const sub = reg ? await reg.pushManager.getSubscription() : null;
      const endpoint = sub?.endpoint;
      if (sub) await sub.unsubscribe();
      if (endpoint) {
        await fetch("/api/member/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint }),
        });
      }
      await load();
      toast.success("Removed push subscription for this browser");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Unsubscribe failed");
    } finally {
      setPushBusy(false);
    }
  };

  if (loading) {
    return (
      <section className="mb-10 rounded-2xl border border-white/10 bg-black/20 p-6 text-sm text-white/70">
        Loading your fan settings…
      </section>
    );
  }

  if (!prefs) {
    return null;
  }

  return (
    <section className="mb-10 rounded-2xl border border-white/10 bg-black/25 p-6 text-white">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200">
            Follow my teams
          </h2>
          <p className="mt-2 max-w-xl text-sm text-white/75">
            Pick extra teams to include in <strong>My fixtures</strong>. When admins notify on a
            fixture schedule/venue change (Epic J1), we email and optionally push fans who follow
            either team.
          </p>
        </div>
        {clubId ? (
          <span className="text-[10px] font-black uppercase tracking-widest text-white/45">
            Club {clubId}
          </span>
        ) : null}
      </div>

      {teams.length === 0 ? (
        <p className="mt-4 text-sm text-white/60">
          No teams found for your club yet. Once teams exist, you can follow them here.
        </p>
      ) : (
        <div className="mt-5 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3">
          <ul className="space-y-2">
            {teams.map((t) => (
              <li key={t.teamId}>
                <label className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-white/5">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-white/30 bg-transparent"
                    checked={prefs.followedTeamIds.includes(t.teamId)}
                    onChange={() => toggleTeam(t.teamId)}
                  />
                  <span className="text-sm font-bold">{t.name}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10">
        <h2 className="text-[10px] font-black uppercase tracking-[0.28em] text-yellow-200">
          Favourite clubs
        </h2>
        <p className="mt-2 max-w-xl text-sm text-white/75">
          Star other clubs in your association for quick links (saved to your profile).
        </p>
        {associationClubs.length === 0 ? (
          <p className="mt-4 text-sm text-white/60">
            No association clubs list available yet (needs a club with a parent association).
          </p>
        ) : (
          <div className="mt-5 max-h-52 overflow-y-auto rounded-xl border border-white/10 bg-white/5 p-3">
            <ul className="space-y-2">
              {associationClubs.map((c) => (
                <li key={c.clubId}>
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-white/5">
                    <label className="flex cursor-pointer items-center gap-3">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-white/30 bg-transparent"
                        checked={prefs.favouriteClubIds.includes(c.clubId)}
                        onChange={() => toggleFavouriteClub(c.clubId)}
                      />
                      <span className="text-sm font-bold">{c.name}</span>
                    </label>
                    <Link
                      href={`/clubs/${encodeURIComponent(c.slug)}`}
                      className="text-[10px] font-black uppercase tracking-widest text-yellow-200/90 hover:text-yellow-200"
                    >
                      View hub
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
            checked={prefs.notifyFixtureChangesEmail}
            onChange={(e) => setPrefs({ ...prefs, notifyFixtureChangesEmail: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-black">Email me on fixture changes</span>
            <span className="mt-1 block text-xs text-white/60">
              Same pipeline as club contacts (Epic J1). Requires your member email and admin
              “notify schedule change” on save.
            </span>
          </span>
        </label>

        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
              checked={prefs.notifyFixtureChangesPush}
              disabled={!pushAvailable}
              onChange={(e) => setPrefs({ ...prefs, notifyFixtureChangesPush: e.target.checked })}
            />
            <span>
              <span className="block text-sm font-black">Push notifications</span>
              <span className="mt-1 block text-xs text-white/60">
                {pushAvailable
                  ? "Browser push (VAPID). Save your preference, then subscribe this device."
                  : "Not configured on this server (VAPID keys missing)."}
              </span>
            </span>
          </label>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pushBusy || !pushAvailable}
              onClick={() => void subscribeThisBrowser()}
              className="rounded-lg bg-white/10 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/15 disabled:opacity-40"
            >
              {pushBusy ? "Working…" : "Subscribe this browser"}
            </button>
            <button
              type="button"
              disabled={pushBusy}
              onClick={() => void unsubscribeThisBrowser()}
              className="rounded-lg border border-white/15 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-white/80 hover:bg-white/5 disabled:opacity-40"
            >
              Remove this browser
            </button>
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
            checked={prefs.weeklyTipsEmail}
            onChange={(e) => setPrefs({ ...prefs, weeklyTipsEmail: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-black">Weekly tips email</span>
            <span className="mt-1 block text-xs text-white/60">
              Ops can call <code className="text-white/50">GET /api/cron/weekly-fan-tips</code> with{" "}
              <code className="text-white/50">CRON_SECRET</code> (Bearer or ?secret=).
            </span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <input
            type="checkbox"
            className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
            checked={prefs.showMatchDayTips}
            onChange={(e) => setPrefs({ ...prefs, showMatchDayTips: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-black">Show match-day tips</span>
            <span className="mt-1 block text-xs text-white/60">Quick ideas below when enabled.</span>
          </span>
        </label>
      </div>

      {prefs.showMatchDayTips ? (
        <ul className="mt-5 list-disc space-y-1 pl-5 text-xs font-semibold text-white/80">
          {MATCH_DAY_TIPS.map((tip) => (
            <li key={tip}>{tip}</li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="rounded-xl bg-yellow-400 px-6 py-3 text-xs font-black uppercase tracking-widest text-[#06054e] hover:bg-yellow-300 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
      </div>
    </section>
  );
}
