"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

/**
 * Keeps keyboard focus inside `containerRef` while `active`, restores focus on cleanup,
 * and calls `onEscape` when Escape is pressed.
 */
export function useFocusTrap(
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  onEscape?: () => void,
) {
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const onEscapeRef = useRef(onEscape);
  onEscapeRef.current = onEscape;

  useEffect(() => {
    if (!active || !containerRef.current) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const container = containerRef.current;

    const getFocusable = () =>
      Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((el) => !el.closest('[aria-hidden="true"]'));

    const focusables = getFocusable();
    focusables[0]?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onEscapeRef.current?.();
        e.preventDefault();
        return;
      }
      if (e.key !== "Tab") return;

      const nodes = getFocusable();
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          last.focus();
          e.preventDefault();
        }
      } else if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [active, containerRef]);
}
