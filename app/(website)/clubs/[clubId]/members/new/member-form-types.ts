/** Shared wizard state — avoids clashing with the DOM `FormData` type. */

export interface SocialMediaLink {
  platform: string;
  username?: string;
  url: string;
  isPrivate: boolean;
  displayOrder: number;
}

export interface AddMemberFormData {
  personalInfo: {
    salutation: string;
    firstName: string;
    lastName: string;
    displayName: string;
    dateOfBirth: string;
    gender: string;
    photoUrl: string | null;
  };
  contact: {
    primaryEmail: string;
    emailOwnership: string;
    phone: string;
    mobile: string;
  };
  address: {
    street: string;
    suburb: string;
    state: string;
    postcode: string;
    country: string;
  };
  healthcare: {
    medicare: {
      number: string;
      position: string;
      expiryMonth: string;
      expiryYear: string;
    } | null;
    privateHealth: {
      provider: string;
      membershipNumber: string;
      expiryDate: string;
    } | null;
  };
  emergencyContacts: Array<{
    contactId: string;
    priority: number;
    name: string;
    relationship: string;
    phone: string;
    mobile: string;
    email: string;
  }>;
  membership: {
    membershipType: string;
    status: string;
    joinDate: string;
  };
  roles: string[];
  playerInfo: {
    jerseyNumber: string;
    position: string;
  } | null;
  medical: {
    conditions: string;
    medications: string;
    allergies: string;
  };
  familyRelationships: Array<{
    relationshipId: string;
    relatedMemberId: string;
    relationshipType: string;
    forwardRelation: string;
    reverseRelation: string;
    searchQuery: string;
  }>;
  socialMedia: SocialMediaLink[];
}
