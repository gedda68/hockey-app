"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, Users } from "lucide-react";

interface Relationship {
  relationshipId: string;
  name: string;
  category: "Family" | "Friend" | "Professional" | "Other";
  isActive: boolean;
  displayOrder: number;
  usageCount?: number;
  lastUsed?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ConfigRelationshipsPage() {
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    category: "Family" as Relationship["category"],
    isActive: true,
  });

  useEffect(() => {
    fetchRelationships();
  }, []);

  const fetchRelationships = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/relationships");
      const data = await res.json();
      setRelationships(data);
    } catch (error) {
      console.error("Error fetching relationships:", error);
      alert("Failed to load relationships");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({ name: "", category: "Family", isActive: true });
  };

  const handleEdit = (relationship: Relationship) => {
    setEditingId(relationship.relationshipId);
    setFormData({
      name: relationship.name,
      category: relationship.category,
      isActive: relationship.isActive,
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", category: "Family", isActive: true });
  };

  const handleSaveNew = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      const res = await fetch("/api/admin/config/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error("Failed to create relationship");

      await fetchRelationships();
      handleCancel();
    } catch (error) {
      console.error("Error creating relationship:", error);
      alert("Failed to create relationship");
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      const res = await fetch("/api/admin/config/relationships", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationshipId: editingId,
          ...formData,
        }),
      });

      if (!res.ok) throw new Error("Failed to update relationship");

      await fetchRelationships();
      handleCancel();
    } catch (error) {
      console.error("Error updating relationship:", error);
      alert("Failed to update relationship");
    }
  };

  const handleDelete = async (relationshipId: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      const res = await fetch(
        `/api/admin/config/relationships?id=${relationshipId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to delete relationship");
        return;
      }

      await fetchRelationships();
    } catch (error) {
      console.error("Error deleting relationship:", error);
      alert("Failed to delete relationship");
    }
  };

  const handleToggleActive = async (relationship: Relationship) => {
    try {
      const res = await fetch("/api/admin/config/relationships", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          relationshipId: relationship.relationshipId,
          isActive: !relationship.isActive,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      await fetchRelationships();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase text-[#06054e] flex items-center gap-3">
              <Users className="text-yellow-500" />
              Relationship Types
            </h1>
            <p className="text-slate-600 mt-2">
              Manage emergency contact relationship types
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg"
          >
            <Plus size={20} />
            Add Relationship
          </button>
        </div>

        {/* Add New Form */}
        {isAdding && (
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-yellow-400">
            <h2 className="text-xl font-black uppercase text-[#06054e] mb-4">
              New Relationship Type
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  placeholder="e.g., Parent, Spouse, Friend"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value as any,
                    })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                >
                  <option value="Family">Family</option>
                  <option value="Friend">Friend</option>
                  <option value="Professional">Professional</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveNew}
                className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
              >
                <Save size={18} />
                Save
              </button>
              <button
                onClick={handleCancel}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition-all"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Relationships Table */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#06054e] to-[#090836] p-6">
            <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2">
              <Users size={24} />
              All Relationships ({relationships.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06054e]"></div>
                <p className="mt-4 text-slate-600 font-bold">Loading...</p>
              </div>
            ) : relationships.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Name
                    </th>
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Category
                    </th>
                    <th className="text-center py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Usage
                    </th>
                    <th className="text-center py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Status
                    </th>
                    <th className="text-right py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {relationships.map((relationship, index) => (
                    <tr
                      key={relationship.relationshipId}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="py-4 px-6">
                        {editingId === relationship.relationshipId ? (
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) =>
                              setFormData({ ...formData, name: e.target.value })
                            }
                            className="w-full p-2 bg-white border-2 border-yellow-400 rounded-lg font-bold"
                          />
                        ) : (
                          <span className="font-bold text-slate-900">
                            {relationship.name}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6">
                        {editingId === relationship.relationshipId ? (
                          <select
                            value={formData.category}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                category: e.target.value as any,
                              })
                            }
                            className="w-full p-2 bg-white border-2 border-yellow-400 rounded-lg font-bold"
                          >
                            <option value="Family">Family</option>
                            <option value="Friend">Friend</option>
                            <option value="Professional">Professional</option>
                            <option value="Other">Other</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase ${
                              relationship.category === "Family"
                                ? "bg-blue-100 text-blue-700"
                                : relationship.category === "Friend"
                                ? "bg-green-100 text-green-700"
                                : relationship.category === "Professional"
                                ? "bg-purple-100 text-purple-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {relationship.category}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className="text-sm text-slate-600 font-bold">
                          {relationship.usageCount || 0}{" "}
                          {relationship.usageCount === 1 ? "use" : "uses"}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleToggleActive(relationship)}
                          className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase transition-all ${
                            relationship.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {relationship.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          {editingId === relationship.relationshipId ? (
                            <>
                              <button
                                onClick={handleSaveEdit}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Save"
                              >
                                <Save size={16} />
                              </button>
                              <button
                                onClick={handleCancel}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Cancel"
                              >
                                <X size={16} />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleEdit(relationship)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(
                                    relationship.relationshipId,
                                    relationship.name
                                  )
                                }
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <Users className="mx-auto mb-4 text-slate-300" size={48} />
                <p className="text-slate-600 font-bold">
                  No relationship types found
                </p>
                <button
                  onClick={handleAdd}
                  className="mt-4 text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                >
                  Create your first relationship type
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
