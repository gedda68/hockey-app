"use client";

/**
 * Sanitizes an HTML string using DOMPurify to prevent XSS attacks.
 * Only call this in client components — DOMPurify requires a DOM environment.
 *
 * @example
 *   dangerouslySetInnerHTML={{ __html: sanitizeHtml(content) }}
 */
export function sanitizeHtml(html: string): string {
  if (typeof window === "undefined") {
    // Should not be called server-side, but return empty string as a safe fallback.
    return "";
  }
  // Dynamic import keeps DOMPurify out of the server bundle.
  // We use the synchronous require() form here because this runs only in the browser.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const DOMPurify = require("dompurify");
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "br", "b", "strong", "i", "em", "u", "s",
      "ul", "ol", "li", "a", "span", "h1", "h2", "h3", "h4",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    FORCE_BODY: false,
  });
}
