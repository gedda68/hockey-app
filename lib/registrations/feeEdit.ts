// Add / edit / remove a fee line on a member's registration. The club registration holds the full
// itemised stack; each association registration holds that association's own lines, so a change to an
// association line is mirrored to both.

type Doc = Record<string, any>;

export interface FeeChange {
  action: "add" | "edit" | "remove";
  levelKind: "club" | "association";
  levelId: string;
  itemId?: string;
  name?: string;
  amount?: number;
}

export const sumLines = (lines: Doc[]) => lines.reduce((s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0), 0);

/** The level a stored line belongs to. */
export const lineLevel = (l: Doc) =>
  l.associationId ? { kind: "association" as const, id: String(l.associationId) } : { kind: "club" as const, id: String(l.clubId ?? "") };

export function validateChange(c: FeeChange): string | null {
  if (!["add", "edit", "remove"].includes(c.action)) return "Unknown action";
  if (!c.levelId || !["club", "association"].includes(c.levelKind)) return "Level is required";
  if (c.action !== "remove") {
    if (!String(c.name ?? "").trim()) return "Fee name is required";
    if (typeof c.amount !== "number" || !Number.isFinite(c.amount) || c.amount < 0 || c.amount > 100000) return "Amount must be a number from 0 to 100,000";
  }
  if (c.action !== "add" && !c.itemId) return "itemId is required";
  return null;
}

/** Returns the new line list for `lines` after the change, or an error. Pure. */
export function applyToLines(lines: Doc[], c: FeeChange, newId = `custom-${Date.now().toString(36)}`): { lines: Doc[]; line?: Doc } | { error: string } {
  if (c.action === "add") {
    const line: Doc = {
      itemId: newId, feeId: "custom", type: c.levelKind, name: String(c.name).trim(), amount: c.amount,
      gstIncluded: true, source: "manual",
      ...(c.levelKind === "club" ? { clubId: c.levelId } : { associationId: c.levelId }),
    };
    return { lines: [...lines, line], line };
  }
  const i = lines.findIndex((l) => l.itemId === c.itemId);
  if (i < 0) return { error: "Fee line not found" };
  const lvl = lineLevel(lines[i]);
  if (lvl.kind !== c.levelKind || lvl.id !== c.levelId) return { error: "That fee belongs to a different club or association" };
  if (c.action === "remove") return { lines: lines.filter((_, j) => j !== i), line: lines[i] };
  const line = { ...lines[i], name: String(c.name).trim(), amount: c.amount, source: lines[i].source === "manual" ? "manual" : "edited" };
  return { lines: lines.map((l, j) => (j === i ? line : l)), line };
}
