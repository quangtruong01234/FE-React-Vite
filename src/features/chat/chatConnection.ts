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
export function chatConnectionBanner(status: ChatConnectionStatus): ChatConnectionBanner | null {
  switch (status) {
    case 'connected':
      return null;
    case 'connecting':
      return { text: 'Đang kết nối…', tone: 'info' };
    case 'reconnecting':
      return { text: 'Mất kết nối — đang thử lại…', tone: 'error' };
    case 'disconnected':
      return { text: 'Đã ngắt kết nối. Tin nhắn sẽ gửi lại khi có mạng.', tone: 'error' };
  }
}
