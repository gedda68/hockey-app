"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Save, X, UserCog } from "lucide-react";

interface Role {
  roleId: string;
  name: string;
  description: string;
  category: "Participant" | "Official" | "Administrator" | "Support";
  clubId?: string | null;
  icon?: string;
  color?: string;
  defaultPermissions: string[];
  active: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  "Participant",
  "Official",
  "Administrator",
  "Support",
] as const;

const CATEGORY_COLORS = {
  Participant: "bg-blue-100 text-blue-700",
  Official: "bg-green-100 text-green-700",
  Administrator: "bg-purple-100 text-purple-700",
  Support: "bg-orange-100 text-orange-700",
};

export default function ConfigRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    category: "Participant" as Role["category"],
    icon: "👤",
    color: "#6b7280",
    active: true,
  });

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/config/roles");
      const data = await res.json();
      setRoles(data);
    } catch (error) {
      console.error("Error fetching roles:", error);
      alert("Failed to load roles");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdd = () => {
    setIsAdding(true);
    setFormData({
      name: "",
      description: "",
      category: "Participant",
      icon: "👤",
      color: "#6b7280",
      active: true,
    });
  };

  const handleEdit = (role: Role) => {
    setEditingId(role.roleId);
    setFormData({
      name: role.name,
      description: role.description,
      category: role.category,
      icon: role.icon || "👤",
      color: role.color || "#6b7280",
      active: role.active,
    });
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: "",
      description: "",
      category: "Participant",
      icon: "👤",
      color: "#6b7280",
      active: true,
    });
  };

  const handleSaveNew = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      const res = await fetch("/api/admin/config/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to create");
      }

      await fetchRoles();
      handleCancel();
    } catch (error: any) {
      console.error("Error creating role:", error);
      alert(error.message || "Failed to create role");
    }
  };

  const handleSaveEdit = async () => {
    if (!formData.name.trim()) {
      alert("Name is required");
      return;
    }

    try {
      const res = await fetch("/api/admin/config/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: editingId,
          ...formData,
        }),
      });

      if (!res.ok) throw new Error("Failed to update");

      await fetchRoles();
      handleCancel();
    } catch (error) {
      console.error("Error updating role:", error);
      alert("Failed to update role");
    }
  };

  const handleDelete = async (roleId: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/admin/config/roles?id=${roleId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to delete");
        return;
      }

      await fetchRoles();
    } catch (error) {
      console.error("Error deleting role:", error);
      alert("Failed to delete role");
    }
  };

  const handleToggleActive = async (role: Role) => {
    try {
      const res = await fetch("/api/admin/config/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: role.roleId,
          active: !role.active,
        }),
      });

      if (!res.ok) throw new Error("Failed to update status");

      await fetchRoles();
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  const groupedRoles = roles.reduce((acc, role) => {
    if (!acc[role.category]) {
      acc[role.category] = [];
    }
    acc[role.category].push(role);
    return acc;
  }, {} as Record<string, Role[]>);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase text-[#06054e] flex items-center gap-3">
              <UserCog className="text-yellow-500" />
              Member Roles
            </h1>
            <p className="text-slate-600 mt-2">
              Manage member role types (Player, Coach, Volunteer, etc.)
            </p>
          </div>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg"
          >
            <Plus size={20} />
            Add Role
          </button>
        </div>

        {/* Add New Form */}
        {isAdding && (
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-yellow-400">
            <h2 className="text-xl font-black uppercase text-[#06054e] mb-4">
              New Role
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
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
                  placeholder="e.g., Statistician, Photographer"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Category *
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
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold"
                  placeholder="Brief description of this role"
                  rows={2}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Icon (Emoji)
                </label>
                <input
                  type="text"
                  value={formData.icon}
                  onChange={(e) =>
                    setFormData({ ...formData, icon: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-2xl"
                  placeholder="👤"
                  maxLength={2}
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                  Color
                </label>
                <div className="flex gap-3 items-center">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-16 h-12 rounded-lg border-2 border-slate-200 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-mono"
                    placeholder="#6b7280"
                  />
                </div>
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

        {/* Roles by Category */}
        {isLoading ? (
          <div className="bg-white p-12 rounded-[2rem] shadow-xl text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06054e]"></div>
            <p className="mt-4 text-slate-600 font-bold">Loading...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {CATEGORIES.map((category) => (
              <div
                key={category}
                className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden"
              >
                <div className="bg-gradient-to-r from-[#06054e] to-[#090836] p-4">
                  <h2 className="text-xl font-black uppercase text-white flex items-center gap-2">
                    {category} ({groupedRoles[category]?.length || 0})
                  </h2>
                </div>

                {groupedRoles[category] && groupedRoles[category].length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b-2 border-slate-200 bg-slate-50">
                          <th className="text-left py-3 px-6 text-xs font-black text-slate-700 uppercase">
                            Icon
                          </th>
                          <th className="text-left py-3 px-6 text-xs font-black text-slate-700 uppercase">
                            Name
                          </th>
                          <th className="text-left py-3 px-6 text-xs font-black text-slate-700 uppercase">
                            Description
                          </th>
                          <th className="text-center py-3 px-6 text-xs font-black text-slate-700 uppercase">
                            Status
                          </th>
                          <th className="text-right py-3 px-6 text-xs font-black text-slate-700 uppercase">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {groupedRoles[category].map((role, index) => (
                          <tr
                            key={role.roleId}
                            className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                              index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                            }`}
                          >
                            <td className="py-3 px-6">
                              <span className="text-2xl">
                                {role.icon || "👤"}
                              </span>
                            </td>

                            <td className="py-3 px-6">
                              {editingId === role.roleId ? (
                                <input
                                  type="text"
                                  value={formData.name}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      name: e.target.value,
                                    })
                                  }
                                  className="w-full p-2 bg-white border-2 border-yellow-400 rounded-lg font-bold"
                                />
                              ) : (
                                <span className="font-bold text-slate-900">
                                  {role.name}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-6">
                              {editingId === role.roleId ? (
                                <input
                                  type="text"
                                  value={formData.description}
                                  onChange={(e) =>
                                    setFormData({
                                      ...formData,
                                      description: e.target.value,
                                    })
                                  }
                                  className="w-full p-2 bg-white border-2 border-yellow-400 rounded-lg font-bold text-sm"
                                />
                              ) : (
                                <span className="text-sm text-slate-600">
                                  {role.description}
                                </span>
                              )}
                            </td>

                            <td className="py-3 px-6 text-center">
                              <button
                                onClick={() => handleToggleActive(role)}
                                className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase transition-all ${
                                  role.active
                                    ? "bg-green-100 text-green-700 hover:bg-green-200"
                                    : "bg-red-100 text-red-700 hover:bg-red-200"
                                }`}
                              >
                                {role.active ? "Active" : "Inactive"}
                              </button>
                            </td>

                            <td className="py-3 px-6">
                              <div className="flex justify-end gap-2">
                                {editingId === role.roleId ? (
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
                                      onClick={() => handleEdit(role)}
                                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Edit size={16} />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handleDelete(role.roleId, role.name)
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
                  </div>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <p className="font-bold">
                      No {category.toLowerCase()} roles
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
