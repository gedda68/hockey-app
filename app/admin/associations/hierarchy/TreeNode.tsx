"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Plus } from "lucide-react";
import { gradientFromColors } from "@/lib/utils/colorUtils";
import Image from "next/image";

export type HierarchyNode =
  | {
      type: "association";
      id: string;
      name: string;
      code: string;
      level: number;
      parentAssociationId?: string;
      branding: {
        primaryColor?: string;
        secondaryColor?: string;
        tertiaryColor?: string;
      };
      children: HierarchyNode[];
    }
  | {
      type: "club";
      id: string;
      name: string;
      code: string;
      parentAssociationId: string;
      logoUrl?: string;
      colors: {
        primary?: string;
        secondary?: string;
        accent?: string;
      };
      children: [];
    };

export default function TreeNode({
  node,
  depth = 0,
}: {
  node: HierarchyNode;
  depth?: number;
}) {
  const [expanded, setExpanded] = useState(node.type === "association");

  const isAssociation = node.type === "association";

  const associationChildren = isAssociation
    ? node.children.filter((c) => c.type === "association")
    : [];

  const clubChildren = isAssociation
    ? node.children.filter((c) => c.type === "club")
    : [];

  const gradient =
    node.type === "association"
      ? gradientFromColors(
          [
            node.branding.primaryColor,
            node.branding.secondaryColor,
            node.branding.tertiaryColor,
          ],
          node.name
        )
      : gradientFromColors(
          [node.colors.primary, node.colors.secondary, node.colors.accent],
          node.name
        );

  return (
    <div style={{ marginLeft: `${depth * 1.5}rem` }}>
      {/* NODE HEADER */}
      <div className="flex items-center gap-2 mb-2">
        {isAssociation && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-slate-500 hover:text-[#06054e]"
          >
            <ChevronRight
              size={16}
              className={`transition-transform duration-300 ${
                expanded ? "rotate-90" : ""
              }`}
            />
          </button>
        )}

        <div className="flex items-center gap-3 px-3 py-2 rounded-lg border bg-white w-full">
          {/* CODE BADGE */}
          <div
            className="w-9 h-9 rounded-md text-white font-black text-xs flex items-center justify-center shrink-0"
            style={{ background: gradient }}
          >
            {node.code}
          </div>

          {/* NAME */}
          <Link
            href={
              isAssociation
                ? `/admin/associations/${node.id}`
                : `/admin/clubs/${node.id}`
            }
            className="font-black text-sm text-[#06054e] flex-1 truncate"
          >
            {node.name}
          </Link>

          {/* CLUB COUNT */}
          {isAssociation && clubChildren.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-600">
              {clubChildren.length} clubs
            </span>
          )}

          {/* ADD CLUB — ONLY DEPTH 2 */}
          {isAssociation && depth === 2 && (
            <Link
              href={`/admin/clubs/new?associationId=${node.id}`}
              className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-[#06054e]"
            >
              <Plus size={14} />
              Add Club
            </Link>
          )}
        </div>
      </div>

      {/* COLLAPSIBLE CONTENT */}
      {isAssociation && (
        <div
          className={`
            grid transition-[grid-template-rows,opacity] duration-300 ease-in-out
            ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}
          `}
        >
          <div className="overflow-hidden space-y-4">
            {/* CHILD ASSOCIATIONS */}
            {associationChildren.map((child) => (
              <TreeNode key={child.id} node={child} depth={depth + 1} />
            ))}

            {/* CLUB GRID */}
            {clubChildren.length > 0 && (
              <div
                className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4"
                style={{ marginLeft: `${(depth + 1) * 1.5}rem` }}
              >
                {clubChildren.map((club) => {
                  const clubGradient = gradientFromColors(
                    [
                      club.colors.primary,
                      club.colors.secondary,
                      club.colors.accent,
                    ],
                    club.name
                  );

                  return (
                    <Link
                      key={club.id}
                      href={`/clubs/${club.id}`}
                      className="rounded-lg border bg-white p-3 hover:shadow-md transition group"
                    >
                      {/* LOGO / FALLBACK */}
                      <div
                        className="h-12 rounded-md flex items-center justify-center mb-2 overflow-hidden"
                        style={{ background: clubGradient }}
                      >
                        {club.logoUrl ? (
                          <Image
                            src={club.logoUrl}
                            alt={club.name}
                            width={55}
                            height={30}
                            className="object-contain"
                            unoptimized
                          />
                        ) : (
                          <span className="text-white font-black text-xs">
                            {club.code}
                          </span>
                        )}
                      </div>

                      <div className="text-xs font-black text-[#06054e] truncate text-center">
                        {club.name}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
