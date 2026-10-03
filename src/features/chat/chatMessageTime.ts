import { bindTranslator } from '@/lib/i18n/messages';
import { LANG_LOCALE, type Lang } from '@/lib/i18n/lang';
import { chatCopy } from './chat.i18n';

const DAY_MS = 86400000;

/**
 * Timestamp under a chat bubble: `HH:mm` today, "yesterday HH:mm", a weekday within the last
 * week, otherwise the date in the language's order (`dd/MM/yyyy HH:mm` vi · `MM/dd/yyyy HH:mm` en).
 * Backend timestamps without a zone are UTC.
 */
export function formatMessageTime(iso: string, now: Date = new Date(), lang: Lang = 'vi'): string {
  const t = bindTranslator(chatCopy, lang);
  const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return '';
  const hhmm = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - DAY_MS;
  const sevenDaysAgo = startOfToday - 6 * DAY_MS;
  const time = date.getTime();
  if (time >= startOfToday) return hhmm;
  if (time >= startOfYesterday) return t('yesterdayAt', { time: hhmm });
  if (time >= sevenDaysAgo) return `${t('weekdays').split(',')[date.getDay()]} ${hhmm}`;
  const day = date.toLocaleDateString(LANG_LOCALE[lang], { day: '2-digit', month: '2-digit', year: 'numeric' });
  return `${day} ${hhmm}`;
}
