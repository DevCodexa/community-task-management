# Health checks and smoke test

`GET /api/health` is a public, read-only Vercel function. `HEAD` returns the same HTTP status without a response body. Other methods receive 405. Responses are never cached. The function reads the existing `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` runtime environment variables. Use only a Supabase publishable key or legacy anon JWT, never a secret or service-role key. It does not use request headers, cookies, or parameters when checking dependencies.

It makes a GET request to `/auth/v1/health`, using the public key as `apikey`, with a three-second timeout and no redirects. A 200 response with `status: "available"` means this Auth HTTP probe succeeded; it does not imply the entire application is ready. A 503 response with `status: "degraded"` means configuration was missing or invalid, or the Auth probe failed. The probe value is `reachable`, `unavailable`, or `not_configured`.

The response marks `supabase_data_api`, `database`, and `email_worker` as `not_checked`: none is tested. The Data API OpenAPI root (`/rest/v1/`) is intentionally not probed: Supabase documents that it can require an admin key, and its OpenAPI endpoint can also be disabled. A 403 there does not imply the Data API is down. No privileged key is used. See [Supabase self-hosted key verification](https://supabase.com/docs/guides/self-hosting/self-hosted-auth-keys#verifying-the-setup).

The response and server log do not include upstream response bodies, project URLs, API keys, client headers, or exception messages. A failed probe logs a fixed diagnostic message. The endpoint does not install or configure an error-monitoring service.

## Smoke check

After deployment, run the read-only smoke check against an origin you control, using Node.js 20 or newer:

```sh
HEALTH_SMOKE_URL=https://your-deployment.example node tests/health-smoke.mjs
```

The supplied value must be an origin without credentials, a path, query parameters, or a fragment. HTTPS is required except for loopback development servers. The command checks that `/` returns HTML, then requires `/api/health` to return the expected JSON and an available status. It fails on an SPA HTML fallback, redirects, missing configuration, degraded upstreams, malformed results, or timeouts. It prints fixed messages and does not print the target or response bodies. The check does not sign in, check the Data API or database, mutate records, exercise CRUD or RLS, or check a worker. Never point it at a deployment without permission to perform these read-only requests.

Run the isolated tests without credentials or a network service:

```sh
node --test tests/health-*.test.mjs
```

The dedicated GitHub Actions workflow runs these isolated tests. It does not run the smoke check against a live deployment.

## Deployment verification still required

The repository's `vercel.json` rewrites all paths to `/index.html`. Vercel documents that existing filesystem routes, including functions, take precedence over rewrites, so `api/health.js` is intended to handle `/api/health`. Actual function discovery, configuration, and routing have **not** been verified on a Vercel preview or production deployment. Run the smoke check against an authorized preview after deployment to confirm the route returns JSON rather than the SPA fallback. A passing smoke check still does not verify actual user sign-in, role isolation, safe CRUD, database readiness, email-worker delivery, or production error monitoring; those remain separate work.

Vercel routing reference: https://vercel.com/docs/project-configuration/vercel-json#rewrites
