import { THEME_INIT_SCRIPT } from "@/lib/theme/theme";

/**
 * Renders the pre-paint theme script into <head>. The content is a constant built
 * from lib/theme/theme.ts (never user input), so inlining it is safe.
 */
export default function ThemeScript() {
  return <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />;
}
