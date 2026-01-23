"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import SidebarItem from "./SidebarItem";
import { menuConfig } from "../config/menuConfig";

export default function AdminSidebar() {
  const pathname = usePathname();

  const [expandedMenus, setExpandedMenus] = useState<string[]>(["Rosters"]);
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
            {menuConfig.map((item) => (
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

        {/* Footer */}
        <div className="p-6 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center font-black">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate">Admin User</div>
              <div className="text-xs text-slate-300">Super Admin</div>
            </div>
          </div>
          <button className="mt-3 w-full px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full text-xs font-black uppercase transition-colors">
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}
