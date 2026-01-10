# 🏑 Clubs Data Migration Guide

## 📦 What We're Doing

Moving clubs data from a local TypeScript file to the centralized data layer:

- **Before:** `app/(website)/clubs/data.ts`
- **After:** `/data/clubs.json` + `lib/data/clubs.ts`

---

## 🚀 Quick Setup (4 Steps)

### **Step 1: Copy JSON Data**

```bash
# Copy clubs.json to /data folder
cp clubs.json data/clubs.json
```

### **Step 2: Copy Data Functions**

```bash
# Copy clubs data functions
cp clubs-data.ts lib/data/clubs.ts
```

### **Step 3: Update Data Index**

```bash
# Update the central data index
cp data-index.ts lib/data/index.ts
```

### **Step 4: Update Pages**

```bash
# Update clubs list page
cp clubs-page-updated.tsx app/\(website\)/clubs/page.tsx

# Update club detail page
cp club-detail-page-updated.tsx app/\(website\)/clubs/[slug]/page.tsx

# Delete old data.ts file
rm app/\(website\)/clubs/data.ts
```

Then restart:

```bash
rm -rf .next
npm run dev
```

---

## 📁 New File Structure

```
your-project/
├── data/
│   ├── clubs.json              ← NEW! Club data
│   ├── matches.json
│   ├── standings.json
│   ├── umpireList.json
│   └── umpireAllocations.json
│
├── lib/data/
│   ├── index.ts                ← UPDATED! Added clubs exports
│   ├── clubs.ts                ← NEW! Club data functions
│   ├── matches.ts
│   ├── standings.ts
│   └── umpires.ts
│
└── app/(website)/clubs/
    ├── page.tsx                ← UPDATED! Uses getClubs()
    ├── [slug]/
    │   ├── page.tsx            ← UPDATED! Uses getClubBySlug()
    │   └── contact/
    │       └── page.tsx        ← Update to use getClubContacts()
    └── data.ts                 ← DELETE THIS!
```

---

## ✅ What Changed

### **Before (Old Way):**

```typescript
// app/(website)/clubs/data.ts
export const CLUBS_DATA: Club[] = [
  { title: "Commercial", slug: "commercial-hockey", ... },
  // ...
];

// app/(website)/clubs/page.tsx
import { CLUBS_DATA } from "./data";

export default function ClubsPage() {
  return (
    <div>
      {CLUBS_DATA.map(club => ...)}
    </div>
  );
}
```

### **After (New Way):**

```typescript
// data/clubs.json
{
  "clubs": [
    { "title": "Commercial", "slug": "commercial-hockey", ... }
  ]
}

// lib/data/clubs.ts
import clubsData from '@/data/clubs.json';

export async function getClubs() {
  return clubsData.clubs;
}

// app/(website)/clubs/page.tsx
import { getClubs } from "@/lib/data/clubs";

export default async function ClubsPage() {
  const clubs = await getClubs();

  return (
    <div>
      {clubs.map(club => ...)}
    </div>
  );
}
```

---

## 🎯 Available Functions

### **Core Functions:**

```typescript
// Get all clubs
const clubs = await getClubs();

// Get specific club by slug
const club = await getClubBySlug("commercial-hockey");

// Get all club slugs (for static generation)
const slugs = await getClubSlugs();

// Search clubs
const results = await searchClubs("commercial");

// Get club contacts
const contacts = await getClubContacts("commercial-hockey");

// Get clubs with social media
const socialClubs = await getClubsWithSocial();

// Get featured clubs (with full about text)
const featured = await getFeaturedClubs();
```

---

## 📊 JSON Structure

### **clubs.json:**

```json
{
  "clubs": [
    {
      "title": "Commercial Hockey Club",
      "description": "Hockey club based in Brisbane",
      "icon": "⚡",
      "iconSrc": "/icons/chc.png",
      "href": "https://commercialhockeyclub.com",
      "slug": "commercial-hockey",
      "color": "#8b39d3",
      "bgColor": "#8b39d3",
      "address": "106 Finsbury Street, Newmarket, QLD, 4051",
      "about": "<strong>History</strong><br/>Founded in 1944...",
      "facebookUrl": "https://facebook.com/...",
      "instagramUrl": "https://instagram.com/...",
      "twitterUrl": "https://twitter.com/...",
      "contacts": [
        {
          "role": "President",
          "name": "John Doe",
          "email": "president@club.com",
          "phone": "0400 000 000"
        }
      ]
    }
  ]
}
```

