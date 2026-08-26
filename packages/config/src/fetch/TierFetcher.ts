import type { ConfigFetcher } from "../types.js";

export type FetchTier = "critical" | "page" | "prefetch";

/**
 * TierFetcher — wraps a ConfigFetcher and tracks which keys have been
 * fetched per tier.
 *
 * This tracking is the foundation of context-aware re-fetching:
 * when setContext is called, only already-fetched keys are re-fetched,
 * in tier order, rather than triggering a full re-fetch of all 1000+ keys.
 */
export class TierFetcher {
  /** Keys fetched per tier — used to scope context re-fetches */
  private fetchedKeys = new Map<FetchTier, Set<string>>([
    ["critical", new Set()],
    ["page", new Set()],
    ["prefetch", new Set()],
  ]);

  constructor(private readonly fetcher: ConfigFetcher) {}

  /**
   * Fetch a specific set of keys and record them under the given tier.
   * Uses the underlying fetcher's fetchKeys() — sends only these keys to the API.
   */
  async fetchTier(keys: string[], tier: FetchTier): Promise<Record<string, unknown>> {
    const result = await this.fetcher.fetchKeys(keys);

    // Track which keys were successfully fetched for this tier
    const tierSet = this.fetchedKeys.get(tier)!;
    for (const key of Object.keys(result)) {
      tierSet.add(key);
    }

    return result;
  }

  /**
   * Fetch all remaining keys (tier 3 prefetch).
   * Records all returned keys under the "prefetch" tier.
   */
  async fetchAll(): Promise<Record<string, unknown>> {
    const result = await this.fetcher.fetchAll();

    const prefetchSet = this.fetchedKeys.get("prefetch")!;
    for (const key of Object.keys(result)) {
      // Only add keys not already tracked under a higher-priority tier
      if (!this.fetchedKeys.get("critical")!.has(key) && !this.fetchedKeys.get("page")!.has(key)) {
        prefetchSet.add(key);
      }
    }

    return result;
  }

  /** Check the remote version (passthrough). */
  checkVersion(): ReturnType<ConfigFetcher["checkVersion"]> {
    return this.fetcher.checkVersion();
  }

  /**
   * Get all keys that have been fetched, grouped by tier.
   * Used by the context re-fetch path.
   */
  getFetchedKeys(): { critical: string[]; page: string[]; prefetch: string[] } {
    return {
      critical: Array.from(this.fetchedKeys.get("critical")!),
      page: Array.from(this.fetchedKeys.get("page")!),
      prefetch: Array.from(this.fetchedKeys.get("prefetch")!),
    };
  }

  /** Whether any keys have been fetched for a given tier. */
  hasFetchedTier(tier: FetchTier): boolean {
    return this.fetchedKeys.get(tier)!.size > 0;
  }
}
