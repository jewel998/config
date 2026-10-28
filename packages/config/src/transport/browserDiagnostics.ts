/// <reference lib="dom" />

const warnedMessages = new Set<string>();

function warnOnce(message: string, cause?: unknown): void {
  if (warnedMessages.has(message)) return;
  warnedMessages.add(message);
  if (cause === undefined) console.warn(`[config] ${message}`);
  else console.warn(`[config] ${message}`, cause);
}

function sourceAllowsUrl(source: string, target: URL): boolean {
  const normalized = source.replace(/^['"]|['"]$/g, "");
  if (normalized === "*") return true;
  if (normalized === "none") return false;
  if (normalized === "self") return target.origin === window.location.origin;
  if (/^[a-z][a-z\d+.-]*:$/i.test(normalized)) return target.protocol === normalized;

  try {
    const sourceUrl = new URL(normalized);
    if (sourceUrl.protocol !== target.protocol) return false;
    const sourceHost = sourceUrl.hostname.toLowerCase();
    const targetHost = target.hostname.toLowerCase();
    const hostMatches = sourceHost.startsWith("*.")
      ? targetHost.endsWith(sourceHost.slice(1))
      : sourceHost === targetHost;
    const portMatches = !sourceUrl.port || sourceUrl.port === target.port;
    return hostMatches && portMatches;
  } catch {
    return false;
  }
}

/** Warn when a readable meta CSP blocks the SDK's API connection. */
export function warnIfCspBlocksUrl(baseUrl: string): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  let target: URL;
  try {
    target = new URL(baseUrl, window.location.href);
  } catch {
    return;
  }

  const policies = Array.from(
    document.querySelectorAll<HTMLMetaElement>('meta[http-equiv="Content-Security-Policy"]'),
  )
    .map((meta) => meta.content)
    .filter(Boolean);

  for (const policy of policies) {
    const directives = policy.split(";").map((directive) => directive.trim().split(/\s+/));
    const connect = directives.find(([name]) => name === "connect-src");
    const fallback = directives.find(([name]) => name === "default-src");
    const sources = connect?.slice(1) ?? fallback?.slice(1);
    if (sources && !sources.some((source) => sourceAllowsUrl(source, target))) {
      warnOnce(
        `CSP may block requests to ${target.origin}. Add ${target.origin} to connect-src (or default-src) in your Content-Security-Policy.`,
      );
    }
  }
}

/** Fetch failures are intentionally non-fatal; cached/default values can continue. */
export function warnForFetchFailure(url: string, error: unknown): void {
  if (typeof window === "undefined") return;
  const message = error instanceof Error ? error.message : String(error);
  warnOnce(
    `The config request to ${url} failed. This may be a CORS or CSP connect-src restriction; the SDK will continue using cached/default values.`,
    message,
  );
}
