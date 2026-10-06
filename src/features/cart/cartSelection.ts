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
