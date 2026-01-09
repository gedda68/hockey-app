# 📊 Statistics Page Style Guide

## Overview

The Statistics page follows the same design system as the Standings and Matches pages, ensuring a cohesive user experience across the application.

---

## Color Scheme

### Primary Colors

- **Navy Blue**: `#06054e` - Primary brand color, headers, selected states
- **Red**: `#dc2626` (red-600) - Accent color for goals scored, trends up
- **Blue**: `#2563eb` (blue-600) - Accent color for assists, points
- **Green**: `#16a34a` (green-500/600) - Positive trends, goals for
- **Slate Gray**: `slate-50` to `slate-900` - Background and text hierarchy

### Usage Examples

```tsx
// Primary actions
className = "bg-[#06054e] text-white";

// Accent highlights
className = "text-red-600 font-black";

// Background
className = "bg-slate-50";

// Text hierarchy
className = "text-slate-900"; // Primary text
className = "text-slate-600"; // Secondary text
className = "text-slate-400"; // Tertiary/labels
```

---

## Typography

### Font Weights & Sizes

```tsx
// Headers
className = "text-xl font-black uppercase italic";

// Section titles
className = "text-lg font-black uppercase";

// Labels (filters, card titles)
className = "text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]";

// Data values (large)
className = "text-4xl font-black";

// Data values (medium)
className = "text-lg font-black";

// Body text
className = "text-xs font-black"; // Player names
className = "text-xs font-bold"; // Regular content
```

### Font Hierarchy

1. **Font-black**: Headers, data values, key information
2. **Font-bold**: Secondary content, labels
3. **Font-medium**: Subtle text (rarely used)

---

## Component Styling

### StatisticsCard

**Design Pattern**: White rounded card with shadow, hover effect

```tsx
const cardVariants = cva(
  "bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all"
);
```

**Key Features**:

- 32px border radius (`rounded-3xl`)
- Shadow elevation (`shadow-lg`)
- Smooth transitions
- Trend indicators with color coding

**Example**:

```tsx
<StatisticsCard
  title="Total Goals"
  value="342"
  subtitle="Across all matches"
  trend="+12%"
  trendUp={true}
/>
```

---

### TopScorersTable & TopAssistsTable

**Design Pattern**: White rounded container with consistent grid layout

```tsx
// Container
className = "bg-white rounded-3xl p-6 shadow-lg";

// Table Header
className =
  "grid grid-cols-12 items-center px-4 pb-3 border-b-2 border-slate-200 text-[8px] font-black uppercase text-slate-400";

// Rows
className =
  "grid grid-cols-12 items-center px-4 py-3 hover:bg-slate-50 transition-colors rounded-xl";
```

**Grid Layout** (12 columns):

- Column 1: Rank number
- Columns 2-7: Player name & club (6 columns)
- Columns 8-9: Matches played (2 columns, centered)
- Columns 10-12: Goals/Assists (3 columns, right-aligned)

**Rank Colors**:

```tsx
1st place: "text-yellow-500"   // Gold
2nd place: "text-slate-400"    // Silver
3rd place: "text-amber-600"    // Bronze
Others:    "text-slate-600"    // Gray
```

**Example**:

```tsx
<TopScorersTable division="BHL1" year="2025" />
<TopAssistsTable division="BHL1" year="2025" />
```

---

### TeamStatsTable

**Design Pattern**: Full-width table with comprehensive stats

```tsx
// Container
className="bg-white rounded-3xl p-8 shadow-lg"

// Grid layout (12 columns)
# | Team (3) | GF (2) | GA (2) | GD (2) | CS (2)
```

**Stat Colors**:

```tsx
Goals For (GF):     "text-green-600"
Goals Against (GA): "text-red-600"
Goal Diff (GD):     Conditional - green/red/gray
Clean Sheets (CS):  "text-blue-600"
```

---

## Filter Components

### FilterButton Pattern

All filters follow this consistent pattern:

```tsx
<div className="flex flex-col gap-2">
  {/* Label */}
  <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
    Division
  </span>

  {/* Buttons */}
  <div className="flex gap-2 flex-wrap">
    <FilterButton
      href="..."
      isActive={...}
      variant="primary"  // or "secondary"
    >
      BHL1
    </FilterButton>
  </div>
</div>
```

