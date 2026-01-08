# 🎨 Hockey App Style Guide

## CVA (Class Variance Authority) Implementation

This project uses CVA for consistent, type-safe component styling.

## 📦 Installation

Already installed:

```bash
npm install class-variance-authority clsx tailwind-merge
```

## 🛠️ Core Utilities

### `lib/utils.ts` - cn() helper

```typescript
import { cn } from "@/lib/utils";

// Merge classes safely
<div
  className={cn("base-class", conditional && "conditional-class", className)}
/>;
```

## 🎨 UI Components

### Button Component

```typescript
import Button from "@/components/ui/Button";

// Usage examples
<Button variant="primary" size="md">Primary Button</Button>
<Button variant="secondary" size="lg">Secondary Button</Button>
<Button variant="outline" size="sm">Outline Button</Button>
<Button variant="ghost">Ghost Button</Button>
<Button variant="active">Active Button</Button>
```

**Variants:**

- `primary` - Dark blue (#06054e)
- `secondary` - Red (#ef4444)
- `outline` - White with border
- `ghost` - Transparent
- `active` - Red with shadow (active state)

**Sizes:**

- `sm` - Small (h-7, text-[9px])
- `md` - Medium (h-9, text-[10px]) - default
- `lg` - Large (h-11, text-xs)

---

### Badge Component

```typescript
import Badge from "@/components/ui/Badge";

// Usage examples
<Badge variant="default">Default</Badge>
<Badge variant="primary">Primary</Badge>
<Badge variant="secondary">Secondary</Badge>
<Badge variant="success">Success</Badge>
<Badge variant="warning">Warning</Badge>
<Badge variant="danger">Danger</Badge>
<Badge variant="outline" size="lg">Outline</Badge>
```

**Variants:**

- `default` - Slate gray
- `primary` - Dark blue
- `secondary` - Red
- `success` - Green
- `warning` - Yellow
- `danger` - Red
- `outline` - White with border
- `ghost` - Transparent

**Sizes:**

- `sm` - Small (text-[8px])
- `md` - Medium (text-[10px]) - default
- `lg` - Large (text-xs)

---

### Card Component

```typescript
import Card from "@/components/ui/Card";

// Usage examples
<Card variant="default">Default Card</Card>
<Card variant="elevated">Elevated Card</Card>
<Card variant="outline">Outline Card</Card>
<Card variant="ghost">Ghost Card</Card>
<Card interactive>Interactive Card</Card>
<Card rounded="lg">Large Rounded</Card>
```

**Variants:**

- `default` - Shadow with hover effect
- `elevated` - Heavy shadow with thick border
- `outline` - Border only
- `ghost` - No shadow

**Rounded:**

- `default` - rounded-[32px]
- `lg` - rounded-[40px]
- `sm` - rounded-2xl
- `none` - No rounding

**Interactive:**

- `true` - Adds cursor pointer
- `false` - Default (no pointer)

---

### Text Component

```typescript
import Text from "@/components/ui/Text";

// Usage examples
<Text variant="h1">Main Heading</Text>
<Text variant="h2">Subheading</Text>
<Text variant="body">Body text</Text>
<Text variant="small">Small text</Text>
<Text variant="label">Label Text</Text>
<Text variant="muted">Muted text</Text>
<Text as="span" variant="tiny">Tiny span</Text>
```

**Variants:**

- `h1` - 4xl, black, uppercase, italic
- `h2` - 2xl, black, uppercase, italic
- `h3` - xl, black, uppercase, italic
- `h4` - lg, black, uppercase
- `body` - Base size, slate-900
- `small` - sm, slate-600
- `tiny` - xs, slate-500
- `label` - [10px], uppercase, slate-400, wide tracking
- `muted` - slate-400

**Align:**

- `left` - Default
- `center`
- `right`

**As (HTML element):**

- `p`, `span`, `div`, `label`, `h1-h6`

---

### FilterButton Component

```typescript
import FilterButton from "@/components/shared/FilterButton";

// Usage examples
<FilterButton href="/path" isActive={true} variant="primary">
  Filter
</FilterButton>;
```

**Variants:**

- `primary` - Blue when active, white when inactive
- `secondary` - Red when active, white when inactive
- `status` - Same as secondary

**Active states automatically handled by `isActive` prop**

---

## 🎯 Color System

### Primary Colors

- **Navy Blue**: `#06054e` - Primary brand color
- **Red**: `#ef4444` / `red-600` - Secondary/accent color

### Neutral Colors

- **Slate 50**: `#f8fafc` - Backgrounds
- **Slate 100**: `#f1f5f9` - Light backgrounds
- **Slate 200**: `#e2e8f0` - Borders
- **Slate 400**: `#94a3b8` - Muted text
- **Slate 500**: `#64748b` - Secondary text
- **Slate 600**: `#475569` - Body text
- **Slate 900**: `#0f172a` - Headings

### Status Colors

- **Green 600**: `#16a34a` - Success
- **Yellow 600**: `#ca8a04` - Warning
- **Red 600**: `#dc2626` - Error/Danger
- **Blue 600**: `#2563eb` - Info

---

## 📏 Typography Scale

### Font Sizes

```typescript
"text-[7px]"; // Smallest labels
"text-[8px]"; // Small badges
"text-[9px]"; // Small buttons
"text-[10px]"; // Standard labels/buttons
"text-[11px]"; // Small body text
"text-xs"; // 12px - Large badges
"text-sm"; // 14px - Secondary text
"text-base"; // 16px - Body text
"text-lg"; // 18px - H4
"text-xl"; // 20px - H3
"text-2xl"; // 24px - H2
"text-4xl"; // 36px - H1
"text-5xl"; // 48px - Scores
```

### Font Weights

- **font-bold** (700) - Secondary emphasis
- **font-black** (900) - Primary emphasis, headings

### Letter Spacing

```typescript
"tracking-tighter"; // Headings
"tracking-tight"; // Subheadings
"tracking-widest"; // Buttons
"tracking-[0.2em]"; // Labels
```

---

## 🎭 Component Patterns

### Pattern 1: Interactive Card

```typescript
<Card variant="default" interactive className="p-6 group">
  <div className="group-hover:scale-105 transition-transform">
    {/* Content */}
  </div>
</Card>
```

### Pattern 2: Status Badge

```typescript
<Badge variant={status === "active" ? "success" : "danger"} size="sm">
  {status}
</Badge>
```

### Pattern 3: Filter Bar

```typescript
<div className="flex gap-2 flex-wrap">
  {filters.map((filter) => (
    <FilterButton
      key={filter.id}
      href={filter.href}
      isActive={filter.id === activeFilter}
      variant="primary"
    >
      {filter.label}
    </FilterButton>
  ))}
</div>
```

### Pattern 4: Responsive Layout

```typescript
<div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
  <div className="xl:col-span-8">{/* Main content */}</div>
  <div className="xl:col-span-4">{/* Sidebar */}</div>
</div>
```

---

## 🔧 Customization

### Extending Button Variants

```typescript
// In components/ui/Button.tsx
const buttonVariants = cva("base-classes", {
  variants: {
    variant: {
      // Add new variant
      custom: "bg-purple-600 text-white hover:bg-purple-700",
    },
  },
});
```

### Compound Variants (Complex Logic)

```typescript
const componentVariants = cva("base", {
  variants: {
    size: { sm: "text-sm", lg: "text-lg" },
    color: { blue: "text-blue-600", red: "text-red-600" },
  },
  compoundVariants: [
    {
      size: "lg",
      color: "blue",
      className: "font-bold", // Only applies when BOTH conditions met
    },
  ],
});
```

---

## 📱 Responsive Patterns

### Mobile-First Approach

```typescript
// Default is mobile, then add breakpoints
className = "flex-col md:flex-row"; // Stack on mobile, row on desktop
className = "text-sm md:text-lg"; // Smaller text on mobile
className = "p-4 md:p-12"; // Less padding on mobile
```

### Breakpoints

- `sm:` - 640px
- `md:` - 768px
- `lg:` - 1024px
- `xl:` - 1280px
- `2xl:` - 1536px

---

## ✨ Best Practices

### 1. Always Use cn() for Class Merging

```typescript
// ❌ Bad
className={`base-class ${conditional ? "active" : ""} ${className}`}

// ✅ Good
className={cn("base-class", conditional && "active", className)}
```

### 2. Use CVA for Reusable Components

```typescript
// ❌ Bad - Inline styles
<button className={isActive ? "bg-blue-600 ..." : "bg-gray-600 ..."}>

// ✅ Good - CVA variants
<Button variant={isActive ? "primary" : "outline"}>
```

### 3. Prefer UI Components Over Raw HTML

```typescript
// ❌ Bad
<div className="bg-white rounded-[32px] p-6 shadow-sm">

// ✅ Good
<Card variant="default" className="p-6">
```

### 4. Type-Safe Props

```typescript
// CVA provides TypeScript autocompletion
<Button
  variant="primary" // ✅ Autocomplete works
  size="md" // ✅ Type-safe
/>
```

### 5. Consistent Spacing

```typescript
// Use Tailwind's spacing scale
"gap-2"; // 0.5rem (8px)
"gap-4"; // 1rem (16px)
"gap-6"; // 1.5rem (24px)
"gap-10"; // 2.5rem (40px)
```

---

## 🎨 Design Tokens

### Shadows

```typescript
"shadow-sm"; // Subtle
"shadow-md"; // Medium
"shadow-lg"; // Large
"shadow-xl"; // Extra large
"shadow-2xl"; // Maximum
```

### Transitions

```typescript
"transition-all"; // All properties
"transition-colors"; // Colors only
"transition-transform"; // Transform only
"duration-150"; // 150ms
"duration-300"; // 300ms
```

### Hover States

```typescript
"hover:shadow-xl";
"hover:border-[#06054e]";
"hover:bg-slate-50";
"group-hover:scale-105"; // Child responds to parent hover
```

---

## 📦 File Structure

```
components/
├── ui/
│   ├── Button.tsx       # Base button with CVA
│   ├── Badge.tsx        # Badge component
│   ├── Card.tsx         # Card wrapper
│   └── Text.tsx         # Typography component
├── shared/
│   ├── FilterButton.tsx # Filter-specific button
│   └── PageHeader.tsx   # Page title component
└── matches/
    └── MatchCard.tsx    # Uses UI components
```

---

## 🚀 Quick Reference

### Import Pattern

```typescript
// UI Components
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Card from "@/components/ui/Card";
import Text from "@/components/ui/Text";

// Utilities
import { cn } from "@/lib/utils";
```

### Common Combinations

```typescript
// Primary CTA Button
<Button variant="secondary" size="lg">Click Me</Button>

// Filter Chip
<FilterButton variant="primary" isActive={true} href="/filter">
  Filter Name
</FilterButton>

// Status Indicator
<Badge variant="success" size="sm">Active</Badge>

// Interactive Card
<Card variant="default" interactive>Content</Card>

// Section Label
<Text variant="label">Section Label</Text>
```

---

## 💡 Pro Tips

1. **Use variants over custom classes** when possible
2. **Extend CVA components** for project-specific needs
3. **Keep base styles in CVA**, overrides in className
4. **Document new variants** as you add them
5. **Consistent naming** for similar variants across components

---

## 🔗 Resources

- [CVA Documentation](https://cva.style/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [clsx](https://github.com/lukeed/clsx)
- [tailwind-merge](https://github.com/dcastil/tailwind-merge)
