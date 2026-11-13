"use client";
// Read-only cards for everything stored on a member beyond the editable core sections.
// Used on the member profile and at the bottom of the edit screen.

import type { ReactNode } from "react";
import PlayerDetails from "@/components/admin/members/PlayerDetails";
import type { TeamHistoryRow } from "@/lib/members/teamHistory";
import { hasPlayerHistory, type PlayerStats } from "@/lib/members/playerStats";

export interface MemberRelated {
  memberNames?: Record<string, string>;
  clubNames?: Record<string, string>;
  associationNames?: Record<string, string>;
  clubRegistrations?: Record<string, any>[];
  associationRegistrations?: Record<string, any>[];
}

const pretty = (v: unknown) =>
  String(v ?? "")
    .replace(/^(role|gender|provider)-/, "")
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const fmtDate = (d: unknown) => {
  if (!d) return "—";
  const t = new Date(String(d));
  return Number.isNaN(t.getTime())
    ? String(d)
    : t.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

function Card({
  title,
  tint,
  children,
}: {
  title: string;
  tint: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div className={`px-6 py-3 border-b border-slate-100 ${tint}`}>
        <h3 className="font-black text-white uppercase text-sm tracking-wide">
          {title}
        </h3>
      </div>
      <div className="p-6 space-y-3">{children}</div>
    </div>
  );
}

function F({ label, value }: { label: string; value?: ReactNode }) {
  const empty =
    value === undefined ||
    value === null ||
    value === "" ||
    (Array.isArray(value) && value.length === 0);
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">
        {label}
      </p>
      <p className="text-slate-800 font-semibold break-words">
        {empty ? <span className="text-slate-300">—</span> : value}
      </p>
    </div>
  );
}

