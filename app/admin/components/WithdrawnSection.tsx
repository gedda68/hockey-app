// app/admin/components/WithdrawnSection.tsx
// UPDATED: Added drag functionality to withdrawn players

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
  return (
    <div
      className="p-6 bg-red-50 rounded-2xl border-4 border-dashed border-red-400"
      onDragOver={dragDrop.handleDragOver}
      onDrop={(e) => dragDrop.handleDropOnWithdrawn(e, ageGroup)}
    >
      <div className="mb-4">
        <h4 className="text-sm font-black uppercase text-red-700 mb-2">
          📥 Withdrawn ({withdrawn.length})
        </h4>
        <p className="text-xs text-red-600">
          ⬇️ Drag players here to withdraw them | ⬆️ Drag withdrawn players back
          to teams/shadow
        </p>
      </div>

      <div className="space-y-2">
        {withdrawn.map((player, idx) => (
          <div
            key={idx}
            draggable // ← Make withdrawn players draggable
            onDragStart={(e) =>
              dragDrop.handleDragStart(e, player, "withdrawn", idx, ageGroup)
            }
            className="p-3 bg-white rounded-lg flex items-center justify-between hover:bg-red-50 transition-all cursor-grab active:cursor-grabbing border-2 border-transparent hover:border-red-300"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg text-red-400">⋮⋮</span>

              {player.icon && (
                <div className="w-8 h-8 relative">
                  <Image
                    src={player.icon}
                    alt={player.club}
                    fill
                    className="object-contain opacity-60"
                  />
                </div>
              )}

              <div>
                <div className="font-bold text-sm">{player.name}</div>
                <div className="text-xs text-slate-500">{player.club}</div>
                <div className="text-xs text-red-600 font-bold mt-1 flex items-center gap-1">
                  <span>🚫</span>
                  {player.reason}
                </div>
              </div>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation(); // Prevent drag when clicking delete
                onDelete(ageGroup, idx);
              }}
              className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black uppercase hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        ))}

        {withdrawn.length === 0 && (
          <div className="text-center py-8 text-red-700">
            <p className="text-sm font-bold">No withdrawn players</p>
            <p className="text-xs mt-1">Drag players here to withdraw them</p>
          </div>
        )}
      </div>
    </div>
  );
}
