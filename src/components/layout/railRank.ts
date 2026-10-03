import { LANG_LOCALE, type Lang } from '@/lib/i18n/lang';
import { translate } from '@/lib/i18n/messages';
import { layoutMessages } from './layout.i18n';

/**
 * RAIL-RANK-01: both right-rail panels are ranked by `soldCount` — units sold in
 * the last 30 days. Rows the backend added only to fill a short rail (newest
 * shops, top-rated products) carry `soldCount: 0`, so they earned no claim to
 * being "featured" or "hot" and get no sold line and no badge.
 */
export function hasSales(soldCount: number): boolean {
  return soldCount > 0;
}

/** "Đã bán 1.234" / "1,234 sold" for a ranked row, `null` for a backfill row. */
export function soldCountLabel(soldCount: number, lang: Lang = 'vi'): string | null {
  if (!hasSales(soldCount)) return null;
  return translate(layoutMessages, lang, 'soldCount', { count: soldCount.toLocaleString(LANG_LOCALE[lang]) });
}
