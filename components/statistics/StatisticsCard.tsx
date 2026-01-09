import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const cardVariants = cva(
  "bg-white rounded-3xl p-6 shadow-lg hover:shadow-xl transition-all"
);

const valueVariants = cva("text-4xl font-black text-[#06054e]");

const trendVariants = cva("text-xs font-black uppercase", {
  variants: {
    direction: {
      up: "text-green-500",
      down: "text-red-500",
      neutral: "text-slate-400",
    },
  },
  defaultVariants: {
    direction: "neutral",
  },
});

interface StatisticsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: string;
  trendUp?: boolean;
  icon?: React.ReactNode;
}

export default function StatisticsCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
  icon,
}: StatisticsCardProps) {
  return (
    <div className={cardVariants()}>
      {/* Icon */}
      {icon && <div className="mb-4 text-[#06054e] opacity-20">{icon}</div>}

      {/* Title */}
      <div className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2">
        {title}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-3 mb-2">
        <div className={valueVariants()}>{value}</div>
        {trend && (
          <div
            className={trendVariants({
              direction: trendUp ? "up" : "down",
            })}
          >
            {trendUp ? "↑" : "↓"} {trend}
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs text-slate-500 font-medium">{subtitle}</div>
      )}
    </div>
  );
}

export { cardVariants, valueVariants, trendVariants };
