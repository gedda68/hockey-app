# 🗺️ routes.ts - Complete Guide

## 📄 Full Code

```typescript
/**
 * Application Routes
 *
 * Centralized route definitions for type-safe navigation.
 * Update here when routes change to avoid broken links.
 */

export const ROUTES = {
  // Main pages
  HOME: "/",
  ABOUT: "/about",
  CONTACT: "/contact",

  // Clubs
  CLUBS: "/clubs",
  CLUB_DETAIL: (slug: string) => `/clubs/${slug}`,
  CLUB_CONTACT: (slug: string) => `/clubs/${slug}/contact`,

  // Competitions
  COMPETITIONS: "/competitions",
  EVENTS: "/competitions/events",
  FIXTURES: "/competitions/fixtures",
  MATCHES: "/competitions/matches",
  STANDINGS: "/competitions/standings",
  STATISTICS: "/competitions/statistics",

  // Other
  OFFICIALS: "/officials",
  PLAY: "/play",
  REPRESENTATIVE: "/representative",
  SHOP: "/shop",
} as const;

// Navigation groups for header/footer
export const NAV_GROUPS = {
  PRIMARY: [
    { label: "About", href: ROUTES.ABOUT },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
    { label: "Clubs", href: ROUTES.CLUBS },
    { label: "Play", href: ROUTES.PLAY },
  ],

  COMPETITIONS: [
    { label: "Matches", href: ROUTES.MATCHES },
    { label: "Standings", href: ROUTES.STANDINGS },
    { label: "Statistics", href: ROUTES.STATISTICS },
    { label: "Events", href: ROUTES.EVENTS },
    { label: "Fixtures", href: ROUTES.FIXTURES },
  ],

  SECONDARY: [
    { label: "Officials", href: ROUTES.OFFICIALS },
    { label: "Representative", href: ROUTES.REPRESENTATIVE },
    { label: "Shop", href: ROUTES.SHOP },
    { label: "Contact", href: ROUTES.CONTACT },
  ],
} as const;

// Breadcrumb configurations
export const BREADCRUMBS = {
  [ROUTES.COMPETITIONS]: [
    { label: "Home", href: ROUTES.HOME },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
  ],
  [ROUTES.MATCHES]: [
    { label: "Home", href: ROUTES.HOME },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
    { label: "Matches", href: ROUTES.MATCHES },
  ],
  [ROUTES.STANDINGS]: [
    { label: "Home", href: ROUTES.HOME },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
    { label: "Standings", href: ROUTES.STANDINGS },
  ],
  [ROUTES.STATISTICS]: [
    { label: "Home", href: ROUTES.HOME },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
    { label: "Statistics", href: ROUTES.STATISTICS },
  ],
} as const;

// Page metadata
export const PAGE_METADATA = {
  [ROUTES.HOME]: {
    title: "Brisbane Hockey League",
    description: "Official website of the Brisbane Hockey League",
  },
  [ROUTES.MATCHES]: {
    title: "Match Results & Fixtures",
    description: "View match results and upcoming fixtures",
  },
  [ROUTES.STANDINGS]: {
    title: "League Standings",
    description: "Current standings for all divisions",
  },
  [ROUTES.STATISTICS]: {
    title: "Player & Team Statistics",
    description: "Comprehensive statistics for players and teams",
  },
} as const;

export type RouteKey = keyof typeof ROUTES;
```

---

## 📁 File Location

Save as:

```
lib/constants/routes.ts
```

---

## 🎯 Why Use Centralized Routes?

### **Problem: Hardcoded URLs Everywhere**

```tsx
// ❌ Bad - Scattered throughout app
<Link href="/competitions/matches">Matches</Link>
<Link href="/competitions/matches">View Matches</Link>
<Link href="/competitions/matche">Go to Matches</Link>  // Typo!
```

### **Solution: One Source of Truth**

```tsx
// ✅ Good - Centralized
import { ROUTES } from '@/lib/constants';

<Link href={ROUTES.MATCHES}>Matches</Link>
<Link href={ROUTES.MATCHES}>View Matches</Link>
<Link href={ROUTES.MATCHES}>Go to Matches</Link>
```

