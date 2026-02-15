// types/member.ts
// Central type definitions for Member entity

export interface SocialMediaLink {
  platform: string;
  username?: string;
  url: string;
  isPrivate: boolean;
  displayOrder: number;
}

export interface PersonalInfo {
  salutation: string;
  firstName: string;
  lastName: string;
  displayName?: string;
  dateOfBirth: string;
  gender: string;
  photoUrl?: string | null;
}

export interface Contact {
  primaryEmail: string;
  emailOwnership: string;
  phone?: string;
  mobile?: string;
}

export interface Address {
  street: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
}

export interface Medicare {
  number: string;
  position: string;
  expiryMonth: string;
  expiryYear: string;
}

export interface PrivateHealth {
  provider: string;
  membershipNumber: string;
  expiryDate: string;
}

export interface Healthcare {
  medicare?: Medicare | null;
  privateHealth?: PrivateHealth | null;
}

export interface EmergencyContact {
  contactId: string;
  priority: number;
  name: string;
  relationship: string;
  phone: string;
  mobile?: string;
  email?: string;
}

export interface MedicalInfo {
  conditions?: string;
  medications?: string;
  allergies?: string;
}

export interface PlayerInfo {
  jerseyNumber?: string;
  position?: string;
}

export interface RenewalRecord {
  renewedAt: string;
  renewedBy: string;
  periodStart: string;
  periodEnd: string;
  membershipType: string;
  notes?: string;
}

export interface Membership {
  membershipType: string;
  status: "Active" | "Inactive";
  joinDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  renewalHistory?: RenewalRecord[];
}

export interface FamilyRelationship {
  relationshipId: string;
  relatedMemberId: string;
  relationshipType: string;
  forwardRelation: string;
  reverseRelation: string;
}

export interface Member {
  _id?: string;
  memberId: string;
  clubId: string;
  personalInfo: PersonalInfo;
  contact: Contact;
  address: Address;
  socialMedia?: SocialMediaLink[];
  healthcare?: Healthcare;
  emergencyContacts: EmergencyContact[];
  medical?: MedicalInfo;
  playerInfo?: PlayerInfo | null;
  membership: Membership;
  roles: string[];
  familyRelationships?: FamilyRelationship[];
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

// Utility type for partial member updates
export type MemberUpdate = Partial<Omit<Member, "_id" | "memberId" | "clubId">>;

// Type for member creation (without generated fields)
export type MemberCreate = Omit<
  Member,
  "_id" | "memberId" | "createdAt" | "updatedAt" | "createdBy" | "updatedBy"
>;

// Type guards
export function isMemberWithHealthcare(
  member: Member,
): member is Member & { healthcare: Healthcare } {
  return member.healthcare !== undefined && member.healthcare !== null;
}

export function isMemberWithPlayerInfo(
  member: Member,
): member is Member & { playerInfo: PlayerInfo } {
  return member.playerInfo !== undefined && member.playerInfo !== null;
}
