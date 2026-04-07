"use client";

import { Award } from "lucide-react";
import type { AddMemberFormData } from "./member-form-types";

interface RoleOption {
  roleId: string;
  name: string;
  category?: string;
  displayOrder?: number;
  icon?: string;
  description?: string;
}

interface MembershipTypeOption {
  typeId: string;
  name: string;
  description?: string;
  basePrice?: number;
}

interface PlayerInfo {
  jerseyNumber: string;
  position: string;
}

interface Step3MembershipRolesProps {
  formData: AddMemberFormData;
  setFormData: React.Dispatch<React.SetStateAction<AddMemberFormData>>;
  membershipTypes: MembershipTypeOption[];
  roles: RoleOption[];
  rolesByCategory: Record<string, RoleOption[]>;
  toggleRole: (roleId: string) => void;
}

export function Step3MembershipRoles({
  formData,
  setFormData,
  membershipTypes,
  roles,
  rolesByCategory,
  toggleRole,
}: Step3MembershipRolesProps) {
  return (
    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-6 sm:p-8">
      <h2 className="text-2xl font-black uppercase text-[#06054e] mb-6 flex items-center gap-2">
        <Award size={24} />
        Membership & Roles
      </h2>

      <div className="space-y-6">
        {/* Membership Type */}
        <div>
          <label className="text-xs font-black uppercase text-slate-400 ml-2">
            Membership Type *
          </label>
          <select
            required
            value={formData.membership.membershipType}
            onChange={(e) =>
              setFormData({
                ...formData,
                membership: {
                  ...formData.membership,
                  membershipType: e.target.value,
                },
              })
            }
            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
          >
            <option value="">Select membership type</option>
            {membershipTypes.map((type) => (
              <option key={type.typeId} value={type.typeId}>
                {type.name} - ${type.basePrice}
              </option>
            ))}
          </select>
        </div>

        {/* Member Roles */}
        <div>
          <label className="text-xs font-black uppercase text-slate-400 ml-2 mb-3 block">
            Member Roles * (Select at least one)
          </label>

          {Object.entries(rolesByCategory).map(
            ([category, categoryRoles]: [string, any]) => (
              <div key={category} className="mb-6">
                <h4 className="text-sm font-black text-slate-600 mb-3">
                  {category}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {categoryRoles.map((role: RoleOption) => (
                    <button
                      key={role.roleId}
                      type="button"
                      onClick={() => toggleRole(role.roleId)}
                      className={`p-4 rounded-xl border-2 transition-all text-left ${
                        formData.roles.includes(role.roleId)
                          ? "border-[#06054e] bg-[#06054e] text-white"
                          : "border-slate-200 bg-slate-50 hover:border-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {role.icon || "🏑"}
                        </span>
                        <div>
                          <p
                            className={`font-black ${
                              formData.roles.includes(role.roleId)
                                ? "text-white"
                                : "text-slate-900"
                            }`}
                          >
                            {role.name}
                          </p>
                          {role.description && (
                            <p
                              className={`text-xs mt-1 ${
                                formData.roles.includes(role.roleId)
                                  ? "text-white/80"
                                  : "text-slate-500"
                              }`}
                            >
                              {role.description}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ),
          )}
        </div>

        {/* Player Info (conditional) */}
        {formData.playerInfo && (
          <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-2xl">
            <h3 className="text-lg font-black text-blue-900 mb-4">
              Player Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="text-xs font-black uppercase text-blue-700 ml-2">
                  Jersey Number
                </label>
                <input
                  type="text"
                  value={formData.playerInfo.jerseyNumber || ""}
                  onChange={(e) => {
                    // Only allow integers (0-99)
                    const value = e.target.value;
                    if (value === "" || /^\d{1,2}$/.test(value)) {
                      setFormData({
                        ...formData,
                        playerInfo: {
                          ...formData.playerInfo!,
                          jerseyNumber: value,
                        },
                      });
                    }
                  }}
                  className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                  placeholder="7"
                  maxLength={2}
                />
              </div>
              <div>
                <label className="text-xs font-black uppercase text-blue-700 ml-2">
                  Position
                </label>
                <select
                  value={formData.playerInfo.position || ""}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      playerInfo: {
                        ...formData.playerInfo!,
                        position: e.target.value,
                      },
                    })
                  }
                  className="w-full p-3 bg-white border border-blue-200 rounded-xl outline-none font-bold focus:ring-2 ring-blue-400"
                >
                  <option value="">Select position</option>
                  <option value="Forward">Forward</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Defender">Defender</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Status and Join Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-xs font-black uppercase text-slate-400 ml-2">
              Status
            </label>
            <select
              value={formData.membership.status}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  membership: {
                    ...formData.membership,
                    status: e.target.value,
                  },
                })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            >
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Pending">Pending</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-black uppercase text-slate-400 ml-2">
              Join Date *
            </label>
            <input
              type="date"
              required
              value={formData.membership.joinDate}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  membership: {
                    ...formData.membership,
                    joinDate: e.target.value,
                  },
                })
              }
              className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-2 ring-yellow-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
