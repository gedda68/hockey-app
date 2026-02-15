"use client";

import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { motion } from "framer-motion";

interface FeatureCardImage {
  src: string;
  alt: string;
  href: string;
}

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  accentColor?: string;
  href?: string;
  images?: FeatureCardImage[]; // NEW
}

export default function FeatureCard({
  icon,
  title,
  description,
  accentColor = "bg-yellow-400",
  href,
  images = [],
}: FeatureCardProps) {
  const Card = (
    <motion.div
      whileHover={{
        scale: 1.03,
        y: -4,
        boxShadow: "0 12px 30px rgba(0,0,0,0.25)",
      }}
      transition={{ type: "spring", stiffness: 260, damping: 18 }}
      className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2rem] p-8 hover:bg-white/15 transition-all cursor-pointer"
    >
      {/* ICON */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className={`w-16 h-16 ${accentColor} rounded-2xl flex items-center justify-center mb-4`}
      >
        {icon}
      </motion.div>

      {/* OPTIONAL IMAGES */}
      {images.length > 0 && (
        <div className="flex gap-3 mb-4">
          {images.map((img, idx) => (
            <Link key={idx} href={img.href}>
              <motion.div
                whileHover={{ scale: 1.1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
                className="w-16 h-16 rounded-2xl overflow-hidden border border-white/20"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  width={64}
                  height={64}
                  className="object-cover w-full h-full"
                />
              </motion.div>
            </Link>
          ))}
        </div>
      )}

      <h3 className="text-2xl font-black text-white uppercase mb-3">{title}</h3>

      <p className="text-slate-300 font-bold">{description}</p>
    </motion.div>
  );

  return href ? (
    <Link href={href} className="block">
      {Card}
    </Link>
  ) : (
    Card
  );
}
