// components/layout/TopNavbar.tsx
"use client";

import { useState, useEffect, useRef, useId } from "react";
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
import { usePublicTenant } from "@/lib/contexts/PublicTenantContext";
import { toast } from "sonner";
import { LinkButton } from "@/components/ui/LinkButton";
import ClubsDrawer from "@/components/ui/ClubsDrawer";
import { useFocusTrap } from "@/lib/a11y/useFocusTrap";
import HomeResultsTicker, {
  type TickerLine,
} from "@/components/website/home/HomeResultsTicker";

const navItems = [
  {
    name: "Competitions",
    icon: Calendar,
    children: [
      { name: "Competitions", href: "/competitions" },
      { name: "Leagues", href: "/competitions/leagues" },
      { name: "Tournaments", href: "/tournaments" },
      { name: "Fixtures", href: "/competitions/matches" },
      { name: "Ladder", href: "/competitions/standings" },
      { name: "Calendar", href: "/competitions/events" },
      { name: "Umpire allocations", href: "/competitions/officials" },
      { name: "Statistics", href: "/competitions/statistics" },
      { name: "News", href: "/news" },
      { name: "Search", href: "/search" },
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
    portalHomeUrl: string;
    icon?: string;
    iconSrc?: string;
    logo?: string;
    shortName?: string;
    colors?: {
      primary?: string;
    };
  }>;
  tickerLines?: TickerLine[];
}

export default function TopNavbar({ clubs, tickerLines = [] }: TopNavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [openDesktopMenu, setOpenDesktopMenu] = useState<string | null>(null);
  const [clubsDrawerOpen, setClubsDrawerOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { tenant: portalTenant } = usePublicTenant();
  const isAuthenticated = !!user;
  const umpiringRoles = ["umpire", "technical-official"];
  const showMyUmpiring =
    !!user &&
    umpiringRoles.some((r) => {
      if (user.role === r) return true;
      return (user.scopedRoles ?? []).some((sr) => sr.role === r);
    });
  const dropdownRef = useRef<HTMLDivElement>(null);
  const mobileDrawerRef = useRef<HTMLElement>(null);
  const mobileNavTitleId = useId();

  useFocusTrap(mobileDrawerRef, isOpen, () => setIsOpen(false));

  // Lock vertical scroll when mobile menu or clubs drawer is open
  useEffect(() => {
    document.body.style.overflowY =
      isOpen || clubsDrawerOpen ? "hidden" : "auto";
    return () => {
      document.body.style.overflowY = "auto";
    };
  }, [isOpen, clubsDrawerOpen]);

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
      {/* NAVBAR — compact single row so fixed header + pt-20 does not overlap content */}
      <div className="w-full shadow-md">
        <nav
          className={
            portalTenant
              ? "w-full h-[var(--public-header-height)] flex flex-col transition-all duration-300 ease-out"
              : "w-full h-[var(--public-header-height)] flex flex-col bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] transition-all duration-300 ease-out"
          }
          style={
            portalTenant
              ? {
                  background: `linear-gradient(90deg, ${portalTenant.primaryColor} 0%, ${portalTenant.accentColor} 42%, ${portalTenant.secondaryColor} 100%)`,
                }
              : undefined
          }
        >
          <div className="flex-1 min-h-0 w-full max-w-[1600px] mx-auto pl-1.5 pr-3 sm:pl-2 sm:pr-4 flex items-center justify-between gap-2 sm:gap-3 min-h-[52px]">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 md:flex-initial">
              <Link
                href="/"
                aria-label="Home"
                className="flex shrink-0 items-center self-stretch py-0.5 -ml-0.5 sm:-ml-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-lg"
              >
                {portalTenant?.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- remote club/assoc logos
                  <img
                    src={portalTenant.logo}
                    alt={portalTenant.displayName}
                    className="h-12 w-auto max-h-[calc(var(--public-header-height)-3.25rem)] sm:h-14 md:h-[3.75rem] max-w-[min(320px,46vw)] object-contain object-left rounded-lg bg-white/10 px-1 sm:px-1.5 py-0.5"
                  />
                ) : (
                  <Image
                    src="/icons/BHA-bg.png"
                    alt="Brisbane Hockey Association"
                    width={160}
                    height={64}
                    className="object-contain object-left h-12 w-auto max-h-[calc(var(--public-header-height)-3.25rem)] sm:h-14 md:h-[3.75rem] max-w-[min(280px,46vw)]"
                    priority
                  />
                )}
              </Link>
              <span className="hidden sm:inline font-extrabold text-white text-[10px] sm:text-xs md:text-sm uppercase tracking-wide leading-tight min-w-0 flex-1 md:max-w-[14rem] lg:max-w-[20rem] truncate">
                {portalTenant?.displayName ?? "Brisbane Hockey Association"}
              </span>
            </div>

            <div
              className="flex flex-1 min-w-0 justify-end items-center gap-1 sm:gap-2"
              ref={dropdownRef}
            >
              {/* Mobile Hamburger */}
              <button
                type="button"
                onClick={() => setIsOpen((v) => !v)}
                className="p-2 rounded-lg hover:bg-white/20 md:hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                aria-expanded={isOpen}
                aria-controls="public-mobile-nav"
                aria-label={isOpen ? "Close menu" : "Open menu"}
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
                    {showMyUmpiring && (
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
                    )}
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
          </div>

          <div className="shrink-0 px-3 sm:px-4 pb-2">
            <HomeResultsTicker lines={tickerLines} />
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
        aria-hidden={!isOpen}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9000] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      />

      {/* MOBILE DRAWER */}
      <aside
        id="public-mobile-nav"
        ref={mobileDrawerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={mobileNavTitleId}
        inert={!isOpen}
        className={`fixed inset-y-0 right-0 left-auto w-[280px] bg-[#06054e] z-[10000] shadow-2xl rounded-bl-3xl border-l border-b border-white/10 transform transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } md:hidden outline-none`}
      >
        <h2 id={mobileNavTitleId} className="sr-only">
          Site navigation
        </h2>
        <div className="flex flex-col py-6 px-2 pt-20">
          {navItems.map((item) => {
            const isSubOpen = openSubMenu === item.name;

            if (item.children) {
              return (
                <div key={item.name}>
                  <button
                    type="button"
                    onClick={() => setOpenSubMenu(isSubOpen ? null : item.name)}
                    className="flex w-full items-center justify-between px-6 py-4 rounded-2xl text-slate-200 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
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
                          className="block px-6 py-3 text-[10px] uppercase font-bold tracking-wider text-slate-200 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 rounded-md"
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
                className="flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-200 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
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
            type="button"
            onClick={() => {
              setIsOpen(false);
              setClubsDrawerOpen(true);
            }}
            className="flex items-center gap-4 px-6 py-4 rounded-2xl text-slate-200 hover:text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
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
                {showMyUmpiring && (
                  <Link
                    href="/my-umpiring"
                    onClick={() => setIsOpen(false)}
                    className={`flex w-full items-center gap-4 px-6 py-4 rounded-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80 ${
                      pathname === "/my-umpiring"
                        ? "bg-white/20 text-white"
                        : "text-slate-200 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    <ClipboardCheck className="h-5 w-5 shrink-0 text-white" />
                    <span className="uppercase text-[11px] font-bold tracking-widest">
                      My umpiring
                    </span>
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    handleLogout();
                  }}
                  className="flex w-full items-center gap-4 px-6 py-4 rounded-2xl bg-yellow-400 text-[#06054e] hover:bg-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#06054e]"
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
                className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-yellow-400 text-[#06054e] hover:bg-yellow-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#06054e]"
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
