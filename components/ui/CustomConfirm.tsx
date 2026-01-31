// components/ui/CustomConfirm.tsx
// Styled confirmation dialog matching your app's design

"use client";

import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

interface CustomConfirmProps {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: "danger" | "warning" | "info";
}

export default function CustomConfirm({
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
  type = "warning",
}: CustomConfirmProps) {
  const [isVisible, setIsVisible] = useState(true);

  const handleConfirm = () => {
    setIsVisible(false);
    setTimeout(onConfirm, 300);
  };

  const handleCancel = () => {
    setIsVisible(false);
    setTimeout(onCancel, 300);
  };

  const styles = {
    danger: {
      bg: "bg-red-50",
      border: "border-red-500",
      iconColor: "text-red-600",
      titleColor: "text-red-900",
      messageColor: "text-red-800",
      confirmBg: "bg-red-600 hover:bg-red-700",
      cancelBg: "bg-slate-200 hover:bg-slate-300 text-slate-900",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-500",
      iconColor: "text-yellow-600",
      titleColor: "text-yellow-900",
      messageColor: "text-yellow-800",
      confirmBg: "bg-yellow-600 hover:bg-yellow-700",
      cancelBg: "bg-slate-200 hover:bg-slate-300 text-slate-900",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-500",
      iconColor: "text-blue-600",
      titleColor: "text-blue-900",
      messageColor: "text-blue-800",
      confirmBg: "bg-blue-600 hover:bg-blue-700",
      cancelBg: "bg-slate-200 hover:bg-slate-300 text-slate-900",
    },
  };

  const style = styles[type];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleCancel}
      />

      {/* Confirm Dialog */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className={`${style.bg} ${
            style.border
          } border-4 rounded-[2rem] shadow-2xl p-8 max-w-md w-full pointer-events-auto transform transition-all duration-300 ${
            isVisible ? "scale-100 opacity-100" : "scale-95 opacity-0"
          }`}
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <AlertTriangle
              size={32}
              className={`${style.iconColor} flex-shrink-0 mt-1`}
            />
            <div className="flex-1">
              <h3 className={`text-xl font-black ${style.titleColor}`}>
                {title}
              </h3>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 rounded-xl hover:bg-black/10 transition-all flex-shrink-0"
            >
              <X size={20} className={style.iconColor} />
            </button>
          </div>

          {/* Message */}
          <div
            className={`${style.messageColor} font-bold whitespace-pre-line ml-12 mb-6`}
          >
            {message}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end ml-12">
            <button
              onClick={handleCancel}
              className={`px-6 py-3 ${style.cancelBg} rounded-xl font-black transition-all`}
            >
              {cancelText}
            </button>
            <button
              onClick={handleConfirm}
              className={`px-6 py-3 ${style.confirmBg} text-white rounded-xl font-black transition-all`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook for easy usage
export function useCustomConfirm() {
  const [confirm, setConfirm] = useState<{
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    type?: "danger" | "warning" | "info";
    onConfirm: () => void;
  } | null>(null);

  const showConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: "danger" | "warning" | "info";
    }
  ) => {
    setConfirm({
      title,
      message,
      onConfirm,
      confirmText: options?.confirmText,
      cancelText: options?.cancelText,
      type: options?.type,
    });
  };

  const closeConfirm = () => {
    setConfirm(null);
  };

  const ConfirmComponent = confirm ? (
    <CustomConfirm
      title={confirm.title}
      message={confirm.message}
      confirmText={confirm.confirmText}
      cancelText={confirm.cancelText}
      type={confirm.type}
      onConfirm={() => {
        confirm.onConfirm();
        closeConfirm();
      }}
      onCancel={closeConfirm}
    />
  ) : null;

  return { showConfirm, ConfirmComponent };
}
