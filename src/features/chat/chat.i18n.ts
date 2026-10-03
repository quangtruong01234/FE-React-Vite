import { defineMessages } from '@/lib/i18n/messages';

/** I18N-05 — `/messages`, the chat dialog on a profile, the thread and its connection banner. */
export const chatCopy = defineMessages({
  vi: {
    connecting: 'Đang kết nối…',
    reconnecting: 'Mất kết nối — đang thử lại…',
    disconnected: 'Đã ngắt kết nối. Tin nhắn sẽ gửi lại khi có mạng.',

    yesterdayAt: 'Hôm qua {time}',
    weekdays: 'CN,T2,T3,T4,T5,T6,T7',

    dialogTitle: 'Chat với {name}',
    dialogDescription: 'Cửa sổ trò chuyện. Đọc tin nhắn và soạn tin trả lời.',
    close: 'Đóng',

    conversationFallback: 'Hội thoại #{id}',
    sendFailed: 'Gửi thất bại',
    sent: 'Đã gửi',
    inputPlaceholder: 'Nhắn tin…',

    pageTitle: 'Tin nhắn',
    searchPlaceholder: 'Tìm hội thoại…',
    noConversations: 'Chưa có hội thoại nào',
    userFallback: 'Người dùng #{id}',
    youPrefix: 'Bạn: ',
    startConversation: 'Bắt đầu cuộc trò chuyện',
    pickConversation: 'Chọn một hội thoại để bắt đầu',
  },
  en: {
    connecting: 'Connecting…',
    reconnecting: 'Connection lost — retrying…',
    disconnected: 'Disconnected. Messages will be sent once you are back online.',

    yesterdayAt: 'Yesterday {time}',
    weekdays: 'Sun,Mon,Tue,Wed,Thu,Fri,Sat',

    dialogTitle: 'Chat with {name}',
    dialogDescription: 'Chat window. Read messages and write a reply.',
    close: 'Close',

    conversationFallback: 'Conversation #{id}',
    sendFailed: 'Failed to send',
    sent: 'Sent',
    inputPlaceholder: 'Write a message…',

    pageTitle: 'Messages',
    searchPlaceholder: 'Search conversations…',
    noConversations: 'No conversations yet',
    userFallback: 'User #{id}',
    youPrefix: 'You: ',
    startConversation: 'Start the conversation',
    pickConversation: 'Pick a conversation to get started',
  },
});
