import { useState, useEffect, useRef, type ReactElement } from 'react';
import type { EnrichedProduct } from './useProducts';

interface Message {
  id: number;
  sender: string;
  text: string;
  isMe: boolean;
}

const MOCK_HISTORY: Message[] = [
  { id: 1, sender: 'Tuan Anh', text: 'Con này pin trâu không mọi người?', isMe: false },
  { id: 2, sender: 'Minh Hieu', text: 'Cũng ổn bác ơi, em dùng được hơn 1 ngày.', isMe: false },
  { id: 3, sender: 'Shop Official', text: 'Sản phẩm bên em cam kết chính hãng ạ!', isMe: false },
];

interface ChatRoomProps {
  product: EnrichedProduct;
  onBack: () => void;
}

export default function ChatRoom({ product, onBack }: ChatRoomProps): ReactElement {
  const [messages, setMessages] = useState<Message[]>(MOCK_HISTORY);
  const [inputStr, setInputStr] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function handleSend(): void {
    if (inputStr.trim() === '') return;
    setMessages((prev) => [...prev, { id: Date.now(), sender: 'Tôi', text: inputStr, isMe: true }]);
    setInputStr('');
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: Date.now() + 1, sender: 'User_Random', text: 'Chuẩn đấy bác, giá này ngon rồi.', isMe: false }]);
    }, 1500);
  }

  return (
    <div className="w-full max-w-[600px] mx-auto px-5 min-h-screen flex flex-col py-5">
      <div className="bg-canvas-surface border border-bdr rounded-xl overflow-hidden flex flex-col h-[85vh] w-full">
        {/* Header */}
        <div className="bg-accent-pri px-4 py-3 flex items-center gap-3">
          <button
            onClick={onBack}
            className="bg-white/15 border-0 text-white px-3 py-2 rounded-lg cursor-pointer text-lg hover:bg-white/25 hover:-translate-x-0.5 transition-all">
            ←
          </button>
          <img
            src={product.imageUrl ?? 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'}
            alt="product"
            className="w-11 h-11 rounded-lg object-cover border-2 border-white/20 flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="font-semibold text-[0.95rem] text-white leading-snug truncate">{product.name}</div>
            <div className="flex items-center gap-1.5 text-[0.8rem] text-white/90 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse flex-shrink-0" />
              {product.online} đang xem
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={msg.isMe
                ? 'max-w-[75%] self-end bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl rounded-br-md px-3.5 py-2.5 text-sm text-white leading-relaxed break-words'
                : 'max-w-[75%] self-start bg-canvas-elevated border border-bdr rounded-2xl rounded-bl-md px-3.5 py-2.5 text-sm text-ink-pri leading-relaxed break-words'
              }
            >
              {!msg.isMe && (
                <span className="block text-xs text-accent-sec font-semibold mb-1">{msg.sender}</span>
              )}
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-3.5 bg-canvas-elevated border-t border-bdr flex gap-2.5 items-center">
          <input
            type="text"
            className="flex-1 px-3.5 py-2.5 rounded-full border border-bdr bg-canvas-surface text-ink-pri text-sm placeholder:text-ink-sec placeholder:italic outline-none focus:border-accent-pri transition-colors"
            placeholder="Hỏi gì đó về sản phẩm này..."
            value={inputStr}
            onChange={(e) => setInputStr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            onClick={handleSend}
            className="w-10 h-10 rounded-full bg-accent-pri border-0 text-white flex items-center justify-center text-lg cursor-pointer hover:scale-105 active:scale-95 transition-transform flex-shrink-0">
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
