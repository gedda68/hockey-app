# Team Management System - Complete Specification

## 📋 **Core Requirements**

### **Team Basics**

- ✅ Each club can have multiple teams
- ✅ Teams belong to one club
- ✅ Teams have divisions/hierarchy (Div1, Div2, etc.)
- ✅ Teams have age categories (Junior/Senior/Masters)

### **Team Composition Rules**

**Eligible Roles:**

- ✅ Only roles with category "Participant" or "Official"
- ✅ Players, Goal Keepers, Coaches, Umpires, etc.

**Player Limits:**

- ✅ Maximum 18 players per team
- ✅ Maximum 2 Goal Keepers (included in the 18)
- ✅ Minimum 9 registered players required

**Leadership:**

- ✅ 1 Captain per team
- ✅ Up to 2 Vice Captains per team

### **Age Categories**

**Junior (18 and under):**

- U18, U16, U14, U12, etc.
- Hierarchy: U18 > U16 > U14 > U12

**Senior:**

- Open age
- Divisions: Div1, Div2, Div3, etc.
- Hierarchy: Div1 > Div2 > Div3

**Masters (35 and older):**

- Masters 1, Masters 2, Masters 3, etc.
- Hierarchy: Masters1 > Masters2 > Masters3

### **Registration Rules**

**Within Same Club:**

- ✅ Player can be in multiple teams
- ❌ Cannot be in same age category twice
- ✅ Can be in Junior + Senior
- ✅ Can be in Senior + Masters
- ❌ Cannot be in Div1 + Div2 (both Senior)

**Across Clubs:**

- ✅ Player can play for multiple clubs
- ❌ Cannot be in same age category across clubs
- ✅ Can be Div1 at Club A + Masters1 at Club B
- ❌ Cannot be Div1 at Club A + Div2 at Club B

### **Playing Up Rules**

**1 Division Up (Always Allowed):**

- Div2 → Div1 ✅
- U16 → U18 ✅
- Masters2 → Masters1 ✅

**2 Divisions Up (Only if no intermediate):**

- Div3 → Div1 (if no Div2) ✅
- Div4 → Div1 (if Div2 or Div3 exists) ❌
- U14 → U18 (if no U16) ✅

**Skip Rule:**

- Can skip 1 division if club doesn't have it
- Cannot skip 2 or more divisions

### **Team Management Features**

**Drag & Drop:**

- ✅ Drag players between teams
- ✅ Validation on drop
- ✅ Visual feedback (allowed/not allowed)
- ✅ Error messages for violations

**Captain/Vice Captain:**

- ✅ Assign captain
- ✅ Assign up to 2 vice captains
- ✅ Only from registered players
- ✅ Visual badges on player cards

---

## 🗄️ **Database Schema**

### **Teams Collection**

```typescript
interface Team {
  teamId: string; // "team-123"
  clubId: string; // Links to club
  name: string; // "Division 1", "U18 Girls"
  displayName: string; // "Commercial HC - Division 1"

  ageCategory: "junior" | "senior" | "masters";

  // Division/Grade within age category
  division: {
    name: string; // "Division 1", "U18", "Masters 1"
    level: number; // 1 = highest, 2 = second, etc.
    shortName: string; // "Div1", "U18", "M1"
  };

  // Team roster
  roster: {
    playerId: string; // Member ID
    roleId: string; // "role-player", "role-goalkeeper"
    roleCategory: string; // "Participant", "Official"
    position?: string; // "Forward", "Defense", "Goalkeeper"
    jerseyNumber?: number; // 1-99
    joinedDate: Date;
    status: "active" | "inactive" | "injured";
  }[];

  // Leadership
  captain?: string; // Member ID
  viceHoCaptains: string[]; // Up to 2 member IDs

  // Metadata
  season: string; // "2024", "2024-2025"
  competition?: string; // "Brisbane Hockey League"
  homeGround?: string;

  createdAt: Date;
  updatedAt: Date;
}
```

### **Member Registration Tracking**

```typescript
// Add to members collection
interface Member {
  // ... existing fields

  teamRegistrations: {
    teamId: string;
    clubId: string;
    ageCategory: "junior" | "senior" | "masters";
    divisionLevel: number;
    roleId: string;
    status: "active" | "inactive";
    season: string;
  }[];
}
```

---

## 🎯 **Validation Rules (Code)**

### **1. Team Size Validation**

```typescript
function validateTeamSize(roster: TeamRoster[]): ValidationResult {
  const players = roster.filter(
    (r) => r.roleCategory === "Participant" && r.roleId !== "role-goalkeeper"
  );

  const goalkeepers = roster.filter((r) => r.roleId === "role-goalkeeper");

  const totalPlayers = players.length + goalkeepers.length;

  if (totalPlayers > 18) {
    return { valid: false, error: "Maximum 18 players exceeded" };
  }

  if (goalkeepers.length > 2) {
    return { valid: false, error: "Maximum 2 goalkeepers allowed" };
  }

  if (totalPlayers < 9) {
    return { valid: false, error: "Minimum 9 players required" };
  }

  return { valid: true };
}
```

### **2. Age Category Validation**

