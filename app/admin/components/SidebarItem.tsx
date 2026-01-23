import Link from "next/link";
import SidebarSubItem from "./SidebarSubItem";

export default function SidebarItem({
  item,
  pathname,
  expandedMenus,
  toggleMenu,
  expandedSubMenus,
  toggleSubMenu,
}) {
  const isActive = pathname.startsWith(item.href);
  const hasSubItems = item.subItems && item.subItems.length > 0;
  const expanded = expandedMenus.includes(item.label);

  return (
    <li>
      {/* If no subItems → make the whole row a Link */}
      {!hasSubItems ? (
        <Link
          href={item.href}
          className={`flex items-center justify-between px-6 py-3 cursor-pointer transition-colors ${
            isActive
              ? "bg-white/20 border-l-4 border-yellow-400"
              : "hover:bg-white/10"
          }`}
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xl">{item.icon}</span>
            <span className="font-bold text-sm">{item.label}</span>
          </div>
        </Link>
      ) : (
        /* If has subItems → clicking expands */
        <div
          className={`flex items-center justify-between px-6 py-3 cursor-pointer transition-colors ${
            isActive
              ? "bg-white/20 border-l-4 border-yellow-400"
              : "hover:bg-white/10"
          }`}
          onClick={() => toggleMenu(item.label)}
        >
          <div className="flex items-center gap-3 flex-1">
            <span className="text-xl">{item.icon}</span>
            <span className="font-bold text-sm">{item.label}</span>
          </div>
          <span className="text-sm ml-2">{expanded ? "▼" : "▶"}</span>
        </div>
      )}

      {/* Render subItems */}
      {hasSubItems && expanded && (
        <ul className="bg-white/5">
          {item.subItems.map((sub) => (
            <SidebarSubItem
              key={sub.label}
              item={sub}
              pathname={pathname}
              expandedSubMenus={expandedSubMenus}
              toggleSubMenu={toggleSubMenu}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
