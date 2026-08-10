import DOMPurify from "dompurify";
import { marked } from "marked";

/**
 * Renders markdown to sanitized HTML.
 * Always use this instead of raw `marked()` + `dangerouslySetInnerHTML`.
 *
 * DOMPurify strips:
 * - <script> tags
 * - Event handlers (onclick, onerror, etc.)
 * - javascript: URLs
 * - data: URLs (except images)
 * - Any other XSS vectors
 */
export function renderMarkdownSafe(markdown: string): string {
  const rawHtml = marked(markdown, { async: false }) as string;
  return DOMPurify.sanitize(rawHtml, {
    ALLOWED_TAGS: [
      "p",
      "br",
      "strong",
      "em",
      "code",
      "pre",
      "blockquote",
      "ul",
      "ol",
      "li",
      "a",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "span",
      "div",
    ],
    ALLOWED_ATTR: ["href", "target", "rel", "class"],
    ALLOW_DATA_ATTR: false,
  });
}
