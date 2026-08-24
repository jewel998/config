# Troubleshooting

> See also: [Self-Hosting Guide](/guide/self-hosting) · [Cloud Functions](/api/cloud-functions)

Common issues and fixes when running your @jewel998/config deployment.

## "gRPC 5 NOT_FOUND" in function logs

The composite index for `clientIds` isn't deployed. Run:

```bash
firebase deploy --only firestore:indexes --project your-project-id
```

## CORS errors calling the API

If you see CORS errors when calling `https://your-project.web.app/api/v1/config`:

1. Ensure hosting is deployed: `firebase deploy --only hosting`
2. The hosting config includes CORS headers for `/api/**`
3. As a fallback, call the function URL directly: `https://REGION-your-project.cloudfunctions.net/getConfig` (replace `REGION` with your configured region, e.g., `asia-south1`)

## "Permission denied" on Firestore

Make sure you've deployed the security rules: `firebase deploy --only firestore:rules`

## Cloud Functions returning 500

Check the function logs: Firebase Console → Functions → Logs. Common causes:

- Missing Firestore index (see above)
- Database name mismatch (if you have a non-standard database name, see `functions/src/utils/firestore.ts`)

## Portal shows blank page

Ensure the environment variables in `.env.production` match your Firebase project. Rebuild and redeploy.

## SDK returns undefined values

1. Check that your API key is active (not revoked) in the portal
2. Verify `baseUrl` points to your deployment
3. Check browser console — if you see 401/403, the SDK's [circuit breaker](/api/) will stop retrying for 5 minutes
4. If using `createConfig`, call `client.destroy()` and reinitialize to reset the circuit breaker. With `initConfig`, reload the page.

## SDK stops making requests (circuit breaker)

If the SDK receives a 400, 401, or 403 error, it activates a circuit breaker that blocks all requests for 5 minutes. This prevents hammering a misconfigured endpoint. After the cooldown, it automatically retries once.

## Related

- [Self-Hosting Guide](/guide/self-hosting) — Full deployment steps
- [Cloud Functions Reference](/api/cloud-functions) — Function configuration and deployment
- [Performance Tuning](/guide/performance) — Region selection and latency optimization
- [SDK Reference](/api/) — Circuit breaker and error handling details