```typescript
function validateAgeCategory(
  memberId: string,
  newTeam: Team,
  existingRegistrations: TeamRegistration[]
): ValidationResult {
  // Check within same club
  const sameClubSameCategory = existingRegistrations.filter(
    (reg) =>
      reg.clubId === newTeam.clubId &&
      reg.ageCategory === newTeam.ageCategory &&
      reg.status === "active"
  );

  if (sameClubSameCategory.length > 0) {
    return {
      valid: false,
      error: `Already registered in ${newTeam.ageCategory} team at this club`,
    };
  }

  // Check across clubs
  const otherClubSameCategory = existingRegistrations.filter(
    (reg) =>
      reg.clubId !== newTeam.clubId &&
      reg.ageCategory === newTeam.ageCategory &&
      reg.status === "active"
  );

  if (otherClubSameCategory.length > 0) {
    return {
      valid: false,
      error: `Already registered in ${newTeam.ageCategory} team at another club`,
    };
  }

  return { valid: true };
}
```

### **3. Playing Up Validation**

```typescript
function validatePlayingUp(
  playerDivision: number,
  playingInDivision: number,
  clubDivisions: number[]
): ValidationResult {
  const divisionGap = playerDivision - playingInDivision;

  // Playing same level or down - always OK for friendly
  if (divisionGap <= 0) {
    return { valid: true };
  }

  // Playing 1 up - always allowed
  if (divisionGap === 1) {
    return { valid: true };
  }

  // Playing 2 up - only if no intermediate division
  if (divisionGap === 2) {
    const hasIntermediate = clubDivisions.includes(playerDivision - 1);
    if (!hasIntermediate) {
      return { valid: true };
    } else {
      return {
        valid: false,
        error: "Cannot play 2 divisions up when intermediate division exists",
      };
    }
  }

  // Playing 3+ up - not allowed
  return {
    valid: false,
    error: "Cannot play more than 2 divisions up",
  };
}
```

### **4. Role Category Validation**

```typescript
function validateRoleCategory(roleId: string, roles: Role[]): ValidationResult {
  const role = roles.find((r) => r.id === roleId);

  if (!role) {
    return { valid: false, error: "Role not found" };
  }

  const allowedCategories = ["Participant", "Official"];

  if (!allowedCategories.includes(role.category)) {
    return {
      valid: false,
      error: `Only ${allowedCategories.join(" and ")} roles can be in teams`,
    };
  }

  return { valid: true };
}
```

### **5. Captain/Vice Captain Validation**

```typescript
function validateLeadership(
  captain: string | undefined,
  viceCaptains: string[],
  roster: TeamRoster[]
): ValidationResult {
  if (captain && !roster.some((r) => r.playerId === captain)) {
    return { valid: false, error: "Captain must be in team roster" };
  }

  if (viceCaptains.length > 2) {
    return { valid: false, error: "Maximum 2 vice captains allowed" };
  }

  for (const vc of viceCaptains) {
    if (!roster.some((r) => r.playerId === vc)) {
      return { valid: false, error: "Vice captain must be in team roster" };
    }
  }

  return { valid: true };
}
```

---

## 🎨 **UI Components Needed**

### **1. Team List Page**

- Display all teams for a club
- Filter by age category
- Sort by division level
- Create new team button

### **2. Team Detail Page**

- Team info (name, division, category)
- Player roster with drag-drop
- Captain/Vice captain badges
- Statistics (player count, goalkeepers)

### **3. Team Roster Manager**

- Available players list
- Current roster list
- Drag-drop between lists
- Validation feedback
- Position assignment
- Jersey number assignment

### **4. Player Selection Modal**

- Search members
- Filter by role
- Filter by eligibility
- Show existing registrations
- Warning indicators

### **5. Team Creation Form**

- Name input
- Age category select
- Division configuration
- Season input

---

## 📊 **Division Hierarchy Examples**

### **Senior Divisions**

```
Level 1: Division 1 (Highest)
Level 2: Division 2
Level 3: Division 3
Level 4: Division 4
```

### **Junior Divisions**

```
Level 1: U18 (Oldest/Highest)
Level 2: U16
Level 3: U14
Level 4: U12
Level 5: U10
```

### **Masters Divisions**

```
Level 1: Masters 1 (Highest skill)
Level 2: Masters 2
Level 3: Masters 3
```

---

## 🚀 **Implementation Plan**

### **Phase 1: Data Models**

1. Create Team interface
2. Update Member interface
3. Create validation types
4. Database indexes

### **Phase 2: API Routes**

1. GET /api/clubs/[clubId]/teams
2. POST /api/clubs/[clubId]/teams
3. GET /api/clubs/[clubId]/teams/[teamId]
4. PUT /api/clubs/[clubId]/teams/[teamId]
5. POST /api/clubs/[clubId]/teams/[teamId]/roster
6. DELETE /api/clubs/[clubId]/teams/[teamId]/roster/[memberId]

### **Phase 3: Validation Functions**

1. Team size validation
2. Age category validation
3. Playing up validation
4. Role category validation
5. Leadership validation

### **Phase 4: UI Components**

1. TeamsList component
2. TeamDetail component
3. RosterManager component
4. PlayerSelectionModal component
5. DragDropContext setup

### **Phase 5: Features**

1. Drag-drop roster management
2. Captain/Vice captain assignment
3. Jersey number assignment
4. Position assignment
5. Multi-team view

---

## 🎯 **Next Steps**

Would you like me to start building:

1. **Database schemas & types** - Team and registration models
2. **API routes** - CRUD operations for teams
3. **Validation functions** - All business rules
4. **UI components** - Team management interface
5. **Drag-drop system** - Roster management

Let me know which part to build first!
