// sections/ClubSection.tsx
// Player club and team association

import { BaseSectionProps, Club, Team, POSITIONS } from "../types/player.types";
import { Building2, Users, Target } from "lucide-react";

interface ClubSectionProps extends BaseSectionProps {
  clubs: Club[];
  teams: Team[];
}

export default function ClubSection({
  formData,
  onChange,
  errors,
  clubs,
  teams,
}: ClubSectionProps) {
  // Filter teams by selected club
  const clubTeams = teams.filter((t) => t.clubId === formData.clubId);
  const selectedClub = clubs.find((c) => c.id === formData.clubId);

  const handleClubChange = (clubId: string) => {
    onChange("clubId", clubId);
    // Reset teams when club changes
    onChange("teamIds", []);
  };

  const handleTeamSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
    onChange("teamIds", selected);
  };

  return (
    <div className="space-y-6">
      {/* Club Selection */}
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1 flex items-center gap-2">
          <Building2 size={16} />
          Club <span className="text-red-500">*</span>
        </label>
        <select
          value={formData.clubId}
          onChange={(e) => handleClubChange(e.target.value)}
          className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
        >
          <option value="">Select a club...</option>
          {clubs.map((club) => (
            <option key={club.id} value={club.id}>
              {club.name} ({club.shortName})
            </option>
          ))}
        </select>
        {errors.clubId && (
          <p className="text-xs text-red-500 font-bold mt-1 ml-1">
            {errors.clubId}
          </p>
        )}
        <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
          The hockey club the player is registered with
        </p>
      </div>

      {/* Team Selection - Only show if club is selected */}
      {formData.clubId && (
        <div>
          <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1 flex items-center gap-2">
            <Users size={16} />
            Teams
          </label>
          {clubTeams.length > 0 ? (
            <>
              <select
                multiple
                value={formData.teamIds}
                onChange={handleTeamSelection}
                className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none min-h-[120px]"
              >
                {clubTeams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name} - {team.division} ({team.season})
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple teams
              </p>
              {formData.teamIds.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {formData.teamIds.map((teamId) => {
                    const team = clubTeams.find((t) => t.id === teamId);
                    return team ? (
                      <span
                        key={teamId}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold"
                      >
                        {team.name}
                      </span>
                    ) : null;
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
              <Users size={32} className="mx-auto text-slate-300 mb-2" />
              <p className="text-sm font-bold text-slate-400">
                No teams available for {selectedClub?.name}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Teams can be added later by club administrators
              </p>
            </div>
          )}
        </div>
      )}

      {/* Position Selection */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
          <Target size={16} />
          Playing Positions
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Primary Position <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.primaryPosition}
              onChange={(e) => onChange("primaryPosition", e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            >
              <option value="">Select position...</option>
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
            {errors.primaryPosition && (
              <p className="text-xs text-red-500 font-bold mt-1 ml-1">
                {errors.primaryPosition}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Secondary Position
            </label>
            <select
              value={formData.secondaryPosition}
              onChange={(e) => onChange("secondaryPosition", e.target.value)}
              className="w-full px-5 py-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold focus:border-yellow-400 outline-none"
            >
              <option value="">Select position...</option>
              {POSITIONS.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-400 font-bold mt-1 ml-1">
              Optional - for players who play multiple positions
            </p>
          </div>
        </div>

        {/* Position Preview */}
        {formData.primaryPosition && (
          <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <p className="text-sm font-bold text-blue-900">
              <span className="text-blue-600">Position:</span>{" "}
              {formData.primaryPosition}
              {formData.secondaryPosition && ` / ${formData.secondaryPosition}`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
