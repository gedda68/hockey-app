// app/admin/types/clubChangeLog.ts
// Club change logging types

export interface ClubChange {
  id: string;
  clubId: string;
  clubName: string;
  changeType: "created" | "updated" | "deactivated" | "reactivated" | "deleted";
  timestamp: string;
  userId?: string;
  userName?: string;
  changes?: ClubChangeDetail[];
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  reason?: string;
  ipAddress?: string;
}

export interface ClubChangeDetail {
  field: string;
  oldValue: any;
  newValue: any;
  displayName?: string;
}

// Add to existing clubs.ts types:
export interface Club {
  id: string;
  name: string;
  shortName?: string;
  logo?: string;
  colors: ClubColors;
  address: ClubAddress;
  contact: ClubContact;
  committee: CommitteeMember[];
  established?: string;
  homeGround?: string;
  description?: string;
  active: boolean;
  deactivatedAt?: string; // NEW
  deactivatedBy?: string; // NEW
  deactivationReason?: string; // NEW
  playerCount?: number;
  teamCount?: number;
  createdAt?: string;
  updatedAt?: string;
  lastModifiedBy?: string; // NEW
}
