import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const spinnerVariants = cva(
  "inline-block animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]",
  {
    variants: {
      size: {
        sm: "h-4 w-4 border-2",
        md: "h-8 w-8 border-4",
        lg: "h-12 w-12 border-4",
        xl: "h-16 w-16 border-[6px]",
      },
      color: {
        primary: "text-[#06054e]",
        secondary: "text-red-600",
        white: "text-white",
        slate: "text-slate-400",
      },
    },
    defaultVariants: {
      size: "md",
      color: "primary",
    },
  }
);

interface LoadingSpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
  label?: string;
}

/**
 * LoadingSpinner Component
 *
 * Animated loading spinner for async operations.
 *
 * @example
 * <LoadingSpinner />
 *
 * @example
 * <LoadingSpinner size="lg" color="white" label="Loading matches..." />
 */
export default function LoadingSpinner({
  size,
  color,
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div
        className={cn(spinnerVariants({ size, color }), className)}
        role="status"
        aria-label={label || "Loading"}
      >
        <span className="sr-only">{label || "Loading..."}</span>
      </div>
      {label && <p className="text-sm font-medium text-slate-600">{label}</p>}
    </div>
  );
}

// Preset loading states
export const LoadingStates = {
  Page: () => (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <LoadingSpinner size="xl" label="Loading page..." />
    </div>
  ),

  Section: () => (
    <div className="py-12 flex items-center justify-center">
      <LoadingSpinner size="lg" label="Loading content..." />
    </div>
  ),

  Inline: () => <LoadingSpinner size="sm" />,

  Button: () => <LoadingSpinner size="sm" color="white" />,
};

export { spinnerVariants };
