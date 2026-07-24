/**
 * Validates whether the request origin matches the environment's allowed domains.
 */
export const isOriginAllowed = (
  origin: string,
  allowedDomains: string[],
): boolean => {
  if (!origin || allowedDomains.length === 0) {
    return false;
  }

  try {
    const url = new URL(origin);
    const hostname = url.hostname;

    return allowedDomains.some((domain) => {
      const normalized = domain.toLowerCase().trim();
      // Support localhost with any port
      if (normalized === "localhost" || normalized === "127.0.0.1") {
        return hostname === "localhost" || hostname === "127.0.0.1";
      }
      return hostname === normalized;
    });
  } catch {
    // If origin is not a valid URL, try matching as hostname directly
    const hostname = origin.toLowerCase().trim();
    return allowedDomains.some((domain) => {
      const normalized = domain.toLowerCase().trim();
      return hostname === normalized;
    });
  }
};
