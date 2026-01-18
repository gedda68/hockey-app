# 🏑 Clubs Navigation Bar - Setup Guide

## 🎯 What We're Building

A horizontal clubs navigation bar at the top of your site, similar to AFL.com.au:

- **Desktop:** Horizontal scrollable bar with all club icons
- **Mobile:** Collapsible dropdown with grid layout
- **Sticky:** Stays at top when scrolling

---

## 🚀 Quick Setup (3 Steps)

### **Step 1: Create ClubsNav Component**

```bash
# Create component
mkdir -p components/layout
cp ClubsNav.tsx components/layout/ClubsNav.tsx
```

### **Step 2: Update Header**

```bash
# Update header to include ClubsNav
cp Header-with-clubs.tsx components/layout/Header.tsx
```

Or if you have `app/_components/Header.tsx`:

```bash
cp Header-with-clubs.tsx app/_components/Header.tsx
```

### **Step 3: Restart**

```bash
rm -rf .next
npm run dev
```

---

## 📁 File Structure

```
components/layout/
├── Header.tsx              ← UPDATED! Includes ClubsNav
├── ClubsNav.tsx            ← NEW! Club icons bar
└── Footer.tsx

OR

app/_components/
├── Header.tsx              ← UPDATED! Includes ClubsNav
└── Footer.tsx

components/layout/
└── ClubsNav.tsx            ← NEW! Club icons bar
```

---

## 🎨 What It Looks Like

### **Desktop View:**

```
┌──────────────────────────────────────────────────────────┐
│ [Commercial] [Bulimba] [East] [Norths] [UQ] ... [All] → │
│    icon        icon     icon    icon    icon     •••     │
└──────────────────────────────────────────────────────────┘
│ BHL           Home  Competitions  Clubs  Officials       │
└──────────────────────────────────────────────────────────┘
```

### **Mobile View (Collapsed):**

```
┌──────────────────────────┐
│ 🏠 Clubs            ▼    │
└──────────────────────────┘
```

### **Mobile View (Expanded):**

```
┌──────────────────────────┐
│ 🏠 Clubs            ▲    │
├──────────────────────────┤
│ [Com] [Buli] [East] [Nor]│
│ [UQ]  [Val]  [KW]   [All]│
└──────────────────────────┘
```

---

## ✨ Features

### **Desktop:**

- ✅ Horizontal scrollable layout
- ✅ Club icons with hover effects
- ✅ Club name label (first word)
- ✅ "All Clubs" link at end
- ✅ Smooth hover animations
- ✅ Scale effect on hover

### **Mobile:**

- ✅ Collapsible dropdown
- ✅ Grid layout (4 columns)
- ✅ Toggle button with icon
- ✅ Auto-close on selection
- ✅ Smooth animations

---

## 🎯 Component Props

### **ClubsNav:**

```typescript
interface ClubsNavProps {
  clubs: Club[]; // Array of club objects
}
```

### **Usage:**

```typescript
import { getClubs } from "@/lib/data/clubs";
import ClubsNav from "@/components/layout/ClubsNav";

export default async function Header() {
  const clubs = await getClubs();

  return (
    <header>
      <ClubsNav clubs={clubs} />
      {/* Rest of header */}
    </header>
  );
}
```

---

## 🎨 Styling Details

### **Club Icons:**

- Size: `40px × 40px`
- Padding: `8px`
- Hover: Scale 1.1
- Border radius: `8px`

### **Labels:**

- Font size: `8px` (desktop), `7px` (mobile)
- Font weight: `bold`
- Text transform: `uppercase`
- Color: Slate 600

### **Colors:**

