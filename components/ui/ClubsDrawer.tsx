"use client";

import { useRef } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { X, Shield } from "lucide-react";
import ClubIcon from "@/components/ui/ClubIcon";
import { useFocusTrap } from "@/lib/a11y/useFocusTrap";

interface ClubsDrawerProps {
  open: boolean;
  onClose: () => void;
  clubs: Array<{
    name: string;
    slug: string;
    portalHomeUrl: string;
    icon?: string;
    iconSrc?: string;
    logo?: string;
    shortName?: string;
    colors?: {
      primary?: string;
    };
  }>;
}

const drawerTitleId = "clubs-drawer-title";

export default function ClubsDrawer({
  open,
  onClose,
  clubs,
}: ClubsDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();

  useFocusTrap(panelRef, open, onClose);

  const motionTransition = reduceMotion
    ? { duration: 0.01 }
    : { type: "spring" as const, stiffness: 300, damping: 30 };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[9999]"
            onClick={onClose}
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
          />

          {/* Drawer */}
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={drawerTitleId}
            className="fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-[10000] flex flex-col border-l border-slate-200 outline-none"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={motionTransition}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e]">
              <div className="flex justify-between items-center gap-2">
                <h2
                  id={drawerTitleId}
                  className="text-xl font-black text-white uppercase tracking-wide flex items-center gap-2"
                >
                  <Shield size={24} aria-hidden />
                  Clubs
                </h2>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-white/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#06054e]/30"
                  aria-label="Close clubs drawer"
                >
                  <X className="h-6 w-6 text-white" aria-hidden />
                </button>
              </div>
            </div>

            {/* Scrollable content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-3 gap-4">
                {clubs.map((club) => {
                  const name = club.name;
                  const iconUrl = club.iconSrc || club.icon || club.logo;

                  return (
                    <div key={club.slug} onClick={onClose}>
                      <ClubIcon
                        name={name}
                        shortName={club.shortName}
                        slug={club.slug}
                        href={club.portalHomeUrl}
                        iconUrl={iconUrl}
                        primaryColor={club.colors?.primary}
                        variant="soft"
                        size="md"
                        tooltip={name}
                      />
                    </div>
                  );
                })}
              </div>

              {clubs.length === 0 && (
                <div className="text-center py-12 text-slate-600">
                  <Shield size={48} className="mx-auto mb-4 text-slate-400" aria-hidden />
                  <p className="font-bold">No clubs found</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              <p className="text-xs text-slate-600 text-center">
                {clubs.length} {clubs.length === 1 ? "Club" : "Clubs"} in
                Brisbane Hockey Association
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
