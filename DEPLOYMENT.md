# Deploy — TryBuy Frontend on Cloudflare Workers

Static SPA served by an assets-only Cloudflare Worker, released from GitHub
Actions. The API is **not** here: it runs on the EC2 box from the `api` repo,
behind nginx + certbot, released by that repo's own `CI → Deploy` pair. The two
deploys are independent — shipping the FE never touches the gateway, and vice
versa.

| | |
|---|---|
| Host | Cloudflare Workers (static assets), Worker `fe-react-vite` |
| Live URL | https://fe-react-vite.quangtruong01234.workers.dev |
| Build | GitHub Actions runner: `npm run build` → `dist/` |
| Release trigger | CI green on `main` → `.github/workflows/deploy.yml` |
| Config | `wrangler.toml` (assets-only Worker, no script) |
| Rollback | dashboard → the Worker → Deployments → roll back |

## Why this shape

Cloudflare offers two products for a static site — Pages and Workers static
assets — and two places to run the build: Cloudflare's own builder (Workers
Builds, the "import a repository" screen) or CI.

This project uses **Workers + GitHub Actions**. Workers because that is where
Cloudflare steers new projects; Actions because Workers Builds reacts to a raw
`push` webhook and has no way to wait for a test run — a red build would ship.
`deploy.yml` gates on `workflow_run` + `conclusion == 'success'`, the same
contract the `api` repo uses to release to EC2.

**Cloudflare's Git integration must stay disconnected.** With both wired up,
every push builds twice, two deployments race, and the one that never ran the
tests can win. If a Worker was already created through that screen, delete it or
disconnect the repo under the Worker → Settings → Build.

## Cost

Free. Requests served from static assets are not metered on any plan, and this
Worker has no `main` script, so nothing executes per request. GitHub Actions is
free for public repos (2,000 min/month on a free private repo; a build here is
~2 min). Free TLS on `*.workers.dev` and on a custom domain. The only thing that
ever costs money is a domain registration.

## One-time setup

### 1. Cloudflare — get two values

**My Profile → API Tokens → Create Token →** use the **"Edit Cloudflare
Workers"** template. Not the Global API Key: that one can do anything to the
account and cannot be scoped.

The account id is on **Workers & Pages → Account details**.

Nothing else to do here. `wrangler deploy` creates the Worker on its first run —
there is no project to pre-create and no dashboard form to fill in.

### 2. GitHub — secrets

**Settings → Secrets and variables → Actions → Secrets → New repository secret:**

| Secret | Value |
|---|---|
| `CLOUDFLARE_API_TOKEN` | the scoped token above |
| `CLOUDFLARE_ACCOUNT_ID` | account id |

### 3. GitHub — the `production` environment

**Settings → Environments → New environment**, name it exactly `production`
(`deploy.yml` declares `environment: production`), then add three
**variables** — the *Environment variables* box, not *Environment secrets*:

| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://api.<domain>/api` |
| `VITE_CHAT_URL` | `https://api.<domain>` |
| `VITE_WS_NOTIFICATION_URL` | `https://api.<domain>` |

Variables rather than secrets on purpose: all three end up readable in the
shipped bundle anyway, and masking them only turns the build log into `***`.

`socket.io-client` upgrades an `https://` origin to `wss://` on its own — do not
write `wss://` here, it breaks the initial polling handshake.

### 4. Backend (the `api` repo's env on the box)

The FE is cross-origin to the gateway, so two gateway env values must change or
**login appears to succeed and every subsequent request is 401**:

```
FRONTEND_URL=https://fe-react-vite.<subdomain>.workers.dev   # or the custom domain
AUTH_COOKIE_SAME_SITE=none
```

The `workers.dev` hostname only exists after the first successful deploy, so the
order is: push → deploy → copy the URL → set these → restart the gateway.

- `FRONTEND_URL` is the gateway's entire CORS allow-list in production
  (`apps/gateway/src/common/cors.ts` — the localhost escape hatch is
  `NODE_ENV !== 'production'` only). Comma-separated for several origins; add
  the custom domain **and** the `workers.dev` one if both stay reachable.
- `AUTH_COOKIE_SAME_SITE=none` is what lets the browser attach `access_token` to
  a cross-site XHR. `getAuthCookieOptions()` forces `secure: true` whenever
  `sameSite === 'none'`, so this only works over https — which both ends already
  are.
- pm2 gotcha inherited from the api repo: `pm2 restart` does **not** refresh the
  stored env snapshot. After changing either value:
  `pm2 delete <app> && pm2 start ecosystem.config.js --env production --only <app>`.

## Release

Merge to `main`. CI runs lint → vitest → `tsc --noEmit` + build; on green,
`Deploy` rebuilds that exact commit with the production env and uploads `dist/`.

`workflow_dispatch` on Deploy re-ships the current `main` — for a Cloudflare-side
failure, or an environment-variable change that no commit accompanies.

Two guards sit between a bad build and the live site:

1. any missing `VITE_*` variable fails the build step with an explicit error,
   because an empty value silently falls back to `http://localhost:3000`;
2. `dist/assets` is grepped for `localhost:3000` before upload — that catches a
   *misspelled* variable name, which the first guard cannot see.

Both were verified in both directions: a build with the production values has no
`localhost:3000` anywhere in `dist/assets`; a build without them does.

## Things that bite

**Vite inlines env at build time.** There is no runtime config for a static
bundle: changing an Environment variable requires a **redeploy**
(`workflow_dispatch` on Deploy), not a restart.

**`VITE_API_URL=/api` is a dev-only value.** It resolves against the Vite dev
server, which proxies to `VITE_API_TARGET`. Deployed, that same path resolves
against the Worker's own origin, where no `/api` route exists — so
`not_found_handling` answers **every API call with `index.html` and a 200**. The
app then fails with JSON parse errors rather than anything that looks like a
routing problem.

**Never track a `.env` with production URLs.** Vite's `loadEnv` prefers inline
`process.env.VITE_*` over `.env` files, so the workflow's values win in CI — but
a committed `.env.production` would be what any *local* `npm run build` picks up,
which is how a laptop build silently points at prod.

**`wrangler.toml`'s `name` is the Worker's identity.** Changing it does not
rename anything: the next deploy creates a *second* Worker and the site you are
watching simply never updates.

**Don't track `public/` as a whole in `.gitignore`.** It used to be there, which
excluded the directory itself — and git cannot re-include a file whose parent
directory is excluded. Anything dropped into `public/` later (robots.txt, a real
favicon, `_headers`) would be missing from the deploy with no error anywhere,
since CI builds from a fresh clone. It now ignores only the design screenshots
(`public/*.png|jpg|jpeg`).

## If the API ever moves same-origin

Routing `/api/*` through the Worker would make the cookie same-site and let
`AUTH_COOKIE_SAME_SITE` go back to `lax`. That means giving this Worker a real
`main` script that proxies to the gateway — at which point requests stop being
free static-asset hits and start counting against the Workers quota. It also
would not cover Socket.IO: `VITE_CHAT_URL` / `VITE_WS_NOTIFICATION_URL` still
need the absolute gateway origin.

## Not covered by CI

`npm run test:e2e` (Playwright) needs a live gateway and a browser download, so
it stays a local gate — run it before trusting a release that touches checkout.

It cannot currently be pointed at a deployed build: `playwright.config.ts` pins
`baseURL` to `http://localhost:5173` and starts its own dev server (`webServer`).
Smoke-testing a deployment means making both env-driven first.