function VisBadge({ on }: { on: boolean }) {
  return (
    <span
      className={`ml-1 rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${on ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}
    >
      {on ? "Public" : "Private"}
    </span>
  );
}

const chips = (
  items: unknown[] | undefined,
  fmt: (v: any) => string = String,
) =>
  items && items.length ? (
    <span className="flex flex-wrap gap-1.5">
      {items.map((i, n) => (
        <span
          key={n}
          className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 rounded-full text-xs font-bold text-slate-700"
        >
          {fmt(i)}
        </span>
      ))}
    </span>
  ) : undefined;

export default function MemberRecordDetails({
  member,
  related,
  playerStats,
  hidePlayerDetails,
  registrationsOnly,
  teamHistory,
  hideSocial,
}: {
  member: any;
  related?: MemberRelated;
  playerStats?: PlayerStats | null;
  hidePlayerDetails?: boolean;
  registrationsOnly?: boolean;
  teamHistory?: TeamHistoryRow[];
  hideSocial?: boolean;
}) {
  const clubId: string = member.membership?.clubId || member.clubId || "";
  const clubName =
    member.membership?.clubName || related?.clubNames?.[clubId] || clubId;
  const plr = member.playerInfo || {};
  const off = member.officiating || {};
  const staff = member.staffInfo || {};
  const teams: any[] = member.teams || [];
  const social = {
    ...(member.socialMedia || {}),
    ...Object.fromEntries(
      (Array.isArray(member.personalInfo?.socialMedia)
        ? member.personalInfo.socialMedia
        : []
      ).map((s: any) => [s.platform || s.type, s.handle || s.url]),
    ),
  };
  const comm = member.communicationPreferences || {};
  const st = member.status || {};
  const cRegs = related?.clubRegistrations ?? [];
  const aRegs = related?.associationRegistrations ?? [];

  // One row per registration year (club and association), with the roles held that year.
  const rolesByYear = new Map<string, string[]>();
  for (const h of teamHistory ?? []) {
    const cur = rolesByYear.get(h.year) ?? [];
    for (const r of h.roles) if (!cur.includes(r)) cur.push(r);
    rolesByYear.set(h.year, cur);
  }
  const regRows: any[] = [
    ...cRegs.map((r) => ({
      ...r,
      kind: "Club",
      org: related?.clubNames?.[r.clubId] || r.clubId,
    })),
    ...aRegs.map((r) => ({
      ...r,
      kind: "Association",
      org: related?.associationNames?.[r.associationId] || r.associationId,
    })),
  ].sort(
    (a: any, b: any) =>
      String(b.seasonYear).localeCompare(String(a.seasonYear)) ||
      a.kind.localeCompare(b.kind),
  );
  const regRoles = (r: any): string[] =>
    Array.isArray(r.roles) && r.roles.length
      ? r.roles.map((x: string) => pretty(x))
      : (rolesByYear.get(String(r.seasonYear)) ?? []);

  const relatedName = (id: string) => related?.memberNames?.[id] || id;
  const family: { id: string; name: string; relationship: string }[] = [
    ...(member.familyRelationships || []).map((f: any) => {
      const id = f.memberId || f.relatedMemberId || "";
      return {
        id,
        name: f.name || (id ? relatedName(id) : ""),
        relationship: f.relationship || f.type || "",
      };
    }),
    ...(member.personalInfo?.relatedMembers || []).map((r: any) => {
      const id = typeof r === "string" ? r : r.memberId || "";
      return {
        id,
        name: relatedName(id),
        relationship:
          typeof r === "string" ? "" : r.relationship || r.type || "",
      };
    }),
  ].filter(
    (f, i, all) =>
      (f.id || f.name) &&
      all.findIndex((x) => (x.id || x.name) === (f.id || f.name)) === i,
  );
  const emergency: any[] =
    Array.isArray(member.emergencyContacts) && member.emergencyContacts.length
      ? member.emergencyContacts
      : member.contact?.emergencyContact?.name
        ? [member.contact.emergencyContact]
        : [];
  const vis = (group: string, key: string) =>
    member.privacy?.[group]?.[key] === true;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(!registrationsOnly || regRows.length > 0) && (
        <Card
          title={registrationsOnly ? "Registrations" : "Club & Registrations"}
          tint="bg-gradient-to-r from-green-600 to-green-700"
        >
          {!registrationsOnly && (
            <>
              <F label="Home club" value={clubName} />
              <F label="Club id" value={clubId} />
              <F
                label="Association"
                value={
                  member.associationId
                    ? related?.associationNames?.[member.associationId] ||
                      member.associationId
                    : undefined
                }
              />
              <F
                label="Membership types"
                value={chips(member.membership?.membershipTypes, pretty)}
              />
            </>
          )}
          <div
            className={
              !registrationsOnly ? "pt-2 border-t border-slate-100" : ""
            }
          >
            <p className="text-xs font-black uppercase text-slate-400 mb-2">
              Registration history
            </p>
            {regRows.length === 0 ? (
              <p className="text-slate-400 text-sm italic">
                No registrations recorded.
              </p>
            ) : (
              <div className="space-y-2">
                {regRows.map((r, i) => {
                  const roles = regRoles(r);
                  return (
                    <div
                      key={r.registrationId || i}
                      className="text-sm text-slate-700"
                    >
                      <p>
                        <b>{r.seasonYear}</b> · {r.org}{" "}
                        <span className="text-slate-400">({r.kind})</span> ·{" "}
                        {pretty(r.status)}
                        {r.ageCategory ? ` · ${pretty(r.ageCategory)}` : ""}
                      </p>
                      {roles.length > 0 && (
                        <div className="mt-1">{chips(roles)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      <Card title="Teams" tint="bg-gradient-to-r from-sky-600 to-sky-700">
        {teamHistory && teamHistory.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-black uppercase text-slate-400">
                  <th className="pb-2 pr-3">Year</th>
                  <th className="pb-2 pr-3">Team</th>
                  <th className="pb-2 pr-3">Role(s)</th>
                  <th className="pb-2 text-right">Goals</th>
                </tr>
              </thead>
              <tbody>
                {teamHistory.map((h, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="py-2 pr-3 font-black text-slate-900">
                      {h.year}
                    </td>
                    <td className="py-2 pr-3 font-semibold text-slate-800">
                      {h.team}
                      {h.games > 0 && (
                        <span className="block text-xs font-normal text-slate-400">
                          {h.games} game{h.games === 1 ? "" : "s"}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">{chips(h.roles)}</td>
                    <td className="py-2 text-right font-black tabular-nums">
                      {h.games > 0 ? h.goals : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : teams.length === 0 ? (
          <p className="text-slate-400 text-sm italic">
            Not assigned to a team.
          </p>
        ) : (
          teams.map((t, i) => (
            <p key={i} className="text-sm text-slate-800 font-semibold">
              {t.teamName || t.name || t.teamId || "Team"}
              <span className="text-slate-500 font-normal">
                {[
                  t.season || t.seasonYear,
                  t.role && pretty(t.role),
                  t.division,
                ]
                  .filter(Boolean)
                  .map((x) => ` · ${x}`)
                  .join("")}
              </span>
            </p>
          ))
        )}
      </Card>

      {!hidePlayerDetails && hasPlayerHistory(member, playerStats) && (
        <Card
          title="Player Details"
          tint="bg-gradient-to-r from-orange-500 to-orange-600"
        >
          <PlayerDetails playerInfo={plr} stats={playerStats} />
        </Card>
      )}

      {off.roles?.length ||
      off.matchOfficialIds?.length ||
      staff.teams?.length ? (
        <Card
          title="Officiating & Staff"
          tint="bg-gradient-to-r from-purple-600 to-purple-700"
        >
          <F label="Officiating roles" value={chips(off.roles)} />
          <F label="Match official ids" value={chips(off.matchOfficialIds)} />
          <F label="Staff of teams" value={chips(staff.teams)} />
        </Card>
      ) : null}

      {!hideSocial && (
        <Card
          title="Social & Preferences"
          tint="bg-gradient-to-r from-pink-600 to-pink-700"
        >
          <div className="grid grid-cols-2 gap-4">
            {Object.entries(social).map(([k, v]) => (
              <F
                key={k}
                label={pretty(k)}
                value={
                  <>
                    {String(v || "")} <VisBadge on={vis("socialMedia", k)} />
                  </>
                }
              />
            ))}
            <F
              label="Preferred contact"
              value={
                comm.preferredMethod && (
                  <>
                    {comm.preferredMethod}{" "}
                    <VisBadge
                      on={vis("communicationPreferences", "preferredMethod")}
                    />
                  </>
                )
              }
            />
            <F
              label="Email frequency"
              value={
                comm.emailFrequency && (
                  <>
                    {comm.emailFrequency}{" "}
                    <VisBadge
                      on={vis("communicationPreferences", "emailFrequency")}
                    />
                  </>
                )
              }
            />
            <F
              label="SMS notifications"
              value={
                comm.smsNotifications === undefined
                  ? undefined
                  : comm.smsNotifications
                    ? "Yes"
                    : "No"
              }
            />
            <F
              label="Push notifications"
              value={
                comm.pushNotifications === undefined
                  ? undefined
                  : comm.pushNotifications
                    ? "Yes"
                    : "No"
              }
            />
          </div>
          {(member.contact?.additionalEmails?.length ?? 0) > 0 && (
            <F
              label="Additional emails"
              value={chips(member.contact.additionalEmails, (e) =>
                typeof e === "string" ? e : e.email,
              )}
            />
          )}
        </Card>
      )}

      <Card
        title="Family & Emergency Contacts"
        tint="bg-gradient-to-r from-teal-600 to-teal-700"
      >
        <div>
          <p className="text-xs font-black uppercase text-slate-400 mb-1">
            Related members
          </p>
          {family.length === 0 ? (
            <p className="text-slate-400 text-sm italic">
              No related members recorded.
            </p>
          ) : (
            family.map((f, i) => (
              <p key={i} className="text-sm font-semibold text-slate-800">
                {f.id ? (
                  <a
                    href={`/admin/members/${encodeURIComponent(f.id)}`}
                    className="text-blue-700 hover:underline"
                  >
                    {f.name || f.id}
                  </a>
                ) : (
                  f.name
                )}
                {f.relationship && (
                  <span className="text-slate-500 font-normal">
                    {" "}
                    · {pretty(f.relationship)}
                  </span>
                )}
              </p>
            ))
          )}
        </div>
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-black uppercase text-slate-400 mb-1">
            Emergency contacts
          </p>
          {emergency.length === 0 ? (
            <p className="text-slate-400 text-sm italic">
              No emergency contacts recorded.
            </p>
          ) : (
            emergency.map((c, i) => {
              const linked = c.linkedMemberId || c.memberId;
              return (
                <div key={i} className="mb-2 text-sm">
                  <p className="font-semibold text-slate-800">
                    {c.name || "(unnamed)"}
                    {c.relationship && (
                      <span className="text-slate-500 font-normal">
                        {" "}
                        · {pretty(c.relationship)}
                      </span>
                    )}
                    {linked ? (
                      <a
                        href={`/admin/members/${encodeURIComponent(linked)}`}
                        className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-black text-teal-800"
                      >
                        Member
                      </a>
                    ) : (
                      <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-500">
                        Not a member
                      </span>
                    )}
                  </p>
                  <p className="text-slate-600">
                    {[c.phone || c.mobile, c.email]
                      .filter(Boolean)
                      .join(" · ") || "—"}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card
        title="Account & Record"
        tint="bg-gradient-to-r from-slate-600 to-slate-700"
      >
        <div className="grid grid-cols-2 gap-4">
          <F label="Member id" value={member.memberId} />
          <F label="Previous ids" value={chips(member.previousMemberIds)} />
          <F label="Login account" value={member.userId ? "Linked" : "None"} />
          <F
            label="Banned"
            value={
              st.banned
                ? `Yes${st.bannedUntil ? ` until ${fmtDate(st.bannedUntil)}` : ""}${st.banReason ? ` — ${st.banReason}` : ""}`
                : "No"
            }
          />
          <F label="Created" value={fmtDate(member.createdAt)} />
          <F label="Created by" value={member.createdBy} />
          <F label="Last updated" value={fmtDate(member.updatedAt)} />
          <F label="Updated by" value={member.updatedBy} />
        </div>
      </Card>
    </div>
  );
}
