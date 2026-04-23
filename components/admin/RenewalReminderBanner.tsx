"use client";

/**
 * RenewalReminderBanner
 *
 * Displays one dismissible amber banner per undismissed renewal_reminder
 * notification for the logged-in member.  Shown persistently on every admin
 * portal page until dismissed or the notification expires (7 days after
 * membership.currentPeriodEnd).
 *
 * Only rendered when the session has a memberId (i.e. the user is a member,
 * not a staff-only account).  Staff accounts without a linked member record
 * receive no banner.
 *
 * Data flow:
 *   mount → GET /api/member/notifications → render banners
 *   × click → optimistic hide + PATCH /api/member/notifications?notificationId=<id>
 *
 * The component renders nothing (null) while loading, on error, or when there
 * are no active notifications — so it adds zero layout impact for the majority
 * of users.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Bell, X, ChevronRight, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import type { MemberNotification } from "@/app/api/member/notifications/route";

export default function RenewalReminderBanner() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<MemberNotification[]>([]);
  const [loading, setLoading]             = useState(false);
  const [dismissing, setDismissing]       = useState<Set<string>>(new Set());

  // Only fetch for members (users with a linked memberId)
  const isMember = Boolean(user?.memberId);

  const fetchNotifications = useCallback(async () => {
    if (!isMember) return;
    setLoading(true);
    try {
      const res  = await fetch("/api/member/notifications");
      if (!res.ok) return;
      const data = await res.json() as { notifications: MemberNotification[] };
      setNotifications(
        (data.notifications ?? []).filter((n) => n.type === "renewal_reminder"),
      );
    } catch {
      // Silent — banner failure should never block the page
    } finally {
      setLoading(false);
    }
  }, [isMember]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function dismiss(notificationId: string) {
    // Optimistic: hide immediately
    setNotifications((prev) => prev.filter((n) => n.notificationId !== notificationId));
    setDismissing((prev) => new Set(prev).add(notificationId));

    try {
      await fetch(`/api/member/notifications?notificationId=${encodeURIComponent(notificationId)}`, {
        method: "PATCH",
      });
    } catch {
      // Best-effort — if dismiss fails the banner will reappear on next load
      // (server-side dismissedAt was not set), which is acceptable.
    } finally {
      setDismissing((prev) => {
        const next = new Set(prev);
        next.delete(notificationId);
        return next;
      });
    }
  }

  // Nothing to show
  if (!isMember || loading || notifications.length === 0) return null;

  return (
    <div className="border-b border-amber-200">
      {notifications.map((notif) => (
        <div
          key={notif.notificationId}
          className="flex items-center gap-3 px-4 py-3 bg-amber-50 text-amber-900"
        >
          {/* Icon */}
          <Bell
            className="w-4 h-4 text-amber-600 flex-shrink-0"
            aria-hidden="true"
          />

          {/* Message */}
          <div className="flex-1 min-w-0">
            <span className="font-semibold text-sm">{notif.title}: </span>
            <span className="text-sm">{notif.message}</span>
          </div>

          {/* Renew CTA */}
          <Link
            href={notif.link}
            className="flex-shrink-0 flex items-center gap-1 text-sm font-bold
              text-amber-800 underline underline-offset-2 hover:text-amber-900
              whitespace-nowrap"
          >
            Renew now
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>

          {/* Dismiss */}
          <button
            type="button"
            onClick={() => dismiss(notif.notificationId)}
            disabled={dismissing.has(notif.notificationId)}
            aria-label="Dismiss renewal reminder"
            className="flex-shrink-0 p-1 rounded hover:bg-amber-100
              disabled:opacity-50 transition-colors"
          >
            {dismissing.has(notif.notificationId) ? (
              <Loader2 className="w-4 h-4 animate-spin text-amber-600" />
            ) : (
              <X className="w-4 h-4 text-amber-600" />
            )}
          </button>
        </div>
      ))}
    </div>
  );
}
