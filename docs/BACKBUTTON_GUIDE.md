# ← BackButton Component - Complete Guide

## 📄 Full Component Code

The BackButton component includes **2 variants**:

1. **BackButton** - Default (with arrow character ←)
2. **BackButtonWithIcon** - Alternative (with lucide-react icon)

```typescript
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface BackButtonProps {
  href: string;
  label?: string;
  className?: string;
  showArrow?: boolean;
}

/**
 * BackButton Component
 *
 * Standardized back navigation button used across all pages.
 * Eliminates duplication of back button code.
 *
 * @example
 * <BackButton href="/competitions" />
 * <BackButton href="/dashboard" label="Back to Home" />
 */
export default function BackButton({
  href,
  label = "Back to Dashboard",
  className = "",
  showArrow = true,
}: BackButtonProps) {
  return (
    <Link
      href={href}
      className={`text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group transition-colors ${className}`}
    >
      {showArrow && (
        <span className="transition-transform group-hover:-translate-x-1">
          ←
        </span>
      )}
      {label}
    </Link>
  );
}

// Alternative with lucide-react icon
export function BackButtonWithIcon({
  href,
  label = "Back to Dashboard",
  className = "",
}: Omit<BackButtonProps, "showArrow">) {
  return (
    <Link
      href={href}
      className={`text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group transition-colors ${className}`}
    >
      <ArrowLeft className="w-3 h-3 transition-transform group-hover:-translate-x-1" />
      {label}
    </Link>
  );
}
```

---

## 📁 File Location

Save as:

```
components/layout/BackButton.tsx
```

---

## 🎯 Why Use BackButton?

### **Before (Duplicated Code):**

```tsx
// Repeated on EVERY page - 10+ times!
<Link
  href="/competitions"
  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group transition-colors"
>
  <span className="transition-transform group-hover:-translate-x-1">←</span>
  Back to Dashboard
</Link>
```

### **After (One Line):**

```tsx
<BackButton href="/competitions" />
```

**Result:** ~200 lines of duplicate code eliminated! ✨

---

## 💡 Usage Examples

### **1. Basic Usage (Default Label)**

```tsx
import BackButton from "@/components/layout/BackButton";

export default function MatchesPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <BackButton href="/competitions" />

      <h1>Matches</h1>
      {/* Page content */}
    </div>
  );
}
```

**Displays:** `← BACK TO DASHBOARD`

---

### **2. Custom Label**

```tsx
<BackButton href="/competitions" label="Back to Competitions" />
```

**Displays:** `← BACK TO COMPETITIONS`

---

### **3. Different Routes**

```tsx
// Back to home
<BackButton href="/" label="Back to Home" />

// Back to competitions
<BackButton href="/competitions" label="Back to Competitions" />

// Back to matches
<BackButton href="/matches" label="Back to Matches" />

// Back to standings
<BackButton href="/standings" label="Back to Standings" />
```

---

### **4. Without Arrow**

```tsx
<BackButton
  href="/competitions"
  showArrow={false}
  label="Return to Dashboard"
/>
```

**Displays:** `RETURN TO DASHBOARD` (no arrow)

---

### **5. With Custom Styling**

```tsx
<BackButton
  href="/competitions"
  className="mb-8"  // Add margin-bottom
/>

<BackButton
  href="/competitions"
  className="text-red-600"  // Change color
/>
```

---

### **6. Using Icon Variant**

```tsx
import { BackButtonWithIcon } from "@/components/layout/BackButton";

<BackButtonWithIcon href="/competitions" label="Back to Competitions" />;
```

Uses lucide-react `<ArrowLeft>` icon instead of text arrow.

---

## 🎨 Complete Page Examples

### **Example 1: Matches Page**

```tsx
import BackButton from "@/components/layout/BackButton";
import Container from "@/components/layout/Container";

export default function MatchesPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <Container>
        {/* Back button at top of page */}
        <BackButton href="/competitions" />

        <h1 className="text-4xl font-black uppercase italic text-[#06054e] mt-6 mb-8">
          Match Results
        </h1>

        {/* Page content */}
        <MatchList />
      </Container>
    </div>
  );
}
```

---

### **Example 2: Standings Page**

```tsx
import BackButton from "@/components/layout/BackButton";

export default function StandingsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <BackButton href="/competitions" label="Back to Competitions" />

      <h1 className="text-4xl font-black uppercase italic text-[#06054e] mt-6 mb-8">
        League Standings
      </h1>

      <StandingsTable />
    </div>
  );
}
```

---

### **Example 3: Statistics Page**