---

## 🎨 Updated Pages

### **1. Clubs List Page**

**Changes:**

- Uses `getClubs()` from data layer
- Matches design system (navy, rounded-3xl, etc.)
- Cleaner button styles
- Better social media icons
- Stats section shows real counts

### **2. Club Detail Page**

**Changes:**

- Uses `getClubBySlug()` from data layer
- Adds `generateStaticParams()` for static generation
- Better hero section
- Social media in header
- Cleaner action buttons

---

## 🔧 Update Contact Page

Your contact page also needs updating:

```typescript
// app/(website)/clubs/[slug]/contact/page.tsx
import { getClubBySlug } from "@/lib/data/clubs";
import { notFound } from "next/navigation";

type Params = Promise<{ slug: string }>;

export default async function ClubContactPage({ params }: { params: Params }) {
  const { slug } = await params;
  const club = await getClubBySlug(slug);

  if (!club) notFound();

  return (
    <div>
      <h1>{club.title} - Contact</h1>

      {club.contacts.length > 0 ? (
        <div>
          {club.contacts.map((contact, i) => (
            <div key={i}>
              <h3>{contact.role}</h3>
              <p>{contact.name}</p>
              <p>Email: {contact.email}</p>
              <p>Phone: {contact.phone}</p>
            </div>
          ))}
        </div>
      ) : (
        <p>No contact information available.</p>
      )}
    </div>
  );
}
```

---

## ✅ Benefits of This Approach

### **1. Consistency**

- All data in `/data/` folder
- All data functions in `lib/data/`
- Same pattern as matches, standings, umpires

### **2. Centralized**

- Single source of truth
- Easy to update data
- Can be managed by non-developers

### **3. Type-Safe**

- TypeScript types exported
- IDE autocomplete
- Compile-time checks

### **4. Performance**

- Static generation with `generateStaticParams()`
- Pre-built at build time
- Fast page loads

---

## 🐛 Troubleshooting

### **Error: Cannot find module '@/data/clubs.json'**

**Fix:**

```bash
# Make sure file exists
ls data/clubs.json

# Check tsconfig.json has:
{
  "compilerOptions": {
    "resolveJsonModule": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### **Error: getClubs is not a function**

**Fix:**

```bash
# Make sure clubs.ts is in the right place
ls lib/data/clubs.ts

# Make sure it's exported in index.ts
grep "clubs" lib/data/index.ts
```

### **Clubs page is blank**

**Fix:**

```typescript
// Add debug logging to page
const clubs = await getClubs();
console.log("Clubs loaded:", clubs.length);
```

---

## 📋 Complete Checklist

### **Data Files:**

- [ ] `clubs.json` in `/data/` folder
- [ ] `clubs.ts` in `lib/data/` folder
- [ ] Updated `lib/data/index.ts` with clubs exports

### **Pages:**

- [ ] Updated `app/(website)/clubs/page.tsx`
- [ ] Updated `app/(website)/clubs/[slug]/page.tsx`
- [ ] Updated `app/(website)/clubs/[slug]/contact/page.tsx`
- [ ] Deleted old `app/(website)/clubs/data.ts`

### **Testing:**

- [ ] Clubs list page loads
- [ ] Individual club pages load
- [ ] Contact pages load
- [ ] All club data displays correctly
- [ ] Social media links work

---

## 🎯 Test Routes

After setup, test these URLs:

```
http://localhost:3000/clubs
http://localhost:3000/clubs/commercial-hockey
http://localhost:3000/clubs/commercial-hockey/contact
http://localhost:3000/clubs/bulimba-hockey
http://localhost:3000/clubs/bulimba-hockey/contact
```

All should work without errors!

---

## 🎁 Bonus: Add More Clubs

To add a new club, just edit `data/clubs.json`:

```json
{
  "clubs": [
    // ... existing clubs
    {
      "title": "New Club",
      "slug": "new-club",
      "description": "A new hockey club",
      "color": "#ff0000",
      "href": "https://newclub.com",
      "iconSrc": "/icons/newclub.png",
      "about": "Club history...",
      "contacts": [],
      "facebookUrl": "",
      "instagramUrl": "",
      "twitterUrl": ""
    }
  ]
}
```

No code changes needed - it will automatically appear!

---

**Your clubs data is now properly organized!** 🏑✨

All club data follows the same pattern as matches, standings, and umpires!
