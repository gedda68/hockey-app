import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

const sectionVariants = cva("w-full", {
  variants: {
    spacing: {
      none: "py-0",
      sm: "py-6",
      md: "py-8 md:py-12",
      lg: "py-12 md:py-16",
      xl: "py-16 md:py-24",
    },
    background: {
      none: "",
      white: "bg-white",
      slate: "bg-slate-50",
      gray: "bg-gray-100",
      dark: "bg-[#06054e] text-white",
    },
  },
  defaultVariants: {
    spacing: "md",
    background: "none",
  },
});

interface SectionProps extends VariantProps<typeof sectionVariants> {
  children: ReactNode;
  className?: string;
  id?: string;
}

/**
 * Section Component
 *
 * Provides consistent vertical spacing and backgrounds for page sections.
 * Use to separate distinct content areas on a page.
 *
 * @example
 * <Section spacing="lg" background="slate">
 *   <h2>Section Title</h2>
 *   <p>Section content</p>
 * </Section>
 *
 * @example
 * <Section id="about" spacing="xl">
 *   <Container>
 *     <h2>About Us</h2>
 *   </Container>
 * </Section>
 */
export default function Section({
  children,
  spacing,
  background,
  className,
  id,
}: SectionProps) {
  return (
    <section
      id={id}
      className={cn(sectionVariants({ spacing, background }), className)}
    >
      {children}
    </section>
  );
}

export { sectionVariants };
