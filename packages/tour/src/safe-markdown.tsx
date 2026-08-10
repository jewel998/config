/**
 * Safe Markdown renderer for tour descriptions.
 * Supports a limited subset — no raw HTML injection possible.
 *
 * Supported syntax:
 *   **bold**          → <strong>
 *   *italic*          → <em>
 *   `code`            → <code>
 *   > blockquote      → <blockquote>
 *   - list item       → <li> inside <ul>
 *   1. ordered item   → <li> inside <ol>
 *   [text](url)       → <a> (href sanitized)
 *   \n                → line breaks
 *
 * All output is constructed via React elements — never uses dangerouslySetInnerHTML.
 */

import type { ReactNode } from "react";

export function SafeMarkdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const elements: ReactNode[] = [];
  let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;

  function flushList() {
    if (!listBuffer) return;
    const Tag = listBuffer.type;
    elements.push(
      <Tag key={elements.length} className="tour-md-list">
        {listBuffer.items.map((item, i) => (
          <li key={i}>{renderInline(item)}</li>
        ))}
      </Tag>,
    );
    listBuffer = null;
  }

  for (const line of lines) {
    // Unordered list: - item or • item
    if (/^[\-•]\s+/.test(line)) {
      if (!listBuffer || listBuffer.type !== "ul") {
        flushList();
        listBuffer = { type: "ul", items: [] };
      }
      listBuffer.items.push(line.replace(/^[\-•]\s+/, ""));
      continue;
    }

    // Ordered list: 1. item
    if (/^\d+\.\s+/.test(line)) {
      if (!listBuffer || listBuffer.type !== "ol") {
        flushList();
        listBuffer = { type: "ol", items: [] };
      }
      listBuffer.items.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }

    flushList();

    // Blockquote: > text
    if (line.startsWith("> ")) {
      elements.push(
        <blockquote key={elements.length} className="tour-md-blockquote">
          {renderInline(line.slice(2))}
        </blockquote>,
      );
      continue;
    }

    // Empty line = paragraph break
    if (line.trim() === "") {
      elements.push(<br key={elements.length} />);
      continue;
    }

    // Regular text line
    elements.push(
      <span key={elements.length} className="tour-md-line">
        {renderInline(line)}
      </span>,
    );
  }

  flushList();

  return <div className="tour-md">{elements}</div>;
}

/**
 * Render inline markdown: bold, italic, code, links.
 * All done via regex → React elements. No HTML parsing.
 */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  // Combined regex for inline elements
  const regex = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\((.+?)\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    if (match[1]) {
      // **bold**
      parts.push(<strong key={key++}>{match[2]}</strong>);
    } else if (match[3]) {
      // *italic*
      parts.push(<em key={key++}>{match[4]}</em>);
    } else if (match[5]) {
      // `code`
      parts.push(
        <code key={key++} className="tour-md-code">
          {match[6]}
        </code>,
      );
    } else if (match[7]) {
      // [text](url) — sanitize URL
      const href = sanitizeUrl(match[9]);
      parts.push(
        <a
          key={key++}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="tour-md-link"
        >
          {match[8]}
        </a>,
      );
    }

    lastIndex = match.index + match[0].length;
  }

  // Remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

/**
 * Sanitize URLs — only allow http/https. Block javascript: and data: URIs.
 */
function sanitizeUrl(url: string): string {
  const trimmed = url.trim().toLowerCase();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return url.trim();
  }
  return "#";
}
