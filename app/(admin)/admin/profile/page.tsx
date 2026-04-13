import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  User,
  Mail,
  Building2,
  Shield,
  IdCard,
  ChevronRight,
  AlertCircle,
  HeartPulse,
  ClipboardList,
  BarChart3,
} from "lucide-react";
import { getSession } from "@/lib/auth/session";
import { getDatabase } from "@/lib/mongodb";
import {
  ROLE_DEFINITIONS,
  type RoleAssignment,
  type UserRole,
} from "@/lib/types/roles";
import {
  listCoachAnalyticsForMemberCoach,
  listCoachAnalyticsForStaff,
  listPlayingHistoryForMember,
  summarizeCoachAnalytics,
  summarizePlayingHistory,
} from "@/lib/stats/memberStatsService";
import type { CoachTeamAnalyticsRow } from "@/types/memberStats";

const COACH_LIKE_ROLES = new Set([
  "coach",
  "manager",
  "assoc-coach",
  "team-selector",
]);

export const metadata = {
  title: "My profile | Admin",
};

function roleLabel(role: string): string {
  const d = ROLE_DEFINITIONS[role as UserRole];
  return d?.label ?? role;
}

function hasMeaningfulData(value: unknown): boolean {
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return true;
}

function DataBlock({
  title,
  icon: Icon,
  headerClass,
  data,
}: {
  title: string;
  icon: LucideIcon;
  headerClass: string;
  data: unknown;
}) {
  if (!hasMeaningfulData(data)) return null;
  return (
    <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      <div
        className={`px-6 py-4 flex items-center gap-3 border-b border-slate-100 ${headerClass}`}
      >
        <Icon className="w-5 h-5 text-white" />
        <h2 className="font-black text-white uppercase text-sm tracking-wide">{title}</h2>
      </div>
      <div className="p-6">
        <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words bg-slate-50 rounded-xl p-4 border border-slate-100 max-h-80 overflow-auto">
          {JSON.stringify(data, null, 2)}
        </pre>
      </div>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div>
      <p className="text-xs font-black uppercase text-slate-400 mb-0.5">{label}</p>
      <div className="text-slate-800 font-semibold">
        {value ?? <span className="text-slate-300">—</span>}
      </div>
    </div>
  );
}

