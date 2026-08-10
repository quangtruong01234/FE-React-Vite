/**
 * The buyer order list now asks the server for one status group at a time
 * (`GET /order/user/:id?status=`, handoff 2026-08-07), so a filter tab paginates
 * on its own and its empty state can trust `total === 0`.
 *
 * What is still client-side is the **"Tìm theo mã đơn…" box**: the endpoint has
 * no order-id search param, so the match is computed over whatever pages the
 * infinite query holds. That reintroduces the original lie in miniature — a
 * matching order sitting on an unloaded page would render "no results" — so a
 * search must keep pulling the rest of the (already status-narrowed) history
 * before its result set means anything.
 *
 * Recorded as a backend gap in `../.agent-local/backend-handoff.md`; delete this
 * module once the endpoint can search by order id server-side.
 */
export function narrowsHistory(search: string): boolean {
  return search.trim().length > 0;
}

/**
 * True while a searched view is still missing pages that could hold matches —
 * i.e. an empty result set is not yet meaningful. Callers must keep fetching and
 * must NOT render the "nothing here" state, or they claim a result they have not
 * finished computing.
 */
export function isHistoryIncomplete(search: string, hasNextPage: boolean): boolean {
  return hasNextPage && narrowsHistory(search);
}
