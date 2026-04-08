export type TreeNodeType = "association" | "club";

export interface HierarchyNode {
  type: TreeNodeType;

  id: string;
  name: string;
  code?: string;

  level?: number; // association only
  parentAssociationId: string;

  children: HierarchyNode[];

  logoUrl?: string;

  primaryColor?: string;
  secondaryColor?: string;
  tertiaryColor?: string;
}
