// components/ui/CustomAlert.tsx
// Styled alert component matching your app's design

"use client";

import { X, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { useState, useEffect } from "react";

interface CustomAlertProps {
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  onClose: () => void;
  autoClose?: number; // milliseconds, optional
}

export default function CustomAlert({
  type,
  title,
  message,
  onClose,
  autoClose,
}: CustomAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose();
      }, autoClose);
      return () => clearTimeout(timer);
    }
  }, [autoClose]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300); // Wait for animation
  };

  const styles = {
    success: {
      bg: "bg-green-50",
      border: "border-green-500",
      icon: CheckCircle,
      iconColor: "text-green-600",
      titleColor: "text-green-900",
      messageColor: "text-green-800",
      buttonHover: "hover:bg-green-100",
    },
    error: {
      bg: "bg-red-50",
      border: "border-red-500",
      icon: AlertCircle,
      iconColor: "text-red-600",
      titleColor: "text-red-900",
      messageColor: "text-red-800",
      buttonHover: "hover:bg-red-100",
    },
    warning: {
      bg: "bg-yellow-50",
      border: "border-yellow-500",
      icon: AlertTriangle,
      iconColor: "text-yellow-600",
      titleColor: "text-yellow-900",
      messageColor: "text-yellow-800",
      buttonHover: "hover:bg-yellow-100",
    },
    info: {
      bg: "bg-blue-50",
      border: "border-blue-500",
      icon: Info,
      iconColor: "text-blue-600",
      titleColor: "text-blue-900",
      messageColor: "text-blue-800",
      buttonHover: "hover:bg-blue-100",
    },
  };

  const style = styles[type];
  const Icon = style.icon;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Alert */}
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
            <Icon
              size={32}
              className={`${style.iconColor} flex-shrink-0 mt-1`}
            />
            <div className="flex-1">
              <h3 className={`text-xl font-black ${style.titleColor}`}>
                {title}
              </h3>
            </div>
            <button
              onClick={handleClose}
              className={`p-2 rounded-xl ${style.buttonHover} transition-all flex-shrink-0`}
            >
              <X size={20} className={style.iconColor} />
            </button>
          </div>

          {/* Message */}
          <div
            className={`${style.messageColor} font-bold whitespace-pre-line ml-12`}
          >
            {message}
          </div>

          {/* Close Button */}
          <div className="mt-6 flex justify-end ml-12">
            <button
              onClick={handleClose}
              className={`px-6 py-3 ${style.border.replace(
                "border-",
                "bg-"
              )} text-white rounded-xl font-black hover:opacity-90 transition-all`}
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

// Hook for easy usage
export function useCustomAlert() {
  const [alert, setAlert] = useState<{
    type: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  } | null>(null);

  const showAlert = (
    type: "success" | "error" | "warning" | "info",
    title: string,
    message: string
  ) => {
    setAlert({ type, title, message });
  };

  const closeAlert = () => {
    setAlert(null);
  };

  const AlertComponent = alert ? (
    <CustomAlert
      type={alert.type}
      title={alert.title}
      message={alert.message}
      onClose={closeAlert}
    />
  ) : null;

  return { showAlert, AlertComponent };
}
