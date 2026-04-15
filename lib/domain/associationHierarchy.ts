import type { Db } from "mongodb";

/**
 * Derive `associations.level` and `associations.hierarchy` from the parent chain.
 *
 * - `level` is depth: root (no parent) = 0; child = parent + 1.
 * - `hierarchy` is the ordered list of ancestor associationIds from root → direct parent.
 *
 * This function is cycle-safe and does not rely on stored parent.hierarchy.
 */
export async function deriveAssociationLevelAndHierarchy(
  db: Db,
  parentAssociationId?: string,
  opts?: { childAssociationId?: string },
): Promise<{ level: number; hierarchy: string[] }> {
  const pid = parentAssociationId?.trim();
  if (!pid) return { level: 0, hierarchy: [] };

  const visited = new Set<string>();
  const chain: string[] = [];
  let currentId: string | undefined = pid;

  while (currentId) {
    if (visited.has(currentId)) {
      throw new Error("Invalid hierarchy: cycle detected in parent chain");
    }
    if (opts?.childAssociationId && currentId === opts.childAssociationId) {
      throw new Error("Invalid hierarchy: association cannot be its own ancestor");
    }
    visited.add(currentId);
    chain.unshift(currentId);

    const parent = (await db
      .collection("associations")
      .findOne(
        { associationId: currentId },
        { projection: { parentAssociationId: 1 } },
      )) as { parentAssociationId?: unknown } | null;
    if (!parent) throw new Error("Parent association not found");

    const next = parent.parentAssociationId
      ? String(parent.parentAssociationId).trim()
      : "";
    currentId = next || undefined;
  }

  return { level: chain.length, hierarchy: chain };
}