```tsx
import BackButton from "@/components/layout/BackButton";
import { LargeSectionHeader } from "@/components/shared/SectionHeader";

export default function StatisticsPage() {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <BackButton href="/competitions" />

      <div className="mt-6">
        <LargeSectionHeader title="Player Statistics" subtitle="2025 Season" />
      </div>

      <StatisticsTables />
    </div>
  );
}
```

---

### **Example 4: Club Detail Page**

```tsx
import BackButton from "@/components/layout/BackButton";

export default function ClubDetailPage({ params }) {
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-12">
      <BackButton href="/clubs" label="Back to Clubs" />

      <div className="mt-6">
        <h1 className="text-4xl font-black uppercase italic text-[#06054e]">
          {params.clubName}
        </h1>
      </div>

      <ClubDetails club={params.clubName} />
    </div>
  );
}
```

---

## 🎨 Visual Design

### **Default State:**

```
← BACK TO DASHBOARD
```

- Color: `text-slate-400` (gray)
- Font: `font-black` (900 weight)
- Size: `text-[10px]`
- Transform: `uppercase`
- Letter spacing: `tracking-widest`

### **Hover State:**

```
← BACK TO DASHBOARD
```

- Color changes: `text-slate-400` → `text-[#06054e]` (navy)
- Arrow moves left: `translate-x-0` → `-translate-x-1`
- Smooth transition: `transition-colors`, `transition-transform`

---

## 📋 Props Reference

### **BackButton**

| Prop        | Type      | Required | Default               | Description            |
| ----------- | --------- | -------- | --------------------- | ---------------------- |
| `href`      | `string`  | ✅ Yes   | -                     | Destination URL        |
| `label`     | `string`  | No       | `"Back to Dashboard"` | Button text            |
| `className` | `string`  | No       | `""`                  | Additional CSS classes |
| `showArrow` | `boolean` | No       | `true`                | Show/hide arrow        |

### **BackButtonWithIcon**

| Prop        | Type     | Required | Default               | Description            |
| ----------- | -------- | -------- | --------------------- | ---------------------- |
| `href`      | `string` | ✅ Yes   | -                     | Destination URL        |
| `label`     | `string` | No       | `"Back to Dashboard"` | Button text            |
| `className` | `string` | No       | `""`                  | Additional CSS classes |

---

## 🔧 Customization Examples

### **Different Colors**

```tsx
// Red
<BackButton
  href="/competitions"
  className="text-red-600 hover:text-red-800"
/>

// Blue
<BackButton
  href="/competitions"
  className="text-blue-600 hover:text-blue-800"
/>

// Green
<BackButton
  href="/competitions"
  className="text-green-600 hover:text-green-800"
/>
```

---

### **Different Sizes**

```tsx
// Larger
<BackButton
  href="/competitions"
  className="text-sm"  // Instead of text-[10px]
/>

// Smaller
<BackButton
  href="/competitions"
  className="text-[8px]"
/>
```

---

### **With Margin**

```tsx
// Bottom margin
<BackButton
  href="/competitions"
  className="mb-6"
/>

// Top and bottom margin
<BackButton
  href="/competitions"
  className="my-8"
/>
```

---

### **Centered**

```tsx
<div className="flex justify-center">
  <BackButton href="/competitions" />
</div>
```

---

### **With Icon from lucide-react**

```tsx
import { BackButtonWithIcon } from "@/components/layout/BackButton";

<BackButtonWithIcon href="/competitions" label="Back to Competitions" />;
```

---

## 🎯 Common Use Cases

### **1. After Login/Signup**

```tsx
<BackButton href="/" label="Back to Home" />
```

---

### **2. Error Pages**

```tsx
<BackButton href="/" label="Back to Safety" />
```

---

### **3. Nested Routes**

```tsx
// In /competitions/matches
<BackButton
  href="/competitions"
  label="Back to Competitions"
/>

// In /clubs/[slug]
<BackButton
  href="/clubs"
  label="Back to Clubs"
/>

// In /clubs/[slug]/contact
<BackButton
  href={`/clubs/${slug}`}
  label="Back to Club"
/>
```

---

### **4. Dynamic Routes**

```tsx
export default function PlayerDetailPage({ params }) {
  return (
    <div>
      <BackButton
        href={`/teams/${params.teamId}`}
        label={`Back to ${params.teamName}`}
      />

      {/* Player details */}
    </div>
  );
}
```

---

## 🚀 Migration Example

### **Before (Old Code):**

