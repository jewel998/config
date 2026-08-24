/**
 * RefreshManager — handles version-gated, deduplicated config refreshes.
 *
 * Responsibilities:
 * - Version checking before full fetch (skip if unchanged)
 * - In-flight request deduplication (only one refresh at a time)
 * - Tracking time since last fetch (for stale-check gating)
 * - Updating cache and data store on successful refresh
 */

import { withRetry } from "../retry/RetryEngine.js";
import type { CacheStorage, ConfigFetcher, EventEmitterInterface, RetryConfig } from "../types.js";
import { DEFAULT_CACHE_TTL } from "../types.js";

export interface RefreshManagerConfig {
  /** Fetcher for remote config data */
  fetcher: ConfigFetcher;
  /** Cache storage adapter */
  cache: CacheStorage;
  /** Event emitter for lifecycle notifications */
  events: EventEmitterInterface;
  /** Retry configuration */
  retry: Required<RetryConfig>;
  /** Minimum interval between fetches in ms */
  minFetchInterval: number;
}

export class RefreshManager {
  private inflightRefresh: Promise<void> | null = null;
  private lastFetchTime = 0;
  private cachedVersion: string | null = null;

  constructor(private config: RefreshManagerConfig) {}

  /** Time in ms since the last successful fetch */
  get timeSinceLastFetch(): number {
    return Date.now() - this.lastFetchTime;
  }

  /** Whether a fetch has happened recently (within minFetchInterval) */
  get isRecent(): boolean {
    return this.timeSinceLastFetch < this.config.minFetchInterval;
  }

  /**
   * Perform a version-gated refresh with deduplication.
   *
   * 1. If a refresh is already in-flight, returns the existing promise.
   * 2. Checks the remote version first (lightweight call).
   * 3. If version is unchanged, emits an update event and skips full fetch.
   * 4. Otherwise performs a full fetch with retry, updates cache & data.
   *
   * @param data - Mutable data record to update with fetched values
   * @returns The updated data record
   */
  async refresh(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    // Deduplication: if a refresh is already in-flight, reuse it
    if (this.inflightRefresh) {
      await this.inflightRefresh;
      return data;
    }

    const { fetcher, cache, events, retry } = this.config;

    this.inflightRefresh = (async () => {
      try {
        // Version-gated refresh: check version first (lightweight call)
        try {
          const { version } = await fetcher.checkVersion();
          if (this.cachedVersion !== null && version === this.cachedVersion) {
            // Version unchanged — skip full fetch
            events.emit("updated", { keys: [], source: "version-check" });
            this.lastFetchTime = Date.now();
            return;
          }
          this.cachedVersion = version;
        } catch {
          // If version check fails, proceed with full fetch as fallback
        }

        const result = await withRetry(() => fetcher.fetchAll(), retry);
        cache.set("__all__", result, DEFAULT_CACHE_TTL);
        for (const [key, value] of Object.entries(result)) {
          cache.set(key, value, DEFAULT_CACHE_TTL);
        }
        Object.assign(data, result);
        this.lastFetchTime = Date.now();
        events.emit("updated", {
          keys: Object.keys(result),
          source: "refresh",
        });
      } catch (error) {
        events.emit("fetchError", {
          error: error as Error,
          retryCount: retry.maxRetries,
          willRetry: false,
        });
      } finally {
        this.inflightRefresh = null;
      }
    })();

    await this.inflightRefresh;
    return data;
  }
}
