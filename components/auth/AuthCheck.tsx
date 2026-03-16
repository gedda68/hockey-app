// components/auth/AuthCheck.tsx
// Client-side auth check - redirects if not authenticated

"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function AuthCheck({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Try to fetch user session
        const response = await fetch("/api/auth/me");

        if (response.ok) {
          // User is authenticated
          setIsChecking(false);
        } else {
          // Not authenticated - redirect to login
          router.push(`/admin/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } catch (error) {
        console.error("Auth check error:", error);
        router.push("/admin/login");
      }
    };

    checkAuth();
  }, [router, pathname]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#06054e] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-bold tracking-widest uppercase text-xs">
            Checking authentication...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
