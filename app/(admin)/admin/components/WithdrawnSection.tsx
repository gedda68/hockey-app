// app/admin/components/WithdrawnSection.tsx
import Image from "next/image";
import { Player } from "../types";

interface WithdrawnSectionProps {
  withdrawn: Array<Player & { reason: string }>;
  ageGroup: string;
  onDelete: (ageGroup: string, playerIndex: number) => void;
  dragDrop: any;
}

export default function WithdrawnSection({
  withdrawn,
  ageGroup,
  onDelete,
  dragDrop,
}: WithdrawnSectionProps) {
  // Visual feedback for dragging
  const isDragging = !!dragDrop.draggedPlayer;
  const isCorrectAgeGroup = dragDrop.draggedPlayer?.ageGroup === ageGroup;
  const isTargetingWithdrawn =
    dragDrop.draggedPlayer?.sourceType !== "withdrawn";

  return (
    <div
      onDragOver={dragDrop.handleDragOver}
      onDrop={(e) => dragDrop.handleDropOnWithdrawn(e, ageGroup)}
      className={`p-6 rounded-2xl border-2 border-dashed transition-all duration-200 ${
        isDragging && isCorrectAgeGroup && isTargetingWithdrawn
          ? "border-red-500 bg-red-100 scale-[1.01]"
          : "border-slate-200 bg-slate-50"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-xs font-black uppercase tracking-widest text-red-900">
          📥 Withdrawn Pool ({withdrawn.length})
        </h4>
        {isDragging && isCorrectAgeGroup && isTargetingWithdrawn && (
          <span className="text-[10px] font-black text-red-600 animate-pulse">
            RELEASE PLAYER
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mb-4">
        Move players here to remove from active selection
      </p>

      <div className="space-y-2">
        {withdrawn.map((player, idx) => (
          <div
            key={`${player.name}-${idx}`}
            draggable
            onDragStart={(e) =>
              dragDrop.handleDragStart(e, player, "withdrawn", idx, ageGroup)
            }
            className="group flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-red-400 transition-all cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-4">
              <span className="text-lg text-slate-300 group-hover:text-red-400 transition-colors">
                ⋮⋮
              </span>

              {player.icon && (
                <div className="w-8 h-8 relative flex-shrink-0 grayscale">
                  <Image
                    src={player.icon}
                    alt={player.club || "Club"}
                    fill
                    className="object-contain opacity-50"
                  />
                </div>
              )}

              <div>
                <div className="font-bold text-sm text-slate-500 line-through decoration-slate-300">
                  {player.name}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9px] font-black bg-red-100 text-red-700 px-1.5 py-0.5 rounded uppercase">
                    {player.reason || "Withdrawn"}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {player.club}
                  </span>
                </div>
              </div>
            </div>

            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(ageGroup, idx);
                }}
                className="p-1.5 bg-slate-100 text-slate-600 rounded-md hover:bg-red-600 hover:text-white transition-all"
                title="Permanently Delete"
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

        {withdrawn.length === 0 && (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
              No withdrawn records
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