**Benefits:**

- ✅ Type-safe (TypeScript catches typos)
- ✅ Easy to refactor (change once, updates everywhere)
- ✅ Autocomplete in IDE
- ✅ No broken links

---

## 💡 Usage Examples

### **1. Basic Routes**

```tsx
import { ROUTES } from '@/lib/constants';
import Link from 'next/link';

// Simple links
<Link href={ROUTES.HOME}>Home</Link>
<Link href={ROUTES.ABOUT}>About</Link>
<Link href={ROUTES.CLUBS}>Clubs</Link>
<Link href={ROUTES.MATCHES}>Matches</Link>
<Link href={ROUTES.STANDINGS}>Standings</Link>
```

---

### **2. Dynamic Routes**

```tsx
import { ROUTES } from '@/lib/constants';

// Club detail page
const clubSlug = "brisbane-north";
<Link href={ROUTES.CLUB_DETAIL(clubSlug)}>
  Brisbane North
</Link>
// Result: /clubs/brisbane-north

// Club contact page
<Link href={ROUTES.CLUB_CONTACT(clubSlug)}>
  Contact Brisbane North
</Link>
// Result: /clubs/brisbane-north/contact
```

---

### **3. Navigation Components**

```tsx
import { ROUTES, NAV_GROUPS } from "@/lib/constants";

export default function Header() {
  return (
    <nav>
      {NAV_GROUPS.PRIMARY.map((item) => (
        <Link key={item.href} href={item.href}>
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
```

---

### **4. Breadcrumbs**

```tsx
import { BREADCRUMBS, ROUTES } from "@/lib/constants";

export default function MatchesPage() {
  const breadcrumbs = BREADCRUMBS[ROUTES.MATCHES];

  return (
    <div>
      <nav className="flex gap-2 text-sm">
        {breadcrumbs.map((crumb, index) => (
          <span key={crumb.href}>
            <Link href={crumb.href}>{crumb.label}</Link>
            {index < breadcrumbs.length - 1 && " / "}
          </span>
        ))}
      </nav>

      <h1>Matches</h1>
    </div>
  );
}
```

---

### **5. Page Metadata (SEO)**

```tsx
import { PAGE_METADATA, ROUTES } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = PAGE_METADATA[ROUTES.MATCHES];

export default function MatchesPage() {
  return <div>Matches Content</div>;
}
```

---

### **6. BackButton Component**

```tsx
import { ROUTES } from "@/lib/constants";
import BackButton from "@/components/layout/BackButton";

export default function MatchesPage() {
  return (
    <div>
      <BackButton href={ROUTES.COMPETITIONS} />
      <h1>Matches</h1>
    </div>
  );
}
```

---

### **7. Programmatic Navigation**

```tsx
"use client";

import { useRouter } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default function MyComponent() {
  const router = useRouter();

  const handleClick = () => {
    router.push(ROUTES.MATCHES);
  };

  return <button onClick={handleClick}>Go to Matches</button>;
}
```

---

### **8. Redirects**

```tsx
import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/constants";

export default async function OldPage() {
  redirect(ROUTES.MATCHES);
}
```

---

## 🎨 Complete Examples

### **Example 1: Header Component**

```tsx
import Link from "next/link";
import { ROUTES, NAV_GROUPS } from "@/lib/constants";

export default function Header() {
  return (
    <header className="bg-[#06054e] text-white">
      <div className="container mx-auto px-4 py-6">
        {/* Logo */}
        <Link href={ROUTES.HOME} className="text-2xl font-black">
          BHL
        </Link>

        {/* Primary Nav */}
        <nav className="flex gap-6 mt-4">
          {NAV_GROUPS.PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover:text-red-600 transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Competitions Dropdown */}
        <div className="mt-2">
          {NAV_GROUPS.COMPETITIONS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm mr-4 hover:text-red-600"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
}
```

---

### **Example 2: Footer Component**

