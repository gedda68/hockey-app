// components/admin/config/ConfigTable.tsx
// FIXED: Proper row editing isolation

"use client";

import { useState } from "react";
import { Plus, Edit, Trash2, Save, X, LucideIcon } from "lucide-react";

export interface ConfigItem {
  _id?: any;
  configType: string;
  id: string;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  displayOrder: number;
  usageCount?: number;
  lastUsed?: string | null;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string | null;
}

interface ConfigTableProps {
  items: ConfigItem[];
  isLoading: boolean;
  configType: string;
  title: string;
  icon: LucideIcon;
  singularName: string;
  fields: {
    name: string;
    label: string;
    type: "text" | "textarea" | "number" | "select";
    required?: boolean;
    placeholder?: string;
    options?: { value: string; label: string }[];
  }[];
  onAdd: (data: any) => Promise<void>;
  onEdit: (id: string, data: any) => Promise<void>;
  onDelete: (id: string, name: string) => Promise<void>;
  onToggleActive: (item: ConfigItem) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function ConfigTable({
  items,
  isLoading,
  configType,
  title,
  icon: Icon,
  singularName,
  fields,
  onAdd,
  onEdit,
  onDelete,
  onToggleActive,
  onRefresh,
}: ConfigTableProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);

  const initializeForm = (item?: ConfigItem) => {
    const data: any = { isActive: true };
    fields.forEach((field) => {
      data[field.name] = item ? item[field.name] || "" : "";
    });
    return data;
  };

  const handleAdd = () => {
    setIsAdding(true);
    setFormData(initializeForm());
  };

  const handleEditClick = (item: ConfigItem) => {
    console.log("✏️ Edit clicked for item:", item.id, item);

    if (!item.id) {
      console.error("❌ Item has no ID!", item);
      alert("Error: Item has no ID. Please refresh and try again.");
      return;
    }

    setEditingId(item.id);
    const data: any = { isActive: item.isActive };
    fields.forEach((field) => {
      data[field.name] = item[field.name] || "";
    });
    setFormData(data);

    console.log("📝 Form data set:", data);
    console.log("🎯 Editing ID set to:", item.id);
  };

  const handleCancel = () => {
    console.log("❌ Cancelled editing");
    setIsAdding(false);
    setEditingId(null);
    setFormData({});
  };

  const validateForm = () => {
    for (const field of fields) {
      if (field.required && !formData[field.name]?.trim()) {
        alert(`${field.label} is required`);
        return false;
      }
    }
    return true;
  };

