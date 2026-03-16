// app/admin/teams/components/modals/AddPlayerModal.tsx
// Uses PLAYERS table with smart defaults from selection history

"use client";

import { useState, useEffect } from "react";
import type { TeamRoster } from "@/types/admin/teams.types";

interface Player {
  id: string;
  playerId: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  dateOfBirth: string;
  memberNumber: string;
  primaryPosition?: string;
  secondaryPosition?: string;
  lastSelection?: {
    number: string;
    position: string;
    teamName: string;
    selectedDate: string;
  } | null;
}

interface AddPlayerModalProps {
  roster: TeamRoster;
  teamIndex: number;
  onClose: () => void;
  onSubmit: (
    playerId: string,
    details?: { number: string; position: string },
  ) => void;
}

const POSITIONS = [
  "Goalkeeper",
  "Defender",
  "Midfielder",
  "Forward",
  "Striker",
  "Winger",
  "Utility",
];

export default function AddPlayerModal({
  roster,
  teamIndex,
  onClose,
  onSubmit,
}: AddPlayerModalProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const [playerNumber, setPlayerNumber] = useState("");
  const [playerPosition, setPlayerPosition] = useState("");

  useEffect(() => {
    fetchEligiblePlayers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = players.filter(
        (p) =>
          `${p.firstName} ${p.lastName}`
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          p.memberNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (p.preferredName &&
            p.preferredName.toLowerCase().includes(searchTerm.toLowerCase())),
      );
      setFilteredPlayers(filtered);
    } else {
      setFilteredPlayers(players);
    }
  }, [searchTerm, players]);

  // When player is selected, apply smart defaults
  useEffect(() => {
    if (selectedPlayerId) {
      const player = players.find((p) => p.id === selectedPlayerId);
      if (player) {
        // Smart defaults from last selection or primary position
        if (player.lastSelection) {
          setPlayerNumber(player.lastSelection.number || "");
          setPlayerPosition(
            player.lastSelection.position || player.primaryPosition || "",
          );
        } else {
          setPlayerNumber("");
          setPlayerPosition(player.primaryPosition || "");
        }
      }
    } else {
      setPlayerNumber("");
      setPlayerPosition("");
    }
  }, [selectedPlayerId, players]);

  const fetchEligiblePlayers = async () => {
    setLoading(true);
    try {
      const url =
        `/api/admin/teams/players/eligible?` +
        new URLSearchParams({
          clubId: roster.clubId,
          division: roster.division,
          category: roster.category,
          gender: roster.gender,
          season: roster.season || "2026",
        });

      const response = await fetch(url);
      const data = await response.json();

      // Filter out players already in this roster
      const allPlayersInRoster = new Set([
        ...roster.teams.flatMap((t) => t.players.map((p) => p.id)),
        ...roster.shadowPlayers.map((p) => p.id),
        ...roster.withdrawn.map((p) => p.id),
      ]);

      const eligible = (data.players || []).filter(
        (p: Player) => !allPlayersInRoster.has(p.id),
      );

      setPlayers(eligible);
      setFilteredPlayers(eligible);
    } catch (error) {
      console.error("Error fetching eligible players:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedPlayerId) {
      onSubmit(selectedPlayerId, {
        number: playerNumber,
        position: playerPosition,
      });
    }
  };

  const selectedPlayer = players.find((p) => p.id === selectedPlayerId);

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9998]"
        onClick={onClose}
      ></div>

      <div className="fixed inset-0 flex items-center justify-center p-4 z-[9999]">
        <div
          className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <form onSubmit={handleSubmit} className="flex flex-col h-full">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-8 py-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-black uppercase text-[#06054e]">
                    Add Player to Team
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {roster.clubName} · {roster.division} {roster.category}{" "}
                    {roster.gender}
                  </p>
                  <p className="text-sm font-bold text-blue-600 mt-1">
                    Team: {roster.teams[teamIndex]?.name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div>
                <input
                  type="text"
                  placeholder="Search by name or member number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none"
                />
              </div>
            </div>

            {/* Player List + Details */}
            <div className="flex-1 overflow-hidden flex">
              {/* Player List (Left) */}
              <div className="flex-1 overflow-y-auto px-8 py-6 border-r border-slate-200">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading players...</p>
                  </div>
                ) : filteredPlayers.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-400 font-bold">
                      {searchTerm
                        ? "No players match your search"
                        : "No eligible players available"}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredPlayers.map((player) => (
                      <button
                        key={player.id}
                        type="button"
                        onClick={() => setSelectedPlayerId(player.id)}
                        className={`w-full p-4 rounded-xl border-2 transition-all text-left ${
                          selectedPlayerId === player.id
                            ? "bg-blue-50 border-blue-500"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="font-black text-lg">
                              {player.firstName} {player.lastName}
                              {player.preferredName && (
                                <span className="text-slate-500 font-normal ml-2">
                                  "{player.preferredName}"
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-600 mt-1 flex items-center gap-3">
                              <span>#{player.memberNumber}</span>
                              {player.primaryPosition && (
                                <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold">
                                  {player.primaryPosition}
                                </span>
                              )}
                              {player.lastSelection && (
                                <span className="text-green-600 text-xs flex items-center gap-1">
                                  <svg
                                    className="w-3 h-3"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                  >
                                    <path
                                      fillRule="evenodd"
                                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                      clipRule="evenodd"
                                    />
                                  </svg>
                                  Last: #{player.lastSelection.number}{" "}
                                  {player.lastSelection.position}
                                </span>
                              )}
                            </div>
                          </div>

                          {selectedPlayerId === player.id && (
                            <svg
                              className="w-6 h-6 text-blue-600 flex-shrink-0 ml-4"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Player Details (Right) */}
              <div className="w-96 bg-slate-50 p-8">
                {selectedPlayer ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-xl font-black text-slate-800 mb-1">
                        {selectedPlayer.firstName} {selectedPlayer.lastName}
                      </h3>
                      <p className="text-sm text-slate-600">
                        Member #{selectedPlayer.memberNumber}
                      </p>
                      {selectedPlayer.primaryPosition && (
                        <p className="text-sm text-slate-600 mt-1">
                          Primary: {selectedPlayer.primaryPosition}
                        </p>
                      )}
                    </div>

                    {selectedPlayer.lastSelection && (
                      <div className="p-3 bg-green-50 border-2 border-green-200 rounded-xl">
                        <div className="text-xs font-black uppercase text-green-600 mb-1">
                          Last Selection
                        </div>
                        <div className="text-sm text-green-800">
                          <div className="font-bold">
                            #{selectedPlayer.lastSelection.number} ·{" "}
                            {selectedPlayer.lastSelection.position}
                          </div>
                          <div className="text-xs text-green-600 mt-1">
                            {selectedPlayer.lastSelection.teamName} ·{" "}
                            {new Date(
                              selectedPlayer.lastSelection.selectedDate,
                            ).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="h-px bg-slate-300"></div>

                    {/* Player Number */}
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                        Jersey Number{" "}
                        {selectedPlayer.lastSelection && (
                          <span className="text-green-600">(auto-filled)</span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={playerNumber}
                        onChange={(e) => setPlayerNumber(e.target.value)}
                        placeholder="e.g., 7"
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none"
                      />
                    </div>

                    {/* Player Position */}
                    <div>
                      <label className="block text-xs font-black uppercase text-slate-400 tracking-wider mb-2">
                        Position{" "}
                        {selectedPlayer.lastSelection && (
                          <span className="text-green-600">(auto-filled)</span>
                        )}
                      </label>
                      <select
                        value={playerPosition}
                        onChange={(e) => setPlayerPosition(e.target.value)}
                        className="w-full px-4 py-3 bg-white border-2 border-slate-200 rounded-xl font-bold focus:border-[#06054e] outline-none"
                      >
                        <option value="">Select Position...</option>
                        {POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400">
                    <svg
                      className="w-16 h-16 mx-auto mb-4 opacity-50"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                      />
                    </svg>
                    <p className="font-bold">Select a player</p>
                    <p className="text-sm mt-2">
                      Choose from the list to add details
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-8 py-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-white border-2 border-slate-200 rounded-xl font-black uppercase text-sm text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedPlayerId}
                className="flex-1 px-6 py-3 bg-[#06054e] text-white rounded-xl font-black uppercase text-sm hover:bg-blue-900 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {selectedPlayer
                  ? `Add ${selectedPlayer.firstName} ${selectedPlayer.lastName}`
                  : "Select a Player"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
