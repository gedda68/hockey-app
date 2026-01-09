import { Calendar, MapPin, Users, Whistle } from "lucide-react";
import { GiWhistle } from "react-icons/gi";

interface UmpireAllocationCardProps {
  allocation: {
    matchId: string;
    match: {
      division: string;
      homeTeam: { name: string };
      awayTeam: { name: string };
      round: number;
      status: string;
      dateTime: string;
      venue: string;
      score?: { home: number; away: number };
    };
    assignedUmpires: Array<{
      umpireNumber: string;
      firstName: string;
      lastName: string;
      club: string;
      umpireLevel: string;
      email?: string;
      phone?: string;
    }>;
    umpires: Array<{
      umpireId: string;
      role: string;
    }>;
  };
}

export default function UmpireAllocationCard({
  allocation,
}: UmpireAllocationCardProps) {
  const { match, assignedUmpires, umpires } = allocation;

  // Format date and time
  const matchDate = new Date(match.dateTime);
  const formattedDate = matchDate.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const formattedTime = matchDate.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "Live":
        return "bg-red-600 text-white";
      case "Final":
        return "bg-slate-600 text-white";
      case "Scheduled":
        return "bg-green-600 text-white";
      case "Postponed":
        return "bg-yellow-600 text-white";
      case "Cancelled":
        return "bg-red-600 text-white";
      default:
        return "bg-slate-400 text-white";
    }
  };

  // Get role display name
  const getRoleDisplay = (role: string) => {
    switch (role) {
      case "umpire1":
        return "Umpire 1";
      case "umpire2":
        return "Umpire 2";
      case "reserve":
        return "Reserve";
      default:
        return role;
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-shadow">
      {/* Match Header */}
      <div className="flex items-start justify-between mb-4 pb-4 border-b-2 border-slate-200">
        <div className="flex-1">
          {/* Division Badge */}
          <span className="inline-block px-3 py-1 bg-[#06054e] text-white rounded-full text-[9px] font-black uppercase tracking-wide mb-2">
            {match.division}
          </span>

          {/* Teams */}
          <h3 className="text-lg font-black uppercase text-slate-900 mb-1">
            {match.homeTeam.name} vs {match.awayTeam.name}
          </h3>

          {/* Round */}
          <p className="text-[10px] font-bold text-slate-500 uppercase">
            Round {match.round}
          </p>
        </div>

        {/* Status Badge */}
        <span
          className={`px-3 py-1 rounded-full text-[9px] font-black uppercase ${getStatusColor(
            match.status
          )}`}
        >
          {match.status}
        </span>
      </div>

      {/* Match Details */}
      <div className="space-y-3 mb-4 pb-4 border-b-2 border-slate-200">
        {/* Date & Time */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">
            {formattedDate} at {formattedTime}
          </span>
        </div>

        {/* Venue */}
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-medium text-slate-600">
            {match.venue}
          </span>
        </div>

        {/* Score (if available) */}
        {match.score && (
          <div className="flex items-center gap-4 mt-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500">
                {match.homeTeam.name}
              </span>
              <span className="text-2xl font-black text-[#06054e]">
                {match.score.home}
              </span>
            </div>
            <span className="text-slate-400">-</span>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-[#06054e]">
                {match.score.away}
              </span>
              <span className="text-xs font-bold text-slate-500">
                {match.awayTeam.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Umpires Section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <GiWhistleWhistle className="w-4 h-4 text-[#06054e]" />
          <h4 className="text-xs font-black uppercase text-[#06054e]">
            Assigned Umpires
          </h4>
        </div>

        {assignedUmpires.length === 0 ? (
          <div className="flex items-center gap-2 text-slate-400">
            <Users className="w-4 h-4" />
            <span className="text-xs font-medium">No umpires assigned yet</span>
          </div>
        ) : (
          <div className="space-y-2">
            {umpires.map((umpireAllocation) => {
              const umpire = assignedUmpires.find(
                (u) => u.umpireNumber === umpireAllocation.umpireId
              );

              if (!umpire) return null;

              return (
                <div
                  key={umpireAllocation.umpireId}
                  className="flex items-center justify-between p-3 bg-slate-50 rounded-xl"
                >
                  {/* Umpire Info */}
                  <div className="flex items-center gap-3">
                    {/* Umpire Number Badge */}
                    <div className="w-8 h-8 rounded-full bg-[#06054e] text-white flex items-center justify-center">
                      <span className="text-xs font-black">
                        {umpire.umpireNumber}
                      </span>
                    </div>

                    {/* Name & Club */}
                    <div>
                      <p className="text-xs font-black text-slate-900">
                        {umpire.firstName} {umpire.lastName}
                      </p>
                      <p className="text-[9px] font-bold text-slate-500 uppercase">
                        {umpire.club}
                      </p>
                    </div>
                  </div>

                  {/* Role Badge */}
                  <div className="flex items-center gap-2">
                    {/* Level Badge */}
                    <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase">
                      {umpire.umpireLevel}
                    </span>

                    {/* Role Badge */}
                    <span className="px-2 py-1 bg-slate-200 text-slate-700 rounded text-[8px] font-black uppercase">
                      {getRoleDisplay(umpireAllocation.role)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contact Info (if needed) */}
      {assignedUmpires.length > 0 &&
        assignedUmpires.some((u) => u.email || u.phone) && (
          <div className="mt-4 pt-4 border-t border-slate-200">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide mb-2">
              Contact Information
            </p>
            <div className="space-y-1">
              {assignedUmpires.map((umpire) => {
                if (!umpire.email && !umpire.phone) return null;

                return (
                  <div
                    key={umpire.umpireNumber}
                    className="text-xs text-slate-600"
                  >
                    <span className="font-bold">
                      {umpire.firstName} {umpire.lastName}:
                    </span>{" "}
                    {umpire.email && (
                      <a
                        href={`mailto:${umpire.email}`}
                        className="text-[#06054e] hover:underline"
                      >
                        {umpire.email}
                      </a>
                    )}
                    {umpire.email && umpire.phone && " • "}
                    {umpire.phone && (
                      <a
                        href={`tel:${umpire.phone}`}
                        className="text-[#06054e] hover:underline"
                      >
                        {umpire.phone}
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
    </div>
  );
}
