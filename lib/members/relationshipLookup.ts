// Normalises relationship-type documents from whichever collection holds them.

export interface RelationshipOption { id: string; name: string; isActive: boolean; displayOrder?: number }

export const RELATIONSHIP_COLLECTIONS = ["relationshipTypes", "relationship-types", "relationship_types"] as const;

export function normaliseRelationship(doc: Record<string, unknown>): RelationshipOption | null {
  const str = (v: unknown) => (typeof v === "string" && v.trim() !== "" ? v.trim() : undefined);
  // Prefer the usual name fields; otherwise take the first short readable string on the document.
  const name =
    ["name", "label", "title", "displayName", "relationshipType", "relationship", "type", "description"]
      .map((k) => str(doc[k]))
      .find(Boolean) ??
    Object.entries(doc)
      .filter(([k]) => !/^(_id|id|.*Id|code|value|category|createdAt|updatedAt|createdBy|updatedBy)$/.test(k))
      .map(([, v]) => str(v))
      .find((v) => v && v.length <= 60);
  if (!name) return null;
  const id = ["id", "relationshipTypeId", "relationshipId", "code", "value"].map((k) => str(doc[k])).find(Boolean);
  return {
    id: id ?? String(doc._id ?? name),
    name: name.trim(),
    isActive: doc.isActive !== false && doc.active !== false && doc.status !== "inactive" && doc.status !== "Inactive",
    displayOrder: typeof doc.displayOrder === "number" ? doc.displayOrder : undefined,
  };
}
