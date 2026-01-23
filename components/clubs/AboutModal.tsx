// components/clubs/AboutModal.tsx
// Modal that shows club description and history (NO committee info)

"use client";

import { Club } from "../../app/admin/types/clubs";
import Image from "next/image";

interface AboutModalProps {
  club: Club;
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ club, isOpen, onClose }: AboutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl my-8 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with Club Colors */}
        <div
          className="py-8 px-6 rounded-t-3xl"
          style={{
            background: `linear-gradient(135deg, ${club.colors.primary} 0%, ${club.colors.secondary} 100%)`,
          }}
        >
          <div className="flex items-center gap-4">
            {/* Logo */}
            {club.logo && (
              <div className="w-20 h-20 rounded-full bg-white p-2 shadow-lg">
                <Image
                  src={club.logo}
                  alt={club.name}
                  width={80}
                  height={80}
                  className="w-full h-full object-contain"
                />
              </div>
            )}

            {/* Title */}
            <div className="text-white">
              <h2 className="text-3xl font-black uppercase">About</h2>
              <p className="text-xl font-bold text-white/90">{club.name}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {/* Description */}
          {club.description && (
            <div className="mb-6">
              <div
                className="prose prose-slate max-w-none text-lg"
                dangerouslySetInnerHTML={{ __html: club.description }}
              />
            </div>
          )}

          {/* Divider if both description and about exist */}
          {club.description && club.about && (
            <div className="border-t-2 border-slate-200 my-6"></div>
          )}

          {/* Full About/History */}
          {club.about && (
            <div>
              <h3 className="text-2xl font-black text-slate-900 mb-4">
                Our History
              </h3>
              <div
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: club.about }}
              />
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-slate-200 text-slate-900 rounded-lg font-bold hover:bg-slate-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
