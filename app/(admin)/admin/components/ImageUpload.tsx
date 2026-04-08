// app/admin/components/ImageUpload.tsx
// UPDATED: Click anywhere in empty div to upload

"use client";

import { useState, useRef } from "react";
import Image from "next/image";

interface ImageUploadProps {
  currentImage?: string;
  onImageUploaded: (url: string) => void;
  category?: string;
  label?: string;
}

export default function ImageUpload({
  currentImage,
  onImageUploaded,
  category = "clubs",
  label = "Upload Image",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(currentImage || null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/gif",
      "image/webp",
      "image/svg+xml",
    ];
    if (!validTypes.includes(file.type)) {
      setError(
        "Invalid file type. Only JPEG, PNG, GIF, WebP, and SVG are allowed."
      );
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB.");
      return;
    }

    setError(null);
    setUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload file
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const response = await fetch("/api/admin/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await response.json();

      // Update parent component
      onImageUploaded(data.url);

      console.log("✅ Image uploaded:", data.url);
    } catch (error: any) {
      console.error("Upload error:", error);
      setError(error.message || "Failed to upload image");
      setPreview(currentImage || null);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onImageUploaded("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-bold text-slate-700">{label}</label>

      {/* Preview or Empty State - BOTH CLICKABLE */}
      {preview ? (
        <div className="relative">
          <div
            className="w-full h-48 bg-slate-100 rounded-xl border-2 border-slate-300 overflow-hidden flex items-center justify-center cursor-pointer hover:border-indigo-600 transition-colors"
            onClick={triggerFileInput}
            title="Click to change image"
          >
            <Image
              src={preview}
              alt="Preview"
              width={200}
              height={200}
              className="object-contain max-h-full"
            />
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            className="absolute top-2 right-2 px-3 py-1 bg-red-600 text-white rounded-full text-xs font-bold hover:bg-red-700 shadow-lg"
          >
            ✕ Remove
          </button>
        </div>
      ) : (
        <div
          className="w-full h-48 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center cursor-pointer hover:border-indigo-600 hover:bg-slate-200 transition-all"
          onClick={triggerFileInput}
          title="Click to upload image"
        >
          <div className="text-center pointer-events-none">
            <div className="text-6xl mb-2">🖼️</div>
            <p className="text-sm text-slate-500 font-semibold">
              {uploading ? "⏳ Uploading..." : "Click to upload image"}
            </p>
            <p className="text-xs text-slate-400 mt-1">or drag and drop</p>
          </div>
        </div>
      )}

      {/* Upload Button - Alternative Method */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={triggerFileInput}
          disabled={uploading}
          className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-all shadow-md"
        >
          {uploading
            ? "⏳ Uploading..."
            : preview
            ? "📤 Change Image"
            : "📤 Choose Image"}
        </button>

        {preview && (
          <button
            type="button"
            onClick={handleRemove}
            className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all shadow-md"
          >
            🗑️ Remove
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/svg+xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <div className="p-3 bg-red-50 border-2 border-red-300 rounded-xl">
          <p className="text-sm text-red-700 font-bold">❌ {error}</p>
        </div>
      )}

      {/* Info */}
      <div className="text-xs text-slate-500 space-y-1">
        <p>• Accepted formats: JPEG, PNG, GIF, WebP, SVG</p>
        <p>• Maximum file size: 5MB</p>
        <p>• Recommended size: 200x200px or larger</p>
      </div>
    </div>
  );
}
