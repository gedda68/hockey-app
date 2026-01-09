# 🏆 Standings Component Style Guide

## StandingsTable Component (with CVA)

### Features

- ✅ Year filter with season selection
- ✅ CVA-styled variants
- ✅ Statistics summary
- ✅ Responsive design
- ✅ Empty states

### Usage

```typescript
import StandingsTable from "@/components/standings/StandingsTable";

<StandingsTable
  division={currentDivision}
  selectedDiv="BHL1"
  seasons={seasons}
  selectedYear="2026"
  onYearChange={(year) => console.log(year)}
/>;
```

### Props

| Prop           | Type                     | Default | Description                  |
| -------------- | ------------------------ | ------- | ---------------------------- |
| `division`     | `Division \| null`       | -       | Division data with teams     |
| `selectedDiv`  | `string`                 | -       | Currently selected division  |
| `seasons`      | `Season[]`               | `[]`    | Available seasons for filter |
| `selectedYear` | `string`                 | -       | Currently selected year      |
| `onYearChange` | `(year: string) => void` | -       | Callback when year changes   |

### CVA Variants

```typescript
// Container
standingsContainerVariants();
// "sticky top-8 bg-[#06054e] rounded-3xl p-6 shadow-2xl text-white"

// Table Header
tableHeaderVariants();
// "grid grid-cols-12 items-center px-2 pb-2 border-b border-white/20..."

// Empty State
emptyStateVariants();
// "text-center py-8"
```

---

## StandingsRow Component (with CVA)

### Features

- ✅ Color-coded positions (promotion/relegation zones)
- ✅ Goal difference indicators
- ✅ Hover effects
- ✅ Type-safe variants

### Usage

```typescript
import StandingsRow from "@/components/standings/StandingsRow";

<StandingsRow
  team={team}
  promotionZone={3}
  relegationZone={2}
  totalTeams={10}
/>;
```

### Props

| Prop             | Type     | Default | Description                |
| ---------------- | -------- | ------- | -------------------------- |
| `team`           | `Team`   | -       | Team data                  |
| `promotionZone`  | `number` | `3`     | Number of promotion spots  |
| `relegationZone` | `number` | `2`     | Number of relegation spots |
| `totalTeams`     | `number` | `10`    | Total teams in division    |

### CVA Variants

#### Position Variants

```typescript
positionVariants({ zone: "promotion" }); // Green - Top positions
positionVariants({ zone: "safe" }); // Gray - Mid-table
positionVariants({ zone: "relegation" }); // Red - Bottom positions
```

#### Goal Difference Variants

```typescript
goalDiffVariants({ value: "positive" }); // Green - Positive GD
goalDiffVariants({ value: "zero" }); // Gray - Zero GD
goalDiffVariants({ value: "negative" }); // Red - Negative GD
```

---

## Standings Layout

### Grid System

```
12-column grid:
┌────┬──────────────┬──────┬──────┬──────┐
│ #  │ Team         │  P   │  GD  │ Pts  │
│ 1  │ 5 cols       │ 2    │  2   │  2   │
└────┴──────────────┴──────┴──────┴──────┘
```

### Column Breakdown

