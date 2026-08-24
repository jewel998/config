// ═══════════════════════════════════════════════════════════════
// Auto-Context Detection Helpers
// Tree-shakeable: only included if explicitly imported by consumer
// ═══════════════════════════════════════════════════════════════

import type { EvaluationContext } from "../plugins/types.js";

/**
 * Automatically detect browser/device attributes and merge with user-provided context.
 *
 * Can be called two ways:
 * 1. No args: returns auto-detected context only
 *    `autoContext()`
 *
 * 2. With user attributes: auto-detects AND merges your attributes (yours win on conflict)
 *    `autoContext({ userId: "user_123", plan: "pro", country: "US" })`
 *
 * @example
 * ```ts
 * const flags = initFlags({
 *   clientId: "cid_xxx",
 *   context: autoContext({ userId: "user_123", plan: "pro" }),
 * });
 * ```
 */
export function autoContext(user?: {
  userId?: string;
  [key: string]: string | number | boolean | string[] | undefined;
}): EvaluationContext {
  const detected: EvaluationContext = {
    attributes: {},
  };

  if (typeof window !== "undefined" && typeof navigator !== "undefined") {
    const ua = navigator.userAgent;
    detected.attributes = {
      browser: detectBrowser(ua),
      browserVersion: detectBrowserVersion(ua),
      os: detectOS(ua),
      device: detectDevice(),
      screenWidth: window.screen?.width ?? 0,
      screenHeight: window.screen?.height ?? 0,
      locale: navigator.language ?? "en",
      timezone: getTimezone(),
    };
  }

  if (!user) return detected;

  // Extract userId from the user object, rest goes to attributes
  const { userId, ...attrs } = user;
  const userAttrs: Record<string, string | number | boolean | string[]> = {};
  for (const [k, v] of Object.entries(attrs)) {
    if (v !== undefined) userAttrs[k] = v;
  }

  return {
    userId,
    attributes: {
      ...(detected.attributes ?? {}),
      ...userAttrs,
    },
  };
}

/**
 * Deep-merge two evaluation contexts. User-provided values take precedence.
 */
export function mergeContext(auto: EvaluationContext, user: EvaluationContext): EvaluationContext {
  return {
    userId: user.userId ?? auto.userId,
    attributes: {
      ...(auto.attributes ?? {}),
      ...(user.attributes ?? {}),
    },
    consentGranted: user.consentGranted ?? auto.consentGranted,
  };
}

// ═══════════════════════════════════════════════════════════════
// Detection Helpers (lightweight, no external deps)
// ═══════════════════════════════════════════════════════════════

function detectBrowser(ua: string): string {
  if (ua.includes("Firefox/")) return "Firefox";
  if (ua.includes("Edg/")) return "Edge";
  if (ua.includes("OPR/") || ua.includes("Opera")) return "Opera";
  if (ua.includes("Chrome/") && !ua.includes("Edg/")) return "Chrome";
  if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
  return "Unknown";
}

function detectBrowserVersion(ua: string): string {
  const patterns: [string, RegExp][] = [
    ["Firefox", /Firefox\/(\d+[\d.]*)/],
    ["Edge", /Edg\/(\d+[\d.]*)/],
    ["Opera", /OPR\/(\d+[\d.]*)/],
    ["Chrome", /Chrome\/(\d+[\d.]*)/],
    ["Safari", /Version\/(\d+[\d.]*)/],
  ];

  for (const [, regex] of patterns) {
    const match = ua.match(regex);
    if (match?.[1]) return match[1];
  }
  return "0";
}

function detectOS(ua: string): string {
  if (ua.includes("Windows")) return "Windows";
  if (ua.includes("Mac OS")) return "macOS";
  if (ua.includes("Linux") && !ua.includes("Android")) return "Linux";
  if (ua.includes("Android")) return "Android";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (ua.includes("CrOS")) return "ChromeOS";
  return "Unknown";
}

function detectDevice(): "desktop" | "mobile" | "tablet" {
  if (typeof window === "undefined") return "desktop";

  const width = window.screen?.width ?? window.innerWidth;
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  if (hasTouch && width < 768) return "mobile";
  if (hasTouch && width >= 768 && width < 1024) return "tablet";
  return "desktop";
}

function getTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}
