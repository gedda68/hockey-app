import clientPromise from "@/lib/mongodb";
import { Network } from "lucide-react";
import TreeNode, { HierarchyNode } from "./TreeNode";

async function buildHierarchy(): Promise<HierarchyNode[]> {
  const client = await clientPromise;
  const db = client.db();

  const associations = await db.collection("associations").find().toArray();
  const clubs = await db.collection("clubs").find().toArray();

  const map = new Map<string, HierarchyNode>();
  const roots: HierarchyNode[] = [];

  associations.forEach((a) => {
    map.set(a.associationId, {
      type: "association",
      id: a.associationId,
      name: a.name,
      code: a.code,
      level: a.level,
      parentAssociationId: a.parentAssociationId,
      branding: a.branding ?? {},
      children: [],
    });
  });

  map.forEach((node) => {
    if (node.parentAssociationId) {
      map.get(node.parentAssociationId)?.children.push(node);
    } else {
      roots.push(node);
    }
  });

  clubs.forEach((club) => {
    const parent = map.get(club.parentAssociationId);
    if (!parent) return;

    const clubId = club.slug?.toString();

    if (!clubId) return; // HARD SAFETY

    parent.children.push({
      type: "club",
      id: clubId,
      name: club.name,
      code: club.code ?? club.name.slice(0, 3).toUpperCase(),
      parentAssociationId: club.parentAssociationId,
      logoUrl: club.logo,
      colors: club.colors ?? {},
      children: [],
    });
  });

  return roots;
}

export default async function HierarchyPage() {
  const hierarchy = await buildHierarchy();

  return (
    <div className="p-6">
      <h1 className="text-4xl font-black text-[#06054e] mb-6">
        Association Hierarchy
      </h1>

      <div className="bg-white rounded-2xl shadow p-6">
        {hierarchy.map((node) => (
          <TreeNode key={node.id} node={node} />
        ))}
      </div>
    </div>
  );
}
