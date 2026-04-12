// components/admin/NewsFormModal.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Upload, Image as ImageIcon } from "lucide-react";
import { NewsItem } from "@/types/news";
import { toast } from "sonner";
import Image from "next/image";

export type NewsEditorContext = {
  role: string;
  defaultScopeType: "platform" | "association" | "club";
  defaultScopeId: string | null;
};

interface NewsFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingNews: NewsItem | null;
  editorContext: NewsEditorContext | null;
}

export default function NewsFormModal({
  isOpen,
  onClose,
  onSuccess,
  editingNews,
  editorContext,
}: NewsFormModalProps) {
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    publishDate: "",
    expiryDate: "",
    author: "",
    active: true,
  });
  const [superScopeType, setSuperScopeType] = useState<
    "platform" | "association" | "club"
  >("platform");
  const [superScopeId, setSuperScopeId] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editingNews) {
      setFormData({
        title: editingNews.title,
        content: editingNews.content,
        publishDate: new Date(editingNews.publishDate)
          .toISOString()
          .split("T")[0],
        expiryDate: new Date(editingNews.expiryDate)
          .toISOString()
          .split("T")[0],
        author: editingNews.author || "",
        active: editingNews.active,
      });
      setImagePreview(editingNews.image || editingNews.imageUrl || "");

      // Set content in contenteditable div
      if (contentRef.current) {
        contentRef.current.innerHTML = editingNews.content;
      }
    } else {
      // Reset form for new news
      const today = new Date().toISOString().split("T")[0];
      const monthFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      setFormData({
        title: "",
        content: "",
        publishDate: today,
        expiryDate: monthFromNow,
        author: "",
        active: true,
      });
      setImageFile(null);
      setImagePreview("");

      if (contentRef.current) {
        contentRef.current.innerHTML = "";
      }
      const d = editorContext?.defaultScopeType ?? "platform";
      setSuperScopeType(d);
      setSuperScopeId(editorContext?.defaultScopeId ?? "");
    }
  }, [editingNews, isOpen, editorContext]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be less than 5MB");
        return;
      }

      // Check file type
      if (!file.type.startsWith("image/")) {
        toast.error("File must be an image");
        return;
      }

      setImageFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Rich text formatting buttons
  const applyFormat = (command: string, value?: string) => {
    if (!contentRef.current) return;

    // Focus the editor first
    contentRef.current.focus();

    // Execute the command
    document.execCommand(command, false, value);
  };

  const handleContentChange = () => {
    // This ensures content is captured even if user types directly
    if (contentRef.current) {
      const html = contentRef.current.innerHTML;
      setFormData({ ...formData, content: html });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Get HTML content from contenteditable div
      const htmlContent = contentRef.current?.innerHTML || "";

      // Create FormData for multipart upload
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("content", htmlContent);
      formDataToSend.append("publishDate", formData.publishDate);
      formDataToSend.append("expiryDate", formData.expiryDate);
      formDataToSend.append("author", formData.author);
      formDataToSend.append("active", String(formData.active));

      if (
        !editingNews &&
        editorContext?.role === "super-admin"
      ) {
        formDataToSend.append("scopeType", superScopeType);
        if (superScopeType !== "platform") {
          formDataToSend.append("scopeId", superScopeId.trim());
        }
      }

      // Add image if selected
      if (imageFile) {
        formDataToSend.append("image", imageFile);
      } else if (editingNews && imagePreview) {
        // Keep existing image
        formDataToSend.append("existingImage", imagePreview);
      }

      const url = editingNews
        ? `/api/admin/news/${editingNews.id}`
        : "/api/admin/news";

      const method = editingNews ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        body: formDataToSend,
      });

      if (res.ok) {
        toast.success(editingNews ? "News updated" : "News created");
        onSuccess();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to save news");
      }
    } catch (error) {
      toast.error("Failed to save news");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal */}
          <motion.div
            className="fixed inset-0 z-[3001] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] p-6 flex items-center justify-between flex-shrink-0">
                <h2 className="text-2xl font-black text-white uppercase">
                  {editingNews ? "Edit News Item" : "Create News Item"}
                </h2>
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors"
                >
                  <X className="text-white" size={24} />
                </button>
              </div>

              {/* Form */}
              <form
                onSubmit={handleSubmit}
                className="flex-1 overflow-y-auto p-6"
              >
                <div className="space-y-6">
                  {!editingNews &&
                    editorContext?.role === "super-admin" && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                        <p className="text-xs font-bold text-amber-900 uppercase">
                          Portal scope (new item)
                        </p>
                        <div>
                          <label className="block text-xs font-semibold text-slate-600 mb-1">
                            Scope
                          </label>
                          <select
                            value={superScopeType}
                            onChange={(e) =>
                              setSuperScopeType(
                                e.target.value as typeof superScopeType,
                              )
                            }
                            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                          >
                            <option value="platform">Platform (apex only)</option>
                            <option value="association">Association</option>
                            <option value="club">Club</option>
                          </select>
                        </div>
                        {superScopeType !== "platform" && (
                          <div>
                            <label className="block text-xs font-semibold text-slate-600 mb-1">
                              Association or club ID
                            </label>
                            <input
                              type="text"
                              value={superScopeId}
                              onChange={(e) => setSuperScopeId(e.target.value)}
                              placeholder="e.g. bha or club id"
                              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Enter news title"
                    />
                  </div>

                  {/* Rich Text Editor */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Content *
                    </label>

                    {/* Formatting Toolbar */}
                    <div className="flex flex-wrap gap-1 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => applyFormat("bold")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 font-bold text-sm"
                        title="Bold (Ctrl+B)"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("italic")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 italic text-sm"
                        title="Italic (Ctrl+I)"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("underline")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 underline text-sm"
                        title="Underline (Ctrl+U)"
                      >
                        U
                      </button>
                      <div className="w-px bg-slate-300 mx-1"></div>
                      <button
                        type="button"
                        onClick={() => applyFormat("insertUnorderedList")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
                        title="Bullet List"
                      >
                        • List
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("insertOrderedList")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
                        title="Numbered List"
                      >
                        1. List
                      </button>
                      <div className="w-px bg-slate-300 mx-1"></div>
                      <button
                        type="button"
                        onClick={() => applyFormat("formatBlock", "<h2>")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 font-bold text-sm"
                        title="Heading 2"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("formatBlock", "<h3>")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 font-bold text-sm"
                        title="Heading 3"
                      >
                        H3
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("formatBlock", "<p>")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
                        title="Paragraph"
                      >
                        P
                      </button>
                      <div className="w-px bg-slate-300 mx-1"></div>
                      <button
                        type="button"
                        onClick={() => applyFormat("removeFormat")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-red-50 hover:border-red-300 text-sm text-red-600"
                        title="Clear Formatting"
                      >
                        Clear
                      </button>
                    </div>

                    {/* Content Editor */}
                    <div
                      ref={contentRef}
                      contentEditable
                      onInput={handleContentChange}
                      suppressContentEditableWarning
                      className="w-full min-h-[300px] px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 prose prose-slate max-w-none overflow-auto"
                      style={{
                        whiteSpace: "pre-wrap",
                        wordWrap: "break-word",
                      }}
                    />
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Image (optional)
                    </label>

                    {imagePreview ? (
                      <div className="relative rounded-xl overflow-hidden border-2 border-slate-200">
                        <Image
                          src={imagePreview}
                          alt="Preview"
                          width={800}
                          height={400}
                          className="w-full h-auto object-cover"
                        />
                        <button
                          type="button"
                          onClick={removeImage}
                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center cursor-pointer hover:border-yellow-400 hover:bg-yellow-50 transition-colors"
                      >
                        <Upload
                          className="mx-auto text-slate-400 mb-2"
                          size={48}
                        />
                        <p className="text-slate-600 font-bold">
                          Click to upload image
                        </p>
                        <p className="text-sm text-slate-500 mt-1">
                          PNG, JPG, GIF up to 5MB
                        </p>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Publish Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.publishDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            publishDate: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">
                        Expiry Date *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.expiryDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            expiryDate: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>

                  {/* Author */}
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Author (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) =>
                        setFormData({ ...formData, author: e.target.value })
                      }
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Author name"
                    />
                  </div>

                  {/* Active */}
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) =>
                        setFormData({ ...formData, active: e.target.checked })
                      }
                      className="w-5 h-5 text-yellow-400 rounded focus:ring-yellow-400"
                    />
                    <label
                      htmlFor="active"
                      className="text-sm font-bold text-slate-700"
                    >
                      Active (visible to users)
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-4 mt-8">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Save size={20} />
                    {saving ? "Saving..." : editingNews ? "Update" : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
