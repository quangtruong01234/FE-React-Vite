/**
 * Local option lists (brands / categories in `BasicInfoSection`) mirror the
 * fetched prop list plus any rows the seller proposed in this session.
 *
 * Ids are normalized to numbers because the API returns string ids despite the
 * type. Previous rows are normalized too: when the prop list loads before
 * mount, `prev` holds string ids that would never match the numeric prop ids
 * and would duplicate rows. Session-created rows absent from the prop list are
 * kept at the end.
 */
export function mergeLocalOptions<T extends { id: number }>(
  propList: T[],
  prev: T[],
): T[] {
  const normalized = propList.map(o => ({ ...o, id: Number(o.id) }));
  const propIds = new Set(normalized.map(o => o.id));
  const newOnly = prev
    .map(o => ({ ...o, id: Number(o.id) }))
    .filter(o => !propIds.has(o.id));
  return [...normalized, ...newOnly];
}
