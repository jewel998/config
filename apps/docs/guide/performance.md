# Performance Tuning

> See also: [Self-Hosting Guide](/guide/self-hosting) · [Cloud Functions Reference](/api/cloud-functions) · [Cost & Scaling](/guide/cost)

Optimize your @jewel998/config deployment for the lowest possible latency.

## Region Selection

The single biggest factor in API response time is **geographic distance** between your users, [Cloud Functions](/api/cloud-functions), and Firestore. All three should be in the same region.

Edit `functions/src/utils/constants.ts`:

```typescript
// Choose the region closest to your users
export const API_REGION = "asia-south1"; // Mumbai (default)
```

Then update `firebase.json` rewrites to match:

```json
{
  "source": "/api/v1/config",
  "function": "getConfig",
  "region": "asia-south1"
}
```

| Your Users         | Recommended Region            | Firestore Location |
| ------------------ | ----------------------------- | ------------------ |
| India / South Asia | `asia-south1` (Mumbai)        | `asia-south1`      |
| US                 | `us-central1` (Iowa)          | `us-central1`      |
| Europe             | `europe-west1` (Belgium)      | `europe-west1`     |
| Southeast Asia     | `asia-southeast1` (Singapore) | `asia-southeast1`  |
| East Asia          | `asia-east1` (Taiwan)         | `asia-east1`       |

::: warning Firestore region must match
If your Cloud Functions are in `asia-south1` but your Firestore database is in `us-central1`, every query adds 200-400ms of cross-region latency. Always create your Firestore database in the same region as your functions.
:::

## Eliminating Cold Starts

Cloud Functions experience **cold starts** (2-4 seconds) when no instance is warm. This happens after periods of inactivity. To eliminate cold starts:

Edit `functions/src/utils/constants.ts`:

```typescript
// Set to 1 or higher to keep instances warm (costs ~$3-5/month per instance)
export const MIN_INSTANCES = 1;
```

| Setting                       | Behavior                                             | Cost         |
| ----------------------------- | ---------------------------------------------------- | ------------ |
| `MIN_INSTANCES = 0` (default) | Cold starts after idle periods (~2-4s first request) | $0           |
| `MIN_INSTANCES = 1`           | One instance always warm, no cold starts             | ~$3-5/month  |
| `MIN_INSTANCES = 2`           | Two warm instances, handles concurrent cold bursts   | ~$6-10/month |

**Recommendation:**

- Development / low traffic: `0` (free, accept occasional cold starts)
- Production with consistent traffic: `1` (eliminates cold starts)
- Production with traffic spikes: `2+` (prevents queuing during bursts)

## Expected Latency

With properly matched regions (functions + Firestore in same region):

| Scenario                                                       | Latency     |
| -------------------------------------------------------------- | ----------- |
| CDN cache hit (version poll)                                   | 10-50ms     |
| CDN cache hit (config fetch, client mode)                      | 10-50ms     |
| Warm function, same-region Firestore                           | 100-200ms   |
| Cold start (no minInstances)                                   | 2000-4000ms |
| Cross-region Firestore (e.g., functions in Mumbai, DB in Iowa) | 500-1000ms  |

## Additional Optimizations

- **Use `browserStorage()`** in the SDK — cached values persist across page loads, eliminating API calls on return visits. See [Storage & Caching](/guide/storage) for configuration options.
- **Set longer `pollInterval`** — 10-15 minutes instead of 5 if you don't need instant flag propagation
- **Use key filtering** — Pass `keys` parameter to fetch only the flags you need (projected read)
- **CDN is your friend** — Firebase Hosting CDN caches `/api/v1/version` for 15s and `/api/v1/config` (client mode) for 60s at edge nodes worldwide. Most requests never reach your function.

## Related

- [Cost & Scaling](/guide/cost) — Cost tables and optimization tips
- [Self-Hosting Guide](/guide/self-hosting) — Full deployment setup
- [Cloud Functions Reference](/api/cloud-functions) — Function configuration constants
- [Storage & Caching](/guide/storage) — SDK cache adapters that reduce API calls
