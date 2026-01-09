import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const emptyStateVariants = cva("bg-white rounded-3xl text-center", {
  variants: {
    size: {
      sm: "p-6",
      md: "p-8",
      lg: "p-12",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

interface EmptyStateProps extends VariantProps<typeof emptyStateVariants> {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * EmptyState Component
 *
 * Standardized empty state display for when no data is available.
 * Use across all pages and components for consistency.
 *
 * @example
 * <EmptyState
 *   title="No matches scheduled"
 *   description="Check back soon for upcoming fixtures!"
 * />
 *
 * @example
 * <EmptyState
 *   icon={<Calendar className="w-12 h-12" />}
 *   title="No results yet"
 *   description="Matches haven't been played yet"
 *   action={
 *     <Button href="/fixtures">
 *       View Fixtures
 *     </Button>
 *   }
 * />
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  size,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn(emptyStateVariants({ size }), className)}>
      {/* Icon */}
      {icon && (
        <div className="mb-4 flex justify-center text-slate-300">{icon}</div>
      )}

      {/* Title */}
      <p className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-2">
        {title}
      </p>

      {/* Description */}
      {description && (
        <p className="text-xs text-slate-500 mb-4 max-w-md mx-auto">
          {description}
        </p>
      )}

      {/* Action Button */}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

// Preset empty states for common scenarios
export const EmptyStates = {
  NoMatches: () => (
    <EmptyState
      title="No matches available"
      description="There are no matches scheduled or completed yet."
    />
  ),

  NoUpcoming: () => (
    <EmptyState
      title="No upcoming fixtures"
      description="Check back soon for the fixture list!"
    />
  ),

  NoResults: () => (
    <EmptyState
      title="No results available yet"
      description="Check back after matches have been played!"
    />
  ),

  NoStandings: () => (
    <EmptyState
      title="No standings available"
      description="Standings will appear once matches have been played."
    />
  ),

  NoStatistics: () => (
    <EmptyState
      title="No statistics available"
      description="Statistics will be generated after matches are completed."
    />
  ),

  SelectDivision: () => (
    <EmptyState
      title="Select a division"
      description="Choose a division from the filters above to view data."
    />
  ),

  NoData: (entityName: string = "data") => (
    <EmptyState
      title={`No ${entityName} available`}
      description={`${entityName} will appear here once available.`}
    />
  ),
};

export { emptyStateVariants };
