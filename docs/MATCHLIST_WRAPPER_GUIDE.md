# 🎮 MatchListWrapper Component - Complete Guide

## 📄 Full Component Code

```typescript
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import MatchList from "./MatchList";
import MatchFilters from "./MatchFilters";
import { EmptyStates } from "../shared/EmptyState";
import type { Match } from "@/types";

interface MatchListWrapperProps {
  initialMatches: Match[];
  divisions: string[];
  rounds: string[];
  viewType?: "results" | "upcoming" | "all";
}

/**
 * MatchListWrapper Component
 *
 * Client-side wrapper for match list with filtering functionality.
 * Manages filter state and provides interactive filtering UI.
 *
 * @example
 * <MatchListWrapper
 *   initialMatches={matches}
 *   divisions={['All', 'BHL1', 'BHL2']}
 *   rounds={['All', '1', '2', '3']}
 *   viewType="results"
 * />
 */
export default function MatchListWrapper({
  initialMatches,
  divisions,
  rounds,
  viewType = "all",
}: MatchListWrapperProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current filters from URL
  const selectedDiv = searchParams.get("div") || "All";
  const selectedRound = searchParams.get("round") || "All";
  const selectedStatus = searchParams.get("status") || "All";

  // Filter matches based on current selections
  const filteredMatches = initialMatches.filter((match) => {
    // Filter by division
    if (selectedDiv !== "All" && match.division !== selectedDiv) {
      return false;
    }

    // Filter by round
    if (selectedRound !== "All" && match.round.toString() !== selectedRound) {
      return false;
    }

    // Filter by status
    if (selectedStatus !== "All" && match.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  // Update URL when filter changes
  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (value === "All") {
      params.delete(key);
    } else {
      params.set(key, value);
    }

    router.push(`?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <MatchFilters
        divisions={divisions}
        rounds={rounds}
        selectedDiv={selectedDiv}
        selectedRound={selectedRound}
        selectedStatus={selectedStatus}
        onDivisionChange={(div) => updateFilter("div", div)}
        onRoundChange={(round) => updateFilter("round", round)}
        onStatusChange={(status) => updateFilter("status", status)}
      />

      {/* Match List */}
      {filteredMatches.length === 0 ? (
        viewType === "upcoming" ? (
          <EmptyStates.NoUpcoming />
        ) : viewType === "results" ? (
          <EmptyStates.NoResults />
        ) : (
          <EmptyStates.NoMatches />
        )
      ) : (
        <MatchList matches={filteredMatches} />
      )}
    </div>
  );
}
```

---

## 📁 File Location

Save as:

```
components/matches/MatchListWrapper.tsx
```

---

## 🎯 What Does It Do?

The MatchListWrapper is a **client-side component** that:

1. ✅ Receives initial matches from server
2. ✅ Provides interactive filtering UI
3. ✅ Updates URL parameters when filters change
4. ✅ Filters matches based on URL parameters
5. ✅ Shows appropriate empty states
6. ✅ Renders filtered matches

---

## 💡 Why Use MatchListWrapper?

### **Problem:**

You have a server component (page.tsx) that fetches matches, but you need **client-side filtering** without re-fetching from server.

### **Solution:**

Pass data from server component to this client wrapper:

```tsx
// Server Component (page.tsx)
export default async function MatchesPage() {
  const matches = await getMatches();
  const divisions = await getDivisions();
  const rounds = await getRounds();

  return (
    <MatchListWrapper
      initialMatches={matches}
      divisions={divisions}
      rounds={rounds}
      viewType="results"
    />
  );
}
```

---

## 🚀 Complete Usage Example

### **Step 1: Server Component (Page)**

```tsx
// app/(website)/competitions/matches/page.tsx
import MatchListWrapper from "@/components/matches/MatchListWrapper";
import { getMatches, getDivisions, getRounds } from "@/lib/data";
import BackButton from "@/components/layout/BackButton";

