// components/admin/players/ValidationSummary.tsx
// Shows validation errors and warnings at the top of the form

"use client";

import { PlayerFormData } from "../types/player.types";
import {
  AlertTriangle,
  XCircle,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";

interface ValidationSummaryProps {
  formData: PlayerFormData;
  errors: Record<string, string>;
  warnings?: string[];
}

export default function ValidationSummary({
  formData,
  errors,
  warnings = [],
}: ValidationSummaryProps) {
  const [showDetails, setShowDetails] = useState(true);

  const errorList = Object.entries(errors).map(([field, message]) => ({
    field,
    message,
    severity: "error" as const,
  }));

  const warningList = warnings.map((message) => ({
    field: "",
    message,
    severity: "warning" as const,
  }));

  const allIssues = [...errorList, ...warningList];
  const errorCount = errorList.length;
  const warningCount = warningList.length;

  if (allIssues.length === 0) {
    return (
      <div className="p-4 bg-green-50 border-2 border-green-200 rounded-xl">
        <div className="flex items-center gap-3">
          <CheckCircle className="text-green-600 flex-shrink-0" size={24} />
          <div className="flex-1">
            <h4 className="font-black text-green-900 text-base">
              ✅ Form Validation Passed
            </h4>
            <p className="text-sm text-green-700 mt-1">
              All required fields are completed correctly. You can now save this
              player.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`p-5 border-2 rounded-xl ${
        errorCount > 0
          ? "bg-red-50 border-red-300"
          : "bg-amber-50 border-amber-300"
      }`}
    >
      {/* Header */}
      <div
        className="flex items-start gap-3 cursor-pointer"
        onClick={() => setShowDetails(!showDetails)}
      >
        {errorCount > 0 ? (
          <XCircle className="text-red-600 flex-shrink-0 mt-1" size={24} />
        ) : (
          <AlertTriangle
            className="text-amber-600 flex-shrink-0 mt-1"
            size={24}
          />
        )}

        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h4
              className={`font-black text-base ${
                errorCount > 0 ? "text-red-900" : "text-amber-900"
              }`}
            >
              {errorCount > 0
                ? "⚠️ Cannot Save - Validation Errors"
                : "⚠️ Warnings"}
            </h4>
            <button
              type="button"
              className={`p-1 rounded hover:bg-white/50 transition-colors ${
                errorCount > 0 ? "text-red-700" : "text-amber-700"
              }`}
            >
              {showDetails ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </button>
          </div>

          <p
            className={`text-sm mt-1 ${
              errorCount > 0 ? "text-red-700" : "text-amber-700"
            }`}
          >
            {errorCount > 0 && (
              <span className="font-bold">
                {errorCount} error{errorCount !== 1 ? "s" : ""} must be fixed
                before saving
              </span>
            )}
            {errorCount > 0 && warningCount > 0 && <span> • </span>}
            {warningCount > 0 && (
              <span className="font-bold">
                {warningCount} warning{warningCount !== 1 ? "s" : ""} to review
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Details */}
      {showDetails && (
        <div className="mt-4 space-y-2">
          {/* Errors */}
          {errorList.length > 0 && (
            <div className="space-y-2">
              {errorList.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-red-200 rounded-lg flex items-start gap-2"
                >
                  <XCircle
                    size={16}
                    className="text-red-600 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-red-900 font-bold">
                      {issue.message}
                    </p>
                    {issue.field && (
                      <p className="text-xs text-red-600 mt-1">
                        Field: {issue.field}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Warnings */}
          {warningList.length > 0 && (
            <div className="space-y-2">
              {warningList.map((issue, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white border border-amber-200 rounded-lg flex items-start gap-2"
                >
                  <AlertCircle
                    size={16}
                    className="text-amber-600 flex-shrink-0 mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-amber-900 font-bold">
                      {issue.message}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Action Hint */}
          {errorCount > 0 && (
            <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
              <p className="text-xs text-red-900 font-bold">
                💡 <strong>What to do:</strong> Scroll through the form and
                complete all required fields marked with errors. Look for red
                text and error messages.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