### Filter Variants

**Primary** (Year filter):

```tsx
// Active
className = "bg-red-600 text-white border-red-600 shadow-md";

// Inactive
className = "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]";
```

**Secondary** (Division/Category):

```tsx
// Active
className = "bg-[#06054e] text-white border-[#06054e] shadow-md";

// Inactive
className = "bg-white text-slate-500 border-slate-200 hover:border-[#06054e]";
```

---

## Layout Structure

### Page Layout

```tsx
<div className="min-h-screen bg-slate-50 p-4 md:p-12 w-full font-sans text-slate-900">
  {/* Back Button */}
  <Link className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e]">
    ← Back to Dashboard
  </Link>

  {/* Header Section */}
  <div className="flex flex-col mb-10 border-b-4 border-[#06054e] pb-6">
    <PageHeader title="Competition" highlight="Statistics" />
    {/* Filters */}
  </div>

  {/* Content */}
  <div className="space-y-8">
    {/* Cards Grid */}
    {/* Tables */}
  </div>
</div>
```

### Responsive Grid

```tsx
// 4-column card grid
className = "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6";

// 2-column table grid
className = "grid grid-cols-1 lg:grid-cols-2 gap-8";
```

---

## Border & Shadow System

### Borders

```tsx
// Page section dividers
className = "border-b-4 border-[#06054e]";

// Card/table dividers
className = "border-b-2 border-slate-200";

// Row dividers
className = "border-b border-slate-100";

// Subtle dividers
className = "border-t border-slate-200";
```

### Shadows

```tsx
// Default card shadow
className = "shadow-lg";

// Enhanced on hover
className = "hover:shadow-xl";

// Maximum elevation
className = "shadow-2xl";
```

---

## Border Radius System

### Standardized Radii

```tsx
// Containers & cards
className = "rounded-3xl"; // 32px - Main containers

// Buttons & filters
className = "rounded-full"; // Fully rounded pills

// Rows & interactive elements
className = "rounded-xl"; // 12px - Table rows
className = "rounded-lg"; // 8px - Small elements
```

---

## Spacing System

### Consistent Gaps

```tsx
// Between major sections
className = "space-y-8"; // 32px vertical
className = "gap-8"; // 32px in grids

// Between filters
className = "gap-x-10 gap-y-6"; // 40px horizontal, 24px vertical

// Between form elements
className = "gap-2"; // 8px - Tight grouping
className = "gap-4"; // 16px - Related items
```

### Padding

```tsx
// Page padding
className = "p-4 md:p-12"; // Responsive page edges

// Card padding
className = "p-6"; // Standard cards
className = "p-8"; // Large cards/tables

// Row padding
className = "px-4 py-3"; // Table rows
```

---

## Interactive States

### Hover Effects

```tsx
// Links & buttons
className = "hover:text-[#06054e]";
className = "hover:bg-slate-100";
className = "hover:border-[#06054e]";

// Cards
className = "hover:shadow-xl";

// Rows
className = "hover:bg-slate-50";

// Back button arrow
className = "transition-transform group-hover:-translate-x-1";
```

### Transitions

```tsx
// Standard transition
className = "transition-all";

// Specific transitions
className = "transition-colors";
className = "transition-transform";
className = "transition-shadow";
```

---

## Empty States

### Design Pattern

```tsx
<div className="bg-white rounded-3xl p-8 text-center text-slate-500">
  <p className="text-sm">No data available</p>
  <p className="text-xs mt-2">Check back soon!</p>
</div>
```

**Key Features**:

- Centered text
- Slate-500 color for subtlety
- Two-tier messaging (main + sub)
- Rounded container maintains consistency

---

## Loading States

### Skeleton Pattern

```tsx
<div className="bg-slate-200 rounded animate-pulse">
  {/* Shape matches final content */}
</div>
```

**Common Skeletons**:

