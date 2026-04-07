// app/admin/teams/components/SortablePlayer.tsx
// UPDATED: Show leadership badges from leadership object

"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Player } from "@/types/admin/teams.types";

interface SortablePlayerProps {
  player: Player;
  /** Override @dnd-kit sortable id when `player.id` is not unique in this list */
  sortableId?: string;
  rosterId?: string;
  location?: "team" | "emergency" | "unavailable";
  teamIndex?: number;
  teamName?: string;
  variant?: "normal" | "emergency" | "unavailable";
  isDragging?: boolean;
  onEdit?: () => void;
}

export default function SortablePlayer({
  player,
  sortableId,
  rosterId,
  location = "team",
  teamIndex,
  teamName,
  variant = "normal",
  isDragging = false,
  onEdit,
}: SortablePlayerProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({
    id: sortableId ?? player.id,
    data: {
      player,
      rosterId,
      location,
      teamIndex,
      teamName,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const variants = {
    normal: {
      bg: "bg-white hover:bg-slate-50",
      border: "border-slate-200 hover:border-slate-300",
      text: "text-slate-900",
      subtext: "text-slate-600",
      number: "bg-slate-800 text-white",
    },
    emergency: {
      bg: "bg-amber-50 hover:bg-amber-100",
      border: "border-amber-200 hover:border-amber-300",
      text: "text-amber-900",
      subtext: "text-amber-700",
      number: "bg-amber-600 text-white",
    },
    unavailable: {
      bg: "bg-red-50 hover:bg-red-100",
      border: "border-red-200 hover:border-red-300",
      text: "text-red-900",
      subtext: "text-red-700",
      number: "bg-red-600 text-white",
    },
  };

  const colors = variants[variant];

  // Get leadership from new leadership object
  const leadership = player.leadership || {
    captain: false,
    viceCaptain: false,
    leadershipGroup: false,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        ${colors.bg} ${colors.border}
        border-2 rounded-xl px-4 py-3
        transition-all shadow-sm hover:shadow-md
        ${isDragging ? "rotate-3 scale-105 shadow-2xl" : ""}
        relative group
      `}
    >
      <div className="flex items-center gap-4">
        {/* Drag Handle */}
        <div
          {...attributes}
          {...listeners}
          className={`flex-shrink-0 ${colors.subtext} cursor-grab active:cursor-grabbing`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 8h16M4 16h16"
            />
          </svg>
        </div>

        {/* Jersey Number */}
        {player.number && (
          <div
            className={`
            ${colors.number}
            w-12 h-12 rounded-lg
            flex items-center justify-center
            font-black text-2xl
            flex-shrink-0
          `}
          >
            {player.number}
          </div>
        )}

        {/* Player Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <div className={`font-black text-lg ${colors.text} truncate`}>
              {player.firstName} {player.lastName}
            </div>

            {/* Leadership Badges - Inline with name */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {leadership.captain && (
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-black">
                  C
                </span>
              )}
              {leadership.viceCaptain && (
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-black">
                  VC
                </span>
              )}
              {leadership.leadershipGroup && (
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-black">
                  L
                </span>
              )}
            </div>
          </div>

          <div
            className={`text-sm ${colors.subtext} font-bold flex items-center gap-3 mt-1`}
          >
            {player.position && (
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                  />
                </svg>
                {player.position}
              </span>
            )}
            {player.membershipNumber && <span>#{player.membershipNumber}</span>}
          </div>
        </div>

        {onEdit && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="flex-shrink-0 text-xs font-black uppercase text-blue-600 hover:text-blue-800 px-2 py-1 rounded-lg border border-blue-200 hover:bg-blue-50"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
