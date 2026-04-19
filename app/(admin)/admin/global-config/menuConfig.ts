// app/admin/global-config/menuConfig.ts
// Shared menu configuration for sidebar and dashboard.
//
// allowedRoles controls visibility:
//   undefined / absent  → visible to ALL admin-area roles
//   string[]            → visible only to those specific roles
//   (super-admin always sees everything regardless)
//
// Rule: only add hrefs for pages that actually exist under app/admin/.
// Planned-but-not-built items are commented out until pages are created.

export interface MenuItem {
  label: string;
  href: string;
  icon: string;
  description?: string;
  badge?: string;
  color?: string;
  /**
   * Sidebar grouping key (top-level items only). Render order follows MENU_SECTION_ORDER
   * in AdminSidebar.
   */
  section?: string;
  /** If present, only users whose primary OR scoped role is in this list can see the item. */
  allowedRoles?: string[];
  subItems?: MenuItem[];
}

// ── Shared role sets (keep in sync with lib/auth/adminRouteAccess.ts + middleware) ─

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

/** View/edit team selection policy at the right tier (sidebar rewrites primary link). */
const SELECTION_POLICY_ROLES = [
  "super-admin",
  "association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar",
  "assoc-competition",
  "media-marketing",
  "club-admin", "club-committee", "registrar", "coach", "manager", "team-selector",
];

/** Role-approval / expiry management */
const APPROVALS_ROLES = [
  "super-admin",
  "association-admin", "assoc-registrar",
  "club-admin", "registrar",
];

// ── Menu definition ───────────────────────────────────────────────────────────

