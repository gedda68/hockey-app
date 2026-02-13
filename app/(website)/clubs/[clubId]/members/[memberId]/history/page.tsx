// app/(website)/clubs/[clubId]/members/[memberId]/history/page.tsx
// Member change history / audit log viewer

"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  User,
  Edit,
  Trash2,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import MemberHeader from "@/components/member-sections/MemberHeader";

interface AuditLogEntry {
  auditId: string;
  timestamp: string;
  userId: string;
  userName?: string;
  memberId: string;
  clubId: string;
  action: "create" | "update" | "delete" | "renew" | "status_change";
  changes?: {
    field: string;
    oldValue: any;
    newValue: any;
  }[];
  metadata?: any;
}

interface MemberHistoryPageProps {
  params: Promise<{
    clubId: string;
    memberId: string;
  }>;
}

export default function MemberHistoryPage({ params }: MemberHistoryPageProps) {
  const { clubId, memberId } = use(params);
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [member, setMember] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchMember();
    fetchAuditLogs();
  }, [clubId, memberId, filter]);

  const fetchMember = async () => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/members/${memberId}`);
      if (res.ok) {
        const data = await res.json();
        setMember(data);
      }
    } catch (err) {
      console.error("Error fetching member:", err);
    }
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      const url =
        filter === "all"
          ? `/api/clubs/${clubId}/members/${memberId}/audit`
          : `/api/clubs/${clubId}/members/${memberId}/audit?action=${filter}`;

      const res = await fetch(url);

      if (!res.ok) {
        throw new Error("Failed to fetch audit logs");
      }

      const data = await res.json();

      // API returns { logs: [...], total: X }
      setLogs(data.logs || []);
    } catch (err: any) {
      console.error("Error fetching audit logs:", err);
      setError(err.message);
      setLogs([]); // Set empty array on error
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString("en-AU", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <User className="w-5 h-5" />;
      case "update":
        return <Edit className="w-5 h-5" />;
      case "delete":
        return <Trash2 className="w-5 h-5" />;
      case "renew":
        return <RotateCcw className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case "create":
        return "bg-green-100 text-green-700";
      case "update":
        return "bg-blue-100 text-blue-700";
      case "delete":
        return "bg-red-100 text-red-700";
      case "renew":
        return "bg-purple-100 text-purple-700";
      case "status_change":
        return "bg-orange-100 text-orange-700";
      default:
        return "bg-slate-100 text-slate-700";
    }
  };

  const formatValue = (value: any): string => {
    if (value === null || value === undefined) return "N/A";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (typeof value === "object") return JSON.stringify(value);
    return String(value);
  };

  const getFieldLabel = (field: string): string => {
    const labels: Record<string, string> = {
      "personalInfo.firstName": "First Name",
      "personalInfo.lastName": "Last Name",
      "personalInfo.displayName": "Display Name",
      "personalInfo.dateOfBirth": "Date of Birth",
      "personalInfo.gender": "Gender",
      "contact.primaryEmail": "Email",
      "contact.phone": "Phone",
      "contact.mobile": "Mobile",
      "address.street": "Street",
      "address.suburb": "Suburb",
      "address.state": "State",
      "address.postcode": "Postcode",
      "membership.status": "Membership Status",
      "membership.membershipType": "Membership Type",
      "membership.currentPeriodStart": "Period Start",
      "membership.currentPeriodEnd": "Period End",
    };
    return labels[field] || field;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold">Loading history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Link */}
        <Link
          href={`/clubs/${clubId}/members/${memberId}`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-[#06054e] font-bold mb-6 transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Member
        </Link>

        {/* Member Header */}
        {member && (
          <MemberHeader
            clubId={clubId}
            memberId={memberId}
            member={member}
            currentPage="history"
            showActions={{
              deactivate: false,
              edit: true,
              renew: true,
              history: false, // Don't show history button on history page
              delete: false,
            }}
          />
        )}

        {/* Change History Section */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-[#06054e]">
                  Change History
                </h2>
                <p className="text-slate-500 font-bold">
                  All changes and updates
                </p>
              </div>
            </div>

            {/* Filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 py-2 border-2 border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Actions</option>
              <option value="create">Created</option>
              <option value="update">Updates</option>
              <option value="renew">Renewals</option>
              <option value="status_change">Status Changes</option>
              <option value="delete">Deletions</option>
            </select>
          </div>

          {/* Error */}
          {error && (
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 text-red-700">
                <AlertCircle size={20} />
                <p className="font-bold">{error}</p>
              </div>
            </div>
          )}

          {/* Audit Logs */}
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <Clock size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-bold">
                No change history found
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {logs.map((log) => (
                <div
                  key={log.auditId}
                  className="border-2 border-slate-200 rounded-xl p-4 hover:border-blue-300 transition-colors"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${getActionColor(log.action)}`}
                      >
                        {getActionIcon(log.action)}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 capitalize">
                          {log.action.replace("_", " ")}
                        </p>
                        <p className="text-sm text-slate-500">
                          by {log.userName || log.userId}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-600">
                        {formatTimestamp(log.timestamp)}
                      </p>
                    </div>
                  </div>

                  {/* Changes */}
                  {log.changes && log.changes.length > 0 && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      {log.changes.map((change, idx) => (
                        <div
                          key={idx}
                          className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm"
                        >
                          <div className="font-black text-slate-700">
                            {getFieldLabel(change.field)}
                          </div>
                          <div className="text-slate-500">
                            <span className="font-bold">From:</span>{" "}
                            {formatValue(change.oldValue)}
                          </div>
                          <div className="text-slate-800">
                            <span className="font-bold">To:</span>{" "}
                            {formatValue(change.newValue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Metadata */}
                  {log.metadata && (
                    <div className="mt-2 text-xs text-slate-400">
                      {log.metadata.reason && (
                        <p>Reason: {log.metadata.reason}</p>
                      )}
                      {log.metadata.isLimitedEdit && (
                        <span className="inline-block px-2 py-1 bg-yellow-100 text-yellow-700 rounded text-xs font-bold">
                          Limited Edit
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
