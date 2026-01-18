import Link from "next/link";
import Image from "next/image";
import { getClubs } from "@/lib/data/clubs";
import ClubsNav from "./ClubsNav";

export default async function Header() {
  // Fetch clubs for navigation
  const clubs = await getClubs();

  return (
    <header className="sticky top-0 z-50 bg-white shadow-md">
      {/* Clubs Navigation Bar */}
      <ClubsNav clubs={clubs} />

      {/* Main Navigation */}
      <nav className="border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2">
              <div className="text-2xl font-black uppercase italic text-[#06054e]">
                BHL
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-black uppercase text-slate-700 hover:text-[#06054e] transition-colors"
              >
                Home
              </Link>
              <Link
                href="/competitions"
                className="text-sm font-black uppercase text-slate-700 hover:text-[#06054e] transition-colors"
              >
                Competitions
              </Link>
              <Link
                href="/clubs"
                className="text-sm font-black uppercase text-slate-700 hover:text-[#06054e] transition-colors"
              >
                Clubs
              </Link>
              <Link
                href="/officials"
                className="text-sm font-black uppercase text-slate-700 hover:text-[#06054e] transition-colors"
              >
                Officials
              </Link>
              <Link
                href="/about"
                className="text-sm font-black uppercase text-slate-700 hover:text-[#06054e] transition-colors"
              >
                About
              </Link>
            </div>

            {/* Right Side - Live Scores, Shop, Admin */}
            <div className="flex items-center gap-3">
              {/* Live Scores Link */}
              <a
                href="https://www.livehockey.com.au/en/content/brisbane-hockey-association"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all group"
                title="Live Scores"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:scale-110 transition-transform"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="hidden lg:inline text-xs font-black uppercase">
                  Live Scores
                </span>
              </a>

              {/* Shop Link */}
              <Link
                href="/shop"
                className="flex items-center gap-2 px-4 py-2 bg-[#06054e] text-white rounded-full hover:bg-[#0a0870] transition-all group"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:scale-110 transition-transform"
                >
                  <circle cx="9" cy="21" r="1" />
                  <circle cx="20" cy="21" r="1" />
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                </svg>
                <span className="hidden lg:inline text-xs font-black uppercase">
                  Shop
                </span>
              </Link>

              {/* Admin Login */}
              <Link
                href="/admin"
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-full hover:bg-slate-800 transition-all group"
                title="Admin Panel"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="group-hover:scale-110 transition-transform"
                >
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                <span className="hidden lg:inline text-xs font-black uppercase">
                  Admin
                </span>
              </Link>

              {/* Mobile Menu Button */}
              <button className="md:hidden p-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
