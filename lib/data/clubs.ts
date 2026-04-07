/**
 * Clubs Data Functions
 *
 * Load club data from /data folder
 */

// Direct import from /data folder
import clubsData from "../../data/clubs/clubs.json";

// Types
export interface ClubContact {
  role: string;
  name: string;
  email: string;
  phone: string;
}

export interface Fee {
  feeId: string;
  name: string;
  category: string;
  amount: number;
  gstIncluded: boolean;
  validFrom: { $date: string } | string;
  validTo: { $date: string } | string;
  isActive: boolean;
}

/** Club document — supports both normalized `ClubData` and legacy `clubs.json` shapes. */
export interface ClubData {
  id?: string;
  name?: string;
  /** Legacy field in `data/clubs/clubs.json` */
  title?: string;
  shortName?: string;
  abbreviation?: string;
  slug: string;
  logo?: string;
  iconSrc?: string;
  icon?: string;
  colors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  address?: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  contact?: {
    email: string;
    phone: string;
    website: string;
  };
  socialMedia?: {
    facebook: string;
    instagram: string;
    twitter: string;
  };
  /** Legacy top-level social URLs in JSON */
  facebookUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  committee?: any[];
  committeePositions?: string[];
  established?: string;
  homeGround?: string;
  description?: string;
  about?: string;
  active?: boolean;
  memberSequence?: number;
  parentAssociationId?: string;
  fees?: Fee[];
  contacts?: ClubContact[];
  createdAt?: string;
  updatedAt?: string;
}

/** Alias for consumers that still expect the name `Club`. */
export type Club = ClubData;

/**
 * Get all clubs
 */
export async function getClubs(): Promise<ClubData[]> {
  try {
    const data = clubsData as any;
    return data.clubs || [];
  } catch (error) {
    console.error("Failed to load clubs:", error);
    return [];
  }
}

/**
 * Get club by slug
 */
export async function getClubBySlug(slug: string): Promise<ClubData | undefined> {
  const clubs = await getClubs();
  return clubs.find((club) => club.slug === slug);
}

/**
 * Get club slugs (for static generation)
 */
export async function getClubSlugs(): Promise<string[]> {
  const clubs = await getClubs();
  return clubs.map((club) => club.slug);
}

/**
 * Search clubs by name
 */
export async function searchClubs(query: string): Promise<ClubData[]> {
  const clubs = await getClubs();
  const lowerQuery = query.toLowerCase();

  return clubs.filter((club) => {
    const haystack = [
      club.title,
      club.name,
      club.shortName,
      club.abbreviation,
      club.description,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(lowerQuery);
  });
}

/**
 * Get club contacts
 */
export async function getClubContacts(slug: string): Promise<ClubContact[]> {
  const club = await getClubBySlug(slug);
  return club?.contacts ?? [];
}

/**
 * Get clubs with social media
 */
export async function getClubsWithSocial(): Promise<ClubData[]> {
  const clubs = await getClubs();
  return clubs.filter(
    (club) =>
      club.facebookUrl ||
      club.instagramUrl ||
      club.twitterUrl ||
      club.socialMedia?.facebook ||
      club.socialMedia?.instagram ||
      club.socialMedia?.twitter,
  );
}

/**
 * Get featured clubs (clubs with full details)
 */
export async function getFeaturedClubs(): Promise<ClubData[]> {
  const clubs = await getClubs();
  return clubs.filter((club) => club.about && club.about.length > 0);
}
