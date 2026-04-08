// app/admin/types/index.ts
// UPDATED: Added Selectors, User Management, Club Integration

export interface Player {
  name: string;
  club: string;
  icon: string;
  playerId?: string; // Link to Player entity
}

export interface Staff {
  name: string;
  club: string;
  icon: string;
  staffId?: string; // Link to Staff entity
}

export interface Team {
  name: string;
  players: Player[];
  staff: {
    coach?: Staff;
    asstCoach?: Staff;
    manager?: Staff;
    umpire?: Staff;
  };
}

// NEW: Selector entity
export interface Selector {
  id: string;
  name: string;
  club: string;
  icon?: string;
  isChair: boolean;
  userId?: string; // Optional link to User entity (for future)
}

export interface Roster {
  _id?: string;
  ageGroup: string;
  season: string;
  lastUpdated: string;
  teams: Team[];
  shadowPlayers: Player[];
  withdrawn: Array<Player & { reason: string }>;
  selectors: Selector[]; // NEW: Up to 5 selectors
  trialInfo?: any;
  trainingInfo?: any;
  tournamentInfo?: any;
}

export interface DraggedPlayer {
  player: Player;
  sourceType: "team" | "shadow" | "withdrawn";
  sourceTeam?: string;
  sourceIndex: number;
  ageGroup: string;
}

export interface EditingPlayer {
  ageGroup: string;
  teamName: string;
  playerIndex: number;
  player: Player;
}

export interface EditingStaff {
  ageGroup: string;
  teamName: string;
  role: string;
  staff: Staff;
}

export interface EditingShadowPlayer {
  ageGroup: string;
  playerIndex: number;
  player: Player;
}

export interface AddPlayerModal {
  ageGroup: string;
  teamName: string;
}

// ==================== NEW ENTITY TYPES ====================

// User Management
export interface User {
  _id?: string;
  userId: string; // Unique ID
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: "admin" | "selector" | "coach" | "manager" | "player" | "parent";
  clubId?: string; // Link to Club
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
  preferences?: {
    notifications: boolean;
    emailUpdates: boolean;
  };
}

// Club Management
export interface Club {
  _id?: string;
  id: string; // Match the "id" field in your screenshot
  name: string;
  shortName: string;
  slug: string; // Added from screenshot
  logo: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string; // Added from screenshot
  };
  address?: {
    // Updated to Object based on screenshot
    street?: string;
    suburb?: string;
    state?: string;
    postcode?: string;
  };
  contact: {
    email?: string;
    phone?: string;
  };
  socialMedia?: {
    // Added from screenshot
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  active: boolean; // Changed from isActive to active to match DB
  established?: string;
  homeGround?: string;
  description?: string;
  about?: string;
  createdAt: string;
  updatedAt: string;
}

// Player Entity (Full Profile)
export interface PlayerEntity {
  _id?: string;
  playerId: string; // Unique ID
  userId?: string; // Link to User if they have an account
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "male" | "female" | "other";

  // Current Club
  currentClubId: string;

  // Club History
  clubHistory: {
    clubId: string;
    clubName: string;
    startDate: string;
    endDate?: string;
    position?: string;
  }[];

  // Contact
  email?: string;
  phone?: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };

  // Hockey Info
  position: string; // Forward, Midfield, Defence, Goalkeeper
  preferredFoot: "left" | "right" | "both";
  jerseyNumber?: number;

  // Selection Status
  nominations: {
    ageGroup: string;
    season: string;
    status: "nominated" | "selected" | "rejected" | "withdrawn";
    nominatedDate: string;
    decisionDate?: string;
  }[];

  // Stats
  stats?: {
    gamesPlayed: number;
    goals: number;
    assists: number;
  };

  // Documents
  documents?: {
    type: "medical" | "photo" | "registration" | "consent";
    url: string;
    uploadedDate: string;
  }[];

  isActive: boolean;
  createdAt: string;
}

// Staff Entity (Full Profile)
export interface StaffEntity {
  _id?: string;
  staffId: string; // Unique ID
  userId?: string; // Link to User
  firstName: string;
  lastName: string;

  // Current Role
  currentRole: "coach" | "assistant-coach" | "manager" | "umpire" | "selector";
  currentClubId: string;

  // Role History
  roleHistory: {
    role: string;
    clubId: string;
    clubName: string;
    ageGroup?: string;
    startDate: string;
    endDate?: string;
  }[];

  // Contact
  email: string;
  phone: string;

  // Qualifications
  qualifications: {
    type: string; // e.g., "Level 2 Coach", "Umpire Certification"
    issuer: string;
    issueDate: string;
    expiryDate?: string;
    documentUrl?: string;
  }[];

  // Availability
  availability?: {
    dayOfWeek: string;
    startTime: string;
    endTime: string;
  }[];

  isActive: boolean;
  createdAt: string;
}

// Nomination System
export interface Nomination {
  _id?: string;
  nominationId: string;
  playerId: string;
  playerName: string;
  clubId: string;
  clubName: string;
  ageGroup: string;
  season: string; // e.g., "2025"

  // Status
  status:
    | "pending"
    | "under-review"
    | "selected"
    | "shadow"
    | "rejected"
    | "withdrawn";

  // Dates
  submittedDate: string;
  reviewedDate?: string;
  decidedDate?: string;

  // Selection Notes
  notes?: string;
  reviewedBy?: string; // Selector ID

  // Player Info at time of nomination
  playerSnapshot: {
    position: string;
    stats?: any;
    clubHistory: any[];
  };
}

// Selection Meeting
export interface SelectionMeeting {
  _id?: string;
  meetingId: string;
  ageGroup: string;
  season: string;
  date: string;

  attendees: {
    selectorId: string;
    selectorName: string;
    present: boolean;
  }[];

  nominations: string[]; // Nomination IDs discussed
  decisions: {
    nominationId: string;
    playerId: string;
    playerName: string;
    decision: "selected" | "shadow" | "rejected";
    votes?: {
      selectorId: string;
      vote: "yes" | "no" | "abstain";
    }[];
    notes?: string;
  }[];

  notes?: string;
  createdAt: string;
}