export default async function MatchesPage() {
  // Fetch data on server
  const [matches, divisions, rounds] = await Promise.all([
    getMatches(),
    getDivisions(),
    getRounds(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <BackButton href="/competitions" />

      <h1 className="text-4xl font-black uppercase italic text-[#06054e] mt-6 mb-8">
        Match Results
      </h1>

      {/* Client wrapper handles filtering */}
      <MatchListWrapper
        initialMatches={matches}
        divisions={divisions}
        rounds={rounds}
        viewType="results"
      />
    </div>
  );
}
```

---

### **Step 2: MatchFilters Component**

You'll need a MatchFilters component:

```tsx
// components/matches/MatchFilters.tsx
import FilterButton from "@/components/shared/FilterButton";

interface MatchFiltersProps {
  divisions: string[];
  rounds: string[];
  selectedDiv: string;
  selectedRound: string;
  selectedStatus: string;
  onDivisionChange: (div: string) => void;
  onRoundChange: (round: string) => void;
  onStatusChange: (status: string) => void;
}

export default function MatchFilters({
  divisions,
  rounds,
  selectedDiv,
  selectedRound,
  selectedStatus,
  onDivisionChange,
  onRoundChange,
  onStatusChange,
}: MatchFiltersProps) {
  return (
    <div className="bg-white rounded-3xl p-6">
      <div className="flex flex-wrap gap-x-10 gap-y-6">
        {/* Division Filter */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Division
          </span>
          <div className="flex gap-2 flex-wrap">
            {divisions.map((div) => (
              <button
                key={div}
                onClick={() => onDivisionChange(div)}
                className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all ${
                  selectedDiv === div
                    ? "bg-[#06054e] text-white border-[#06054e] shadow-md"
                    : "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]"
                }`}
              >
                {div}
              </button>
            ))}
          </div>
        </div>

        {/* Round Filter */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Round
          </span>
          <div className="flex gap-2 flex-wrap">
            {rounds.slice(0, 10).map((round) => (
              <button
                key={round}
                onClick={() => onRoundChange(round)}
                className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all ${
                  selectedRound === round
                    ? "bg-[#06054e] text-white border-[#06054e] shadow-md"
                    : "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]"
                }`}
              >
                {round === "All" ? "All" : `R${round}`}
              </button>
            ))}
          </div>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
            Status
          </span>
          <div className="flex gap-2">
            {["All", "Scheduled", "Live", "Final"].map((status) => (
              <button
                key={status}
                onClick={() => onStatusChange(status)}
                className={`px-4 py-2 rounded-full text-[10px] font-black border transition-all ${
                  selectedStatus === status
                    ? "bg-[#06054e] text-white border-[#06054e] shadow-md"
                    : "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]"
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### **Step 3: MatchList Component**

```tsx
// components/matches/MatchList.tsx
import MatchCard from "./MatchCard";
import type { Match } from "@/types";

interface MatchListProps {
  matches: Match[];
}

export default function MatchList({ matches }: MatchListProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {matches.map((match) => (
        <MatchCard key={match.matchId} match={match} />
      ))}
    </div>
  );
}
```

---

## 🎨 How It Works

### **1. Server Side (Page.tsx)**

```tsx
// Fetches data once on server
const matches = await getMatches();

// Passes to client component
<MatchListWrapper initialMatches={matches} />;
```

### **2. Client Side (MatchListWrapper)**

```tsx
// Reads URL parameters
const selectedDiv = searchParams.get("div") || "All";

// Filters matches client-side
const filteredMatches = initialMatches.filter((match) => {
  if (selectedDiv !== "All" && match.division !== selectedDiv) {
    return false;
  }
  return true;
});

// Updates URL when filter changes
const updateFilter = (key, value) => {
  router.push(`?${key}=${value}`);
};
```

### **3. URL Updates**

```
/matches                      → All matches
/matches?div=BHL1             → BHL1 only
/matches?div=BHL1&round=5     → BHL1, Round 5
/matches?div=BHL1&status=Live → BHL1, Live matches
```

---

## 📋 Props Reference

| Prop             | Type                               | Required | Description                    |
| ---------------- | ---------------------------------- | -------- | ------------------------------ |
| `initialMatches` | `Match[]`                          | ✅ Yes   | Initial match data from server |
| `divisions`      | `string[]`                         | ✅ Yes   | List of divisions for filter   |
| `rounds`         | `string[]`                         | ✅ Yes   | List of rounds for filter      |
| `viewType`       | `'results' \| 'upcoming' \| 'all'` | No       | Determines empty state message |

---

## 🔧 Variations

### **1. With Additional Filters**

```tsx
// Add venue filter
const [selectedVenue, setSelectedVenue] = useState("All");

const filteredMatches = initialMatches.filter((match) => {
  // ... existing filters

  // Venue filter
  if (selectedVenue !== "All" && match.venue !== selectedVenue) {
    return false;
  }

  return true;
});
```

---

### **2. With Search**

```tsx
const [searchQuery, setSearchQuery] = useState("");

const filteredMatches = initialMatches.filter((match) => {
  // ... existing filters

  // Search filter
  if (searchQuery) {
    const query = searchQuery.toLowerCase();
    return (
      match.homeTeam.name.toLowerCase().includes(query) ||
      match.awayTeam.name.toLowerCase().includes(query)
    );
  }

  return true;
});
```

---

### **3. With Sorting**

```tsx
const [sortBy, setSortBy] = useState<"date" | "division">("date");

const sortedMatches = [...filteredMatches].sort((a, b) => {
  if (sortBy === "date") {
    return new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime();
  } else {
    return a.division.localeCompare(b.division);
  }
});
```

---

## 🎯 Different View Types

### **Results View**

```tsx
<MatchListWrapper
  initialMatches={matches.filter((m) => m.status === "Final")}
  divisions={divisions}
  rounds={rounds}
  viewType="results"
/>
```

Shows `NoResults` empty state.

---

### **Upcoming View**

```tsx
<MatchListWrapper
  initialMatches={matches.filter((m) => m.status === "Scheduled")}
  divisions={divisions}
  rounds={rounds}
  viewType="upcoming"
/>
```

Shows `NoUpcoming` empty state.

---

### **All Matches View**

```tsx
<MatchListWrapper
  initialMatches={matches}
  divisions={divisions}
  rounds={rounds}
  viewType="all"
/>
```

Shows `NoMatches` empty state.

---

## 🚦 Loading States

### **With Suspense**

```tsx
// app/(website)/matches/page.tsx
import { Suspense } from "react";
import MatchListSkeleton from "@/components/matches/MatchListSkeleton";

export default function MatchesPage() {
  return (
    <div>
      <h1>Matches</h1>

      <Suspense fallback={<MatchListSkeleton />}>
        <MatchesContent />
      </Suspense>
    </div>
  );
}

async function MatchesContent() {
  const matches = await getMatches();

  return (
    <MatchListWrapper
      initialMatches={matches}
      divisions={["All", "BHL1", "BHL2"]}
      rounds={["All", "1", "2", "3"]}
    />
  );
}
```

---

## ⚡ Performance Tips

### **1. Memoize Filter Function**

```tsx
import { useMemo } from "react";

const filteredMatches = useMemo(() => {
  return initialMatches.filter((match) => {
    if (selectedDiv !== "All" && match.division !== selectedDiv) {
      return false;
    }
    // ... other filters
    return true;
  });
}, [initialMatches, selectedDiv, selectedRound, selectedStatus]);
```

---

### **2. Debounce Search**

```tsx
import { useDebouncedValue } from "@/lib/hooks/useDebounce";

const [searchQuery, setSearchQuery] = useState("");
const debouncedQuery = useDebouncedValue(searchQuery, 300);

// Use debouncedQuery in filter
```

---

### **3. Virtual Scrolling for Large Lists**

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

// For 1000+ matches
const virtualizer = useVirtualizer({
  count: filteredMatches.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200,
});
```

---

## 🐛 Common Issues

### **Issue 1: Filters Not Working**

**Check:**

- Is `"use client"` at the top of the file?
- Are `useRouter` and `useSearchParams` imported?
- Is the component wrapped in a Suspense boundary?

---

### **Issue 2: URL Not Updating**

**Fix:**

```tsx
// Make sure you're using router.push correctly
router.push(`?${params.toString()}`); // ✅ Correct
router.push(params.toString()); // ❌ Missing ?
```

---

### **Issue 3: Filters Reset on Navigation**

**Fix:**
Make sure you're reading from URL params:

```tsx
const selectedDiv = searchParams.get("div") || "All"; // ✅ Correct
const [selectedDiv, setSelectedDiv] = useState("All"); // ❌ Wrong - will reset
```

---

## ✅ Dependencies

Required components:

- ✅ `MatchList.tsx`
- ✅ `MatchFilters.tsx`
- ✅ `EmptyState.tsx`
- ✅ `MatchCard.tsx`

---

## 📦 Complete File Structure

```
components/matches/
├── MatchListWrapper.tsx   ← This component
├── MatchList.tsx          ← Renders grid of matches
├── MatchFilters.tsx       ← Filter UI
├── MatchCard.tsx          ← Individual match card
├── MatchCardSkeleton.tsx  ← Loading state
└── MatchListSkeleton.tsx  ← Loading state
```

---

## 🎁 Bonus: TypeScript Types

```typescript
// types/match.ts
export interface Match {
  matchId: string;
  season: number;
  round: number;
  division: string;
  dateTime: string;
  venue: string;
  homeTeam: {
    name: string;
    icon: string;
  };
  awayTeam: {
    name: string;
    icon: string;
  };
  score?: {
    home: number;
    away: number;
  };
  status: "Scheduled" | "Live" | "Final" | "Postponed" | "Cancelled";
}
```

---

**You now have a complete, performant match filtering system!** 🎮🏒
