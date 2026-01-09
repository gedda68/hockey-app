import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn - Class Name utility
 *
 * Merges Tailwind CSS classes intelligently, resolving conflicts.
 * Combines clsx for conditional classes and tailwind-merge for deduplication.
 *
 * @example
 * cn("px-2 py-1", "px-4") // "py-1 px-4" (px-4 wins)
 *
 * @example
 * cn("text-red-500", condition && "text-blue-500") // Conditionally apply classes
 *
 * @example
 * cn(
 *   "base-class",
 *   isActive && "active-class",
 *   isDisabled && "disabled-class"
 * )
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default cn;
