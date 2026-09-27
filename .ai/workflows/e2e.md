# /e2e — Run or Write a Playwright Spec

Operate the `e2e/` suite. Decision rules and constraints live in **`.ai/testing.md` § E2E
(Playwright)**; operational detail (spec → audit map, selector conventions) lives in
**`e2e/README.md`**. Read both before writing a new spec — this file is the procedure only.

## How to invoke

```
/e2e                    # run the whole suite
/e2e <spec>             # run one spec
/e2e write <flow>       # add a spec for a flow
/e2e coverage           # print the route coverage table (smoke + deep, what is owed)
/e2e fill [n]           # pay down coverage debt: deep specs for the top n owed routes (default 1)
```

## Two layers

| Layer | Where | What it proves | Grows how |
|---|---|---|---|
| **Smoke** | `e2e/routes.ts` manifest + `smoke.<role>.spec.ts` | Every route renders for its role: no uncaught error / `console.error`, no 5xx (no 401/403 when signed in), no ApiErrorState, no redirect off the path. Plus the role gates (`FORBIDDEN`, signed-out → `/login`) and a 404 positive control. | **Automatically** — one row in the manifest. `src/router.test.ts` fails `test:run` if a router path has no row (or a row outlives its route). |
| **Deep** | `<flow>.<role>.spec.ts` | The route's real flow (submit, transition, retry, …) | By hand, via `/e2e write` or `/e2e fill`; list the file in that route's `deep` array. |

A route whose `deep` is empty is **coverage debt** ("còn nợ"): smoke-covered, not flow-covered.

---

## Before running: two blockers you cannot clear yourself

1. **Browser binary.** `npm install` is blocked for agents, so `npx playwright install chromium`
   must be run by the user. A missing-executable error means exactly this — **ask, don't retry**.
2. **Backend on `:3000`.** The Vite dev server auto-starts (`webServer`, `reuseExistingServer:
   true`); the backend does not. This suite hits a real API — it is not mocked end to end.

If either is missing, stop and say which one. Do **not** report the task blocked: e2e is not part
of the gate (`build` + `lint` + `test:run` are, and all three run offline).

## Run

```bash
npm run test:e2e                                     # headless, all projects
npx playwright test e2e/order-detail.buyer.spec.ts   # single spec
npm run test:e2e:ui                                  # UI mode (interactive; user-driven)
npm run test:e2e:report                              # open last HTML report
```

## Reading the result — three outcomes, not two

| Result | Meaning | Action |
|---|---|---|
| **Pass** | Behaviour holds | Done |
| **Fail** | Either a regression **or** a known-open bug the spec correctly asserts against | Check the spec → audit map in `e2e/README.md` **before** calling it a regression |
| **Skipped** | A `test.skip(...)` guard fired — required data absent (empty cart, no fresh pending order) | **Not a pass.** Report it as "not exercised" and say what data was missing |

Never report "e2e green" when specs were skipped. Count them explicitly.

**A burst of red across unrelated routes** (502 on `/cart` + `/notifications`, bounces to `/login`)
is usually the gateway restarting under watch mode while someone edits `api/`. Read `uptime` from
`GET :3000/health` before and after the run; if it is shorter than the run, that run does not count
— re-run with `--last-failed` once it is stable.

## `/e2e coverage`

Read-only. Build the table from `e2e/routes.ts` — never from memory; the manifest is the source:

| Route | Smoke roles | Deep specs | Status |
|---|---|---|---|
| `/order/:id` | buyer | order-detail, payment-retry | ✅ |
| `/sell/orders` | shop | — | còn nợ |

Then the totals (routes / deep-covered / owed) and, if a run result is at hand, the last smoke
outcome per route. Rank owed routes by risk: money and state transitions first (checkout, orders,
seller orders/returns, vouchers), then admin moderation, then read-only pages.

## `/e2e fill [n]`

1. Run `/e2e coverage`; take the top `n` owed routes by that ranking.
2. For each, read the page component, pick the one flow a user actually completes there, and write
   `<flow>.<role>.spec.ts` per **Writing a new spec** below.
3. Add the file to the route's `deep` array in `e2e/routes.ts`.
4. Run the new spec **and** that role's smoke (`npx playwright test --project=<role>`). Report
   pass / fail / skip per spec — a skip is "not exercised", never a pass.

## After changing code on a route

Re-run that route's specs: its smoke (`npx playwright test --project=<role> -g "<pattern> "`) plus
every file in its `deep` array. A **new** route needs only its manifest row to be smoke-covered —
leave `deep: []` and report it as owed.

## Writing a new spec

**First: which layer?** "Does the page open cleanly for this role" is already the smoke — don't
write a spec for it. A deep spec is for a flow. Logic that fits Vitest + MSW (a pure helper, a
response shape, a render branch) still belongs there — see the decision table in `.ai/testing.md`.

For a flow:

1. **Name it for its role** — `<flow>.buyer.spec.ts`, `.shop.spec.ts`, `.admin.spec.ts`, or
   `.public.spec.ts` (signed out). The infix is what binds the spec to a Playwright project and its
   cached `storageState`. A file without one runs in **no project** at all.
2. **Never log in inside a spec.** The `setup` project already authenticates buyer, shop and admin
   through the real `/login` UI and caches cookies to `e2e/.auth/*.json` (gitignored). Buyer/shop
   credentials come from `e2e/accounts.ts`; admin from `E2E_ADMIN_USERNAME` / `E2E_ADMIN_PASSWORD`
   (env, or `e2e/.env.local` per `e2e/.env.example`) — unset, the `admin` project is dropped.
   Resolve ids at run time with `e2e/api.ts`; public ids are opaque strings, never `Number()` them.
3. **Guard on data, don't assume it.** If the flow needs cart items or a pending order, add a
   `test.skip(...)` guard rather than letting the spec fail on missing fixtures.
4. **Selectors:** roles + visible Vietnamese text, matching the existing specs. If a selector is
   flaky, adding a `data-testid` to the component is the sanctioned fix — do that instead of
   writing a brittle CSS/nth-child chain.
5. **Assert the intended behaviour, not today's behaviour.** If the flow is currently buggy, the
   spec should be red and the bug recorded in `snapshot.md`. A spec that encodes a bug is worse
   than no spec.
6. **Sequential by design.** `workers: 1` / `fullyParallel: false` — specs share one backend and
   real data. Don't add parallelism.

## After writing

- `e2e/` sits outside every `tsconfig` `include`, so **`npm run build` will not typecheck your
  spec**. A type error there only appears when Playwright runs — run the spec at least once, or
  say plainly that you could not.
- Add the file to its route's `deep` array in `e2e/routes.ts`, and a row to the spec map in
  `e2e/README.md`.
- If the spec revealed a backend contract problem, append to `../.agent-local/backend-handoff.md`
  per `core.md`.
