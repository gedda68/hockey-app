// components/layout/TopNavbar.tsx
"use client";

import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { toast } from "sonner";

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
  { name: "Clubs", href: "/clubs", icon: Shield },
  { name: "Officials", href: "/officials", icon: Users },
];

export default function TopNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [openSubMenu, setOpenSubMenu] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { isAuthenticated, logout } = useAuth();

  // Lock vertical scroll only when menu is open
  useEffect(() => {
    document.body.style.overflowY = isOpen ? "hidden" : "auto";
  }, [isOpen]);

  // Close menu/submenu on route change
  useEffect(() => {
    setIsOpen(false);
    setOpenSubMenu(null);
  }, [pathname]);

  // Scroll listener for shrinking effects
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Logged out successfully");
      router.push("/"); // Return to public home page
    } catch (error) {
      toast.error("Logout failed");
    }
  };

  return (
    <>
      {/* NAVBAR */}
      <nav className="sticky top-0 z-[200] w-full bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] transition-all duration-300 ease-out">
        <div className="flex items-center justify-between h-16 px-6 relative">
          {/* LEFT LOGO */}
          <Link href="/" aria-label="Home" className="flex items-center mt-18">
            <Image
              src="/icons/BHA.png"
              alt="Brisbane Hockey"
              width={scrolled ? 100 : 120}
              height={scrolled ? 20 : 32}
              className="transition-all duration-300 ease-out"
              priority
            />
          </Link>

          {/* RIGHT HAMBURGER / DESKTOP LINKS */}
          <div className="ml-auto flex items-center gap-4">
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
            <div className="hidden md:flex items-center gap-4 relative">
              {navItems.map((item) => {
                if (item.children) {
                  return (
                    <div key={item.name} className="relative group">
                      <button className="flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider text-white hover:text-yellow-200 hover:bg-white/10">
                        <item.icon className="h-5 w-5" />
                        {item.name}
                        <ChevronDown className="h-3 w-3 mt-1" />
                      </button>

                      {/* Dropdown menu */}
                      <div className="absolute left-0 top-full mt-1 w-48 bg-white rounded-md shadow-lg opacity-0 group-hover:opacity-100 invisible group-hover:visible transition-opacity duration-200 z-50">
                        {item.children.map((child) => (
                          <Link
                            key={child.name}
                            href={child.href}
                            className="block px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 hover:text-[#06054e]"
                          >
                            {child.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  );
                }

                // Regular desktop link with icon
                return (
                  <Link
                    key={item.name}
                    href={item.href!}
                    className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-bold uppercase tracking-wider
                      ${
                        pathname === item.href
                          ? "text-white bg-white/20"
                          : "text-white hover:text-yellow-200 hover:bg-white/10"
                      }`}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}

              {/* Admin Login / Logout Button */}
              {isAuthenticated ? (
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-[#06054e] rounded-md text-sm font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg"
                >
                  <LogOut className="h-5 w-5" />
                  Logout
                </button>
              ) : (
                <Link
                  href="/login"
                  className="flex items-center gap-2 px-4 py-2 bg-yellow-400 text-[#06054e] rounded-md text-sm font-bold uppercase tracking-wider hover:bg-yellow-300 transition-colors shadow-lg"
                >
                  <LogIn className="h-5 w-5" />
                  Admin Login
                </Link>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* BOTTOM TEXT */}
      <div className="w-full py-4 bg-gradient-to-r from-green-500 via-yellow-400 to-[#06054e] text-center">
        <h1 className="text-3xl md:text-4xl font-extrabold text-white uppercase tracking-wide">
          Brisbane Hockey Association
        </h1>
      </div>

      {/* MOBILE BACKDROP */}
      <div
        onClick={() => setIsOpen(false)}
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-[9000]
          transition-opacity duration-300
          ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />

      {/* MOBILE RIGHT DRAWER */}
      <aside
        className={`fixed inset-y-0 right-0 left-auto
          w-[280px] bg-[#06054e] z-[10000]
          shadow-2xl rounded-bl-3xl
          border-l border-b border-white/10
          transform transition-transform duration-300 ease-out
          ${isOpen ? "translate-x-0" : "translate-x-full"} md:hidden`}
      >
        <div className="flex flex-col py-6 px-2 mt-16">
          {navItems.map((item) => {
            const isSubOpen = openSubMenu === item.name;

            if (item.children) {
              return (
                <div key={item.name}>
                  <button
                    onClick={() => setOpenSubMenu(isSubOpen ? null : item.name)}
                    className="flex w-full items-center justify-between px-6 py-4 rounded-2xl
                      text-slate-300 hover:text-white hover:bg-white/10"
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

                  {/* SUBMENU */}
                  <div
                    className="overflow-hidden transition-all duration-300"
                    style={{
                      maxHeight: isSubOpen ? "300px" : "0px",
                    }}
                  >
                    <div className="ml-6 border-l border-white/20">
                      {item.children.map((child) => (
                        <Link
                          key={child.name}
                          href={child.href}
                          onClick={() => setIsOpen(false)}
                          className="block px-6 py-3 text-[10px] uppercase font-bold tracking-wider
                            text-slate-400 hover:text-white"
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
                href={item.href}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-4 px-6 py-4 rounded-2xl
                  text-slate-300 hover:text-white hover:bg-white/10"
              >
                <item.icon className="h-5 w-5 text-white" />
                <span className="uppercase text-[11px] font-bold tracking-widest">
                  {item.name}
                </span>
              </Link>
            );
          })}

          {/* Mobile Admin Login/Logout Button */}
          <div className="mt-4 px-2">
            {isAuthenticated ? (
              <button
                onClick={() => {
                  setIsOpen(false);
                  handleLogout();
                }}
                className="flex w-full items-center gap-4 px-6 py-4 rounded-2xl bg-yellow-400 text-[#06054e] hover:bg-yellow-300"
              >
                <LogOut className="h-5 w-5" />
                <span className="uppercase text-[11px] font-bold tracking-widest">
                  Logout
                </span>
              </button>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-4 px-6 py-4 rounded-2xl bg-yellow-400 text-[#06054e] hover:bg-yellow-300"
              >
                <LogIn className="h-5 w-5" />
                <span className="uppercase text-[11px] font-bold tracking-widest">
                  Admin Login
                </span>
              </Link>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
