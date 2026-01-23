import Link from "next/link";

export default function SidebarSubItem({
  item,
  pathname,
  expandedSubMenus,
  toggleSubMenu,
  level = 1,
}) {
  const isActive = pathname.startsWith(item.href);
  const hasNested = item.subItems && item.subItems.length > 0;
  const expanded = expandedSubMenus.includes(item.label);

  const paddingLeft = 16 + level * 16;

  return (
    <li>
      {!hasNested ? (
        <Link
          href={item.href}
          className={`flex items-center gap-3 py-2.5 transition-colors ${
            isActive
              ? "bg-white/20 border-l-4 border-yellow-400 text-yellow-400 font-bold"
              : "text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
          style={{ paddingLeft }}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </Link>
      ) : (
        <div
          className={`flex items-center gap-3 py-2.5 cursor-pointer transition-colors ${
            isActive
              ? "bg-white/20 border-l-4 border-yellow-400 text-yellow-400 font-bold"
              : "text-slate-300 hover:bg-white/10 hover:text-white"
          }`}
          style={{ paddingLeft }}
          onClick={() => toggleSubMenu(item.label)}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
          <span className="ml-auto text-xs">{expanded ? "▼" : "▶"}</span>
        </div>
      )}

      {hasNested && expanded && (
        <ul>
          {item.subItems.map((nested) => (
            <SidebarSubItem
              key={nested.label}
              item={nested}
              pathname={pathname}
              expandedSubMenus={expandedSubMenus}
              toggleSubMenu={toggleSubMenu}
              level={level + 1}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
