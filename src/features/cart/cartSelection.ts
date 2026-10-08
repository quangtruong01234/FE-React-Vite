/**
 * Lines checked when `/cart` opens: the ones the caller asked for ("Mua lại"
 * passes the re-added lines in `location.state.selectedIds`) when any of them
 * are still in the cart, otherwise every line.
 */
export function initialCartSelection(
  itemIds: number[],
  preselected: readonly number[] | undefined,
): Set<number> {
  const wanted = new Set(preselected ?? []);
  const picked = itemIds.filter((id) => wanted.has(id));
  return new Set(picked.length > 0 ? picked : itemIds);
}

/**
 * The checked lines that still exist. `selectedIds` is never pruned when a line
 * goes away (removed here or in another tab, sold out on refetch), so every
 * count, "chọn tất cả" state and the checkout hand-off must read through this —
 * otherwise a removed id keeps "Thanh toán (2)" on a one-line cart and the
 * select-all box can never read checked again (prod route test F12, 2026-10-08).
 */
export function liveCartSelection(
  selectedIds: ReadonlySet<number>,
  itemIds: readonly number[],
): Set<number> {
  return new Set(itemIds.filter((id) => selectedIds.has(id)));
}
