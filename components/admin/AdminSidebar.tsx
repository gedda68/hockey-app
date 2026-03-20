"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import SidebarItem from "../../app/admin/components/SidebarItem";
import { menuConfig, MenuItem } from "../../app/admin/global-config/menuConfig";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";

// Role → which top-level menu items to show
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

function filterMenuForRole(role: string): MenuItem[] {
  const allowed = ROLE_MENU_FILTER[role];
  if (!allowed || allowed.length === 0) return menuConfig; // super-admin sees all
  return menuConfig.filter((item) => allowed.includes(item.label));
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Representative"]);
  const [expandedSubMenus, setExpandedSubMenus] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);

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

  const visibleMenu = filterMenuForRole(user?.role || "");
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
          bg-[#06054e] text-white
          flex flex-col
          z-[950]
          transform transition-transform duration-300
          ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Header */}
        <div className="p-6 border-b border-white/10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black uppercase">Hockey Admin</h1>
            <p className="text-xs text-slate-300 mt-1">Management Portal</p>
          </div>
          <button
            className="md:hidden text-white/70"
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

        {/* Footer — real user info + logout */}
        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-400 text-[#06054e] rounded-full flex items-center justify-center font-black text-sm flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">{displayName}</div>
              <div className="text-xs text-slate-300 truncate">{displayRole}</div>
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
