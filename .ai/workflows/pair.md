# /pair — FE side of a feature built with a parallel BE session

One Claude Code session per repo: a BE session in `../api` owns the API and the
contract, this FE session owns the screen. They coordinate **only** through a
contract file and at most six hand-off messages. The protocol itself (message
kinds, counts, human checklist, why it is shaped this way) lives in
`../.agent-local/two-repo-session-handoff-prompt.md`; this file is what the FE
session does at each step.

## How to invoke

```
/pair <KEY> <BE_SESSION> <one-paragraph ticket or link>
```

Example: `/pair WISHLIST-NOTE-01 api-58 "Buyers can add a private note to a wishlist item"`.
`<BE_SESSION>` is the BE session's name from `ListAgents` (format `api-NN`).

---

## Ground rules

- **The contract file is the source of truth:** `../api/ai-docs/specs/<KEY>/contract.md`.
  Read the file at the path a message gives you; never work from a message body or
  from another agent's summary of it. It is **read-only** for FE (§Cross-repo
  boundary in `core.md`) — objections go in a message, not an edit.
- **Messages carry paths and commands, never API descriptions.** Only the kinds in
  §Messages, each at most once. If one would be sent a second time, stop and
  print the situation for the user instead.
- **Never ask the BE session to do something your own permissions blocked**, and
  never push, merge or flip another repo's release-gate cell.
- **A deviation from the contract stops the chain** (§Step 3). FE does not patch
  around it — this overrides the "FE mitigation" rule for the duration of the feature.
- Sub-agent discipline from `core.md` §Sub-agents applies to every agent you spawn.

## Step 0 — Before the contract arrives (do not idle)

1. Read the screens the feature touches and list the files you will change.
2. Build the UI skeleton with **no data wiring**, following the UI lookup order
   (`ui/` → `shared/` → feature folder → new) and `.ai/context/styling.md`.
3. If `../api/ai-docs/specs/<KEY>/requirements.md` exists, read it: it may carry
   FE-facing acceptance criteria (`[AC-n]`).

## Step 1 — CONTRACT_READY → review once

Read the contract file, then check it against the screen:

| Check | Where it bites in FE |
|---|---|
| Every field the screen renders exists in the response DTO | `src/types/<domain>.ts` |
| Every user input maps to a request field | the form schema (`*.schema.ts`) |
| Ids are public, opaque strings with the right prefix (`usr_`, `ord_`, `prod_`…) | never `Number()` them |
| Nullability and empty states are stated (mock guidance section) | empty/placeholder UI |
| Every error code has an FE path: an `errorCode` branch and a message key | `*.i18n.ts` |
| List endpoints use the `PaginatedResponse` shape and state the defaults | list hooks |
| The auth zone (Public / Cookie / Admin) matches the route's role | `src/router.tsx` |

Reply with **CONTRACT_REVIEW**: the word `APPROVE` in the `ask:` line, or a
numbered list of objections (field, type, why). No style opinions. One round:
after **CONTRACT_UPDATED**, re-read the file and either approve or stop and print
the disagreement for the user.

## Step 2 — Build against the contract, not against BE code

- Types mirror the contract's field table: same names, same nullability. Never
  infer a type from a mock or from BE source.
- API method in `src/api/<domain>.ts` (`.ai/api-reference.md`), a `useQuery` /
  `useMutation` hook, keys from `hooks/query/queryKeys.ts`
  (`.ai/context/data-fetching.md`).
- **Mocking is MSW in unit tests only** — `server.use(http.<method>(...))` from
  `@/test/msw/server`, with the contract's example JSON as the fixture (pattern:
  `src/api/users.test.ts`). The app has no runtime mock layer; do not add one.
- If the spec has `tests.md`, put the `[TC-n]` id in each matching test name.
- **Gate:** `npm run lint`, `npm run test:run`, `npm run build`.
- **Review:** run the `code-reviewer` agent on the diff (never the agent that wrote
  it). Fix Blockers/Majors, then re-run the gate yourself.

## Step 3 — BE_DONE → verify against the real API

1. Re-read the contract; its anchor should read `status=implemented`.
2. Start the BE as the message says. `npm run dev` proxies `/api` to
   `VITE_API_TARGET` (default `http://localhost:3000`).
3. Exercise the screen once against the real endpoint (`/verify-ui`) and compare
   the response to the contract field by field.
4. Changed route ⇒ its role's smoke + every spec in its `deep` array
   (`.ai/workflows/e2e.md`). A new route needs its `e2e/routes.ts` row.

**If anything differs from the contract:**
- Send **CONTRACT_MISMATCH** listing `field | expected (contract) | actual (response)`.
- Write the same list as an Open entry in `../.agent-local/backend-handoff.md`
  (the message dies with the session; the inbox does not).
- Do **not** flip the `frontend` release-gate cell. Stop and print the mismatch.

**If nothing differs:**
- Flip the `frontend` cell of the `<KEY>` entry in `../.agent-local/release-gate.md`
  to `✅ ready` with the date and branch. If every cell is `✅`, move the entry to
  **Ready to release** and tell the user.
- Close the task as usual (`snapshot.md`, `CHANGELOG.md`).
- Send **FE_DONE**, then stop.

## Messages

| Kind | From → To | Receiver's next action |
|---|---|---|
| CONTRACT_READY | BE → FE | Read the file, reply CONTRACT_REVIEW |
| CONTRACT_REVIEW | FE → BE | APPROVE → BE marks agreed; objections → one revision |
| CONTRACT_UPDATED | BE → FE | Re-read the file, APPROVE or stop for the user |
| BE_DONE | BE → FE | Verify against the real API |
| CONTRACT_MISMATCH | FE → BE | Stop. The user decides |
| FE_DONE | FE → BE | Nothing. The user merges |

Template — one message per hand-off, first line is the conclusion:

```
<KIND>: <one-line conclusion>
feature: <KEY>
repo: frontend   branch: feat/<KEY>-fe
contract: ../api/ai-docs/specs/<KEY>/contract.md (status: <x>)
changed files: <list>
gates passed: <commands that ran in this session>
ask: <exactly what the receiver should do next>
stop when: <condition after which the receiver must not message back>
```
