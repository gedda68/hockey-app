// components/admin/NewsFormModal.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Save,
  Image as ImageIcon,
  Video,
  FileText,
  Paperclip,
  Trash2,
  ChevronUp,
  ChevronDown,
  Link as LinkIcon,
} from "lucide-react";
import { NewsItem, type NewsAttachment, type NewsAttachmentKind } from "@/types/news";
import { toast } from "sonner";

import {
  assertAttachmentFileLimits,
  inferAttachmentKind,
  normalizeAttachmentsFromDoc,
} from "@/lib/news/newsAttachments";
import {
  MAX_NEWS_ATTACHMENT_DOCUMENT_BYTES,
  MAX_NEWS_ATTACHMENT_IMAGE_BYTES,
  MAX_NEWS_ATTACHMENT_VIDEO_BYTES,
} from "@/lib/news/newsAttachments";
import { parseVideoEmbed } from "@/lib/website/videoEmbeds";

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

type LocalAttachment = {
  id: string;
  kind: NewsAttachmentKind;
  title: string;
  url?: string;
  mime?: string;
  filename?: string;
  file?: File;
  previewUrl?: string;
};

function newId() {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function clientAssertSize(file: File, kind: NewsAttachmentKind) {
  const err = assertAttachmentFileLimits(file, kind);
  if (err) toast.error(err);
  return !err;
}

function pickKindForFiles(files: File[], forced: NewsAttachmentKind | null) {
  const kinds = new Set<NewsAttachmentKind>();
  for (const f of files) kinds.add(inferAttachmentKind(f));
  if (forced) {
    for (const k of kinds) {
      if (k !== forced) return { ok: false as const, error: "One or more files don't match the selected attachment type." };
    }
    return { ok: true as const, kind: forced };
  }
  if (kinds.size !== 1) {
    return {
      ok: false as const,
      error: "Pick one type at a time (all images, all videos, all PDFs, or all files).",
    };
  }
  return { ok: true as const, kind: [...kinds][0]! };
}

function syncVideoUrlField(rows: LocalAttachment[], current: string) {
  const link = rows.find((r) => r.kind === "video_link")?.url?.trim() ?? "";
  if (link) return link;
  return current;
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
    videoUrl: "",
    active: true,
  });
  const [superScopeType, setSuperScopeType] = useState<
    "platform" | "association" | "club"
  >("platform");
  const [superScopeId, setSuperScopeId] = useState("");
  const [attachmentRows, setAttachmentRows] = useState<LocalAttachment[]>([]);
  const [saving, setSaving] = useState(false);

  const contentRef = useRef<HTMLDivElement>(null);
  const imgPickerRef = useRef<HTMLInputElement>(null);
  const vidPickerRef = useRef<HTMLInputElement>(null);
  const pdfPickerRef = useRef<HTMLInputElement>(null);
  const filePickerRef = useRef<HTMLInputElement>(null);

  const objectUrlsRef = useRef<Set<string>>(new Set());

  const revokeAllObjectUrls = () => {
    for (const u of objectUrlsRef.current) URL.revokeObjectURL(u);
    objectUrlsRef.current.clear();
  };

  const seedRowsFromNews = (news: NewsItem): LocalAttachment[] => {
    const doc = news as unknown as Record<string, unknown>;
    const base = normalizeAttachmentsFromDoc(doc);
    const rows: LocalAttachment[] = base.map((a) => ({
      id: a.id || newId(),
      kind: a.kind,
      title: a.title || defaultTitleForKind(a.kind),
      url: a.url,
      mime: a.mime,
      filename: a.filename,
    }));

    const vu = String(news.videoUrl ?? "").trim();
    if (vu && !rows.some((r) => r.kind === "video_link" && r.url?.trim() === vu)) {
      rows.unshift({
        id: newId(),
        kind: "video_link",
        title: "Video (YouTube/Vimeo)",
        url: vu,
      });
    }
    return rows;
  };

  useEffect(() => {
    if (!isOpen) return;

    revokeAllObjectUrls();

    if (editingNews) {
      setFormData({
        title: editingNews.title,
        content: editingNews.content,
        publishDate: new Date(editingNews.publishDate).toISOString().split("T")[0],
        expiryDate: new Date(editingNews.expiryDate).toISOString().split("T")[0],
        author: editingNews.author || "",
        videoUrl: editingNews.videoUrl || "",
        active: editingNews.active,
      });
      setAttachmentRows(seedRowsFromNews(editingNews));

      if (contentRef.current) {
        contentRef.current.innerHTML = editingNews.content;
      }
    } else {
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
        videoUrl: "",
        active: true,
      });
      setAttachmentRows([]);

      if (contentRef.current) {
        contentRef.current.innerHTML = "";
      }
      const d = editorContext?.defaultScopeType ?? "platform";
      setSuperScopeType(d);
      setSuperScopeId(editorContext?.defaultScopeId ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingNews, isOpen, editorContext]);

  useEffect(() => {
    return () => {
      revokeAllObjectUrls();
    };
  }, []);

  const videoUrlSynced = useMemo(
    () => syncVideoUrlField(attachmentRows, formData.videoUrl),
    [attachmentRows, formData.videoUrl],
  );

  useEffect(() => {
    if (videoUrlSynced === formData.videoUrl) return;
    setFormData((prev) => ({ ...prev, videoUrl: videoUrlSynced }));
  }, [videoUrlSynced, formData.videoUrl]);

  const applyFormat = (command: string, value?: string) => {
    if (!contentRef.current) return;
    contentRef.current.focus();
    document.execCommand(command, false, value);
  };

  const handleContentChange = () => {
    if (!contentRef.current) return;
    const html = contentRef.current.innerHTML;
    setFormData((prev) => ({ ...prev, content: html }));
  };

  const addRowsForFiles = (files: File[], forcedKind: NewsAttachmentKind | null) => {
    const list = files.filter((f) => f.size > 0);
    if (list.length === 0) return;

    const picked = pickKindForFiles(list, forcedKind);
    if (!picked.ok) {
      toast.error(picked.error);
      return;
    }

    const next: LocalAttachment[] = [];
    for (const file of list) {
      const kind = picked.kind;
      if (!clientAssertSize(file, kind)) return;

      const id = newId();
      let previewUrl: string | undefined;
      if (kind === "image" || kind === "video") {
        previewUrl = URL.createObjectURL(file);
        objectUrlsRef.current.add(previewUrl);
      }

      next.push({
        id,
        kind,
        title: defaultTitleForKind(kind),
        file,
        filename: file.name,
        mime: file.type || undefined,
        previewUrl,
      });
    }

    setAttachmentRows((prev) => [...prev, ...next]);
  };

  const onPickFiles =
    (forcedKind: NewsAttachmentKind | null) => (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      e.target.value = "";
      addRowsForFiles(files, forcedKind);
    };

  const addVideoLinkRow = () => {
    setAttachmentRows((prev) => [
      ...prev,
      {
        id: newId(),
        kind: "video_link",
        title: "Video (YouTube/Vimeo)",
        url: "",
      },
    ]);
  };

  const removeAt = (idx: number) => {
    setAttachmentRows((prev) => {
      const row = prev[idx];
      if (row?.previewUrl) {
        URL.revokeObjectURL(row.previewUrl);
        objectUrlsRef.current.delete(row.previewUrl);
      }
      return prev.filter((_, i) => i !== idx);
    });
  };

  const move = (idx: number, dir: -1 | 1) => {
    setAttachmentRows((prev) => {
      const j = idx + dir;
      if (j < 0 || j >= prev.length) return prev;
      const copy = [...prev];
      const tmp = copy[idx]!;
      copy[idx] = copy[j]!;
      copy[j] = tmp;
      return copy;
    });
  };

  const updateRow = (idx: number, patch: Partial<LocalAttachment>) => {
    setAttachmentRows((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx]!, ...patch };
      return copy;
    });
  };

  const buildAttachmentsMeta = () => {
    return attachmentRows.map((r, idx) => ({
      id: r.id,
      kind: r.kind,
      title: r.title?.trim() ? r.title.trim() : undefined,
      url: r.url,
      mime: r.mime,
      filename: r.filename,
      sortOrder: idx,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const htmlContent = contentRef.current?.innerHTML || "";

      // Validate video links before submit
      for (const r of attachmentRows) {
        if (r.kind !== "video_link") continue;
        const u = String(r.url ?? "").trim();
        if (!u) {
          toast.error("Video URL is required for a video link attachment.");
          return;
        }
        if (!parseVideoEmbed(u)) {
          toast.error("Unsupported video URL (YouTube/Vimeo only).");
          return;
        }
      }

      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("content", htmlContent);
      formDataToSend.append("publishDate", formData.publishDate);
      formDataToSend.append("expiryDate", formData.expiryDate);
      formDataToSend.append("author", formData.author);

      const vu = syncVideoUrlField(attachmentRows, formData.videoUrl).trim();
      formDataToSend.append("videoUrl", vu);
      formDataToSend.append("active", String(formData.active));

      if (!editingNews && editorContext?.role === "super-admin") {
        formDataToSend.append("scopeType", superScopeType);
        if (superScopeType !== "platform") {
          formDataToSend.append("scopeId", superScopeId.trim());
        }
      }

      const meta = buildAttachmentsMeta();
      formDataToSend.append("attachmentsJson", JSON.stringify(meta));
      for (const r of attachmentRows) {
        if (r.file) formDataToSend.append(`attachmentFile:${r.id}`, r.file);
      }

      const url = editingNews ? `/api/admin/news/${editingNews.id}` : "/api/admin/news";
      const method = editingNews ? "PUT" : "POST";

      const res = await fetch(url, { method, body: formDataToSend });

      if (res.ok) {
        toast.success(editingNews ? "News updated" : "News created");
        onSuccess();
      } else {
        const error = await res.json().catch(() => ({}));
        toast.error((error as { error?: string }).error || "Failed to save news");
      }
    } catch {
      toast.error("Failed to save news");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[3000]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="fixed inset-0 z-[3001] flex items-center justify-center p-4"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <div className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] p-6 flex items-center justify-between flex-shrink-0">
                <h2 className="text-2xl font-black text-white uppercase">
                  {editingNews ? "Edit News Item" : "Create News Item"}
                </h2>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 transition-colors">
                  <X className="text-white" size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6">
                  {!editingNews && editorContext?.role === "super-admin" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                      <p className="text-xs font-bold text-amber-900 uppercase">Portal scope (new item)</p>
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1">Scope</label>
                        <select
                          value={superScopeType}
                          onChange={(e) =>
                            setSuperScopeType(e.target.value as typeof superScopeType)
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

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Enter news title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Content *</label>
                    <div className="flex flex-wrap gap-1 mb-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => applyFormat("bold")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 font-bold text-sm"
                      >
                        B
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("italic")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 italic text-sm"
                      >
                        I
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("underline")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 underline text-sm"
                      >
                        U
                      </button>
                      <div className="w-px bg-slate-300 mx-1" />
                      <button
                        type="button"
                        onClick={() => applyFormat("insertUnorderedList")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
                      >
                        • List
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("insertOrderedList")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
                      >
                        1. List
                      </button>
                      <div className="w-px bg-slate-300 mx-1" />
                      <button
                        type="button"
                        onClick={() => applyFormat("formatBlock", "<h2>")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 font-bold text-sm"
                      >
                        H2
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("formatBlock", "<h3>")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 font-bold text-sm"
                      >
                        H3
                      </button>
                      <button
                        type="button"
                        onClick={() => applyFormat("formatBlock", "<p>")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-slate-100 text-sm"
                      >
                        P
                      </button>
                      <div className="w-px bg-slate-300 mx-1" />
                      <button
                        type="button"
                        onClick={() => applyFormat("removeFormat")}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded hover:bg-red-50 hover:border-red-300 text-sm text-red-600"
                      >
                        Clear
                      </button>
                    </div>

                    <div
                      ref={contentRef}
                      contentEditable
                      onInput={handleContentChange}
                      suppressContentEditableWarning
                      className="w-full min-h-[300px] px-4 py-3 border-2 border-slate-300 rounded-xl focus:outline-none focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20 prose prose-slate max-w-none overflow-auto"
                      style={{ whiteSpace: "pre-wrap", wordWrap: "break-word" }}
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-sm font-black text-slate-900">Media gallery</div>
                        <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                          Add multiple images, uploaded videos, PDFs, or other files. The{" "}
                          <span className="font-bold">first image</span> becomes the card/hero image.
                        </p>
                        <p className="mt-2 text-[11px] text-slate-500">
                          Limits: images ≤{" "}
                          {Math.round(MAX_NEWS_ATTACHMENT_IMAGE_BYTES / (1024 * 1024))}
                          MB, videos ≤{" "}
                          {Math.round(MAX_NEWS_ATTACHMENT_VIDEO_BYTES / (1024 * 1024))}
                          MB, PDFs/files ≤{" "}
                          {Math.round(MAX_NEWS_ATTACHMENT_DOCUMENT_BYTES / (1024 * 1024))}MB.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => imgPickerRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-wide hover:border-yellow-400"
                      >
                        <ImageIcon size={16} />
                        Images
                      </button>
                      <button
                        type="button"
                        onClick={() => vidPickerRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-wide hover:border-yellow-400"
                      >
                        <Video size={16} />
                        Video file
                      </button>
                      <button
                        type="button"
                        onClick={() => pdfPickerRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-wide hover:border-yellow-400"
                      >
                        <FileText size={16} />
                        PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => filePickerRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-black uppercase tracking-wide hover:border-yellow-400"
                      >
                        <Paperclip size={16} />
                        File
                      </button>
                      <button
                        type="button"
                        onClick={addVideoLinkRow}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[#06054e] text-white text-xs font-black uppercase tracking-wide hover:bg-yellow-400 hover:text-[#06054e]"
                      >
                        <LinkIcon size={16} />
                        YouTube/Vimeo
                      </button>
                    </div>

                    <input
                      ref={imgPickerRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={onPickFiles("image")}
                    />
                    <input
                      ref={vidPickerRef}
                      type="file"
                      accept="video/*"
                      multiple
                      className="hidden"
                      onChange={onPickFiles("video")}
                    />
                    <input
                      ref={pdfPickerRef}
                      type="file"
                      accept="application/pdf"
                      multiple
                      className="hidden"
                      onChange={onPickFiles("document")}
                    />
                    <input ref={filePickerRef} type="file" multiple className="hidden" onChange={onPickFiles(null)} />

                    <div className="mt-5 space-y-3">
                      {attachmentRows.length === 0 ? (
                        <p className="text-sm text-slate-600">No media attached yet.</p>
                      ) : (
                        attachmentRows.map((row, idx) => (
                          <div key={row.id} className="rounded-xl border border-slate-200 bg-white p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                  {labelForKind(row.kind)} · #{idx + 1}
                                </div>
                                <div className="mt-2 text-xs text-slate-600 break-all">
                                  {row.file ? row.file.name : row.url ? row.url : "—"}
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => move(idx, -1)}
                                  className="p-2 rounded-lg hover:bg-slate-50"
                                  aria-label="Move up"
                                >
                                  <ChevronUp size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => move(idx, 1)}
                                  className="p-2 rounded-lg hover:bg-slate-50"
                                  aria-label="Move down"
                                >
                                  <ChevronDown size={18} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => removeAt(idx)}
                                  className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                                  aria-label="Remove"
                                >
                                  <Trash2 size={18} />
                                </button>
                              </div>
                            </div>

                            {row.kind === "image" && (row.previewUrl || row.url) ? (
                              <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 bg-slate-50">
                                {/* eslint-disable-next-line @next/next/no-img-element -- previews + legacy URLs */}
                                <img
                                  src={row.previewUrl || row.url}
                                  alt=""
                                  className="w-full max-h-56 object-cover"
                                />
                              </div>
                            ) : null}

                            {row.kind === "video" && row.previewUrl ? (
                              <div className="mt-3 rounded-lg overflow-hidden border border-slate-200 bg-black">
                                <video className="w-full max-h-56" controls playsInline src={row.previewUrl} />
                              </div>
                            ) : null}

                            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                              <div className="sm:col-span-2">
                                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                  Caption / label (optional)
                                </label>
                                <input
                                  value={row.title}
                                  onChange={(e) => updateRow(idx, { title: e.target.value })}
                                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
                                />
                              </div>

                              {row.kind === "video_link" ? (
                                <div className="sm:col-span-2">
                                  <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                                    Video URL *
                                  </label>
                                  <input
                                    value={row.url ?? ""}
                                    onChange={(e) => updateRow(idx, { url: e.target.value })}
                                    placeholder="https://www.youtube.com/watch?v=… or https://vimeo.com/…"
                                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm font-mono"
                                  />
                                  <p className="mt-2 text-[11px] text-slate-500">
                                    YouTube/Vimeo only (this also updates the legacy video URL field on save).
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Publish Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.publishDate}
                        onChange={(e) => setFormData({ ...formData, publishDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Expiry Date *</label>
                      <input
                        type="date"
                        required
                        value={formData.expiryDate}
                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                        className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Author (optional)</label>
                    <input
                      type="text"
                      value={formData.author}
                      onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-yellow-400"
                      placeholder="Author name"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      id="active"
                      type="checkbox"
                      checked={formData.active}
                      onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                      className="w-5 h-5 text-yellow-400 rounded focus:ring-yellow-400"
                    />
                    <label htmlFor="active" className="text-sm font-bold text-slate-700">
                      Active (visible to users)
                    </label>
                  </div>
                </div>

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

function defaultTitleForKind(kind: NewsAttachmentKind) {
  if (kind === "image") return "Image";
  if (kind === "video") return "Video";
  if (kind === "document") return "PDF";
  if (kind === "file") return "File";
  return "Video (YouTube/Vimeo)";
}

function labelForKind(kind: NewsAttachmentKind) {
  if (kind === "image") return "Image";
  if (kind === "video") return "Video file";
  if (kind === "document") return "PDF";
  if (kind === "file") return "File";
  return "Embedded video";
}
