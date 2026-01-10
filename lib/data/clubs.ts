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

export interface Club {
  title: string;
  description: string;
  icon?: string;
  iconSrc?: string;
  href: string;
  slug: string;
  address?: string;
  color: string;
  bgColor?: string;
  about: string;
  facebookUrl: string;
  instagramUrl: string;
  twitterUrl: string;
  contacts: ClubContact[];
}

/**
 * Get all clubs
 */
export async function getClubs(): Promise<Club[]> {
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
export async function getClubBySlug(slug: string): Promise<Club | undefined> {
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
export async function searchClubs(query: string): Promise<Club[]> {
  const clubs = await getClubs();
  const lowerQuery = query.toLowerCase();

  return clubs.filter(
    (club) =>
      club.title.toLowerCase().includes(lowerQuery) ||
      club.description.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get club contacts
 */
export async function getClubContacts(slug: string): Promise<ClubContact[]> {
  const club = await getClubBySlug(slug);
  return club?.contacts || [];
}

/**
 * Get clubs with social media
 */
export async function getClubsWithSocial(): Promise<Club[]> {
  const clubs = await getClubs();
  return clubs.filter(
    (club) => club.facebookUrl || club.instagramUrl || club.twitterUrl
  );
}

/**
 * Get featured clubs (clubs with full details)
 */
export async function getFeaturedClubs(): Promise<Club[]> {
  const clubs = await getClubs();
  return clubs.filter((club) => club.about && club.about.length > 0);
}
