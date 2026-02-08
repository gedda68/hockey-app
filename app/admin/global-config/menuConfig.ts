// app/admin/global-config/menuConfig.ts
// Shared menu configuration for sidebar and dashboard
// Adding items here automatically updates both!

export interface MenuItem {
  label: string;
  href: string;
  icon: string;
  description?: string;
  badge?: string;
  color?: string; // For dashboard tile colors
  subItems?: MenuItem[];
}

export const menuConfig: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/admin/dashboard",
    icon: "📊",
    description: "Overview and quick stats",
    color: "from-blue-500 to-blue-600",
  },
  {
    label: "Representative",
    href: "/admin/representative",
    icon: "📋",
    description: "Manage divisions, teams, and rosters",
    color: "from-purple-500 to-purple-600",
    subItems: [
      {
        label: "All Divisions",
        href: "/admin/representative",
        icon: "👥",
        description: "View all age groups",
      },
      {
        label: "Nominations",
        href: "/admin/nominations",
        icon: "🏆",
        description: "Player Nominations",
      },
      {
        label: "Shadow Players",
        href: "/admin/shadow",
        icon: "🌟",
        description: "View shadow players",
      },
      {
        label: "Withdrawn",
        href: "/admin/withdrawn",
        icon: "🔥",
        description: "Withdrawn players",
      },
    ],
  },
  {
    label: "Players",
    href: "/admin/players",
    icon: "⭐",
    description: "Player management and nominations",
    color: "from-yellow-500 to-yellow-600",
    subItems: [
      {
        label: "All Players",
        href: "/admin/players",
        icon: "👤",
        description: "Complete player database",
      },
      {
        label: "Nominations",
        href: "/admin/players/nominations",
        icon: "✋",
        badge: "5",
        description: "Pending nominations",
      },
      {
        label: "Club History",
        href: "/admin/players/history",
        icon: "📜",
        description: "Transfer history",
      },
      {
        label: "Statistics",
        href: "/admin/players/stats",
        icon: "📈",
        description: "Player statistics",
      },
    ],
  },
  {
    label: "Staff",
    href: "/admin/staff",
    icon: "🎓",
    description: "Coaches, managers, and officials",
    color: "from-green-500 to-green-600",
    subItems: [
      {
        label: "All Staff",
        href: "/admin/staff",
        icon: "👥",
        description: "Complete staff list",
      },
      {
        label: "Coaches",
        href: "/admin/staff/coaches",
        icon: "🏃",
        description: "Team coaches",
      },
      {
        label: "Managers",
        href: "/admin/staff/managers",
        icon: "📋",
        description: "Team managers",
      },
      {
        label: "Umpires",
        href: "/admin/staff/umpires",
        icon: "🎯",
        description: "Match officials",
      },
      {
        label: "Qualifications",
        href: "/admin/staff/qualifications",
        icon: "🎓",
        description: "Certifications tracking",
      },
    ],
  },
  {
    label: "Clubs",
    href: "/admin/clubs",
    icon: "🏢",
    description: "Club profiles and statistics",
    color: "from-indigo-500 to-indigo-600",
    subItems: [
      {
        label: "All Clubs",
        href: "/admin/clubs",
        icon: "🏢",
        description: "Club directory",
      },
      {
        label: "Club Profiles",
        href: "/admin/clubs/profiles",
        icon: "📋",
        description: "Detailed profiles",
      },
      {
        label: "Club Statistics",
        href: "/admin/clubs/stats",
        icon: "📊",
        description: "Performance metrics",
      },
    ],
  },
  {
    label: "Associations",
    href: "/admin/associations",
    icon: "🏛️",
    description: "Association hierarchy and management",
    color: "from-teal-500 to-teal-600",
    subItems: [
      {
        label: "All Associations",
        href: "/admin/associations",
        icon: "🏛️",
        description: "Association directory",
      },
      {
        label: "Create Association",
        href: "/admin/associations/new",
        icon: "➕",
        description: "Add new association",
      },
      {
        label: "Fee Configuration",
        href: "/admin/associations/fees",
        icon: "💰",
        description: "Manage association fees",
      },
      {
        label: "Positions",
        href: "/admin/associations/positions",
        icon: "👔",
        description: "Association positions",
      },
      {
        label: "Hierarchy View",
        href: "/admin/associations/hierarchy",
        icon: "🌳",
        description: "View full hierarchy",
      },
    ],
  },
  {
    label: "Members",
    href: "/admin/members",
    icon: "📝",
    description: "Manage club members and registrations",
    color: "from-cyan-500 to-cyan-600",
  },
  {
    label: "Registration",
    href: "/admin/registrations",
    icon: "📝",
    description: "Player registrations and payments",
    color: "from-cyan-500 to-cyan-600",
    subItems: [
      {
        label: "All Registrations",
        href: "/admin/registrations",
        icon: "📝",
        description: "View all registrations",
      },
      {
        label: "Pending Approval",
        href: "/admin/registrations/pending",
        icon: "⏳",
        badge: "12",
        description: "Awaiting approval",
      },
      {
        label: "Payments",
        href: "/admin/registrations/payments",
        icon: "💳",
        description: "Payment tracking",
      },
      {
        label: "Season Management",
        href: "/admin/registrations/seasons",
        icon: "📅",
        description: "Manage seasons",
      },
    ],
  },
  {
    label: "Selection",
    href: "/admin/selection",
    icon: "✅",
    description: "Selection meetings and voting",
    color: "from-red-500 to-red-600",
    subItems: [
      {
        label: "Meetings",
        href: "/admin/selection/meetings",
        icon: "📅",
        description: "Schedule and minutes",
      },
      {
        label: "Voting",
        href: "/admin/selection/voting",
        icon: "🗳️",
        description: "Selection voting",
      },
      {
        label: "Nominations",
        href: "/admin/selection/nominations",
        icon: "✋",
        description: "Player nominations",
      },
      {
        label: "History",
        href: "/admin/selection/history",
        icon: "📜",
        description: "Past selections",
      },
    ],
  },
  {
    label: "Users",
    href: "/admin/users",
    icon: "👥",
    description: "User accounts and permissions",
    color: "from-pink-500 to-pink-600",
    subItems: [
      {
        label: "All Users",
        href: "/admin/users",
        icon: "👤",
        description: "User directory",
      },
      {
        label: "Roles & Permissions",
        href: "/admin/users/roles",
        icon: "🔐",
        description: "Access control",
      },
      {
        label: "Activity Log",
        href: "/admin/users/activity",
        icon: "📊",
        description: "User activity tracking",
      },
    ],
  },
  {
    label: "Reports",
    href: "/admin/reports",
    icon: "📈",
    description: "Analytics and data export",
    color: "from-orange-500 to-orange-600",
    subItems: [
      {
        label: "Roster Reports",
        href: "/admin/reports/rosters",
        icon: "📋",
        description: "Team and division reports",
      },
      {
        label: "Player Reports",
        href: "/admin/reports/players",
        icon: "⭐",
        description: "Player statistics",
      },
      {
        label: "Registration Reports",
        href: "/admin/reports/registrations",
        icon: "📝",
        description: "Registration analytics",
      },
      {
        label: "Financial Reports",
        href: "/admin/reports/financial",
        icon: "💰",
        description: "Payment and fee reports",
      },
      {
        label: "Selection Reports",
        href: "/admin/reports/selection",
        icon: "✅",
        description: "Selection analytics",
      },
      {
        label: "Export Data",
        href: "/admin/reports/export",
        icon: "💾",
        description: "Data export tools",
      },
    ],
  },

  {
    label: "Settings",
    href: "/admin/settings",
    icon: "⚙️",
    description: "System configuration",
    color: "from-slate-500 to-slate-600",
    subItems: [
      {
        label: "General",
        href: "/admin/settings",
        icon: "🔧",
        description: "General settings",
      },
      {
        label: "Email Templates",
        href: "/admin/settings/email",
        icon: "📧",
        description: "Email configuration",
      },
      {
        label: "Notifications",
        href: "/admin/settings/notifications",
        icon: "🔔",
        description: "Notification preferences",
      },
      {
        label: "Database",
        href: "/admin/settings/database",
        icon: "💾",
        description: "Database management",
      },
    ],
  },

  {
    label: "Global Config",
    href: "/admin/config",
    icon: "🎛️",
    description: "System-wide configuration lists",
    color: "from-violet-500 to-violet-600",
    subItems: [
      {
        label: "Gender Options",
        href: "/admin/config/gender",
        icon: "👤",
        description: "Manage gender types",
      },
      {
        label: "Relationship Types",
        href: "/admin/config/relationship-type",
        icon: "❤️",
        description: "Manage relationship types",
      },
      {
        label: "Salutations",
        href: "/admin/config/salutation",
        icon: "🎩",
        description: "Manage name titles (Mr, Mrs, etc)",
      },
      {
        label: "Fee Categories",
        href: "/admin/config/fee-category",
        icon: "💰",
        description: "Manage fee category types",
      },
      {
        label: "Role Types",
        href: "/admin/config/role-type",
        icon: "🏑",
        description: "Manage player positions",
      },
      {
        label: "Skill Levels",
        href: "/admin/config/skill-level",
        icon: "📊",
        description: "Manage skill level types",
      },
      {
        label: "Membership Types",
        href: "/admin/config/membership-type",
        icon: "🎫",
        description: "Manage membership categories",
      },
      {
        label: "Member Roles",
        href: "/admin/config/member-roles",
        icon: "🎫",
        description: "Manage membership roles",
      },
    ],
  },
];

// Helper function to get main menu items (for dashboard tiles)
export const getMainMenuItems = () => {
  return menuConfig.filter((item) => item.href !== "/admin/dashboard");
};

// Helper function to get all sub-items
export const getAllSubItems = () => {
  return menuConfig.flatMap((item) => item.subItems || []);
};

// Helper function to find item by href
export const findMenuItem = (href: string): MenuItem | undefined => {
  for (const item of menuConfig) {
    if (item.href === href) return item;
    if (item.subItems) {
      const subItem = item.subItems.find((sub) => sub.href === href);
      if (subItem) return subItem;
    }
  }
  return undefined;
};
