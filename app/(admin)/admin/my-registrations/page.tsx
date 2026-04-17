"use client";

/**
 * /admin/my-registrations
 *
 * Member-facing portal: view own role request history and submit new requests.
 * Accessible to any authenticated user regardless of role.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";
import { Plus, RefreshCw, ChevronDown } from "lucide-react";
import type { RoleRequest, RoleRequestStatus } from "@/types/roleRequests";
import type { EnrichedRoleAssignment } from "@/app/api/member/my-roles/route";

// ── Constants ─────────────────────────────────────────────────────────────────

const REQUESTABLE_ROLES: { value: string; label: string; requiresFee: boolean; scopeTypes: string[] }[] = [
  { value: "player",           label: "Player",                     requiresFee: true,  scopeTypes: ["club"] },
  { value: "member",           label: "Member",                     requiresFee: true,  scopeTypes: ["club"] },
  { value: "umpire",           label: "Umpire / Official",          requiresFee: false, scopeTypes: ["club", "association"] },
  { value: "technical-official", label: "Technical Official",       requiresFee: false, scopeTypes: ["club", "association"] },
  { value: "volunteer",        label: "Volunteer",                  requiresFee: false, scopeTypes: ["club"] },
  { value: "coach",            label: "Coach",                      requiresFee: false, scopeTypes: ["club"] },
  { value: "manager",          label: "Team Manager",               requiresFee: false, scopeTypes: ["club"] },
  { value: "team-selector",    label: "Team Selector",              requiresFee: false, scopeTypes: ["club"] },
  { value: "parent",           label: "Parent / Guardian",          requiresFee: false, scopeTypes: ["club"] },
  { value: "club-committee",   label: "Club Committee Member",      requiresFee: false, scopeTypes: ["club"] },
  { value: "registrar",        label: "Club Registrar",             requiresFee: false, scopeTypes: ["club"] },
  { value: "assoc-committee",  label: "Association Committee",      requiresFee: false, scopeTypes: ["association"] },
  { value: "assoc-coach",      label: "Association Coach",          requiresFee: false, scopeTypes: ["association"] },
  { value: "assoc-selector",   label: "Association Selector",       requiresFee: false, scopeTypes: ["association"] },
];

const STATUS_CONFIG: Record<RoleRequestStatus, { label: string; color: string; bg: string }> = {
  pending_payment:  { label: "Pending Payment",  color: "text-orange-700", bg: "bg-orange-100 border-orange-300" },
  awaiting_approval:{ label: "Awaiting Approval",color: "text-blue-700",   bg: "bg-blue-100 border-blue-300" },
  approved:         { label: "Approved",          color: "text-green-700",  bg: "bg-green-100 border-green-300" },
  rejected:         { label: "Rejected",          color: "text-red-700",    bg: "bg-red-100 border-red-300" },
  withdrawn:        { label: "Withdrawn",         color: "text-gray-600",   bg: "bg-gray-100 border-gray-300" },
};

const CURRENT_SEASON = new Date().getFullYear().toString();

// ── Types ─────────────────────────────────────────────────────────────────────

interface ClubOption { id: string; name: string; shortName?: string }
interface AssocOption { id: string; name: string }

// ── Sub-components ────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: RoleRequestStatus }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, color: "text-gray-600", bg: "bg-gray-100 border-gray-300" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}>
      {cfg.label}
    </span>
  );
}

function RequestCard({ req, onWithdraw }: { req: RoleRequest; onWithdraw: (id: string) => void }) {
  const canWithdraw = ["pending_payment", "awaiting_approval"].includes(req.status);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-bold text-gray-900 text-base">
            {REQUESTABLE_ROLES.find(r => r.value === req.requestedRole)?.label ?? req.requestedRole}
          </h3>
          {req.scopeName && (
            <p className="text-sm text-gray-500 mt-0.5">{req.scopeName}</p>
          )}
          {req.seasonYear && (
            <p className="text-xs text-gray-400 mt-0.5">Season {req.seasonYear}</p>
          )}
        </div>
        <StatusBadge status={req.status} />
      </div>

      {/* Fee status */}
      {req.requiresFee && (
        <div className={`flex items-center gap-2 text-xs px-3 py-2 rounded-lg mb-3 ${req.feePaid ? "bg-green-50 text-green-700" : "bg-orange-50 text-orange-700"}`}>
          <span>{req.feePaid ? "✅ Fee paid" : "💵 Fee payment required"}</span>
          {req.feeWaiver && <span className="ml-auto opacity-75">Fee waived</span>}
        </div>
      )}

      {/* Status-specific guidance */}
      {req.status === "pending_payment" && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mb-3 text-xs text-orange-800">
          <strong>Action needed:</strong> Please pay the registration fee to proceed. Contact your club registrar or pay online if a payment link is available.
        </div>
      )}

      {req.status === "awaiting_approval" && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3 text-xs text-blue-800">
          Your request is in the queue for admin review. You will be notified once a decision is made.
        </div>
      )}

      {req.status === "rejected" && req.reviewNotes && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3 text-xs text-red-800">
          <strong>Reason:</strong> {req.reviewNotes}
        </div>
      )}

      {req.status === "approved" && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-xs text-green-800">
          Role approved and assigned.
          {req.reviewedByName && <span className="ml-1">Approved by {req.reviewedByName}.</span>}
        </div>
      )}

      {req.notes && (
        <p className="text-xs text-gray-500 italic mb-3">"{req.notes}"</p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-400 pt-3 border-t border-gray-100">
        <span>Submitted {new Date(req.requestedAt).toLocaleDateString()}</span>
        {canWithdraw && (
          <button
            onClick={() => onWithdraw(req.requestId)}
            className="text-red-500 hover:text-red-700 font-medium transition-colors"
          >
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}

// ── Submit Request Modal ──────────────────────────────────────────────────────

interface SubmitModalProps {
  memberId: string;
  accountType: "user" | "member";
  onClose: () => void;
  onSuccess: () => void;
  /** Pre-fill for renewal flow */
  initialRole?: string;
  initialScopeType?: "club" | "association";
  initialScopeId?: string;
  initialSeasonYear?: string;
}

function SubmitModal({ memberId, accountType, onClose, onSuccess, initialRole, initialScopeType, initialScopeId, initialSeasonYear }: SubmitModalProps) {
  const [role, setRole] = useState(initialRole ?? "");
  const [scopeType, setScopeType] = useState<"club" | "association">(initialScopeType ?? "club");
  const [scopeId, setScopeId] = useState(initialScopeId ?? "");
  const [seasonYear, setSeasonYear] = useState(initialSeasonYear ?? CURRENT_SEASON);
  const [notes, setNotes] = useState("");
  const [clubs, setClubs] = useState<ClubOption[]>([]);
  const [assocs, setAssocs] = useState<AssocOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingScope, setLoadingScope] = useState(false);

  const selectedRoleDef = REQUESTABLE_ROLES.find(r => r.value === role);

  // When role changes, reset scope (unless this open was prefilled from a pathways deep link / renewal)
  useEffect(() => {
    if (!selectedRoleDef) return;
    const defaultScope = selectedRoleDef.scopeTypes[0] as "club" | "association";
    if (initialRole && role === initialRole && initialScopeId) {
      setScopeType((initialScopeType ?? defaultScope) as "club" | "association");
      setScopeId(initialScopeId);
      return;
    }
    setScopeType(defaultScope);
    setScopeId("");
  }, [role, selectedRoleDef, initialRole, initialScopeId, initialScopeType]);

  // Load clubs or associations when scopeType changes
  useEffect(() => {
    if (!role) return;
    setLoadingScope(true);

    const url = scopeType === "club" ? "/api/admin/clubs" : "/api/admin/associations";
    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (scopeType === "club") {
          const mapped = (data.clubs ?? []).map((c: { id?: string; slug?: string; _id?: string; name: string; shortName?: string }) => ({
            id: c.id ?? c.slug ?? c._id,
            name: c.name,
            shortName: c.shortName,
          }));
          setClubs(mapped);
          if (initialScopeId && initialRole === role) {
            const ok = mapped.some((c: ClubOption) => c.id === initialScopeId);
            setScopeId(ok ? initialScopeId : "");
          } else {
            setScopeId("");
          }
        } else {
          const mapped = (data.associations ?? []).map((a: { associationId?: string; _id?: string; name?: string; fullName?: string }) => ({
            id: a.associationId ?? a._id,
            name: a.fullName ?? a.name,
          }));
          setAssocs(mapped);
          if (initialScopeId && initialRole === role) {
            const ok = mapped.some((a: AssocOption) => a.id === initialScopeId);
            setScopeId(ok ? initialScopeId : "");
          } else {
            setScopeId("");
          }
        }
      })
      .catch(() => {})
      .finally(() => setLoadingScope(false));
  }, [scopeType, role, initialRole, initialScopeId]);

  const handleSubmit = async () => {
    if (!role || !scopeId) {
      toast.error("Please select a role and scope");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/role-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId,
          accountType,
          requestedRole: role,
          scopeType,
          scopeId,
          seasonYear: seasonYear || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Failed to submit request");
        return;
      }

      toast.success(data.message ?? "Request submitted successfully");
      onSuccess();
      onClose();
    } catch {
      toast.error("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Submit Role Request</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        <div className="p-6 space-y-5">
          {/* Role selector */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Role *</label>
            <div className="relative">
              <select
                value={role}
                onChange={e => setRole(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value="">— Select a role —</option>
                {REQUESTABLE_ROLES.map(r => (
                  <option key={r.value} value={r.value}>
                    {r.label}{r.requiresFee ? " (fee required)" : ""}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {role && selectedRoleDef && (
            <>
              {/* Scope type (only show if multiple options) */}
              {selectedRoleDef.scopeTypes.length > 1 && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Scope Type *</label>
                  <div className="flex gap-3">
                    {selectedRoleDef.scopeTypes.map(st => (
                      <button
                        key={st}
                        onClick={() => setScopeType(st as "club" | "association")}
                        className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                          scopeType === st
                            ? "bg-amber-500 text-white border-amber-500"
                            : "bg-white text-gray-700 border-gray-300 hover:border-amber-400"
                        }`}
                      >
                        {st === "club" ? "🏢 Club" : "🏛️ Association"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scope selector */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  {scopeType === "club" ? "Club *" : "Association *"}
                </label>
                {loadingScope ? (
                  <div className="text-sm text-gray-400 py-2">Loading options...</div>
                ) : (
                  <div className="relative">
                    <select
                      value={scopeId}
                      onChange={e => setScopeId(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-amber-400"
                    >
                      <option value="">— Select {scopeType === "club" ? "a club" : "an association"} —</option>
                      {scopeType === "club"
                        ? clubs.map(c => <option key={c.id} value={c.id}>{c.name}{c.shortName ? ` (${c.shortName})` : ""}</option>)
                        : assocs.map(a => <option key={a.id} value={a.id}>{a.name}</option>)
                      }
                    </select>
                    <ChevronDown size={14} className="absolute right-2.5 top-3.5 text-gray-400 pointer-events-none" />
                  </div>
                )}
              </div>

              {/* Season year */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Season Year</label>
                <input
                  type="number"
                  value={seasonYear}
                  onChange={e => setSeasonYear(e.target.value)}
                  min={2020}
                  max={2035}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Any additional information for the approver..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
                />
              </div>

              {/* Fee notice */}
              {selectedRoleDef.requiresFee && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-orange-800">
                  <strong>Registration fee required</strong> — this request will be created in <em>pending payment</em> status. Once your fee is recorded by a registrar, it will move to the approval queue.
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !role || !scopeId}
            className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Request"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

interface RenewalPreFill {
  role: string;
  scopeType: "club" | "association";
  scopeId?: string;
}

export default function MyRegistrationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const pathwayOnce = useRef(false);
  const [requests, setRequests] = useState<RoleRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSubmit, setShowSubmit] = useState(false);
  const [renewalPreFill, setRenewalPreFill] = useState<RenewalPreFill | null>(null);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [expiringSoon, setExpiringSoon] = useState<EnrichedRoleAssignment[]>([]);
  const [expiredRoles, setExpiredRoles] = useState<EnrichedRoleAssignment[]>([]);

  const memberId = user?.memberId ?? user?.userId ?? "";
  const accountType: "user" | "member" = user?.memberId ? "member" : "user";

  useEffect(() => {
    if (pathwayOnce.current || !memberId || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const role = params.get("role");
    if (!role || !REQUESTABLE_ROLES.some((r) => r.value === role)) return;
    const clubId = params.get("clubId")?.trim() || undefined;
    const associationId = params.get("associationId")?.trim() || undefined;
    const def = REQUESTABLE_ROLES.find((r) => r.value === role);
    if (!def) return;
    let scopeType: "club" | "association" = def.scopeTypes[0] as "club" | "association";
    let scopeId: string | undefined;
    if (clubId && def.scopeTypes.includes("club")) {
      scopeType = "club";
      scopeId = clubId;
    } else if (associationId && def.scopeTypes.includes("association")) {
      scopeType = "association";
      scopeId = associationId;
    }
    pathwayOnce.current = true;
    setRenewalPreFill({ role, scopeType, scopeId });
    setShowSubmit(true);
    router.replace("/admin/my-registrations", { scroll: false });
  }, [memberId, router]);

  const load = useCallback(async () => {
    if (!memberId) return;
    setLoading(true);
    try {
      const [reqRes, rolesRes] = await Promise.all([
        fetch(`/api/role-requests?memberId=${encodeURIComponent(memberId)}`),
        fetch("/api/member/my-roles"),
      ]);
      const reqData = await reqRes.json();
      if (reqRes.ok) setRequests(reqData.requests ?? []);
      if (rolesRes.ok) {
        const rolesData = await rolesRes.json();
        setExpiringSoon(rolesData.expiringSoon ?? []);
        setExpiredRoles(rolesData.expired ?? []);
      }
    } catch {
      toast.error("Failed to load requests");
    } finally {
      setLoading(false);
    }
  }, [memberId]);

  useEffect(() => { load(); }, [load]);

  function openRenewal(r: EnrichedRoleAssignment) {
    setRenewalPreFill({
      role: r.role,
      scopeType: (r.scopeType === "club" || r.scopeType === "association") ? r.scopeType : "club",
      scopeId: r.scopeId,
    });
    setShowSubmit(true);
  }

  const handleWithdraw = async (requestId: string) => {
    if (!confirm("Withdraw this request? This cannot be undone.")) return;
    try {
      const res = await fetch(`/api/admin/role-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Request withdrawn");
        load();
      } else {
        toast.error(data.error ?? "Failed to withdraw");
      }
    } catch {
      toast.error("Network error");
    }
  };

  const activeRequests = requests.filter(r => ["pending_payment", "awaiting_approval"].includes(r.status));
  const historyRequests = requests.filter(r => ["approved", "rejected", "withdrawn"].includes(r.status));
  const displayRequests = activeTab === "active" ? activeRequests : historyRequests;

  const pendingCount = requests.filter(r => r.status === "pending_payment").length;
  const awaitingCount = requests.filter(r => r.status === "awaiting_approval").length;
  const approvedCount = requests.filter(r => r.status === "approved").length;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black mb-1">My Registrations</h1>
            <p className="text-amber-100 text-sm">Submit and track your role registration requests</p>
          </div>
          <button
            onClick={() => setShowSubmit(true)}
            className="flex items-center gap-2 bg-white text-amber-700 hover:bg-amber-50 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors shadow flex-shrink-0"
          >
            <Plus size={16} />
            New Request
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { label: "Pending Payment", value: pendingCount, color: "bg-orange-400/30" },
            { label: "Awaiting Approval", value: awaitingCount, color: "bg-blue-400/30" },
            { label: "Approved", value: approvedCount, color: "bg-green-400/30" },
          ].map(s => (
            <div key={s.label} className={`${s.color} rounded-xl p-3 text-center`}>
              <div className="text-2xl font-black">{s.value}</div>
              <div className="text-xs text-amber-100 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Renewal banners */}
      {expiredRoles.length > 0 && (
        <div className="space-y-2 mb-5">
          {expiredRoles.map((r, i) => (
            <div key={`expired-${i}`} className="flex items-center justify-between gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-red-500 text-lg">⚠️</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-red-800 truncate">
                    {REQUESTABLE_ROLES.find(x => x.value === r.role)?.label ?? r.role}
                    {r.scopeName && <span className="font-normal"> at {r.scopeName}</span>}
                  </p>
                  <p className="text-xs text-red-600">
                    Expired {Math.abs(r.daysUntilExpiry ?? 0)} day{Math.abs(r.daysUntilExpiry ?? 0) !== 1 ? "s" : ""} ago
                    {r.seasonYear && ` (${r.seasonYear} season)`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => openRenewal(r)}
                className="shrink-0 text-xs font-bold bg-red-600 text-white px-3 py-1.5 rounded-lg hover:bg-red-700 transition"
              >
                Renew
              </button>
            </div>
          ))}
        </div>
      )}

      {expiringSoon.length > 0 && (
        <div className="space-y-2 mb-5">
          {expiringSoon.map((r, i) => (
            <div key={`expiring-${i}`} className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-amber-500 text-lg">🕐</span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-amber-800 truncate">
                    {REQUESTABLE_ROLES.find(x => x.value === r.role)?.label ?? r.role}
                    {r.scopeName && <span className="font-normal"> at {r.scopeName}</span>}
                  </p>
                  <p className="text-xs text-amber-600">
                    Expires in {r.daysUntilExpiry} day{r.daysUntilExpiry !== 1 ? "s" : ""}
                    {r.expiresAt && ` — ${new Date(r.expiresAt).toLocaleDateString("en-AU")}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => openRenewal(r)}
                className="shrink-0 text-xs font-bold bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 transition"
              >
                Renew Early
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Refresh */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
          {(["active", "history"] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                activeTab === tab ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {tab === "active" ? `Active (${activeRequests.length})` : `History (${historyRequests.length})`}
            </button>
          ))}
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3">⏳</div>
          <p>Loading your requests...</p>
        </div>
      ) : displayRequests.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-2xl border border-gray-200">
          <div className="text-5xl mb-4">{activeTab === "active" ? "📋" : "📜"}</div>
          <h3 className="text-gray-600 font-semibold mb-2">
            {activeTab === "active" ? "No active requests" : "No request history"}
          </h3>
          <p className="text-sm mb-5">
            {activeTab === "active"
              ? "Submit a new role request to get started with your club registration."
              : "Approved, rejected, and withdrawn requests will appear here."}
          </p>
          {activeTab === "active" && (
            <button
              onClick={() => setShowSubmit(true)}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-colors"
            >
              <Plus size={16} />
              Submit a Request
            </button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {displayRequests.map(req => (
            <RequestCard key={req.requestId} req={req} onWithdraw={handleWithdraw} />
          ))}
        </div>
      )}

      {/* Submit modal */}
      {showSubmit && memberId && (
        <SubmitModal
          memberId={memberId}
          accountType={accountType}
          onClose={() => { setShowSubmit(false); setRenewalPreFill(null); }}
          onSuccess={() => { load(); setRenewalPreFill(null); }}
          initialRole={renewalPreFill?.role}
          initialScopeType={renewalPreFill?.scopeType}
          initialScopeId={renewalPreFill?.scopeId}
          initialSeasonYear={CURRENT_SEASON}
        />
      )}
    </div>
  );
}
