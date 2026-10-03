/**
 * Shared date/time formatting (locale per `lang`, I18N-07) — one canonical behavior per format so
 * timestamps read the same across feed, chat, notifications, orders, admin.
 * (Chat bubbles keep their own today/yesterday/weekday format in
 * `ChatThread.formatMessageTime` — different semantics, not a duplicate.)
 */

import { bindTranslator } from '@/lib/i18n/messages';
import { LANG_LOCALE, type Lang } from '@/lib/i18n/lang';
import { timeMessages } from './time.i18n';

/** "04/07/2026" (vi) · "07/04/2026" (en) — empty string for missing/invalid input. */
export function formatDate(dateStr: string, lang: Lang = 'vi'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(LANG_LOCALE[lang], {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/** "04/07/2026 19:20" (vi) · "07/04/2026, 07:20 PM" (en) — empty string for missing/invalid input. */
export function formatDateTime(dateStr: string, lang: Lang = 'vi'): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString(LANG_LOCALE[lang], {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Compact time-ago for feed/chat lists: "Vừa xong" · "5p" · "3g" · "2n" (EN "Just now" · "5m" · "3h" · "2d"). */
export function relativeTimeShort(dateStr: string, lang: Lang = 'vi', now: number = Date.now()): string {
  const ms = new Date(dateStr).getTime();
  if (isNaN(ms)) return '';
  const t = bindTranslator(timeMessages, lang);
  const minutes = Math.floor((now - ms) / 60000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesShort', { n: minutes });
  const h = Math.floor(minutes / 60);
  if (h < 24) return t('hoursShort', { n: h });
  return t('daysShort', { n: Math.floor(h / 24) });
}

/** Long time-ago for notifications: "Vừa xong" · "5 phút trước" · "3 giờ trước" · "2 ngày trước". */
export function relativeTimeLong(dateStr: string, lang: Lang = 'vi', now: number = Date.now()): string {
  const ms = new Date(dateStr).getTime();
  if (isNaN(ms)) return '';
  const t = bindTranslator(timeMessages, lang);
  const minutes = Math.floor((now - ms) / 60000);
  if (minutes < 1) return t('justNow');
  if (minutes < 60) return t('minutesAgo', { n: minutes });
  const h = Math.floor(minutes / 60);
  if (h < 24) return t('hoursAgo', { n: h });
  return t('daysAgo', { n: Math.floor(h / 24) });
}