```tsx
// Card title
className = "h-2 w-20 bg-slate-200 rounded";

// Card value
className = "h-8 w-16 bg-slate-200 rounded";

// Button
className = "h-8 w-16 bg-slate-200 rounded-full";

// Icon
className = "w-6 h-6 bg-slate-200 rounded-full";
```

---

## Accessibility

### Semantic HTML

```tsx
// Use proper heading hierarchy
<h1>, <h2>, <h3>

// Use semantic elements
<nav>, <main>, <section>

// Add labels
<label htmlFor="...">
```

### ARIA Labels

```tsx
// Interactive elements
aria-label="Filter by division"
role="button"
tabIndex={0}

// Dynamic content
aria-live="polite"
```

---

## Best Practices

### 1. Maintain Consistency

✅ **Do**: Use existing variants and components

```tsx
<FilterButton variant="primary" isActive={true}>
```

❌ **Don't**: Create one-off custom styles

```tsx
<button className="bg-blue-500 text-white px-3">
```

### 2. Follow the Grid

✅ **Do**: Use 12-column grid system

```tsx
<div className="col-span-6">...</div>
```

❌ **Don't**: Use arbitrary widths

```tsx
<div className="w-[45%]">...</div>
```

### 3. Respect the Color Palette

✅ **Do**: Use defined colors

```tsx
className = "text-[#06054e]";
className = "text-red-600";
```

❌ **Don't**: Introduce new colors

```tsx
className = "text-purple-500";
```

### 4. Use CVA for Variants

✅ **Do**: Define variants with class-variance-authority

```tsx
const buttonVariants = cva("base-classes", {
  variants: { size: { sm: "...", lg: "..." } },
});
```

❌ **Don't**: Use inline conditionals everywhere

```tsx
className={isActive ? "style1" : "style2"}
```

---

## Quick Reference

### Common Patterns

```tsx
// Page container
<div className="min-h-screen bg-slate-50 p-4 md:p-12">

// Section divider
<div className="border-b-4 border-[#06054e] pb-6">

// Card
<div className="bg-white rounded-3xl p-6 shadow-lg">

// Filter label
<span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">

// Active button
<button className="bg-[#06054e] text-white rounded-full px-6 py-2">

// Table header
<div className="grid grid-cols-12 text-[8px] font-black uppercase text-slate-400 border-b-2">

// Hover row
<div className="hover:bg-slate-50 transition-colors rounded-xl cursor-pointer">
```

---

## Integration Checklist

When adding the statistics page to your app:

- [ ] Import all required components
- [ ] Set up data fetching functions
- [ ] Configure filter parameters
- [ ] Add loading states
- [ ] Implement error handling
- [ ] Test responsive layouts
- [ ] Verify color consistency
- [ ] Check accessibility
- [ ] Add route to navigation
- [ ] Test all interactive states

---

## File Structure

```
app/competitions/statistics/
├── page.tsx                  # Main statistics page
├── loading.tsx               # Loading state

components/statistics/
├── StatisticsCard.tsx        # Summary cards
├── TopScorersTable.tsx       # Top scorers list
├── TopAssistsTable.tsx       # Top assists list
└── TeamStatsTable.tsx        # Team statistics
```

---

## Example Usage

### Basic Implementation

```tsx
import StatisticsCard from "@/components/statistics/StatisticsCard";
import TopScorersTable from "@/components/statistics/TopScorersTable";

export default function StatisticsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatisticsCard
          title="Total Goals"
          value="342"
          trend="+12%"
          trendUp={true}
        />
      </div>

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <TopScorersTable division="BHL1" year="2025" />
        <TopAssistsTable division="BHL1" year="2025" />
      </div>
    </div>
  );
}
```

---

## Migration from Old Styles

If you have an existing statistics page, here's how to migrate:

### Before

```tsx
<div style={{ backgroundColor: "#f5f5f5", padding: "20px" }}>
  <h1 style={{ color: "#000", fontSize: "24px" }}>Statistics</h1>
</div>
```

### After

```tsx
<div className="min-h-screen bg-slate-50 p-4 md:p-12">
  <PageHeader title="Competition" highlight="Statistics" />
</div>
```

---

This style guide ensures your statistics page maintains visual consistency with the rest of your application!
