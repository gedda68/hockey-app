// app/admin/components/ShadowPlayersSection.tsx

// app/admin/components/ShadowPlayerSection.tsx
import Image from "next/image";
import { Player } from "../types";

interface ShadowPlayersSectionProps {
  shadowPlayers: Player[];
  ageGroup: string;
  onEdit: (playerIndex: number, player: Player) => void;
  onDelete: (ageGroup: string, playerIndex: number) => void;
  dragDrop: any;
}

export default function ShadowPlayersSection({
  shadowPlayers,
  ageGroup,
  onEdit,
  onDelete,
  dragDrop,
}: ShadowPlayersSectionProps) {
  // Visual feedback for dragging
  const isDragging = !!dragDrop.draggedPlayer;
  const isCorrectAgeGroup = dragDrop.draggedPlayer?.ageGroup === ageGroup;
  const isTargetingShadow = dragDrop.draggedPlayer?.sourceType !== "shadow";

  return (
    <div
      onDragOver={dragDrop.handleDragOver}
      onDrop={(e) => dragDrop.handleDropOnShadow(e, ageGroup)}
      className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-200 ${
        isDragging && isCorrectAgeGroup && isTargetingShadow
          ? "border-amber-500 bg-amber-50 scale-[1.01]"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-xs font-black uppercase tracking-widest text-amber-900">
          📥 Shadow Players ({shadowPlayers.length})
        </h4>
        {isDragging && isCorrectAgeGroup && isTargetingShadow && (
          <span className="text-[10px] font-black text-amber-600 animate-pulse">
            READY TO DROP
          </span>
        )}
      </div>

      <div className="space-y-2">
        {shadowPlayers.map((player, idx) => (
          <div
            key={`${player.name}-${idx}`}
            draggable
            onDragStart={(e) =>
              dragDrop.handleDragStart(e, player, "shadow", idx, ageGroup)
            }
            className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-amber-400 transition-all cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-4">
              <span className="text-lg text-slate-300 group-hover:text-amber-400 transition-colors">
                ⋮⋮
              </span>

              {player.icon && (
                <div className="w-8 h-8 relative flex-shrink-0">
                  <Image
                    src={player.icon}
                    alt={player.club || "Club"}
                    fill
                    className="object-contain"
                  />
                </div>
              )}

              <div>
                <div className="font-bold text-sm text-slate-800">
                  {player.name}
                </div>
                <div className="text-[10px] font-bold uppercase text-slate-400 tracking-tighter">
                  {player.club}
                </div>
              </div>
            </div>

            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={() => onEdit(idx, player)}
                className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-amber-600 hover:text-white transition-all"
                title="Edit Shadow"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </button>
              <button
                onClick={() => onDelete(ageGroup, idx)}
                className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-red-600 hover:text-white transition-all"
                title="Delete Shadow"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          </div>
        ))}

        {shadowPlayers.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              Shadow pool is empty
            </p>
            <p className="text-[10px] text-slate-400 mt-1">
              Drag players here to move them to shadows
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
