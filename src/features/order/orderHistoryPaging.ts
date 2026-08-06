import type { OrderFilterKey } from './orderFilterCounts';

/**
 * The buyer order list filters **client-side** over whatever pages the infinite
 * query has loaded, while the tab badges come from a **full-history server
 * count** (`GET /order/user/:id/status-counts`). The two therefore disagree the
 * moment a match lives past the loaded pages.
 *
 * Verified live 2026-08-04 on a 65-order account: `status-counts` returned
 * `refunded: 1`, so the tab read "Trả hàng/Hoàn tiền (1)", but the only refunded
 * order sat at index 18 — page 2 — while only page 1 (10 rows) was in memory.
 * The tab rendered "Không có đơn hàng nào trong mục này", and the "Tải thêm"
 * button was itself gated to the `all` tab, so there was no way out.
 *
 * Mitigation only. `GET /order/user/:id` accepts nothing but `page` + `limit`
 * (`GetOrdersByUserQueryDto`), unlike the seller list which already takes
 * `status` — so FE cannot ask the server for one status and has to hold the
 * whole history to filter honestly. Delete this module once the buyer endpoint
 * takes `?status=` too (see `backend-handoff.md`).
 */
export function narrowsHistory(filterTab: OrderFilterKey, search: string): boolean {
  return filterTab !== 'all' || search.trim().length > 0;
}

/**
 * True while a narrowed view is still missing pages that could hold matches —
 * i.e. an empty result set is not yet meaningful. Callers must keep fetching and
 * must NOT render the "nothing here" state, or they claim a result they have not
 * finished computing.
 */
export function isHistoryIncomplete(
  filterTab: OrderFilterKey,
  search: string,
  hasNextPage: boolean,
): boolean {
  return hasNextPage && narrowsHistory(filterTab, search);
}
