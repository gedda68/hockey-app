# 📋 SectionHeader Component - Complete Guide

## 📄 Full Component Code

The SectionHeader component includes **4 variants** for different use cases!

```typescript
import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const sectionHeaderVariants = cva(
  "flex justify-between items-start md:items-center",
  {
    variants: {
      border: {
        none: "",
        bottom: "border-b-2 border-[#06054e] pb-4",
        bottomLight: "border-b-2 border-slate-200 pb-4",
      },
      spacing: {
        none: "",
        sm: "mb-4",
        md: "mb-6",
        lg: "mb-8",
      },
    },
    defaultVariants: {
      border: "bottom",
      spacing: "md",
    },
  }
);

interface SectionHeaderProps
  extends VariantProps<typeof sectionHeaderVariants> {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

// 1. Default SectionHeader
export default function SectionHeader({
  title,
  subtitle,
  action,
  border,
  spacing,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn(sectionHeaderVariants({ border, spacing }), className)}>
      <div className="flex flex-col">
        <h3 className="text-lg font-black uppercase italic text-[#06054e] mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// 2. LargeSectionHeader - For page sections
export function LargeSectionHeader({
  title,
  subtitle,
  action,
  className,
}: Omit<SectionHeaderProps, "border" | "spacing">) {
  return (
    <div
      className={cn(
        "mb-6 pb-6 border-b-2 border-[#06054e] flex flex-col md:flex-row justify-between items-start md:items-center gap-4",
        className
      )}
    >
      <div className="flex flex-col">
        <h2 className="text-3xl font-black uppercase italic text-[#06054e] mb-2">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm font-bold text-slate-500 uppercase tracking-wide">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// 3. CardHeader - For inside white cards
export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: Omit<SectionHeaderProps, "border" | "spacing">) {
  return (
    <div
      className={cn(
        "mb-4 pb-4 border-b border-slate-200 flex justify-between items-center",
        className
      )}
    >
      <div className="flex flex-col">
        <h4 className="text-base font-black uppercase text-slate-900">
          {title}
        </h4>
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// 4. TableHeader - For statistics tables
export function TableHeader({
  title,
  subtitle,
  action,
  className,
}: Omit<SectionHeaderProps, "border" | "spacing">) {
  return (
    <div
      className={cn(
        "mb-6 pb-4 border-b-2 border-[#06054e] flex justify-between items-center",
        className
      )}
    >
      <div className="flex flex-col">
        <h3 className="text-xl font-black uppercase italic text-[#06054e] mb-1">
          {title}
        </h3>
        {subtitle && (
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">
            {subtitle}
          </p>
        )}
      </div>

      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

export { sectionHeaderVariants };
```

---

## 📁 File Location

Save as:

```
components/shared/SectionHeader.tsx
```

---

## 🎯 4 Variants Explained

### **1. SectionHeader (Default)**

- **Use for:** General sections, medium-sized content areas
- **Title size:** text-lg (18px)
- **Border:** Navy (thick)
- **Spacing:** Configurable

### **2. LargeSectionHeader**

- **Use for:** Full page sections, main content areas
- **Title size:** text-3xl (30px)
- **Border:** Navy (thick)
- **Spacing:** mb-6 pb-6

### **3. CardHeader**

- **Use for:** Inside white cards, smaller containers
- **Title size:** text-base (16px)
- **Border:** Light gray (thin)
- **Spacing:** mb-4 pb-4

### **4. TableHeader**

- **Use for:** Statistics tables, data tables
- **Title size:** text-xl (20px)
- **Border:** Navy (thick)
- **Spacing:** mb-6 pb-4

---

## 💡 Usage Examples

### **1. Default SectionHeader**

```tsx
import SectionHeader from "@/components/shared/SectionHeader";

<SectionHeader title="Top Scorers" subtitle="BHL1 · 2025 Season" />;
```

**With action button:**

```tsx
<SectionHeader
  title="Match Results"
  subtitle="Round 5"
  action={
    <button className="px-4 py-2 bg-[#06054e] text-white rounded-full text-xs font-black">
      Export
    </button>
  }
/>
```

**Custom border and spacing:**

```tsx
<SectionHeader
  title="Latest News"
  border="bottomLight"  // Light border
  spacing="lg"          // Large spacing
/>

<SectionHeader
  title="Quick Stats"
  border="none"         // No border
  spacing="sm"          // Small spacing
/>
```

---

### **2. LargeSectionHeader**

For main page sections:

```tsx
import { LargeSectionHeader } from "@/components/shared/SectionHeader";

<LargeSectionHeader title="League Standings" subtitle="2025 Season" />;
```

**With action:**

