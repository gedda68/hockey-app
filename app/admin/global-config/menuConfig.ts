// app/admin/global-config/menuConfig.ts
// Shared menu configuration for sidebar and dashboard.
//
// allowedRoles controls visibility:
//   undefined / absent  → visible to ALL admin-area roles
//   string[]            → visible only to those specific roles
//   (super-admin always sees everything regardless)
//
// The sidebar uses these to build the per-role navigation tree.

export interface MenuItem {
  label: string;
  href: string;
  icon: string;
  description?: string;
  badge?: string;
  color?: string;
  /** If present, only users whose primary OR scoped role is in this list can see the item. */
  allowedRoles?: string[];
  subItems?: MenuItem[];
}

// ── Shared role sets (keep in sync with middleware.ts) ────────────────────────

/** Every role that grants any admin-area access */
const ALL_ADMIN = [
  "super-admin",
  "association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar",
  "media-marketing",
  "club-admin", "club-committee", "coach", "manager", "registrar",
  "umpire", "technical-official", "volunteer", "team-selector",
];

/** Association-level roles (any tier: national / state / city / district) */
const ASSOC_ROLES = [
  "super-admin",
  "association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar",
  "media-marketing",
];

/** Roles that manage players */
const PLAYER_MGMT = [
  "super-admin",
  "association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar",
  "club-admin", "club-committee", "registrar", "coach", "manager", "team-selector",
];

/** Roles that work with teams */
const TEAM_ROLES = [
  "super-admin",
  "association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar",
  "club-admin", "coach", "manager", "team-selector",
];

/** Selection / nominations */
const SELECTION_ROLES = [
  "super-admin",
  "association-admin", "assoc-selector", "assoc-coach",
  "club-admin", "team-selector", "coach",
];

/** Roles that manage registrations / memberships */
const REGISTRATION_ROLES = [
  "super-admin",
  "association-admin", "assoc-registrar",
  "club-admin", "registrar",
];

/** Roles with access to financial / fee management */
const FINANCE_ROLES = [
  "super-admin",
  "association-admin", "assoc-committee", "assoc-registrar",
  "club-admin", "club-committee", "registrar",
];

/** Roles that can view reports */
const REPORTING_ROLES = [
  "super-admin",
  "association-admin", "assoc-committee",
  "club-admin", "club-committee", "registrar",
];

/** Roles with access to org settings */
const SETTINGS_ROLES = [
  "super-admin",
  "association-admin", "assoc-committee", "media-marketing",
  "club-admin", "club-committee",
];

/** Roles that can see club directory */
const CLUBS_ROLES = [
  "super-admin",
  "association-admin", "assoc-committee", "assoc-registrar",
];

/** Roles that can see staff management */
const STAFF_ROLES = [
  "super-admin",
  "association-admin", "assoc-committee", "assoc-coach",
  "club-admin", "club-committee",
];

/** Role-approval / expiry management */
const APPROVALS_ROLES = [
  "super-admin",
  "association-admin", "assoc-registrar",
  "club-admin", "registrar",
];

// ── Menu definition ───────────────────────────────────────────────────────────

