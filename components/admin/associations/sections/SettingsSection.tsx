// sections/SettingsSection.tsx
// Association settings and rules

import { BaseSectionProps } from "../types/association.types";

export default function SettingsSection({
  formData,
  onChange,
}: BaseSectionProps) {
  const settingOptions = [
    {
      id: "requiresApproval",
      title: "Requires Approval",
      sub: "Admins must manually verify new members",
    },
    {
      id: "autoApproveReturningPlayers",
      title: "Auto-approve Returning Players",
      sub: "Skip manual approval for existing members",
    },
    {
      id: "allowMultipleClubs",
      title: "Allow Multiple Club Memberships",
      sub: "Members can join more than one club",
    },
    {
      id: "requiresInsurance",
      title: "Mandatory Insurance",
      sub: "Personal accident cover is required for all members",
    },
    {
      id: "requiresMedicalInfo",
      title: "Collect Medical Information",
      sub: "Request allergies and conditions during sign-up",
    },
    {
      id: "requiresEmergencyContact",
      title: "Require Emergency Contact",
      sub: "Members must provide an emergency contact",
    },
  ];

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(2000, i).toLocaleString("default", { month: "long" }),
  }));

  return (
    <div className="space-y-6">
      {/* Settings Checkboxes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {settingOptions.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-4 p-5 rounded-2xl border-2 border-slate-100 hover:border-yellow-200 transition-all cursor-pointer bg-slate-50/30"
          >
            <input
              type="checkbox"
              checked={(formData as any)[item.id]}
              onChange={(e) => onChange(item.id, e.target.checked)}
              className="mt-1 w-5 h-5 accent-[#06054e]"
            />
            <div>
              <span className="block font-black text-[#06054e] text-sm">
                {item.title}
              </span>
              <span className="text-xs font-bold text-slate-400">
                {item.sub}
              </span>
            </div>
          </label>
        ))}
      </div>

      {/* Season Dates */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t-2 border-slate-100">
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
            Season Start Month
          </label>
          <select
            value={formData.seasonStartMonth}
            onChange={(e) =>
              onChange("seasonStartMonth", parseInt(e.target.value))
            }
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
            Season End Month
          </label>
          <select
            value={formData.seasonEndMonth}
            onChange={(e) =>
              onChange("seasonEndMonth", parseInt(e.target.value))
            }
            className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
          >
            {months.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
