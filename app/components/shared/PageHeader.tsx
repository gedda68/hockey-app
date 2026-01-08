import { cva } from "class-variance-authority";
import { cn } from "../../lib/utils";

const pageHeaderVariants = cva(
  "flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8"
);

const titleVariants = cva(
  "text-4xl font-black text-[#06054e] uppercase italic tracking-tighter"
);

const highlightVariants = cva("text-red-600");

interface PageHeaderProps {
  title: string;
  highlight: string;
  actions?: React.ReactNode;
  className?: string;
}

export default function PageHeader({
  title,
  highlight,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn(pageHeaderVariants(), className)}>
      <h1 className={titleVariants()}>
        {title} <span className={highlightVariants()}>{highlight}</span>
      </h1>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export { pageHeaderVariants, titleVariants, highlightVariants };
