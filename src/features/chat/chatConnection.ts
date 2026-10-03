import { bindTranslator } from '@/lib/i18n/messages';
import type { Lang } from '@/lib/i18n/lang';
import { chatCopy } from './chat.i18n';

export type ChatConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

export interface ChatConnectionBanner {
  text: string;
  tone: 'info' | 'error';
}

/**
 * Banner shown above the chat input while the socket is not healthy.
 * Returns `null` when connected (no banner). Pure so it can be unit-tested
 * without a live socket.
 */
export function chatConnectionBanner(
  status: ChatConnectionStatus,
  lang: Lang = 'vi',
): ChatConnectionBanner | null {
  const t = bindTranslator(chatCopy, lang);
  switch (status) {
    case 'connected':
      return null;
    case 'connecting':
      return { text: t('connecting'), tone: 'info' };
    case 'reconnecting':
      return { text: t('reconnecting'), tone: 'error' };
    case 'disconnected':
      return { text: t('disconnected'), tone: 'error' };
  }
}
