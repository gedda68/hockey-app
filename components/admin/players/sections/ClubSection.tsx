// sections/ClubSection.tsx
// FIXED: Properly initializes club object and auto-fills all fields

"use client";

import { useState, useEffect } from "react";
import FormField from "../shared/FormField";
import { BaseSectionProps } from "@/types/player.types";
import {
  Building,
  Calendar,
  Hash,
  Users,
  History,
  Plus,
  Trash2,
  CheckCircle,
} from "lucide-react";

interface ClubTransfer {
  id: string;
  clubName: string;
  fromDate: string;
  toDate: string;
  transferType: string;
  notes: string;
}

export default function ClubSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const [clubs, setClubs] = useState<any[]>([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [nextRegistrationNumber, setNextRegistrationNumber] =
    useState<string>("");
  const [memberNumber, setMemberNumber] = useState<string>("");
  const [loadingMemberNumber, setLoadingMemberNumber] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Position options for type-ahead
  const [positionSearch, setPositionSearch] = useState({
    primary: "",
    secondary: "",
  });
  const [positions] = useState<string[]>([
    "Goalkeeper",
    "Defender",
    "Centre Back",
    "Sweeper",
    "Full Back",
    "Wing Back",
    "Midfielder",
    "Defensive Midfielder",
    "Attacking Midfielder",
    "Winger",
    "Forward",
    "Striker",
    "Centre Forward",
    "Wing",
  ]);

  // Get club object safely - ALWAYS return an object
  const club = formData.club || {};

  // ✨ CRITICAL FIX: Initialize club object on mount
  useEffect(() => {
    if (!initialized) {
      console.log("🎬 Initializing club object...");

      const today = new Date().toISOString().split("T")[0];
      const endOfYear = new Date(new Date().getFullYear(), 11, 31)
        .toISOString()
        .split("T")[0];

      // Create initial club object with defaults
      const initialClub = {
        registrationDate: today,
        registrationEndDate: endOfYear,
        registrationNumber: "",
        memberNumber: "",
        transferHistory: [],
      };

      console.log("📝 Setting initial club object:", initialClub);
      onChange("club", initialClub);
      setInitialized(true);
    }
  }, [initialized]);

  // Fetch next registration number and SET IT
  useEffect(() => {
    const fetchAndSetRegistrationNumber = async () => {
      try {
        console.log("🔢 Fetching next registration number...");
        const res = await fetch("/api/admin/players/next-registration-number");
        if (res.ok) {
          const data = await res.json();
          const nextNum = data.nextNumber || "0000000001";
          console.log("✅ Got next registration number:", nextNum);
          setNextRegistrationNumber(nextNum);

          // ✨ FIX: Actually SET the registration number
          console.log("📝 Setting club.registrationNumber to:", nextNum);
          onChange("club", {
            ...club,
            registrationNumber: nextNum,
          });
        }
      } catch (error) {
        console.error("❌ Error fetching registration number:", error);
        const fallback = "0000000001";
        setNextRegistrationNumber(fallback);
        onChange("club", {
          ...club,
          registrationNumber: fallback,
        });
      }
    };

    // Only fetch after initialization
    if (initialized && !club.registrationNumber) {
      fetchAndSetRegistrationNumber();
    }
  }, [initialized]);

  // Fetch member number and SET IT
  useEffect(() => {
    const fetchAndSetMemberNumber = async () => {
      if (!formData.linkedMemberId) {
        console.log("⚠️ No linkedMemberId - skipping member number fetch");
        setMemberNumber("");
        return;
      }

      console.log("🔍 Fetching member number for:", formData.linkedMemberId);
      setLoadingMemberNumber(true);

      try {
        const res = await fetch(
          `/api/admin/members/${formData.linkedMemberId}`,
        );
        if (res.ok) {
          const member = await res.json();
          console.log("✅ Got member data:", member);

          // ✨ FIX: Use linkedMemberId as memberNumber
          const memberNum = formData.linkedMemberId;
          console.log("📝 Setting club.memberNumber to:", memberNum);

          setMemberNumber(memberNum);

          // ✨ FIX: Actually SET the member number
          onChange("club", {
            ...club,
            memberNumber: memberNum,
          });
        } else {
          console.error("❌ Failed to fetch member:", res.status);
          // Still set the linkedMemberId as memberNumber
          const memberNum = formData.linkedMemberId;
          setMemberNumber(memberNum);
          onChange("club", {
            ...club,
            memberNumber: memberNum,
          });
        }
      } catch (error) {
        console.error("❌ Error fetching member:", error);
        // Still set the linkedMemberId as memberNumber
        const memberNum = formData.linkedMemberId;
        setMemberNumber(memberNum);
        onChange("club", {
          ...club,
          memberNumber: memberNum,
        });
      } finally {
        setLoadingMemberNumber(false);
      }
    };

    // Only fetch after initialization
    if (initialized && formData.linkedMemberId) {
      fetchAndSetMemberNumber();
    }
  }, [initialized, formData.linkedMemberId]);

  // Fetch clubs
  useEffect(() => {
    const fetchClubs = async () => {
      try {
        const res = await fetch("/api/admin/clubs");
        if (res.ok) {
          const data = await res.json();
          setClubs(data.clubs || data || []);
        }
      } catch (error) {
        console.error("Error fetching clubs:", error);
      } finally {
        setLoadingClubs(false);
      }
    };
    fetchClubs();
  }, []);

  const updateClubField = (field: string, value: any) => {
    console.log(`📝 Updating club.${field} to:`, value);
    onChange("club", {
      ...club,
      [field]: value,
    });
  };

  const getFilteredPositions = (searchTerm: string) => {
    if (!searchTerm) return positions;
    return positions.filter((pos) =>
      pos.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  };

  // Get transfer history safely
  const transferHistory = club?.transferHistory || [];

  const addTransfer = () => {
    const newTransfer: ClubTransfer = {
      id: `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      clubName: "",
      fromDate: "",
      toDate: "",
      transferType: "transfer",
      notes: "",
    };
    onChange("club", {
      ...club,
      transferHistory: [...transferHistory, newTransfer],
    });
  };

  const removeTransfer = (id: string) => {
    onChange("club", {
      ...club,
      transferHistory: transferHistory.filter((t: ClubTransfer) => t.id !== id),
    });
  };

  const updateTransfer = (
    id: string,
    field: keyof ClubTransfer,
    value: string,
  ) => {
    onChange("club", {
      ...club,
      transferHistory: transferHistory.map((t: ClubTransfer) =>
        t.id === id ? { ...t, [field]: value } : t,
      ),
    });
  };

  return (
    <div className="space-y-6">
      {/* Current Club */}
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1 flex items-center gap-2">
          <Building size={16} />
          Current Club <span className="text-red-500">*</span>
        </label>
        {loadingClubs ? (
          <div className="px-5 py-4 bg-slate-100 border-2 border-slate-100 rounded-2xl text-slate-500 font-bold">
            Loading clubs...
          </div>
        ) : (
          <select
            value={formData.clubId || ""}
            onChange={(e) => onChange("clubId", e.target.value)}
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
          >
            <option value="">Select a club...</option>
            {clubs.map((clubItem) => (
              <option
                key={clubItem.clubId || clubItem.id}
                value={clubItem.clubId || clubItem.id}
              >
                {clubItem.name}
              </option>
            ))}
          </select>
        )}
        {errors.clubId && (
          <p className="text-xs text-red-600 mt-1 ml-1">{errors.clubId}</p>
        )}
      </div>

      {/* Registration Details */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
          <Calendar size={16} />
          Registration Details
        </h3>

        {/* Registration Dates */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Registration Start Date
            </label>
            <input
              type="date"
              value={club?.registrationDate || ""}
              onChange={(e) =>
                updateClubField("registrationDate", e.target.value)
              }
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Defaults to today's date
            </p>
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Registration End Date
            </label>
            <input
              type="date"
              value={club?.registrationEndDate || ""}
              onChange={(e) =>
                updateClubField("registrationEndDate", e.target.value)
              }
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Defaults to end of current year
            </p>
          </div>
        </div>

        {/* Registration Number and Member Number */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Registration Number{" "}
              <span className="text-blue-600">(Read-only)</span>
            </label>
            <div className="relative">
              <Hash
                size={16}
                className="absolute left-4 top-4 text-slate-400"
              />
              <input
                type="text"
                value={club?.registrationNumber || "Auto-generated"}
                readOnly
                disabled
                className="w-full pl-12 pr-4 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-slate-600 cursor-not-allowed"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Sequential number auto-assigned from database
            </p>
            {nextRegistrationNumber && (
              <p className="text-xs text-blue-700 font-bold mt-1 ml-1">
                💡 Will be assigned: {nextRegistrationNumber}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Member Number <span className="text-blue-600">(Read-only)</span>
            </label>
            <div className="relative">
              <Hash
                size={16}
                className="absolute left-4 top-4 text-slate-400"
              />
              <input
                type="text"
                value={
                  loadingMemberNumber
                    ? "Loading..."
                    : club?.memberNumber || "No member number"
                }
                readOnly
                disabled
                className="w-full pl-12 pr-12 py-4 bg-slate-100 border-2 border-slate-200 rounded-2xl font-black text-slate-600 cursor-not-allowed"
              />
              {formData.linkedMemberId && club?.memberNumber && (
                <div className="absolute right-4 top-4">
                  <CheckCircle size={20} className="text-green-500" />
                </div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1 ml-1">
              {formData.linkedMemberId && club?.memberNumber
                ? "✓ Retrieved from linked member record"
                : "⚠️ Link player to member in Personal section to auto-fill"}
            </p>
          </div>
        </div>
      </div>

      {/* Playing Positions */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
          <Users size={16} />
          Playing Positions{" "}
          <span className="text-slate-400 font-normal normal-case">
            (Optional)
          </span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="relative">
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Primary Position
            </label>
            <input
              type="text"
              value={formData.primaryPosition || positionSearch.primary}
              onChange={(e) => {
                setPositionSearch((prev) => ({
                  ...prev,
                  primary: e.target.value,
                }));
                onChange("primaryPosition", e.target.value);
              }}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
              placeholder="Type to search..."
            />
            {positionSearch.primary &&
              getFilteredPositions(positionSearch.primary).length > 0 &&
              !positions.some(
                (p) => p.toLowerCase() === positionSearch.primary.toLowerCase(),
              ) && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border-2 border-slate-200 rounded-xl shadow-lg">
                  {getFilteredPositions(positionSearch.primary).map(
                    (position) => (
                      <button
                        key={position}
                        type="button"
                        onClick={() => {
                          onChange("primaryPosition", position);
                          setPositionSearch((prev) => ({
                            ...prev,
                            primary: position,
                          }));
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 font-bold text-slate-900"
                      >
                        {position}
                      </button>
                    ),
                  )}
                </div>
              )}
          </div>

          <div className="relative">
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Secondary Position
            </label>
            <input
              type="text"
              value={formData.secondaryPosition || positionSearch.secondary}
              onChange={(e) => {
                setPositionSearch((prev) => ({
                  ...prev,
                  secondary: e.target.value,
                }));
                onChange("secondaryPosition", e.target.value);
              }}
              className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-yellow-400 outline-none"
              placeholder="Type to search..."
            />
            {positionSearch.secondary &&
              getFilteredPositions(positionSearch.secondary).length > 0 &&
              !positions.some(
                (p) =>
                  p.toLowerCase() === positionSearch.secondary.toLowerCase(),
              ) && (
                <div className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto bg-white border-2 border-slate-200 rounded-xl shadow-lg">
                  {getFilteredPositions(positionSearch.secondary).map(
                    (position) => (
                      <button
                        key={position}
                        type="button"
                        onClick={() => {
                          onChange("secondaryPosition", position);
                          setPositionSearch((prev) => ({
                            ...prev,
                            secondary: position,
                          }));
                        }}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0 font-bold text-slate-900"
                      >
                        {position}
                      </button>
                    ),
                  )}
                </div>
              )}
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-xs text-blue-900 font-bold mb-2">
            💡 <strong>Available Positions:</strong>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-blue-700">
            {positions.slice(0, 8).map((pos) => (
              <div key={pos}>• {pos}</div>
            ))}
          </div>
          <p className="text-xs text-blue-600 mt-2">
            Start typing to see all {positions.length} options
          </p>
        </div>
      </div>

      {/* Team Assignment Placeholder */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
          <Users size={16} />
          Team Assignment{" "}
          <span className="text-slate-400 font-normal normal-case">
            (Coming Soon)
          </span>
        </h3>
        <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
          <Users size={32} className="mx-auto text-slate-300 mb-2" />
          <p className="text-sm text-slate-600 font-bold">
            Team selection will be available soon
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Players will be able to be assigned to specific teams within their
            club
          </p>
        </div>
      </div>

      {/* Transfer History */}
      <div className="pt-4 border-t-2 border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
            <History size={16} />
            Transfer History{" "}
            <span className="text-slate-400 font-normal normal-case">
              (Optional)
            </span>
          </h3>
          <button
            type="button"
            onClick={addTransfer}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
          >
            <Plus size={14} />
            Add Transfer
          </button>
        </div>

        {transferHistory.length === 0 ? (
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <History size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-600 font-bold">
              No transfer history
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Click "Add Transfer" to record previous club transfers
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {transferHistory.map((transfer) => (
              <div
                key={transfer.id}
                className="p-4 bg-white border-2 border-slate-100 rounded-2xl"
              >
                <div className="flex items-start justify-between mb-3">
                  <h4 className="text-sm font-black text-slate-900">
                    Transfer Record
                  </h4>
                  <button
                    type="button"
                    onClick={() => removeTransfer(transfer.id)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    label="Club Name"
                    name="clubName"
                    value={transfer.clubName}
                    onChange={(val) =>
                      updateTransfer(transfer.id, "clubName", val)
                    }
                    placeholder="Previous club name"
                  />

                  <FormField
                    label="Transfer Type"
                    name="transferType"
                    type="select"
                    value={transfer.transferType}
                    onChange={(val) =>
                      updateTransfer(transfer.id, "transferType", val)
                    }
                    options={[
                      { value: "transfer", label: "Transfer" },
                      { value: "loan", label: "Loan" },
                      { value: "return", label: "Return from Loan" },
                    ]}
                  />

                  <FormField
                    label="From Date"
                    name="fromDate"
                    type="date"
                    value={transfer.fromDate}
                    onChange={(val) =>
                      updateTransfer(transfer.id, "fromDate", val)
                    }
                  />

                  <FormField
                    label="To Date"
                    name="toDate"
                    type="date"
                    value={transfer.toDate}
                    onChange={(val) =>
                      updateTransfer(transfer.id, "toDate", val)
                    }
                  />
                </div>

                <div className="mt-4">
                  <FormField
                    label="Notes"
                    name="notes"
                    value={transfer.notes}
                    onChange={(val) =>
                      updateTransfer(transfer.id, "notes", val)
                    }
                    placeholder="Additional transfer details..."
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
