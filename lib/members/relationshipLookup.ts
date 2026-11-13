// Normalises relationship-type documents from whichever collection holds them.

export interface RelationshipOption { id: string; name: string; isActive: boolean; displayOrder?: number }

export const RELATIONSHIP_COLLECTIONS = ["relationshipTypes", "relationship-types", "relationship_types"] as const;

export function normaliseRelationship(doc: Record<string, unknown>): RelationshipOption | null {
  const name = [doc.name, doc.label, doc.title].find((v) => typeof v === "string" && v.trim() !== "") as string | undefined;
  if (!name) return null;
  const id = [doc.id, doc.relationshipTypeId, doc.code, doc.value].find((v) => typeof v === "string" && v.trim() !== "") as string | undefined;
  return {
    id: id ?? String(doc._id ?? name),
    name: name.trim(),
    isActive: (doc.isActive ?? doc.active) !== false,
    displayOrder: typeof doc.displayOrder === "number" ? doc.displayOrder : undefined,
  };
}
