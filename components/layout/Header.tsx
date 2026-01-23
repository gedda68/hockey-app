// components/layout/Header.tsx
import Link from "next/link";
import ClubsNavWrapper from "./ClubsNavWrapper";
import SiteLogo from "./SiteLogo";
import TopNavbar from "./TopNavbar";

export default function Header() {
  return (
    <header className="bg-white border-b border-slate-200">
      <TopNavbar />
      {/* Clubs Navigation */}
      <nav>
        <ClubsNavWrapper />
      </nav>
    </header>
  );
}
