// app/(admin)/admin/news/page.tsx
// Admin news management page

"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { NewsItem } from "@/types/news";
import { toast } from "sonner";
import NewsFormModal, {
  type NewsEditorContext,
} from "@/components/admin/NewsFormModal";

export default function AdminNewsPage() {
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [editorContext, setEditorContext] = useState<NewsEditorContext | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);

  // Fetch news items
  const fetchNews = async () => {
    try {
      const res = await fetch("/api/admin/news");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setNewsItems(data);
          setEditorContext(null);
        } else {
          setNewsItems(data.items ?? []);
          const ec = data.editorContext;
          if (ec?.role) {
            setEditorContext({
              role: ec.role,
              defaultScopeType: ec.defaultScopeType ?? "platform",
              defaultScopeId: ec.defaultScopeId ?? null,
            });
          } else {
            setEditorContext(null);
          }
        }
      }
    } catch (error) {
      toast.error("Failed to fetch news");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this news item?")) return;

    try {
      const res = await fetch(`/api/admin/news/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("News item deleted");
        fetchNews();
      } else {
        toast.error("Failed to delete news item");
      }
    } catch (error) {
      toast.error("Failed to delete news item");
    }
  };

  const handleToggleActive = async (item: NewsItem) => {
    try {
      const res = await fetch(`/api/admin/news/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !item.active }),
      });

      if (res.ok) {
        toast.success(
          `News item ${!item.active ? "activated" : "deactivated"}`,
        );
        fetchNews();
      } else {
        toast.error("Failed to update news item");
      }
    } catch (error) {
      toast.error("Failed to update news item");
    }
  };

  const openEditForm = (item: NewsItem) => {
    setEditingNews(item);
    setIsFormOpen(true);
  };

  const openCreateForm = () => {
    setEditingNews(null);
    setIsFormOpen(true);
  };

  const handleFormSuccess = () => {
    setIsFormOpen(false);
    setEditingNews(null);
    fetchNews();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-[#06054e] uppercase">
            News Management
          </h1>
          <p className="text-slate-600 mt-2">
            News is scoped to each portal (platform, association, or club).
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="flex items-center gap-2 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-colors"
        >
          <Plus size={20} />
          Add News Item
        </button>
      </div>

      {/* News Items Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                Title
              </th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                Scope
              </th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                Publish Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                Expiry Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-black uppercase text-slate-600">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-black uppercase text-slate-600">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {newsItems.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-6 py-8 text-center text-slate-500"
                >
                  No news items found. Create your first news item to get
                  started.
                </td>
              </tr>
            ) : (
              newsItems.map((item) => {
                const isExpired = new Date(item.expiryDate) < new Date();
                const isNotYetPublished =
                  new Date(item.publishDate) > new Date();

                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900">
                        {item.title}
                      </div>
                      {item.author && (
                        <div className="text-sm text-slate-500">
                          By {item.author}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-xs font-mono text-slate-600">
                      {item.scopeType ?? "platform"}
                      {item.scopeId ? (
                        <span className="block text-[10px] text-slate-400 truncate max-w-[140px]">
                          {item.scopeId}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(item.publishDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {new Date(item.expiryDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold w-fit ${
                            item.active
                              ? "bg-green-100 text-green-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {item.active ? "Active" : "Inactive"}
                        </span>
                        {isExpired && (
                          <span className="text-xs text-orange-600">
                            Expired
                          </span>
                        )}
                        {isNotYetPublished && (
                          <span className="text-xs text-blue-600">
                            Scheduled
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleActive(item)}
                          className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                          title={item.active ? "Deactivate" : "Activate"}
                        >
                          {item.active ? (
                            <EyeOff size={18} className="text-slate-600" />
                          ) : (
                            <Eye size={18} className="text-slate-600" />
                          )}
                        </button>
                        <button
                          onClick={() => openEditForm(item)}
                          className="p-2 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={18} className="text-blue-600" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 size={18} className="text-red-600" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Form Modal */}
      <NewsFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingNews(null);
        }}
        onSuccess={handleFormSuccess}
        editingNews={editingNews}
        editorContext={editorContext}
      />
    </div>
  );
}
