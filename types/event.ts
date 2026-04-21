// types/event.ts
// MongoDB-integrated Event type with references to existing collections

import { ObjectId } from "mongodb";

export type EventStatus =
  | "scheduled"
  | "cancelled"
  | "postponed"
  | "completed"
  | "draft";
export type EventCategory =
  | "competition"
  | "finals"
  | "representative"
  | "clinic"
  | "officials"
  | "social"
  | "training"
  | "meeting"
  | "other";
export type EventScope =
  | "city"
  | "regional"
  | "state"
  | "national"
  | "international";
export type EventVisibility = "public" | "private" | "members-only";
export type OrgType = "association" | "club" | "team" | "competition";

/**
 * Controls which calendars an event is automatically propagated to.
 *
 * - "none"        → only appears in the org that created it
 * - "team"        → visible to all teams of the owning club
 * - "club"        → visible to all clubs of the owning association
 * - "association" → same as "club" (association-wide)
 * - "global"      → appears in every calendar under the association
 */
export type CalendarPropagation =
  | "none"
  | "team"
  | "club"
  | "association"
  | "global";

export interface EventDocument {
  _id?: ObjectId;
  id: string; // UUID for external reference

  // Basic Info
  name: string;
  slug: string; // URL-friendly version
  shortDescription: string; // 150 chars max for cards
  fullDescription?: string; // Rich HTML for modal

  // Dates & Times
  startDate: Date;
  endDate?: Date;
  startTime?: string; // "09:00" in HH:mm format
  endTime?: string; // "17:00"
  timezone: string; // Default: "Australia/Brisbane"
  isAllDay: boolean;

  // Location & Venue
  location?: string; // Simple text location
  venue?: {
    name: string;
    address?: string;
    suburb?: string;
    postcode?: string;
    state?: string;
    fieldNumber?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
    facilities?: string[]; // ["parking", "changerooms", "canteen"]
  };

  // Classification
  category: EventCategory;
  scope: EventScope;

  // Organization (References to existing collections)
  organization: {
    type: OrgType;
    id: string; // MongoDB ObjectId as string
    name: string; // Denormalized for performance
    // For type "team", also store parent club
    clubId?: string; // If type is "team"
    clubName?: string;
  };

  // References to existing entities
  references?: {
    clubId?: string; // Link to clubs collection
    competitionId?: string; // Link to competitions collection
    divisionId?: string; // Link to divisions
    teamIds?: string[]; // Multiple teams involved
    associationId?: string; // Link to associations
  };

  // Visibility & Access
  visibility: EventVisibility;

  /**
   * Calendar propagation scope — controls which calendars this event
   * is automatically surfaced in beyond its owning organisation.
   */
  calendarPropagation?: CalendarPropagation;

  requiresRegistration: boolean;
  registrationConfig?: {
    deadline?: Date;
    url?: string; // External registration URL
    maxParticipants?: number;
    currentParticipants?: number;
    waitlistEnabled?: boolean;
    fields?: string[]; // ["name", "email", "club", "ageGroup"]
  };

  // Media & Files
  images?: {
    featured?: string; // Hero/banner image URL
    thumbnail?: string; // Card thumbnail
    gallery?: string[]; // Photo gallery
  };
  flyer?: string; // PDF flyer URL
  documents?: Array<{
    _id?: ObjectId;
    name: string;
    url: string;
    type: "pdf" | "doc" | "docx" | "xls" | "xlsx" | "csv" | "txt" | "image" | "other";
    size?: number; // bytes
    uploadedAt?: Date;
    uploadedBy?: string; // userId
  }>;

  // Contact & Links
  contactPerson?: {
    userId?: string; // Reference to users collection
    name: string;
    email?: string;
    phone?: string;
    role?: string;
  };
  externalLink?: string;
  ticketingUrl?: string;
  livestreamUrl?: string;

  // Additional Classifications
  tags?: string[]; // ["junior", "women", "beginners"]
  ageGroup?: string; // "U12", "U18", "Open", "Masters 35+"
  division?: string; // "Premier League", "Division 1"
  gender?: "men" | "women" | "mixed" | "all";
  skillLevel?: "beginner" | "intermediate" | "advanced" | "all";

  // Status & Updates
  status: EventStatus;
  cancelReason?: string;
  postponedTo?: Date;
  weatherDependent: boolean;
  updates?: Array<{
    _id?: ObjectId;
    date: Date;
    message: string;
    authorId?: string;
    authorName?: string;
  }>;

  // Costs & Ticketing
  cost?: {
    isFree: boolean;
    amount?: number;
    currency: string; // "AUD"
    tiers?: Array<{
      type: string; // "adult", "concession", "family"
      price: number;
      description?: string;
    }>;
    description?: string; // "Members: $15, Non-members: $25"
  };

  // Recurrence (for repeating events)
  recurrence?: {
    isRecurring: boolean;
    frequency?: "daily" | "weekly" | "monthly";
    interval?: number; // every X days/weeks/months
    endDate?: Date;
    daysOfWeek?: number[]; // [0,2,4] for Sun, Tue, Thu
    exceptions?: Date[]; // Dates to skip
    parentEventId?: string; // Reference to parent recurring event
  };

  // Participants & Attendance (for registered events)
  participants?: {
    registered?: string[]; // Array of user IDs
    waitlist?: string[]; // Array of user IDs
    attended?: string[]; // Array of user IDs (post-event)
  };

  // Notifications
  notifications?: {
    sendReminder: boolean;
    reminderDays?: number[]; // [7, 1] for 7 days and 1 day before
    lastReminderSent?: Date;
  };

  // SEO & Discoverability
  seo?: {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
  };

  // Analytics (for tracking)
  analytics?: {
    views?: number;
    clicks?: number;
    registrations?: number;
    actualAttendance?: number;
  };

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string; // userId
  updatedBy?: string; // userId

  // Soft delete
  deleted?: boolean;
  deletedAt?: Date;
  deletedBy?: string;
}

// For API responses
export interface Event extends Omit<
  EventDocument,
  "_id" | "startDate" | "endDate" | "createdAt" | "updatedAt"
> {
  _id: string;
  startDate: string; // ISO string
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}

// For creating new events
export type CreateEventInput = Omit<
  EventDocument,
  "_id" | "id" | "createdAt" | "updatedAt" | "analytics"
>;

// For updating events
export type UpdateEventInput = Partial<CreateEventInput>;
