import type { ImportRow } from "@/lib/bulk-import/types";

export function norm(v: unknown): string {
  return (v ?? "").toString().trim();
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function toDate(v: string): string | null {
  if (!v) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const slashMatch = v.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

export function toBool(v: string): boolean {
  const s = (v ?? "").toString().toLowerCase().trim();
  return s === "yes" || s === "true" || s === "1";
}

export type ImportRuntimeContext = {
  /** When true, `initialPassword` column on user rows is honoured (super-admin only from HTTP). */
  allowStaticPassword: boolean;
  /** Force this clubId on member/team/player rows when set (club-scoped admin). */
  forcedClubId?: string | null;
  /** Force parentAssociationId on new/updated clubs when set (association-scoped admin). */
  forcedParentAssociationId?: string | null;
  /** Force associationId on association-scoped rows (rep teams, association registrations, users). */
  forcedAssociationId?: string | null;
};

export function applyRowScope(
  entity: string,
  rows: ImportRow[],
  ctx: ImportRuntimeContext,
): ImportRow[] {
  return rows.map((r) => {
    const out = { ...r };
    if (ctx.forcedClubId) {
      if (
        entity === "members" ||
        entity === "players" ||
        entity === "teams" ||
        entity === "club-registrations" ||
        entity === "league-venues"
      ) {
        out.clubId = ctx.forcedClubId;
      }
    }
    if (ctx.forcedParentAssociationId && entity === "clubs") {
      out.parentAssociationId = ctx.forcedParentAssociationId;
    }
    if (ctx.forcedAssociationId) {
      if (entity === "association-registrations" || entity === "rep-teams") {
        out.associationId = ctx.forcedAssociationId;
      }
      if (entity === "users") {
        out.associationId = ctx.forcedAssociationId;
      }
    }
    return out;
  });
}
