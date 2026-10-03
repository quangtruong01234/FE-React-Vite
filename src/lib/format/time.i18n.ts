import { defineMessages, plural } from '@/lib/i18n/messages';

/** I18N-05 — the time-ago labels on feed, comments, chat and notifications. */
export const timeMessages = defineMessages({
  vi: {
    justNow: 'Vừa xong',
    minutesShort: '{n}p',
    hoursShort: '{n}g',
    daysShort: '{n}n',
    minutesAgo: '{n} phút trước',
    hoursAgo: '{n} giờ trước',
    daysAgo: '{n} ngày trước',
  },
  en: {
    justNow: 'Just now',
    minutesShort: '{n}m',
    hoursShort: '{n}h',
    daysShort: '{n}d',
    minutesAgo: ({ n }) => `${n} ${plural(Number(n), 'minute', 'minutes')} ago`,
    hoursAgo: ({ n }) => `${n} ${plural(Number(n), 'hour', 'hours')} ago`,
    daysAgo: ({ n }) => `${n} ${plural(Number(n), 'day', 'days')} ago`,
  },
});
