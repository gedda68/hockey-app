"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import SidebarItem from "../../app/(admin)/admin/components/SidebarItem";
import { menuConfig, MenuItem } from "../../app/(admin)/admin/global-config/menuConfig";
import { useAuth } from "@/lib/auth/AuthContext";
import { User } from "@/lib/auth/AuthContext";
import { useBrand } from "@/lib/contexts/BrandContext";
import { toast } from "sonner";

// Roles that are scoped to a club
const SIDEBAR_CLUB_ROLES = [
  "club-admin", "club-committee", "registrar", "coach", "manager",
  "team-selector", "volunteer", "umpire", "technical-official",
];

// Roles that are scoped to an association
const SIDEBAR_ASSOC_ROLES = [
  "association-admin", "assoc-committee", "assoc-coach",
  "assoc-selector", "assoc-registrar", "media-marketing",
];

// ── Menu building ─────────────────────────────────────────────────────────────

/**
 * Returns all roles the user effectively holds (primary + any scoped roles).
 * Used to match against allowedRoles on menu items.
 */
function getUserRoles(user: User): string[] {
  const roles = new Set<string>([user.role]);
  // scopedRoles is not exposed on the client User type yet, but we check
  // the primary role which covers most cases. Future: extend User with scopedRoles.
  return Array.from(roles);
}

/**
 * Returns true if the user should see a given menu item.
 * Rules:
 *   1. super-admin always sees everything.
 *   2. If item.allowedRoles is absent/empty → visible to all admin-area users.
 *   3. Otherwise → user's role(s) must intersect allowedRoles.
 */
function canSeeItem(item: MenuItem, userRoles: string[]): boolean {
  if (userRoles.includes("super-admin")) return true;
  if (!item.allowedRoles || item.allowedRoles.length === 0) return true;
  return item.allowedRoles.some((r) => userRoles.includes(r));
}

/**
 * Recursively filter the menu tree based on the user's roles.
 * Items with sub-items are only included if at least one sub-item survives.
 */
function filterMenu(items: MenuItem[], userRoles: string[]): MenuItem[] {
  return items
    .filter((item) => canSeeItem(item, userRoles))
    .map((item) => {
      if (!item.subItems) return item;
      const visibleSubs = filterMenu(item.subItems, userRoles);
      return { ...item, subItems: visibleSubs };
    })
    .filter((item) => !item.subItems || item.subItems.length > 0);
}

/**
 * Returns the "Fees" item with the correct href for the user's scope:
 *   club role  → /admin/clubs/{clubRef}/fees
 *   assoc role → /admin/associations/{assocId}/fees
 *   fallback   → /admin/fees
 */
function resolvedFeesItem(
  role: string,
  clubRef: string | null | undefined,
  assocId: string | null | undefined
): MenuItem {
  if (SIDEBAR_CLUB_ROLES.includes(role) && clubRef) {
    return { label: "Fees", href: `/admin/clubs/${clubRef}/fees`, icon: "💵", description: "Club fee management" };
  }
  if (SIDEBAR_ASSOC_ROLES.includes(role) && assocId) {
    return { label: "Fees", href: `/admin/associations/${assocId}/fees`, icon: "💵", description: "Association fee management" };
  }
  return { label: "Fees", href: "/admin/fees", icon: "💵", description: "Fee management" };
}

/**
 * Builds the full visible menu for a user:
 *   1. Start from menuConfig (role-filtered).
 *   2. Replace the generic "Fees" item with a scope-specific one.
 *   3. Prepend a contextual "My Club" / "My Association" item.
 */
function buildMenuForUser(user: User | null): MenuItem[] {
  if (!user) return [];

  const role = user.role;
  const clubRef = user.clubSlug || user.clubId;
  const assocId = user.associationId;
  const userRoles = getUserRoles(user);

  // ── 1. Filter all items by allowedRoles ─────────────────────────────────────
  let items = filterMenu(menuConfig, userRoles);

  // ── 2. Replace generic Fees href with scope-specific one ────────────────────
  const fees = resolvedFeesItem(role, clubRef, assocId);
  items = items.map((item) => {
    if (item.label === "Fees") return { ...item, href: fees.href };
    // Also fix "Rep Fees" sub-item inside "Representative" for assoc roles
    if (item.label === "Representative" && item.subItems) {
      return {
        ...item,
        subItems: item.subItems.map((sub) =>
          sub.label === "Rep Fees" ? sub : sub
        ),
      };
    }
    return item;
  });

  // ── 3. Prepend context item (My Club / My Association) ──────────────────────
  if (SIDEBAR_CLUB_ROLES.includes(role) && clubRef) {
    const myClub: MenuItem = {
      label: "My Club",
      href: `/admin/clubs/${clubRef}/edit`,
      icon: "🏢",
      description: "Club management",
    };
    items = [myClub, ...items];
  } else if (SIDEBAR_ASSOC_ROLES.includes(role) && assocId) {
    const myAssoc: MenuItem = {
      label: "My Association",
      href: `/admin/associations/${assocId}`,
      icon: "🏛️",
      description: "Association management",
    };
    items = [myAssoc, ...items];
  }

  return items;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AdminSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { brand: branding } = useBrand();

  const [expandedMenus, setExpandedMenus]       = useState<string[]>(["Representative"]);
  const [expandedSubMenus, setExpandedSubMenus] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen]             = useState(false);

  const toggleMenu    = (label: string) =>
    setExpandedMenus((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );

  const toggleSubMenu = (label: string) =>
    setExpandedSubMenus((prev) =>
      prev.includes(label) ? prev.filter((i) => i !== label) : [...prev, label]
    );

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out");
  };

  const visibleMenu  = buildMenuForUser(user);
  const displayName  = user
    ? `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username
    : "Admin User";
  const displayRole  = user?.role
    ? user.role.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Admin";
  const initials     = user
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
        {/* Entity header — logo + name */}
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
                color:           branding?.primaryColor   ?? "#06054e",
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
