// components/SocialMediaEditor.tsx
// Social media editor with privacy controls

"use client";

import { useState } from "react";
import {
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Youtube,
  Music,
  Camera,
  MessageCircle,
  Globe,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";

interface SocialMediaLink {
  platform: string;
  username?: string;
  url: string;
  isPrivate: boolean;
  displayOrder: number;
}

interface SocialMediaEditorProps {
  socialMedia: SocialMediaLink[];
  onChange: (socialMedia: SocialMediaLink[]) => void;
  readOnly?: boolean;
}

const SOCIAL_PLATFORMS = {
  facebook: {
    name: "Facebook",
    icon: Facebook,
    color: "#1877F2",
    baseUrl: "https://facebook.com/",
  },
  instagram: {
    name: "Instagram",
    icon: Instagram,
    color: "#E4405F",
    baseUrl: "https://instagram.com/",
  },
  twitter: {
    name: "Twitter/X",
    icon: Twitter,
    color: "#1DA1F2",
    baseUrl: "https://twitter.com/",
  },
  linkedin: {
    name: "LinkedIn",
    icon: Linkedin,
    color: "#0A66C2",
    baseUrl: "https://linkedin.com/in/",
  },
  youtube: {
    name: "YouTube",
    icon: Youtube,
    color: "#FF0000",
    baseUrl: "https://youtube.com/@",
  },
  tiktok: {
    name: "TikTok",
    icon: Music,
    color: "#000000",
    baseUrl: "https://tiktok.com/@",
  },
  snapchat: {
    name: "Snapchat",
    icon: Camera,
    color: "#FFFC00",
    baseUrl: "https://snapchat.com/add/",
  },
  discord: {
    name: "Discord",
    icon: MessageCircle,
    color: "#5865F2",
    baseUrl: "",
  },
  website: { name: "Website", icon: Globe, color: "#6B7280", baseUrl: "" },
};

export default function SocialMediaEditor({
  socialMedia = [],
  onChange,
  readOnly = false,
}: SocialMediaEditorProps) {
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingPlatform, setPendingPlatform] = useState<string | null>(null);

  // Ensure socialMedia is always an array
  const socialMediaArray = Array.isArray(socialMedia) ? socialMedia : [];

  const addSocialLink = (platform: string) => {
    const newLink: SocialMediaLink = {
      platform,
      username: "",
      url: "",
      isPrivate: false,
      displayOrder: socialMediaArray.length + 1,
    };
    onChange([...socialMediaArray, newLink]);
    setShowAddMenu(false);
    setPendingPlatform(null);
    setShowConfirmModal(false);
  };

  const handlePlatformClick = (platform: string) => {
    setPendingPlatform(platform);
    setShowConfirmModal(true);
  };

  const confirmAdd = () => {
    if (pendingPlatform) {
      addSocialLink(pendingPlatform);
    }
  };

  const cancelAdd = () => {
    setShowConfirmModal(false);
    setPendingPlatform(null);
  };

  const updateSocialLink = (
    index: number,
    updates: Partial<SocialMediaLink>,
  ) => {
    const updated = [...socialMediaArray];
    updated[index] = { ...updated[index], ...updates };
    onChange(updated);
  };

  const removeSocialLink = (index: number) => {
    const updated = socialMediaArray.filter((_, i) => i !== index);
    // Reorder remaining links
    updated.forEach((link, i) => {
      link.displayOrder = i + 1;
    });
    onChange(updated);
  };

  const togglePrivacy = (index: number) => {
    updateSocialLink(index, { isPrivate: !socialMediaArray[index].isPrivate });
  };

  const normalizeUrl = (platform: string, input: string): string => {
    if (!input) return "";

    // If already a full URL, return it
    if (input.startsWith("http://") || input.startsWith("https://")) {
      return input;
    }

    const config = SOCIAL_PLATFORMS[platform as keyof typeof SOCIAL_PLATFORMS];
    if (!config) return input;

    // Remove @ symbol if present
    const cleanInput = input.replace(/^@/, "");

    // For website, add https if not present
    if (platform === "website") {
      return input.startsWith("www.") ? `https://${input}` : input;
    }

    // Build URL with base URL
    return config.baseUrl + cleanInput;
  };

  const usedPlatforms = socialMediaArray.map((s) => s.platform);
  const availablePlatforms = Object.entries(SOCIAL_PLATFORMS).filter(
    ([key]) => !usedPlatforms.includes(key),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-black text-slate-700">Social Media</h3>
        {!readOnly && availablePlatforms.length > 0 && (
          <button
            type="button"
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all"
          >
            <Plus size={16} />
            Add Social Link
          </button>
        )}
      </div>

      {/* Add Platform Menu */}
      {showAddMenu && !readOnly && (
        <div className="bg-white border-2 border-slate-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-bold text-slate-600 mb-3">
            Select a platform:
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {availablePlatforms.map(([key, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePlatformClick(key)}
                  className="flex items-center gap-2 p-3 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
                >
                  <Icon size={20} style={{ color: config.color }} />
                  <span className="text-sm font-bold">{config.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Social Links List */}
      {socialMediaArray.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl">
          <Globe size={48} className="mx-auto text-slate-300 mb-2" />
          <p className="text-slate-500 font-bold">
            No social media links added
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {socialMediaArray.map((link, index) => {
            const config =
              SOCIAL_PLATFORMS[link.platform as keyof typeof SOCIAL_PLATFORMS];
            if (!config) return null;

            const Icon = config.icon;

            return (
              <div
                key={index}
                className="bg-white border-2 border-slate-200 rounded-xl p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: `${config.color}20` }}
                  >
                    <Icon size={20} style={{ color: config.color }} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-slate-700">
                        {config.name}
                      </span>
                      {!readOnly && (
                        <div className="flex items-center gap-2">
                          {/* Privacy Toggle */}
                          <button
                            type="button"
                            onClick={() => togglePrivacy(index)}
                            className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              link.isPrivate
                                ? "bg-orange-100 text-orange-700"
                                : "bg-green-100 text-green-700"
                            }`}
                            title={
                              link.isPrivate
                                ? "Private - Only you and admins can see"
                                : "Public - Visible to everyone"
                            }
                          >
                            {link.isPrivate ? (
                              <EyeOff size={14} />
                            ) : (
                              <Eye size={14} />
                            )}
                            {link.isPrivate ? "Private" : "Public"}
                          </button>

                          {/* Delete Button */}
                          <button
                            type="button"
                            onClick={() => removeSocialLink(index)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            title="Remove"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* URL Input */}
                    {readOnly ? (
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm font-bold"
                      >
                        {link.url}
                      </a>
                    ) : (
                      <input
                        type="text"
                        value={link.username || ""}
                        onChange={(e) => {
                          const input = e.target.value;
                          updateSocialLink(index, {
                            username: input,
                            url: normalizeUrl(link.platform, input),
                          });
                        }}
                        placeholder={
                          link.platform === "website"
                            ? "https://yourwebsite.com"
                            : link.platform === "discord"
                              ? "username#0000"
                              : "@username or profile URL"
                        }
                        className="w-full px-3 py-2 border-2 border-slate-200 rounded-lg font-bold text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}

                    {/* Privacy Notice */}
                    {link.isPrivate && (
                      <p className="text-xs text-orange-600 font-bold flex items-center gap-1">
                        <EyeOff size={12} />
                        Only you and club admins can see this link
                      </p>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && pendingPlatform && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-xl font-black text-slate-800 mb-4">
              Add{" "}
              {
                SOCIAL_PLATFORMS[
                  pendingPlatform as keyof typeof SOCIAL_PLATFORMS
                ]?.name
              }
              ?
            </h3>
            <p className="text-slate-600 font-bold mb-6">
              Do you want to add another social media link for{" "}
              {
                SOCIAL_PLATFORMS[
                  pendingPlatform as keyof typeof SOCIAL_PLATFORMS
                ]?.name
              }
              ?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={confirmAdd}
                className="flex-1 px-4 py-3 bg-blue-500 text-white font-bold rounded-xl hover:bg-blue-600 transition-all"
              >
                Yes, Add Link
              </button>
              <button
                type="button"
                onClick={cancelAdd}
                className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-300 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
