# 🎛️ FilterButton Component - Usage Guide

## 📦 Component Code

The FilterButton component is already created! Here's what it does:

### Features

- ✅ Two variants: `primary` (red) and `secondary` (navy)
- ✅ Active/inactive states
- ✅ Smooth transitions
- ✅ Consistent with design system
- ✅ Built with CVA (Class Variance Authority)

---

## 📁 File Location

Save `FilterButton.tsx` to:

```
components/filters/FilterButton.tsx
```

Or if you prefer:

```
components/shared/FilterButton.tsx
```

---

## 🎨 Visual Design

### Primary Variant (Red)

```
Active:   Red background, white text, shadow
Inactive: White background, gray text, hover effect
```

### Secondary Variant (Navy)

```
Active:   Navy background, white text, shadow
Inactive: White background, gray text, hover effect
```

---

## 💡 Usage Examples

### Basic Usage

```tsx
import FilterButton from "@/components/filters/FilterButton";

<FilterButton href="/matches?div=BHL1" isActive={selectedDiv === "BHL1"}>
  BHL1
</FilterButton>;
```

### Primary Variant (for Year/Season filters)

```tsx
<FilterButton
  href="/matches?year=2025"
  variant="primary"
  isActive={selectedYear === "2025"}
>
  2025
</FilterButton>
```

### Secondary Variant (for Division/Category filters)

```tsx
<FilterButton
  href="/matches?div=BHL2"
  variant="secondary"
  isActive={selectedDiv === "BHL2"}
>
  BHL2
</FilterButton>
```

### With Custom Classes

```tsx
<FilterButton
  href="/matches?status=Live"
  isActive={status === "Live"}
  className="w-full" // Make it full width
>
  Live Matches
</FilterButton>
```

---

## 🔧 Complete Filter Bar Example

Here's how to use FilterButton in a filter group:

```tsx
import FilterButton from "@/components/filters/FilterButton";

export default function MatchFilters({
  selectedYear,
  selectedDiv,
  selectedStatus,
}) {
  return (
    <div className="flex flex-wrap gap-x-10 gap-y-6">
      {/* Season Filter - Primary Variant */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
          Season
        </span>
        <div className="flex gap-2">
          <FilterButton
            href="/matches?year=2024"
            variant="primary"
            isActive={selectedYear === "2024"}
          >
            2024
          </FilterButton>
          <FilterButton
            href="/matches?year=2025"
            variant="primary"
            isActive={selectedYear === "2025"}
          >
            2025
          </FilterButton>
          <FilterButton
            href="/matches?year=2026"
            variant="primary"
            isActive={selectedYear === "2026"}
          >
            2026
          </FilterButton>
        </div>
      </div>

      {/* Division Filter - Secondary Variant */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
          Division
        </span>
        <div className="flex gap-2 flex-wrap">
          <FilterButton
            href="/matches?div=All"
            variant="secondary"
            isActive={selectedDiv === "All"}
          >
            All
          </FilterButton>
          <FilterButton
            href="/matches?div=BHL1"
            variant="secondary"
            isActive={selectedDiv === "BHL1"}
          >
            BHL1
          </FilterButton>
          <FilterButton
            href="/matches?div=BHL2"
            variant="secondary"
            isActive={selectedDiv === "BHL2"}
          >
            BHL2
          </FilterButton>
        </div>
      </div>

      {/* Status Filter - Secondary Variant */}
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
          Status
        </span>
        <div className="flex gap-2">
          <FilterButton
            href="/matches?status=All"
            variant="secondary"
            isActive={selectedStatus === "All"}
          >
            All
          </FilterButton>
          <FilterButton
            href="/matches?status=Live"
            variant="secondary"
            isActive={selectedStatus === "Live"}
          >
            Live
          </FilterButton>
          <FilterButton
            href="/matches?status=Final"
            variant="secondary"
            isActive={selectedStatus === "Final"}
          >
            Final
          </FilterButton>
        </div>
      </div>
    </div>
  );
}
```

---

## 🎨 Styling Details

### Colors

**Primary Variant:**

- Active: `bg-red-600` + `text-white` + `border-red-600`
- Inactive: `bg-white` + `text-slate-500` + `border-slate-200`
- Hover: `hover:border-[#06054e]`

