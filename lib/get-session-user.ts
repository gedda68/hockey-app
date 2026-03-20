// lib/get-session-user.ts
// Session user helper — re-exports from the canonical get-session-user-custom.ts

export {
  getSessionUser,
  requireAuth,
  requireRole,
  requireClubAccess,
  requireAssociationAccess,
} from "@/lib/get-session-user-custom";
