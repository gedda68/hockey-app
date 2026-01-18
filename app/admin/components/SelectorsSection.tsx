// app/admin/components/SelectorsSection.tsx
// FIXED: Removed email and phone fields

import Image from "next/image";
import { Selector } from "../types";

interface SelectorsSectionProps {
  selectors?: Selector[];
  ageGroup: string;
  onAdd: () => void;
  onEdit: (index: number, selector: Selector) => void;
  onDelete: (index: number) => void;
  onSetChair: (index: number) => void;
}

export default function SelectorsSection({
  selectors = [],
  ageGroup,
  onAdd,
  onEdit,
  onDelete,
  onSetChair,
}: SelectorsSectionProps) {
  const chairSelector = selectors.find((s) => s.isChair);
  const regularSelectors = selectors.filter((s) => !s.isChair);
  const canAddMore = selectors.length < 5;

  return (
    <div className="p-6 bg-purple-50 rounded-2xl border-2 border-purple-300">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-black uppercase text-purple-900">
            👥 Selectors Panel ({selectors.length}/5)
          </h4>
          <p className="text-xs text-purple-600 mt-1">
            Selection committee for {ageGroup}
          </p>
        </div>

        {canAddMore && (
          <button
            onClick={onAdd}
            className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-black uppercase hover:bg-purple-700 transition-all"
          >
            + Add Selector
          </button>
        )}
      </div>

      {selectors.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-xl border-2 border-dashed border-purple-300">
          <p className="text-purple-400 font-bold mb-2">
            No selectors assigned
          </p>
          <p className="text-xs text-purple-500 mb-4">
            Add up to 5 selectors to form the selection panel
          </p>
          <button
            onClick={onAdd}
            className="px-6 py-2 bg-purple-600 text-white rounded-full font-black uppercase text-sm hover:bg-purple-700"
          >
            + Add First Selector
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Chair of Selectors */}
          {chairSelector && (
            <div className="p-4 bg-gradient-to-r from-yellow-100 to-yellow-50 rounded-xl border-2 border-yellow-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-yellow-400 rounded-full flex items-center justify-center text-2xl">
                    👑
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black uppercase bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full">
                        Chair of Selectors
                      </span>
                    </div>
                    <div className="font-bold text-lg">
                      {chairSelector.name}
                    </div>
                    <div className="text-sm text-slate-600 flex items-center gap-2">
                      {chairSelector.icon && (
                        <div className="w-5 h-5 relative">
                          <Image
                            src={chairSelector.icon}
                            alt={chairSelector.club}
                            fill
                            className="object-contain"
                          />
                        </div>
                      )}
                      {chairSelector.club}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      onEdit(
                        selectors.findIndex((s) => s.id === chairSelector.id),
                        chairSelector
                      )
                    }
                    className="px-3 py-1 bg-yellow-600 text-white rounded-full text-xs font-black uppercase hover:bg-yellow-700"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() =>
                      onDelete(
                        selectors.findIndex((s) => s.id === chairSelector.id)
                      )
                    }
                    className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black uppercase hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Regular Selectors */}
          {regularSelectors.map((selector) => {
            const actualIndex = selectors.findIndex(
              (s) => s.id === selector.id
            );

            return (
              <div
                key={selector.id}
                className="p-4 bg-white rounded-xl border-2 border-purple-200 hover:border-purple-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {selector.icon ? (
                      <div className="w-12 h-12 relative">
                        <Image
                          src={selector.icon}
                          alt={selector.club}
                          fill
                          className="object-contain rounded-full border-2 border-purple-200"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 bg-purple-200 rounded-full flex items-center justify-center text-purple-600 font-black text-xl">
                        {selector.name.charAt(0)}
                      </div>
                    )}

                    <div className="flex-1">
                      <div className="font-bold text-base">{selector.name}</div>
                      <div className="text-sm text-slate-600 flex items-center gap-2">
                        {selector.icon && (
                          <div className="w-5 h-5 relative">
                            <Image
                              src={selector.icon}
                              alt={selector.club}
                              fill
                              className="object-contain"
                            />
                          </div>
                        )}
                        {selector.club}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => onEdit(actualIndex, selector)}
                        className="px-3 py-1 bg-purple-600 text-white rounded-full text-xs font-black uppercase hover:bg-purple-700"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => onDelete(actualIndex)}
                        className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black uppercase hover:bg-red-700"
                      >
                        Remove
                      </button>
                    </div>

                    {!chairSelector && (
                      <button
                        onClick={() => onSetChair(actualIndex)}
                        className="px-3 py-1 bg-yellow-500 text-white rounded-full text-xs font-black uppercase hover:bg-yellow-600"
                      >
                        👑 Make Chair
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!canAddMore && (
        <div className="mt-4 p-3 bg-purple-100 rounded-lg text-center">
          <p className="text-xs font-bold text-purple-700">
            ℹ️ Maximum 5 selectors reached
          </p>
        </div>
      )}
    </div>
  );
}
