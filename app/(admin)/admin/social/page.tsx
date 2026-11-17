// Social pages: connect Facebook pages, and post to them (a call for nominations, a public announcement, or your own words).

"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Send, Trash2 } from "lucide-react";

interface Account { accountId: string; pageName: string; ownerLevel: "club" | "association"; ownerId: string }
interface Post { postId: string; pageName: string; text: string; status: string; postAt: string; error?: string | null; source?: { type: string } }
interface Owner { level: "club" | "association"; id: string }
interface Source { id: string; label: string; text: string; link?: string }

const inputCls = "w-full rounded-xl border-2 border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:border-teal-400";
const labelCls = "mb-1 block text-xs font-black uppercase tracking-wide text-slate-400";
const TONE: Record<string, string> = { queued: "bg-sky-100 text-sky-700", posting: "bg-sky-100 text-sky-700", posted: "bg-emerald-100 text-emerald-700", failed: "bg-red-100 text-red-700", cancelled: "bg-slate-100 text-slate-500", removed: "bg-slate-100 text-slate-500" };
const when = (iso: string) => new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const ownerLabel = (o: Owner) => (o.level === "club" ? "My club" : "My association");

async function api(url: string, init?: RequestInit) {
  const r = await fetch(url, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

export default function SocialPage() {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [owners, setOwners] = useState<Owner[]>([]);
  const [keyOk, setKeyOk] = useState(true);
  const [posts, setPosts] = useState<Post[]>([]);
  const [sources, setSources] = useState<{ nominationWindows: Source[]; announcements: Source[] }>({ nominationWindows: [], announcements: [] });
  const [owner, setOwner] = useState<Owner | null>(null);
  const [connect, setConnect] = useState({ pageId: "", accessToken: "" });
  const [form, setForm] = useState({ text: "", link: "", postAt: "", accountIds: [] as string[], sourceType: "custom", sourceId: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const a = await api("/api/admin/social/accounts");
      setAccounts(a.accounts ?? []); setOwners(a.owners ?? []); setKeyOk(a.keyConfigured !== false);
      setOwner((o) => o ?? a.owners?.[0] ?? null);
      setPosts((await api("/api/admin/social/posts")).posts ?? []);
    } catch (e) { setAccounts([]); toast.error(e instanceof Error ? e.message : "Couldn't load"); }
  }, []);
  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!owner) return;
    api(`/api/admin/social/sources?ownerLevel=${owner.level}&ownerId=${encodeURIComponent(owner.id)}`).then(setSources).catch(() => undefined);
  }, [owner]);

  const mine = (accounts ?? []).filter((a) => owner && a.ownerLevel === owner.level && a.ownerId === owner.id);

  const doConnect = async () => {
    if (!owner) return;
    setBusy(true);
    try {
      const d = await api("/api/admin/social/accounts", { method: "POST", body: JSON.stringify({ ownerLevel: owner.level, ownerId: owner.id, ...connect }) });
      toast.success(`Connected ${d.pageName}`);
      setConnect({ pageId: "", accessToken: "" });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };
  const disconnect = async (a: Account) => {
    try { await api(`/api/admin/social/accounts/${a.accountId}`, { method: "DELETE" }); toast.success("Disconnected"); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  const pick = (type: string, id: string) => {
    const list = type === "nomination-window" ? sources.nominationWindows : type === "announcement" ? sources.announcements : [];
    const s = list.find((x) => x.id === id);
    setForm((f) => ({ ...f, sourceType: type, sourceId: id, ...(s ? { text: s.text, link: s.link ?? "" } : {}) }));
  };

  const post = async () => {
    if (!owner) return;
    setBusy(true);
    try {
      const d = await api("/api/admin/social/posts", { method: "POST", body: JSON.stringify({ ownerLevel: owner.level, ownerId: owner.id, text: form.text, link: form.link || null, postAt: form.postAt || null, accountIds: form.accountIds.length ? form.accountIds : mine.map((a) => a.accountId), source: { type: form.sourceType, id: form.sourceId } }) });
      toast.success(d.posted ? `Posted to ${d.posted} page${d.posted === 1 ? "" : "s"}` : d.failed ? "It couldn't be posted — see the list below" : "Scheduled");
      setForm({ text: "", link: "", postAt: "", accountIds: [], sourceType: "custom", sourceId: "" });
      await load();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); } finally { setBusy(false); }
  };

  const act = async (p: Post, action: "retry" | "withdraw") => {
    try { await api(`/api/admin/social/posts/${p.postId}`, { method: "PATCH", body: JSON.stringify({ action }) }); await load(); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
  };

  if (accounts === null) return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-black text-[#06054e]">Social pages</h1>
        <p className="mt-1 text-sm font-semibold text-slate-500">Post to your Facebook page. Posts are public. Only call-outs for nominations and announcements that aren't aimed at particular teams or ages can be pre-filled; never the names of people nominated or selected.</p>
      </div>

      {owners.length > 1 && (
        <select className={inputCls} value={owner ? `${owner.level}:${owner.id}` : ""} onChange={(e) => { const [level, ...id] = e.target.value.split(":"); setOwner({ level: level as Owner["level"], id: id.join(":") }); }}>
          {owners.map((o) => <option key={`${o.level}:${o.id}`} value={`${o.level}:${o.id}`}>{ownerLabel(o)}</option>)}
        </select>
      )}
      {owners.length === 0 && <p className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-sm font-semibold text-slate-400">Your account isn't set up to manage a club or association's social pages.</p>}

      {owner && (
        <section className="space-y-3 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-800">Connected pages</h2>
          {!keyOk && <p className="rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Social posting isn't switched on for the server yet (SOCIAL_TOKEN_KEY). Ask whoever runs the site.</p>}
          {mine.length === 0 ? <p className="text-sm font-semibold text-slate-400">No page connected.</p> : (
            <ul className="divide-y divide-slate-100 text-sm">
              {mine.map((a) => <li key={a.accountId} className="flex items-center justify-between py-2"><span className="font-black text-slate-800">{a.pageName} <span className="font-semibold text-slate-400">· Facebook</span></span><button onClick={() => disconnect(a)} aria-label={`Disconnect ${a.pageName}`} className="text-slate-300 hover:text-red-500"><Trash2 className="h-4 w-4" /></button></li>)}
            </ul>
          )}
          <details className="rounded-xl bg-slate-50 p-3">
            <summary className="cursor-pointer text-sm font-black text-slate-600">Connect a Facebook page</summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs font-semibold text-slate-500">You need the page's numeric Page ID and a Page access token with permission to publish posts (created in Meta for Developers). The token is checked with Facebook, then stored encrypted and never shown again.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div><label className={labelCls}>Page ID</label><input className={inputCls} inputMode="numeric" value={connect.pageId} onChange={(e) => setConnect({ ...connect, pageId: e.target.value })} /></div>
                <div><label className={labelCls}>Page access token</label><input className={inputCls} type="password" autoComplete="off" value={connect.accessToken} onChange={(e) => setConnect({ ...connect, accessToken: e.target.value })} /></div>
              </div>
              <button onClick={doConnect} disabled={busy || !keyOk} className="rounded-xl bg-[#06054e] px-4 py-2 text-sm font-black text-white disabled:opacity-50">Connect</button>
            </div>
          </details>
        </section>
      )}

      {owner && mine.length > 0 && (
        <section className="space-y-4 rounded-2xl border-2 border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black text-slate-800">New post</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className={labelCls}>Start from</label>
              <select className={inputCls} value={form.sourceType === "custom" ? "custom" : `${form.sourceType}:${form.sourceId}`} onChange={(e) => { const [t, ...id] = e.target.value.split(":"); if (t === "custom") setForm({ ...form, sourceType: "custom", sourceId: "" }); else pick(t, id.join(":")); }}>
                <option value="custom">My own words</option>
                {sources.nominationWindows.map((w) => <option key={w.id} value={`nomination-window:${w.id}`}>Nominations open: {w.label}</option>)}
                {sources.announcements.map((a) => <option key={a.id} value={`announcement:${a.id}`}>Announcement: {a.label}</option>)}
              </select></div>
            <div><label className={labelCls}>Post at (blank = now)</label><input type="datetime-local" className={inputCls} value={form.postAt} onChange={(e) => setForm({ ...form, postAt: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Text</label><textarea className={inputCls} rows={6} maxLength={1500} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} /></div>
            <div className="sm:col-span-2"><label className={labelCls}>Link (optional, https)</label><input className={inputCls} value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} /></div>
            {mine.length > 1 && (
              <div className="flex flex-wrap gap-2 sm:col-span-2">
                {mine.map((a) => { const on = form.accountIds.includes(a.accountId); return <button key={a.accountId} type="button" onClick={() => setForm({ ...form, accountIds: on ? form.accountIds.filter((x) => x !== a.accountId) : [...form.accountIds, a.accountId] })} className={`rounded-lg px-3 py-1 text-xs font-black ${on ? "bg-teal-500 text-white" : "bg-slate-100 text-slate-500"}`}>{a.pageName}</button>; })}
                <span className="self-center text-xs font-semibold text-slate-400">{form.accountIds.length ? "" : "All pages"}</span>
              </div>
            )}
          </div>
          <button onClick={post} disabled={busy || !form.text.trim()} className="inline-flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-black text-white disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {form.postAt ? "Schedule" : "Post now"}
          </button>
        </section>
      )}

      {posts.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-black text-slate-800">Recent posts</h2>
          <ul className="space-y-3">
            {posts.map((p) => (
              <li key={p.postId} className="rounded-2xl border-2 border-slate-100 bg-white p-4 text-sm shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-slate-500">{p.pageName} · {p.status === "queued" ? `goes out ${when(p.postAt)}` : when(p.postAt)}</div>
                    <p className="mt-1 whitespace-pre-line text-slate-700">{p.text.length > 220 ? `${p.text.slice(0, 220)}…` : p.text}</p>
                    {p.error && <p className="mt-1 text-xs font-bold text-red-600">{p.error}</p>}
                  </div>
                  <span className={`rounded-full px-2 py-1 text-xs font-black capitalize ${TONE[p.status] ?? TONE.cancelled}`}>{p.status}</span>
                </div>
                <div className="mt-3 flex gap-2">
                  {p.status === "failed" && <button onClick={() => act(p, "retry")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">Try again</button>}
                  {["queued", "failed", "posted"].includes(p.status) && <button onClick={() => act(p, "withdraw")} className="rounded-lg bg-slate-100 px-3 py-1 text-xs font-black text-slate-600">{p.status === "posted" ? "Remove from page" : "Cancel"}</button>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
