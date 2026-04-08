// app/(admin)/admin/associations/[associationId]/colors/page.tsx
// Brand color configuration for association

"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Save, Palette, RefreshCw } from "lucide-react";

interface Association {
  associationId: string;
  name: string;
  code: string;
  branding?: {
    primaryColor?: string;
    secondaryColor?: string;
    tertiaryColor?: string;
  };
}

export default function AssociationColorsPage({
  params,
}: {
  params: Promise<{ associationId: string }>;
}) {
  const { associationId } = use(params);
  const [association, setAssociation] = useState<Association | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [colors, setColors] = useState({
    primaryColor: "#06054e",
    secondaryColor: "#FFD700",
    tertiaryColor: "#FFFFFF",
  });

  useEffect(() => {
    fetchAssociation();
  }, [associationId]);

  const fetchAssociation = async () => {
    try {
      const res = await fetch(`/api/admin/associations/${associationId}`);
      if (!res.ok) throw new Error("Failed to fetch");

      const data = await res.json();
      setAssociation(data);

      if (data.branding) {
        setColors({
          primaryColor: data.branding.primaryColor || "#06054e",
          secondaryColor: data.branding.secondaryColor || "#FFD700",
          tertiaryColor: data.branding.tertiaryColor || "#FFFFFF",
        });
      }
    } catch (err) {
      setError("Failed to load association");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch(
        `/api/admin/associations/${associationId}/colors`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branding: colors }),
        }
      );

      if (!res.ok) throw new Error("Failed to save");

      setSuccess("Colors updated successfully!");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError("Failed to save colors");
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefaults = () => {
    setColors({
      primaryColor: "#06054e",
      secondaryColor: "#FFD700",
      tertiaryColor: "#FFFFFF",
    });
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

  if (!association) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 border-4 border-yellow-500 rounded-2xl p-8">
          <h2 className="text-2xl font-black text-yellow-800">
            Association Not Found
          </h2>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <Link
          href="/admin/associations"
          className="text-slate-600 hover:text-[#06054e] font-bold transition-colors"
        >
          Associations
        </Link>
        <span className="text-slate-400">/</span>
        <Link
          href={`/admin/associations/${associationId}`}
          className="text-slate-600 hover:text-[#06054e] font-bold transition-colors"
        >
          {association.name}
        </Link>
        <span className="text-slate-400">/</span>
        <span className="text-[#06054e] font-bold">Brand Colors</span>
      </div>

      {/* Header */}
      <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl text-white flex items-center justify-center font-black text-xl transition-colors"
              style={{ backgroundColor: colors.primaryColor }}
            >
              {association.code}
            </div>
            <div>
              <h1 className="text-3xl font-black text-[#06054e] flex items-center gap-3 uppercase">
                <Palette size={32} />
                Brand Colors
              </h1>
              <p className="text-lg text-slate-600 font-bold">
                {association.name}
              </p>
            </div>
          </div>
          <button
            onClick={resetToDefaults}
            className="px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw size={18} />
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border-4 border-red-500 rounded-2xl p-6 mb-6">
          <p className="text-red-800 font-bold">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border-4 border-green-500 rounded-2xl p-6 mb-6">
          <p className="text-green-800 font-bold">{success}</p>
        </div>
      )}

      {/* Color Configurator */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6">
          Configure Colors
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Primary Color */}
          <div>
            <label className="block text-sm font-black uppercase text-slate-600 mb-3">
              Primary Color
            </label>
            <div className="relative">
              <input
                type="color"
                value={colors.primaryColor}
                onChange={(e) =>
                  setColors({ ...colors, primaryColor: e.target.value })
                }
                className="w-full h-32 rounded-xl cursor-pointer border-4 border-slate-200 hover:border-[#06054e] transition-colors"
              />
              <input
                type="text"
                value={colors.primaryColor}
                onChange={(e) =>
                  setColors({ ...colors, primaryColor: e.target.value })
                }
                className="w-full mt-3 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-center uppercase focus:border-[#06054e] focus:outline-none"
                placeholder="#06054e"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 font-bold">
              Main brand color (Navy blue default)
            </p>
          </div>

          {/* Secondary Color */}
          <div>
            <label className="block text-sm font-black uppercase text-slate-600 mb-3">
              Secondary Color
            </label>
            <div className="relative">
              <input
                type="color"
                value={colors.secondaryColor}
                onChange={(e) =>
                  setColors({ ...colors, secondaryColor: e.target.value })
                }
                className="w-full h-32 rounded-xl cursor-pointer border-4 border-slate-200 hover:border-[#06054e] transition-colors"
              />
              <input
                type="text"
                value={colors.secondaryColor}
                onChange={(e) =>
                  setColors({ ...colors, secondaryColor: e.target.value })
                }
                className="w-full mt-3 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-center uppercase focus:border-[#06054e] focus:outline-none"
                placeholder="#FFD700"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 font-bold">
              Accent color (Gold/yellow default)
            </p>
          </div>

          {/* Tertiary Color */}
          <div>
            <label className="block text-sm font-black uppercase text-slate-600 mb-3">
              Tertiary Color
            </label>
            <div className="relative">
              <input
                type="color"
                value={colors.tertiaryColor}
                onChange={(e) =>
                  setColors({ ...colors, tertiaryColor: e.target.value })
                }
                className="w-full h-32 rounded-xl cursor-pointer border-4 border-slate-200 hover:border-[#06054e] transition-colors"
              />
              <input
                type="text"
                value={colors.tertiaryColor}
                onChange={(e) =>
                  setColors({ ...colors, tertiaryColor: e.target.value })
                }
                className="w-full mt-3 px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold text-center uppercase focus:border-[#06054e] focus:outline-none"
                placeholder="#FFFFFF"
              />
            </div>
            <p className="text-xs text-slate-500 mt-2 font-bold">
              Additional accent color
            </p>
          </div>
        </div>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-6">
        <h2 className="text-2xl font-black text-[#06054e] mb-6">
          Live Preview
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Preview */}
          <div
            className="rounded-2xl p-6 text-white transition-colors"
            style={{ backgroundColor: colors.primaryColor }}
          >
            <h3 className="text-xl font-black mb-2">{association.name}</h3>
            <p className="font-bold opacity-90 mb-4">
              Primary color card example
            </p>
            <button
              className="mt-4 px-6 py-3 rounded-xl font-black transition-all hover:scale-105"
              style={{
                backgroundColor: colors.secondaryColor,
                color: colors.primaryColor,
              }}
            >
              Button Example
            </button>
          </div>

          {/* Badge Preview */}
          <div className="bg-slate-50 rounded-2xl p-6">
            <h3 className="text-lg font-black text-slate-700 mb-4">
              Badge Examples
            </h3>
            <div className="space-y-3">
              <div
                className="inline-block px-4 py-2 rounded-xl font-black text-white transition-all hover:scale-105"
                style={{ backgroundColor: colors.primaryColor }}
              >
                Primary Badge
              </div>
              <br />
              <div
                className="inline-block px-4 py-2 rounded-xl font-black transition-all hover:scale-105"
                style={{
                  backgroundColor: colors.secondaryColor,
                  color: colors.primaryColor,
                }}
              >
                Secondary Badge
              </div>
              <br />
              <div
                className="inline-block px-4 py-2 rounded-xl font-black border-4 transition-all hover:scale-105"
                style={{
                  borderColor: colors.primaryColor,
                  color: colors.primaryColor,
                  backgroundColor: colors.tertiaryColor,
                }}
              >
                Outlined Badge
              </div>
            </div>
          </div>
        </div>

        {/* Hex Values Display */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl">
          <p className="text-sm font-black uppercase text-slate-600 mb-2">
            Color Values:
          </p>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-slate-500 font-bold">Primary:</span>{" "}
              <span className="font-black text-slate-900">
                {colors.primaryColor.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-bold">Secondary:</span>{" "}
              <span className="font-black text-slate-900">
                {colors.secondaryColor.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-bold">Tertiary:</span>{" "}
              <span className="font-black text-slate-900">
                {colors.tertiaryColor.toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <Link
          href={`/admin/associations/${associationId}`}
          className="px-8 py-4 bg-slate-200 text-slate-700 rounded-xl font-black hover:bg-slate-300 transition-all"
        >
          Cancel
        </Link>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-8 py-4 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all inline-flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={20} />
          {isSaving ? "Saving..." : "Save Colors"}
        </button>
      </div>
    </div>
  );
}
