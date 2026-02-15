"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export interface ImagesIconProps {
  src: string;
  alt: string;
  href: string;
}

export default function ImagesIcon({ src, alt, href }: ImagesIconProps) {
  return (
    <Link href={href}>
      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="w-16 h-16 rounded-2xl overflow-hidden border border-white/20 cursor-pointer"
      >
        <Image
          src={src}
          alt={alt}
          width={64}
          height={64}
          className="object-cover w-full h-full"
        />
      </motion.div>
    </Link>
  );
}
