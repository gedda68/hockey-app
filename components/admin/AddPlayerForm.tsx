"use client";

import React, { useState, useEffect } from "react";
import {
  UserPlus,
  Save,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";

export default function AddPlayerForm() {
  // --- STATE FOR CONFIG DATA ---
  const [config, setConfig] = useState<{
    roles: any[];
    genders: any[];
    relTypes: any[];
    clubs: any[];
  }>({ roles: [], genders: [], relTypes: [], clubs: [] });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- STATE FOR FORM DATA ---
  const [formData, setFormData] = useState({
    userId: `USR-${new Date().getFullYear()}-${Math.floor(
      1000 + Math.random() * 9000
    )}`,
    roles: ["player"],
    personal: {
      firstName: "",
      lastName: "",
      dob: "",
      genderId: "",
    },
    contact: {
      emails: [{ address: "", type: "Personal", primary: true }],
      phones: [{ number: "", type: "Mobile", primary: true }],
    },
    homeAddress: { street: "", suburb: "", state: "QLD", postcode: "" },
    billingAddress: { street: "", suburb: "", state: "QLD", postcode: "" },
    clubId: "", // Added to link to existing club logic
  });

  // --- FETCH GLOBAL CONFIG ON MOUNT ---
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/config/global");
        if (!res.ok) throw new Error("Failed to fetch configuration");
        const data = await res.json();
        setConfig(data);

        // Default gender to first available
        if (data.genders.length > 0) {
          setFormData((prev) => ({
            ...prev,
            personal: { ...prev.personal, genderId: data.genders[0].id },
          }));
        }
      } catch (err) {
        setError("Configuration load failed.");
      } finally {
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) alert("Record Saved Successfully!");
    } catch (err) {
      alert("Error saving record");
    }
  };

  if (isLoading)
    return (
      <div className="flex p-10 justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-100 max-w-4xl mx-auto space-y-8"
    >
      <h2 className="text-2xl font-black uppercase text-[#06054e] flex items-center gap-2">
        <UserPlus className="text-yellow-500" /> New Person Registration
      </h2>

      {/* 1. PERSONAL DETAILS */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase text-slate-400 border-b pb-1">
          Personal Details
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="First Name"
            required
            className="p-4 bg-slate-50 border rounded-2xl outline-none font-bold"
            onChange={(e) =>
              setFormData({
                ...formData,
                personal: { ...formData.personal, firstName: e.target.value },
              })
            }
          />
          <input
            type="text"
            placeholder="Last Name"
            required
            className="p-4 bg-slate-50 border rounded-2xl outline-none font-bold"
            onChange={(e) =>
              setFormData({
                ...formData,
                personal: { ...formData.personal, lastName: e.target.value },
              })
            }
          />
          <div className="flex flex-col">
            <label className="text-[10px] ml-2 text-slate-400 font-bold uppercase">
              Date of Birth
            </label>
            <input
              type="date"
              required
              className="p-4 bg-slate-50 border rounded-2xl outline-none font-bold"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  personal: { ...formData.personal, dob: e.target.value },
                })
              }
            />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select
            className="p-4 bg-slate-50 border rounded-2xl outline-none font-bold"
            value={formData.personal.genderId}
            onChange={(e) =>
              setFormData({
                ...formData,
                personal: { ...formData.personal, genderId: e.target.value },
              })
            }
          >
            {config.genders.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
          <select
            className="p-4 bg-slate-50 border rounded-2xl outline-none font-bold"
            onChange={(e) =>
              setFormData({ ...formData, clubId: e.target.value })
            }
          >
            <option value="">Select Club Association</option>
            {config.clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* 2. ADDRESSES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 border-b pb-1">
            Home Address
          </h3>
          <input
            type="text"
            placeholder="Street"
            className="w-full p-3 bg-slate-50 border rounded-xl"
            onChange={(e) =>
              setFormData({
                ...formData,
                homeAddress: {
                  ...formData.homeAddress,
                  street: e.target.value,
                },
              })
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Suburb"
              className="p-3 bg-slate-50 border rounded-xl"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  homeAddress: {
                    ...formData.homeAddress,
                    suburb: e.target.value,
                  },
                })
              }
            />
            <input
              type="text"
              placeholder="Postcode"
              className="p-3 bg-slate-50 border rounded-xl"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  homeAddress: {
                    ...formData.homeAddress,
                    postcode: e.target.value,
                  },
                })
              }
            />
          </div>
        </section>

        <section className="space-y-4">
          <h3 className="text-xs font-black uppercase text-slate-400 border-b pb-1">
            Billing Address
          </h3>
          <input
            type="text"
            placeholder="Street"
            className="w-full p-3 bg-slate-50 border rounded-xl"
            onChange={(e) =>
              setFormData({
                ...formData,
                billingAddress: {
                  ...formData.billingAddress,
                  street: e.target.value,
                },
              })
            }
          />
          <div className="grid grid-cols-2 gap-2">
            <input
              type="text"
              placeholder="Suburb"
              className="p-3 bg-slate-50 border rounded-xl"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    suburb: e.target.value,
                  },
                })
              }
            />
            <input
              type="text"
              placeholder="Postcode"
              className="p-3 bg-slate-50 border rounded-xl"
              onChange={(e) =>
                setFormData({
                  ...formData,
                  billingAddress: {
                    ...formData.billingAddress,
                    postcode: e.target.value,
                  },
                })
              }
            />
          </div>
        </section>
      </div>

      {/* 3. ROLES (Checkboxes) */}
      <section className="space-y-4">
        <h3 className="text-xs font-black uppercase text-slate-400 border-b pb-1">
          Assigned Roles
        </h3>
        <div className="flex flex-wrap gap-4">
          {config.roles.map((role) => (
            <label
              key={role.id}
              className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl cursor-pointer hover:bg-yellow-50 transition-colors"
            >
              <input
                type="checkbox"
                checked={formData.roles.includes(role.id)}
                onChange={(e) => {
                  const newRoles = e.target.checked
                    ? [...formData.roles, role.id]
                    : formData.roles.filter((r) => r !== role.id);
                  setFormData({ ...formData, roles: newRoles });
                }}
              />
              <span className="text-sm font-bold text-[#06054e]">
                {role.label}
              </span>
            </label>
          ))}
        </div>
      </section>

      <button className="w-full bg-[#06054e] text-white p-5 rounded-2xl font-black uppercase flex items-center justify-center gap-2 hover:bg-yellow-400 hover:text-[#06054e] transition-all shadow-xl">
        <Save size={24} /> Register Person & Save Addresses
      </button>
    </form>
  );
}
