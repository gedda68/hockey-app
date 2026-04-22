// sections/PlayerStatusSection.tsx
// Player status, season registration, and administrative tracking
// WITH AUTO-CALCULATED DATES

"use client";

import { useEffect } from "react";
import { BaseSectionProps } from "@/types/player.types";
import {
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Archive,
  Calendar,
  TrendingUp,
  Bell,
} from "lucide-react";

export default function PlayerStatusSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const statusDefaults = {
    current: "pending" as const,
    registrationDate: "",
    expiryDate: "",
    renewalReminderDate: "",
    seasons: [] as Array<Record<string, unknown>>,
  };
  const status = {
    ...statusDefaults,
    ...formData.status,
    seasons: formData.status?.seasons ?? statusDefaults.seasons,
  };

  // ✨ AUTO-CALCULATE DATES ON MOUNT.
  // ✨ AUTO-CALCULATE DATES ON MOUNT.
  useEffect(() => {
    const needsInitialization =
      !status.registrationDate ||
      !status.expiryDate ||
      !status.renewalReminderDate;

    if (needsInitialization) {
      const today = new Date();
      const currentYear = today.getFullYear();

      // Current Season Start Date = Today
      const registrationDate = today.toISOString().split("T")[0];

      // Registration Expiry = End of current year (Dec 31)
      const expiryDate = new Date(currentYear, 11, 31)
        .toISOString()
        .split("T")[0];

      // Renewal Reminder = 2 weeks before expiry
      const expiryDateObj = new Date(currentYear, 11, 31);
      const reminderDate = new Date(expiryDateObj);
      reminderDate.setDate(reminderDate.getDate() - 14); // 2 weeks before
      const renewalReminderDate = reminderDate.toISOString().split("T")[0];

      console.log("📅 Auto-setting dates:", {
        registrationDate,
        expiryDate,
        renewalReminderDate,
      });

      // Update all dates at once
      onChange("status", {
        ...status,
        registrationDate,
        expiryDate,
        renewalReminderDate,
      });
    }
  // `status` and `onChange` are intentionally omitted: one-time mount initializer
  // guarded by needsInitialization; adding them causes a loop via formData.status.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ✨ AUTO-UPDATE RENEWAL REMINDER when expiry date changes
  const handleExpiryDateChange = (newExpiryDate: string) => {
    // Calculate renewal reminder (2 weeks before expiry)
    const expiryDateObj = new Date(newExpiryDate);
    const reminderDate = new Date(expiryDateObj);
    reminderDate.setDate(reminderDate.getDate() - 14);
    const renewalReminderDate = reminderDate.toISOString().split("T")[0];

    console.log("📅 Updating expiry and reminder:", {
      expiryDate: newExpiryDate,
      renewalReminderDate,
    });

    onChange("status", {
      ...status,
      expiryDate: newExpiryDate,
      renewalReminderDate,
    });
  };

  const updateStatus = (field: string, value: any) => {
    onChange("status", {
      ...status,
      [field]: value,
    });
  };

  const statusOptions = [
    {
      value: "active",
      label: "Active",
      description: "Currently playing this season",
      icon: Activity,
      color: "green",
    },
    {
      value: "inactive",
      label: "Inactive",
      description: "Not playing this season",
      icon: Clock,
      color: "slate",
    },
    {
      value: "pending",
      label: "Pending",
      description: "Registration in progress",
      icon: AlertCircle,
      color: "amber",
    },
    {
      value: "suspended",
      label: "Suspended",
      description: "Disciplinary suspension",
      icon: XCircle,
      color: "red",
    },
    {
      value: "archived",
      label: "Archived",
      description: "Left the club",
      icon: Archive,
      color: "slate",
    },
  ];

  const currentStatusInfo = statusOptions.find(
    (s) => s.value === status.current,
  );
  const Icon = currentStatusInfo?.icon || Activity;

  const colorClasses = {
    green: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-700",
      badge: "bg-green-500",
      button: "bg-green-600 hover:bg-green-700",
    },
    slate: {
      bg: "bg-slate-50",
      border: "border-slate-200",
      text: "text-slate-700",
      badge: "bg-slate-500",
      button: "bg-slate-600 hover:bg-slate-700",
    },
    amber: {
      bg: "bg-amber-50",
      border: "border-amber-200",
      text: "text-amber-700",
      badge: "bg-amber-500",
      button: "bg-amber-600 hover:bg-amber-700",
    },
    red: {
      bg: "bg-red-50",
      border: "border-red-200",
      text: "text-red-700",
      badge: "bg-red-500",
      button: "bg-red-600 hover:bg-red-700",
    },
  };

  const colors =
    colorClasses[currentStatusInfo?.color as keyof typeof colorClasses] ||
    colorClasses.amber;

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("en-AU", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Invalid date";
    }
  };

  // Calculate days until expiry
  const getDaysUntilExpiry = () => {
    if (!status.expiryDate) return null;
    const expiry = new Date(status.expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysUntilExpiry = getDaysUntilExpiry();

  return (
    <div className="space-y-6">
      {/* Current Status Display */}
      <div className={`p-6 ${colors.bg} border-2 ${colors.border} rounded-2xl`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 ${colors.badge} rounded-xl flex items-center justify-center`}
            >
              <Icon className="text-white" size={24} />
            </div>
            <div>
              <p className="text-xs font-black uppercase text-slate-400">
                Current Status
              </p>
              <h3 className={`text-2xl font-black ${colors.text}`}>
                {currentStatusInfo?.label}
              </h3>
            </div>
          </div>
          {daysUntilExpiry !== null && daysUntilExpiry >= 0 && (
            <div className="text-right">
              <p className="text-xs font-black uppercase text-slate-400">
                Days Until Expiry
              </p>
              <p
                className={`text-2xl font-black ${
                  daysUntilExpiry <= 14
                    ? "text-red-600"
                    : daysUntilExpiry <= 30
                      ? "text-amber-600"
                      : "text-green-600"
                }`}
              >
                {daysUntilExpiry}
              </p>
            </div>
          )}
        </div>
        <p className={`text-sm ${colors.text}`}>
          {currentStatusInfo?.description}
        </p>
      </div>

      {/* Status Selection */}
      <div>
        <label className="block text-xs font-black uppercase text-slate-400 mb-3 ml-1">
          Change Status
        </label>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {statusOptions.map((option) => {
            const OptionIcon = option.icon;
            const isSelected = status.current === option.value;
            const optionColors =
              colorClasses[option.color as keyof typeof colorClasses];

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => updateStatus("current", option.value)}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? `${optionColors.bg} ${optionColors.border} shadow-md`
                    : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isSelected ? optionColors.badge : "bg-slate-100"
                    }`}
                  >
                    <OptionIcon
                      className={isSelected ? "text-white" : "text-slate-400"}
                      size={20}
                    />
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-black text-sm ${isSelected ? optionColors.text : "text-slate-900"}`}
                    >
                      {option.label}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {option.description}
                    </p>
                  </div>
                  {isSelected && (
                    <CheckCircle className={optionColors.text} size={20} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Registration Dates */}
      <div className="pt-4 border-t-2 border-slate-100">
        <h3 className="text-xs font-black uppercase text-slate-400 mb-4 flex items-center gap-2">
          <Calendar size={16} />
          Registration Dates
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Current Season Start Date */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Current Season Start Date
            </label>
            <input
              type="date"
              value={status.registrationDate || ""}
              onChange={(e) => updateStatus("registrationDate", e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-yellow-400 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Defaults to today's date
            </p>
            {status.registrationDate && (
              <p className="text-xs text-green-700 font-bold mt-1 ml-1">
                ✓ Set to: {formatDate(status.registrationDate)}
              </p>
            )}
          </div>

          {/* Registration Expiry Date */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1">
              Registration Expiry Date
            </label>
            <input
              type="date"
              value={status.expiryDate || ""}
              onChange={(e) => handleExpiryDateChange(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-100 rounded-xl font-bold focus:border-yellow-400 outline-none"
            />
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Defaults to end of current year
            </p>
            {status.expiryDate && (
              <p className="text-xs text-green-700 font-bold mt-1 ml-1">
                ✓ Expires: {formatDate(status.expiryDate)}
              </p>
            )}
          </div>

          {/* Renewal Reminder Date */}
          <div>
            <label className="block text-xs font-black uppercase text-slate-400 mb-2 ml-1 flex items-center gap-1">
              <Bell size={14} />
              Renewal Reminder Date
            </label>
            <input
              type="date"
              value={status.renewalReminderDate || ""}
              readOnly
              disabled
              className="w-full px-4 py-3 bg-slate-100 border-2 border-slate-200 rounded-xl font-bold text-slate-600 cursor-not-allowed"
            />
            <p className="text-xs text-slate-400 mt-1 ml-1">
              Auto-set to 2 weeks before expiry
            </p>
            {status.renewalReminderDate && (
              <p className="text-xs text-blue-700 font-bold mt-1 ml-1">
                🔔 Reminder: {formatDate(status.renewalReminderDate)}
              </p>
            )}
          </div>
        </div>

        {/* Notification Info */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-start gap-3">
            <Bell size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs font-black text-blue-900">
                Renewal Notifications
              </p>
              <p className="text-xs text-blue-700 mt-1">
                On the renewal reminder date (
                {status.renewalReminderDate
                  ? formatDate(status.renewalReminderDate)
                  : "not set"}
                ), the player will receive notifications via:
              </p>
              <ul className="text-xs text-blue-600 mt-2 ml-4 space-y-1">
                <li>• 📧 Email notification</li>
                <li>• 📱 SMS/Phone notification</li>
                <li>• 🌐 In-app notification</li>
              </ul>
              <p className="text-xs text-blue-500 mt-2 italic">
                (To be implemented in future update)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Season History */}
      <div className="pt-4 border-t-2 border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-black uppercase text-slate-400 flex items-center gap-2">
            <TrendingUp size={16} />
            Season History
          </h3>
          <button
            type="button"
            onClick={() => {
              const newSeason = {
                id: `season-${Date.now()}`,
                year: new Date().getFullYear(),
                status: status.current,
                startDate: status.registrationDate,
                endDate: status.expiryDate,
              };
              updateStatus("seasons", [...(status.seasons ?? []), newSeason]);
            }}
            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
          >
            Add Season
          </button>
        </div>

        {status.seasons.length === 0 ? (
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-center">
            <TrendingUp size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-sm text-slate-600 font-bold">
              No season history yet
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Season records will appear here as the player progresses through
              different seasons
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {status.seasons.map((season: any) => (
              <div
                key={season.id}
                className="p-4 bg-white border-2 border-slate-100 rounded-xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-black text-slate-900">
                      Season {season.year}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Status: <span className="font-bold">{season.status}</span>
                    </p>
                    {season.startDate && season.endDate && (
                      <p className="text-xs text-slate-500 mt-1">
                        {formatDate(season.startDate)} →{" "}
                        {formatDate(season.endDate)}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      updateStatus(
                        "seasons",
                        status.seasons.filter((s: any) => s.id !== season.id),
                      );
                    }}
                    className="text-red-600 hover:text-red-700 text-xs font-bold"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Status Summary */}
      <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <h4 className="text-xs font-black text-slate-700 mb-3">
          Status Summary:
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <p className="text-slate-500">Current Status</p>
            <p className={`font-black ${colors.text}`}>
              {currentStatusInfo?.label}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Season Started</p>
            <p className="font-black text-slate-900">
              {status.registrationDate
                ? formatDate(status.registrationDate)
                : "Not set"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Expires</p>
            <p className="font-black text-slate-900">
              {status.expiryDate ? formatDate(status.expiryDate) : "Not set"}
            </p>
          </div>
          <div>
            <p className="text-slate-500">Reminder</p>
            <p className="font-black text-blue-700">
              {status.renewalReminderDate
                ? formatDate(status.renewalReminderDate)
                : "Not set"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
