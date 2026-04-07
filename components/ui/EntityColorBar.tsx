// components/ui/EntityColorBar.tsx
// Reusable colour-stripe component for list rows and cards.
// Shows a small vertical or horizontal bar in the entity's brand colours.
//
// Usage in a table row:
//   <td className="w-1 p-0">
//     <EntityColorBar primary={assoc.branding?.primaryColor} secondary={assoc.branding?.secondaryColor} />
//   </td>
//
// Usage in a card:
//   <EntityColorBar primary={club.colors?.primary} secondary={club.colors?.secondary} horizontal />

interface EntityColorBarProps {
  primary?: string | null;
  secondary?: string | null;
  /** Render as a horizontal top-bar instead of a vertical left-bar */
  horizontal?: boolean;
  className?: string;
}

export default function EntityColorBar({
  primary   = "#06054e",
  secondary,
  horizontal = false,
  className  = "",
}: EntityColorBarProps) {
  const bg = secondary
    ? `linear-gradient(${horizontal ? "90deg" : "180deg"}, ${primary}, ${secondary})`
    : (primary ?? "#06054e");

  if (horizontal) {
    return (
      <div
        className={`h-1.5 w-full rounded-t-xl flex-shrink-0 ${className}`}
        style={{ background: bg }}
      />
    );
  }

  return (
    <div
      className={`w-1.5 self-stretch rounded-full flex-shrink-0 ${className}`}
      style={{ background: bg }}
    />
  );
}

/**
 * A small circular "colour swatch" — useful as a compact brand indicator
 * alongside entity names in dropdowns, badges, etc.
 */
export function EntityColorDot({
  primary   = "#06054e",
  secondary,
  size      = 12,
  className = "",
}: EntityColorBarProps & { size?: number }) {
  const bg = secondary
    ? `linear-gradient(135deg, ${primary}, ${secondary})`
    : (primary ?? "#06054e");

  return (
    <span
      className={`inline-block rounded-full flex-shrink-0 ${className}`}
      style={{ width: size, height: size, background: bg, minWidth: size }}
    />
  );
}

/**
 * A colour-banded name pill — shows entity name with its brand colours
 * as background. Useful in compact lists.
 */
export function EntityColorPill({
  primary   = "#06054e",
  secondary,
  name,
  className = "",
}: EntityColorBarProps & { name: string }) {
  const bg = secondary
    ? `linear-gradient(135deg, ${primary}, ${secondary})`
    : (primary ?? "#06054e");

  // Simple luminance check to pick text colour
  const hex = (primary ?? "#06054e").replace("#", "");
  const r   = parseInt(hex.substring(0, 2), 16);
  const g   = parseInt(hex.substring(2, 4), 16);
  const b   = parseInt(hex.substring(4, 6), 16);
  const lum = (r * 299 + g * 587 + b * 114) / 1000;
  const textColor = lum > 150 ? "#111827" : "#ffffff";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-black ${className}`}
      style={{ background: bg, color: textColor }}
    >
      {name}
    </span>
  );
}
