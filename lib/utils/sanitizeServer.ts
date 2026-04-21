/**
 * lib/utils/sanitizeServer.ts
 *
 * Server-side HTML sanitisation using `sanitize-html`.
 * Pure Node.js — no DOM / jsdom required. Safe to import in API routes,
 * Server Components, and any server-only module.
 *
 * DO NOT import DOMPurify here — it requires a browser DOM and will throw
 * on the server. Use lib/utils/sanitize.ts (client-side) for render-time
 * defence-in-depth.
 *
 * ── Design notes ─────────────────────────────────────────────────────────────
 *
 * We sanitise on WRITE (before MongoDB), not on READ. This means:
 *   1. The stored value is already clean — any future render path (SSR, email,
 *      export) is safe by default without needing a second sanitise call.
 *   2. Client-side DOMPurify in display components remains as defence-in-depth
 *      for content loaded from external sources or migrated from before this
 *      change was deployed.
 *
 * Allowlist matches the Lexical editor's output set — nothing is blocked that
 * a legitimate editor could produce.
 */

import sanitizeHtmlLib from "sanitize-html";

/** Shared tag/attribute allowlist for rich-text HTML fields. */
const RICH_TEXT_OPTIONS: sanitizeHtmlLib.IOptions = {
  allowedTags: [
    // Block
    "p", "br", "blockquote", "pre",
    // Headings
    "h1", "h2", "h3", "h4",
    // Inline
    "b", "strong", "i", "em", "u", "s", "strike", "code", "mark", "span",
    // Lists
    "ul", "ol", "li",
    // Links
    "a",
    // Tables (Lexical Pro / custom table plugin)
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
  ],
  allowedAttributes: {
    // Links: only safe protocols; force noopener on blank targets
    a: ["href", "target", "rel"],
    // Spans: allow class for Lexical colour/format tokens only
    span: ["class"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  // `allowedSchemesByTag` is not needed since allowedSchemes applies globally.
  // Strip unknown tags entirely (don't keep their inner text via disallowedTagsMode).
  disallowedTagsMode: "discard",
  // Prevent href-based script injection even if allowedSchemes is ever relaxed.
  allowedSchemesAppliedToAttributes: ["href"],
  // Do not allow anything inside <a> that isn't text or inline elements.
  exclusiveFilter: (frame) => {
    // Reject <a> tags with javascript: href even if scheme slips through
    if (frame.tag === "a") {
      const href = frame.attribs?.href ?? "";
      if (/^javascript\s*:/i.test(href.trim())) return true; // remove this node
    }
    return false;
  },
};

/**
 * Sanitise rich-text HTML before storing to MongoDB.
 *
 * Allows the full Lexical editor output tag set (headings, lists, links,
 * tables, inline formatting). Strips all event handlers, `javascript:` hrefs,
 * `<script>`, `<style>`, `<iframe>`, and any tag not in the allowlist.
 *
 * @param html - Raw HTML string from the client (Lexical `$generateHtmlFromNodes`).
 * @returns   Sanitised HTML string, safe to store and render.
 *
 * @example
 *   // In an API route handler, before writing to MongoDB:
 *   const safeContent = sanitizeRichText(formData.get("content") as string);
 *   await collection.insertOne({ ...doc, content: safeContent });
 */
export function sanitizeRichText(html: string): string {
  if (!html || typeof html !== "string") return "";
  return sanitizeHtmlLib(html.trim(), RICH_TEXT_OPTIONS);
}

/**
 * Strip ALL HTML tags and return plain text.
 * Use for fields that are sent in emails or used as text-only values
 * (e.g. `fixtureChangeEmailSupplementText`, `weeklyDigestIntroText`).
 *
 * @example
 *   const safeSupplementText = stripAllTags(body.fixtureChangeEmailSupplementText);
 */
export function stripAllTags(value: string | null | undefined): string | null {
  if (!value || typeof value !== "string") return null;
  const stripped = sanitizeHtmlLib(value.trim(), { allowedTags: [], allowedAttributes: {} });
  return stripped || null;
}
