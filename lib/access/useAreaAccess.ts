// lib/access/useAreaAccess.ts — client hook for the Roles & Access Matrix area codes.
// People the matrix doesn't apply to (see decideArea) get full capability here, so existing role checks on the
// page keep deciding for them.

"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { decideArea, type LogicalArea } from "@/lib/access/areaAccess";

export function useAreaAccess(area: LogicalArea) {
  const { user } = useAuth();
  const base = { access: user?.access, role: user?.role };
  const at = (need: "V" | "R" | "E" | "A") => decideArea(base.access as never, base.role, area, need).allowed;
  const d = decideArea(base.access as never, base.role, area, "V");
  return {
    /** Whether the matrix applies to this person right now. */
    enforced: d.enforced,
    code: d.code,
    /** Hidden entirely ("-"). */
    hidden: d.enforced && !d.allowed,
    canRead: at("R"),
    canEdit: at("E"),
    canAdmin: at("A"),
  };
}