  const handleSaveNew = async () => {
    if (!validateForm()) return;

    setIsSaving(true);
    try {
      await onAdd(formData);
      handleCancel();
      await onRefresh();
    } catch (error: any) {
      alert(error.message || `Failed to create ${singularName.toLowerCase()}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!validateForm() || !editingId) return;

    console.log("💾 Saving edit for ID:", editingId);
    console.log("📦 Form data:", formData);

    setIsSaving(true);
    try {
      await onEdit(editingId, formData);
      handleCancel();
      await onRefresh();
    } catch (error: any) {
      console.error("❌ Save failed:", error);
      alert(error.message || `Failed to update ${singularName.toLowerCase()}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      await onDelete(id, name);
      await onRefresh();
    } catch (error: any) {
      alert(error.message || `Failed to delete ${singularName.toLowerCase()}`);
    }
  };

  const handleToggleClick = async (item: ConfigItem) => {
    try {
      await onToggleActive(item);
      await onRefresh();
    } catch (error: any) {
      alert(error.message || "Failed to update status");
    }
  };

  const renderField = (
    field: (typeof fields)[0],
    value: any,
    onChange: (val: any) => void,
  ) => {
    const commonClasses =
      "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400";

    switch (field.type) {
      case "textarea":
        return (
          <textarea
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={commonClasses}
            placeholder={field.placeholder}
            rows={3}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={commonClasses}
            placeholder={field.placeholder}
          />
        );

      case "select":
        return (
          <select
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={commonClasses}
          >
            <option value="">Select...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );

      default:
        return (
          <input
            type="text"
            value={value || ""}
            onChange={(e) => onChange(e.target.value)}
            className={commonClasses}
            placeholder={field.placeholder}
          />
        );
    }
  };

  // Debug: Log current state
  console.log("🔍 ConfigTable render - editingId:", editingId);
  console.log("🔍 Items count:", items.length);
  if (editingId) {
    console.log("🔍 Currently editing item ID:", editingId);
    console.log("🔍 Form data:", formData);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black uppercase text-[#06054e] flex items-center gap-3">
              <Icon className="text-yellow-500" size={40} />
              {title}
            </h1>
            <p className="text-slate-600 mt-2 font-bold">
              Manage {title.toLowerCase()} used throughout the system
            </p>
          </div>
          <button
            onClick={handleAdd}
            disabled={isAdding}
            className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-lg disabled:opacity-50"
          >
            <Plus size={20} />
            Add {singularName}
          </button>
        </div>

        {/* Add New Form */}
        {isAdding && (
          <div className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-yellow-400">
            <h2 className="text-xl font-black uppercase text-[#06054e] mb-4">
              New {singularName}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {fields.map((field) => (
                <div
                  key={field.name}
                  className={field.type === "textarea" ? "md:col-span-2" : ""}
                >
                  <label className="text-[10px] font-black uppercase text-slate-400 ml-2">
                    {field.label} {field.required && "*"}
                  </label>
                  {renderField(field, formData[field.name], (val) =>
                    setFormData({ ...formData, [field.name]: val }),
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSaveNew}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all disabled:opacity-50"
              >
                <Save size={18} />
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                <X size={18} />
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Items Table */}
        <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
          <div className="bg-gradient-to-r from-[#06054e] to-[#090836] p-6">
            <h2 className="text-2xl font-black uppercase text-white flex items-center gap-2">
              <Icon size={24} />
              All {title} ({items.length})
            </h2>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="p-12 text-center">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#06054e]"></div>
                <p className="mt-4 text-slate-600 font-bold">Loading...</p>
              </div>
            ) : items.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50">
                    {fields.map((field) => (
                      <th
                        key={field.name}
                        className="text-left py-4 px-6 text-xs font-black text-slate-700 uppercase"
                      >
                        {field.label}
                      </th>
                    ))}
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
                  {items.map((item, index) => {
                    // Debug each row
                    const isEditing = editingId === item.id;
                    if (isEditing) {
                      console.log(`🎯 Row ${index} is being edited:`, item.id);
                    }

                    return (
                      <tr
                        key={`item-${item.id}`}
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          index % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                        } ${isEditing ? "ring-2 ring-yellow-400" : ""}`}
                      >
                        {fields.map((field) => (
                          <td
                            key={`${item.id}-${field.name}`}
                            className="py-4 px-6"
                          >
                            {isEditing ? (
                              <div className="min-w-[150px]">
                                {renderField(
                                  field,
                                  formData[field.name],
                                  (val) =>
                                    setFormData({
                                      ...formData,
                                      [field.name]: val,
                                    }),
                                )}
                              </div>
                            ) : (
                              <span className="font-bold text-slate-900">
                                {item[field.name] || "-"}
                              </span>
                            )}
                          </td>
                        ))}

                        <td
                          key={`${item.id}-usage`}
                          className="py-4 px-6 text-center"
                        >
                          <span className="text-sm text-slate-600 font-bold">
                            {item.usageCount || 0}{" "}
                            {item.usageCount === 1 ? "use" : "uses"}
                          </span>
                        </td>

                        <td
                          key={`${item.id}-status`}
                          className="py-4 px-6 text-center"
                        >
                          <button
                            onClick={() => handleToggleClick(item)}
                            disabled={editingId !== null}
                            className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase transition-all disabled:opacity-50 ${
                              item.isActive
                                ? "bg-green-100 text-green-700 hover:bg-green-200"
                                : "bg-red-100 text-red-700 hover:bg-red-200"
                            }`}
                          >
                            {item.isActive ? "Active" : "Inactive"}
                          </button>
                        </td>

                        <td key={`${item.id}-actions`} className="py-4 px-6">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={isSaving}
                                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Save"
                                >
                                  <Save size={16} />
                                </button>
                                <button
                                  onClick={handleCancel}
                                  disabled={isSaving}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleEditClick(item)}
                                  disabled={editingId !== null}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Edit"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleDeleteClick(item.id, item.name)
                                  }
                                  disabled={editingId !== null}
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                  title="Delete"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-12 text-center">
                <Icon className="mx-auto mb-4 text-slate-300" size={48} />
                <p className="text-slate-600 font-bold">
                  No {title.toLowerCase()} found
                </p>
                <button
                  onClick={handleAdd}
                  className="mt-4 text-indigo-600 hover:text-indigo-800 font-bold text-sm"
                >
                  Create your first {singularName.toLowerCase()}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
