export function fallbackPalette(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }

  const hue = hash % 360;

  return {
    primary: `hsl(${hue}, 70%, 45%)`,
    secondary: `hsl(${(hue + 40) % 360}, 70%, 55%)`,
    tertiary: `hsl(${(hue + 80) % 360}, 70%, 65%)`,
  };
}

export function gradientFromColors(
  colors: (string | undefined)[],
  fallbackSeed: string
) {
  const valid = colors.filter(Boolean) as string[];

  if (valid.length >= 2) {
    return `linear-gradient(135deg, ${valid.join(", ")})`;
  }

  const fallback = fallbackPalette(fallbackSeed);
  return `linear-gradient(135deg, ${fallback.primary}, ${fallback.secondary})`;
}
