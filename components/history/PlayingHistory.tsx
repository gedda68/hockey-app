// components/member-sections/AddressSection.tsx
// Address information section

"use client";

import { Home, MapPin } from "lucide-react";

interface PlayingHistorySectionProps {
  member: any;
}

export default function PlayingHistory({ member }: PlayingHistorySectionProps) {
  return (
    <div
      id="playing-history"
      className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6 scroll-mt-6"
    >
      <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
        <Home size={24} />
        Playing History
      </h2>
    </div>
  );
}
