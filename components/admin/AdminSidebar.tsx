"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import SidebarItem from "../../app/(admin)/admin/components/SidebarItem";
import { useAuth } from "@/lib/auth/AuthContext";
import { buildMenuForUser, groupMenuBySection } from "@/lib/admin/buildMenu";
import { useBrand } from "@/lib/contexts/BrandContext";
import AdminPersonaSwitcher from "@/components/admin/AdminPersonaSwitcher";

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
    await logout("home");
  };

  const visibleMenu  = groupMenuBySection(buildMenuForUser(user));
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
        <div className="md:hidden flex justify-end border-b border-white/10 px-2 py-2">
          <button
            type="button"
            className="text-white/80 hover:text-white rounded-lg px-3 py-1.5 text-sm font-bold"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        {/* Navigation — no section captions; extra top padding below the admin header */}
        <nav className="flex-1 overflow-y-auto pt-8 pb-4 md:pt-10">
          {visibleMenu.map((group) => (
            <div key={group.key} className="mb-5 last:mb-0">
              <ul className="space-y-1">
                {group.items.map((item) => (
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
            </div>
          ))}
        </nav>

        {/* Footer — persona switcher, user info + logout */}
        <div className="p-4 border-t border-white/10">
          <AdminPersonaSwitcher />
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
