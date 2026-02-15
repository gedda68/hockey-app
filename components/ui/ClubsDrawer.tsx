"use client";

import { motion, AnimatePresence } from "framer-motion";
import LogoTile from "@/components/ui/LogoTile";

interface ClubsDrawerProps {
  open: boolean;
  onClose: () => void;
  clubs: Array<{
    name: string;
    slug: string;
    icon: string;
  }>;
}

export default function ClubsDrawer({
  open,
  onClose,
  clubs,
}: ClubsDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Drawer */}
          <motion.div
            className="
              fixed top-0 right-0 h-full w-80 bg-white 
              shadow-xl z-50 border-l border-slate-200 
              flex flex-col
            "
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-slate-800">Clubs</h2>
              <button
                onClick={onClose}
                className="text-slate-500 hover:text-slate-700 transition"
              >
                ✕
              </button>
            </div>

            {/* Scrollable content */}
            <div className="p-4 overflow-y-auto flex flex-col gap-4">
              {clubs.map((club) => (
                <LogoTile
                  key={club.slug}
                  src={club.icon}
                  alt={club.name}
                  href={`/clubs/${club.slug}`}
                  size="md"
                  bgColor="bg-white"
                  radius="rounded-lg"
                />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
