"use client";

import { useState } from "react";

// MINIMAL TEST COMPONENT - Just level dropdown and save
export default function MinimalLevelTest() {
  const [level, setLevel] = useState<number | "">(0);
  const [result, setResult] = useState<any>(null);

  const handleSave = async () => {
    const payload = {
      associationId: "GHA",
      level: level === "" ? undefined : Number(level),
    };

    console.log("🧪 MINIMAL TEST - SAVING:", {
      level,
      levelType: typeof level,
      levelAsNumber: Number(level),
      payload,
    });

    try {
      const res = await fetch("/api/admin/associations/GHA", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // Send all required fields
          associationId: "GHA",
          code: "GHA",
          name: "Gladstone Hockey Association",
          fullName: "Gladstone Hockey Association",
          region: "Gladstone",
          state: "QLD",
          country: "Australia",
          timezone: "Australia/Brisbane",
          level: level === "" ? undefined : Number(level),
          address: {
            street: "12 Main St",
            suburb: "Gladstone",
            city: "Gladstone",
            state: "QLD",
            postcode: "4670",
            country: "Australia",
          },
          contact: {
            primaryEmail: "info@gha.com.au",
            phone: "07334543546",
          },
          status: "active",
        }),
      });

      const data = await res.json();
      console.log("🧪 MINIMAL TEST - RESPONSE:", data);
      setResult(data);
    } catch (err: any) {
      console.error("🧪 MINIMAL TEST - ERROR:", err);
      setResult({ error: err.message });
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Minimal Level Test</h1>

      <div className="mb-4">
        <label className="block font-bold mb-2">Level:</label>
        <select
          value={level}
          onChange={(e) => {
            const val = e.target.value === "" ? "" : parseInt(e.target.value);
            console.log("🧪 LEVEL CHANGED:", { from: level, to: val });
            setLevel(val as number | "");
          }}
          className="w-full p-3 border-2 rounded"
        >
          <option value="">Select...</option>
          <option value="0">0 - National</option>
          <option value="1">1 - Sub-national</option>
          <option value="2">2 - State</option>
          <option value="3">3 - Regional</option>
          <option value="4">4 - City</option>
        </select>
      </div>

      <div className="mb-4">
        <p className="font-mono text-sm">
          Current level state: {JSON.stringify(level)} (type: {typeof level})
        </p>
      </div>

      <button
        onClick={handleSave}
        className="px-6 py-3 bg-blue-600 text-white rounded font-bold"
      >
        Save Level
      </button>

      {result && (
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <h3 className="font-bold mb-2">Result:</h3>
          <pre className="text-xs overflow-auto">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