```tsx
// app/(website)/matches/page.tsx
<Link
  href="/competitions"
  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group transition-colors"
>
  <span className="transition-transform group-hover:-translate-x-1">
    ←
  </span>
  Back to Dashboard
</Link>

// app/(website)/standings/page.tsx
<Link
  href="/competitions"
  className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group transition-colors"
>
  <span className="transition-transform group-hover:-translate-x-1">
    ←
  </span>
  Back to Dashboard
</Link>

// ... repeated 10+ more times
```

---

### **After (New Code):**

```tsx
// app/(website)/matches/page.tsx
import BackButton from "@/components/layout/BackButton";

<BackButton href="/competitions" />;

// app/(website)/standings/page.tsx
import BackButton from "@/components/layout/BackButton";

<BackButton href="/competitions" />;

// ... everywhere else
```

**Result:**

- ✅ 200+ lines of code removed
- ✅ Consistent styling everywhere
- ✅ Easy to update (change once, updates everywhere)

---

## 🎨 Styling Details

### **Typography:**

- Font weight: `font-black` (900)
- Font size: `text-[10px]`
- Text transform: `uppercase`
- Letter spacing: `tracking-widest`

### **Colors:**

- Default: `text-slate-400`
- Hover: `text-[#06054e]` (navy)

### **Animation:**

- Arrow slides left on hover: `-translate-x-1`
- Color transition: `transition-colors`
- Transform transition: `transition-transform`

### **Layout:**

- Display: `flex`
- Align items: `items-center`
- Gap: `gap-2` (8px between arrow and text)

---

## ✅ Best Practices

### **1. Consistent Labeling**

```tsx
// ✅ Good - Descriptive
<BackButton href="/competitions" label="Back to Competitions" />

// ❌ Vague
<BackButton href="/competitions" label="Back" />
```

---

### **2. Always Provide href**

```tsx
// ✅ Good
<BackButton href="/competitions" />

// ❌ Bad - href is required
<BackButton />  // TypeScript error!
```

---

### **3. Use Default Label When Appropriate**

```tsx
// ✅ Good - Default is fine
<BackButton href="/competitions" />
// Shows: "← BACK TO DASHBOARD"

// ❌ Unnecessary
<BackButton href="/competitions" label="Back to Dashboard" />
// Same result but more code
```

---

### **4. Place at Top of Page**

```tsx
// ✅ Good
<div>
  <BackButton href="/competitions" />
  <h1>Page Title</h1>
  {/* content */}
</div>

// ❌ Confusing
<div>
  <h1>Page Title</h1>
  {/* content */}
  <BackButton href="/competitions" />  {/* At bottom? */}
</div>
```

---

## 🔍 Accessibility

The component is fully accessible:

### **Keyboard Navigation**

- ✅ Tab to focus
- ✅ Enter/Space to activate

### **Screen Readers**

- ✅ Reads as link
- ✅ Announces destination
- ✅ Announces label

### **Enhanced Accessibility (Optional)**

```tsx
<BackButton
  href="/competitions"
  aria-label="Navigate back to competitions page"
/>
```

---

## 📦 Dependencies

```bash
# For BackButtonWithIcon variant
npm install lucide-react
```

---

## ✅ Installation Checklist

- [ ] Create `BackButton.tsx` in `components/layout/`
- [ ] Install lucide-react (if using icon variant): `npm install lucide-react`
- [ ] Import in pages: `import BackButton from '@/components/layout/BackButton'`
- [ ] Replace all hardcoded back buttons with `<BackButton />`
- [ ] Test navigation works correctly
- [ ] Test hover animation works
- [ ] Verify consistent styling across pages
- [ ] Check keyboard navigation
- [ ] Test on mobile devices

---

## 🎁 Bonus: Browser Back Button

If you want to use the browser's back button instead:

```tsx
"use client";

import { useRouter } from "next/navigation";

export function BrowserBackButton({ label = "Back" }: { label?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-[#06054e] flex items-center gap-2 group transition-colors"
    >
      <span className="transition-transform group-hover:-translate-x-1">←</span>
      {label}
    </button>
  );
}

// Usage
<BrowserBackButton label="Go Back" />;
```

---

## 📊 Impact Summary

### **Before BackButton:**

- ❌ 200+ lines of duplicate code
- ❌ Inconsistent styling
- ❌ Hard to update globally
- ❌ Easy to make mistakes

### **After BackButton:**

- ✅ Single component
- ✅ Consistent everywhere
- ✅ Update once, changes everywhere
- ✅ Type-safe with TypeScript

---

**You've eliminated 200+ lines of duplicate code with one simple component!** 🎉
