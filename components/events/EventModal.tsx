"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Edit,
  Trash2,
  Share2,
  CheckCircle,
  Users,
} from "lucide-react";
import Image from "next/image";
import { Event } from "@/types/event";

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (event: Event) => void;
  onDelete?: (event: Event) => void;
}

export default function EventModal({
  event,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: EventModalProps) {
  if (!event) return null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.name,
        text: event.shortDescription,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const isRegistrationOpen = () => {
    if (!event.requiresRegistration || !event.registrationConfig) return false;
    const now = new Date();
    const deadline = event.registrationConfig.deadline
      ? new Date(event.registrationConfig.deadline)
      : null;
    return !deadline || deadline > now;
  };

  const spotsRemaining = () => {
    if (!event.registrationConfig) return null;
    const { maxParticipants, currentParticipants } = event.registrationConfig;
    if (!maxParticipants) return null;
    return maxParticipants - (currentParticipants || 0);
  };

  const registrationStatus = () => {
    if (!event.requiresRegistration) return null;
    const remaining = spotsRemaining();
    if (remaining === null) return "open";
    if (remaining <= 0) return "full";
    if (remaining <= 5) return "limited";
    return "open";
  };

  const startDate = new Date(event.startDate);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            style={{ zIndex: 999998 }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div
            className="fixed inset-0 overflow-y-auto pointer-events-none"
            style={{ zIndex: 999999 }}
          >
            <div className="min-h-screen px-4 py-8 flex items-start justify-center pointer-events-none">
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden pointer-events-auto"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header with ALL buttons */}
                <div className="flex items-center justify-between p-6 border-b-2 border-slate-200 bg-gradient-to-r from-blue-600 to-purple-600">
                  <h2 className="text-2xl font-black text-white">
                    Event Details
                  </h2>

                  <div className="flex gap-2">
                    {/* DELETE BUTTON */}
                    {onDelete && (
                      <button
                        onClick={() => {
                          if (confirm(`Delete "${event.name}"?`)) {
                            onDelete(event);
                            onClose();
                          }
                        }}
                        className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-all shadow-lg"
                        title="Delete Event"
                      >
                        <Trash2 size={20} />
                      </button>
                    )}

                    {/* EDIT BUTTON */}
                    {onEdit && (
                      <button
                        onClick={() => {
                          onEdit(event);
                          onClose();
                        }}
                        className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg"
                        title="Edit Event"
                      >
                        <Edit size={20} />
                      </button>
                    )}

                    {/* SHARE BUTTON */}
                    <button
                      onClick={handleShare}
                      className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all"
                      title="Share"
                    >
                      <Share2 size={20} />
                    </button>

                    {/* CLOSE BUTTON */}
                    <button
                      onClick={onClose}
                      className="p-3 bg-white/20 hover:bg-white/30 text-white rounded-xl transition-all"
                      title="Close"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="p-8">
                  {/* Event Title */}
                  <h1 className="text-4xl font-black text-slate-900 mb-4">
                    {event.name}
                  </h1>

                  {/* Badges */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-bold uppercase">
                      {event.category}
                    </span>
                    <span className="px-4 py-2 bg-purple-100 text-purple-800 rounded-full text-sm font-bold uppercase">
                      {event.scope}
                    </span>
                    <span className="px-4 py-2 bg-slate-100 text-slate-800 rounded-full text-sm font-bold">
                      {event.organization.name}
                    </span>

                    {/* Registration Status Badge */}
                    {event.requiresRegistration && (
                      <span
                        className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${
                          registrationStatus() === "full"
                            ? "bg-red-100 text-red-800"
                            : registrationStatus() === "limited"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-green-100 text-green-800"
                        }`}
                      >
                        {registrationStatus() === "full"
                          ? "SOLD OUT"
                          : registrationStatus() === "limited"
                            ? `${spotsRemaining()} SPOTS LEFT`
                            : "REGISTRATION OPEN"}
                      </span>
                    )}
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-6 bg-slate-50 rounded-xl">
                    <div className="flex items-start gap-3">
                      <Calendar className="text-blue-600 mt-1" size={20} />
                      <div>
                        <div className="font-bold text-sm text-slate-700">
                          Date
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatDate(startDate)}
                        </div>
                      </div>
                    </div>

                    {event.startTime && (
                      <div className="flex items-start gap-3">
                        <Clock className="text-green-600 mt-1" size={20} />
                        <div>
                          <div className="font-bold text-sm text-slate-700">
                            Time
                          </div>
                          <div className="text-sm text-slate-600">
                            {event.startTime}
                          </div>
                        </div>
                      </div>
                    )}

                    {event.location && (
                      <div className="flex items-start gap-3">
                        <MapPin className="text-red-600 mt-1" size={20} />
                        <div>
                          <div className="font-bold text-sm text-slate-700">
                            Location
                          </div>
                          <div className="text-sm text-slate-600">
                            {event.location}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Show participant count if registration enabled */}
                    {event.requiresRegistration && event.registrationConfig && (
                      <div className="flex items-start gap-3">
                        <Users className="text-purple-600 mt-1" size={20} />
                        <div>
                          <div className="font-bold text-sm text-slate-700">
                            Participants
                          </div>
                          <div className="text-sm text-slate-600">
                            {event.registrationConfig.currentParticipants || 0}
                            {event.registrationConfig.maxParticipants &&
                              ` / ${event.registrationConfig.maxParticipants}`}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  <div className="prose prose-slate max-w-none mb-6">
                    {event.fullDescription ? (
                      <div
                        dangerouslySetInnerHTML={{
                          __html: event.fullDescription,
                        }}
                      />
                    ) : (
                      <p className="text-slate-600 text-lg">
                        {event.shortDescription}
                      </p>
                    )}
                  </div>

                  {/* Registration Button */}
                  {event.requiresRegistration &&
                    isRegistrationOpen() &&
                    registrationStatus() !== "full" && (
                      <div className="p-6 bg-green-50 border-2 border-green-200 rounded-2xl mb-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-lg font-black text-green-900 mb-1">
                              Registration Required
                            </h3>
                            <p className="text-sm text-green-700">
                              {spotsRemaining() !== null &&
                                spotsRemaining()! > 0 && (
                                  <span className="font-bold">
                                    {spotsRemaining()} spots remaining
                                  </span>
                                )}
                              {event.registrationConfig?.deadline && (
                                <span className="block text-xs mt-1">
                                  Deadline:{" "}
                                  {new Date(
                                    event.registrationConfig.deadline,
                                  ).toLocaleDateString("en-AU")}
                                </span>
                              )}
                            </p>
                          </div>
                          <a
                            href={event.registrationConfig?.url || "#"}
                            className="px-8 py-4 bg-green-600 text-white rounded-xl font-black text-lg hover:bg-green-700 transition-all shadow-lg flex items-center gap-3"
                          >
                            <CheckCircle size={24} />
                            REGISTER NOW
                          </a>
                        </div>
                      </div>
                    )}

                  {/* Sold Out Message */}
                  {event.requiresRegistration &&
                    registrationStatus() === "full" && (
                      <div className="p-6 bg-red-50 border-2 border-red-200 rounded-2xl mb-6 text-center">
                        <h3 className="text-2xl font-black text-red-900 mb-2">
                          SOLD OUT
                        </h3>
                        <p className="text-red-700">
                          This event has reached maximum capacity
                        </p>
                        {event.registrationConfig?.waitlistEnabled && (
                          <button className="mt-4 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-all">
                            Join Waitlist
                          </button>
                        )}
                      </div>
                    )}

                  {/* Cost Display */}
                  {event.cost && !event.cost.isFree && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-bold text-blue-900">
                            Cost
                          </div>
                          <div className="text-2xl font-black text-blue-700">
                            ${event.cost.amount} {event.cost.currency}
                          </div>
                          {event.cost.description && (
                            <div className="text-xs text-blue-600 mt-1">
                              {event.cost.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