export const menuConfig: MenuItem[] = [

  // ── Always visible to all admin-area users ───────────────────────────────────
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: "📊",
    description: "Overview and quick stats",
    color: "from-blue-500 to-blue-600",
    allowedRoles: ALL_ADMIN,
  },

  // ── Teams ────────────────────────────────────────────────────────────────────
  {
    label: "Teams",
    href: "/admin/teams",
    icon: "👥",
    description: "Manage teams",
    allowedRoles: TEAM_ROLES,
  },

  // ── Representative (association-level only) ──────────────────────────────────
  {
    label: "Representative",
    href: "/admin/representative",
    icon: "📋",
    description: "Manage divisions, representative teams, and rosters",
    color: "from-purple-500 to-purple-600",
    allowedRoles: ASSOC_ROLES,
    subItems: [
      {
        label: "All Divisions",
        href: "/admin/representative",
        icon: "👥",
        description: "View all age groups and rep teams",
        allowedRoles: ASSOC_ROLES,
      },
      {
        label: "Nominations",
        href: "/admin/nominations",
        icon: "✋",
        description: "Club player nominations by age group",
        allowedRoles: SELECTION_ROLES,
      },
      {
        label: "Nomination Windows",
        href: "/admin/nomination-windows",
        icon: "🗓️",
        description: "Manage nomination periods for rep teams and positions",
        allowedRoles: [
          "super-admin",
          "association-admin", "assoc-registrar", "assoc-selector",
          "club-admin", "registrar",
        ],
      },
      {
        label: "Ballots",
        href: "/admin/nomination-windows",
        icon: "🗳️",
        description: "View and vote in active ballots",
        allowedRoles: [
          "super-admin",
          "association-admin", "assoc-committee", "assoc-registrar", "assoc-selector",
          "club-admin", "club-committee", "registrar",
        ],
      },
      {
        label: "Tournaments",
        href: "/admin/tournaments",
        icon: "🏆",
        description: "Tournament and competition details",
        allowedRoles: ["super-admin", "association-admin", "assoc-committee", "assoc-registrar"],
      },
      {
        label: "Rep Fees",
        href: "/admin/fees",
        icon: "💵",
        description: "Representative nomination fees and payment tracking",
        allowedRoles: FINANCE_ROLES,
      },
    ],
  },

  // ── Players ──────────────────────────────────────────────────────────────────
  {
    label: "Players",
    href: "/admin/players",
    icon: "⭐",
    description: "Player management and nominations",
    color: "from-yellow-500 to-yellow-600",
    allowedRoles: PLAYER_MGMT,
    subItems: [
      {
        label: "Create Player",
        href: "/admin/players/new",
        icon: "👤",
        description: "Create a new player profile",
        allowedRoles: REGISTRATION_ROLES,
      },
      {
        label: "All Players",
        href: "/admin/players",
        icon: "👤",
        description: "Complete player database",
        allowedRoles: PLAYER_MGMT,
      },
      {
        label: "Nominations",
        href: "/admin/players/nominations",
        icon: "✋",
        badge: "5",
        description: "Pending nominations",
        allowedRoles: SELECTION_ROLES,
      },
      {
        label: "Club History",
        href: "/admin/players/history",
        icon: "📜",
        description: "Transfer history",
        allowedRoles: REGISTRATION_ROLES,
      },
      {
        label: "Statistics",
        href: "/admin/players/stats",
        icon: "📈",
        description: "Player statistics",
        allowedRoles: REPORTING_ROLES,
      },
    ],
  },

  // ── Staff ────────────────────────────────────────────────────────────────────
  {
    label: "Staff",
    href: "/admin/staff",
    icon: "🎓",
    description: "Coaches, managers, and officials",
    color: "from-green-500 to-green-600",
    allowedRoles: STAFF_ROLES,
    subItems: [
      {
        label: "All Staff",
        href: "/admin/staff",
        icon: "👥",
        description: "Complete staff list",
        allowedRoles: STAFF_ROLES,
      },
      {
        label: "Coaches",
        href: "/admin/staff/coaches",
        icon: "🏃",
        description: "Team coaches",
        allowedRoles: [...STAFF_ROLES, "coach"],
      },
      {
        label: "Managers",
        href: "/admin/staff/managers",
        icon: "📋",
        description: "Team managers",
        allowedRoles: [...STAFF_ROLES, "manager"],
      },
      {
        label: "Umpires",
        href: "/admin/staff/umpires",
        icon: "🎯",
        description: "Match officials",
        allowedRoles: [...STAFF_ROLES, "umpire"],
      },
      {
        label: "Qualifications",
        href: "/admin/staff/qualifications",
        icon: "🎓",
        description: "Certification tracking",
        allowedRoles: ["super-admin", "association-admin", "club-admin"],
      },
    ],
  },

  // ── Clubs (association-level + super-admin) ──────────────────────────────────
  {
    label: "Clubs",
    href: "/admin/clubs",
    icon: "🏢",
    description: "Club profiles and statistics",
    color: "from-indigo-500 to-indigo-600",
    allowedRoles: CLUBS_ROLES,
    subItems: [
      {
        label: "All Clubs",
        href: "/admin/clubs",
        icon: "🏢",
        description: "Club directory",
        allowedRoles: CLUBS_ROLES,
      },
      {
        label: "Club Profiles",
        href: "/admin/clubs/profiles",
        icon: "📋",
        description: "Detailed profiles",
        allowedRoles: CLUBS_ROLES,
      },
      {
        label: "Club Statistics",
        href: "/admin/clubs/stats",
        icon: "📊",
        description: "Performance metrics",
        allowedRoles: CLUBS_ROLES,
      },
    ],
  },

  // ── Associations (super-admin + association-admin only) ──────────────────────
  {
    label: "Associations",
    href: "/admin/associations",
    icon: "🏛️",
    description: "Association hierarchy and management",
    color: "from-teal-500 to-teal-600",
    allowedRoles: ["super-admin", "association-admin", "assoc-committee"],
    subItems: [
      {
        label: "All Associations",
        href: "/admin/associations",
        icon: "🏛️",
        description: "Association directory",
        allowedRoles: ["super-admin", "association-admin", "assoc-committee"],
      },
      {
        label: "Create Association",
        href: "/admin/associations/new",
        icon: "➕",
        description: "Add new association",
        allowedRoles: ["super-admin", "association-admin"],
      },
      {
        label: "Fee Configuration",
        href: "/admin/associations/fees",
        icon: "💰",
        description: "Manage association fees",
        allowedRoles: ["super-admin", "association-admin", "assoc-committee"],
      },
      {
        label: "Positions",
        href: "/admin/associations/positions",
        icon: "👔",
        description: "Association positions",
        allowedRoles: ["super-admin", "association-admin", "assoc-committee"],
      },
      {
        label: "Hierarchy View",
        href: "/admin/associations/hierarchy",
        icon: "🌳",
        description: "View full hierarchy",
        allowedRoles: ["super-admin", "association-admin", "assoc-committee"],
      },
    ],
  },

  // ── Members ──────────────────────────────────────────────────────────────────
  {
    label: "Members",
    href: "/admin/members",
    icon: "📝",
    description: "Manage club members and registrations",
    color: "from-cyan-500 to-cyan-600",
    allowedRoles: [
      "super-admin",
      "association-admin", "assoc-committee", "assoc-registrar",
      "club-admin", "club-committee", "registrar",
    ],
  },

  // ── My personal pages (all authenticated users in admin area) ────────────────
  {
    label: "My Registrations",
    href: "/admin/my-registrations",
    icon: "🎫",
    description: "View and submit your role registration requests",
    color: "from-amber-400 to-amber-500",
    // No allowedRoles — any logged-in user in the admin area can see this
  },
  {
    label: "My Fees & Payments",
    href: "/admin/my-fees",
    icon: "💳",
    description: "View outstanding and paid fees across all levels",
    color: "from-indigo-400 to-indigo-500",
    // No allowedRoles — any logged-in user in the admin area can see this
  },

  // ── Finance / fees ───────────────────────────────────────────────────────────
  {
    label: "Fees",
    href: "/admin/fees",   // overridden per-role in sidebar
    icon: "💵",
    description: "Fee management for your scope",
    color: "from-green-500 to-green-600",
    allowedRoles: FINANCE_ROLES,
  },
  {
    label: "Team Tournament Fees",
    href: "/admin/team-tournaments",
    icon: "🏆",
    description: "Manage team entries, cost breakdowns, and per-member allocations",
    color: "from-violet-500 to-violet-600",
    allowedRoles: [
      "super-admin",
      "association-admin", "assoc-registrar",
      "club-admin", "registrar",
    ],
  },

  // ── Role management ──────────────────────────────────────────────────────────
  {
    label: "Role Approvals",
    href: "/admin/role-requests",
    icon: "✅",
    description: "Approve or reject role assignment requests",
    color: "from-amber-500 to-amber-600",
    allowedRoles: APPROVALS_ROLES,
  },
  {
    label: "Role Expiry",
    href: "/admin/role-expiry",
    icon: "⏳",
    description: "Monitor expiring roles and run seasonal cleanup",
    color: "from-red-500 to-red-600",
    allowedRoles: [
      "super-admin",
      "association-admin",
      "club-admin", "registrar",
    ],
  },

  // ── Registration admin ───────────────────────────────────────────────────────
  {
    label: "Registration",
    href: "/admin/registrations",
    icon: "📝",
    description: "Player registrations and payments",
    color: "from-cyan-500 to-cyan-600",
    allowedRoles: REGISTRATION_ROLES,
    subItems: [
      {
        label: "All Registrations",
        href: "/admin/registrations",
        icon: "📝",
        description: "View all registrations",
        allowedRoles: REGISTRATION_ROLES,
      },
      {
        label: "Pending Approval",
        href: "/admin/registrations/pending",
        icon: "⏳",
        badge: "12",
        description: "Awaiting approval",
        allowedRoles: REGISTRATION_ROLES,
      },
      {
        label: "Payments",
        href: "/admin/registrations/payments",
        icon: "💳",
        description: "Payment tracking",
        allowedRoles: FINANCE_ROLES,
      },
      {
        label: "Season Management",
        href: "/admin/registrations/seasons",
        icon: "📅",
        description: "Manage seasons",
        allowedRoles: ["super-admin", "association-admin", "assoc-registrar", "club-admin"],
      },
    ],
  },

  // ── Selection ────────────────────────────────────────────────────────────────
  {
    label: "Selection",
    href: "/admin/selection",
    icon: "✅",
    description: "Selection meetings and voting",
    color: "from-red-500 to-red-600",
    allowedRoles: SELECTION_ROLES,
    subItems: [
      {
        label: "Meetings",
        href: "/admin/selection/meetings",
        icon: "📅",
        description: "Schedule and minutes",
        allowedRoles: SELECTION_ROLES,
      },
      {
        label: "Voting",
        href: "/admin/selection/voting",
        icon: "🗳️",
        description: "Selection voting",
        allowedRoles: SELECTION_ROLES,
      },
      {
        label: "Nominations",
        href: "/admin/selection/nominations",
        icon: "✋",
        description: "Player nominations",
        allowedRoles: SELECTION_ROLES,
      },
      {
        label: "History",
        href: "/admin/selection/history",
        icon: "📜",
        description: "Past selections",
        allowedRoles: SELECTION_ROLES,
      },
    ],
  },

  // ── Reports ──────────────────────────────────────────────────────────────────
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "📈",
    description: "Analytics and data export",
    color: "from-orange-500 to-orange-600",
    allowedRoles: REPORTING_ROLES,
    subItems: [
      {
        label: "Roster Reports",
        href: "/admin/reports/rosters",
        icon: "📋",
        description: "Team and division reports",
        allowedRoles: REPORTING_ROLES,
      },
      {
        label: "Player Reports",
        href: "/admin/reports/players",
        icon: "⭐",
        description: "Player statistics",
        allowedRoles: REPORTING_ROLES,
      },
      {
        label: "Registration Reports",
        href: "/admin/reports/registrations",
        icon: "📝",
        description: "Registration analytics",
        allowedRoles: REPORTING_ROLES,
      },
      {
        label: "Financial Reports",
        href: "/admin/reports/financial",
        icon: "💰",
        description: "Payment and fee reports",
        allowedRoles: FINANCE_ROLES,
      },
      {
        label: "Selection Reports",
        href: "/admin/reports/selection",
        icon: "✅",
        description: "Selection analytics",
        allowedRoles: SELECTION_ROLES,
      },
      {
        label: "Export Data",
        href: "/admin/reports/export",
        icon: "💾",
        description: "Data export tools",
        allowedRoles: REPORTING_ROLES,
      },
    ],
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  {
    label: "Settings",
    href: "/admin/settings",
    icon: "⚙️",
    description: "System configuration",
    color: "from-slate-500 to-slate-600",
    allowedRoles: SETTINGS_ROLES,
    subItems: [
      {
        label: "General",
        href: "/admin/settings",
        icon: "🔧",
        description: "General settings",
        allowedRoles: SETTINGS_ROLES,
      },
      {
        label: "Email Templates",
        href: "/admin/settings/email",
        icon: "📧",
        description: "Email configuration",
        allowedRoles: ["super-admin", "association-admin", "assoc-committee", "club-admin", "media-marketing"],
      },
      {
        label: "Notifications",
        href: "/admin/settings/notifications",
        icon: "🔔",
        description: "Notification preferences",
        allowedRoles: SETTINGS_ROLES,
      },
      {
        label: "Database",
        href: "/admin/settings/database",
        icon: "💾",
        description: "Database management",
        allowedRoles: ["super-admin"],
      },
    ],
  },

  // ── News / Media (media-marketing + admins) ──────────────────────────────────
  {
    label: "News & Media",
    href: "/admin/news",
    icon: "📰",
    description: "News articles, media, and announcements",
    color: "from-pink-500 to-rose-500",
    allowedRoles: [
      "super-admin",
      "association-admin", "assoc-committee", "media-marketing",
      "club-admin", "club-committee",
    ],
  },

  // ── Bulk Import ──────────────────────────────────────────────────────────────
  {
    label: "Bulk Import",
    href: "/admin/bulk-import",
    icon: "📥",
    description: "Bulk upload clubs, associations, members, users, teams and more",
    color: "from-emerald-500 to-emerald-600",
    allowedRoles: ["super-admin", "association-admin", "club-admin"],
    subItems: [
      { label: "Members",      href: "/admin/bulk-import?tab=members",      icon: "📝", description: "Upload members via CSV/Excel",      allowedRoles: ["super-admin", "association-admin", "club-admin"] },
      { label: "Players",      href: "/admin/bulk-import?tab=players",      icon: "⭐", description: "Upload players via CSV/Excel",       allowedRoles: ["super-admin", "association-admin", "club-admin"] },
      { label: "Users",        href: "/admin/bulk-import?tab=users",        icon: "👤", description: "Upload user accounts via CSV/Excel", allowedRoles: ["super-admin", "association-admin"] },
      { label: "Clubs",        href: "/admin/bulk-import?tab=clubs",        icon: "🏢", description: "Upload clubs via CSV/Excel",         allowedRoles: ["super-admin", "association-admin"] },
      { label: "Associations", href: "/admin/bulk-import?tab=associations", icon: "🏛️", description: "Upload associations via CSV/Excel",  allowedRoles: ["super-admin"] },
      { label: "Teams",        href: "/admin/bulk-import?tab=teams",        icon: "👥", description: "Upload club teams via CSV/Excel",    allowedRoles: ["super-admin", "association-admin", "club-admin"] },
      { label: "Rep Teams",    href: "/admin/bulk-import?tab=rep-teams",    icon: "🏆", description: "Upload representative teams",        allowedRoles: ["super-admin", "association-admin"] },
    ],
  },

  // ── Users (super-admin only) ─────────────────────────────────────────────────
  {
    label: "Users",
    href: "/admin/users",
    icon: "👥",
    description: "User accounts and permissions",
    color: "from-pink-500 to-pink-600",
    allowedRoles: ["super-admin"],
    subItems: [
      { label: "All Users",          href: "/admin/users",          icon: "👤", description: "User directory",         allowedRoles: ["super-admin"] },
      { label: "Roles & Permissions", href: "/admin/users/roles",   icon: "🔐", description: "Access control",        allowedRoles: ["super-admin"] },
      { label: "Activity Log",        href: "/admin/users/activity", icon: "📊", description: "User activity tracking", allowedRoles: ["super-admin"] },
    ],
  },

  // ── Global Config (super-admin only) ─────────────────────────────────────────
  {
    label: "Global Config",
    href: "/admin/config",
    icon: "🎛️",
    description: "System-wide configuration lists",
    color: "from-violet-500 to-violet-600",
    allowedRoles: ["super-admin"],
    subItems: [
      { label: "Gender Options",      href: "/admin/config/gender",           icon: "👤", description: "Manage gender types",              allowedRoles: ["super-admin"] },
      { label: "Relationship Types",  href: "/admin/config/relationship-type",icon: "❤️", description: "Manage relationship types",        allowedRoles: ["super-admin"] },
      { label: "Salutations",         href: "/admin/config/salutation",       icon: "🎩", description: "Manage name titles (Mr, Mrs, etc)", allowedRoles: ["super-admin"] },
      { label: "Fee Categories",      href: "/admin/config/fee-category",     icon: "💰", description: "Manage fee category types",         allowedRoles: ["super-admin"] },
      { label: "Role Types",          href: "/admin/config/role-type",        icon: "🏑", description: "Manage player positions",           allowedRoles: ["super-admin"] },
      { label: "Skill Levels",        href: "/admin/config/skill-level",      icon: "📊", description: "Manage skill level types",          allowedRoles: ["super-admin"] },
      { label: "Membership Types",    href: "/admin/config/membership-type",  icon: "🎫", description: "Manage membership categories",      allowedRoles: ["super-admin"] },
      { label: "Member Roles",        href: "/admin/config/member-roles",     icon: "🎫", description: "Manage membership roles",           allowedRoles: ["super-admin"] },
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get main items (no subItems) for use as dashboard tiles */
export function getDashboardTiles(): MenuItem[] {
  return menuConfig.filter((item) => !item.subItems && item.color);
}

/** Find a menu item by label */
export function findMenuItem(label: string): MenuItem | undefined {
  return menuConfig.find((m) => m.label === label);
}
