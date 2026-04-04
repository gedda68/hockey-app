"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import SidebarItem from "../../app/admin/components/SidebarItem";
import { menuConfig, MenuItem } from "../../app/admin/global-config/menuConfig";
import { useAuth } from "@/lib/auth/AuthContext";
import { User } from "@/lib/auth/AuthContext";
import { toast } from "sonner";

interface SidebarBranding {
  primaryColor: string;
  secondaryColor: string;
  name: string;
  shortName?: string;
  logo?: string;
}

const SIDEBAR_CLUB_ROLES = [
  "club-admin", "club-committee", "registrar", "coach", "manager",
  "team-selector", "volunteer", "umpire",
];

const SIDEBAR_ASSOC_ROLES = [
  "association-admin", "assoc-committee", "assoc-coach",
  "assoc-selector", "assoc-registrar",
];

// Role → which top-level menu labels to show (fallback when no club/assoc context)
const ROLE_MENU_FILTER: Record<string, string[]> = {
  "super-admin": [], // empty = show all
  "association-admin": [
    "Dashboard", "Representative", "Players", "Clubs", "Associations",
    "Members", "Nominations", "Teams", "Tournaments", "Fees", "Reports", "Settings",
  ],
  "assoc-committee": ["Dashboard", "Representative", "Players", "Reports"],
  "assoc-coach":     ["Dashboard", "Representative", "Players", "Teams"],
  "assoc-selector":  ["Dashboard", "Representative", "Players", "Nominations"],
  "assoc-registrar": ["Dashboard", "Members", "Players", "Fees"],
  "club-admin": [
    "Dashboard", "Players", "Teams", "Members", "Nominations", "Fees", "Reports",
  ],
  "club-committee": ["Dashboard", "Members", "Players", "Reports"],
  "registrar":      ["Dashboard", "Members", "Players", "Fees"],
  "coach":          ["Dashboard", "Players", "Teams", "Nominations"],
  "manager":        ["Dashboard", "Players", "Teams"],
  "team-selector":  ["Dashboard", "Players", "Nominations"],
  "umpire":         ["Dashboard"],
  "volunteer":      ["Dashboard"],
};

/** Helper: get a menuConfig item by label, or undefined. */
function mc(label: string): MenuItem | undefined {
  return menuConfig.find((m) => m.label === label);
}

/** Returns the fees menu item with the correct href based on role/entity. */
function getFeesItem(
  role: string,
  clubRef: string | null | undefined,
  assocId: string | null | undefined
): MenuItem {
  if (
    ["club-admin", "club-committee", "registrar", "coach", "manager", "team-selector", "volunteer", "umpire"].includes(role) &&
    clubRef
  ) {
    return {
      label: "Fees",
      href: `/admin/clubs/${clubRef}/fees`,
      icon: "💵",
      description: "Fee management",
    };
  }

  if (
    ["association-admin", "assoc-committee", "assoc-coach", "assoc-selector", "assoc-registrar"].includes(role) &&
    assocId
  ) {
    return {
      label: "Fees",
      href: `/admin/associations/${assocId}/fees`,
      icon: "💵",
      description: "Fee management",
    };
  }

  return {
    label: "Fees",
    href: "/admin/fees",
    icon: "💵",
    description: "Fee management",
  };
}

const nominationsItem: MenuItem = {
  label: "Nominations",
  href: "/admin/nominations",
  icon: "✋",
  description: "Player nominations",
};

const myRegistrationsItem: MenuItem = {
  label: "My Registrations",
  href: "/admin/my-registrations",
  icon: "🎫",
  description: "Your role registration requests",
};

