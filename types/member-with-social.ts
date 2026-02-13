// types/member-with-social.ts
// Updated Member interface with social media

export interface SocialMediaLink {
  platform: string; // 'facebook' | 'instagram' | 'twitter' | 'linkedin' | 'youtube' | 'tiktok' | 'snapchat' | 'discord' | 'website'
  username?: string; // Username or handle
  url: string; // Full URL to profile
  isPrivate: boolean; // If true, only member/admins can see
  displayOrder: number; // Order to display (1, 2, 3...)
}

export interface Member {
  memberId: string;
  personalInfo: {
    salutation: string;
    firstName: string;
    lastName: string;
    displayName?: string;
    dateOfBirth: string;
    gender: string;
    photoUrl?: string | null;
  };
  contact: {
    primaryEmail: string;
    emailOwnership: string;
    phone?: string;
    mobile?: string;
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };

  // Social Media (NEW)
  socialMedia?: SocialMediaLink[];

  healthcare?: {
    medicare?: {
      number: string;
      position: string;
      expiryMonth: string;
      expiryYear: string;
    } | null;
    privateHealth?: {
      provider: string;
      membershipNumber: string;
      expiryDate: string;
    } | null;
  };
  emergencyContacts?: Array<{
    contactId: string;
    priority: number;
    name: string;
    relationship: string;
    phone?: string;
    mobile?: string;
    email?: string;
  }>;
  membership: {
    membershipType: string;
    status: "Active" | "Inactive" | "Expired" | "Pending";
    joinDate: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    renewalHistory?: Array<{
      renewalId: string;
      renewalDate: string;
      periodStart: string;
      periodEnd: string;
      membershipType: string;
      fee?: number;
      renewedBy?: string;
      notes?: string;
    }>;
  };
  roles: string[];
  playerInfo?: {
    jerseyNumber?: string;
    position?: string;
  } | null;
  medical?: {
    conditions?: string;
    medications?: string;
    allergies?: string;
  };
  familyRelationships?: Array<{
    relationshipId: string;
    relatedMemberId: string;
    relationshipType: string;
    forwardRelation: string;
    reverseRelation: string;
  }>;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Social media platform configurations
export const SOCIAL_PLATFORMS = {
  facebook: {
    name: "Facebook",
    icon: "Facebook",
    color: "#1877F2",
    baseUrl: "https://facebook.com/",
    placeholder: "username or profile URL",
  },
  instagram: {
    name: "Instagram",
    icon: "Instagram",
    color: "#E4405F",
    baseUrl: "https://instagram.com/",
    placeholder: "@username or profile URL",
  },
  twitter: {
    name: "Twitter/X",
    icon: "Twitter",
    color: "#1DA1F2",
    baseUrl: "https://twitter.com/",
    placeholder: "@username or profile URL",
  },
  linkedin: {
    name: "LinkedIn",
    icon: "Linkedin",
    color: "#0A66C2",
    baseUrl: "https://linkedin.com/in/",
    placeholder: "username or profile URL",
  },
  youtube: {
    name: "YouTube",
    icon: "Youtube",
    color: "#FF0000",
    baseUrl: "https://youtube.com/@",
    placeholder: "@channel or URL",
  },
  tiktok: {
    name: "TikTok",
    icon: "Music",
    color: "#000000",
    baseUrl: "https://tiktok.com/@",
    placeholder: "@username or URL",
  },
  snapchat: {
    name: "Snapchat",
    icon: "Camera",
    color: "#FFFC00",
    baseUrl: "https://snapchat.com/add/",
    placeholder: "username",
  },
  discord: {
    name: "Discord",
    icon: "MessageCircle",
    color: "#5865F2",
    baseUrl: "",
    placeholder: "username#0000",
  },
  website: {
    name: "Website",
    icon: "Globe",
    color: "#6B7280",
    baseUrl: "",
    placeholder: "https://yourwebsite.com",
  },
} as const;

export type SocialPlatform = keyof typeof SOCIAL_PLATFORMS;

// Renewal helper functions
export function getDefaultMembershipDates() {
  const now = new Date();
  const year = now.getFullYear();
  return {
    currentPeriodStart: `${year}-01-01`,
    currentPeriodEnd: `${year}-12-31`,
  };
}

export function getRenewalDates() {
  const now = new Date();
  const nextYear = now.getFullYear() + 1;
  return {
    periodStart: `${nextYear}-01-01`,
    periodEnd: `${nextYear}-12-31`,
  };
}

export function isMembershipExpired(member: Member): boolean {
  if (!member.membership?.currentPeriodEnd) return false;
  const endDate = new Date(member.membership.currentPeriodEnd);
  return endDate < new Date();
}