```tsx
import Link from "next/link";
import { ROUTES, NAV_GROUPS } from "@/lib/constants";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Column 1: Primary Links */}
          <div>
            <h3 className="font-black uppercase mb-4">Main</h3>
            <ul className="space-y-2">
              {NAV_GROUPS.PRIMARY.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-red-600">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2: Competitions */}
          <div>
            <h3 className="font-black uppercase mb-4">Competitions</h3>
            <ul className="space-y-2">
              {NAV_GROUPS.COMPETITIONS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-red-600">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Secondary */}
          <div>
            <h3 className="font-black uppercase mb-4">More</h3>
            <ul className="space-y-2">
              {NAV_GROUPS.SECONDARY.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-red-600">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </footer>
  );
}
```

---

### **Example 3: Competitions Hub Page**

```tsx
import Link from "next/link";
import { ROUTES, NAV_GROUPS } from "@/lib/constants";

export default function CompetitionsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <h1 className="text-4xl font-black uppercase italic text-[#06054e] mb-8">
        Competitions
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {NAV_GROUPS.COMPETITIONS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white rounded-3xl p-8 hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-black uppercase text-[#06054e]">
              {item.label}
            </h2>
            <p className="text-slate-600 mt-2">
              View {item.label.toLowerCase()}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
```

---

### **Example 4: Dynamic Club Page**

```tsx
import { ROUTES } from "@/lib/constants";
import Link from "next/link";
import BackButton from "@/components/layout/BackButton";

export default function ClubDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const { slug } = params;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <BackButton href={ROUTES.CLUBS} label="Back to Clubs" />

      <h1 className="text-4xl font-black uppercase italic text-[#06054e] mt-6 mb-8">
        {slug.replace("-", " ")}
      </h1>

      {/* Contact link using dynamic route */}
      <Link
        href={ROUTES.CLUB_CONTACT(slug)}
        className="px-6 py-3 bg-[#06054e] text-white rounded-full font-black uppercase"
      >
        Contact Club
      </Link>
    </div>
  );
}
```

---

## 🔧 Adding New Routes

### **Step 1: Add to ROUTES Object**

```tsx
export const ROUTES = {
  // ... existing routes

  // New route
  PLAYERS: "/competitions/players",
  PLAYER_DETAIL: (id: string) => `/competitions/players/${id}`,
} as const;
```

---

### **Step 2: Add to Navigation (Optional)**

```tsx
export const NAV_GROUPS = {
  COMPETITIONS: [
    // ... existing items
    { label: "Players", href: ROUTES.PLAYERS },
  ],
} as const;
```

---

### **Step 3: Add Breadcrumbs (Optional)**

```tsx
export const BREADCRUMBS = {
  // ... existing breadcrumbs

  [ROUTES.PLAYERS]: [
    { label: "Home", href: ROUTES.HOME },
    { label: "Competitions", href: ROUTES.COMPETITIONS },
    { label: "Players", href: ROUTES.PLAYERS },
  ],
} as const;
```

---

### **Step 4: Add Metadata (Optional)**

```tsx
export const PAGE_METADATA = {
  // ... existing metadata

  [ROUTES.PLAYERS]: {
    title: "Player Directory",
    description: "Browse all registered players",
  },
} as const;
```

---

### **Step 5: Use It!**

```tsx
import { ROUTES } from '@/lib/constants';

<Link href={ROUTES.PLAYERS}>View Players</Link>

// Dynamic route
<Link href={ROUTES.PLAYER_DETAIL('123')}>
  View Player 123
</Link>
```

---

## 📋 Available Routes

### **Main Pages**

- `ROUTES.HOME` → `/`
- `ROUTES.ABOUT` → `/about`
- `ROUTES.CONTACT` → `/contact`

### **Clubs**

- `ROUTES.CLUBS` → `/clubs`
- `ROUTES.CLUB_DETAIL(slug)` → `/clubs/{slug}`
- `ROUTES.CLUB_CONTACT(slug)` → `/clubs/{slug}/contact`

### **Competitions**

