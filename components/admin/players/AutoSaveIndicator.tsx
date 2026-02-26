// components/admin/players/AutoSaveIndicator.tsx
// Shows auto-save status and draft recovery

"use client";

import { Save, Clock, AlertCircle, RefreshCw, Trash2 } from "lucide-react";

interface AutoSaveIndicatorProps {
  lastSaved: string | null;
  isDirty: boolean;
  hasDraft: boolean;
  onLoadDraft?: () => void;
  onClearDraft?: () => void;
  onManualSave?: () => void;
}

export default function AutoSaveIndicator({
  lastSaved,
  isDirty,
  hasDraft,
  onLoadDraft,
  onClearDraft,
  onManualSave,
}: AutoSaveIndicatorProps) {
  return (
    <div className="space-y-3">
      {/* Auto-Save Status */}
      <div
        className={`p-3 border-2 rounded-xl transition-all ${
          isDirty
            ? "bg-amber-50 border-amber-200"
            : lastSaved
              ? "bg-green-50 border-green-200"
              : "bg-slate-50 border-slate-200"
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isDirty ? (
              <>
                <Clock size={16} className="text-amber-600 animate-pulse" />
                <span className="text-xs font-bold text-amber-700">
                  Unsaved changes
                </span>
              </>
            ) : lastSaved ? (
              <>
                <Save size={16} className="text-green-600" />
                <span className="text-xs font-bold text-green-700">
                  Draft saved at {lastSaved}
                </span>
              </>
            ) : (
              <>
                <Save size={16} className="text-slate-400" />
                <span className="text-xs font-bold text-slate-600">
                  Auto-save enabled
                </span>
              </>
            )}
          </div>

          {onManualSave && (
            <button
              type="button"
              onClick={onManualSave}
              className="px-2 py-1 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 flex items-center gap-1 transition-all"
            >
              <Save size={12} />
              Save Now
            </button>
          )}
        </div>

        <p className="text-xs text-slate-600 mt-1">
          Form automatically saves every 30 seconds
        </p>
      </div>

      {/* Draft Recovery */}
      {hasDraft && onLoadDraft && (
        <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertCircle
              className="text-blue-600 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div className="flex-1">
              <h4 className="font-black text-blue-900 text-sm">Draft Found</h4>
              <p className="text-xs text-blue-700 mt-1">
                We found a saved draft. Would you like to recover your previous
                work?
              </p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={onLoadDraft}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center gap-1 transition-all"
                >
                  <RefreshCw size={14} />
                  Recover Draft
                </button>
                {onClearDraft && (
                  <button
                    type="button"
                    onClick={onClearDraft}
                    className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 flex items-center gap-1 transition-all"
                  >
                    <Trash2 size={14} />
                    Discard
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
