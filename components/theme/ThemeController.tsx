"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { themeForPath } from "@/lib/theme/theme";
import { useThemePreference } from "@/lib/theme/useThemePreference";

/**
 * Keeps <html data-theme> in step with the visitor's preference, the current route
 * (client-side navigation doesn't re-run the pre-paint script) and, for "system", the
 * OS setting. Renders nothing.
 */
export default function ThemeController() {
  const pathname = usePathname();
  const [preference] = useThemePreference();

  useEffect(() => {
    const mq =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    const apply = () => {
      const theme = themeForPath(preference, Boolean(mq?.matches), pathname);
      const root = document.documentElement;
      if (root.getAttribute("data-theme") !== theme) root.setAttribute("data-theme", theme);
      root.style.colorScheme = theme;
    };

    apply();
    if (preference !== "system" || !mq) return;
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [preference, pathname]);

  return null;
}
