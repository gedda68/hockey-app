/**
 * Hierarchical news for association / club public hubs.
 *
 * Policy:
 * - Each hub shows **own** scoped news first (association or club).
 * - Then association-scoped news from **ancestors only** (parent → … → root). No siblings.
 * - Lower levels never appear above (no club items on association hub).
 * - Club hubs: canonical parent association + its `hierarchy` chain (see `deriveAssociationLevelAndHierarchy`).
 */

import type { Db } from "mongodb";
import clientPromise from "@/lib/mongodb";
import {
  publicNewsMongoFilterForAssociationHub,
  publicNewsMongoFilterForClubHub,
} from "@/lib/portal/newsScope";
import { queryActiveNews, type PublicNewsItem } from "@/lib/data/publicNews";

export type PublicNewsFlowSection = {
  sectionKey: string;
  title: string;
  subtitle?: string;
  items: PublicNewsItem[];
};

export type PublicNewsFlowdownBundle = {
  sections: PublicNewsFlowSection[];
};

/** Client-safe (Date → ISO string) for passing into `NewsFlowdownModal`. */
export type PublicNewsLineDTO = Omit<PublicNewsItem, "publishDate"> & {
  publishDate?: string;
};

export type PublicNewsFlowSectionDTO = Omit<PublicNewsFlowSection, "items"> & {
  items: PublicNewsLineDTO[];
};

export function serializeNewsFlowdown(
  bundle: PublicNewsFlowdownBundle,
): { sections: PublicNewsFlowSectionDTO[] } {
  return {
    sections: bundle.sections.map((s) => ({
      ...s,
      items: s.items.map((i) => ({
        ...i,
        publishDate: i.publishDate?.toISOString(),
      })),
    })),
  };
}

/** `hierarchy` is root → direct parent; flow-down display is direct parent → root. */
export function ancestorAssociationIdsForFlowdown(
  hierarchy: string[] | null | undefined,
): string[] {
  const h = Array.isArray(hierarchy)
    ? hierarchy.map((x) => String(x).trim()).filter(Boolean)
    : [];
  return [...h].reverse();
}

/** Club: canonical parent association first, then that association’s ancestors (parent → root). */
export function ancestorAssociationIdsForClubFlowdown(
  canonicalParentAssociationId: string,
  parentHierarchyRootToParent: string[] | null | undefined,
): string[] {
  const direct = String(canonicalParentAssociationId ?? "").trim();
  if (!direct) return [];
  const tail = ancestorAssociationIdsForFlowdown(parentHierarchyRootToParent);
  const out: string[] = [direct];
  for (const id of tail) {
    if (id && id !== direct) out.push(id);
  }
  return out;
}

async function loadAssociationLabels(
  db: Db,
  ids: string[],
): Promise<Map<string, string>> {
  const uniq = [...new Set(ids.map((x) => String(x).trim()).filter(Boolean))];
  if (uniq.length === 0) return new Map();
  const rows = await db
    .collection("associations")
    .find(
      { associationId: { $in: uniq } },
      { projection: { associationId: 1, name: 1 } },
    )
    .toArray();
  const m = new Map<string, string>();
  for (const r of rows) {
    const id = String(r.associationId ?? "").trim();
    if (!id) continue;
    m.set(id, String(r.name ?? id).trim() || id);
  }
  return m;
}

export async function getPublicNewsFlowdownForAssociation(
  associationId: string,
  opts?: { perSectionLimit?: number },
): Promise<PublicNewsFlowdownBundle> {
  const limit = Math.max(1, Math.min(40, opts?.perSectionLimit ?? 10));
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const selfDoc = await db.collection("associations").findOne(
    { associationId },
    { projection: { name: 1, hierarchy: 1 } },
  );
  const selfName = String(selfDoc?.name ?? associationId).trim() || associationId;
  const hierarchy = Array.isArray(selfDoc?.hierarchy)
    ? selfDoc!.hierarchy.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];

  const ancestorIds = ancestorAssociationIdsForFlowdown(hierarchy);
  const labelMap = await loadAssociationLabels(db, [associationId, ...ancestorIds]);

  const sections: PublicNewsFlowSection[] = [];

  const ownFilter = publicNewsMongoFilterForAssociationHub(associationId);
  const ownItems = await queryActiveNews(db, ownFilter, limit);
  sections.push({
    sectionKey: "own",
    title: `${selfName}`,
    subtitle: "News published for this association",
    items: ownItems,
  });

  for (const aid of ancestorIds) {
    const f = publicNewsMongoFilterForAssociationHub(aid);
    const items = await queryActiveNews(db, f, limit);
    if (items.length === 0) continue;
    const title = labelMap.get(aid) ?? aid;
    sections.push({
      sectionKey: `ancestor:${aid}`,
      title,
      subtitle: "From a parent association (flows down)",
      items,
    });
  }

  return { sections };
}

export async function getPublicNewsFlowdownForClub(
  clubId: string,
  opts?: { perSectionLimit?: number },
): Promise<PublicNewsFlowdownBundle> {
  const limit = Math.max(1, Math.min(40, opts?.perSectionLimit ?? 10));
  const client = await clientPromise;
  const db = client.db(process.env.DB_NAME || "hockey-app");

  const club = await db.collection("clubs").findOne(
    { id: clubId },
    { projection: { id: 1, name: 1, title: 1, associationId: 1, parentAssociationId: 1 } },
  );
  if (!club) return { sections: [] };

  const cid = String(club.id ?? clubId).trim();
  const clubName = String(club.name ?? club.title ?? cid).trim() || cid;
  const parentAssoc = String(
    club.associationId ?? club.parentAssociationId ?? "",
  ).trim();
  if (!parentAssoc) {
    const ownFilter = publicNewsMongoFilterForClubHub(cid);
    const ownOnly = await queryActiveNews(db, ownFilter, limit);
    return {
      sections: [
        {
          sectionKey: "own",
          title: clubName,
          subtitle: "News published for this club",
          items: ownOnly,
        },
      ],
    };
  }

  const parentDoc = await db.collection("associations").findOne(
    { associationId: parentAssoc },
    { projection: { hierarchy: 1, name: 1 } },
  );
  const parentHierarchy = Array.isArray(parentDoc?.hierarchy)
    ? parentDoc!.hierarchy.map((x: unknown) => String(x).trim()).filter(Boolean)
    : [];

  const chain = ancestorAssociationIdsForClubFlowdown(parentAssoc, parentHierarchy);
  const labelMap = await loadAssociationLabels(db, [parentAssoc, ...chain, cid]);

  const sections: PublicNewsFlowSection[] = [];

  const ownFilter = publicNewsMongoFilterForClubHub(cid);
  const ownItems = await queryActiveNews(db, ownFilter, limit);
  sections.push({
    sectionKey: "own",
    title: clubName,
    subtitle: "News published for this club",
    items: ownItems,
  });

  for (const aid of chain) {
    const f = publicNewsMongoFilterForAssociationHub(aid);
    const items = await queryActiveNews(db, f, limit);
    if (items.length === 0) continue;
    const title = labelMap.get(aid) ?? aid;
    sections.push({
      sectionKey: `ancestor:${aid}`,
      title,
      subtitle: "From a parent association (flows down)",
      items,
    });
  }

  return { sections };
}
