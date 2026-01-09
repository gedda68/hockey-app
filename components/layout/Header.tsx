import Link from "next/link";
import Image from "next/image";

interface HeaderProps {
  activeAge?: string;
  lastUpdated?: string;
}

export default function Header() {
  return (
    <header className="flex flex-col w-full bg-[#06054e] text-white">
      {/* 2. Navigation Bar */}
      <nav className="navbar px-4 md:px-6 border-b border-white/10 h-16">
        <div className="flex-none">
          <Link
            href="/"
            className="btn btn-ghost hover:bg-white/10 h-10 px-2 normal-case flex items-center gap-2 transition-all"
          >
            <div className="relative w-7 h-7">
              <Image
                src="/icons/bha.png"
                alt="BHA Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            <span className="text-md font-bold tracking-tight hover:text-yellow-300">
              Brisbane Hockey
            </span>
          </Link>
        </div>

        <div className="flex-1"></div>

        <div className="flex-none">
          <ul className="menu menu-horizontal px-1 gap-1 text-xs font-bold uppercase tracking-wider">
            <li>
              <Link href="/play" className="hover:text-yellow-300">
                Play Hockey
              </Link>
            </li>
            <li>
              <Link href="/competitions" className="hover:text-yellow-300">
                Competitions
              </Link>
            </li>
            <li>
              <Link href="/officials" className="hover:text-yellow-300">
                Officials
              </Link>
            </li>
            <li>
              <Link href="/shop" className="hover:text-yellow-300">
                Shop
              </Link>
            </li>
            <li>
              <Link href="/representative" className="hover:text-yellow-300">
                Representative
              </Link>
            </li>
            <li>
              <Link href="/clubs" className="hover:text-yellow-300">
                Clubs
              </Link>
            </li>
            <li>
              <Link href="/about" className="hover:text-yellow-300">
                About
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-yellow-300">
                Contact
              </Link>
            </li>
          </ul>
        </div>
      </nav>

      {/* 3. Hero Brand Section (Your provided div) */}
      <div className="text-center py-3 px-4 bg-blue-200">
        <h1 className="text-3xl font-extrabold sm:text-4xl text-indigo-900 tracking-tighter uppercase">
          Brisbane Hockey Association
        </h1>
        <p className="mt-1 text-lg font-medium text-indigo-600">
          Hockey — A sport for life!
        </p>
      </div>
    </header>
  );
}
