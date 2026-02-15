// components/member-sections/AddressSection.tsx
// Address information section - TYPE SAFE

"use client";

import { Home } from "lucide-react";
import { Member } from "@/types/member";

interface AddressSectionProps {
  member: Member;
}

export default function AddressSection({ member }: AddressSectionProps) {
  return (
    <div
      id="address"
      className="max-w-6xl mx-auto bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 mb-6 scroll-mt-6"
    >
      <h2 className="text-2xl font-black text-[#06054e] mb-6 flex items-center gap-2">
        <Home size={24} />
        Address
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-2">
          <label className="text-xs font-black uppercase text-slate-400">
            Street Address
          </label>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {member.address.street}
          </p>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400">
            Suburb
          </label>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {member.address.suburb}
          </p>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400">
            State
          </label>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {member.address.state}
          </p>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400">
            Postcode
          </label>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {member.address.postcode}
          </p>
        </div>

        <div>
          <label className="text-xs font-black uppercase text-slate-400">
            Country
          </label>
          <p className="text-lg font-bold text-slate-800 mt-1">
            {member.address.country}
          </p>
        </div>
      </div>
    </div>
  );
}
