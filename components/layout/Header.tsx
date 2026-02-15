// components/layout/Header.tsx
// Fixed header - never moves, content scrolls behind it

import TopNavbarWrapper from "./TopNavbarWrapper";

export default function Header() {
  return (
    <header className="sticky top-0 left-0 right-0 z-[1000]">
      <TopNavbarWrapper />
    </header>
  );
}
