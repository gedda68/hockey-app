"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

export default function SiteLogo() {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href="/"
      className="flex items-center gap-3 hover:opacity-60 transition-opacity"
    >
      {/* Logo */}
      {!imageError && (
        <div className="w-12 h-12 relative">
          <Image
            src="../../icons/BHA.png"
            alt="Brisbane Hockey League"
            width={48}
            height={48}
            className="object-contain"
            onError={() => setImageError(true)}
          />
        </div>
      )}

      {/* Site Name */}
      <div>
        <h1 className="text-lg font-black text-[#06054e] uppercase tracking-tight leading-tight">
          Brisbane Hockey
        </h1>
        <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">
          Assn
        </p>
      </div>
    </Link>
  );
}