- **Position (#)**: 1 column
- **Team Name**: 5 columns (includes logo + name)
- **Played (P)**: 2 columns (centered)
- **Goal Diff (GD)**: 2 columns (centered)
- **Points (Pts)**: 2 columns (right-aligned)

---

## Color System

### Zone Colors

```typescript
// Promotion Zone (Top 3)
"text-green-400"; // Position number

// Safe Zone (Middle)
"text-slate-400"; // Position number

// Relegation Zone (Bottom 2)
"text-red-400"; // Position number
```

### Goal Difference Colors

```typescript
// Positive (+)
"text-green-400";

// Zero (0)
"text-slate-400";

// Negative (-)
"text-red-400";
```

### Background Colors

```typescript
// Container
"bg-[#06054e]"; // Navy blue

// Row default
"bg-white/5"; // Subtle white overlay

// Row hover
"bg-white/10"; // Lighter white overlay

// Points
"text-blue-400"; // Blue highlight
```

---

## Statistics Summary

### Displayed Stats

1. **Teams** - Total number of teams
2. **Matches** - Total games played
3. **Goals** - Total goals scored

### Layout

```typescript
<div className="grid grid-cols-3 gap-4 text-center">
  <div>
    <Text variant="label">Teams</Text>
    <Text className="text-xl font-black">12</Text>
  </div>
  // ... repeat for Matches and Goals
</div>
```

---

## Year Filter

### Design

- White pill buttons on navy background
- Active: White background with navy text
- Inactive: Transparent with white border
- Compact size for space efficiency

### Behavior

```typescript
// Client-side state management
const [currentYear, setCurrentYear] = useState(selectedYear);

const handleYearChange = (year: string) => {
  setCurrentYear(year);
  onYearChange?.(year); // Optional callback
};
```

---

## Responsive Behavior

### Desktop (xl: 1280px+)

- Full 4-column grid with standings sidebar
- Year filter displayed inline
- All columns visible

### Tablet (md: 768px - 1280px)

- Stacked layout
- Standings full-width below matches
- Abbreviated team names

### Mobile (< 768px)

- Compact table
- Smaller font sizes
- Icons may be hidden on very small screens

---

## Empty States

### No Division Selected

```typescript
"Select a division to view standings";
```

### No Data Available

```typescript
"No standings available";
```

### Styling

```typescript
<Text variant="label" className="text-slate-400">
  {emptyMessage}
</Text>
```

---

## Best Practices

### 1. Always Provide Seasons

```typescript
// ✅ Good
<StandingsTable seasons={seasons} selectedYear="2026" />

// ❌ Bad - No year filter shown
<StandingsTable />
```

### 2. Handle Zone Calculations

```typescript
// Configure zones based on league rules
<StandingsRow
  promotionZone={4} // Top 4 promoted
  relegationZone={3} // Bottom 3 relegated
  totalTeams={16} // 16 teams in league
/>
```

### 3. Use Callbacks for Year Changes

```typescript
// Server-side update example
const handleYearChange = (year: string) => {
  router.push(`/standings?year=${year}&div=${selectedDiv}`);
};
```

### 4. Maintain Consistent Styling

```typescript
// Use CVA variants, not custom classes
<div className={positionVariants({ zone })}>{team.pos}</div>
```

---

## Advanced Features

### Custom Sorting

```typescript
// Sort by different criteria
const sortedTeams = [...division.teams].sort((a, b) => {
  return b.pts - a.pts; // By points
  // OR
  return b.goalDifference - a.goalDifference; // By GD
});
```

### Form Guide Integration

```typescript
// Add last 5 results
<div className="flex gap-0.5">
  {team.form.map((result, i) => (
    <Badge
      key={i}
      variant={
        result === "W" ? "success" : result === "L" ? "danger" : "default"
      }
      size="sm"
    >
      {result}
    </Badge>
  ))}
</div>
```

### Team Details Modal

```typescript
// Click to expand team details
<StandingsRow team={team} onClick={() => openTeamModal(team.club)} />
```

---

## Accessibility

### Semantic HTML

```typescript
// Use proper table semantics (if needed)
<table>
  <thead>
    <tr>
      <th scope="col">#</th>
      <th scope="col">Team</th>
      // ...
    </tr>
  </thead>
</table>
```

### ARIA Labels

```typescript
<div
  role="button"
  aria-label={`${team.club} standings information`}
  tabIndex={0}
>
  <StandingsRow team={team} />
</div>
```

### Keyboard Navigation

```typescript
// Add keyboard support
onKeyDown={(e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    handleRowClick(team);
  }
}}
```

---

## Performance Tips

### 1. Memoize Expensive Calculations

```typescript
const sortedTeams = useMemo(() => {
  return [...teams].sort((a, b) => a.pos - b.pos);
}, [teams]);
```

### 2. Virtual Scrolling for Large Lists

```typescript
// For leagues with 20+ teams
import { useVirtualizer } from "@tanstack/react-virtual";
```

### 3. Optimize Image Loading

```typescript
<Image src={team.icon} loading="lazy" placeholder="blur" />
```

---

## Quick Reference

### Common Patterns

```typescript
// Basic standings
<StandingsTable
  division={division}
  selectedDiv="BHL1"
/>

// With year filter
<StandingsTable
  division={division}
  selectedDiv="BHL1"
  seasons={seasons}
  selectedYear="2026"
  onYearChange={handleYearChange}
/>

// Custom zones
<StandingsRow
  team={team}
  promotionZone={6}
  relegationZone={4}
  totalTeams={20}
/>

// Empty state
<StandingsTable
  division={null}
  selectedDiv="All"
/>
```

### Styling Overrides

```typescript
// Custom container styling
<StandingsTable
  className="top-4"  // Different sticky position
/>

// Custom row styling
<StandingsRow
  team={team}
  className="hover:bg-white/20"  // Stronger hover
/>
```

---

## Testing

### Example Tests

```typescript
describe('StandingsTable', () => {
  it('renders year filter when multiple seasons', () => {
    render(<StandingsTable seasons={[...]} />);
    expect(screen.getByText('2025')).toBeInTheDocument();
  });

  it('highlights promotion zone positions', () => {
    render(<StandingsRow team={{ pos: 1, ... }} />);
    expect(screen.getByText('1')).toHaveClass('text-green-400');
  });
});
```

---

## Migration Guide

### From Old to New StandingsTable

**Before:**

```typescript
<div className="sticky top-8 bg-[#06054e] rounded-3xl p-6">
  {division?.teams.map((team) => (
    <div className="grid grid-cols-12">{/* ... */}</div>
  ))}
</div>
```

**After:**

```typescript
<StandingsTable
  division={division}
  selectedDiv={selectedDiv}
  seasons={seasons}
  selectedYear={selectedYear}
/>
```

### From Old to New StandingsRow

**Before:**

```typescript
<div className="grid grid-cols-12 bg-white/5">
  <div className="col-span-1 text-slate-400">{team.pos}</div>
  {/* ... */}
</div>
```

**After:**

```typescript
<StandingsRow team={team} />
```
