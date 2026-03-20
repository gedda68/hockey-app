"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Save, ChevronDown, ChevronUp } from "lucide-react";

// ─── Types ─────────────────────────────────────────────────────────────────

interface FeeItem {
  id: string;
  name: string;
  amount: number;
  description?: string;
  isActive: boolean;
}

interface FeeCategory {
  key: string;
  label: string;
  description: string;
  icon: string;
  fees: FeeItem[];
}

interface FeesStructure {
  [key: string]: FeeItem[];
}

export interface FeeManagerProps {
  entityType: "club" | "association";
  entityId: string;
  entityName: string;
  primaryColor?: string;
}

// ─── Category Definitions ──────────────────────────────────────────────────

const CLUB_CATEGORIES: Omit<FeeCategory, "fees">[] = [
  { key: "season", label: "Season Fees", description: "Annual competition & registration fees", icon: "🏑" },
  { key: "training", label: "Training Fees", description: "Session and training programme fees", icon: "🏃" },
  { key: "member", label: "Membership Fees", description: "Club membership categories", icon: "👥" },
  { key: "fieldHire", label: "Field Hire", description: "Pitch and facility hire rates", icon: "🌿" },
  { key: "venueHire", label: "Venue Hire", description: "Clubrooms, meeting rooms and facility hire", icon: "🏢" },
];

const ASSOC_CATEGORIES: Omit<FeeCategory, "fees">[] = [
  { key: "season", label: "Season Fees", description: "Annual competition fees by age group", icon: "🏑" },
  { key: "fieldHire", label: "Field Hire", description: "Pitch and facility hire rates", icon: "🌿" },
  { key: "tournament", label: "Tournament Fees", description: "Tournament entry and participation fees", icon: "🏆" },
  { key: "repTrial", label: "Representative Trial Fees", description: "Rep team trial and selection fees", icon: "⭐" },
  { key: "training", label: "Training Fees", description: "Association-level training programmes", icon: "🏃" },
  { key: "travel", label: "Travel & Accommodation", description: "Travel and accommodation allowances", icon: "✈️" },
  { key: "other", label: "Other Fees", description: "Miscellaneous fees and charges", icon: "📋" },
];

// ─── Default Fee Templates ─────────────────────────────────────────────────

function makeItem(name: string): FeeItem {
  return { id: crypto.randomUUID(), name, amount: 0, description: "", isActive: true };
}

const FIELD_HIRE_DEFAULTS: FeeItem[] = [
  makeItem("Full Field – Per Hour"),
  makeItem("Full Field – Half Day"),
  makeItem("Full Field – Full Day"),
  makeItem("Half Field – Per Hour"),
  makeItem("Quarter Field – Per Hour"),
  makeItem("Individual Training – 30 mins"),
  makeItem("Individual Training – 1 Hour"),
];

const CLUB_DEFAULTS: Record<string, FeeItem[]> = {
  season: [
    makeItem("Junior Competition"),
    makeItem("Senior Competition"),
    makeItem("Masters Competition"),
    makeItem("Social Member Competition"),
  ],
  training: [
    makeItem("Club Training Session"),
    makeItem("Junior Squad Training"),
  ],
  member: [
    makeItem("Full Playing Member"),
    makeItem("Social Member"),
    makeItem("Life Member"),
  ],
  fieldHire: FIELD_HIRE_DEFAULTS,
  venueHire: [
    makeItem("Meeting Room – Per Hour"),
    makeItem("Meeting Room – Half Day"),
    makeItem("Meeting Room – Full Day"),
    makeItem("Gym/Training Room – Per Hour"),
  ],
};

const ASSOC_DEFAULTS: Record<string, FeeItem[]> = {
  season: [
    makeItem("Junior Season Fee"),
    makeItem("Senior Season Fee"),
    makeItem("Masters Season Fee"),
  ],
  fieldHire: FIELD_HIRE_DEFAULTS,
  tournament: [
    makeItem("Tournament Entry Fee"),
    makeItem("Individual Tournament Fee"),
  ],
  repTrial: [makeItem("Representative Trial Fee")],
  training: [
    makeItem("Regional Training Session"),
    makeItem("State Squad Session"),
  ],
  travel: [
    makeItem("Per Day Allowance"),
    makeItem("Interstate Trip Allowance"),
  ],
  other: [],
};

