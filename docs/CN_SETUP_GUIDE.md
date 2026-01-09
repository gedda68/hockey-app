# 🎨 cn Utility Setup Guide

## What is `cn`?

The `cn` (className) utility is a helper function that:

1. **Merges** multiple class names
2. **Resolves conflicts** between Tailwind classes
3. **Supports conditional** classes
4. **Removes duplicates**

It's essential for all your components!

---

## 🚀 Quick Setup

### Step 1: Install Dependencies

```bash
npm install clsx tailwind-merge
```

### Step 2: Create `cn.ts`

Save `cn.ts` to `lib/utils/cn.ts`:

```typescript
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default cn;
```

### Step 3: Update `lib/utils/index.ts`

Create or update `lib/utils/index.ts`:

```typescript
export { cn } from "./cn";
export default { cn };
```

Or use the complete version (`utils-index.ts`):

```bash
cp utils-index.ts lib/utils/index.ts
```

### Step 4: Verify Structure

Your `lib/utils/` should look like:

```
lib/utils/
├── index.ts    ✅ Exports cn
└── cn.ts       ✅ cn implementation
```

---

## ✅ Usage Examples

### Basic Usage

```tsx
import { cn } from "@/lib/utils";

// Simple merge
cn("text-red-500", "font-bold");
// Result: "text-red-500 font-bold"

// Conditional classes
cn("base-class", isActive && "active-class");
// Result: "base-class active-class" (if isActive is true)

// Override classes (last wins)
cn("px-2 py-1", "px-4");
// Result: "py-1 px-4" (px-4 overrides px-2)
```

### In Components

```tsx
import { cn } from "@/lib/utils";

interface ButtonProps {
  className?: string;
  variant?: "primary" | "secondary";
}

export default function Button({ className, variant }: ButtonProps) {
  return (
    <button
      className={cn(
        // Base classes
        "px-4 py-2 rounded-full font-bold",
        // Variant classes
        variant === "primary" && "bg-blue-500 text-white",
        variant === "secondary" && "bg-gray-200 text-gray-800",
        // Custom classes from props
        className
      )}
    >
      Click me
    </button>
  );
}
```

### With CVA (Class Variance Authority)

```tsx
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva("px-4 py-2 rounded-full font-bold", {
  variants: {
    variant: {
      primary: "bg-blue-500 text-white",
      secondary: "bg-gray-200 text-gray-800",
    },
    size: {
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
  },
});

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  className?: string;
}

export default function Button({ variant, size, className }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)}>
      Click me
    </button>
  );
}
```

---

## 🔍 How It Works

### Step 1: `clsx` Handles Conditionals

```typescript
clsx("base", isTrue && "conditional", { active: isActive });
// Processes conditional logic
```

### Step 2: `twMerge` Resolves Conflicts

```typescript
twMerge("px-2 px-4");
// Removes duplicate utility: "px-4"
```

### Step 3: `cn` Combines Both

```typescript
cn("px-2", isActive && "px-4", "py-2");
// Result: "py-2 px-4" (if isActive)
```

---

## 📦 Package.json Dependencies

Make sure you have these in your `package.json`:

```json
{
  "dependencies": {
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "class-variance-authority": "^0.7.0"
  }
}
```

Install if missing:

```bash
npm install clsx tailwind-merge class-variance-authority
```

---

## 🎯 Common Patterns

### 1. Base + Conditional

```tsx
cn("base-class", condition && "conditional-class");
```

### 2. Base + Variants

```tsx
cn(
  "base-class",
  variant === "primary" && "primary-class",
  variant === "secondary" && "secondary-class"
);
```

### 3. Base + Props Override

```tsx
cn(
  "default-padding default-color",
  className // User can override
);
```

### 4. Complex Conditionals

```tsx
cn("base", {
  "active-class": isActive,
  "disabled-class": isDisabled,
  "loading-class": isLoading,
});
```

### 5. Array of Classes

```tsx
cn(["class-1", "class-2", condition && "class-3"]);
```

---

## 🔧 Troubleshooting

### Issue: "Cannot find module 'clsx'"

**Fix:**

```bash
npm install clsx
```

### Issue: "Cannot find module 'tailwind-merge'"

**Fix:**

```bash
npm install tailwind-merge
```

### Issue: "Module not found: Can't resolve './cn'"

**Fix:** Make sure `cn.ts` is in `lib/utils/cn.ts`

### Issue: Import error in components

**Fix:** Use correct import path:

```tsx
// ✅ Correct
import { cn } from "../../lib/utils";

// ✅ Also correct (if using path alias)
import { cn } from "@/lib/utils";
```

---

## 📁 File Structure

```
lib/
└── utils/
    ├── index.ts    # Exports cn
    ├── cn.ts       # cn implementation
    ├── date.ts     # Optional: date utilities
    └── format.ts   # Optional: format utilities
```

---

## ✅ Verification

Test that `cn` works:

```tsx
// Create a test component
import { cn } from "@/lib/utils";

export default function TestComponent() {
  const isActive = true;

  return (
    <div
      className={cn("p-4", "bg-white", isActive && "border-2 border-blue-500")}
    >
      If you see a blue border, cn is working!
    </div>
  );
}
```

---

## 🎁 Bonus: TypeScript Support

The `cn` function is fully typed:

```typescript
import { type ClassValue } from "clsx";

cn(
  "string", // ✅ String
  ["array"], // ✅ Array
  { conditional: true }, // ✅ Object
  undefined, // ✅ Undefined
  null, // ✅ Null
  false && "ignored" // ✅ Boolean
);
```

All types are handled automatically!

---

## 📋 Summary

**What:** Utility function for merging Tailwind classes
**Where:** `lib/utils/cn.ts`
**Dependencies:** `clsx`, `tailwind-merge`
**Usage:** `import { cn } from '@/lib/utils'`

**Install now:**

```bash
npm install clsx tailwind-merge
cp cn.ts lib/utils/cn.ts
```

You're all set! 🎉
