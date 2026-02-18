// app/(admin)/admin/settings/fee-categories/FeeCategoriesClient.tsx
// Client component for fee categories management

"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Save, RefreshCw, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";

const DEFAULT_CATEGORIES = [
  "Senior Men",
  "Senior Women",
  "Junior Boys",
  "Junior Girls",
  "Social Membership",
  "Masters Membership",
  "Volunteer",
  "Non Playing",
  "Levies",
  "Equipment",
  "Uniform",
  "Other",
];

export default function FeeCategoriesClient() {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/admin/config/fee-categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(Array.isArray(data) ? data : DEFAULT_CATEGORIES);
      } else {
        setCategories(DEFAULT_CATEGORIES);
      }
    } catch (error) {
      console.error("Error loading categories:", error);
      toast.error("Failed to load categories");
      setCategories(DEFAULT_CATEGORIES);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/config/fee-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories }),
      });

      if (!response.ok) {
        throw new Error("Failed to save");
      }

      toast.success("Fee categories updated successfully!");
    } catch (error) {
      console.error("Error saving:", error);
      toast.error("Failed to save categories");
    } finally {
      setIsSaving(false);
    }
  };

  const addCategory = () => {
    if (newCategory.trim()) {
      if (categories.includes(newCategory.trim())) {
        toast.error("Category already exists");
        return;
      }
      setCategories([...categories, newCategory.trim()]);
      setNewCategory("");
      toast.success("Category added");
    }
  };

  const removeCategory = (category: string) => {
    if (confirm(`Remove category "${category}"?`)) {
      setCategories(categories.filter(c => c !== category));
      toast.success("Category removed");
    }
  };

  const resetToDefaults = () => {
    if (
      confirm(
        "Reset to default categories? This will replace all current categories."
      )
    ) {
      setCategories(DEFAULT_CATEGORIES);
      toast.success("Reset to default categories");
    }
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index - 1]] = [
      newCategories[index - 1],
      newCategories[index],
    ];
    setCategories(newCategories);
  };

  const moveDown = (index: number) => {
    if (index === categories.length - 1) return;
    const newCategories = [...categories];
    [newCategories[index], newCategories[index + 1]] = [
      newCategories[index + 1],
      newCategories[index],
    ];
    setCategories(newCategories);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-black text-[#06054e] uppercase mb-2">
          Fee Categories
        </h1>
        <p className="text-lg text-slate-600 font-bold">
          Manage available fee categories for clubs and associations
        </p>
      </div>

      {/* Main Card */}
      <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-black uppercase text-[#06054e]">
            Available Categories
          </h2>
        </div>

        <div className="mb-6">
          <p className="text-slate-600 font-bold mb-4">
            These categories will be available when configuring fees for clubs
            and associations. Changes apply system-wide.
          </p>

          <div className="flex gap-3">
            <input
              type="text"
              value={newCategory}
              onChange={e => setNewCategory(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCategory();
                }
              }}
              className="flex-1 p-4 bg-slate-50 border border-slate-100 rounded-2xl focus:ring-2 ring-yellow-400 outline-none font-bold"
              placeholder="Enter new category name..."
            />
            <button
              onClick={addCategory}
              className="px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Add
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-black uppercase text-slate-500">
              {categories.length} Categor{categories.length !== 1 ? "ies" : "y"}
            </p>
            <button
              onClick={resetToDefaults}
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-[#06054e] font-bold"
            >
              <RefreshCw size={16} />
              Reset to Defaults
            </button>
          </div>

          {categories.map((category, index) => (
            <div
              key={category}
              className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border-2 border-slate-200 hover:border-[#06054e] transition-colors group"
            >
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="text-slate-400 hover:text-[#06054e] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move up"
                >
                  <ArrowUp size={16} />
                </button>
                <button
                  onClick={() => moveDown(index)}
                  disabled={index === categories.length - 1}
                  className="text-slate-400 hover:text-[#06054e] disabled:opacity-30 disabled:cursor-not-allowed"
                  title="Move down"
                >
                  <ArrowDown size={16} />
                </button>
              </div>

              <span className="flex-1 font-bold text-slate-700">
                {category}
              </span>

              <button
                onClick={() => removeCategory(category)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title="Remove category"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          {categories.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              <p className="font-bold">No categories configured</p>
              <p className="text-sm mt-2">Add a category to get started</p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex gap-4 justify-end mt-6">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-[#06054e] text-white rounded-2xl font-black uppercase flex items-center gap-2 hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {isSaving ? "Saving..." : "Save Changes"}
        </button>
      </div>
    </div>
  );
}