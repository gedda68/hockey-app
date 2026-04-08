// app/admin/components/StaffSection.tsx

import Image from "next/image";
import { Staff } from "../types";

interface StaffSectionProps {
  staff: {
    coach?: Staff;
    asstCoach?: Staff;
    manager?: Staff;
    umpire?: Staff;
  };
  onEdit: (role: string, staff: Staff) => void;
  onDelete: (role: string) => void;
}

export default function StaffSection({
  staff,
  onEdit,
  onDelete,
}: StaffSectionProps) {
  const staffRoles = [
    { key: "coach", label: "Coach" },
    { key: "asstCoach", label: "Asst Coach" },
    { key: "manager", label: "Manager" },
    { key: "umpire", label: "Umpire" },
  ];

  return (
    <div className="mt-6 pt-6 border-t border-slate-200">
      <h4 className="text-sm font-black uppercase text-slate-600 mb-4">
        Staff
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {staffRoles.map(({ key, label }) => {
          const member = staff[key as keyof typeof staff];

          return (
            <div
              key={key}
              className="p-4 bg-white rounded-xl border border-slate-200"
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-black uppercase text-slate-500">
                  {label}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() =>
                      onEdit(key, member || { name: "", club: "", icon: "" })
                    }
                    className="px-2 py-1 bg-blue-600 text-white rounded-full text-xs font-black uppercase hover:bg-blue-700"
                  >
                    {member ? "Edit" : "Add"}
                  </button>
                  {member && (
                    <button
                      onClick={() => onDelete(key)}
                      className="px-2 py-1 bg-red-600 text-white rounded-full text-xs font-black uppercase hover:bg-red-700"
                    >
                      Del
                    </button>
                  )}
                </div>
              </div>

              {member ? (
                <div className="flex items-center gap-2">
                  {member.icon && (
                    <div className="w-6 h-6 relative flex-shrink-0">
                      <Image
                        src={member.icon}
                        alt={member.club}
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-bold text-sm truncate">
                      {member.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {member.club}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm italic text-slate-400">
                  Not assigned
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
