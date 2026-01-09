# 📦 constants/index.ts - Complete Guide

## 📄 Full Code

```typescript
/**
 * Constants Index
 *
 * Central export file for all application constants.
 * Import from here to keep imports clean and organized.
 *
 * @example
 * import { ROUTES, APP_CONFIG, MESSAGES } from '@/lib/constants';
 */

// Routes
export * from "./routes";
export { ROUTES, NAV_GROUPS, BREADCRUMBS, PAGE_METADATA } from "./routes";
export type { RouteKey } from "./routes";

// Configuration
export * from "./config";
export {
  APP_CONFIG,
  FILTER_OPTIONS,
  ZONE_CONFIG,
  VALIDATION,
  FEATURES,
} from "./config";

// Messages
export * from "./messages";
export { MESSAGES, getMessage } from "./messages";
```

---

## 📁 File Location

Save as:

```
lib/constants/index.ts
```

---

## 🎯 What This Does

This is a **barrel export** file that:

1. ✅ Consolidates all constants into one import
2. ✅ Makes imports cleaner and shorter
3. ✅ Provides a single entry point
4. ✅ Improves code organization

---

## 💡 Before vs After

### **Before (Multiple Imports):**

```tsx
// ❌ Long, repetitive imports
import { ROUTES } from "@/lib/constants/routes";
import { APP_CONFIG } from "@/lib/constants/config";
import { MESSAGES } from "@/lib/constants/messages";
import { NAV_GROUPS } from "@/lib/constants/routes";
import { FILTER_OPTIONS } from "@/lib/constants/config";
```

### **After (Single Import):**

```tsx
// ✅ Clean, single import
import {
  ROUTES,
  APP_CONFIG,
  MESSAGES,
  NAV_GROUPS,
  FILTER_OPTIONS,
} from "@/lib/constants";
```

---

## 🚀 Usage Examples

### **Example 1: Basic Usage**

```tsx
import { ROUTES, MESSAGES } from "@/lib/constants";

export default function MatchesPage() {
  return (
    <div>
      <BackButton href={ROUTES.COMPETITIONS} />
      <h1>{MESSAGES.PAGE_TITLES.MATCHES}</h1>
    </div>
  );
}
```

---

### **Example 2: Multiple Constants**

```tsx
import { ROUTES, APP_CONFIG, MESSAGES, FILTER_OPTIONS } from "@/lib/constants";

export default function CompetitionsPage() {
  return (
    <div>
      <h1>{APP_CONFIG.name}</h1>
      <p>{APP_CONFIG.currentSeason}</p>

      {/* Divisions filter */}
      {FILTER_OPTIONS.divisions.map((div) => (
        <FilterButton key={div} href={ROUTES.MATCHES}>
          {div}
        </FilterButton>
      ))}

      <EmptyState title={MESSAGES.EMPTY.NO_MATCHES} />
    </div>
  );
}
```

---

### **Example 3: Navigation Component**

```tsx
import { ROUTES, NAV_GROUPS, APP_CONFIG } from "@/lib/constants";

export default function Header() {
  return (
    <header>
      <h1>{APP_CONFIG.name}</h1>

      <nav>
        {NAV_GROUPS.PRIMARY.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
```

---

### **Example 4: Form Validation**

```tsx
import { VALIDATION, MESSAGES } from "@/lib/constants";

export default function ContactForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!VALIDATION.EMAIL_REGEX.test(email)) {
      setError(MESSAGES.VALIDATION.INVALID_EMAIL);
      return;
    }

    // Submit form
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        maxLength={VALIDATION.MAX_EMAIL_LENGTH}
      />
      {error && <p>{error}</p>}
    </form>
  );
}
```

---

### **Example 5: Feature Flags**

```tsx
import { FEATURES, ROUTES } from "@/lib/constants";

export default function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>

      {FEATURES.LIVE_SCORES && <LiveScoresWidget />}

      {FEATURES.PLAYER_STATS && (
        <Link href={ROUTES.STATISTICS}>View Statistics</Link>
      )}

      {FEATURES.SOCIAL_SHARING && <ShareButton />}
    </div>
  );
}
```

---

### **Example 6: Standings with Zone Colors**

