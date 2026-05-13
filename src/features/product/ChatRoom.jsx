import { useState, useEffect, useRef } from 'react';
import './ChatRoom.css';

const MOCK_HISTORY = [
  { id: 1, sender: 'Tuan Anh', text: 'Con này pin trâu không mọi người?', isMe: false },
  { id: 2, sender: 'Minh Hieu', text: 'Cũng ổn bác ơi, em dùng được hơn 1 ngày.', isMe: false },
  { id: 3, sender: 'Shop Official', text: 'Sản phẩm bên em cam kết chính hãng ạ!', isMe: false },
];

export default function ChatRoom({ product, onBack }) {
  const [messages, setMessages] = useState(MOCK_HISTORY);
  const [inputStr, setInputStr] = useState('');
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (inputStr.trim() === '') return;

    const newMsg = {
      id: Date.now(),
      sender: 'Tôi',
      text: inputStr,
      isMe: true,
    };
    setMessages((prev) => [...prev, newMsg]);
    setInputStr('');

    setTimeout(() => {
      const replyMsg = {
        id: Date.now() + 1,
        sender: 'User_Random',
        text: 'Chuẩn đấy bác, giá này ngon rồi.',
        isMe: false,
      };
      setMessages((prev) => [...prev, replyMsg]);
    }, 1500);
  };

  return (
    <div className="chat-page">
      <div className="chat-container compact">

        <div className="chat-header">
          <div className="product-mini-info">
            <button className="btn-back" onClick={onBack}>←</button>
            <img
              src={product.imageUrl || 'https://images.unsplash.com/photo-1695048133142-1a20484d2569?auto=format&fit=crop&q=80&w=600'}
              alt="product"
              className="product-thumb"
            />
            <div className="product-details">
              <div className="product-name">{product.name}</div>
              <div className="online-status">
                <span className="online-dot"></span>
                {product.online} đang xem
              </div>
            </div>
          </div>
        </div>

        <div className="chat-messages">
          {messages.map((msg) => (
            <div key={msg.id} className={`message ${msg.isMe ? 'me' : 'other'}`}>
              {!msg.isMe && <span className="sender-name">{msg.sender}</span>}
              {msg.text}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          <input
            type="text"
            className="chat-input"
            placeholder="Hỏi gì đó về sản phẩm này..."
            value={inputStr}
            onChange={(e) => setInputStr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <button className="btn-send" onClick={handleSend}>➤</button>
        </div>

      </div>
    </div>
  );
}
