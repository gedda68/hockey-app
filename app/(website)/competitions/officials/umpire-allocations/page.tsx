"use client";

import React from "react";

// Define the interface to replace 'any'
interface Allocation {
  id: string;
  date: string;
  time: string;
  venue: string;
  division: string;
  homeTeam: string;
  awayTeam: string;
  umpire1: string;
  umpire2: string;
}

export default function UmpireAllocations() {
  // Assuming allocations is your data array
  const allocations: Allocation[] = [];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Umpire Allocations</h1>
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead>
            <tr className="bg-slate-100">
              <th className="p-3 text-left">Match</th>
              <th className="p-3 text-left">Umpires</th>
            </tr>
          </thead>
          <tbody>
            {/* Fix for Line 96: Specified types for item and index */}
            {allocations.map((item: Allocation, index: number) => (
              <tr key={item.id || index} className="border-t">
                <td className="p-3">
                  <div className="font-bold">
                    {item.homeTeam} vs {item.awayTeam}
                  </div>
                  <div className="text-sm text-slate-500">
                    {item.date} | {item.time}
                  </div>
                </td>
                <td className="p-3">
                  <div>{item.umpire1}</div>
                  <div>{item.umpire2}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