```tsx
import { ZONE_CONFIG, MESSAGES } from "@/lib/constants";

export default function StandingsTable({ teams }) {
  const getZoneColor = (position: number) => {
    if (position <= ZONE_CONFIG.PROMOTION_POSITIONS) {
      return "bg-green-50 border-green-500";
    }
    if (position >= teams.length - ZONE_CONFIG.RELEGATION_POSITIONS + 1) {
      return "bg-red-50 border-red-500";
    }
    return "bg-white";
  };

  return (
    <table>
      <tbody>
        {teams.map((team, index) => (
          <tr key={team.id} className={getZoneColor(index + 1)}>
            <td>{index + 1}</td>
            <td>{team.name}</td>
            <td>{team.points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

### **Example 7: Dynamic Page Metadata**

```tsx
import { PAGE_METADATA, ROUTES, APP_CONFIG } from "@/lib/constants";
import type { Metadata } from "next";

export const metadata: Metadata = {
  ...PAGE_METADATA[ROUTES.MATCHES],
  openGraph: {
    title: PAGE_METADATA[ROUTES.MATCHES].title,
    description: PAGE_METADATA[ROUTES.MATCHES].description,
    siteName: APP_CONFIG.name,
  },
};

export default function MatchesPage() {
  return <div>Matches</div>;
}
```

---

## 📋 What's Exported

### **From routes.ts:**

- `ROUTES` - All route paths
- `NAV_GROUPS` - Navigation groups (PRIMARY, COMPETITIONS, SECONDARY)
- `BREADCRUMBS` - Breadcrumb configurations
- `PAGE_METADATA` - SEO metadata for pages
- `RouteKey` (type)

### **From config.ts:**

- `APP_CONFIG` - App name, contact, social, current season
- `FILTER_OPTIONS` - Divisions, statuses, rounds, categories
- `ZONE_CONFIG` - Promotion/relegation positions
- `VALIDATION` - Regex patterns, length limits
- `FEATURES` - Feature flags

### **From messages.ts:**

- `MESSAGES` - All UI text constants
- `getMessage()` - Helper function for dynamic messages

---

## 🗂️ File Structure

Your constants folder should look like this:

```
lib/constants/
├── index.ts          ← This file (exports everything)
├── routes.ts         ← Route definitions
├── config.ts         ← App configuration
└── messages.ts       ← UI text constants
```

---

## 🎨 Import Patterns

### **Pattern 1: Named Imports (Recommended)**

```tsx
import { ROUTES, MESSAGES, APP_CONFIG } from "@/lib/constants";

// Use directly
<Link href={ROUTES.MATCHES}>{MESSAGES.NAV.MATCHES}</Link>;
```

### **Pattern 2: Namespace Import**

```tsx
import * as Constants from "@/lib/constants";

// Use with namespace
<Link href={Constants.ROUTES.MATCHES}>{Constants.MESSAGES.NAV.MATCHES}</Link>;
```

### **Pattern 3: Selective Import**

```tsx
// Only import what you need
import { ROUTES } from "@/lib/constants";

<Link href={ROUTES.MATCHES}>Matches</Link>;
```

### **Pattern 4: Type Imports**

```tsx
import { type RouteKey } from "@/lib/constants";

function navigateTo(route: RouteKey) {
  // route must be a valid key from ROUTES
}
```

---

## ✅ Best Practices

### **1. Import from Index (Not Individual Files)**

```tsx
// ✅ Good - Import from index
import { ROUTES, MESSAGES } from "@/lib/constants";

// ❌ Bad - Import from individual files
import { ROUTES } from "@/lib/constants/routes";
import { MESSAGES } from "@/lib/constants/messages";
```

### **2. Group Related Imports**

```tsx
// ✅ Good - Grouped by module
import { ROUTES, NAV_GROUPS, BREADCRUMBS } from "@/lib/constants";
import { useState, useEffect } from "react";
import { getMatches } from "@/lib/data";

// ❌ Bad - Mixed up
import { ROUTES } from "@/lib/constants";
import { useState } from "react";
import { NAV_GROUPS } from "@/lib/constants";
import { getMatches } from "@/lib/data";
```

### **3. Use Destructuring**

```tsx
// ✅ Good - Clear what you're using
import { ROUTES, MESSAGES, APP_CONFIG } from "@/lib/constants";

// ❌ Confusing - Namespace pollution
import * as Constants from "@/lib/constants";
```

### **4. Import Types Separately**

```tsx
// ✅ Good - Type-only import
import { type RouteKey } from "@/lib/constants";

// ❌ Mixed - Harder to tree-shake
import { RouteKey } from "@/lib/constants";
```

---

## 🔧 Adding New Constants

### **Step 1: Create New Constants File**

```typescript
// lib/constants/api.ts
export const API_ENDPOINTS = {
  MATCHES: "/api/matches",
  STANDINGS: "/api/standings",
  STATISTICS: "/api/statistics",
} as const;

