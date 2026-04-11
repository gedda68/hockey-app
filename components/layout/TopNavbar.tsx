// components/layout/TopNavbar.tsx
"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Calendar,
  Shield,
  Users,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Phone,
  Play,
  ShieldUser,
  LogIn,
  ClipboardCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";
import { LinkButton } from "@/components/ui/LinkButton";
import ClubsDrawer from "@/components/ui/ClubsDrawer";

const navItems = [
  {
    name: "Competitions",
    icon: Calendar,
    children: [
      { name: "Competitions", href: "/competitions" },
      { name: "Fixtures", href: "/competitions/matches" },
      { name: "Ladder", href: "/competitions/standings" },
      { name: "Calendar", href: "/competitions/events" },
      { name: "Umpire Allocations", href: "/competitions/officials" },
      { name: "Statistics", href: "/competitions/statistics" },
    ],
  },
  { name: "Play Hockey", href: "/play", icon: Play },
  { name: "Representative", href: "/representative", icon: ShieldUser },
  { name: "Contact", href: "/contact", icon: Phone },
  { name: "Officials", href: "/officials", icon: Users },
];

interface TopNavbarProps {
  clubs: Array<{
    name: string;
    slug: string;
    icon?: string;
    iconSrc?: string;
    logo?: string;
    shortName?: string;
    colors?: {
      primary?: string;
    };
  }>;
}