- `ROUTES.COMPETITIONS` → `/competitions`
- `ROUTES.EVENTS` → `/competitions/events`
- `ROUTES.FIXTURES` → `/competitions/fixtures`
- `ROUTES.MATCHES` → `/competitions/matches`
- `ROUTES.STANDINGS` → `/competitions/standings`
- `ROUTES.STATISTICS` → `/competitions/statistics`

### **Other**

- `ROUTES.OFFICIALS` → `/officials`
- `ROUTES.PLAY` → `/play`
- `ROUTES.REPRESENTATIVE` → `/representative`
- `ROUTES.SHOP` → `/shop`

---

## 🎯 Best Practices

### **1. Always Import from Constants**

```tsx
// ✅ Good
import { ROUTES } from '@/lib/constants';
<Link href={ROUTES.MATCHES}>Matches</Link>

// ❌ Bad
<Link href="/competitions/matches">Matches</Link>
```

---

### **2. Use Dynamic Routes for Parameters**

```tsx
// ✅ Good
CLUB_DETAIL: (slug: string) => `/clubs/${slug}`

// Use it:
href={ROUTES.CLUB_DETAIL('brisbane-north')}

// ❌ Bad
href={`/clubs/${slug}`}  // Hardcoded
```

---

### **3. Group Related Routes**

```tsx
// ✅ Good - Organized by section
COMPETITIONS: "/competitions",
MATCHES: "/competitions/matches",
STANDINGS: "/competitions/standings",

// ❌ Bad - Random order
STANDINGS: "/competitions/standings",
HOME: "/",
MATCHES: "/competitions/matches",
```

---

### **4. Use Navigation Groups**

```tsx
// ✅ Good - Reusable
{NAV_GROUPS.PRIMARY.map(item => (
  <Link href={item.href}>{item.label}</Link>
))}

// ❌ Bad - Duplicated
<Link href={ROUTES.ABOUT}>About</Link>
<Link href={ROUTES.COMPETITIONS}>Competitions</Link>
<Link href={ROUTES.CLUBS}>Clubs</Link>
// ... repeated in footer, mobile menu, etc.
```

---

## 🚀 Migration Strategy

### **Before (Hardcoded URLs):**

```tsx
// Scattered in 50+ files
<Link href="/competitions/matches">Matches</Link>
<Link href="/competitions/standings">Standings</Link>
<Link href="/clubs">Clubs</Link>
<a href="/about">About</a>
router.push('/competitions/statistics');
redirect('/competitions/matches');
```

---

### **After (Centralized):**

```tsx
// In routes.ts (one file)
export const ROUTES = {
  MATCHES: "/competitions/matches",
  STANDINGS: "/competitions/standings",
  CLUBS: "/clubs",
  ABOUT: "/about",
  STATISTICS: "/competitions/statistics",
};

// Usage everywhere
import { ROUTES } from '@/lib/constants';
<Link href={ROUTES.MATCHES}>Matches</Link>
<Link href={ROUTES.STANDINGS}>Standings</Link>
router.push(ROUTES.STATISTICS);
redirect(ROUTES.MATCHES);
```

---

## ✅ Benefits Summary

### **Before Centralized Routes:**

- ❌ URLs scattered everywhere
- ❌ Typos cause broken links
- ❌ Hard to refactor
- ❌ No autocomplete
- ❌ No type safety

### **After Centralized Routes:**

- ✅ Single source of truth
- ✅ TypeScript catches errors
- ✅ Easy refactoring
- ✅ IDE autocomplete
- ✅ Type-safe navigation
- ✅ Consistent throughout app

---

## 🎁 Bonus: Route Helpers

Add these helper functions to routes.ts:

```typescript
// Check if route is active
export function isActiveRoute(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(route + "/");
}

// Get parent route
export function getParentRoute(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  parts.pop();
  return "/" + parts.join("/");
}

// Usage
const isActive = isActiveRoute(pathname, ROUTES.MATCHES);
<Link
  href={ROUTES.MATCHES}
  className={isActive ? "text-red-600" : "text-slate-600"}
>
  Matches
</Link>;
```

---

**You now have type-safe, centralized routing for your entire app!** 🗺️✨