export default async function AdminProfilePage() {
  const session = await getSession();
  if (!session?.userId) {
    redirect("/admin/login?callbackUrl=/admin/profile");
  }

  const db = await getDatabase();
  const user = await db.collection("users").findOne(
    {
      $or: [{ userId: session.userId }, { username: session.username ?? "" }],
    },
    { projection: { passwordHash: 0 } },
  );

  let member: Record<string, unknown> | null = null;
  if (session.memberId) {
    member = (await db
      .collection("members")
      .findOne({ memberId: session.memberId })) as Record<string, unknown> | null;
  }
  if (!member && user?.linkedMembers && Array.isArray(user.linkedMembers)) {
    const first = user.linkedMembers[0] as string | { memberId?: string };
    const mid =
      typeof first === "string" ? first : first?.memberId;
    if (mid) {
      member = (await db
        .collection("members")
        .findOne({ memberId: mid })) as Record<string, unknown> | null;
    }
  }

  const userRoles = (user?.roles as RoleAssignment[] | undefined)?.filter(
    (r) => r.active !== false,
  );
  const memberRoles = (member?.roles as RoleAssignment[] | undefined)?.filter(
    (r) => r.active !== false,
  );

  const pi = member?.personalInfo as Record<string, string> | undefined;
  const contact = member?.contact as Record<string, string> | undefined;

  return (
    <div className="p-6 lg:p-10 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-black text-[#06054e] tracking-tight">My profile</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">
          Account details, roles by organisation, and member data when linked. Sections appear only
          when data exists. Admin URLs stay on your portal host (e.g.{" "}
          <span className="font-mono text-slate-600">bha.localhost:3000</span>); set{" "}
          <span className="font-mono">SESSION_COOKIE_DOMAIN=.localhost</span> in dev so the session
          is shared across subdomains.
        </p>
      </div>

      {!user && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm font-medium">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p>
            No matching user row was found in the database for this session. Showing session
            fields only — re-run account setup or contact support if this persists.
          </p>
        </div>
      )}

      {/* Active session (persona) */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100 bg-gradient-to-r from-[#06054e] to-indigo-800">
          <Shield className="w-5 h-5 text-white" />
          <h2 className="font-black text-white uppercase text-sm tracking-wide">
            Active session
          </h2>
        </div>
        <div className="p-6 grid sm:grid-cols-2 gap-6">
          <Field label="Primary role (persona)" value={roleLabel(session.role)} />
          <Field label="User ID" value={session.userId} />
          <Field label="Username" value={session.username || "—"} />
          <Field label="Email" value={session.email} />
          <Field label="Association" value={session.associationId || "—"} />
          <Field label="Association level" value={session.associationLevel || "—"} />
          <Field label="Club" value={session.clubName || session.clubId || "—"} />
          <Field label="Club slug" value={session.clubSlug || "—"} />
          <Field label="Linked member ID" value={session.memberId || "—"} />
          <Field
            label="Portal host slug"
            value={session.portalSubdomain || "— (apex / super-admin)"}
          />
        </div>
      </section>

      {/* Staff account */}
      {user && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100 bg-slate-800">
            <IdCard className="w-5 h-5 text-white" />
            <h2 className="font-black text-white uppercase text-sm tracking-wide">
              Staff account
            </h2>
          </div>
          <div className="p-6 grid sm:grid-cols-2 gap-6">
            <Field label="Name" value={`${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.name} />
            <Field label="Username" value={user.username} />
            <Field label="Email" value={user.email} />
            <Field label="Status" value={user.status} />
            <Field
              label="Stored primary role"
              value={user.role ? roleLabel(String(user.role)) : "—"}
            />
            <Field label="User ID" value={user.userId} />
            {hasMeaningfulData(user.assignedTeams) && (
              <div className="sm:col-span-2">
                <p className="text-xs font-black uppercase text-slate-400 mb-2">
                  Assigned teams (coaching / staff)
                </p>
                <pre className="text-xs font-mono bg-slate-50 rounded-xl p-3 border border-slate-100 overflow-x-auto">
                  {JSON.stringify(user.assignedTeams, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Roles from users collection */}
      {user && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100 bg-indigo-900">
            <Shield className="w-5 h-5 text-white" />
            <h2 className="font-black text-white uppercase text-sm tracking-wide">
              Role assignments (account)
            </h2>
          </div>
          <div className="p-6">
            {!userRoles?.length ? (
              <p className="text-slate-500 text-sm font-medium">No roles stored on this user.</p>
            ) : (
              <ul className="space-y-3">
                {userRoles.map((r, i) => (
                  <li
                    key={`${r.role}-${r.scopeType}-${r.scopeId ?? ""}-${i}`}
                    className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 text-sm"
                  >
                    <p className="font-black text-[#06054e]">{roleLabel(r.role)}</p>
                    <p className="text-slate-600 mt-1 font-medium">
                      Scope: {r.scopeType}
                      {r.scopeId ? ` · ${r.scopeId}` : ""}
                      {r.scopeName ? ` (${r.scopeName})` : ""}
                    </p>
                    {r.seasonYear && (
                      <p className="text-xs text-slate-400 mt-1">Season {r.seasonYear}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* Member record */}
      {member && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center justify-between border-b border-slate-100 bg-emerald-900">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-white" />
              <h2 className="font-black text-white uppercase text-sm tracking-wide">
                Member record
              </h2>
            </div>
            <Link
              href={`/admin/members/${encodeURIComponent(String(member.memberId ?? session.memberId))}`}
              className="text-xs font-black uppercase text-white/90 hover:text-white flex items-center gap-1"
            >
              Open in admin <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-6 grid sm:grid-cols-2 gap-6">
            <Field label="Member ID" value={String(member.memberId ?? "")} />
            <Field
              label="Name"
              value={
                [pi?.firstName, pi?.lastName].filter(Boolean).join(" ") ||
                pi?.displayName ||
                "—"
              }
            />
            <Field label="Email" value={contact?.primaryEmail} />
            <Field label="Phone" value={contact?.primaryPhone} />
            <Field label="Club (member)" value={String(member.clubId ?? "—")} />
            <Field label="Membership status" value={String((member.membership as { status?: string })?.status ?? "—")} />
          </div>
          {!!memberRoles?.length && (
            <div className="px-6 pb-6">
              <p className="text-xs font-black uppercase text-slate-400 mb-2">
                Roles on member
              </p>
              <ul className="space-y-2">
                {memberRoles.map((r, i) => (
                  <li
                    key={`m-${r.role}-${r.scopeType}-${r.scopeId ?? ""}-${i}`}
                    className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700"
                  >
                    {roleLabel(r.role)} — {r.scopeType}
                    {r.scopeId ? ` · ${r.scopeId}` : ""}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {historyMemberId && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100 bg-sky-900">
            <BarChart3 className="w-5 h-5 text-white" />
            <h2 className="font-black text-white uppercase text-sm tracking-wide">
              Playing history (deep stats)
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-500 font-semibold">
              Source collection <span className="font-mono">member_playing_history</span>. API:{" "}
              <span className="font-mono">GET /api/member/stats/playing-history</span>
            </p>
            {playingSummary && playingSummary.totalEvents > 0 ? (
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words bg-slate-50 rounded-xl p-4 border border-slate-100 max-h-96 overflow-auto">
                {JSON.stringify(playingSummary, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-slate-600 font-medium">
                No playing-history events recorded yet for this member.
              </p>
            )}
          </div>
        </section>
      )}

      {isCoachLike && (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100 bg-amber-900">
            <BarChart3 className="w-5 h-5 text-white" />
            <h2 className="font-black text-white uppercase text-sm tracking-wide">
              Coach analytics (deep stats)
            </h2>
          </div>
          <div className="p-6 space-y-4">
            <p className="text-xs text-slate-500 font-semibold">
              Source collection <span className="font-mono">coach_team_analytics</span>. API:{" "}
              <span className="font-mono">GET /api/member/stats/coach-analytics</span>
            </p>
            {coachAnalyticsBlock && coachAnalyticsBlock.rows.length > 0 ? (
              <pre className="text-xs font-mono text-slate-700 whitespace-pre-wrap break-words bg-slate-50 rounded-xl p-4 border border-slate-100 max-h-96 overflow-auto">
                {JSON.stringify(coachAnalyticsBlock, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-slate-600 font-medium">
                No coach analytics rows yet (season rollups). Admins can POST to{" "}
                <span className="font-mono">/api/admin/coach-analytics</span>.
              </p>
            )}
          </div>
        </section>
      )}

      {member && (
        <>
          <DataBlock
            title="Medical"
            icon={HeartPulse}
            headerClass="bg-rose-800"
            data={member.medicalInfo}
          />
          <DataBlock
            title="Emergency contact"
            icon={HeartPulse}
            headerClass="bg-red-900"
            data={member.emergencyContact}
          />
          <DataBlock
            title="Address"
            icon={Building2}
            headerClass="bg-slate-700"
            data={member.address}
          />
          <DataBlock
            title="Club registrations"
            icon={ClipboardList}
            headerClass="bg-teal-900"
            data={member.clubRegistrations}
          />
          <DataBlock
            title="Association registrations"
            icon={ClipboardList}
            headerClass="bg-cyan-900"
            data={member.associationRegistrations}
          />
          <DataBlock
            title="Injury history"
            icon={HeartPulse}
            headerClass="bg-orange-900"
            data={member.injuryHistory}
          />
          <DataBlock
            title="Player / performance notes"
            icon={BarChart3}
            headerClass="bg-violet-900"
            data={
              (member as { playerProfile?: unknown }).playerProfile ??
              (member as { statistics?: unknown }).statistics
            }
          />
        </>
      )}

      <div className="flex flex-wrap gap-4">
        <Link
          href="/change-password"
          className="inline-flex items-center gap-2 rounded-xl bg-[#06054e] text-white px-5 py-2.5 text-sm font-black hover:opacity-95"
        >
          <Mail className="w-4 h-4" />
          Change password
        </Link>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
        >
          <Building2 className="w-4 h-4" />
          Dashboard
        </Link>
      </div>
    </div>
  );
}
