"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, UserCircle } from "lucide-react";

interface Gender {
  genderId: string;
  name: string;
  isActive: boolean;
  displayOrder: number;
  usageCount?: number;
  createdAt: string;
  updatedAt: string;
}

export default function ConfigGenderPage() {
  const [genders, setGenders] = useState<Gender[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    isActive: true,
  });

  useEffect(() => {
    fetchGenders();
  }, []);

  const fetchGenders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/gender");
      const data = await res.json();
      setGenders(data);
    } catch (error) {
      console.error("Error fetching genders:", error);
      alert("Failed to load gender options");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({ name: "", isActive: true });
  };

  const handleEdit = (gender: Gender) => {
    setEditingId(gender.genderId);
    setFormData({
      name: gender.name,
      isActive: gender.isActive,
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: "", isActive: true });
  };

  const handleSaveNew = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      const res = await fetch("/api/admin/config/gender", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create");
      }

      await fetchGenders();
      handleCancel();
    } catch (error: any) {
      console.error("Error creating gender:", error);
      alert(error.message || "Failed to create gender option");
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      const res = await fetch("/api/admin/config/gender", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genderId: editingId,
          ...formData,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      await fetchGenders();
      handleCancel();
    } catch (error) {
      console.error("Error updating gender:", error);
      alert("Failed to update gender option");
    }
  };

  const handleDelete = async (genderId: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/config/gender?id=${genderId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to delete");
        return;
      }

      await fetchGenders();
    } catch (error) {
      console.error("Error deleting gender:", error);
      alert("Failed to delete gender option");
    }
  };

  const handleToggleActive = async (gender: Gender) => {
    try {
      const res = await fetch("/api/admin/config/gender", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          genderId: gender.genderId,
          isActive: !gender.isActive,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      await fetchGenders();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase text-[#06054e] flex items-center gap-3">
              <UserCircle className="text-yellow-500" />
              Gender Options
            </h1>
            <p className="text-slate-600 mt-2">
              Manage gender options for member registration
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg"
          >
            <Plus size={20} />
            Add Gender Option
          </button>
        </div>

        {/* Add New Form */}
        {isAdding && (
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-yellow-400">
            <h2 className="text-xl font-black uppercase text-[#06054e] mb-4">
              New Gender Option
            </h2>

            <div className="mb-4">
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
                placeholder="e.g., Non-binary, Genderfluid"
                autoFocus
              />
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

        {/* Gender Options List */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#06054e] to-[#090836] p-6">
            <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2">
              <UserCircle size={24} />
              All Gender Options ({genders.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06054e]"></div>
                <p className="mt-4 text-slate-600 font-bold">Loading...</p>
              </div>
            ) : genders.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    <th className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase">
                      Name
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
                  {genders.map((gender, index) => (
                    <tr
                      key={gender.genderId}
                      className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                        index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                      }`}
                    >
                      <td className="py-4 px-6">
                        {editingId === gender.genderId ? (
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
                            {gender.name}
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-6 text-center">
                        <span className="text-sm text-slate-600 font-bold">
                          {gender.usageCount || 0}{" "}
                          {gender.usageCount === 1 ? "use" : "uses"}
                        </span>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <button
                          onClick={() => handleToggleActive(gender)}
                          className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase transition-all ${
                            gender.isActive
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-red-100 text-red-700 hover:bg-red-200"
                          }`}
                        >
                          {gender.isActive ? "Active" : "Inactive"}
                        </button>
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex justify-end gap-2">
                          {editingId === gender.genderId ? (
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
                                onClick={() => handleEdit(gender)}
                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() =>
                                  handleDelete(gender.genderId, gender.name)
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
                <UserCircle className="mx-auto mb-4 text-slate-300" size={48} />
                <p className="text-slate-600 font-bold">
                  No gender options found
                </p>
                <button
                  onClick={handleAdd}
                  className="mt-4 text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                >
                  Create your first gender option
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
