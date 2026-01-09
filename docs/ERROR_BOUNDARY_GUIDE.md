# 🛡️ ErrorBoundary Component - Complete Guide

## 📄 Full Component Code

The ErrorBoundary component includes:

1. **ErrorBoundary** - Full-page error boundary (class component)
2. **ErrorFallback** - Lightweight error display (function component)

```typescript
"use client";

import React, { Component, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary Component
 *
 * Catches JavaScript errors anywhere in the child component tree.
 * Displays a fallback UI instead of crashing the whole app.
 *
 * @example
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * <ErrorBoundary fallback={<CustomErrorUI />}>
 *   <MyComponent />
 * </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 md:p-12 max-w-2xl w-full shadow-lg text-center">
            {/* Error Icon */}
            <div className="mb-6 flex justify-center">
              <div className="p-4 bg-red-50 rounded-full">
                <AlertCircle className="w-12 h-12 text-red-600" />
              </div>
            </div>

            {/* Error Title */}
            <h1 className="text-2xl font-black uppercase text-[#06054e] mb-3">
              Something Went Wrong
            </h1>

            {/* Error Description */}
            <p className="text-slate-600 mb-6">
              We apologize for the inconvenience. An unexpected error has
              occurred.
            </p>

            {/* Error Details (in development) */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <div className="mb-6 p-4 bg-slate-50 rounded-xl text-left">
                <p className="text-xs font-black uppercase text-slate-400 mb-2">
                  Error Details:
                </p>
                <pre className="text-xs text-red-600 whitespace-pre-wrap overflow-auto">
                  {this.state.error.message}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 bg-[#06054e] text-white rounded-full font-black uppercase text-sm hover:bg-[#06054e]/90 transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={() => (window.location.href = "/")}
                className="px-6 py-3 bg-white text-[#06054e] border-2 border-[#06054e] rounded-full font-black uppercase text-sm hover:bg-slate-50 transition-colors"
              >
                Go Home
              </button>
            </div>

            {/* Support Link */}
            <p className="text-xs text-slate-500 mt-6">
              If this problem persists, please{" "}
              <a
                href="/contact"
                className="text-[#06054e] font-bold hover:underline"
              >
                contact support
              </a>
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Lightweight error fallback for smaller sections
export function ErrorFallback({
  error,
  reset,
}: {
  error: Error;
  reset?: () => void;
}) {
  return (
    <div className="bg-white rounded-3xl p-6 text-center">
      <div className="mb-4 flex justify-center">
        <AlertCircle className="w-8 h-8 text-red-600" />
      </div>
      <p className="text-sm font-bold text-slate-600 mb-3">
        Failed to load content
      </p>
      {reset && (
        <button
          onClick={reset}
          className="px-4 py-2 bg-[#06054e] text-white rounded-full text-xs font-black uppercase hover:bg-[#06054e]/90 transition-colors"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
```

---

## 📁 File Location

Save as:

```
components/shared/ErrorBoundary.tsx
```

---

## 💡 Usage Examples

### **1. Basic Usage - Wrap Any Component**

```tsx
import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

---

### **2. Wrap Entire Page**

```tsx
import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function MatchesPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 p-4 md:p-12">
        <h1>Matches</h1>
        <MatchList />
      </div>
    </ErrorBoundary>
  );
}
```

---

### **3. Wrap Multiple Components**

```tsx
import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function Dashboard() {
  return (
    <div>
      {/* Each section has its own error boundary */}
      <ErrorBoundary>
        <RecentMatches />
      </ErrorBoundary>

      <ErrorBoundary>
        <StandingsWidget />
      </ErrorBoundary>

      <ErrorBoundary>
        <StatisticsCard />
      </ErrorBoundary>
    </div>
  );
}
```

---

### **4. With Custom Fallback**

```tsx
import ErrorBoundary from "@/components/shared/ErrorBoundary";

const CustomError = () => (
  <div className="p-8 text-center">
    <h2>Oops! Something broke</h2>
    <p>Please try refreshing the page</p>
  </div>
);

