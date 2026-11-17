// lib/ui/readableText.ts
// Picks light or dark text for a spot on a gradient by real WCAG contrast, not by the gradient's first colour.

type Rgb = [number, number, number];

function parse(hex: string): Rgb | null {
  const c = hex.trim().replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

/** The colour `t` of the way (0–1) from `a` to `b`; falls back to `a` if either isn't a valid hex colour. */
export function mixColours(a: string, b: string, t: number): Rgb {
  const x = parse(a) ?? [0, 0, 0];
  const y = parse(b) ?? x;
  const k = Math.min(1, Math.max(0, t));
  return [0, 1, 2].map((i) => Math.round(x[i] + (y[i] - x[i]) * k)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const f = (v: number) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

const WHITE: Rgb = [255, 255, 255];
const INK: Rgb = [17, 24, 39]; // gray-900

/** "light" text (white) or "dark" text (gray-900), whichever reads better on `bg`. */
export function toneOn(bg: Rgb): "light" | "dark" {
  return contrastRatio(WHITE, bg) >= contrastRatio(INK, bg) ? "light" : "dark";
}

/** Tone for text sitting `at` (0 = primary end, 1 = secondary end) along a primary→secondary gradient. */
export function toneAlongGradient(primary: string, secondary: string, at: number): "light" | "dark" {
  return toneOn(mixColours(primary, secondary, at));
}
