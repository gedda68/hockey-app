# 📭 EmptyState Component - Complete Guide

## 📄 Full Component Code

```typescript
import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const emptyStateVariants = cva("bg-white rounded-3xl text-center", {
  variants: {
    size: {
      sm: "p-6",
      md: "p-8",
      lg: "p-12",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  size,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ size }), className)}>
      {/* Icon */}
      {icon && (
        <div className="mb-4 flex justify-center text-slate-300">{icon}</div>
      )}

      {/* Title */}
      <p className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-2">
        {title}
      </p>

      {/* Description */}
      {description && (
        <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Preset empty states for common scenarios
export const EmptyStates = {
  NoMatches: () => (
    <EmptyState
      title="No matches available"
      description="There are no matches scheduled or completed yet."
    />
  ),

  NoUpcoming: () => (
    <EmptyState
      title="No upcoming fixtures"
      description="Check back soon for the fixture list!"
    />
  ),

  NoResults: () => (
    <EmptyState
      title="No results available yet"
      description="Check back after matches have been played!"
    />
  ),

  NoStandings: () => (
    <EmptyState
      title="No standings available"
      description="Standings will appear once matches have been played."
    />
  ),

  NoStatistics: () => (
    <EmptyState
      title="No statistics available"
      description="Statistics will be generated after matches are completed."
    />
  ),

  SelectDivision: () => (
    <EmptyState
      title="Select a division"
      description="Choose a division from the filters above to view data."
    />
  ),

  NoData: (entityName: string = "data") => (
    <EmptyState
      title={`No ${entityName} available`}
      description={`${entityName} will appear here once available.`}
    />
  ),
};

export { emptyStateVariants };
```

---

## 📁 File Location

Save as:

```
components/shared/EmptyState.tsx
```

---

## 💡 Usage Examples

### 1. Simple Empty State

```tsx
import EmptyState from "@/components/shared/EmptyState";

<EmptyState
  title="No matches found"
  description="Try adjusting your filters"
/>;
```

### 2. With Icon (using lucide-react)

```tsx
import { Calendar } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

<EmptyState
  icon={<Calendar className="w-12 h-12" />}
  title="No upcoming fixtures"
  description="Check back soon for the fixture list!"
/>;
```

### 3. With Action Button

```tsx
import Link from "next/link";
import EmptyState from "@/components/shared/EmptyState";

<EmptyState
  title="No results yet"
  description="Matches haven't been played yet"
  action={
    <Link
      href="/fixtures"
      className="px-6 py-2 bg-[#06054e] text-white rounded-full text-xs font-black uppercase"
    >
      View Fixtures
    </Link>
  }
/>;
```

### 4. Different Sizes

```tsx
{
  /* Small - Less padding */
}
<EmptyState size="sm" title="No data" />;

{
  /* Medium - Default */
}
<EmptyState size="md" title="No data" />;

{
  /* Large - More padding */
}
<EmptyState size="lg" title="No data" />;
```

### 5. With Custom Styling

```tsx
<EmptyState
  title="No clubs found"
  className="shadow-xl border-2 border-slate-200"
/>
```

---

## 🎯 Using Presets

The component comes with 7 built-in presets for common scenarios:

### 1. NoMatches

```tsx
import { EmptyStates } from "@/components/shared/EmptyState";

<EmptyStates.NoMatches />;
```

**Displays:**

- Title: "No matches available"
- Description: "There are no matches scheduled or completed yet."

### 2. NoUpcoming

```tsx
<EmptyStates.NoUpcoming />
```

**Displays:**

- Title: "No upcoming fixtures"
- Description: "Check back soon for the fixture list!"

### 3. NoResults

```tsx
<EmptyStates.NoResults />
```

**Displays:**

- Title: "No results available yet"
- Description: "Check back after matches have been played!"

### 4. NoStandings

```tsx
<EmptyStates.NoStandings />
```

**Displays:**

- Title: "No standings available"
- Description: "Standings will appear once matches have been played."

### 5. NoStatistics

```tsx
<EmptyStates.NoStatistics />
```

**Displays:**

- Title: "No statistics available"
- Description: "Statistics will be generated after matches are completed."

### 6. SelectDivision

```tsx
<EmptyStates.SelectDivision />
```

**Displays:**

- Title: "Select a division"
- Description: "Choose a division from the filters above to view data."

### 7. NoData (Dynamic)

```tsx
<EmptyStates.NoData("players") />
// Shows: "No players available"

<EmptyStates.NoData("clubs") />
// Shows: "No clubs available"

<EmptyStates.NoData() />
// Shows: "No data available"
```

---

## 🎨 Complete Page Examples

### Example 1: Matches Page with Conditional Empty State

```tsx
import EmptyState, { EmptyStates } from "@/components/shared/EmptyState";

export default function MatchesPage({ matches, viewType }) {
  if (matches.length === 0) {
    return viewType === "upcoming" ? (
      <EmptyStates.NoUpcoming />
    ) : (
      <EmptyStates.NoResults />
    );
  }

  return (
    <div>
      {matches.map((match) => (
        <MatchCard key={match.id} match={match} />
      ))}
    </div>
  );
}
```

### Example 2: Standings Page

```tsx
import { EmptyStates } from "@/components/shared/EmptyState";

export default function StandingsPage({ division, standings }) {
  if (!division || division === "All") {
    return <EmptyStates.SelectDivision />;
  }

  if (!standings || standings.teams.length === 0) {
    return <EmptyStates.NoStandings />;
  }

  return <StandingsTable standings={standings} />;
}
```

