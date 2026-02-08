// components/admin/members/wizard/PhotoUploadStep.tsx
"use client";

import { useState, useRef } from "react";
import {
  Upload,
  X,
  User,
  Camera,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import Image from "next/image";

interface PhotoUploadStepProps {
  photoUrl?: string;
  displayName?: string;
  onChange: (photoUrl: string) => void;
}

export default function PhotoUploadStep({
  photoUrl,
  displayName,
  onChange,
}: PhotoUploadStepProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(photoUrl || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to server
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", "member-photos");

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Upload failed");
      }

      const data = await response.json();
      const uploadedUrl = data.url;

      setPreviewUrl(uploadedUrl);
      onChange(uploadedUrl);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photo. Please try again.");
      setPreviewUrl(photoUrl || "");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl("");
    onChange("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      fileInputRef.current.files = dataTransfer.files;
      handleFileSelect({ target: fileInputRef.current } as any);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm text-blue-800 font-bold">
          ℹ️ Upload a profile photo for this member (optional). Recommended
          size: 400x400px
        </p>
      </div>

      <div className="flex flex-col items-center gap-6">
        {/* Photo Preview */}
        <div className="relative">
          {previewUrl ? (
            <div className="relative group">
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-blue-500 shadow-xl">
                <Image
                  src={previewUrl}
                  alt={displayName || "Member photo"}
                  width={192}
                  height={192}
                  className="object-cover w-full h-full"
                />
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={handleRemovePhoto}
                className="absolute -top-2 -right-2 p-2 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-all hover:scale-110"
                title="Remove photo"
              >
                <X size={20} />
              </button>

              {/* Change photo overlay */}
              <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-full transition-all flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="opacity-0 group-hover:opacity-100 flex items-center gap-2 px-4 py-2 bg-white text-slate-900 rounded-lg font-bold transition-all"
                >
                  <Camera size={18} />
                  Change
                </button>
              </div>
            </div>
          ) : (
            // Placeholder
            <div className="w-48 h-48 rounded-full bg-slate-100 border-4 border-dashed border-slate-300 flex items-center justify-center">
              <User className="text-slate-400" size={80} />
            </div>
          )}
        </div>

        {/* Upload Area */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="w-full max-w-md"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {!previewUrl && (
            <div
              className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploading ? (
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="animate-spin text-blue-600" size={40} />
                  <p className="font-bold text-slate-700">Uploading photo...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  <div className="p-4 bg-blue-100 rounded-full">
                    <Upload className="text-blue-600" size={32} />
                  </div>
                  <div>
                    <p className="font-black text-slate-900 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-sm text-slate-500">
                      PNG, JPG, GIF up to 5MB
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Upload Button (if photo exists) */}
          {previewUrl && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUploading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  Uploading...
                </>
              ) : (
                <>
                  <Camera size={20} />
                  Change Photo
                </>
              )}
            </button>
          )}
        </div>

        {/* Photo Guidelines */}
        <div className="w-full max-w-md bg-slate-50 border border-slate-200 rounded-xl p-4">
          <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
            <ImageIcon size={16} />
            Photo Guidelines
          </h4>
          <ul className="text-sm text-slate-600 space-y-1">
            <li>• Use a clear, front-facing photo</li>
            <li>• Square format works best (e.g., 400x400px)</li>
            <li>• Good lighting and neutral background</li>
            <li>• File size must be under 5MB</li>
            <li>• Accepted formats: JPG, PNG, GIF</li>
          </ul>
        </div>

        {/* Alternative: Use Avatar Generator */}
        {!previewUrl && displayName && (
          <div className="w-full max-w-md">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500 font-bold">
                  OR
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                // Generate avatar using DiceBear or UI Avatars
                const initials = displayName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);

                const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&size=400&background=06054e&color=fff&bold=true&format=png`;

                setPreviewUrl(avatarUrl);
                onChange(avatarUrl);
              }}
              className="w-full mt-4 flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold transition-colors"
            >
              <User size={20} />
              Generate Avatar from Name
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
