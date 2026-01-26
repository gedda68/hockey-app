// types/members.ts
// Complete member type definitions

export interface Salutation {
  salutationId: string;
  name: string;
  fullName: string;
  category: string;
  isActive: boolean;
  displayOrder: number;
}

export interface Gender {
  genderId: string;
  name: string;
  abbreviation: string;
  isActive: boolean;
}

export interface MembershipType {
  typeId: string;
  name: string;
  description: string;
  basePrice: number;
  isActive: boolean;
}

export interface Role {
  roleId: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  isActive: boolean;
}

export interface Relationship {
  relationshipId: string;
  name: string;
  category: string;
  isActive: boolean;
}

export interface HealthProvider {
  providerId: string;
  name: string;
  shortName: string;
  category: string;
  isActive: boolean;
}

export interface RelationshipType {
  typeId: string;
  forward: string;
  reverse: string;
  category: string;
  isActive: boolean;
}

export interface PersonalInfo {
  salutation: string;
  firstName: string;
  lastName: string;
  displayName: string;
  dateOfBirth: string;
  gender: string;
  photoUrl: string | null;
}

export interface ContactInfo {
  primaryEmail: string;
  emailOwnership: string;
  phone: string;
  mobile: string;
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
  medicare: Medicare | null;
  privateHealth: PrivateHealth | null;
}

export interface Medical {
  conditions: string;
  medications: string;
  allergies: string;
}

export interface EmergencyContact {
  contactId: string;
  priority: number;
  name: string;
  relationship: string;
  phone: string;
  mobile: string;
  email: string;
}

export interface Membership {
  membershipType: string;
  status: string;
  joinDate: string;
}

export interface PlayerInfo {
  jerseyNumber: string;
  position: string;
}

export interface FamilyRelationship {
  relationshipId: string;
  relatedMemberId: string;
  relationshipType: string;
  forwardRelation: string;
  reverseRelation: string;
  searchQuery?: string;
  createdAt?: string;
  createdBy?: string;
}

export interface MemberFormData {
  personalInfo: PersonalInfo;
  contact: ContactInfo;
  address: Address;
  healthcare: Healthcare;
  emergencyContacts: EmergencyContact[];
  membership: Membership;
  roles: string[];
  playerInfo: PlayerInfo | null;
  medical: Medical;
  familyRelationships: FamilyRelationship[];
}

export interface Member {
  _id?: string;
  memberId: string;
  clubId: string;
  personalInfo: PersonalInfo;
  contact: ContactInfo;
  address: Address;
  healthcare: Healthcare;
  emergencyContacts: EmergencyContact[];
  membership: Membership;
  roles: string[];
  playerInfo: PlayerInfo | null;
  medical: Medical;
  familyRelationships: FamilyRelationship[];
  status: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}
