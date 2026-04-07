// sections/HistorySection.tsx
// Player play history and past teams - WITH CLUB NAME LOOKUP

"use client";

import { useState, useEffect } from "react";
import { BaseSectionProps, PlayerHistory } from "@/types/player.types";
import {
  History,
  Calendar,
  Building2,
  Users,
  Trophy,
  MapPin,
  Clock,
} from "lucide-react";

// Component to display club details with location and dates
function HistoryClubCard({
  clubId,
  clubName,
  startDate,
  endDate,
  isCurrent = false,
}: {
  clubId?: string;
  clubName?: string;
  startDate?: string;
  endDate?: string;
  isCurrent?: boolean;
}) {
  const [clubDetails, setClubDetails] = useState<{
    name?: string;
    city?: string;
    region?: string;
    state?: string;
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClubDetails = async () => {
      if (!clubId && clubName) {
        // If we already have the club name from history record, use it
        setClubDetails({ name: clubName });
        setLoading(false);
        return;
      }

      if (!clubId) {
        setClubDetails({ name: clubName || "Unknown Club" });
        setLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/clubs");
        if (res.ok) {
          const data = await res.json();
          const clubs = data.clubs || data || [];
          const club = clubs.find(
            (c: any) => c.clubId === clubId || c.id === clubId,
          );

          if (club) {
            setClubDetails({
              name: club.name || club.clubName || clubName || "Unknown Club",
              city: club.city || club.suburb,
              region: club.region,
              state: club.state,
            });
          } else {
            setClubDetails({ name: clubName || `Club ID: ${clubId}` });
          }
        } else {
          setClubDetails({ name: clubName || `Club ID: ${clubId}` });
        }
      } catch (error) {
        setClubDetails({ name: clubName || "Unknown Club" });
      } finally {
        setLoading(false);
      }
    };

    fetchClubDetails();
  }, [clubId, clubName]);

  const getLocationString = () => {
    const parts = [];
    if (clubDetails.city || clubDetails.region) {
      parts.push(clubDetails.city || clubDetails.region);
    }
    if (clubDetails.state) {
      parts.push(clubDetails.state);
    }
    return parts.length > 0 ? parts.join(", ") : "";
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="flex items-start gap-3">
      <Building2 size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-xs text-slate-500 font-bold">Club</p>
        {loading ? (
          <p className="text-sm text-slate-400 animate-pulse">Loading...</p>
        ) : (
          <>
            <p className="text-sm text-slate-900 font-black mt-0.5">
              {clubDetails.name}
            </p>
            {getLocationString() && (
              <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                <MapPin size={10} />
                {getLocationString()}
              </p>
            )}
            {(startDate || endDate || isCurrent) && (
              <div className="flex items-center gap-2 mt-2 text-xs">
                <Clock size={10} className="text-slate-400" />
                <span className="text-slate-600">
                  {startDate ? formatDate(startDate) : "Unknown"}
                  {" → "}
                  {isCurrent ? (
                    <span className="text-green-700 font-black">Current</span>
                  ) : endDate ? (
                    formatDate(endDate)
                  ) : (
                    "Unknown"
                  )}
                </span>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function HistorySection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const playHistory = formData?.playHistory || [];
  const teamIds = formData?.teamIds || [];
  const primaryPosition = formData?.primaryPosition || "";
  const secondaryPosition = formData?.secondaryPosition || "";
  const clubId = formData?.clubId || "";

  const [clubName, setClubName] = useState<string>("Loading...");
  const [clubDetails, setClubDetails] = useState<{
    city?: string;
    region?: string;
    state?: string;
  }>({});
  const [loadingClub, setLoadingClub] = useState(true);
  const [registrationStartDate, setRegistrationStartDate] =
    useState<string>("");

  // Fetch club name and details from clubId
  useEffect(() => {
    const fetchClubDetails = async () => {
      if (!clubId) {
        setClubName("Not assigned");
        setLoadingClub(false);
        return;
      }

      try {
        const res = await fetch("/api/admin/clubs");
        if (res.ok) {
          const data = await res.json();
          const clubs = data.clubs || data || [];
          const club = clubs.find(
            (c: any) => c.clubId === clubId || c.id === clubId,
          );

          if (club) {
            setClubName(club.name || club.clubName || "Unknown Club");
            setClubDetails({
              city: club.city || club.suburb,
              region: club.region,
              state: club.state,
            });
          } else {
            setClubName(`Club ID: ${clubId}`);
          }
        } else {
          setClubName(`Club ID: ${clubId}`);
        }
      } catch (error) {
        console.error("Error fetching club:", error);
        setClubName(`Club ID: ${clubId}`);
      } finally {
        setLoadingClub(false);
      }
    };

    fetchClubDetails();
  }, [clubId]);

  // Get registration start date from formData.club.registrationDate
  useEffect(() => {
    const regDate = formData?.club?.registrationDate;
    if (regDate) {
      setRegistrationStartDate(regDate);
    }
  }, [formData?.club?.registrationDate]);

  // Format location string
  const getLocationString = () => {
    const parts = [];
    if (clubDetails.city || clubDetails.region) {
      parts.push(clubDetails.city || clubDetails.region);
    }
    if (clubDetails.state) {
      parts.push(clubDetails.state);
    }
    return parts.length > 0 ? parts.join(", ") : "";
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-AU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  // Sort by season (most recent first)
  const sortedHistory = [...playHistory].sort((a, b) => {
    const yearA = parseInt(a.season);
    const yearB = parseInt(b.season);
    return yearB - yearA;
  });

  const currentYear = new Date().getFullYear();

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl flex items-start gap-3">
        <History size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <h4 className="text-sm font-black text-blue-900">Play History</h4>
          <p className="text-xs text-blue-700 mt-1">
            This section shows the player's registration and play history across
            different seasons, clubs, and teams. History is automatically
            populated from registration data.
          </p>
        </div>
      </div>

      {/* Current Season Summary */}
      <div className="p-6 bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-200 rounded-2xl">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl bg-yellow-400 flex items-center justify-center">
            <Trophy size={24} className="text-[#06054e]" />
          </div>
          <div>
            <h3 className="text-lg font-black text-[#06054e]">
              Current Season ({currentYear})
            </h3>
            <p className="text-sm text-yellow-800 font-bold">
              Active Registration
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {/* Club Info - Expanded card with location and dates */}
          <div className="bg-white/50 rounded-xl p-4 md:col-span-1">
            <p className="text-xs text-slate-600 font-bold mb-2">
              Current Club
            </p>
            {loadingClub ? (
              <span className="text-slate-400 animate-pulse">Loading...</span>
            ) : (
              <>
                <p className="text-base text-[#06054e] font-black mb-1">
                  {clubName}
                </p>
                {getLocationString() && (
                  <p className="text-xs text-slate-600 font-bold mb-2">
                    📍 {getLocationString()}
                  </p>
                )}
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 font-bold">
                        Start Date
                      </p>
                      <p className="text-xs text-[#06054e] font-black">
                        {registrationStartDate
                          ? formatDate(registrationStartDate)
                          : "Not set"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-bold">
                        End Date
                      </p>
                      <p className="text-xs text-green-700 font-black">
                        Current
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Teams and Position */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/50 rounded-xl p-3">
              <p className="text-xs text-slate-600 font-bold">Teams</p>
              <p className="text-sm text-[#06054e] font-black mt-1">
                {teamIds.length > 0 ? `${teamIds.length} team(s)` : "None"}
              </p>
            </div>
            <div className="bg-white/50 rounded-xl p-3">
              <p className="text-xs text-slate-600 font-bold">
                Playing Positions
              </p>
              <p className="text-sm text-[#06054e] font-black mt-1">
                {primaryPosition || "Not set"}
              </p>
              {secondaryPosition && (
                <p className="text-xs text-slate-600 mt-1">
                  Secondary: {secondaryPosition}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Historical Data */}
      <div>
        <h3 className="text-sm font-black text-slate-700 mb-4 flex items-center gap-2">
          <History size={18} />
          Previous Seasons
        </h3>

        {sortedHistory.length === 0 ? (
          <div className="p-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <Calendar size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-600 font-bold">No historical data yet</p>
            <p className="text-xs text-slate-400 mt-1">
              Play history will be automatically populated as the player
              registers for new seasons
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHistory.map((record, index) => (
              <div
                key={record.id}
                className="p-6 bg-white border-2 border-slate-100 rounded-2xl hover:border-yellow-400 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Season Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-lg bg-[#06054e] text-white flex items-center justify-center font-black">
                        {record.season}
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-[#06054e]">
                          {record.season} Season
                        </h4>
                        {index === 0 && sortedHistory.length > 1 && (
                          <span className="text-xs text-slate-500 font-bold">
                            Most Recent
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                      {/* Club with Location and Dates */}
                      <HistoryClubCard
                        clubId={record.clubId}
                        clubName={record.clubName}
                        startDate={record.startDate}
                        endDate={record.endDate}
                        isCurrent={false}
                      />

                      {/* Team */}
                      {record.teamName && (
                        <div className="flex items-start gap-3">
                          <Users
                            size={16}
                            className="text-slate-400 flex-shrink-0 mt-0.5"
                          />
                          <div>
                            <p className="text-xs text-slate-500 font-bold">
                              Team
                            </p>
                            <p className="text-sm text-slate-900 font-black mt-0.5">
                              {record.teamName}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Division */}
                      {record.division && (
                        <div className="flex items-start gap-3">
                          <Trophy
                            size={16}
                            className="text-slate-400 flex-shrink-0 mt-0.5"
                          />
                          <div>
                            <p className="text-xs text-slate-500 font-bold">
                              Division
                            </p>
                            <p className="text-sm text-slate-900 font-black mt-0.5">
                              {record.division}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Timeline Summary */}
      {sortedHistory.length > 0 && (
        <div className="pt-4 border-t-2 border-slate-100">
          <h4 className="text-xs font-black uppercase text-slate-400 mb-3">
            Career Summary
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-blue-50 rounded-xl text-center">
              <p className="text-2xl font-black text-blue-600">
                {sortedHistory.length + 1}
              </p>
              <p className="text-xs text-blue-800 font-bold mt-1">
                Total Seasons
              </p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl text-center">
              <p className="text-2xl font-black text-green-600">
                {new Set(sortedHistory.map((h) => h.clubId)).size}
              </p>
              <p className="text-xs text-green-800 font-bold mt-1">
                Clubs Played For
              </p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl text-center">
              <p className="text-2xl font-black text-purple-600">
                {sortedHistory.filter((h) => h.teamName).length}
              </p>
              <p className="text-xs text-purple-800 font-bold mt-1">Teams</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-xl text-center">
              <p className="text-2xl font-black text-yellow-600">
                {sortedHistory[0]?.season || currentYear}
              </p>
              <p className="text-xs text-yellow-800 font-bold mt-1">
                First Season
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Read-Only Notice */}
      <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl">
        <p className="text-xs text-slate-600 font-bold flex items-center gap-2">
          <History size={14} />
          <span>
            Play history is automatically generated from registration data and
            cannot be manually edited.
          </span>
        </p>
      </div>
    </div>
  );
}