```tsx
<LargeSectionHeader
  title="Player Statistics"
  subtitle="BHL1 Division"
  action={
    <div className="flex gap-2">
      <button className="px-4 py-2 bg-white border-2 border-[#06054e] text-[#06054e] rounded-full text-sm font-black">
        Filter
      </button>
      <button className="px-4 py-2 bg-[#06054e] text-white rounded-full text-sm font-black">
        Export
      </button>
    </div>
  }
/>
```

---

### **3. CardHeader**

For inside white cards:

```tsx
import { CardHeader } from "@/components/shared/SectionHeader";

<div className="bg-white rounded-3xl p-6">
  <CardHeader title="Recent Matches" subtitle="Last 7 days" />

  {/* Card content */}
  <MatchList matches={recentMatches} />
</div>;
```

**With action:**

```tsx
<div className="bg-white rounded-3xl p-6">
  <CardHeader
    title="Top Scorers"
    action={
      <Link
        href="/statistics"
        className="text-xs font-bold text-[#06054e] hover:underline"
      >
        View All
      </Link>
    }
  />

  {/* Card content */}
  <PlayerList players={topScorers} />
</div>
```

---

### **4. TableHeader**

For data tables:

```tsx
import { TableHeader } from "@/components/shared/SectionHeader";

<div className="bg-white rounded-3xl p-8">
  <TableHeader title="Team Statistics" subtitle="BHL1 · 2025 Season" />

  {/* Table content */}
  <table>{/* ... */}</table>
</div>;
```

**With export button:**

```tsx
<div className="bg-white rounded-3xl p-8">
  <TableHeader
    title="Player Statistics"
    subtitle="All Divisions · Current Season"
    action={
      <button className="px-4 py-2 bg-[#06054e] text-white rounded-full text-xs font-black uppercase flex items-center gap-2">
        <Download className="w-4 h-4" />
        Export CSV
      </button>
    }
  />

  <StatisticsTable data={stats} />
</div>
```

---

## 🎨 Complete Examples

### **Example 1: Statistics Page**

```tsx
import {
  LargeSectionHeader,
  TableHeader,
} from "@/components/shared/SectionHeader";

export default function StatisticsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      {/* Page header */}
      <LargeSectionHeader
        title="Player Statistics"
        subtitle="2025 Season"
        action={
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-white border-2 border-[#06054e] text-[#06054e] rounded-full text-sm font-black">
              Filter
            </button>
            <button className="px-4 py-2 bg-[#06054e] text-white rounded-full text-sm font-black">
              Export
            </button>
          </div>
        }
      />

      {/* Statistics grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        {/* Top Scorers */}
        <div className="bg-white rounded-3xl p-8">
          <TableHeader title="Top Scorers" subtitle="BHL1 · All Matches" />
          <TopScorersTable />
        </div>

        {/* Top Assists */}
        <div className="bg-white rounded-3xl p-8">
          <TableHeader title="Top Assists" subtitle="BHL1 · All Matches" />
          <TopAssistsTable />
        </div>
      </div>
    </div>
  );
}
```

---

### **Example 2: Dashboard with Cards**

```tsx
import { CardHeader } from "@/components/shared/SectionHeader";

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {/* Recent Matches Card */}
      <div className="bg-white rounded-3xl p-6">
        <CardHeader
          title="Recent Matches"
          action={
            <Link href="/matches" className="text-xs font-bold text-[#06054e]">
              View All
            </Link>
          }
        />
        <MatchList matches={recentMatches} limit={5} />
      </div>

      {/* Upcoming Fixtures Card */}
      <div className="bg-white rounded-3xl p-6">
        <CardHeader title="Upcoming Fixtures" subtitle="Next 7 days" />
        <FixtureList fixtures={upcomingFixtures} />
      </div>

      {/* Standings Card */}
      <div className="bg-white rounded-3xl p-6">
        <CardHeader
          title="League Standings"
          subtitle="BHL1"
          action={
            <Link
              href="/standings"
              className="text-xs font-bold text-[#06054e]"
            >
              Full Table
            </Link>
          }
        />
        <StandingsPreview division="BHL1" />
      </div>
    </div>
  );
}
```

---

### **Example 3: Section with Multiple Headers**

```tsx
import SectionHeader from "@/components/shared/SectionHeader";

export default function MatchesPage() {
  return (
    <div>
      {/* Filters section */}
      <SectionHeader title="Filter Matches" border="bottomLight" spacing="sm" />
      <FilterBar />

      {/* Results section */}
      <SectionHeader
        title="Match Results"
        subtitle="BHL1 · Round 5"
        spacing="md"
        action={
          <button className="px-4 py-2 text-xs font-bold text-[#06054e]">
            Export
          </button>
        }
      />
      <MatchList matches={matches} />
    </div>
  );
}
```

---

## 📋 Props Reference

### **SectionHeader (Default)**

