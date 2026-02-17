// components/events/EventModal.tsx
"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Calendar,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Download,
  ExternalLink,
  Phone,
  Mail,
  AlertCircle,
  CheckCircle,
  FileText,
  Image as ImageIcon,
  Share2,
} from "lucide-react";
import Image from "next/image";
import { Event } from "@/types/event";

interface EventModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function EventModal({
  event,
  isOpen,
  onClose,
}: EventModalProps) {
  const [activeTab, setActiveTab] = useState<
    "details" | "documents" | "location"
  >("details");

  if (!event) return null;

  const startDate = new Date(event.startDate);
  const endDate = event.endDate ? new Date(event.endDate) : null;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (time?: string) => {
    if (!time) return "";
    return new Date(`2000-01-01T${time}`).toLocaleTimeString("en-AU", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
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

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: event.name,
        text: event.shortDescription,
        url: window.location.href,
      });
    } else {
      navigator.clipboard.writeText(window.location.href);
      // Toast notification would go here
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999998]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <div className="fixed inset-0 overflow-y-auto z-[999999]">
            <div className="min-h-screen px-4 py-8 flex items-start justify-center">
              <motion.div
                className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8 overflow-hidden"
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
              >
                {/* Featured Image Header */}
                {event.images?.featured && (
                  <div className="relative h-64 bg-slate-200">
                    <Image
                      src={event.images.featured}
                      alt={event.name}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Close button */}
                    <button
                      onClick={onClose}
                      className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
                    >
                      <X size={20} className="text-slate-900" />
                    </button>

                    {/* Share button */}
                    <button
                      onClick={handleShare}
                      className="absolute top-4 right-16 p-2 bg-white/90 hover:bg-white rounded-full transition-colors"
                    >
                      <Share2 size={20} className="text-slate-900" />
                    </button>
                  </div>
                )}

                {/* No image - header bar */}
                {!event.images?.featured && (
                  <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-[#06054e]">
                    <div className="flex-1" />
                    <div className="flex gap-2">
                      <button
                        onClick={handleShare}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <Share2 size={20} className="text-white" />
                      </button>
                      <button
                        onClick={onClose}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                      >
                        <X size={20} className="text-white" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Content */}
                <div className="p-8">
                  {/* Event Title & Meta */}
                  <div className="mb-6">
                    <h1 className="text-3xl font-black text-slate-900 mb-3">
                      {event.name}
                    </h1>

                    {/* Status Badges */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <span className="px-3 py-1 bg-blue-500/10 text-blue-700 rounded-full text-xs font-bold uppercase">
                        {event.category}
                      </span>
                      <span className="px-3 py-1 bg-purple-500/10 text-purple-700 rounded-full text-xs font-bold uppercase">
                        {event.scope}
                      </span>
                      {event.requiresRegistration && (
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                            registrationStatus() === "full"
                              ? "bg-red-500/10 text-red-700"
                              : registrationStatus() === "limited"
                                ? "bg-orange-500/10 text-orange-700"
                                : "bg-green-500/10 text-green-700"
                          }`}
                        >
                          {registrationStatus() === "full"
                            ? "SOLD OUT"
                            : registrationStatus() === "limited"
                              ? `${spotsRemaining()} spots left`
                              : "Registration Open"}
                        </span>
                      )}
                    </div>

                    {/* Organization */}
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="font-semibold">
                        {event.organization.name}
                      </span>
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-xs font-bold uppercase">
                        {event.organization.type}
                      </span>
                    </div>
                  </div>

                  {/* Key Info Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-slate-50 rounded-xl">
                    {/* Date */}
                    <div className="flex items-start gap-3">
                      <Calendar
                        className="text-blue-600 mt-1 flex-shrink-0"
                        size={20}
                      />
                      <div>
                        <div className="font-bold text-sm text-slate-700">
                          Date
                        </div>
                        <div className="text-sm text-slate-600">
                          {formatDate(startDate)}
                          {endDate &&
                            endDate.getTime() !== startDate.getTime() && (
                              <> – {formatDate(endDate)}</>
                            )}
                        </div>
                      </div>
                    </div>

                    {/* Time */}
                    {event.startTime && (
                      <div className="flex items-start gap-3">
                        <Clock
                          className="text-green-600 mt-1 flex-shrink-0"
                          size={20}
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-700">
                            Time
                          </div>
                          <div className="text-sm text-slate-600">
                            {formatTime(event.startTime)}
                            {event.endTime && ` – ${formatTime(event.endTime)}`}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Location */}
                    {event.location && (
                      <div className="flex items-start gap-3">
                        <MapPin
                          className="text-red-600 mt-1 flex-shrink-0"
                          size={20}
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-700">
                            Location
                          </div>
                          <div className="text-sm text-slate-600">
                            {event.location}
                          </div>
                          {event.venue?.fieldNumber && (
                            <div className="text-xs text-slate-500">
                              {event.venue.fieldNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Cost */}
                    {event.cost && (
                      <div className="flex items-start gap-3">
                        <DollarSign
                          className="text-yellow-600 mt-1 flex-shrink-0"
                          size={20}
                        />
                        <div>
                          <div className="font-bold text-sm text-slate-700">
                            Cost
                          </div>
                          <div className="text-sm text-slate-600">
                            {event.cost.isFree ? (
                              <span className="text-green-600 font-bold">
                                FREE
                              </span>
                            ) : (
                              `${event.cost.currency} $${event.cost.amount}`
                            )}
                          </div>
                          {event.cost.description && (
                            <div className="text-xs text-slate-500">
                              {event.cost.description}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Tabs */}
                  <div className="border-b border-slate-200 mb-6">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setActiveTab("details")}
                        className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${
                          activeTab === "details"
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-slate-500 hover:text-slate-700"
                        }`}
                      >
                        Details
                      </button>
                      {event.documents && event.documents.length > 0 && (
                        <button
                          onClick={() => setActiveTab("documents")}
                          className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${
                            activeTab === "documents"
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Documents ({event.documents.length})
                        </button>
                      )}
                      {event.venue?.coordinates && (
                        <button
                          onClick={() => setActiveTab("location")}
                          className={`pb-3 px-1 border-b-2 font-bold text-sm transition-colors ${
                            activeTab === "location"
                              ? "border-blue-600 text-blue-600"
                              : "border-transparent text-slate-500 hover:text-slate-700"
                          }`}
                        >
                          Map
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="min-h-[200px]">
                    {/* Details Tab */}
                    {activeTab === "details" && (
                      <div className="space-y-6">
                        {/* Description */}
                        {event.fullDescription ? (
                          <div
                            className="prose prose-slate max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: event.fullDescription,
                            }}
                          />
                        ) : (
                          <p className="text-slate-600">
                            {event.shortDescription}
                          </p>
                        )}

                        {/* Flyer Download */}
                        {event.flyer && (
                          <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <FileText className="text-blue-600" size={24} />
                                <div>
                                  <div className="font-bold text-sm text-blue-900">
                                    Event Flyer
                                  </div>
                                  <div className="text-xs text-blue-700">
                                    PDF Document
                                  </div>
                                </div>
                              </div>
                              <a
                                href={event.flyer}
                                download
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 transition-colors flex items-center gap-2"
                              >
                                <Download size={16} />
                                Download
                              </a>
                            </div>
                          </div>
                        )}

                        {/* Contact Person */}
                        {event.contactPerson && (
                          <div className="p-4 bg-slate-50 rounded-xl">
                            <div className="font-bold text-sm text-slate-900 mb-2">
                              Contact
                            </div>
                            <div className="space-y-1">
                              <div className="text-sm text-slate-700">
                                {event.contactPerson.name}
                              </div>
                              {event.contactPerson.email && (
                                <a
                                  href={`mailto:${event.contactPerson.email}`}
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  <Mail size={14} />
                                  {event.contactPerson.email}
                                </a>
                              )}
                              {event.contactPerson.phone && (
                                <a
                                  href={`tel:${event.contactPerson.phone}`}
                                  className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-700"
                                >
                                  <Phone size={14} />
                                  {event.contactPerson.phone}
                                </a>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Documents Tab */}
                    {activeTab === "documents" && event.documents && (
                      <div className="space-y-3">
                        {event.documents.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between p-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <FileText className="text-slate-600" size={24} />
                              <div>
                                <div className="font-bold text-sm text-slate-900">
                                  {doc.name}
                                </div>
                                <div className="text-xs text-slate-500 uppercase">
                                  {doc.type}
                                </div>
                              </div>
                            </div>
                            <a
                              href={doc.url}
                              download
                              className="px-4 py-2 bg-slate-600 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-colors flex items-center gap-2"
                            >
                              <Download size={16} />
                              Download
                            </a>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Location/Map Tab */}
                    {activeTab === "location" && event.venue && (
                      <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-xl">
                          <div className="font-bold text-sm text-slate-900 mb-2">
                            Venue Details
                          </div>
                          <div className="space-y-1 text-sm text-slate-600">
                            <div>{event.venue.name}</div>
                            {event.venue.address && (
                              <div>{event.venue.address}</div>
                            )}
                            {event.venue.fieldNumber && (
                              <div className="text-xs text-slate-500">
                                {event.venue.fieldNumber}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Map placeholder - integrate with Google Maps */}
                        {event.venue.coordinates && (
                          <div className="h-64 bg-slate-200 rounded-xl flex items-center justify-center">
                            <div className="text-slate-500 text-sm">
                              Map: {event.venue.coordinates.lat},{" "}
                              {event.venue.coordinates.lng}
                              <br />
                              <span className="text-xs">
                                (Google Maps integration goes here)
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 border-t border-slate-200 bg-slate-50">
                  <div className="flex flex-wrap gap-3">
                    {/* Registration Button */}
                    {event.requiresRegistration && isRegistrationOpen() && (
                      <a
                        href={event.registrationConfig?.url || "#"}
                        className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-center hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                      >
                        <CheckCircle size={20} />
                        Register Now
                        {spotsRemaining() !== null && spotsRemaining()! > 0 && (
                          <span className="text-xs opacity-90">
                            ({spotsRemaining()} spots left)
                          </span>
                        )}
                      </a>
                    )}

                    {/* External Link */}
                    {event.externalLink && (
                      <a
                        href={event.externalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-6 py-3 bg-slate-600 text-white rounded-xl font-bold hover:bg-slate-700 transition-colors flex items-center gap-2"
                      >
                        <ExternalLink size={20} />
                        More Info
                      </a>
                    )}

                    {/* Close Button */}
                    <button
                      onClick={onClose}
                      className="px-6 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
                    >
                      Close
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
