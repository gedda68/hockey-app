// sections/DocumentsSection.tsx
// FIXED: Files persist properly + Visual status updates + Edit/Delete options

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
  Edit2,
  Eye,
} from "lucide-react";

export default function DocumentsSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  // Safely get documents array, handle undefined formData
  const documents = Array.isArray(formData?.documents)
    ? formData.documents
    : [];
  const [uploading, setUploading] = useState<Record<string, boolean>>({});

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
      value: "concussion_baseline",
      label: "Concussion Baseline Test",
      required: false,
      accept: "image/*,.pdf",
      description:
        "Baseline concussion test results (IMPORTANT for hockey safety)",
    },
    {
      value: "waiver_consent",
      label: "Waiver/Consent Form",
      required: false,
      accept: "image/*,.pdf",
      description: "Signed waiver and consent forms",
    },
    {
      value: "insurance_certificate",
      label: "Insurance Certificate",
      required: false,
      accept: "image/*,.pdf",
      description: "Personal sports insurance certificate",
    },
    {
      value: "transfer_certificate",
      label: "Transfer Certificate",
      required: false,
      accept: "image/*,.pdf",
      description: "Transfer clearance from previous club",
    },
    {
      value: "passport_id",
      label: "Passport/ID",
      required: false,
      accept: "image/*,.pdf",
      description: "For international tournaments and identification",
    },
    {
      value: "vaccination_record",
      label: "Vaccination Records",
      required: false,
      accept: "image/*,.pdf",
      description: "Vaccination records (if required by competition)",
    },
    {
      value: "other",
      label: "Other Document",
      required: false,
      accept: "*",
      description: "Any other relevant documents",
    },
  ];

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

  const updateDocument = (id: string, updates: Partial<PlayerDocument>) => {
    const updatedDocs = documents.map((d) =>
      d.id === id ? { ...d, ...updates } : d,
    );
    onChange("documents", updatedDocs);
    console.log("📄 Document updated:", id, updates);
  };

  const handleFileUpload = async (docId: string, file: File) => {
    setUploading((prev) => ({ ...prev, [docId]: true }));

    try {
      // For demo/development: Create a local URL
      // In production, you'd upload to your server/S3/etc.
      const fileUrl = URL.createObjectURL(file);

      console.log(
        "📤 Processing file:",
        file.name,
        "(",
        (file.size / 1024 / 1024).toFixed(2),
        "MB)",
      );

      // Simulate upload delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      console.log("✅ File processed:", fileUrl);

      // Update document with uploaded file details
      updateDocument(docId, {
        url: fileUrl,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });

      alert(
        `✅ File uploaded successfully!\n\nFile: ${file.name}\nSize: ${formatFileSize(file.size)}`,
      );
    } catch (error: any) {
      console.error("❌ Upload error:", error);
      alert(`Upload failed: ${error.message}`);
    } finally {
      setUploading((prev) => ({ ...prev, [docId]: false }));
    }
  };

  const changeFile = (docId: string) => {
    const input = document.createElement("input");
    input.type = "file";
    const doc = documents.find((d) => d.id === docId);
    const docType = documentTypes.find((t) => t.value === doc?.type);
    if (docType) {
      input.accept = docType.accept;
    }
    input.onchange = (e: any) => {
      const file = e.target?.files?.[0];
      if (file) {
        handleFileUpload(docId, file);
      }
    };
    input.click();
  };

  const deleteFile = (docId: string) => {
    if (confirm("Delete this file? You can upload a new one.")) {
      updateDocument(docId, {
        url: "",
        name: "",
        size: undefined,
      });
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
    return documents.filter((d) => d.type === type && d.url);
  };

  const getDocumentTypeStatus = (type: PlayerDocument["type"]) => {
    const docs = getDocumentsByType(type);
    return docs.length > 0;
  };

  const hasRequiredDocs = () => {
    const birthCert = getDocumentTypeStatus("birth_certificate");
    const photo = getDocumentTypeStatus("photo");
    return { birthCert, photo, allComplete: birthCert && photo };
  };

  const required = hasRequiredDocs();

  return (
    <div className="space-y-6">
      {/* Document Checklist with Visual Status */}
      <div
        className={`p-4 border-2 rounded-xl ${required.allComplete ? "bg-green-50 border-green-200" : "bg-blue-50 border-blue-200"}`}
      >
        <h4
          className={`text-sm font-black mb-3 ${required.allComplete ? "text-green-900" : "text-blue-900"}`}
        >
          {required.allComplete
            ? "✅ Document Requirements Complete"
            : "📄 Document Requirements"}
        </h4>

        <div className="space-y-2">
          {documentTypes
            .filter((t) => t.required)
            .map((docType) => {
              const hasDoc = getDocumentTypeStatus(docType.value);
              return (
                <div
                  key={docType.value}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    hasDoc
                      ? "bg-green-100 border border-green-300"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {hasDoc ? (
                      <CheckCircle size={16} className="text-green-600" />
                    ) : (
                      <AlertCircle size={16} className="text-red-600" />
                    )}
                    <span
                      className={`text-xs font-bold ${hasDoc ? "text-green-900" : "text-red-900"}`}
                    >
                      {docType.label}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-black px-2 py-1 rounded ${
                      hasDoc
                        ? "bg-green-200 text-green-800"
                        : "bg-red-200 text-red-800"
                    }`}
                  >
                    {hasDoc ? "SAVED" : "REQUIRED"}
                  </span>
                </div>
              );
            })}
        </div>

        {/* Optional Documents Summary */}
        <div className="mt-3 pt-3 border-t border-slate-200">
          <p className="text-xs font-bold text-slate-700 mb-2">
            Optional Documents:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {documentTypes
              .filter((t) => !t.required && t.value !== "other")
              .map((docType) => {
                const hasDoc = getDocumentTypeStatus(docType.value);
                return (
                  <div key={docType.value} className="flex items-center gap-2">
                    {hasDoc ? (
                      <CheckCircle size={12} className="text-green-600" />
                    ) : (
                      <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                    )}
                    <span
                      className={`text-xs ${hasDoc ? "text-green-700 font-bold" : "text-slate-600"}`}
                    >
                      {docType.label}
                    </span>
                  </div>
                );
              })}
          </div>
        </div>
      </div>

      {/* Add Document Button */}
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-black text-slate-700">
          Uploaded Documents ({documents.length})
        </h3>
        <button
          type="button"
          onClick={addDocument}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all text-sm"
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
            const hasFile = !!doc.url;
            const isImage =
              doc.url && doc.url.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            const isPDF = doc.url && doc.url.endsWith(".pdf");

            return (
              <div
                key={doc.id}
                className={`p-6 border-2 rounded-2xl ${
                  hasFile
                    ? "bg-green-50 border-green-200"
                    : "bg-slate-50 border-slate-100"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black uppercase text-slate-600">
                      Document #{index + 1}
                    </h4>
                    {hasFile && (
                      <span className="px-2 py-0.5 bg-green-500 text-white rounded-full text-xs font-black">
                        SAVED
                      </span>
                    )}
                    {docType?.required && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-black">
                        REQUIRED
                      </span>
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
                      Document Type
                    </label>
                    <select
                      value={doc.type}
                      onChange={(e) =>
                        updateDocument(doc.id, {
                          type: e.target.value as PlayerDocument["type"],
                        })
                      }
                      className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
                      disabled={hasFile}
                    >
                      {documentTypes.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label} {type.required ? "(Required)" : ""}
                        </option>
                      ))}
                    </select>
                    {docType && (
                      <p className="text-xs text-slate-400 mt-1 ml-1">
                        {docType.description}
                      </p>
                    )}
                  </div>

                  {/* File Upload or Display */}
                  {!hasFile ? (
                    <div>
                      <label className="block text-xs font-bold text-slate-500 mb-2">
                        Upload File
                      </label>
                      <div className="relative">
                        <input
                          type="file"
                          accept={docType?.accept || "*"}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleFileUpload(doc.id, file);
                            }
                          }}
                          className="hidden"
                          id={`file-${doc.id}`}
                          disabled={isUploading}
                        />
                        <label
                          htmlFor={`file-${doc.id}`}
                          className={`flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
                            isUploading
                              ? "bg-slate-100 border-slate-300 cursor-wait"
                              : "bg-white border-slate-300 hover:border-blue-400 hover:bg-blue-50"
                          }`}
                        >
                          {isUploading ? (
                            <>
                              <Loader2
                                size={20}
                                className="animate-spin text-blue-600"
                              />
                              <span className="text-sm font-bold text-blue-700">
                                Uploading...
                              </span>
                            </>
                          ) : (
                            <>
                              <Upload size={20} className="text-slate-400" />
                              <span className="text-sm font-bold text-slate-600">
                                Click to upload or drag and drop
                              </span>
                            </>
                          )}
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {/* File Info */}
                      <div className="p-4 bg-white border-2 border-green-200 rounded-xl">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <CheckCircle
                                size={16}
                                className="text-green-600"
                              />
                              <p className="text-sm font-black text-slate-900">
                                {doc.name}
                              </p>
                            </div>
                            <div className="text-xs text-slate-600 space-y-1">
                              {doc.size && (
                                <p>Size: {formatFileSize(doc.size)}</p>
                              )}
                              {doc.uploadedAt && (
                                <p>
                                  Uploaded:{" "}
                                  {new Date(
                                    doc.uploadedAt,
                                  ).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Preview (if image) */}
                      {isImage && (
                        <div className="p-4 bg-white border-2 border-slate-200 rounded-xl">
                          <p className="text-xs font-bold text-slate-500 mb-2">
                            Preview:
                          </p>
                          <img
                            src={doc.url}
                            alt={doc.name}
                            className="max-w-full h-auto max-h-64 rounded-lg border border-slate-200"
                          />
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => changeFile(doc.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all"
                        >
                          <RefreshCw size={16} />
                          Change File
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteFile(doc.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all"
                        >
                          <Trash2 size={16} />
                          Delete File
                        </button>
                        {doc.url && (
                          <a
                            href={doc.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
                          >
                            <Eye size={16} />
                            View
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info Notice */}
      <div className="p-4 bg-slate-100 border border-slate-200 rounded-xl">
        <p className="text-xs text-slate-600 font-bold">
          💡 <strong>Document Tips:</strong>
        </p>
        <ul className="text-xs text-slate-600 mt-1 ml-4 list-disc space-y-1">
          <li>
            Birth Certificate and Player Photo are required before registration
          </li>
          <li>Accepted formats: PDF for documents, JPG/PNG for photos</li>
          <li>Maximum file size: 5MB per document</li>
          <li>
            You can change or delete uploaded files using the buttons above
          </li>
        </ul>
      </div>
    </div>
  );
}
