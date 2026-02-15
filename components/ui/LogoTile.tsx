"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

interface LogoTileProps {
  src: string;
  alt: string;
  href: string;
  size?: "sm" | "md" | "lg";
  bgColor?: string; // Tailwind or hex
  radius?: string; // Tailwind radius class e.g. "rounded-lg"
}

export default function LogoTile({
  src,
  alt,
  href,
  size = "md",
  bgColor = "bg-white",
  radius = "rounded-xl",
}: LogoTileProps) {
  const sizeMap = {
    sm: "w-20 h-20",
    md: "w-28 h-28",
    lg: "w-36 h-36",
  };

  return (
    <Link href={href} aria-label={alt}>
      <motion.div
        whileHover={{ y: -6, scale: 1.05 }}
        transition={{ type: "spring", stiffness: 260, damping: 18 }}
        className={`
          ${sizeMap[size]}
          ${bgColor}
          ${radius}
          flex items-center justify-center
          overflow-hidden
          border border-slate-200
          shadow-sm
          cursor-pointer
          transition-all
        `}
      >
        <Image
          src={src}
          alt={alt}
          width={300}
          height={300}
          className="object-contain w-full h-full p-2"
        />
      </motion.div>
    </Link>
  );
}
