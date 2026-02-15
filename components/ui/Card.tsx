"use client";

import { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  title: string;
  description: string;
  accentColor?: string; // default yellow
}

export default function FeatureCard({
  icon,
  title,
  description,
  accentColor = "bg-yellow-400",
}: FeatureCardProps) {
  return (
    <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-[2rem] p-8 hover:bg-white/15 transition-all">
      <div
        className={`w-16 h-16 ${accentColor} rounded-2xl flex items-center justify-center mb-4`}
      >
        {icon}
      </div>

      <h3 className="text-2xl font-black text-white uppercase mb-3">{title}</h3>

      <p className="text-slate-300 font-bold">{description}</p>
    </div>
  );
}
