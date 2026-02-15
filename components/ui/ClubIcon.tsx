"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";

export type ClubIconVariant = "circle" | "square" | "soft" | "outline" | "neon";

export type ClubIconSize = "xs" | "sm" | "md" | "lg";

export interface ClubIconProps {
  name: string;
  shortName?: string;
  slug: string;
  iconUrl?: string | null;
  primaryColor?: string;
  variant?: ClubIconVariant;
  size?: ClubIconSize;
  active?: boolean;
  tooltip?: string;
  loading?: boolean;
}

export default function ClubIcon({
  name,
  shortName,
  slug,
  iconUrl,
  primaryColor = "#06054e",
  variant = "square",
  size = "md",
  active = false,
  tooltip,
  loading = false,
}: ClubIconProps) {
  const [error, setError] = useState(false);

  const initials =
    shortName?.substring(0, 3)?.toUpperCase() ||
    name.substring(0, 3).toUpperCase();

  // FIXED SIZE MAP — now fully consistent
  const sizeMap = {
    xs: {
      box: "w-8 h-8",
      img: 30,
      label: "text-[6px]",
      initials: "text-[8px]",
    },
    sm: {
      box: "w-10 h-10",
      img: 40,
      label: "text-[7px]",
      initials: "text-[10px]",
    },
    md: {
      box: "w-16 h-16",
      img: 64,
      label: "text-[8px]",
      initials: "text-[14px]",
    },
    lg: {
      box: "w-20 h-20",
      img: 80,
      label: "text-[10px]",
      initials: "text-[18px]",
    },
  };

  const { box, img, label, initials: initialsSize } = sizeMap[size];

  // Shape variants
  const shape =
    variant === "circle"
      ? "rounded-full"
      : variant === "soft"
        ? "rounded-xl"
        : "rounded-2xl";

  const outline =
    variant === "outline"
      ? "border-2 border-slate-300"
      : variant === "neon"
        ? "shadow-[0_0_10px_rgba(0,255,255,0.6)]"
        : "border border-slate-200";

  const activeRing = active ? "ring-4 ring-blue-500 ring-offset-2" : "";

  // Skeleton shimmer
  if (loading) {
    return (
      <div className="flex flex-col items-center gap-1 animate-pulse">
        <div className={`${box} ${shape} bg-slate-200`} />
        <div className="w-10 h-2 bg-slate-200 rounded" />
      </div>
    );
  }

  return (
    <Link
      href={`/clubs/${slug}`}
      className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-all group"
      title={tooltip || name}
    >
      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className={`${box} flex items-center justify-center overflow-hidden bg-white ${shape} ${outline} ${activeRing}`}
      >
        {iconUrl && !error ? (
          <Image
            src={iconUrl}
            alt={name}
            width={img}
            height={img}
            className="object-contain"
            onError={() => setError(true)}
            unoptimized={iconUrl.startsWith("/")}
          />
        ) : (
          <div
            className={`w-full h-full flex items-center justify-center text-white font-black ${initialsSize}`}
            style={{ backgroundColor: primaryColor }}
          >
            {initials}
          </div>
        )}
      </motion.div>

      <span
        className={`${label} font-bold text-slate-600 uppercase tracking-tight text-center leading-tight mt-1`}
      >
        {shortName || name.split(" ")[0]}
      </span>
    </Link>
  );
}
