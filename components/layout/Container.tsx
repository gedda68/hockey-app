import { ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const containerVariants = cva("mx-auto w-full", {
  variants: {
    size: {
      sm: "max-w-3xl",
      md: "max-w-5xl",
      lg: "max-w-7xl",
      xl: "max-w-screen-2xl",
      full: "max-w-full",
    },
    padding: {
      none: "px-0",
      sm: "px-4",
      md: "px-4 md:px-6",
      lg: "px-4 md:px-8 lg:px-12",
    },
  },
  defaultVariants: {
    size: "lg",
    padding: "lg",
  },
});

interface ContainerProps extends VariantProps<typeof containerVariants> {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "main";
}

/**
 * Container Component
 *
 * Provides consistent max-width and padding for page content.
 * Replaces inconsistent container implementations across pages.
 *
 * @example
 * <Container>
 *   <h1>Page Content</h1>
 * </Container>
 *
 * @example
 * <Container size="md" padding="sm">
 *   <p>Narrower container with less padding</p>
 * </Container>
 */
export default function Container({
  children,
  size,
  padding,
  className,
  as: Component = "div",
}: ContainerProps) {
  return (
    <Component className={cn(containerVariants({ size, padding }), className)}>
      {children}
    </Component>
  );
}

export { containerVariants };
