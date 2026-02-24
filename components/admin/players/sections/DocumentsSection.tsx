// sections/DocumentsSection.tsx
// COMPLETE: File upload with preview, change, delete, and persistence

"use client";

import { useState } from "react";
import { BaseSectionProps, PlayerDocument } from "../types/player.types";
import {
  FileText,
  Upload,
  Trash2,
  Download,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
  RefreshCw,
  Plus,
} from "lucide-react";

export default function DocumentsSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const documents = formData.documents || [];
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

  const addDocument = () => {
    const newDoc: PlayerDocument = {
      id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: "other",
      name: "",
      url: "",
      uploadedAt: new Date().toISOString(),
    };
    onChange("documents", [...documents, newDoc]);
  };

  const removeDocument = (id: string) => {
    if (confirm("Are you sure you want to remove this document?")) {
      onChange(
        "documents",
        documents.filter((d) => d.id !== id),
      );
    }
  };

  const updateDocument = (
    id: string,
    field: keyof PlayerDocument,
    value: any,
  ) => {
    onChange(
      "documents",
      documents.map((d) => (d.id === id ? { ...d, [field]: value } : d)),
    );
  };

  const handleFileUpload = async (docId: string, file: File) => {
    setUploading((prev) => ({ ...prev, [docId]: true }));

    try {
      const formData = new FormData();
      formData.append("file", file);

      console.log(
        "📤 Uploading file:",
        file.name,
        "(",
        (file.size / 1024 / 1024).toFixed(2),
        "MB)",
      );

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }

      const data = await res.json();

      console.log("✅ Upload successful:", data.url);

      // Update document with uploaded file details
      updateDocument(docId, "url", data.url);
      updateDocument(docId, "name", file.name);
      updateDocument(docId, "size", data.size);
      updateDocument(docId, "uploadedAt", new Date().toISOString());
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const deleteFile = (docId: string) => {
    if (confirm("Delete this file? You can upload a new one.")) {
      updateDocument(docId, "url", "");
      updateDocument(docId, "name", "");
      updateDocument(docId, "size", undefined);
      console.log("🗑️ File deleted from document");
    }
  };

  const formatFileSize = (bytes: number | undefined) => {
    if (!bytes) return "";
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const getDocumentsByType = (type: PlayerDocument["type"]) => {
    return documents.filter((d) => d.type === type);
  };

  const hasRequiredDocs = () => {
    const birthCert = getDocumentsByType("birth_certificate").some(
      (d) => d.url,
    );
    const photo = getDocumentsByType("photo").some((d) => d.url);
    return { birthCert, photo };
  };

  const required = hasRequiredDocs();

  const documentTypes: Array<{
    value: PlayerDocument["type"];
    label: string;
    required: boolean;
    accept: string;
    description: string;
  }> = [
    {
      value: "birth_certificate",
      label: "Birth Certificate",
      required: true,
      accept: "image/*,.pdf",
      description: "Scan or photo of birth certificate (PDF or image)",
    },
    {
      value: "photo",
      label: "Player Photo",
      required: true,
      accept: "image/*",
      description: "Recent photo for player profile (image only)",
    },
    {
      value: "medical_clearance",
      label: "Medical Clearance",
      required: false,
      accept: "image/*,.pdf",
      description: "Doctor's clearance to play (if required)",
    },
    {
      value: "other",
      label: "Other Document",
      required: false,
      accept: "*",
      description: "Any other relevant documents",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <h4 className="text-sm font-black text-blue-900 mb-2">
          📄 Required Documents
        </h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li className="flex items-center gap-2">
            {required.birthCert ? (
              <CheckCircle size={14} className="text-green-600" />
            ) : (
              <AlertCircle size={14} className="text-red-600" />
            )}
            Birth Certificate (Required - PDF or Image)
          </li>
          <li className="flex items-center gap-2">
            {required.photo ? (
              <CheckCircle size={14} className="text-green-600" />
            ) : (
              <AlertCircle size={14} className="text-red-600" />
            )}
            Player Photo (Required - Image only)
          </li>
          <li className="flex items-center gap-2">
            <FileText size={14} className="text-blue-600" />
            Medical Clearance (Optional - if required by club)
          </li>
        </ul>
      </div>

      {/* Add Document Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-700">
          Uploaded Documents
        </h3>
        <button
          type="button"
          onClick={addDocument}
          className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-xl font-bold hover:bg-yellow-400 hover:text-[#06054e] transition-all text-sm"
        >
          <Plus size={16} />
          Add Document
        </button>
      </div>

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
          <FileText size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-600 font-bold">No documents uploaded yet</p>
          <p className="text-xs text-slate-400 mt-1">
            Click "Add Document" to upload required documents
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc, index) => {
            const docType = documentTypes.find((t) => t.value === doc.type);
            const isUploading = uploading[doc.id];
            const isImage =
              doc.url && doc.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            const isPDF = doc.url && doc.url.endsWith(".pdf");

            return (
              <div
                key={doc.id}
                className="p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase text-slate-600">
                      Document #{index + 1}
                    </h4>
                    {doc.url && (
                      <CheckCircle size={14} className="text-green-600" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeDocument(doc.id)}
                    className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Document Type */}
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">
                      Document Type *
                    </label>
                    <select
                      value={doc.type}
                      onChange={(e) =>
                        updateDocument(doc.id, "type", e.target.value)
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                    >
                      {documentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}{" "}
                          {type.required ? "(Required)" : "(Optional)"}
                        </option>
                      ))}
                    </select>
                    {docType && (
                      <p className="text-xs text-slate-400 mt-1">
                        {docType.description}
                      </p>
                    )}
                  </div>

                  {/* File Upload OR Preview */}
                  {!doc.url ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">
                        Upload File *
                      </label>
                      <label className="block cursor-pointer">
                        <input
                          type="file"
                          accept={docType?.accept || "*"}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleFileUpload(doc.id, file);
                          }}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <div
                          className={`flex flex-col items-center justify-center gap-3 px-4 py-8 border-2 border-dashed rounded-xl transition-all ${
                            isUploading
                              ? "bg-blue-50 border-blue-300 cursor-not-allowed"
                              : "bg-white border-slate-300 hover:border-yellow-400 hover:bg-yellow-50"
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <Loader2
                                size={32}
                                className="animate-spin text-blue-600"
                              />
                              <span className="text-sm font-bold text-blue-600">
                                Uploading...
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload size={32} className="text-slate-400" />
                              <div className="text-center">
                                <span className="text-sm font-bold text-slate-600 block">
                                  Click to upload or drag and drop
                                </span>
                                <span className="text-xs text-slate-400 mt-1 block">
                                  {docType?.accept === "image/*"
                                    ? "Images only"
                                    : docType?.accept === "image/*,.pdf"
                                      ? "Images or PDFs"
                                      : "Any file type"}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">
                        Uploaded File
                      </label>

                      {/* File Preview */}
                      <div className="p-4 bg-white border-2 border-green-200 rounded-xl">
                        {/* Image Preview */}
                        {isImage && (
                          <div className="mb-3">
                            <img
                              src={doc.url}
                              alt={doc.name}
                              className="max-w-full max-h-64 object-contain mx-auto rounded-lg border-2 border-slate-200 shadow-sm"
                            />
                          </div>
                        )}

                        {/* PDF Preview */}
                        {isPDF && (
                          <div className="mb-3">
                            <iframe
                              src={doc.url}
                              className="w-full h-64 border-2 border-slate-200 rounded-lg"
                              title={doc.name}
                            />
                          </div>
                        )}

                        {/* File not image or PDF */}
                        {!isImage && !isPDF && (
                          <div className="mb-3 p-4 bg-slate-50 border-2 border-slate-200 rounded-lg text-center">
                            <FileText
                              size={40}
                              className="mx-auto text-slate-400 mb-2"
                            />
                            <p className="text-sm text-slate-600 font-bold">
                              File uploaded successfully
                            </p>
                          </div>
                        )}

                        {/* File Info */}
                        <div className="flex items-center justify-between pt-3 border-t-2 border-slate-100">
                          <div>
                            <p className="text-sm font-black text-slate-900">
                              {doc.name}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {doc.size && formatFileSize(doc.size)}
                              {doc.size && " • "}
                              Uploaded{" "}
                              {new Date(doc.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 mt-3">
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 flex items-center justify-center gap-1"
                          >
                            <Download size={14} />
                            View Full
                          </a>

                          <label className="flex-1 px-3 py-2 bg-yellow-600 text-white rounded-lg text-xs font-bold hover:bg-yellow-700 flex items-center justify-center gap-1 cursor-pointer">
                            <RefreshCw size={14} />
                            Change File
                            <input
                              type="file"
                              accept={docType?.accept || "*"}
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(doc.id, file);
                              }}
                              className="hidden"
                            />
                          </label>

                          <button
                            type="button"
                            onClick={() => deleteFile(doc.id)}
                            className="px-3 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 flex items-center gap-1"
                          >
                            <X size={14} />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Requirements Checklist */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h4 className="text-xs font-black uppercase text-slate-400 mb-3">
          Document Checklist
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {documentTypes.map((type) => {
            const count = getDocumentsByType(type.value).filter(
              (d) => d.url,
            ).length;
            const isComplete = type.required ? count > 0 : true;

            return (
              <div
                key={type.value}
                className={`p-3 rounded-xl border-2 flex items-center justify-between ${
                  isComplete
                    ? "bg-green-50 border-green-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isComplete ? (
                    <CheckCircle size={16} className="text-green-600" />
                  ) : (
                    <AlertCircle size={16} className="text-red-600" />
                  )}
                  <span
                    className={`text-sm font-bold ${
                      isComplete ? "text-green-900" : "text-red-900"
                    }`}
                  >
                    {type.label}
                  </span>
                </div>
                <span
                  className={`text-xs font-black ${
                    isComplete ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {count > 0
                    ? `${count} uploaded`
                    : type.required
                      ? "Required"
                      : "Optional"}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Storage Info */}
      <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
        <p className="text-xs text-slate-600 font-bold">
          <strong>Note:</strong> Files are uploaded to your server and will
          persist after saving. Max file size: 10MB per file.
        </p>
      </div>
    </div>
  );
}
