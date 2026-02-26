// sections/ConsentPermissionsSection.tsx
// Consent & Permissions for photos, media, transport, first aid, and emergency treatment

"use client";

import { BaseSectionProps } from "../../../../types/player.types";
import {
  CheckCircle,
  XCircle,
  Camera,
  Video,
  Car,
  Heart,
  AlertTriangle,
  Shield,
  Info,
} from "lucide-react";

export default function ConsentPermissionsSection({
  formData,
  onChange,
  errors,
}: BaseSectionProps) {
  const consents = formData.consents || {
    photoConsent: false,
    mediaConsent: false,
    transportConsent: false,
    firstAidConsent: false,
    emergencyTreatmentConsent: false,
  };

  const updateConsent = (field: string, value: boolean) => {
    onChange("consents", {
      ...consents,
      [field]: value,
    });
  };

  const consentItems = [
    {
      key: "photoConsent",
      icon: Camera,
      title: "Photo Consent",
      description:
        "Can we use photos of this player in club marketing materials, newsletters, and publications?",
      details: [
        "Club website and social media",
        "Printed materials (posters, programs)",
        "Local media (newspapers, magazines)",
        "Hockey association publications",
      ],
      required: false,
      color: "blue",
    },
    {
      key: "mediaConsent",
      icon: Video,
      title: "Media & Video Consent",
      description:
        "Can this player appear in videos, livestreams, and social media content?",
      details: [
        "Game highlights and match recordings",
        "Training videos and tutorials",
        "Social media posts (Instagram, Facebook)",
        "YouTube channel content",
      ],
      required: false,
      color: "purple",
    },
    {
      key: "transportConsent",
      icon: Car,
      title: "Transport Consent",
      description:
        "Can this player travel with other parents/guardians to games and events?",
      details: [
        "Transport to/from away games",
        "Carpooling with other families",
        "Team bus for tournaments",
        "Travel organized by team managers",
      ],
      required: false,
      color: "green",
    },
    {
      key: "firstAidConsent",
      icon: Heart,
      title: "First Aid Consent",
      description:
        "Can club first aid officers administer basic first aid treatment?",
      details: [
        "Minor cuts, scrapes, and bruises",
        "Ice packs for injuries",
        "Bandages and wound care",
        "Basic pain relief (if appropriate)",
      ],
      required: true,
      color: "red",
    },
    {
      key: "emergencyTreatmentConsent",
      icon: AlertTriangle,
      title: "Emergency Medical Treatment",
      description:
        "Can club officials authorize emergency medical treatment if parent/guardian cannot be contacted?",
      details: [
        "Ambulance call if seriously injured",
        "Emergency room treatment",
        "Medical decisions if parent unavailable",
        "Hospital admission if necessary",
      ],
      required: true,
      color: "orange",
    },
  ];

  const allRequiredGranted = consentItems
    .filter((item) => item.required)
    .every((item) => consents[item.key as keyof typeof consents]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="text-blue-600 flex-shrink-0 mt-0.5" size={24} />
          <div className="flex-1">
            <h3 className="font-black text-blue-900 text-base">
              Consent & Permissions
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              Please review and indicate your consent for the following
              activities. Some consents are required for registration.
            </p>
          </div>
        </div>
      </div>

      {/* Required Consents Warning */}
      {!allRequiredGranted && (
        <div className="p-4 bg-amber-50 border-2 border-amber-300 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="text-amber-600 flex-shrink-0 mt-0.5"
              size={20}
            />
            <div>
              <h4 className="font-black text-amber-900 text-sm">
                Required Consents Missing
              </h4>
              <p className="text-xs text-amber-700 mt-1">
                First Aid and Emergency Treatment consents are required for
                player safety and must be granted to complete registration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Consent Items */}
      <div className="space-y-4">
        {consentItems.map((item) => {
          const Icon = item.icon;
          const isGranted = consents[item.key as keyof typeof consents];
          const colorClasses = {
            blue: {
              bg: "bg-blue-50",
              border: "border-blue-200",
              icon: "text-blue-600",
              yes: "bg-blue-600 hover:bg-blue-700",
              no: "bg-slate-300 hover:bg-slate-400",
            },
            purple: {
              bg: "bg-purple-50",
              border: "border-purple-200",
              icon: "text-purple-600",
              yes: "bg-purple-600 hover:bg-purple-700",
              no: "bg-slate-300 hover:bg-slate-400",
            },
            green: {
              bg: "bg-green-50",
              border: "border-green-200",
              icon: "text-green-600",
              yes: "bg-green-600 hover:bg-green-700",
              no: "bg-slate-300 hover:bg-slate-400",
            },
            red: {
              bg: "bg-red-50",
              border: "border-red-200",
              icon: "text-red-600",
              yes: "bg-red-600 hover:bg-red-700",
              no: "bg-slate-300 hover:bg-slate-400",
            },
            orange: {
              bg: "bg-orange-50",
              border: "border-orange-200",
              icon: "text-orange-600",
              yes: "bg-orange-600 hover:bg-orange-700",
              no: "bg-slate-300 hover:bg-slate-400",
            },
          };

          const colors = colorClasses[item.color as keyof typeof colorClasses];

          return (
            <div
              key={item.key}
              className={`p-6 ${colors.bg} border-2 ${colors.border} rounded-2xl`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-full ${colors.bg} border-2 ${colors.border} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className={colors.icon} size={24} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h4 className="font-black text-slate-900 text-base">
                      {item.title}
                    </h4>
                    {item.required && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-black">
                        REQUIRED
                      </span>
                    )}
                    {isGranted ? (
                      <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-black flex items-center gap-1">
                        <CheckCircle size={12} />
                        GRANTED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-black flex items-center gap-1">
                        <XCircle size={12} />
                        NOT GRANTED
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-slate-700 mb-3">
                    {item.description}
                  </p>

                  {/* Details */}
                  <div className="mb-4 p-3 bg-white/50 rounded-lg">
                    <p className="text-xs font-bold text-slate-600 mb-2">
                      This includes:
                    </p>
                    <ul className="text-xs text-slate-600 space-y-1">
                      {item.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-slate-400 mt-0.5">•</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Consent Buttons */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateConsent(item.key, true)}
                      className={`flex-1 px-6 py-3 ${
                        isGranted ? colors.yes : colors.no
                      } text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2`}
                    >
                      <CheckCircle size={18} />
                      {isGranted ? "Consent Granted" : "Grant Consent"}
                    </button>
                    <button
                      type="button"
                      onClick={() => updateConsent(item.key, false)}
                      className={`flex-1 px-6 py-3 ${
                        !isGranted
                          ? "bg-slate-600 hover:bg-slate-700"
                          : "bg-slate-300 hover:bg-slate-400"
                      } text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2`}
                    >
                      <XCircle size={18} />
                      {!isGranted ? "Consent Withheld" : "Withhold Consent"}
                    </button>
                  </div>

                  {item.required && !isGranted && (
                    <p className="text-xs text-red-700 font-bold mt-2 flex items-center gap-1">
                      <AlertTriangle size={12} />
                      This consent is required to complete registration
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="p-4 bg-slate-100 border-2 border-slate-200 rounded-xl">
        <div className="flex items-start gap-3">
          <Info className="text-slate-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h4 className="font-black text-slate-900 text-sm mb-2">
              Consent Summary
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {consentItems.map((item) => {
                const isGranted = consents[item.key as keyof typeof consents];
                return (
                  <div key={item.key} className="text-center">
                    <p className="text-xs text-slate-600 mb-1">{item.title}</p>
                    {isGranted ? (
                      <CheckCircle
                        size={20}
                        className="text-green-600 mx-auto"
                      />
                    ) : (
                      <XCircle size={20} className="text-slate-400 mx-auto" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Legal Notice */}
      <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-xs text-blue-900 font-bold mb-2">
          🔒 <strong>Privacy & Rights:</strong>
        </p>
        <ul className="text-xs text-blue-800 space-y-1 ml-4 list-disc">
          <li>You can withdraw consent at any time by contacting the club</li>
          <li>Your privacy is protected under Australian Privacy Principles</li>
          <li>Photos and media will only be used for club purposes</li>
          <li>
            Emergency medical consent does not override your authority - it only
            applies when you cannot be contacted
          </li>
          <li>
            You will always be notified if emergency treatment is administered
          </li>
        </ul>
      </div>
    </div>
  );
}