export const menuConfig: MenuItem[] = [

  // ── Dashboard ────────────────────────────────────────────────────────────────
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: "📊",
    description: "Overview and quick stats",
    color: "from-blue-500 to-blue-600",
    section: "overview",
    allowedRoles: ALL_ADMIN,
  },

  // ── Teams ────────────────────────────────────────────────────────────────────
  {
    label: "Teams",
    href: "/admin/teams",
    icon: "👥",
    description: "Manage teams and rosters",
    color: "from-sky-500 to-sky-600",
    section: "competition",
    allowedRoles: TEAM_ROLES,
  },
  {
    label: "Team selection policy",
    href: "/admin/associations/selection-policy",
    icon: "📜",
    description:
      "National, state, metro, and club rules for roster movement, visibility, and approvals",
    color: "from-indigo-500 to-violet-600",
    section: "competition",
    allowedRoles: SELECTION_POLICY_ROLES,
  },
  {
    label: "League setup",
    href: "/admin/associations",
    icon: "🛠️",
    description:
      "Create club leagues: competition, season, ladder rules, round-robin draw, and fixtures",
    color: "from-emerald-500 to-teal-600",
    section: "competition",
    allowedRoles: [
      "super-admin",
      "association-admin",
      "assoc-committee",
      "assoc-registrar",
      "assoc-competition",
      "media-marketing",
    ],
  },

  // ── Representative (association-level only) ──────────────────────────────────
  {
    label: "Representative",
    href: "/admin/representative",
    icon: "📋",
    description: "Manage divisions, representative teams, and rosters",
    color: "from-purple-500 to-purple-600",
    section: "competition",
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
        href: "/admin/ballots",
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
        label: "Competition awards",
        href: "/admin/competition-awards",
        icon: "🎖️",
        description:
          "Player of the match, season and tournament honours, labels, and history",
        allowedRoles: [
          "super-admin",
          "association-admin",
          "assoc-committee",
          "assoc-registrar",
          "assoc-competition",
          "assoc-selector",
          "assoc-coach",
        ],
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
    section: "competition",
    allowedRoles: PLAYER_MGMT,
    subItems: [
      {
        label: "All Players",
        href: "/admin/players",
        icon: "👥",
        description: "Complete player database",
        allowedRoles: PLAYER_MGMT,
      },
      {
        label: "Add Player",
        href: "/admin/players/new",
        icon: "👤",
        description: "Create a new player profile",
        allowedRoles: REGISTRATION_ROLES,
      },
      {
        label: "Rep Nominations",
        href: "/admin/nominations",
        icon: "✋",
        description: "Rep team nominations and selections",
        allowedRoles: SELECTION_ROLES,
      },
      // Future: /admin/players/history, /admin/players/stats
    ],
  },

  // ── Members ──────────────────────────────────────────────────────────────────
  {
    label: "Members",
    href: "/admin/members",
    icon: "📝",
    description: "Manage club members and registrations",
    color: "from-cyan-500 to-cyan-600",
    section: "directory",
    allowedRoles: [
      "super-admin",
      "association-admin", "assoc-committee", "assoc-registrar",
      "club-admin", "club-committee", "registrar",
    ],
    subItems: [
      {
        label: "All Members",
        href: "/admin/members",
        icon: "📝",
        description: "Member directory",
        allowedRoles: [
          "super-admin",
          "association-admin", "assoc-committee", "assoc-registrar",
          "club-admin", "club-committee", "registrar",
        ],
      },
      {
        label: "Add Member",
        href: "/admin/members/create",
        icon: "➕",
        description: "Register a new member",
        allowedRoles: REGISTRATION_ROLES,
      },
    ],
  },

  // ── Associations ─────────────────────────────────────────────────────────────
  {
    label: "Associations",
    href: "/admin/associations",
    icon: "🏛️",
    description: "Association hierarchy and management",
    color: "from-teal-500 to-teal-600",
    section: "directory",
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
        label: "Add Association",
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
        description: "Association governance positions",
        allowedRoles: ["super-admin", "association-admin", "assoc-committee"],
      },
      {
        label: "Hierarchy",
        href: "/admin/associations/hierarchy",
        icon: "🌳",
        description: "View full association hierarchy",
        allowedRoles: ["super-admin", "association-admin", "assoc-committee"],
      },
      {
        label: "Association selection policy",
        href: "/admin/associations/selection-policy",
        icon: "📜",
        description: "Movement, portal visibility, and roster governance by tier",
        allowedRoles: SELECTION_POLICY_ROLES,
      },
    ],
  },

  // ── Clubs ────────────────────────────────────────────────────────────────────
  {
    label: "Clubs",
    href: "/admin/clubs",
    icon: "🏢",
    description: "Club profiles and management",
    color: "from-indigo-500 to-indigo-600",
    section: "directory",
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
        label: "Add Club",
        href: "/admin/clubs/new",
        icon: "➕",
        description: "Register a new club",
        allowedRoles: ["super-admin", "association-admin"],
      },
      {
        label: "Club selection policy",
        href: "/admin/clubs/selection-policy",
        icon: "📜",
        description: "Club-level overrides on parent association rules",
        allowedRoles: SELECTION_POLICY_ROLES,
      },
      // Future: /admin/clubs/profiles, /admin/clubs/stats
    ],
  },

  // ── Finance / Fees ───────────────────────────────────────────────────────────
  {
    label: "Fees",
    href: "/admin/fees",
    icon: "💵",
    description: "Fee management for your scope",
    color: "from-green-500 to-green-600",
    section: "finance",
    allowedRoles: FINANCE_ROLES,
  },
  {
    label: "Team Tournament Fees",
    href: "/admin/team-tournaments",
    icon: "🏆",
    description: "Manage team entries, cost breakdowns, and per-member allocations",
    color: "from-violet-500 to-violet-600",
    section: "finance",
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
    section: "governance",
    allowedRoles: APPROVALS_ROLES,
  },
  {
    label: "Role Expiry",
    href: "/admin/role-expiry",
    icon: "⏳",
    description: "Monitor expiring roles and run seasonal cleanup",
    color: "from-red-500 to-red-600",
    section: "governance",
    allowedRoles: [
      "super-admin",
      "association-admin",
      "club-admin", "registrar",
    ],
  },

  // ── News / Media ─────────────────────────────────────────────────────────────
  {
    label: "News & Media",
    href: "/admin/news",
    icon: "📰",
    description: "News articles, media, and announcements",
    color: "from-pink-500 to-rose-500",
    section: "content",
    allowedRoles: [
      "super-admin",
      "association-admin", "assoc-committee", "media-marketing",
      "club-admin", "club-committee",
    ],
  },
  {
    label: "Home page gallery",
    href: "/admin/settings/home-gallery",
    icon: "🖼️",
    description: "Photos for the public home page carousel",
    color: "from-violet-500 to-indigo-600",
    section: "content",
    allowedRoles: SETTINGS_ROLES,
  },

  // ── Reports & Analytics ──────────────────────────────────────────────────────
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "📈",
    description: "Member counts, gender/age breakdowns, historic trends and more",
    color: "from-teal-500 to-teal-600",
    section: "reporting",
    allowedRoles: REPORTING_ROLES,
    subItems: [
      { label: "Member Analytics",  href: "/admin/reports",                   icon: "👥", description: "Total members, players, roles by gender & age group", allowedRoles: REPORTING_ROLES },
      { label: "By Association",    href: "/admin/reports?scope=association",  icon: "🏛️", description: "Member breakdown per association",                   allowedRoles: ["super-admin","association-admin","assoc-committee"] },
      { label: "By Club",           href: "/admin/reports?scope=club",         icon: "🏢", description: "Member breakdown per club",                          allowedRoles: REPORTING_ROLES },
      { label: "Historic Trends",   href: "/admin/reports?view=historic",      icon: "📉", description: "Year-on-year growth and membership trends",           allowedRoles: REPORTING_ROLES },
    ],
  },

  // ── Bulk Import ──────────────────────────────────────────────────────────────
  {
    label: "Bulk Import",
    href: "/admin/bulk-import",
    icon: "📥",
    description: "Bulk upload clubs, associations, members, users, teams and more",
    color: "from-emerald-500 to-emerald-600",
    section: "reporting",
    allowedRoles: [
      "super-admin",
      "association-admin",
      "club-admin",
      "assoc-committee",
      "assoc-coach",
      "assoc-selector",
      "assoc-registrar",
      "assoc-competition",
      "media-marketing",
      "club-committee",
      "registrar",
      "team-selector",
    ],
    subItems: [
      { label: "Members",      href: "/admin/bulk-import?tab=members",      icon: "📝", description: "Upload members via CSV/Excel",       allowedRoles: ["super-admin", "association-admin", "club-admin", "assoc-registrar"] },
      { label: "Players",      href: "/admin/bulk-import?tab=players",      icon: "⭐", description: "Upload players via CSV/Excel",        allowedRoles: ["super-admin", "association-admin", "club-admin", "assoc-registrar"] },
      { label: "Users",        href: "/admin/bulk-import?tab=users",        icon: "👤", description: "Upload user accounts via CSV/Excel",  allowedRoles: ["super-admin", "association-admin", "assoc-committee"] },
      { label: "Clubs",        href: "/admin/bulk-import?tab=clubs",        icon: "🏢", description: "Upload clubs via CSV/Excel",          allowedRoles: ["super-admin", "association-admin"] },
      { label: "Associations", href: "/admin/bulk-import?tab=associations", icon: "🏛️", description: "Upload associations via CSV/Excel",   allowedRoles: ["super-admin"] },
      { label: "Teams",        href: "/admin/bulk-import?tab=teams",        icon: "👥", description: "Upload club teams via CSV/Excel",     allowedRoles: ["super-admin", "association-admin", "club-admin"] },
      { label: "Rep Teams",    href: "/admin/bulk-import?tab=rep-teams",    icon: "🏆", description: "Upload representative teams",         allowedRoles: ["super-admin", "association-admin", "assoc-selector"] },
      { label: "Assoc. regs",  href: "/admin/bulk-import?tab=association-registrations", icon: "📇", description: "Association registrations CSV", allowedRoles: ["super-admin", "association-admin", "assoc-registrar"] },
      { label: "Club regs",    href: "/admin/bulk-import?tab=club-registrations", icon: "📋", description: "Club registrations CSV", allowedRoles: ["super-admin", "association-admin", "club-admin", "assoc-registrar", "registrar"] },
      { label: "League venues", href: "/admin/bulk-import?tab=league-venues", icon: "🏟️", description: "Season competition venues", allowedRoles: ["super-admin", "association-admin", "assoc-competition"] },
      { label: "Tournaments",  href: "/admin/bulk-import?tab=tournaments", icon: "🎖️", description: "Tournament definitions", allowedRoles: ["super-admin", "association-admin", "assoc-competition"] },
      { label: "Tourn. fixtures", href: "/admin/bulk-import?tab=tournament-fixtures", icon: "📅", description: "Tournament draw rows", allowedRoles: ["super-admin", "association-admin", "assoc-competition"] },
      { label: "Tourn. results", href: "/admin/bulk-import?tab=tournament-results", icon: "🏑", description: "Tournament scores", allowedRoles: ["super-admin", "association-admin", "assoc-competition"] },
      { label: "League results", href: "/admin/bulk-import?tab=league-fixture-results", icon: "📊", description: "League fixture scores", allowedRoles: ["super-admin", "association-admin", "assoc-competition"] },
      { label: "Awards",       href: "/admin/bulk-import?tab=competition-awards", icon: "🌟", description: "League / tournament awards", allowedRoles: ["super-admin", "association-admin", "assoc-competition"] },
      { label: "Nominations",  href: "/admin/bulk-import?tab=nominations", icon: "🗳️", description: "Rep nomination rows", allowedRoles: ["super-admin", "association-admin", "assoc-selector", "team-selector"] },
      { label: "Fees JSON",    href: "/admin/bulk-import?tab=fees", icon: "💳", description: "Replace fees config JSON", allowedRoles: ["super-admin", "association-admin", "club-admin", "assoc-committee", "club-committee"] },
      { label: "Tourn. fees",  href: "/admin/bulk-import?tab=tournament-fees", icon: "🧾", description: "Team tournament fee lines", allowedRoles: ["super-admin", "association-admin", "assoc-registrar", "assoc-competition"] },
      { label: "News",         href: "/admin/bulk-import?tab=news", icon: "📰", description: "Tenant news posts", allowedRoles: ["super-admin", "association-admin", "club-admin"] },
    ],
  },

  // ── My personal pages (all authenticated users) ──────────────────────────────
  {
    label: "My Registrations",
    href: "/admin/my-registrations",
    icon: "🎫",
    description: "View and submit your role registration requests",
    color: "from-amber-400 to-amber-500",
    section: "personal",
  },
  {
    label: "My Nominations",
    href: "/nomination-status",
    icon: "🏆",
    description: "View your nomination status for teams and positions",
    color: "from-yellow-400 to-yellow-500",
    section: "personal",
  },
  {
    label: "My Fees & Payments",
    href: "/admin/my-fees",
    icon: "💳",
    description: "View outstanding and paid fees across all levels",
    color: "from-indigo-400 to-indigo-500",
    section: "personal",
  },

  // ── Users (super-admin only) ─────────────────────────────────────────────────
  {
    label: "Users",
    href: "/admin/users",
    icon: "👥",
    description: "Admin user accounts and permissions",
    color: "from-pink-500 to-pink-600",
    section: "platform",
    allowedRoles: ["super-admin"],
    // Sub-items (users/roles, users/activity) to be built
  },

  // ── Settings ─────────────────────────────────────────────────────────────────
  {
    label: "Settings",
    href: "/admin/settings/fee-categories",
    icon: "⚙️",
    description: "System configuration",
    color: "from-slate-500 to-slate-600",
    section: "platform",
    allowedRoles: SETTINGS_ROLES,
    subItems: [
      {
        label: "Fee Categories",
        href: "/admin/settings/fee-categories",
        icon: "💰",
        description: "Manage fee category types",
        allowedRoles: SETTINGS_ROLES,
      },
      {
        label: "Committee Positions",
        href: "/admin/settings/committee-positions",
        icon: "👔",
        description: "Define committee role positions",
        allowedRoles: ["super-admin", "association-admin", "assoc-committee"],
      },
      {
        label: "Gender Options",
        href: "/admin/settings/gender",
        icon: "👤",
        description: "Manage gender classification options",
        allowedRoles: ["super-admin"],
      },
      // Future: email templates, notifications, database
    ],
  },

  // ── Global Config (super-admin only) ─────────────────────────────────────────
  {
    label: "Global Config",
    href: "/admin/config/gender",
    icon: "🎛️",
    description: "System-wide configuration lists",
    color: "from-violet-500 to-violet-600",
    section: "platform",
    allowedRoles: ["super-admin"],
    subItems: [
      { label: "Gender Options",     href: "/admin/config/gender",           icon: "👤", description: "Manage gender types",              allowedRoles: ["super-admin"] },
      { label: "Relationship Types", href: "/admin/config/relationship-type",icon: "❤️", description: "Manage relationship types",        allowedRoles: ["super-admin"] },
      { label: "Salutations",        href: "/admin/config/salutation",       icon: "🎩", description: "Manage name titles (Mr, Mrs, etc)", allowedRoles: ["super-admin"] },
      { label: "Membership Types",   href: "/admin/config/membership-type",  icon: "🎫", description: "Manage membership categories",      allowedRoles: ["super-admin"] },
      { label: "Member Roles",       href: "/admin/config/member-roles",     icon: "🏑", description: "Manage member role types",          allowedRoles: ["super-admin"] },
      // Future: fee-categories, role-types, skill-levels
    ],
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Get main items (no subItems) for use as dashboard tiles */
export function getDashboardTiles(): MenuItem[] {
  return menuConfig.filter((item) => !item.subItems && item.color);
}

/** Get all top-level items — alias used by dashboard */
export function getMainMenuItems(): MenuItem[] {
  return menuConfig;
}

/** Find a menu item by label */
export function findMenuItem(label: string): MenuItem | undefined {
  return menuConfig.find((m) => m.label === label);
}

/**
 * Filter menu items visible to a given role (and optionally a set of scoped roles).
 * super-admin always sees everything.
 */
export function filterMenuForRole(role: string, scopedRoles: string[] = []): MenuItem[] {
  const allRoles = new Set([role, ...scopedRoles]);
  if (allRoles.has("super-admin")) return menuConfig;

  return menuConfig
    .filter((item) => {
      if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
      return item.allowedRoles.some((r) => allRoles.has(r));
    })
    .map((item) => {
      if (!item.subItems) return item;
      const visibleSubs = item.subItems.filter((sub) => {
        if (!sub.allowedRoles || sub.allowedRoles.length === 0) return true;
        return sub.allowedRoles.some((r) => allRoles.has(r));
      });
      return { ...item, subItems: visibleSubs };
    })
    .filter((item) => !item.subItems || item.subItems.length > 0);
}
