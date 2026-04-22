"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { ToastContainer, useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/utils/errors";

interface Props {
  associationId: string;
  associationName: string;
  childrenCount: number;
  clubsCount: number;
}

export default function AssociationViewClient({
  associationId,
  associationName,
  childrenCount,
  clubsCount,
}: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toasts, dismiss, success, error: toastError } = useToast();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/associations/${associationId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete association");
      }

      success("Association deleted", `${associationName} has been removed.`);
      setShowModal(false);

      setTimeout(() => {
        router.push("/admin/associations");
        router.refresh();
      }, 1200);
    } catch (err) {
      toastError("Delete failed", getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all"
      >
        <Trash2 size={18} />
        Delete
      </button>

      {/* Confirmation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl border-2 border-slate-100 p-8 max-w-md w-full mx-4">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={28} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Delete Association</h2>
                <p className="text-sm font-bold text-slate-500">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-slate-700 font-bold mb-2">
              Are you sure you want to delete{" "}
              <span className="text-[#06054e]">{associationName}</span>?
            </p>

            {(childrenCount > 0 || clubsCount > 0) && (
              <div className="mt-3 p-3 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                <p className="text-xs font-black text-yellow-800 uppercase mb-1">Warning</p>
                <p className="text-sm font-bold text-yellow-700">
                  This association has {childrenCount} child association(s) and {clubsCount} club(s).
                  These relationships must be removed first.
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl font-black hover:bg-red-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Trash2 size={18} />
                )}
                {isDeleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
