// app/admin/teams/components/PlayerMenuDropdown.tsx
// FIXED: Optimistic UI updates - checkboxes toggle immediately

"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  number: string;
  position: string;
  leadership?: {
    captain: boolean;
    viceCaptain: boolean;
    leadershipGroup: boolean;
  };
}

interface PlayerMenuDropdownProps {
  player: Player;
  onEdit: () => void;
  onUpdateLeadership: (leadership: any) => void;
  onViewHistory: () => void;
  onRemove: () => void;
}

export default function PlayerMenuDropdown({
  player,
  onEdit,
  onUpdateLeadership,
  onViewHistory,
  onRemove,
}: PlayerMenuDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Local state for optimistic updates
  const [localLeadership, setLocalLeadership] = useState(
    player.leadership || {
      captain: false,
      viceCaptain: false,
      leadershipGroup: false,
    },
  );

  // Update local state when player prop changes
  useEffect(() => {
    setLocalLeadership(
      player.leadership || {
        captain: false,
        viceCaptain: false,
        leadershipGroup: false,
      },
    );
  }, [player.leadership]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const toggleLeadership = (
    role: "captain" | "viceCaptain" | "leadershipGroup",
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();

    // Optimistic update - update UI immediately
    const newLeadership = {
      ...localLeadership,
      [role]: !localLeadership[role],
    };

    setLocalLeadership(newLeadership);
    console.log("Toggling leadership:", role, "to", !localLeadership[role]);

    // Then call parent handler which will make API call
    onUpdateLeadership(newLeadership);
  };

  const handleEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Edit clicked for:", player.firstName, player.lastName);
    setIsOpen(false);
    onEdit();
  };

  const handleViewHistory = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("View history clicked for:", player.firstName, player.lastName);
    setIsOpen(false);
    onViewHistory();
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    console.log("Remove clicked for:", player.firstName, player.lastName);
    setIsOpen(false);
    onRemove();
  };

  const getMenuPosition = () => {
    if (!buttonRef.current) return { top: 0, left: 0 };

    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 256;
    const menuHeight = 400;

    let left = rect.left - menuWidth - 8;
    let top = rect.top;

    if (left < 8) {
      left = rect.right + 8;
    }

    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }

    if (top + menuHeight > window.innerHeight - 8) {
      top = window.innerHeight - menuHeight - 8;
    }

    if (top < 8) {
      top = 8;
    }

    return { top, left };
  };

  const menuPosition = isOpen ? getMenuPosition() : { top: 0, left: 0 };

  const menuContent =
    isOpen && mounted ? (
      <div
        ref={menuRef}
        className="fixed w-64 bg-white rounded-xl shadow-2xl border-2 border-slate-200 z-[99999] overflow-hidden"
        style={{
          top: `${menuPosition.top}px`,
          left: `${menuPosition.left}px`,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <div className="font-black text-sm text-slate-800 truncate">
            {player.firstName} {player.lastName}
          </div>
          <div className="text-xs text-slate-500">
            #{player.number} · {player.position}
          </div>
        </div>

        {/* Menu Items */}
        <div className="py-2 max-h-96 overflow-y-auto">
          {/* Edit Details */}
          <button
            onClick={handleEdit}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <div>
              <div className="font-bold text-slate-800 text-sm">
                Edit Details
              </div>
              <div className="text-xs text-slate-500">
                Change number, position
              </div>
            </div>
          </button>

          {/* Leadership Section */}
          <div className="px-4 py-2">
            <div className="flex items-center gap-2 mb-2">
              <svg
                className="w-4 h-4 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                />
              </svg>
              <span className="font-bold text-xs text-slate-600 uppercase">
                Leadership
              </span>
            </div>

            {/* Captain - Use localLeadership for immediate updates */}
            <label
              className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 rounded px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={localLeadership.captain}
                onChange={(e) => toggleLeadership("captain", e as any)}
                className="w-4 h-4 text-yellow-600 rounded focus:ring-yellow-500 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="flex items-center gap-2 flex-1">
                <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs font-black">
                  C
                </span>
                <span className="text-sm font-bold text-slate-700">
                  Captain
                </span>
              </span>
            </label>

            {/* Vice Captain */}
            <label
              className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 rounded px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={localLeadership.viceCaptain}
                onChange={(e) => toggleLeadership("viceCaptain", e as any)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="flex items-center gap-2 flex-1">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs font-black">
                  VC
                </span>
                <span className="text-sm font-bold text-slate-700">
                  Vice Captain
                </span>
              </span>
            </label>

            {/* Leadership Group */}
            <label
              className="flex items-center gap-2 py-2 cursor-pointer hover:bg-slate-50 rounded px-2"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={localLeadership.leadershipGroup}
                onChange={(e) => toggleLeadership("leadershipGroup", e as any)}
                className="w-4 h-4 text-green-600 rounded focus:ring-green-500 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
              <span className="flex items-center gap-2 flex-1">
                <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs font-black">
                  L
                </span>
                <span className="text-sm font-bold text-slate-700">
                  Leadership Group
                </span>
              </span>
            </label>
          </div>

          {/* View History */}
          <button
            onClick={handleViewHistory}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
          >
            <svg
              className="w-5 h-5 text-purple-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <div className="font-bold text-slate-800 text-sm">
                View History
              </div>
              <div className="text-xs text-slate-500">Past selections</div>
            </div>
          </button>

          {/* Divider */}
          <div className="h-px bg-slate-200 my-2"></div>

          {/* Remove from Team */}
          <button
            onClick={handleRemove}
            className="w-full px-4 py-3 flex items-center gap-3 hover:bg-red-50 transition-colors text-left group/remove"
          >
            <svg
              className="w-5 h-5 text-red-600 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <div>
              <div className="font-bold text-red-600 text-sm group-hover/remove:text-red-700">
                Remove from Team
              </div>
              <div className="text-xs text-red-500">Delete player</div>
            </div>
          </button>
        </div>
      </div>
    ) : null;

  return (
    <>
      {/* Menu Button */}
      <button
        ref={buttonRef}
        onClick={(e) => {
          e.stopPropagation();
          console.log("Menu button clicked, current state:", isOpen);
          setIsOpen(!isOpen);
        }}
        className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-200 transition-all opacity-0 group-hover:opacity-100"
        title="Player actions"
      >
        <svg
          className="w-5 h-5 text-slate-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {/* Render menu via portal at document root */}
      {mounted && menuContent && createPortal(menuContent, document.body)}
    </>
  );
}