- Background: White
- Border: Slate 200
- Hover: Slate 50
- Primary: Navy (#06054e)

---

## 🔧 Customization

### **Change Icon Size:**

```typescript
// In ClubsNav.tsx, update:
<div className="relative w-10 h-10 mb-1">  // Change w-10 h-10
```

### **Change Grid Columns (Mobile):**

```typescript
// In ClubsNav.tsx, update:
<div className="pb-3 grid grid-cols-4 gap-2">  // Change grid-cols-4
```

### **Change Background Color:**

```typescript
// In ClubsNav.tsx, update:
<div className="bg-white border-b border-slate-200">  // Change bg-white
```

### **Remove Labels:**

```typescript
// In ClubsNav.tsx, remove this span:
<span className="text-[8px] font-bold text-slate-600 uppercase tracking-tight text-center leading-tight">
  {club.title.split(" ")[0]}
</span>
```

---

## 📱 Responsive Behavior

### **Desktop (md and up):**

- Shows horizontal scrollable bar
- All clubs visible
- Hover effects enabled

### **Mobile (below md):**

- Shows collapsible dropdown
- Toggle button to expand/collapse
- Grid layout when expanded
- Auto-closes on club selection

### **Breakpoint:**

```css
md: 768px; /* Tailwind default */
```

---

## 🎁 Advanced Features

### **Add Smooth Scroll:**

```typescript
// In ClubsNav.tsx, add to container:
<div className="... overflow-x-auto scroll-smooth">
```

### **Add Active State:**

```typescript
"use client";

import { usePathname } from "next/navigation";

export default function ClubsNav({ clubs }) {
  const pathname = usePathname();

  return (
    <Link
      href={`/clubs/${club.slug}`}
      className={`... ${
        pathname === `/clubs/${club.slug}`
          ? "bg-[#06054e] text-white"
          : "hover:bg-slate-50"
      }`}
    >
      {/* ... */}
    </Link>
  );
}
```

### **Add Scroll Arrows:**

```typescript
const scrollRef = useRef<HTMLDivElement>(null);

const scrollLeft = () => {
  scrollRef.current?.scrollBy({ left: -200, behavior: "smooth" });
};

const scrollRight = () => {
  scrollRef.current?.scrollBy({ left: 200, behavior: "smooth" });
};

return (
  <div className="relative">
    <button onClick={scrollLeft}>←</button>
    <div ref={scrollRef} className="overflow-x-auto">
      {/* clubs */}
    </div>
    <button onClick={scrollRight}>→</button>
  </div>
);
```

---

## 🐛 Troubleshooting

### **Icons Not Showing:**

**Check:**

1. Icons exist in `/public/icons/`
2. File names match in clubs.json
3. iconSrc paths are correct (`/icons/chc.png`)

**Fix:**

```bash
ls public/icons/*.png
```

### **Clubs Not Loading:**

**Check:**

```typescript
// In Header, add debug:
const clubs = await getClubs();
console.log("Clubs loaded:", clubs.length);
```

### **Styling Issues:**

**Make sure:**

- Tailwind is configured
- CSS is imported
- No conflicting styles

---

## ✅ Complete Setup Checklist

### **Files:**

- [ ] `ClubsNav.tsx` in `components/layout/`
- [ ] Updated `Header.tsx` with ClubsNav
- [ ] All club icons in `/public/icons/`

### **Data:**

- [ ] `clubs.json` has correct iconSrc paths
- [ ] `getClubs()` function works

### **Testing:**

- [ ] Desktop view shows horizontal bar
- [ ] Mobile view shows dropdown
- [ ] All club links work
- [ ] Icons display correctly
- [ ] Hover effects work

---

## 🎯 Integration with Layout

### **If you have a layout.tsx:**

```typescript
// app/(website)/layout.tsx
import Header from "@/components/layout/Header";

export default function Layout({ children }) {
  return (
    <html>
      <body>
        <Header /> {/* Includes ClubsNav */}
        {children}
      </body>
    </html>
  );
}
```

---

## 🎨 Alternative Styles

### **Option 1: Darker Background**

```typescript
<div className="bg-slate-900 border-b border-slate-800">
  {/* White icons/text */}
</div>
```

### **Option 2: Colored Background**

```typescript
<div className="bg-[#06054e] border-b border-[#06054e]">
  {/* White icons/text */}
</div>
```

### **Option 3: No Border**

```typescript
<div className="bg-white shadow-sm">{/* Remove border-b */}</div>
```

---

## 📊 Performance

### **Optimizations:**

- ✅ Server-side rendering (async component)
- ✅ Image optimization (Next.js Image)
- ✅ Client component only where needed
- ✅ Minimal re-renders

### **Load Time:**

- Icons: Optimized by Next.js
- Data: Loaded once server-side
- JavaScript: Only for mobile toggle

---

## 🎁 Bonus: Sticky Behavior

The header is already sticky:

```typescript
<header className="sticky top-0 z-50 bg-white shadow-md">
```

This keeps the clubs nav visible while scrolling!

---

**Your clubs navigation is now at the top like AFL.com.au!** 🏑✨

Users can quickly access any club from anywhere on the site!