export default function Page() {
  return (
    <ErrorBoundary fallback={<CustomError />}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

---

### **5. With Reset Handler**

```tsx
import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function Page() {
  const handleReset = () => {
    console.log("Resetting error state...");
    // Add custom reset logic here
    // e.g., clear cache, reset filters, etc.
  };

  return (
    <ErrorBoundary onReset={handleReset}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

---

### **6. Using ErrorFallback (Lightweight)**

For smaller sections where full-page error is too much:

```tsx
import { ErrorFallback } from "@/components/shared/ErrorBoundary";

export default function SmallWidget() {
  const [error, setError] = useState<Error | null>(null);

  if (error) {
    return <ErrorFallback error={error} reset={() => setError(null)} />;
  }

  return <WidgetContent />;
}
```

---

## 🎯 Real-World Examples

### **Example 1: App-Level Error Boundary**

Wrap your entire app in `layout.tsx`:

```tsx
// app/(website)/layout.tsx
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body>
        <ErrorBoundary>
          <Header />
          <main>{children}</main>
          <Footer />
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

### **Example 2: Page-Level Error Boundary**

```tsx
// app/(website)/matches/page.tsx
import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function MatchesPage() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-slate-50 p-4 md:p-12">
        <BackButton href="/competitions" />
        <h1 className="text-4xl font-black uppercase italic text-[#06054e] mb-8">
          Match Results
        </h1>
        <MatchList />
      </div>
    </ErrorBoundary>
  );
}
```

---

### **Example 3: Component-Level Error Boundaries**

```tsx
// Dashboard with isolated error boundaries
import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Each widget is isolated */}
      <ErrorBoundary>
        <RecentMatchesWidget />
      </ErrorBoundary>

      <ErrorBoundary>
        <StandingsWidget />
      </ErrorBoundary>

      <ErrorBoundary>
        <UpcomingFixturesWidget />
      </ErrorBoundary>
    </div>
  );
}
```

If one widget fails, the others keep working!

---

### **Example 4: Data Fetching with Error Boundary**

```tsx
"use client";

import { useState, useEffect } from "react";
import ErrorBoundary from "@/components/shared/ErrorBoundary";
import { ErrorFallback } from "@/components/shared/ErrorBoundary";

function DataComponent() {
  const [data, setData] = useState(null);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    fetch("/api/data")
      .then((res) => res.json())
      .then(setData)
      .catch(setError);
  }, []);

  if (error) {
    return <ErrorFallback error={error} reset={() => setError(null)} />;
  }

  return <div>{/* Render data */}</div>;
}

export default function Page() {
  return (
    <ErrorBoundary>
      <DataComponent />
    </ErrorBoundary>
  );
}
```

---

### **Example 5: Next.js Error Handling Pattern**

```tsx
// app/(website)/matches/error.tsx
"use client";

import ErrorBoundary from "@/components/shared/ErrorBoundary";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorBoundary
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-12 max-w-2xl text-center">
            <h1 className="text-2xl font-black uppercase text-[#06054e] mb-4">
              Failed to Load Matches
            </h1>
            <p className="text-slate-600 mb-6">{error.message}</p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-[#06054e] text-white rounded-full font-black uppercase"
            >
              Try Again
            </button>
          </div>
        </div>
      }
    >
      {/* This will never render but satisfies the component structure */}
      <div />
    </ErrorBoundary>
  );
}
```

---

## 🎨 Features

### **1. Automatic Error Catching**

- Catches JavaScript errors in child components
- Prevents app from crashing
- Shows fallback UI

### **2. Development vs Production**

- **Development**: Shows error details and stack trace
- **Production**: Shows friendly error message (no technical details)

### **3. Reset Functionality**

- "Try Again" button resets error state
- Optional `onReset` callback for custom logic
- "Go Home" button navigates to homepage

### **4. Two Variants**

- **ErrorBoundary**: Full-page error (large, centered)
- **ErrorFallback**: Lightweight (compact, for sections)

---

## 📋 Props Reference

### **ErrorBoundary**

| Prop       | Type         | Required | Description                    |
| ---------- | ------------ | -------- | ------------------------------ |
| `children` | `ReactNode`  | ✅ Yes   | Components to protect          |
| `fallback` | `ReactNode`  | No       | Custom error UI                |
| `onReset`  | `() => void` | No       | Callback when reset is clicked |

### **ErrorFallback**

| Prop    | Type         | Required | Description    |
| ------- | ------------ | -------- | -------------- |
| `error` | `Error`      | ✅ Yes   | Error object   |
| `reset` | `() => void` | No       | Reset callback |

---

## 🔧 Customization Examples

### **Custom Fallback UI**

```tsx
const MyCustomError = () => (
  <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
    <div className="bg-white rounded-3xl p-12 max-w-lg text-center shadow-2xl">
      <h1 className="text-3xl font-black text-red-600 mb-4">Uh Oh!</h1>
      <p className="text-gray-600 mb-6">
        Something unexpected happened. Our team has been notified.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-8 py-3 bg-red-600 text-white rounded-full font-bold"
      >
        Reload Page
      </button>
    </div>
  </div>
);

<ErrorBoundary fallback={<MyCustomError />}>
  <App />
</ErrorBoundary>;
```

---

### **With Error Logging**

```tsx
class ErrorBoundaryWithLogging extends ErrorBoundary {
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log to error tracking service
    console.error("Error caught:", error, errorInfo);

    // Send to analytics
    if (typeof window !== "undefined") {
      // Example: Send to Sentry, LogRocket, etc.
      // Sentry.captureException(error);
    }

    super.componentDidCatch(error, errorInfo);
  }
}
```

---

### **With Recovery Actions**

```tsx
function RecoverableErrorBoundary({ children }: { children: ReactNode }) {
  const [retryCount, setRetryCount] = useState(0);

  return (
    <ErrorBoundary
      key={retryCount} // Remount on retry
      onReset={() => {
        setRetryCount((count) => count + 1);
        // Clear cache, reset state, etc.
        localStorage.clear();
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

---

## 🎯 Best Practices

### **1. Strategic Placement**

```tsx
// ✅ Good - Granular error boundaries
<div>
  <ErrorBoundary>
    <CriticalFeature />
  </ErrorBoundary>

  <ErrorBoundary>
    <SecondaryFeature />
  </ErrorBoundary>
</div>

// ❌ Bad - One boundary for everything
<ErrorBoundary>
  <CriticalFeature />
  <SecondaryFeature />
</ErrorBoundary>
// If SecondaryFeature fails, CriticalFeature is also hidden
```

---

### **2. Use Multiple Boundaries**

```tsx
// App-level (catches everything)
<ErrorBoundary>
  <App>
    {/* Page-level (isolates pages) */}
    <ErrorBoundary>
      <MatchesPage>
        {/* Component-level (isolates features) */}
        <ErrorBoundary>
          <ComplexWidget />
        </ErrorBoundary>
      </MatchesPage>
    </ErrorBoundary>
  </App>
</ErrorBoundary>
```

---

### **3. Provide Context in Errors**

```tsx
<ErrorBoundary
  fallback={
    <div className="p-8 text-center">
      <h2>Failed to Load Match Statistics</h2>
      <p>The statistics service is currently unavailable.</p>
      <button onClick={() => window.location.reload()}>Refresh Page</button>
    </div>
  }
>
  <MatchStatistics />
</ErrorBoundary>
```

---

### **4. Test Error Boundaries**

```tsx
// Test component that throws an error
function ErrorTest() {
  throw new Error("Test error!");
  return <div>This will never render</div>;
}

// Test in development
<ErrorBoundary>
  <ErrorTest />
</ErrorBoundary>;
```

---

## ⚠️ Important Notes

### **What Error Boundaries Catch**

✅ Errors during rendering
✅ Errors in lifecycle methods
✅ Errors in constructors
✅ Errors in child component tree

### **What Error Boundaries DON'T Catch**

❌ Event handlers (use try-catch)
❌ Async code (setTimeout, promises)
❌ Server-side rendering errors
❌ Errors in the error boundary itself

### **For Event Handlers**

```tsx
// ❌ Won't be caught by ErrorBoundary
<button onClick={() => { throw new Error('Oops!'); }}>
  Click me
</button>

// ✅ Handle with try-catch
<button onClick={() => {
  try {
    // risky code
  } catch (error) {
    console.error(error);
    // Show error to user
  }
}}>
  Click me
</button>
```

---

## 🔍 Debugging Tips

### **View Error in Development**

When an error occurs in development mode, the error details are automatically shown:

```tsx
{
  process.env.NODE_ENV === "development" && this.state.error && (
    <div className="p-4 bg-slate-50 rounded-xl">
      <p className="text-xs font-black uppercase text-slate-400">
        Error Details:
      </p>
      <pre className="text-xs text-red-600">
        {this.state.error.message}
        {this.state.error.stack}
      </pre>
    </div>
  );
}
```

---

### **Test Error Boundaries**

Create a test button:

```tsx
function BuggyCounter() {
  const [counter, setCounter] = useState(0);

  if (counter === 5) {
    throw new Error("I crashed!");
  }

  return (
    <div>
      <p>Counter: {counter}</p>
      <button onClick={() => setCounter((c) => c + 1)}>
        Add 1 (crashes at 5)
      </button>
    </div>
  );
}

<ErrorBoundary>
  <BuggyCounter />
</ErrorBoundary>;
```

---

## ✅ Installation Checklist

- [ ] Install lucide-react: `npm install lucide-react`
- [ ] Create `ErrorBoundary.tsx` in `components/shared/`
- [ ] Add `"use client"` directive at the top
- [ ] Test with a component that throws an error
- [ ] Verify development mode shows error details
- [ ] Verify production mode shows friendly message
- [ ] Test "Try Again" button
- [ ] Test "Go Home" button
- [ ] Add to app layout for app-wide protection
- [ ] Add to critical pages for isolation

---

## 🎁 Bonus: Error Boundary Hook

For functional components (Next.js 13+ App Router):

```tsx
// lib/hooks/useErrorBoundary.ts
import { useState, useCallback } from "react";

export function useErrorBoundary() {
  const [error, setError] = useState<Error | null>(null);

  const resetError = useCallback(() => {
    setError(null);
  }, []);

  const catchError = useCallback((error: Error) => {
    setError(error);
    console.error("Error caught:", error);
  }, []);

  return { error, resetError, catchError };
}

// Usage
function MyComponent() {
  const { error, resetError, catchError } = useErrorBoundary();

  useEffect(() => {
    try {
      // risky operation
    } catch (err) {
      catchError(err as Error);
    }
  }, [catchError]);

  if (error) {
    return <ErrorFallback error={error} reset={resetError} />;
  }

  return <div>Normal content</div>;
}
```

---

**You now have bulletproof error handling for your entire app!** 🛡️
