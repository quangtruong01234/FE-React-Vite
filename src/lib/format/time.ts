/**
 * Shared vi-VN date/time formatting — one canonical behavior per format so
 * timestamps read the same across feed, chat, notifications, orders, admin.
 * (Chat bubbles keep their own today/yesterday/weekday format in
 * `ChatThread.formatMessageTime` — different semantics, not a duplicate.)
 */

/** "04/07/2026" — empty string for missing/invalid input. */
export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/** "04/07/2026 19:20" — empty string for missing/invalid input. */
export function formatDateTime(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** Compact time-ago for feed/chat lists: "Vừa xong" · "5p" · "3g" · "2n". */
export function relativeTimeShort(dateStr: string, now: number = Date.now()): string {
  const ms = new Date(dateStr).getTime();
  if (isNaN(ms)) return '';
  const minutes = Math.floor((now - ms) / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes}p`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h}g`;
  return `${Math.floor(h / 24)}n`;
}

/** Long time-ago for notifications: "Vừa xong" · "5 phút trước" · "3 giờ trước" · "2 ngày trước". */
export function relativeTimeLong(dateStr: string, now: number = Date.now()): string {
  const ms = new Date(dateStr).getTime();
  if (isNaN(ms)) return '';
  const minutes = Math.floor((now - ms) / 60000);
  if (minutes < 1) return 'Vừa xong';
  if (minutes < 60) return `${minutes} phút trước`;
  const h = Math.floor(minutes / 60);
  if (h < 24) return `${h} giờ trước`;
  return `${Math.floor(h / 24)} ngày trước`;
}
