"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Club } from "@/lib/data/clubs";

interface ClubsNavProps {
  clubs: Club[];
}

export default function ClubsNav({ clubs }: ClubsNavProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop View */}
        <div className="hidden md:flex items-center gap-1 py-2 overflow-x-auto">
          {clubs.map((club) => (
            <Link
              key={club.slug}
              href={`/clubs/${club.slug}`}
              className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-all group min-w-[64px]"
              title={club.title}
            >
              {club.iconSrc ? (
                <div className="relative w-10 h-10 mb-1">
                  <Image
                    src={club.iconSrc}
                    alt={club.title}
                    fill
                    className="object-contain transition-transform group-hover:scale-110"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 mb-1 flex items-center justify-center text-2xl">
                  {club.icon}
                </div>
              )}
              <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tight text-center leading-tight">
                {club.title.split(" ")[0]}
              </span>
            </Link>
          ))}

          {/* View All Link */}
          <Link
            href="/clubs"
            className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-all min-w-[64px] ml-2 border-l border-slate-200"
          >
            <div className="w-10 h-10 mb-1 flex items-center justify-center bg-[#06054e] rounded-full">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="1" />
                <circle cx="12" cy="5" r="1" />
                <circle cx="12" cy="19" r="1" />
                <circle cx="5" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
              </svg>
            </div>
            <span className="text-[8px] font-bold text-slate-600 uppercase tracking-tight">
              All Clubs
            </span>
          </Link>
        </div>

        {/* Mobile View */}
        <div className="md:hidden">
          {/* Toggle Button */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full py-3 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-[#06054e]"
              >
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              </svg>
              <span className="text-sm font-black uppercase text-[#06054e]">
                Clubs
              </span>
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform ${
                isExpanded ? "rotate-180" : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {/* Expanded Clubs List */}
          {isExpanded && (
            <div className="pb-3 grid grid-cols-4 gap-2">
              {clubs.map((club) => (
                <Link
                  key={club.slug}
                  href={`/clubs/${club.slug}`}
                  className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-all"
                  onClick={() => setIsExpanded(false)}
                >
                  {club.iconSrc ? (
                    <div className="relative w-10 h-10 mb-1">
                      <Image
                        src={club.iconSrc}
                        alt={club.title}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 mb-1 flex items-center justify-center text-2xl">
                      {club.icon}
                    </div>
                  )}
                  <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tight text-center leading-tight">
                    {club.title.split(" ")[0]}
                  </span>
                </Link>
              ))}

              {/* View All */}
              <Link
                href="/clubs"
                className="flex flex-col items-center justify-center p-2 rounded-lg hover:bg-slate-50 transition-all"
                onClick={() => setIsExpanded(false)}
              >
                <div className="w-10 h-10 mb-1 flex items-center justify-center bg-[#06054e] rounded-full">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="12" cy="12" r="1" />
                    <circle cx="12" cy="5" r="1" />
                    <circle cx="12" cy="19" r="1" />
                  </svg>
                </div>
                <span className="text-[7px] font-bold text-slate-600 uppercase tracking-tight">
                  All
                </span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
