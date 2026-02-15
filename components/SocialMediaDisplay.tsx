// components/SocialMediaDisplay.tsx
// Display social media links (respects privacy settings)

"use client";

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
  EyeOff,
} from "lucide-react";

interface SocialMediaLink {
  platform: string;
  username?: string;
  url: string;
  isPrivate: boolean;
  displayOrder: number;
}

interface SocialMediaDisplayProps {
  socialMedia: SocialMediaLink[];
  canViewPrivate?: boolean; // true for member themselves or admins
  compact?: boolean; // Compact icon-only view
}

const SOCIAL_PLATFORMS = {
  facebook: { name: "Facebook", icon: Facebook, color: "#1877F2" },
  instagram: { name: "Instagram", icon: Instagram, color: "#E4405F" },
  twitter: { name: "Twitter/X", icon: Twitter, color: "#1DA1F2" },
  linkedin: { name: "LinkedIn", icon: Linkedin, color: "#0A66C2" },
  youtube: { name: "YouTube", icon: Youtube, color: "#FF0000" },
  tiktok: { name: "TikTok", icon: Music, color: "#000000" },
  snapchat: { name: "Snapchat", icon: Camera, color: "#FFFC00" },
  discord: { name: "Discord", icon: MessageCircle, color: "#5865F2" },
  website: { name: "Website", icon: Globe, color: "#6B7280" },
};

export default function SocialMediaDisplay({
  socialMedia = [],
  canViewPrivate = false,
  compact = false,
}: SocialMediaDisplayProps) {
  // Filter out private links if user can't view them
  const visibleLinks = socialMedia.filter(
    (link) => !link.isPrivate || canViewPrivate,
  );

  if (visibleLinks.length === 0) {
    return null;
  }

  // Sort by display order
  const sortedLinks = [...visibleLinks].sort(
    (a, b) => a.displayOrder - b.displayOrder,
  );

  if (compact) {
    // Compact view - just icons
    return (
      <div className="flex flex-wrap gap-2">
        {sortedLinks.map((link, index) => {
          const config =
            SOCIAL_PLATFORMS[link.platform as keyof typeof SOCIAL_PLATFORMS];
          if (!config) return null;

          const Icon = config.icon;

          return (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="relative w-10 h-10 rounded-lg flex items-center justify-center hover:scale-110 transition-transform"
              style={{ backgroundColor: `${config.color}20` }}
              title={`${config.name}${link.isPrivate ? " (Private)" : ""}`}
            >
              <Icon size={20} style={{ color: config.color }} />
              {link.isPrivate && canViewPrivate && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center">
                  <EyeOff size={10} className="text-white" />
                </div>
              )}
            </a>
          );
        })}
      </div>
    );
  }

  // Full view - with labels
  return (
    <div className="space-y-3">
      <h4 className="text-sm font-black text-slate-600 uppercase">
        Social Media
      </h4>
      <div className="space-y-2">
        {sortedLinks.map((link, index) => {
          const config =
            SOCIAL_PLATFORMS[link.platform as keyof typeof SOCIAL_PLATFORMS];
          if (!config) return null;

          const Icon = config.icon;

          return (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${config.color}20` }}
              >
                <Icon size={20} style={{ color: config.color }} />
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-700 text-sm">
                  {config.name}
                </p>
                <p className="text-slate-500 text-xs font-bold truncate group-hover:text-blue-600">
                  {link.username || link.url}
                </p>
              </div>

              {link.isPrivate && canViewPrivate && (
                <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                  <EyeOff size={12} />
                  Private
                </div>
              )}
            </a>
          );
        })}
      </div>
    </div>
  );
}