function buildMenuForUser(user: User | null): MenuItem[] {
  if (!user) return menuConfig;

  const role = user.role;

  // ── Super-admin: full menu ──────────────────────────────────────────────────
  if (role === "super-admin") return menuConfig;

  // ── Club-scoped roles ───────────────────────────────────────────────────────
  const clubRef = user.clubSlug || user.clubId;
  const clubScopedRoles = [
    "club-admin",
    "club-committee",
    "registrar",
    "coach",
    "manager",
    "team-selector",
    "volunteer",
    "umpire",
  ];

  if (clubScopedRoles.includes(role) && clubRef) {
    const myClub: MenuItem = {
      label: "My Club",
      href: `/admin/clubs/${clubRef}/edit`,
      icon: "🏢",
      description: "Club Management",
    };

    const feesItem = getFeesItem(role, clubRef, user.associationId);

    if (role === "club-admin") {
      return [
        myClub,
        mc("Players")!,
        mc("Teams")!,
        mc("Members")!,
        mc("Role Approvals")!,
        feesItem,
        nominationsItem,
        mc("Reports")!,
        myRegistrationsItem,
      ].filter((item): item is MenuItem => item !== undefined);
    }

    if (role === "club-committee") {
      return [myClub, mc("Members")!, mc("Players")!, mc("Reports")!, myRegistrationsItem].filter(
        (item): item is MenuItem => item !== undefined,
      );
    }

    if (role === "registrar") {
      return [myClub, mc("Members")!, mc("Role Approvals")!, mc("Players")!, feesItem, myRegistrationsItem].filter(
        (item): item is MenuItem => item !== undefined,
      );
    }

    if (role === "coach") {
      return [myClub, mc("Players")!, mc("Teams")!, nominationsItem, myRegistrationsItem].filter(
        (item): item is MenuItem => item !== undefined,
      );
    }

    if (role === "manager") {
      return [myClub, mc("Players")!, mc("Teams")!, myRegistrationsItem].filter(
        (item): item is MenuItem => item !== undefined,
      );
    }

    if (role === "team-selector") {
      return [myClub, mc("Players")!, nominationsItem, myRegistrationsItem].filter(
        (item): item is MenuItem => item !== undefined,
      );
    }

    if (role === "volunteer") {
      return [myClub, myRegistrationsItem];
    }

    if (role === "umpire") {
      return [
        {
          label: "Dashboard",
          href: "/admin/representative",
          icon: "📊",
          description: "Overview and quick stats",
        },
        myRegistrationsItem,
      ];
    }
  }

  // ── Umpire without clubRef ──────────────────────────────────────────────────
  if (role === "umpire") {
    return [
      {
        label: "Dashboard",
        href: "/admin/representative",
        icon: "📊",
        description: "Overview and quick stats",
      },
      myRegistrationsItem,
    ];
  }

  // ── Association-scoped roles ────────────────────────────────────────────────
  const assocScopedRoles = [
    "association-admin",
    "assoc-committee",
    "assoc-coach",
    "assoc-selector",
    "assoc-registrar",
  ];

  if (assocScopedRoles.includes(role) && user.associationId) {
    const assocId = user.associationId;
    const myAssoc: MenuItem = {
      label: "My Association",
      href: `/admin/associations/${assocId}`,
      icon: "🏛️",
      description: "Association Management",
    };

    const feesItem = getFeesItem(role, clubRef, assocId);

    if (role === "association-admin") {
      return [
        myAssoc,
        mc("Representative")!,
        mc("Players")!,
        mc("Clubs")!,
        mc("Members")!,
        mc("Role Approvals")!,
        mc("Teams")!,
        mc("Tournaments")!,
        feesItem,
        mc("Reports")!,
        mc("Settings")!,
        myRegistrationsItem,
      ].filter((item): item is MenuItem => item !== undefined);
    }

    if (role === "assoc-committee") {
      return [myAssoc, mc("Representative")!, mc("Players")!, mc("Reports")!, myRegistrationsItem].filter(
        (item): item is MenuItem => item !== undefined,
      );
    }

    if (role === "assoc-coach") {
      return [myAssoc, mc("Representative")!, mc("Players")!, mc("Teams")!, myRegistrationsItem].filter(
        (item): item is MenuItem => item !== undefined,
      );
    }

    if (role === "assoc-selector") {
      return [myAssoc, mc("Representative")!, mc("Players")!, myRegistrationsItem].filter(
        (item): item is MenuItem => item !== undefined,
      );
    }

    if (role === "assoc-registrar") {
      return [myAssoc, mc("Members")!, mc("Role Approvals")!, mc("Players")!, feesItem, myRegistrationsItem].filter(
        (item): item is MenuItem => item !== undefined,
      );
    }
  }

  // ── Fallback: filter menuConfig by ROLE_MENU_FILTER ────────────────────────
  const allowed = ROLE_MENU_FILTER[role];
  if (!allowed || allowed.length === 0) return menuConfig;
  return menuConfig.filter((item) => allowed.includes(item.label));
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Representative"]);
  const [expandedSubMenus, setExpandedSubMenus] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [branding, setBranding] = useState<SidebarBranding | null>(null);

  useEffect(() => {
    if (!user) return;

    if (SIDEBAR_CLUB_ROLES.includes(user.role) && (user.clubSlug || user.clubId)) {
      const clubRef = user.clubSlug || user.clubId;
      fetch(`/api/admin/clubs/${clubRef}`)
        .then((r) => r.json())
        .then((data) => {
          const club = data.club;
          if (club) {
            setBranding({
              primaryColor: club.colors?.primaryColor || "#06054e",
              secondaryColor: club.colors?.secondaryColor || "#1a1870",
              name: club.name,
              shortName: club.shortName,
              logo: club.logo,
            });
          }
        })
        .catch(() => {});
    } else if (SIDEBAR_ASSOC_ROLES.includes(user.role) && user.associationId) {
      fetch(`/api/admin/associations/${user.associationId}`)
        .then((r) => r.json())
        .then((data) => {
          const assoc = data.association || data;
          if (assoc?.name || assoc?.fullName) {
            setBranding({
              primaryColor: assoc.branding?.primaryColor || "#06054e",
              secondaryColor: assoc.branding?.secondaryColor || "#1a1870",
              name: assoc.name || assoc.fullName,
              shortName: assoc.code || assoc.acronym,
              logo: assoc.branding?.logo,
            });
          }
        })
        .catch(() => {});
    }
  }, [user?.clubId, user?.clubSlug, user?.associationId, user?.role]);

  const toggleMenu = (label: string) => {
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const toggleSubMenu = (label: string) => {
    setExpandedSubMenus((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
  };

  const visibleMenu = buildMenuForUser(user);
  const displayName = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
    : "Admin User";
  const displayRole = user?.role
    ? user.role.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Admin";
  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase() || "AU"
    : "AU";

  return (
    <>
      {/* Mobile Toggle */}
      <button
        className="md:hidden fixed top-4 left-4 z-[1000] bg-white/20 text-white px-3 py-2 rounded-lg"
        onClick={() => setMobileOpen(true)}
      >
        ☰
      </button>

      {/* Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[900] md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static
          top-0 left-0
          w-64 min-h-screen
          text-white
          flex flex-col
          z-[950]
          transform transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{ backgroundColor: branding?.primaryColor ?? "#06054e" }}
      >
        {/* Sidebar entity header — logo + name */}
        <div
          className="p-4 border-b border-white/10 flex items-center justify-between gap-3"
          style={{ backgroundColor: branding ? `${branding.primaryColor}cc` : "transparent" }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {branding?.logo ? (
              <img
                src={branding.logo}
                alt={branding.shortName || branding.name}
                className="h-9 w-9 object-contain rounded-lg bg-white/10 p-1 flex-shrink-0"
              />
            ) : (
              <div className="h-9 w-9 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0 text-xl">
                🏑
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-sm font-black uppercase leading-tight truncate">
                {branding?.name ?? "Hockey Admin"}
              </h1>
              <p className="text-xs text-white/60 mt-0.5">Management Portal</p>
            </div>
          </div>
          <button
            className="md:hidden text-white/70 flex-shrink-0"
            onClick={() => setMobileOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1">
            {visibleMenu.map((item) => (
              <SidebarItem
                key={item.label}
                item={item}
                pathname={pathname}
                expandedMenus={expandedMenus}
                toggleMenu={toggleMenu}
                expandedSubMenus={expandedSubMenus}
                toggleSubMenu={toggleSubMenu}
              />
            ))}
          </ul>
        </nav>

        {/* Footer — user info + logout */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0"
              style={{
                backgroundColor: branding?.secondaryColor ?? "#FFD700",
                color: branding?.primaryColor ?? "#06054e",
              }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{displayName}</div>
              <div className="text-xs text-white/60 truncate">{displayRole}</div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="mt-3 w-full flex items-center justify-center gap-2 px-4 py-2 bg-white/10 hover:bg-red-600 rounded-full text-xs font-black uppercase transition-colors"
          >
            <LogOut size={13} />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
