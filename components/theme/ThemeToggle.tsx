"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/utils";
import {
  THEME_PREFERENCES,
  isDarkSupportedPath,
  type ThemePreference,
} from "@/lib/theme/theme";
import { useThemePreference } from "@/lib/theme/useThemePreference";

const OPTIONS: Record<
  ThemePreference,
  { label: string; Icon: typeof Sun }
> = {
  light: { label: "Light", Icon: Sun },
  system: { label: "Match device", Icon: Monitor },
  dark: { label: "Dark", Icon: Moon },
};

/**
 * Three-way colour theme switch for the header (sits on the navy bar, so it uses
 * white-on-navy styling in both themes). A real button group with aria-pressed.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const [preference, setPreference] = useThemePreference();
  const pathname = usePathname();
  const supported = isDarkSupportedPath(pathname);

  return (
    <div
      role="group"
      aria-label="Colour theme"
      title={supported ? undefined : "Dark theme isn't available on this page yet"}
      className={cn(
        "inline-flex items-center rounded-full border border-white/20 bg-white/5 p-0.5",
        className,
      )}
    >
      {THEME_PREFERENCES.map((value) => {
        const { label, Icon } = OPTIONS[value];
        const active = preference === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => setPreference(value)}
            aria-pressed={active}
            aria-label={`${label} theme`}
            title={`${label} theme`}
            className={cn(
              "rounded-full p-1.5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80",
              active
                ? "bg-yellow-400 text-[#06054e]"
                : "text-white/70 hover:bg-white/10 hover:text-white",
            )}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
