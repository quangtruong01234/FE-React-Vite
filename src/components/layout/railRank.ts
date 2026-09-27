/**
 * RAIL-RANK-01: both right-rail panels are ranked by `soldCount` — units sold in
 * the last 30 days. Rows the backend added only to fill a short rail (newest
 * shops, top-rated products) carry `soldCount: 0`, so they earned no claim to
 * being "featured" or "hot" and get no sold line and no badge.
 */
export function hasSales(soldCount: number): boolean {
  return soldCount > 0;
}

/** "Đã bán 1.234" for a ranked row, `null` for a backfill row. */
export function soldCountLabel(soldCount: number): string | null {
  return hasSales(soldCount) ? `Đã bán ${soldCount.toLocaleString('vi-VN')}` : null;
}
