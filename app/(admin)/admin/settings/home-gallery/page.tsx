"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { HOME_GALLERY_CATEGORY } from "@/lib/constants/homeGallery";

type Row = { filename: string; url: string };

export default function HomeGalleryAdminPage() {
  const [scopeKey, setScopeKey] = useState("platform");
  const [resolvedScope, setResolvedScope] = useState<string | null>(null);
  const [scopeLocked, setScopeLocked] = useState(false);
  const [images, setImages] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchGallery = useCallback(async (scopeForQuery?: string | null) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams();
      if (scopeForQuery != null && scopeForQuery !== "") {
        q.set("scope", scopeForQuery);
      }
      const qs = q.toString();
      const res = await fetch(
        qs ? `/api/admin/home-gallery?${qs}` : "/api/admin/home-gallery",
        { credentials: "include" },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || res.statusText);
      }
      const data = (await res.json()) as {
        images: Row[];
        scopeKey?: string;
        scopeLocked?: boolean;
      };
      setImages(data.images ?? []);
      setScopeLocked(Boolean(data.scopeLocked));
      if (data.scopeKey) {
        setResolvedScope(data.scopeKey);
        setScopeKey(data.scopeKey);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchGallery(null);
  }, [fetchGallery]);

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;

    const maxSize = 5 * 1024 * 1024;
    const allowed = new Set([
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ]);

    setUploading(true);
    setError(null);
    const failures: string[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });

        if (!allowed.has(file.type)) {
          failures.push(`${file.name}: invalid type`);
          continue;
        }
        if (file.size > maxSize) {
          failures.push(`${file.name}: over 5MB`);
          continue;
        }

        const formData = new FormData();
        formData.append("file", file);
        const uploadCategory = `${HOME_GALLERY_CATEGORY}/${resolvedScope ?? scopeKey}`;
        formData.append("category", uploadCategory);

        try {
          const res = await fetch("/api/admin/upload/image", {
            method: "POST",
            body: formData,
            credentials: "include",
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            failures.push(
              `${file.name}: ${typeof data.error === "string" ? data.error : "failed"}`,
            );
          }
        } catch {
          failures.push(`${file.name}: network error`);
        }
      }

      await fetchGallery(resolvedScope ?? scopeKey);

      if (failures.length > 0) {
        setError(
          failures.length === files.length
            ? failures.slice(0, 3).join(" · ") +
                (failures.length > 3 ? ` (+${failures.length - 3} more)` : "")
            : `${failures.length} of ${files.length} failed: ${failures.slice(0, 2).join(" · ")}${failures.length > 2 ? "…" : ""}`,
        );
      }
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const onDelete = async (filename: string) => {
    setDeleting(filename);
    setError(null);
    try {
      const res = await fetch("/api/admin/home-gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          filename,
          scope: resolvedScope ?? scopeKey,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Delete failed");
      await fetchGallery(resolvedScope ?? scopeKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-8">
        <Link
          href="/admin/dashboard"
          className="text-sm font-bold text-slate-500 hover:text-slate-800"
        >
          ← Dashboard
        </Link>
        <h1 className="mt-4 text-2xl font-black uppercase text-slate-900">
          Home page gallery
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Upload photos here. The public home page shows seven slots; uploaded
          images are shuffled randomly on each visit, with gradient placeholders
          filling empty slots.
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Files are stored per portal under{" "}
          <code className="rounded bg-slate-100 px-1">
            public/icons/{HOME_GALLERY_CATEGORY}/&lt;scope&gt;/
          </code>
          (e.g. <code className="px-1">platform</code>,{" "}
          <code className="px-1">association-yourId</code>).
        </p>
      </div>

      {!scopeLocked && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 mb-6">
          <label className="block text-xs font-bold text-amber-900 uppercase mb-2">
            Gallery scope (super-admin)
          </label>
          <p className="text-xs text-amber-900/80 mb-2">
            Type a scope key (e.g. <code className="px-1">platform</code>,{" "}
            <code className="px-1">association-bha</code>), then load the list.
          </p>
          <div className="flex flex-wrap gap-2 items-center">
            <input
              type="text"
              value={scopeKey}
              onChange={(e) => setScopeKey(e.target.value.trim() || "platform")}
              placeholder="platform"
              className="flex-1 min-w-[200px] px-3 py-2 border border-amber-300 rounded-lg text-sm font-mono"
            />
            <button
              type="button"
              onClick={() => void fetchGallery(scopeKey)}
              className="px-4 py-2 rounded-lg bg-amber-600 text-white text-sm font-bold hover:bg-amber-700"
            >
              Load scope
            </button>
          </div>
        </div>
      )}
      {resolvedScope && (
        <p className="mb-4 text-xs font-mono text-slate-600">
          Editing gallery folder: <strong>{resolvedScope}</strong>
        </p>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm mb-8">
        <label className="block text-sm font-bold text-slate-700 mb-3">
          Upload images
        </label>
        <p className="text-xs text-slate-500 mb-2">
          Select one or more files (JPEG, PNG, GIF, WebP, SVG — max 5MB each).
        </p>
        <input
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
          onChange={(ev) => void onUpload(ev)}
          disabled={uploading}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-600 file:px-4 file:py-2 file:font-bold file:text-white hover:file:bg-indigo-700 disabled:opacity-50"
        />
        {uploading && uploadProgress && (
          <p className="mt-2 text-xs font-semibold text-indigo-600">
            Uploading {uploadProgress.current} / {uploadProgress.total}…
          </p>
        )}
      </div>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
          {error}
        </div>
      )}

      <h2 className="text-lg font-black uppercase text-slate-800 mb-4">
        Uploaded ({images.length})
      </h2>

      {loading ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : images.length === 0 ? (
        <p className="text-slate-500 text-sm">
          No images yet. Upload above to replace gradient placeholders on the home
          page.
        </p>
      ) : (
        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {images.map((img) => (
            <li
              key={img.filename}
              className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50 shadow-sm"
            >
              <div className="relative aspect-[4/3] bg-slate-200">
                <Image
                  src={img.url}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 50vw, 200px"
                />
              </div>
              <div className="p-2 flex flex-col gap-2">
                <p className="text-[10px] font-mono text-slate-500 truncate" title={img.filename}>
                  {img.filename}
                </p>
                <button
                  type="button"
                  onClick={() => void onDelete(img.filename)}
                  disabled={deleting === img.filename}
                  className="text-xs font-black uppercase text-red-600 hover:text-red-800 disabled:opacity-50"
                >
                  {deleting === img.filename ? "Removing…" : "Remove"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
