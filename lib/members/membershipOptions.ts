// Normalises membership-type and member-role documents for the Membership step pickers.

export interface PickOption { id: string; name: string; description?: string; isActive: boolean; displayOrder?: number }

const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);

export function normalisePick(doc: Record<string, unknown>, idKeys: string[]): PickOption | null {
  const name = ["name", "label", "title"].map((k) => str(doc[k])).find(Boolean);
  const id = [...idKeys, "id", "code"].map((k) => str(doc[k])).find(Boolean) ?? (doc._id != null ? String(doc._id) : undefined);
  if (!name || !id) return null;
  return {
    id,
    name,
    description: str(doc.description),
    isActive: doc.isActive !== false && doc.active !== false,
    displayOrder: typeof doc.displayOrder === "number" ? doc.displayOrder : undefined,
  };
}

/** Like normalisePicks but keeps inactive rows, so ids already saved on a member can still be named. */
export function normaliseAllPicks(docs: Record<string, unknown>[], idKeys: string[]): PickOption[] {
  return docs.map((d) => normalisePick(d, idKeys)).filter((x): x is PickOption => !!x);
}

export function normalisePicks(docs: Record<string, unknown>[], idKeys: string[]): PickOption[] {
  return docs
    .map((d) => normalisePick(d, idKeys))
    .filter((x): x is PickOption => !!x && x.isActive)
    .sort((a, b) => (a.displayOrder ?? 999) - (b.displayOrder ?? 999) || a.name.localeCompare(b.name));
}
