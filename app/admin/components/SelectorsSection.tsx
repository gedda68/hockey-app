// app/admin/components/SelectorsSection.tsx
// STYLED TO MATCH StaffSection - Grid card layout

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

  // Create array of 5 slots (like staff roles)
  const selectorSlots = Array.from({ length: 5 }, (_, i) => {
    if (i === 0 && chairSelector) {
      return {
        selector: chairSelector,
        isChair: true,
        index: selectors.findIndex((s) => s.id === chairSelector.id),
      };
    } else if (i === 0 && !chairSelector) {
      return { selector: null, isChair: true, index: -1 };
    } else {
      const regularIndex = i - 1;
      const selector = regularSelectors[regularIndex] || null;
      const actualIndex = selector
        ? selectors.findIndex((s) => s.id === selector.id)
        : -1;
      return { selector, isChair: false, index: actualIndex };
    }
  });

  return (
    <div className="mt-6 pt-6 border-t border-slate-200">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-black uppercase text-slate-600">
          Selection Panel ({selectors.length}/5)
        </h4>

        {canAddMore && (
          <button
            onClick={onAdd}
            className="px-3 py-1.5 bg-purple-600 text-white rounded-full text-xs font-black uppercase hover:bg-purple-700 transition-all"
          >
            + Add Selector
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {selectorSlots.map(({ selector, isChair, index }, slotIndex) => (
          <div
            key={slotIndex}
            className={`p-4 rounded-xl border ${
              isChair
                ? "bg-gradient-to-br from-yellow-50 to-white border-yellow-300"
                : "bg-white border-slate-200"
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <span className="text-xs font-black uppercase text-slate-500 flex items-center gap-1">
                {isChair && "👑 "}
                {isChair ? "Chair" : `Selector ${slotIndex}`}
              </span>

              <div className="flex gap-1">
                {selector ? (
                  <>
                    <button
                      onClick={() => onEdit(index, selector)}
                      className="px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-black uppercase hover:bg-purple-700"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => onDelete(index)}
                      className="px-2 py-1 bg-red-600 text-white rounded-full text-xs font-black uppercase hover:bg-red-700"
                    >
                      Del
                    </button>
                  </>
                ) : (
                  canAddMore && (
                    <button
                      onClick={onAdd}
                      className="px-2 py-1 bg-purple-600 text-white rounded-full text-xs font-black uppercase hover:bg-purple-700"
                    >
                      Add
                    </button>
                  )
                )}
              </div>
            </div>

            {selector ? (
              <div className="flex items-center gap-2">
                {selector.icon ? (
                  <div className="w-6 h-6 relative flex-shrink-0">
                    <Image
                      src={selector.icon}
                      alt={selector.club}
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div className="w-6 h-6 bg-purple-200 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-purple-600 font-black text-xs">
                      {selector.name.charAt(0)}
                    </span>
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-bold text-sm truncate">
                    {selector.name}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {selector.club}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm italic text-slate-400">Not assigned</div>
            )}

            {/* Make Chair button for non-chair selectors */}
            {selector && !isChair && !chairSelector && (
              <button
                onClick={() => onSetChair(index)}
                className="mt-2 w-full px-2 py-1 bg-yellow-500 text-white rounded-full text-xs font-black uppercase hover:bg-yellow-600"
              >
                👑 Make Chair
              </button>
            )}
          </div>
        ))}
      </div>

      {!canAddMore && (
        <div className="mt-3 text-center">
          <p className="text-xs font-bold text-slate-500">
            ℹ️ Maximum 5 selectors reached
          </p>
        </div>
      )}
    </div>
  );
}