export const API_CONFIG = {
  timeout: 5000,
  retries: 3,
} as const;
```

### **Step 2: Export from Index**

```typescript
// lib/constants/index.ts

// ... existing exports

// API Constants
export * from "./api";
export { API_ENDPOINTS, API_CONFIG } from "./api";
```

### **Step 3: Use It**

```tsx
import { API_ENDPOINTS, API_CONFIG } from "@/lib/constants";

const response = await fetch(API_ENDPOINTS.MATCHES, {
  timeout: API_CONFIG.timeout,
});
```

---

## 🎯 Real-World Complete Example

```tsx
// app/(website)/matches/page.tsx
import {
  ROUTES,
  MESSAGES,
  APP_CONFIG,
  FILTER_OPTIONS,
  PAGE_METADATA,
} from "@/lib/constants";
import { getMatches } from "@/lib/data";
import BackButton from "@/components/layout/BackButton";
import MatchListWrapper from "@/components/matches/MatchListWrapper";
import type { Metadata } from "next";

// SEO Metadata
export const metadata: Metadata = PAGE_METADATA[ROUTES.MATCHES];

export default async function MatchesPage() {
  const matches = await getMatches();

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      {/* Back Button */}
      <BackButton href={ROUTES.COMPETITIONS} />

      {/* Page Title */}
      <h1 className="text-4xl font-black uppercase italic text-[#06054e] mt-6 mb-8">
        {MESSAGES.PAGE_TITLES.MATCHES}
      </h1>

      {/* Season Info */}
      <p className="text-sm text-slate-600 mb-6">
        {APP_CONFIG.currentSeason} Season
      </p>

      {/* Match List with Filters */}
      <MatchListWrapper
        initialMatches={matches}
        divisions={FILTER_OPTIONS.divisions}
        rounds={FILTER_OPTIONS.rounds}
        viewType="results"
      />
    </div>
  );
}
```

---

## 📦 Import Summary

### **What You Can Import:**

```typescript
// Routes
ROUTES, NAV_GROUPS, BREADCRUMBS, PAGE_METADATA, RouteKey;

// Config
APP_CONFIG, FILTER_OPTIONS, ZONE_CONFIG, VALIDATION, FEATURES;

// Messages
MESSAGES, getMessage;
```

### **Example - Import Everything:**

```tsx
import {
  // Routes
  ROUTES,
  NAV_GROUPS,
  BREADCRUMBS,
  PAGE_METADATA,

  // Config
  APP_CONFIG,
  FILTER_OPTIONS,
  ZONE_CONFIG,
  VALIDATION,
  FEATURES,

  // Messages
  MESSAGES,
  getMessage,

  // Types
  type RouteKey,
} from "@/lib/constants";
```

---

## 🎁 Bonus: Auto-import in VS Code

Add this to your `.vscode/settings.json`:

```json
{
  "typescript.preferences.importModuleSpecifier": "non-relative",
  "javascript.preferences.importModuleSpecifier": "non-relative"
}
```

Now when you type `ROUTES`, VS Code will auto-suggest:

```tsx
import { ROUTES } from "@/lib/constants";
```

---

## ✅ Checklist

- [ ] Create `lib/constants/index.ts`
- [ ] Ensure `routes.ts`, `config.ts`, `messages.ts` exist in same folder
- [ ] Import from `@/lib/constants` (not individual files)
- [ ] Test imports work correctly
- [ ] Update existing imports to use index
- [ ] Verify TypeScript autocomplete works
- [ ] Check no circular dependencies

---

## 📊 Impact

### **Before:**

```tsx
// 5 different import lines
import { ROUTES } from "@/lib/constants/routes";
import { NAV_GROUPS } from "@/lib/constants/routes";
import { APP_CONFIG } from "@/lib/constants/config";
import { MESSAGES } from "@/lib/constants/messages";
import { FILTER_OPTIONS } from "@/lib/constants/config";
```

### **After:**

```tsx
// 1 clean import line
import {
  ROUTES,
  NAV_GROUPS,
  APP_CONFIG,
  MESSAGES,
  FILTER_OPTIONS,
} from "@/lib/constants";
```

**Benefits:**

- ✅ 80% fewer import lines
- ✅ Cleaner code
- ✅ Easier to maintain
- ✅ Better autocomplete

---

**You now have a clean, centralized constants system!** 📦✨
