import type { ReactNode } from "react";

/**
 * Zero-dependency JSON syntax highlighter.
 * Uses simple regex tokenization to colorize JSON strings in the expanded config view.
 */

interface JsonHighlightProps {
  value: string;
}

const tokenize = (json: string): ReactNode[] => {
  // Regex patterns for JSON tokens
  const tokenRegex = /("(?:\\.|[^"\\])*")\s*:/g; // keys
  const valueStringRegex = /:\s*("(?:\\.|[^"\\])*")/g;
  const numberRegex = /:\s*(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
  const boolNullRegex = /\b(true|false|null)\b/g;

  // Simple line-based approach for readability
  const lines = json.split("\n");
  return lines.map((line, lineIdx) => {
    const parts: ReactNode[] = [];
    let lastIndex = 0;
    // Combined regex to find all tokens in a single pass
    const combined =
      /("(?:\\.|[^"\\])*")\s*:|("(?:\\.|[^"\\])*")|\b(true|false|null)\b|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g;
    let match: RegExpExecArray | null;

    while ((match = combined.exec(line)) !== null) {
      // Add plain text before this match
      if (match.index > lastIndex) {
        parts.push(
          <span key={`${lineIdx}-${lastIndex}`}>{line.slice(lastIndex, match.index)}</span>,
        );
      }

      if (match[1]) {
        // Object key
        parts.push(
          <span key={`${lineIdx}-${match.index}`} className="text-blue-600 dark:text-blue-400">
            {match[1]}
          </span>,
        );
        // Include the colon
        const afterKey = line.slice(match.index + match[1].length, match.index + match[0].length);
        parts.push(<span key={`${lineIdx}-${match.index}-colon`}>{afterKey}</span>);
      } else if (match[2]) {
        // String value
        parts.push(
          <span key={`${lineIdx}-${match.index}`} className="text-green-600 dark:text-green-400">
            {match[2]}
          </span>,
        );
      } else if (match[3]) {
        // Boolean or null
        parts.push(
          <span key={`${lineIdx}-${match.index}`} className="text-purple-600 dark:text-purple-400">
            {match[3]}
          </span>,
        );
      } else if (match[4]) {
        // Number
        parts.push(
          <span key={`${lineIdx}-${match.index}`} className="text-amber-600 dark:text-amber-400">
            {match[4]}
          </span>,
        );
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining text
    if (lastIndex < line.length) {
      parts.push(<span key={`${lineIdx}-rest`}>{line.slice(lastIndex)}</span>);
    }

    return (
      <div key={lineIdx} className="leading-5">
        {parts.length > 0 ? parts : line}
      </div>
    );
  });
};

export const JsonHighlight = ({ value }: JsonHighlightProps) => {
  return (
    <pre className="max-h-48 overflow-auto rounded-xl border bg-background p-4 font-mono text-xs">
      {tokenize(value)}
    </pre>
  );
};
