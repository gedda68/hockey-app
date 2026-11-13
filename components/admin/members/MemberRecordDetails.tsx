"use client";
// Read-only cards for everything stored on a member beyond the editable core sections.
// Used on the member profile and at the bottom of the edit screen.

import type { ReactNode } from "react";

export interface MemberRelated {
  clubNames?: Record<string, string>;
  associationNames?: Record<string, string>;
  clubRegistrations?: Record<string, any>[];
  associationRegistrations?: Record<string, any>[];
}

const pretty = (v: unknown) =>
  String(v ?? "").replace(/^(role|gender|provider)-/, "").replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDate = (d: unknown) => {
  if (!d) return "—";
  const t = new Date(String(d));
  return Number.isNaN(t.getTime()) ? String(d) : t.toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
};

function Card({ title, tint, children }: { title: string; tint: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-6 py-3 border-b border-slate-100 ${tint}`}>
        <h3 className="font-black text-white uppercase text-sm tracking-wide">{title}</h3>
      </div>
      <div className="p-6 space-y-3">{children}</div>
    </div>
  );
}

function F({ label, value }: { label: string; value?: ReactNode }) {
  const empty = value === undefined || value === null || value === "" || (Array.isArray(value) && value.length === 0);
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">{label}</p>
      <p className="text-slate-800 font-semibold break-words">{empty ? <span className="text-slate-300">—</span> : value}</p>
    </div>
  );
}

const chips = (items: unknown[] | undefined, fmt: (v: any) => string = String) =>
  items && items.length ? (
    <span className="flex flex-wrap gap-1.5">
      {items.map((i, n) => (
        <span key={n} className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700">{fmt(i)}</span>
      ))}
    </span>
  ) : undefined;

export default function MemberRecordDetails({ member, related }: { member: any; related?: MemberRelated }) {
  const clubId: string = member.membership?.clubId || member.clubId || "";
  const clubName = member.membership?.clubName || related?.clubNames?.[clubId] || clubId;
  const plr = member.playerInfo || {};
  const off = member.officiating || {};
  const staff = member.staffInfo || {};
  const teams: any[] = member.teams || [];
  const social = { ...(member.socialMedia || {}), ...Object.fromEntries((Array.isArray(member.personalInfo?.socialMedia) ? member.personalInfo.socialMedia : []).map((s: any) => [s.platform || s.type, s.handle || s.url])) };
  const comm = member.communicationPreferences || {};
  const st = member.status || {};
  const cRegs = related?.clubRegistrations ?? [];
  const aRegs = related?.associationRegistrations ?? [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card title="Club & Registrations" tint="bg-gradient-to-r from-green-600 to-green-700">
        <F label="Home club" value={clubName} />
        <F label="Club id" value={clubId} />
        <F label="Association" value={member.associationId ? related?.associationNames?.[member.associationId] || member.associationId : undefined} />
        <F label="Membership types" value={chips(member.membership?.membershipTypes, pretty)} />
        {cRegs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <p className="text-xs font-black uppercase text-slate-400">Club registrations</p>
            {cRegs.map((r) => (
              <p key={r.registrationId} className="text-sm text-slate-700">
                <b>{r.seasonYear}</b> · {related?.clubNames?.[r.clubId] || r.clubId} · {r.registrationType || "—"} · {pretty(r.status)}{r.ageCategory ? ` · ${pretty(r.ageCategory)}` : ""}
              </p>
            ))}
          </div>
        )}
        {aRegs.length > 0 && (
          <div className="pt-2 border-t border-slate-100 space-y-1">
            <p className="text-xs font-black uppercase text-slate-400">Association registrations</p>
            {aRegs.map((r) => (
              <p key={r.registrationId} className="text-sm text-slate-700">
                <b>{r.seasonYear}</b> · {related?.associationNames?.[r.associationId] || r.associationId} · {pretty(r.status)}{r.ageCategory ? ` · ${pretty(r.ageCategory)}` : ""}
              </p>
            ))}
          </div>
        )}
      </Card>

      <Card title="Teams" tint="bg-gradient-to-r from-sky-600 to-sky-700">
        {teams.length === 0 ? <p className="text-slate-400 text-sm italic">Not assigned to a team.</p> : teams.map((t, i) => (
          <p key={i} className="text-sm text-slate-800 font-semibold">
            {t.teamName || t.name || t.teamId || "Team"}
            <span className="text-slate-500 font-normal">{[t.season || t.seasonYear, t.role && pretty(t.role), t.division].filter(Boolean).map((x) => ` · ${x}`).join("")}</span>
          </p>
        ))}
      </Card>

      <Card title="Player Details" tint="bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="grid grid-cols-2 gap-4">
          <F label="Primary position" value={plr.primaryPosition || plr.position} />
          <F label="Secondary position" value={plr.secondaryPosition} />
          <F label="Jersey number" value={plr.jerseyNumber} />
          <F label="Preferred foot" value={plr.preferredFoot} />
          <F label="Appearances (imported)" value={plr.appearances} />
        </div>
      </Card>

      {(off.roles?.length || off.matchOfficialIds?.length || staff.teams?.length) ? (
        <Card title="Officiating & Staff" tint="bg-gradient-to-r from-purple-600 to-purple-700">
          <F label="Officiating roles" value={chips(off.roles)} />
          <F label="Match official ids" value={chips(off.matchOfficialIds)} />
          <F label="Staff of teams" value={chips(staff.teams)} />
        </Card>
      ) : null}

      <Card title="Social & Preferences" tint="bg-gradient-to-r from-pink-600 to-pink-700">
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(social).map(([k, v]) => <F key={k} label={pretty(k)} value={String(v || "")} />)}
          <F label="Preferred contact" value={comm.preferredMethod} />
          <F label="Email frequency" value={comm.emailFrequency} />
          <F label="SMS notifications" value={comm.smsNotifications === undefined ? undefined : comm.smsNotifications ? "Yes" : "No"} />
          <F label="Push notifications" value={comm.pushNotifications === undefined ? undefined : comm.pushNotifications ? "Yes" : "No"} />
        </div>
        {(member.contact?.additionalEmails?.length ?? 0) > 0 && <F label="Additional emails" value={chips(member.contact.additionalEmails, (e) => (typeof e === "string" ? e : e.email))} />}
      </Card>

      <Card title="Family" tint="bg-gradient-to-r from-teal-600 to-teal-700">
        {(member.familyRelationships?.length ?? 0) === 0 && !member.family && !(member.personalInfo?.relatedMembers?.length)
          ? <p className="text-slate-400 text-sm italic">No family links recorded.</p>
          : <>
              {(member.familyRelationships || []).map((f: any, i: number) => (
                <p key={i} className="text-sm font-semibold text-slate-800">{f.name || f.memberId || f.relatedMemberId} <span className="text-slate-500 font-normal">· {pretty(f.relationship || f.type)}</span></p>
              ))}
              <F label="Related members" value={chips(member.personalInfo?.relatedMembers, (r) => (typeof r === "string" ? r : r.memberId))} />
            </>}
      </Card>

      <Card title="Account & Record" tint="bg-gradient-to-r from-slate-600 to-slate-700">
        <div className="grid grid-cols-2 gap-4">
          <F label="Member id" value={member.memberId} />
          <F label="Previous ids" value={chips(member.previousMemberIds)} />
          <F label="Login account" value={member.userId ? "Linked" : "None"} />
          <F label="Banned" value={st.banned ? `Yes${st.bannedUntil ? ` until ${fmtDate(st.bannedUntil)}` : ""}${st.banReason ? ` — ${st.banReason}` : ""}` : "No"} />
          <F label="Created" value={fmtDate(member.createdAt)} />
          <F label="Created by" value={member.createdBy} />
          <F label="Last updated" value={fmtDate(member.updatedAt)} />
          <F label="Updated by" value={member.updatedBy} />
        </div>
      </Card>
    </div>
  );
}
