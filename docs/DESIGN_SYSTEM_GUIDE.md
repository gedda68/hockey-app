# 🎨 Design System - Complete Guide

## 📦 All Files Overview

Your design system consists of 5 files:

```
lib/design-system/
├── index.ts        ← Exports everything
├── colors.ts       ← 80+ color tokens
├── typography.ts   ← 50+ typography styles
├── spacing.ts      ← 100+ spacing utilities
└── borders.ts      ← Border, shadow, and radius values
```

---

## 📄 1. colors.ts

**80+ color tokens** organized by category.

### **Key Sections:**

- Brand colors (primary navy #06054e, secondary red)
- Functional colors (success, error, warning, info)
- Neutral palette (50-900)
- Zone colors (promotion, safe, relegation)
- Statistics colors (goals, assists, points)
- Rankings (gold, silver, bronze)

### **Usage:**

```tsx
import { colors } from '@/lib/design-system';

// Direct usage
<div className={`bg-[${colors.brand.primary}]`}>

// Helper function
import { getColor } from '@/lib/design-system';
const primaryColor = getColor('brand.primary'); // #06054e
```

---

## 📄 2. typography.ts

**50+ typography classes** for all text elements.

### **Key Sections:**

- Headings (h1-h5)
- Page headers (title, subtitle, section)
- Labels (tiny to large)
- Body text
- Data/statistics display
- Table headers
- Buttons
- Links
- Navigation
- Cards
- Empty/error states
- Forms
- Timestamps

### **Usage:**

```tsx
import { typography } from '@/lib/design-system';

<h1 className={typography.h1}>Page Title</h1>
<p className={typography.body}>Body text</p>
<span className={typography.label}>Label</span>
<button className={typography.button}>Button</button>
```

---

## 📄 3. spacing.ts

**100+ spacing utilities** for layout consistency.

### **Key Sections:**

- Page layout (padding, margin)
- Section spacing
- Card spacing
- Grid/flex gaps
- Filter spacing
- Table spacing
- Form spacing
- Button spacing
- List spacing
- Component-specific (modal, dropdown, navbar, etc.)
- Statistics/standings/match spacing
- Responsive spacing
- Container max widths

### **Usage:**

```tsx
import { spacing } from '@/lib/design-system';

<div className={spacing.pagePadding}>
<div className={spacing.cardPadding}>
<div className={spacing.gridGap}>
<div className={spacing.sectionGap}>
```

---

## 📄 4. borders.ts

**Border, shadow, and radius values** for consistent styling.

### **Key Sections:**

- Border radius (none to 3xl, plus component-specific)
- Border widths (thin to extra thick)
- Border styles (solid, dashed, dotted)
- Border colors (default, primary, secondary, etc.)
- Dividers (section, card, row, subtle)
- Outlines (default, hover, active, error)
- Shadows (sm to 2xl, component-specific)
- Ring/Focus styles
- Gradient borders
- Border combinations (card, button, input, etc.)
- Transitions (colors, shadow, transform, etc.)

### **Usage:**

```tsx
import { borders } from '@/lib/design-system';

<div className={borders.card}>           // rounded-3xl
<button className={borders.button}>      // rounded-full
<div className={borders.shadow.lg}>      // shadow-lg
<div className={borders.focus.default}>  // focus ring
```

---

## 📄 5. index.ts

**Central export** for clean imports.

### **Usage:**

```tsx
// Import everything from one place
import { colors, typography, spacing, borders } from "@/lib/design-system";

// Or import specific items
import { typography, spacing } from "@/lib/design-system";

// Or import types
import type { TypographyKey, SpacingKey } from "@/lib/design-system";
```

---

## 🚀 Complete Usage Examples

### **Example 1: Card Component**

```tsx
import { typography, spacing, borders } from "@/lib/design-system";

export default function Card({ title, children }) {
  return (
    <div
      className={`
      bg-white
      ${borders.card}
      ${borders.cardShadow}
      ${spacing.cardPadding}
    `}
    >
      <h3 className={typography.cardTitle}>{title}</h3>
      <div className={spacing.stackGap}>{children}</div>
    </div>
  );
}
```

---

### **Example 2: Page Layout**

```tsx
import { spacing, typography } from "@/lib/design-system";

export default function MatchesPage() {
  return (
    <div className={`min-h-screen bg-slate-50 ${spacing.pagePadding}`}>
      <h1 className={typography.pageTitle}>Match Results</h1>

      <div className={spacing.sectionGap}>
        <MatchList />
      </div>
    </div>
  );
}
```

---

### **Example 3: Statistics Card**

```tsx
import { typography, spacing, borders, colors } from "@/lib/design-system";

export default function StatCard({ value, label, trend }) {
  return (
    <div
      className={`
      bg-white
      ${borders.card}
      ${borders.cardShadow}
      ${spacing.statsCard.padding}
    `}
    >
      <div
        className={`
        ${typography.statValue}
        text-[${colors.brand.primary}]
      `}
      >
        {value}
      </div>

      <div className={typography.statLabel}>{label}</div>

      {trend && (
        <div
          className={`
          ${typography.statTrend}
          ${
            trend > 0
              ? `text-[${colors.success.DEFAULT}]`
              : `text-[${colors.error.DEFAULT}]`
          }
        `}
        >
          {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}%
        </div>
      )}
    </div>
  );
}
```

---

### **Example 4: Button Component**

```tsx
import { typography, spacing, borders, transitions } from "@/lib/design-system";

export default function Button({ children, variant = "primary" }) {
  return (
    <button
      className={`
      ${borders.button}
      ${spacing.buttonPadding}
      ${typography.button}
      ${borders.buttonShadow}
      ${transitions.colorsNormal}
      ${
        variant === "primary"
          ? "bg-[#06054e] text-white hover:bg-[#06054e]/90"
          : "bg-white text-[#06054e] border-2 border-[#06054e] hover:bg-slate-50"
      }
    `}
    >
      {children}
    </button>
  );
}
```

---

### **Example 5: Table Component**

```tsx
import { typography, spacing, borders } from "@/lib/design-system";

export default function Table({ headers, rows }) {
  return (
    <div className="bg-white ${borders.card} ${spacing.statsTable.padding}">
      {/* Header Row */}
      <div
        className={`
        flex
        ${spacing.tableHeaderPadding}
        ${borders.divider.card}
      `}
      >
        {headers.map((header) => (
          <div key={header} className={typography.tableHeader}>
            {header}
          </div>
        ))}
      </div>

      {/* Data Rows */}
      <div className={spacing.tableGap}>
        {rows.map((row, i) => (
          <div
            key={i}
            className={`
            flex
            ${spacing.tableRowPadding}
            ${borders.element}
            hover:bg-slate-50
            ${transitions.colorsNormal}
          `}
          >
            {row.map((cell, j) => (
              <div key={j} className={typography.body}>
                {cell}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

### **Example 6: Filter Bar**

```tsx
import { typography, spacing, borders } from "@/lib/design-system";

export default function FilterBar({ divisions, onSelect }) {
  return (
    <div
      className={`
      bg-white
      ${borders.card}
      ${spacing.cardPadding}
    `}
    >
      <div className={spacing.filterGap}>
        {/* Filter Label */}
        <div className="flex flex-col gap-2">
          <span className={typography.label}>Division</span>

          {/* Filter Buttons */}
          <div className={spacing.filterButtonGap}>
            {divisions.map((div) => (
              <button
                key={div}
                onClick={() => onSelect(div)}
                className={`
                  ${spacing.buttonPadding}
                  ${borders.button}
                  ${typography.button}
                  ${transitions.allNormal}
                `}
              >
                {div}
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

## 🎯 Quick Reference

### **Colors**

```tsx
import { colors } from "@/lib/design-system";

colors.brand.primary; // #06054e (navy)
colors.brand.secondary; // #dc2626 (red)
colors.success.DEFAULT; // Green
colors.error.DEFAULT; // Red
colors.neutral[500]; // Gray
colors.zones.promotion; // Green 400
colors.stats.goals; // Red 600
```

### **Typography**

```tsx
import { typography } from "@/lib/design-system";

typography.h1; // Page titles
typography.body; // Body text
typography.label; // Small labels
typography.button; // Button text
typography.cardTitle; // Card headers
typography.statValue; // Large numbers
```

### **Spacing**

```tsx
import { spacing } from "@/lib/design-system";

spacing.pagePadding; // p-4 md:p-12
spacing.cardPadding; // p-6
spacing.gridGap; // gap-6
spacing.sectionGap; // space-y-8
spacing.buttonPadding; // px-6 py-2
```

### **Borders**

```tsx
import { borders } from "@/lib/design-system";

borders.card; // rounded-3xl
borders.button; // rounded-full
borders.shadow.lg; // shadow-lg
borders.divider.section; // border-b-4 border-[#06054e]
borders.focus.default; // focus ring styles
```

---

## ✅ Benefits

### **Before Design System:**

- ❌ Hardcoded values everywhere
- ❌ Inconsistent styling
- ❌ Hard to maintain
- ❌ No single source of truth

### **After Design System:**

- ✅ Consistent design tokens
- ✅ Easy to update globally
- ✅ Type-safe with TypeScript
- ✅ Autocomplete in IDE
- ✅ Maintainable and scalable

---

## 📦 File Structure

```
lib/design-system/
├── index.ts          ← Import from here
├── colors.ts         ← 80+ color tokens
├── typography.ts     ← 50+ typography styles
├── spacing.ts        ← 100+ spacing utilities
└── borders.ts        ← Border/shadow/radius values
```

---

## 🎁 Pro Tips

### **1. Always Import from Index**

```tsx
// ✅ Good
import { colors, typography } from "@/lib/design-system";

// ❌ Bad
import { colors } from "@/lib/design-system/colors";
import { typography } from "@/lib/design-system/typography";
```

### **2. Combine Design Tokens**

```tsx
const cardStyles = `
  ${borders.card}
  ${borders.cardShadow}
  ${spacing.cardPadding}
  bg-white
`;

<div className={cardStyles}>
```

### **3. Create Component Variants**

```tsx
const buttonVariants = {
  primary: `${borders.button} ${spacing.buttonPadding} bg-[#06054e] text-white`,
  secondary: `${borders.button} ${spacing.buttonPadding} bg-white border-2 border-[#06054e]`,
};

<button className={buttonVariants.primary}>
```

### **4. Use Helper Functions**

```tsx
import { getColor, withTypography, withSpacing } from "@/lib/design-system";

const primaryColor = getColor("brand.primary");
const headingClass = withTypography(typography.h1, "text-red-600");
const sectionClass = withSpacing(spacing.sectionGap, "mt-8");
```

---

**You now have a complete, professional design system!** 🎨✨
