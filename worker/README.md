# Public Worker demo

This Worker serves the same claim form as `app.py` and calls Clocked **Verify** server-side.

The Clocked API key must be a Worker **secret**. Do not put it in this folder, in `wrangler.jsonc`, or in `.dev.vars` that you commit (`.dev.vars` is gitignored).

## Deploy (Cloudflare Workers free tier)

From this directory, on a Cloudflare account you are allowed to use:

```bash
npx wrangler@4 deploy
npx wrangler@4 secret put CLOCKED_API_KEY
```

Optional stronger rate-limit store (default is the Cache API):

```bash
npx wrangler@4 kv namespace create RATE_LIMIT
# then add a kv_namespaces binding named RATE_LIMIT in wrangler.jsonc and redeploy
```

Limits in `src/index.js`: 30 verifications per client IP per UTC day, and 100 per day globally.

The demo must stay reachable through 18 November 2026 for judging.
