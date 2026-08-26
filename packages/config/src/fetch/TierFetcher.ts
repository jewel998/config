import type { ConfigFetcher } from "../types.js";

export type FetchTier = "prefetch" | "page" | "idle";

/**
 * TierFetcher — wraps a ConfigFetcher with three responsibilities:
 *
 * 1. Tier tracking: records which keys were fetched under which tier
 *    so context re-fetches are scoped to already-fetched keys only.
 *
 * 2. Cross-tier deduplication: a key registered in a higher-priority tier
 *    is never re-fetched by a lower-priority tier call.
 *    Priority order: prefetch > page > idle
 *
 * 3. Pending waiters: get() calls that arrive for an unfetched key
 *    register a waiter here. When the key eventually arrives (via idle
 *    fetch or refresh), all waiters for that key are resolved.
 */
export class TierFetcher {
  // Keys fetched per tier — used to scope context re-fetches
  private readonly fetchedKeys = new Map<FetchTier, Set<string>>([
    ["prefetch", new Set()],
    ["page", new Set()],
    ["idle", new Set()],
  ]);

  // All fetched keys across all tiers — fast membership check for deduplication
  private readonly allFetched = new Set<string>();

  // Pending waiters for suspended get() calls
  // key → array of { resolve, reject } pairs
  private readonly waiters = new Map<
    string,
    Array<{
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
    }>
  >();

  constructor(private readonly fetcher: ConfigFetcher) {}

  // ─── Fetch methods ───────────────────────────────────────────

  /**
   * Fetch a specific set of keys under a given tier.
   * Keys already tracked under any tier are skipped (deduplication).
   */
  async fetchTier(keys: string[], tier: FetchTier): Promise<Record<string, unknown>> {
    const toFetch = keys.filter((k) => !this.allFetched.has(k));
    if (toFetch.length === 0) return {};

    const result = await this.fetcher.fetchKeys(toFetch);
    this.recordKeys(Object.keys(result), tier);
    return result;
  }

  /**
   * Fetch all remaining keys (idle tier).
   * Only keys not already tracked are added to the idle set.
   */
  async fetchAll(): Promise<Record<string, unknown>> {
    const result = await this.fetcher.fetchAll();

    for (const key of Object.keys(result)) {
      if (!this.allFetched.has(key)) {
        this.fetchedKeys.get("idle")!.add(key);
        this.allFetched.add(key);
      }
    }

    return result;
  }

  /** Check the remote version (passthrough). */
  checkVersion(): ReturnType<ConfigFetcher["checkVersion"]> {
    return this.fetcher.checkVersion();
  }

  /**
   * Re-fetch specific keys without deduplication check.
   * Used by doRefresh() — we're intentionally re-fetching already-fetched keys
   * with a new context, so the allFetched deduplication should be bypassed.
   */
  async refetchKeys(keys: string[]): Promise<Record<string, unknown>> {
    return this.fetcher.fetchKeys(keys);
  }

  // ─── Waiter management ───────────────────────────────────────

  /**
   * Register a waiter for a key that hasn't been fetched yet.
   * Returns a Promise that resolves when the key arrives, or rejects on error.
   */
  waitForKey(key: string): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.waiters.has(key)) {
        this.waiters.set(key, []);
      }
      this.waiters.get(key)!.push({ resolve, reject });
    });
  }

  /**
   * Notify all waiters for the given keys with their resolved values.
   * Called by initConfig after any successful fetch.
   */
  notifyWaiters(result: Record<string, unknown>): void {
    for (const [key, value] of Object.entries(result)) {
      const keyWaiters = this.waiters.get(key);
      if (keyWaiters && keyWaiters.length > 0) {
        for (const { resolve } of keyWaiters) {
          resolve(value);
        }
        this.waiters.delete(key);
      }
    }
  }

  /**
   * Reject all waiters for all pending keys.
   * Called when a fetch fails and we need to unblock all suspended get() calls.
   */
  rejectAllWaiters(error: Error): void {
    for (const [key, keyWaiters] of this.waiters) {
      for (const { reject } of keyWaiters) {
        reject(error);
      }
      this.waiters.delete(key);
    }
  }

  /**
   * Reject waiters for specific keys only.
   * Used when a targeted fetch fails for a subset of keys.
   */
  rejectWaiters(keys: string[], error: Error): void {
    for (const key of keys) {
      const keyWaiters = this.waiters.get(key);
      if (keyWaiters) {
        for (const { reject } of keyWaiters) {
          reject(error);
        }
        this.waiters.delete(key);
      }
    }
  }

  /** Whether there are any pending waiters for a given key. */
  hasWaiters(key: string): boolean {
    return (this.waiters.get(key)?.length ?? 0) > 0;
  }

  // ─── Tier introspection ──────────────────────────────────────

  getFetchedKeys(): { prefetch: string[]; page: string[]; idle: string[] } {
    return {
      prefetch: Array.from(this.fetchedKeys.get("prefetch")!),
      page: Array.from(this.fetchedKeys.get("page")!),
      idle: Array.from(this.fetchedKeys.get("idle")!),
    };
  }

  isKeyFetched(key: string): boolean {
    return this.allFetched.has(key);
  }

  hasFetchedTier(tier: FetchTier): boolean {
    return this.fetchedKeys.get(tier)!.size > 0;
  }

  // ─── Private helpers ─────────────────────────────────────────

  private recordKeys(keys: string[], tier: FetchTier): void {
    const tierSet = this.fetchedKeys.get(tier)!;
    for (const key of keys) {
      if (!this.allFetched.has(key)) {
        tierSet.add(key);
        this.allFetched.add(key);
      }
    }
  }
}