// ─── Helper ────────────────────────────────────────────────────────────────

function buildCategories(
  categoryDefs: Omit<FeeCategory, "fees">[],
  defaults: Record<string, FeeItem[]>,
  savedFees: FeesStructure
): FeeCategory[] {
  return categoryDefs.map((cat) => {
    const saved = savedFees[cat.key];
    // Use saved fees if present (even if empty array), otherwise use defaults
    const fees =
      saved !== undefined
        ? saved.map((f) => ({ ...f, description: f.description ?? "" }))
        : (defaults[cat.key] ?? []).map((f) => ({ ...f, id: crypto.randomUUID() }));
    return { ...cat, fees };
  });
}

// ─── Sub-components ─────────────────────────────────────────────────────────

interface CategoryCardProps {
  category: FeeCategory;
  accentColor: string;
  onUpdate: (updatedFees: FeeItem[]) => void;
}

function CategoryCard({ category, accentColor, onUpdate }: CategoryCardProps) {
  const [expanded, setExpanded] = useState(true);

  function addFee() {
    onUpdate([
      ...category.fees,
      { id: crypto.randomUUID(), name: "", amount: 0, description: "", isActive: true },
    ]);
  }

  function updateFee(id: string, field: keyof FeeItem, value: string | number | boolean) {
    onUpdate(
      category.fees.map((f) => (f.id === id ? { ...f, [field]: value } : f))
    );
  }

  function removeFee(id: string) {
    onUpdate(category.fees.filter((f) => f.id !== id));
  }

  return (
    <div className="bg-white rounded-2xl shadow border border-slate-200 overflow-hidden">
      {/* Card Header */}
      <button
        type="button"
        className="w-full flex items-center justify-between p-5 text-left hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded((prev) => !prev)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{category.icon}</span>
          <div>
            <h3 className="text-lg font-black text-[#06054e]">{category.label}</h3>
            <p className="text-sm text-slate-500 font-medium">{category.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-slate-400">
            {category.fees.filter((f) => f.isActive).length} active fee
            {category.fees.filter((f) => f.isActive).length !== 1 ? "s" : ""}
          </span>
          {expanded ? (
            <ChevronUp size={20} className="text-slate-400" />
          ) : (
            <ChevronDown size={20} className="text-slate-400" />
          )}
        </div>
      </button>

      {/* Card Body */}
      {expanded && (
        <div className="border-t border-slate-100 p-5">
          {category.fees.length === 0 ? (
            <p className="text-slate-400 font-medium text-sm italic mb-4">
              No fees configured for this category yet.
            </p>
          ) : (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b-2 border-slate-100">
                    <th className="text-left font-black text-slate-600 pb-2 pr-3 w-[30%]">
                      Fee Name
                    </th>
                    <th className="text-left font-black text-slate-600 pb-2 pr-3 w-[15%]">
                      Amount ($)
                    </th>
                    <th className="text-left font-black text-slate-600 pb-2 pr-3 w-[35%]">
                      Description
                    </th>
                    <th className="text-center font-black text-slate-600 pb-2 pr-3 w-[10%]">
                      Active
                    </th>
                    <th className="w-[5%]" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {category.fees.map((fee) => (
                    <tr key={fee.id} className={`${!fee.isActive ? "opacity-50" : ""}`}>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#06054e]/20 focus:border-[#06054e]"
                          placeholder="Fee name"
                          value={fee.name}
                          onChange={(e) => updateFee(fee.id, "name", e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-[#06054e]/20 focus-within:border-[#06054e]">
                          <span className="px-2 py-1.5 bg-slate-50 text-slate-500 font-bold text-sm border-r border-slate-200">
                            $
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="flex-1 px-2 py-1.5 text-sm font-medium focus:outline-none"
                            value={fee.amount}
                            onChange={(e) =>
                              updateFee(fee.id, "amount", parseFloat(e.target.value) || 0)
                            }
                          />
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          type="text"
                          className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-600 focus:outline-none focus:ring-2 focus:ring-[#06054e]/20 focus:border-[#06054e]"
                          placeholder="Optional description"
                          value={fee.description ?? ""}
                          onChange={(e) => updateFee(fee.id, "description", e.target.value)}
                        />
                      </td>
                      <td className="py-2 pr-3 text-center">
                        <input
                          type="checkbox"
                          className="w-4 h-4 rounded accent-[#06054e] cursor-pointer"
                          checked={fee.isActive}
                          onChange={(e) => updateFee(fee.id, "isActive", e.target.checked)}
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => removeFee(fee.id)}
                          className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded"
                          title="Remove fee"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button
            type="button"
            onClick={addFee}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl border-2 border-dashed border-slate-300 text-slate-500 hover:border-[#06054e] hover:text-[#06054e] transition-colors"
          >
            <Plus size={16} />
            Add Fee
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function FeeManager({
  entityType,
  entityId,
  entityName,
  primaryColor = "#06054e",
}: FeeManagerProps) {
  const categoryDefs = entityType === "club" ? CLUB_CATEGORIES : ASSOC_CATEGORIES;
  const defaults = entityType === "club" ? CLUB_DEFAULTS : ASSOC_DEFAULTS;

  const [categories, setCategories] = useState<FeeCategory[]>(() =>
    buildCategories(categoryDefs, defaults, {})
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const apiBase =
    entityType === "club"
      ? `/api/admin/clubs/${entityId}/fees`
      : `/api/admin/associations/${entityId}/fees`;

  // ── Fetch on mount ────────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function fetchFees() {
      try {
        const res = await fetch(apiBase, { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load fees (${res.status})`);
        const data = await res.json();
        if (!cancelled) {
          const savedFees: FeesStructure = data.fees || {};
          setCategories(buildCategories(categoryDefs, defaults, savedFees));
        }
      } catch (err) {
        if (!cancelled) {
          console.error("FeeManager fetch error:", err);
          // Keep defaults on error
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchFees();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase]);

  // ── Update a category's fees ──────────────────────────────────────────────
  const updateCategoryFees = useCallback((key: string, updatedFees: FeeItem[]) => {
    setCategories((prev) =>
      prev.map((cat) => (cat.key === key ? { ...cat, fees: updatedFees } : cat))
    );
  }, []);

  // ── Save all fees ─────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true);
    setMessage(null);

    const feesStructure: FeesStructure = {};
    for (const cat of categories) {
      feesStructure[cat.key] = cat.fees;
    }

    try {
      const res = await fetch(apiBase, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fees: feesStructure }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Save failed (${res.status})`);
      }

      setMessage({ type: "success", text: "Fees saved successfully!" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred";
      setMessage({ type: "error", text: msg });
    } finally {
      setSaving(false);
      // Auto-clear message after 4 seconds
      setTimeout(() => setMessage(null), 4000);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-10 h-10 border-4 border-t-transparent rounded-full animate-spin"
            style={{ borderColor: primaryColor, borderTopColor: "transparent" }}
          />
          <p className="text-slate-500 font-bold">Loading fees…</p>
        </div>
      </div>
    );
  }

  const totalActiveFees = categories.reduce(
    (sum, cat) => sum + cat.fees.filter((f) => f.isActive).length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl shadow p-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-2xl font-black shadow"
              style={{ backgroundColor: primaryColor }}
            >
              💵
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#06054e]">Fee Management</h1>
              <p className="text-slate-500 font-bold">{entityName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="px-4 py-2 bg-slate-100 rounded-xl text-sm font-bold text-slate-600">
              {totalActiveFees} active fee{totalActiveFees !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>

      {/* Toast Message */}
      {message && (
        <div
          className={`rounded-xl px-5 py-4 font-bold border-2 ${
            message.type === "success"
              ? "bg-green-50 border-green-400 text-green-800"
              : "bg-red-50 border-red-400 text-red-800"
          }`}
        >
          {message.type === "success" ? "✅" : "❌"} {message.text}
        </div>
      )}

      {/* Category Cards */}
      {categories.map((category) => (
        <CategoryCard
          key={category.key}
          category={category}
          accentColor={primaryColor}
          onUpdate={(updatedFees) => updateCategoryFees(category.key, updatedFees)}
        />
      ))}

      {/* Save Button */}
      <div className="bg-white rounded-2xl shadow p-6 flex items-center justify-between">
        <p className="text-slate-500 font-medium text-sm">
          Changes are not auto-saved. Click Save All Fees when ready.
        </p>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl font-black text-base shadow-lg transition-colors"
        >
          <Save size={20} />
          {saving ? "Saving…" : "Save All Fees"}
        </button>
      </div>
    </div>
  );
}