**Secondary Variant:**

- Active: `bg-[#06054e]` + `text-white` + `border-[#06054e]`
- Inactive: `bg-white` + `text-slate-500` + `border-slate-200`
- Hover: `hover:border-[#06054e]`

### Typography

- Font: `font-black` (900 weight)
- Size: `text-[10px]`
- Transform: `uppercase`

### Spacing

- Padding: `px-4 py-2` (16px horizontal, 8px vertical)
- Border radius: `rounded-full` (fully rounded pill shape)

---

## 🔄 Dynamic Filter Example

Using with URL parameters:

```tsx
"use client";

import { useSearchParams } from "next/navigation";
import FilterButton from "@/components/filters/FilterButton";

export default function DynamicFilters() {
  const searchParams = useSearchParams();
  const division = searchParams.get("div") || "All";

  const divisions = ["All", "BHL1", "BHL2", "PLM", "PL1", "PL2"];

  return (
    <div className="flex gap-2">
      {divisions.map((div) => (
        <FilterButton
          key={div}
          href={`/matches?div=${div}`}
          isActive={division === div}
        >
          {div}
        </FilterButton>
      ))}
    </div>
  );
}
```

---

## 📋 Props Reference

| Prop        | Type                       | Required | Default       | Description            |
| ----------- | -------------------------- | -------- | ------------- | ---------------------- |
| `href`      | `string`                   | ✅ Yes   | -             | Link destination       |
| `children`  | `ReactNode`                | ✅ Yes   | -             | Button content         |
| `variant`   | `'primary' \| 'secondary'` | No       | `'secondary'` | Button style variant   |
| `isActive`  | `boolean`                  | No       | `false`       | Active state           |
| `className` | `string`                   | No       | -             | Additional CSS classes |

---

## 🎯 When to Use Each Variant

### Use `primary` for:

- ✅ Year/Season filters
- ✅ Time-based filters
- ✅ Primary navigation options

### Use `secondary` for:

- ✅ Division filters
- ✅ Category filters
- ✅ Status filters
- ✅ Most filter buttons

---

## ⚡ Performance Tips

### 1. Memoize Filter Lists

```tsx
import { useMemo } from "react";

const divisions = useMemo(() => ["All", "BHL1", "BHL2"], []);
```

### 2. Use Server Components When Possible

```tsx
// This is a server component (no 'use client')
export default async function Filters({ division }) {
  return (
    <FilterButton href={`/matches?div=${division}`}>{division}</FilterButton>
  );
}
```

---

## 🐛 Troubleshooting

### Issue: Styles not applying

**Check:**

1. Is `cn` utility installed?
2. Is Tailwind configured correctly?
3. Are the component classes purged?

### Issue: Links not working

**Check:**

1. Is Next.js Link imported?
2. Are href values correct?
3. Is routing set up properly?

### Issue: Active state not showing

**Check:**

1. Is `isActive` prop set correctly?
2. Is the comparison logic right? (e.g., `selectedDiv === div`)

---

## ✅ Complete Implementation Checklist

- [ ] Install dependencies: `npm install class-variance-authority`
- [ ] Create `FilterButton.tsx` in `components/filters/`
- [ ] Ensure `cn` utility exists in `lib/utils/`
- [ ] Import in your filter components
- [ ] Test primary variant (year filters)
- [ ] Test secondary variant (division filters)
- [ ] Verify active states work
- [ ] Test responsive layout
- [ ] Check accessibility (keyboard navigation)

---

## 🎁 Bonus: Accessibility

The component automatically handles:

- ✅ Semantic link elements
- ✅ Keyboard navigation (Tab, Enter)
- ✅ Clear visual states

For enhanced accessibility, consider:

```tsx
<FilterButton
  href="/matches?div=BHL1"
  isActive={div === "BHL1"}
  aria-label="Filter by BHL1 division"
  aria-current={div === "BHL1" ? "page" : undefined}
>
  BHL1
</FilterButton>
```

---

## 📚 Related Components

- **FilterBar** - Container for filter groups
- **FilterGroup** - Groups related filters
- **FilterSelect** - Dropdown filter alternative

---

You now have everything you need to use FilterButton throughout your app! 🎉