| Prop        | Type                                  | Required | Default    | Description         |
| ----------- | ------------------------------------- | -------- | ---------- | ------------------- |
| `title`     | `string`                              | ✅ Yes   | -          | Main heading        |
| `subtitle`  | `string`                              | No       | -          | Supporting text     |
| `action`    | `ReactNode`                           | No       | -          | Button/link element |
| `border`    | `'none' \| 'bottom' \| 'bottomLight'` | No       | `'bottom'` | Border style        |
| `spacing`   | `'none' \| 'sm' \| 'md' \| 'lg'`      | No       | `'md'`     | Bottom margin       |
| `className` | `string`                              | No       | -          | Additional classes  |

### **LargeSectionHeader, CardHeader, TableHeader**

| Prop        | Type        | Required | Description         |
| ----------- | ----------- | -------- | ------------------- |
| `title`     | `string`    | ✅ Yes   | Main heading        |
| `subtitle`  | `string`    | No       | Supporting text     |
| `action`    | `ReactNode` | No       | Button/link element |
| `className` | `string`    | No       | Additional classes  |

---

## 🎨 Visual Comparison

```
┌─────────────────────────────────────────┐
│ LargeSectionHeader (3xl)                │
│ Full page sections                      │
├─────────────────────────────────────────┤
│ TableHeader (xl)                        │
│ Statistics tables                       │
├─────────────────────────────────────────┤
│ SectionHeader (lg)                      │
│ General sections                        │
├─────────────────────────────────────────┤
│ CardHeader (base)                       │
│ Inside cards                            │
└─────────────────────────────────────────┘
```

---

## 🎯 When to Use Each Variant

### **Use SectionHeader for:**

- ✅ General content sections
- ✅ Medium-sized areas
- ✅ Filter sections
- ✅ Content blocks

### **Use LargeSectionHeader for:**

- ✅ Page main headers
- ✅ Full-page sections
- ✅ Major content areas
- ✅ Top-level divisions

### **Use CardHeader for:**

- ✅ Inside white cards
- ✅ Small containers
- ✅ Dashboard widgets
- ✅ Compact sections

### **Use TableHeader for:**

- ✅ Data tables
- ✅ Statistics displays
- ✅ Large tables
- ✅ Complex data sections

---

## 🔧 Customization Examples

### **Remove Border**

```tsx
<SectionHeader title="No Border Section" border="none" />
```

### **Light Border**

```tsx
<SectionHeader title="Light Border" border="bottomLight" />
```

### **Custom Spacing**

```tsx
<SectionHeader
  title="Small Spacing"
  spacing="sm"
/>

<SectionHeader
  title="Large Spacing"
  spacing="lg"
/>

<SectionHeader
  title="No Spacing"
  spacing="none"
/>
```

### **Multiple Actions**

```tsx
<SectionHeader
  title="Multiple Actions"
  action={
    <div className="flex gap-2">
      <button>Filter</button>
      <button>Sort</button>
      <button>Export</button>
    </div>
  }
/>
```

---

## ⚡ Best Practices

### **1. Choose the Right Variant**

```tsx
// ✅ Good - Using appropriate variant
<LargeSectionHeader title="Page Title" />         // For page
<CardHeader title="Card Title" />                 // For card
<TableHeader title="Table Data" />                // For table

// ❌ Bad - Wrong variant
<CardHeader title="Main Page Title" />            // Too small for page
<LargeSectionHeader title="Small Card Title" />   // Too large for card
```

### **2. Keep Titles Concise**

```tsx
// ✅ Good
<SectionHeader title="Top Scorers" />

// ❌ Too verbose
<SectionHeader title="List of Top Goal Scorers in the Competition" />
```

### **3. Use Subtitles for Context**

```tsx
// ✅ Good - Contextual subtitle
<SectionHeader
  title="Match Results"
  subtitle="BHL1 · Round 5 · 2025"
/>

// ❌ Missing context
<SectionHeader title="Match Results" />
```

### **4. Consistent Action Styling**

```tsx
// ✅ Good - Consistent button style
const ActionButton = ({ children }) => (
  <button className="px-4 py-2 bg-[#06054e] text-white rounded-full text-xs font-black">
    {children}
  </button>
);

<SectionHeader title="Data" action={<ActionButton>Export</ActionButton>} />;
```

---

## ✅ Installation Checklist

- [ ] Install dependencies: `npm install class-variance-authority`
- [ ] Create `SectionHeader.tsx` in `components/shared/`
- [ ] Ensure `cn` utility exists in `lib/utils/`
- [ ] Import and test default SectionHeader
- [ ] Test LargeSectionHeader for pages
- [ ] Test CardHeader for cards
- [ ] Test TableHeader for tables
- [ ] Verify responsive behavior
- [ ] Test with actions
- [ ] Test all border/spacing variants

---

You now have 4 powerful header variants for every use case! 🎉
