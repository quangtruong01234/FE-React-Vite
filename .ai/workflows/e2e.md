# /e2e — Run or Write a Playwright Spec

Operate the `e2e/` suite. Decision rules and constraints live in **`.ai/testing.md` § E2E
(Playwright)**; operational detail (spec → audit map, selector conventions) lives in
**`e2e/README.md`**. Read both before writing a new spec — this file is the procedure only.

## How to invoke

```
/e2e                    # run the whole suite
/e2e <spec>             # run one spec
/e2e write <flow>       # add a spec for a flow
```

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

## Writing a new spec

**First: does it need to be e2e?** Check the decision table in `.ai/testing.md`. If it fits in
Vitest + MSW, write it there — e2e costs a live backend and a human-run browser install. The suite
exists to encode the payment/order audit checklist
(`.ai/agent-handoff/e2e-payment-audit-2026-06-26.md`); don't grow it into a general UI suite.

If it genuinely needs e2e:

1. **Name it for its role** — `<flow>.buyer.spec.ts` or `<flow>.shop.spec.ts`. The infix is what
   binds the spec to a Playwright project and its cached `storageState`. A file without one gets
   **no session** and will fail confusingly at the first auth-gated page.
2. **Never log in inside a spec.** The `setup` project already authenticates both roles through the
   real `/login` UI and caches cookies to `e2e/.auth/*.json` (gitignored). Credentials come from
   `e2e/accounts.ts`.
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
- Update the spec → audit map table in `e2e/README.md`.
- If the spec revealed a backend contract problem, append to `../.agent-local/backend-handoff.md`
  per `core.md`.