### Example 3: Statistics Page with Icon and Action

```tsx
import { BarChart3 } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import Link from "next/link";

export default function StatisticsPage({ stats }) {
  if (!stats || stats.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="w-16 h-16" />}
        title="No statistics available yet"
        description="Statistics will be generated after matches are completed."
        size="lg"
        action={
          <Link
            href="/matches"
            className="inline-block px-6 py-3 bg-[#06054e] text-white rounded-full text-sm font-black uppercase hover:bg-[#06054e]/90 transition-colors"
          >
            View Matches
          </Link>
        }
      />
    );
  }

  return <StatisticsDisplay stats={stats} />;
}
```

### Example 4: Search Results

```tsx
import { Search } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";

export default function SearchResults({ query, results, onReset }) {
  if (results.length === 0) {
    return (
      <EmptyState
        icon={<Search className="w-12 h-12" />}
        title="No results found"
        description={`No matches found for "${query}". Try a different search term.`}
        action={
          <button
            onClick={onReset}
            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-full text-sm font-bold hover:bg-slate-200 transition-colors"
          >
            Clear Search
          </button>
        }
      />
    );
  }

  return <ResultsList results={results} />;
}
```

---

## 🎨 Styling Reference

### Default Styles

```tsx
Container:
- Background: white
- Border radius: rounded-3xl (24px)
- Text align: center
- Padding:
  * sm: p-6 (24px)
  * md: p-8 (32px)
  * lg: p-12 (48px)

Icon:
- Color: text-slate-300
- Margin bottom: mb-4 (16px)
- Centered

Title:
- Size: text-sm
- Weight: font-bold
- Color: text-slate-400
- Transform: uppercase
- Tracking: tracking-wide
- Margin bottom: mb-2

Description:
- Size: text-xs
- Color: text-slate-500
- Max width: max-w-md
- Centered: mx-auto
- Margin bottom: mb-4

Action:
- Margin top: mt-6 (24px)
```

---

## 📋 Props Reference

| Prop          | Type                   | Required | Default | Description                       |
| ------------- | ---------------------- | -------- | ------- | --------------------------------- |
| `title`       | `string`               | ✅ Yes   | -       | Main heading text                 |
| `description` | `string`               | No       | -       | Supporting text                   |
| `icon`        | `ReactNode`            | No       | -       | Icon element (e.g., lucide-react) |
| `action`      | `ReactNode`            | No       | -       | Button or link element            |
| `size`        | `'sm' \| 'md' \| 'lg'` | No       | `'md'`  | Padding size                      |
| `className`   | `string`               | No       | -       | Additional CSS classes            |

---

## 🎯 Best Practices

### 1. Use Presets When Possible

```tsx
// ✅ Good - Using preset
<EmptyStates.NoMatches />

// ❌ Okay but unnecessary
<EmptyState
  title="No matches available"
  description="There are no matches scheduled or completed yet."
/>
```

### 2. Keep Titles Short

```tsx
// ✅ Good
title = "No matches found";

// ❌ Too long
title = "We couldn't find any matches that match your current filter criteria";
```

### 3. Provide Helpful Descriptions

```tsx
// ✅ Good - Tells user what to do
description = "Try adjusting your filters or check back later";

// ❌ Not helpful
description = "There is no data";
```

### 4. Add Actions When Appropriate

```tsx
// ✅ Good - Gives user next step
<EmptyState
  title="No clubs found"
  action={<Link href="/clubs/create">Create Club</Link>}
/>

// ❌ Missed opportunity
<EmptyState title="No clubs found" />
```

---

## 🔧 Common Icons to Use

Using lucide-react:

```tsx
import {
  Calendar, // For fixtures/events
  BarChart3, // For statistics
  Users, // For teams/players
  Trophy, // For competitions
  Search, // For search results
  AlertCircle, // For warnings
  Info, // For information
  FileText, // For documents
} from "lucide-react";

<EmptyState
  icon={<Calendar className="w-12 h-12" />}
  title="No upcoming events"
/>;
```

---

## ⚡ Performance Tips

### 1. Memoize Preset Components

```tsx
import { useMemo } from "react";
import { EmptyStates } from "@/components/shared/EmptyState";

const emptyState = useMemo(() => <EmptyStates.NoMatches />, []);
```

### 2. Lazy Load Icons

```tsx
import dynamic from "next/dynamic";

const Calendar = dynamic(() =>
  import("lucide-react").then((mod) => mod.Calendar)
);
```

---

## ✅ Installation Checklist

- [ ] Install dependencies: `npm install class-variance-authority`
- [ ] Create `EmptyState.tsx` in `components/shared/`
- [ ] Ensure `cn` utility exists in `lib/utils/`
- [ ] Test basic usage
- [ ] Test presets
- [ ] Test with icons
- [ ] Test with actions
- [ ] Verify responsive design

---

## 🎁 Bonus: Custom Presets

You can add your own presets:

```tsx
// In your app
import EmptyState from "@/components/shared/EmptyState";

export const CustomEmptyStates = {
  NoClubs: () => (
    <EmptyState
      title="No clubs found"
      description="Start by adding your first club"
    />
  ),

  NoPlayers: () => (
    <EmptyState
      title="No players registered"
      description="Players will appear here once they register"
    />
  ),
};
```

---

You now have everything you need to use EmptyState throughout your app! 🎉
