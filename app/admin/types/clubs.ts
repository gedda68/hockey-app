// app/admin/types/clubs.ts
// Club type definition matching database structure

export interface Club {
  // IDs
  id: string;
  _id?: any; // MongoDB ObjectId

  // Basic Info
  name: string;
  shortName?: string;
  slug: string; // ← SLUG FIELD FOR URLS

  // Images
  logo?: string;
  icon?: string; // Legacy field
  iconSrc?: string; // Legacy field

  // Colors
  colors: {
    primary: string;
    secondary: string;
    accent?: string;
  };

  // Address
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };

  // Contact
  contact: {
    email: string;
    phone?: string;
    website?: string;
  };

  // Social Media
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };

  // Committee
  committee: Array<{
    id: string;
    name: string;
    position: string;
    email?: string;
    phone?: string;
  }>;

  // Additional Info
  established?: string;
  homeGround?: string;
  description?: string;
  about?: string;

  // Status
  active: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}