export default function TopNavbar({ clubs }: TopNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null);
  const [clubsDrawerOpen, setClubsDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const isAuthenticated = !!user;
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Lock vertical scroll only when mobile menu is open
  useEffect(() => {
    document.body.style.overflowY = isOpen ? "hidden" : "auto";
  }, [isOpen]);

  // Close all menus on route change
  useEffect(() => {
    setIsOpen(false);
    setOpenSubMenu(null);
    setOpenDesktopMenu(null);
    setClubsDrawerOpen(false);
  }, [pathname]);

  // Close desktop dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpenDesktopMenu(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/");
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  const toggleDesktopMenu = (name: string) => {
    setOpenDesktopMenu(openDesktopMenu === name ? null : name);
  };

  return (
    <>
      {/* NAVBAR */}
      <div className="w-full">
        <nav className="w-full bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] transition-all duration-300 ease-out">
          <div className="relative px-6 pt-3 pb-16">
            {/* LEFT LOGO */}
            <div className="absolute left-6 top-1/2 -translate-y-1/2">
              <Link href="/" aria-label="Home" className="block">
                <Image
                  src="/icons/BHA-bg.png"
                  alt="Brisbane Hockey"
                  width={180}
                  height={90}
                  className="transition-all duration-300 ease-out object-contain max-h-[100px] w-auto"
                  priority
                />
              </Link>
            </div>

            {/* RIGHT - Desktop Links */}
            <div
              className="flex items-center justify-end gap-4 pl-[260px]"
              ref={dropdownRef}
            >
              {/* Mobile Hamburger */}
              <button
                onClick={() => setIsOpen((v) => !v)}
                className="p-2 rounded-lg hover:bg-white/20 md:hidden"
                aria-label="Toggle menu"
              >
                {isOpen ? (
                  <X className="h-7 w-7 text-white" />
                ) : (
                  <Menu className="h-7 w-7 text-white" />
                )}
              </button>

              {/* Desktop Links */}
              <div className="hidden md:flex items-center gap-1">
                {navItems.map((item) => {
                  if (item.children) {
                    const isDropdownOpen = openDesktopMenu === item.name;
                    return (
                      <div key={item.name} className="relative">
                        <button
                          onClick={() => toggleDesktopMenu(item.name)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors ${
                            isDropdownOpen
                              ? "text-yellow-300 bg-white/20"
                              : "text-white hover:text-yellow-200 hover:bg-white/10"
                          }`}
                        >
                          <item.icon className="h-4 w-4" />
                          {item.name}
                          <ChevronDown
                            className={`h-3 w-3 transition-transform duration-200 ${
                              isDropdownOpen ? "rotate-180" : ""
                            }`}
                          />
                        </button>

                        {/* Dropdown - React state controlled, high z-index */}
                        {isDropdownOpen && (
                          <div
                            className="absolute left-0 top-full mt-2 w-52 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden"
                            style={{ zIndex: 99000 }}
                          >
                            {item.children.map((child, idx) => (
                              <Link
                                key={child.name}
                                href={child.href}
                                onClick={() => setOpenDesktopMenu(null)}
                                className={`flex items-center px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-yellow-50 hover:text-[#06054e] transition-colors ${
                                  idx !== item.children!.length - 1
                                    ? "border-b border-slate-100"
                                    : ""
                                }`}
                              >
                                {child.name}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <Link
                      key={item.name}
                      href={item.href!}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors ${
                        pathname === item.href
                          ? "text-white bg-white/20"
                          : "text-white hover:text-yellow-200 hover:bg-white/10"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.name}
                    </Link>
                  );
                })}

                {/* Clubs Button */}
                <button
                  onClick={() => setClubsDrawerOpen(true)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider text-white hover:text-yellow-200 hover:bg-white/10 transition-colors"
                >
                  <Shield className="h-4 w-4" />
                  Clubs
                </button>

                {/* My umpiring / Logout */}
                {isAuthenticated ? (
                  <>
                    <Link
                      href="/my-umpiring"
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider transition-colors ml-1 ${
                        pathname === "/my-umpiring"
                          ? "text-white bg-white/20"
                          : "text-white hover:text-yellow-200 hover:bg-white/10"
                      }`}
                    >
                      <ClipboardCheck className="h-4 w-4" />
                      My umpiring
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-[#06054e] rounded-md text-sm font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg ml-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="max-w-[160px] truncate">
                        Logout — {user?.firstName} {user?.lastName}
                      </span>
                    </button>
                  </>
                ) : (
                  <LinkButton
                    href="/login"
                    bgColor="bg-yellow-400"
                    textColor="text-[#06054e]"
                    hoverBgColor="hover:bg-yellow-300"
                    hoverTextColor="hover:text-slate-800"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </LinkButton>
                )}
              </div>
            </div>

            {/* Title text at bottom */}
            <div className="mt-3 pt-1 pb-4">
              <h1 className="text-3xl md:text-4xl font-extrabold text-white uppercase tracking-wide text-center">
                Brisbane Hockey Association
              </h1>
            </div>
          </div>
        </nav>
      </div>

      {/* Clubs Drawer */}
      <ClubsDrawer
        open={clubsDrawerOpen}
        onClose={() => setClubsDrawerOpen(false)}
        clubs={clubs}
      />

      {/* MOBILE BACKDROP */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9000] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* MOBILE DRAWER */}
      <aside
        className={`fixed inset-y-0 right-0 left-auto w-[280px] bg-[#06054e] z-[10000] shadow-2xl rounded-bl-3xl border-l border-b border-white/10 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } md:hidden`}
      >
        <div className="flex flex-col py-6 px-2 mt-16">
          {navItems.map((item) => {
            const isSubOpen = openSubMenu === item.name;

            if (item.children) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setOpenSubMenu(isSubOpen ? null : item.name)}
                    className="flex w-full items-center justify-between px-6 py-4 rounded-2xl text-slate-300 hover:text-white hover:bg-white/10"
                  >
                    <div className="flex items-center gap-4">
                      <item.icon className="h-5 w-5 text-white" />
                      <span className="uppercase text-[11px] font-bold tracking-widest">
                        {item.name}
                      </span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${
                        isSubOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{ maxHeight: isSubOpen ? "300px" : "0px" }}
                  >
                    <div className="ml-6 border-l border-white/20">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          onClick={() => setIsOpen(false)}
                          className="block px-6 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-400 hover:text-white"
                        >
                          {child.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href!}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-300 hover:text-white hover:bg-white/10"
              >
                <item.icon className="h-5 w-5 text-white" />
                <span className="uppercase text-[11px] font-bold tracking-widest">
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* Mobile Clubs */}
          <button
            onClick={() => {
              setIsOpen(false);
              setClubsDrawerOpen(true);
            }}
            className="flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-300 hover:text-white hover:bg-white/10"
          >
            <Shield className="h-5 w-5 text-white" />
            <span className="uppercase text-[11px] font-bold tracking-widest">
              Clubs
            </span>
          </button>

          {/* Mobile My umpiring / Login / Logout */}
          <div className="mt-4 px-2 space-y-2">
            {isAuthenticated ? (
              <>
                <Link
                  href="/my-umpiring"
                  onClick={() => setIsOpen(false)}
                  className={`flex w-full items-center gap-4 px-6 py-4 rounded-2xl ${
                    pathname === "/my-umpiring"
                      ? "bg-white/20 text-white"
                      : "text-slate-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <ClipboardCheck className="h-5 w-5 shrink-0 text-white" />
                  <span className="uppercase text-[11px] font-bold tracking-widest">
                    My umpiring
                  </span>
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-4 px-6 py-4 rounded-2xl bg-yellow-400 text-[#06054e] hover:bg-yellow-300"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  <span className="uppercase text-[11px] font-bold tracking-widest truncate">
                    Logout — {user?.firstName} {user?.lastName}
                  </span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-yellow-400 text-[#06054e] hover:bg-yellow-300"
              >
                <LogIn className="h-5 w-5" />
                <span className="uppercase text-[11px] font-bold tracking-widest">
                  Login
                </span>
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
