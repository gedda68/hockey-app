// app/admin/global-config/salutations/page.tsx
// Admin CRUD page for salutations

"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, X } from "lucide-react";
import Link from "next/link";

interface Salutation {
  salutationId: string;
  name: string;
  fullName: string;
  category: string;
  isActive: boolean;
  displayOrder: number;
  usageCount: number;
}

export default function SalutationsPage() {
  const [salutations, setSalutations] = useState<Salutation[]>([]);
  const [filteredSalutations, setFilteredSalutations] = useState<Salutation[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showModal, setShowModal] = useState(false);
  const [editingSalutation, setEditingSalutation] = useState<Salutation | null>(
    null
  );
  const [formData, setFormData] = useState({
    name: "",
    fullName: "",
    category: "Standard",
    displayOrder: 99,
    isActive: true,
  });

  // Fetch salutations
  useEffect(() => {
    fetchSalutations();
  }, []);

  const fetchSalutations = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/global-config/salutations");
      const data = await res.json();
      setSalutations(data);
      setFilteredSalutations(data);
    } catch (error) {
      console.error("Error fetching salutations:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Filter salutations
  useEffect(() => {
    let filtered = salutations;

    // Category filter
    if (categoryFilter !== "All") {
      filtered = filtered.filter((s) => s.category === categoryFilter);
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(query) ||
          s.fullName.toLowerCase().includes(query)
      );
    }

    setFilteredSalutations(filtered);
  }, [searchQuery, categoryFilter, salutations]);

  // Group by category
  const salutationsByCategory = filteredSalutations.reduce((acc: any, sal) => {
    if (!acc[sal.category]) acc[sal.category] = [];
    acc[sal.category].push(sal);
    return acc;
  }, {});

  const categories = [
    "All",
    "Standard",
    "Professional",
    "Academic",
    "Military",
    "Other",
  ];

  // Handle add/edit
  const handleOpenModal = (salutation?: Salutation) => {
    if (salutation) {
      setEditingSalutation(salutation);
      setFormData({
        name: salutation.name,
        fullName: salutation.fullName,
        category: salutation.category,
        displayOrder: salutation.displayOrder,
        isActive: salutation.isActive,
      });
    } else {
      setEditingSalutation(null);
      setFormData({
        name: "",
        fullName: "",
        category: "Standard",
        displayOrder: 99,
        isActive: true,
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingSalutation(null);
  };

  const handleSave = async () => {
    try {
      const url = "/api/admin/global-config/salutations";
      const method = editingSalutation ? "PUT" : "POST";
      const body = editingSalutation
        ? { ...formData, salutationId: editingSalutation.salutationId }
        : formData;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchSalutations();
        handleCloseModal();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to save salutation");
      }
    } catch (error) {
      console.error("Error saving salutation:", error);
      alert("Failed to save salutation");
    }
  };

  const handleDelete = async (salutationId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      const res = await fetch(
        `/api/admin/global-config/salutations?salutationId=${salutationId}`,
        { method: "DELETE" }
      );

      if (res.ok) {
        await fetchSalutations();
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete salutation");
      }
    } catch (error) {
      console.error("Error deleting salutation:", error);
      alert("Failed to delete salutation");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#06054e]">
              Salutations / Titles
            </h1>
            <p className="text-slate-600 mt-2">
              Manage global salutations and titles
            </p>
          </div>
          <button
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all"
          >
            <Plus size={20} />
            Add Salutation
          </button>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="relative">
              <Search
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                placeholder="Search salutations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-yellow-400"
              />
            </div>

            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 ring-yellow-400"
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-[#06054e] mx-auto"></div>
            <p className="text-slate-600 mt-4">Loading salutations...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.keys(salutationsByCategory).length > 0 ? (
              Object.keys(salutationsByCategory).map((category) => (
                <div
                  key={category}
                  className="bg-white rounded-2xl shadow-lg border border-slate-100 p-6"
                >
                  <h2 className="text-xl font-black text-slate-700 mb-4">
                    {category}
                  </h2>
                  <div className="space-y-2">
                    {salutationsByCategory[category].map((sal: Salutation) => (
                      <div
                        key={sal.salutationId}
                        className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-all"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-black text-lg">
                              {sal.name}
                            </span>
                            {sal.fullName !== sal.name && (
                              <span className="text-sm text-slate-500">
                                ({sal.fullName})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span
                              className={`text-xs px-2 py-1 rounded ${
                                sal.isActive
                                  ? "bg-green-100 text-green-700"
                                  : "bg-red-100 text-red-700"
                              }`}
                            >
                              {sal.isActive ? "Active" : "Inactive"}
                            </span>
                            <span className="text-xs text-slate-500">
                              Order: {sal.displayOrder}
                            </span>
                            {sal.usageCount > 0 && (
                              <span className="text-xs text-slate-500">
                                Used: {sal.usageCount} times
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenModal(sal)}
                            className="p-2 hover:bg-slate-200 rounded-lg transition-all"
                            title="Edit"
                          >
                            <Edit2 size={18} className="text-slate-600" />
                          </button>
                          <button
                            onClick={() =>
                              handleDelete(sal.salutationId, sal.name)
                            }
                            className="p-2 hover:bg-red-100 rounded-lg transition-all"
                            title="Delete"
                          >
                            <Trash2 size={18} className="text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 p-12 text-center">
                <p className="text-slate-600">No salutations found</p>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-black text-[#06054e]">
                  {editingSalutation ? "Edit Salutation" : "Add Salutation"}
                </h2>
                <button
                  onClick={handleCloseModal}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="Mr"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={formData.fullName}
                    onChange={(e) =>
                      setFormData({ ...formData, fullName: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                    placeholder="Mister"
                  />
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  >
                    <option value="Standard">Standard</option>
                    <option value="Professional">Professional</option>
                    <option value="Academic">Academic</option>
                    <option value="Military">Military</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-black uppercase text-slate-400 ml-2">
                    Display Order
                  </label>
                  <input
                    type="number"
                    value={formData.displayOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        displayOrder: parseInt(e.target.value),
                      })
                    }
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) =>
                      setFormData({ ...formData, isActive: e.target.checked })
                    }
                    className="w-4 h-4 rounded border-slate-300 text-[#06054e] focus:ring-yellow-400"
                  />
                  <label
                    htmlFor="isActive"
                    className="text-sm font-bold text-slate-700"
                  >
                    Active
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={handleCloseModal}
                  className="flex-1 px-4 py-2 bg-slate-200 hover:bg-slate-300 rounded-xl font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-[#06054e] text-white hover:bg-yellow-400 hover:text-[#06054e] rounded-xl font-bold transition-all"
                >
                  {editingSalutation ? "Update" : "Create"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
