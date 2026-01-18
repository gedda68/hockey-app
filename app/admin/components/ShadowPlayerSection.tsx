// app/admin/components/ShadowPlayersSection.tsx

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
  return (
    <div
      className="p-6 bg-blue-50 rounded-2xl border-4 border-dashed border-blue-400"
      onDragOver={dragDrop.handleDragOver}
      onDrop={(e) => dragDrop.handleDropOnShadow(e, ageGroup)}
    >
      <h4 className="text-sm font-black uppercase text-blue-900 mb-4">
        📥 Shadow Players ({shadowPlayers.length})
      </h4>

      <div className="space-y-2">
        {shadowPlayers.map((player, idx) => (
          <div
            key={idx}
            draggable
            onDragStart={(e) =>
              dragDrop.handleDragStart(e, player, "shadow", idx, ageGroup)
            }
            className="p-3 bg-white rounded-lg flex items-center justify-between hover:bg-slate-50 transition-all cursor-grab active:cursor-grabbing"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg text-slate-400">⋮⋮</span>

              {player.icon && (
                <div className="w-8 h-8 relative">
                  <Image
                    src={player.icon}
                    alt={player.club}
                    fill
                    className="object-contain"
                  />
                </div>
              )}

              <div>
                <div className="font-bold text-sm">{player.name}</div>
                <div className="text-xs text-slate-500">{player.club}</div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => onEdit(idx, player)}
                className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-black uppercase hover:bg-blue-700"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(ageGroup, idx)}
                className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black uppercase hover:bg-red-700"
              >
                Del
              </button>
            </div>
          </div>
        ))}

        {shadowPlayers.length === 0 && (
          <div className="text-center py-8 text-blue-700">
            <p className="text-sm font-bold">No shadow players</p>
            <p className="text-xs mt-1">Drag players here to add them</p>
          </div>
        )}
      </div>
    </div>
  );
}
