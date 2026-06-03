import { useEffect, useRef, useState, type ReactElement } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/useRole';
import { useChat } from './useChat';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

function relativeTime(iso: string): string {
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return '';
  const diff = Math.floor((Date.now() - ms) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

interface ChatThreadProps {
  conversation: Conversation;
  onBack: () => void;
}

export function ChatThread({ conversation, onBack }: ChatThreadProps): ReactElement {
  const role = useRole();
  const meId = role?.me?.id;

  const { messages, isLoading, sendMessage } = useChat(conversation.id);
  const [text, setText] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  function handleSend(): void {
    const trimmed = text.trim();
    if (!trimmed) return;
    sendMessage(trimmed);
    setText('');
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-bdr flex items-center gap-3 flex-none">
        <button
          onClick={onBack}
          className="md:hidden bg-canvas-elevated border border-bdr rounded-lg p-2 text-ink-pri cursor-pointer hover:border-accent-amber transition-colors"
        >
          <ArrowLeft size={16} />
        </button>
        <Avatar size={40} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-ink-pri truncate">
            Hội thoại #{conversation.id}
          </div>
          <div className="text-xs text-ink-muted">
            ID {conversation.user1Id} · {conversation.user2Id}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-0">
        {isLoading && (
          <>
            {[1, 2, 3].map((i) => (
              <div key={i} className={cn('flex items-end gap-2 max-w-[78%]', i % 2 === 0 ? 'self-end flex-row-reverse' : 'self-start')}>
                {i % 2 !== 0 && <Skeleton className="w-7 h-7 rounded-full bg-canvas-elevated flex-none" />}
                <Skeleton className="h-10 w-44 rounded-2xl bg-canvas-elevated" />
              </div>
            ))}
          </>
        )}

        {!isLoading && messages.map((m, i) => {
          const isMe = meId !== undefined && m.senderId === meId;
          const prevMsg = messages[i - 1];
          const showAvatar = !isMe && (i === 0 || prevMsg?.senderId !== m.senderId);

          return (
            <div
              key={m.id}
              className={cn('flex items-end gap-2 max-w-[78%]', isMe ? 'self-end flex-row-reverse' : 'self-start')}
            >
              {!isMe && (
                showAvatar
                  ? <Avatar size={26} />
                  : <span className="w-[26px] flex-none" />
              )}
              <div className={cn(
                'px-3.5 py-2 text-sm leading-relaxed break-words rounded-2xl',
                isMe
                  ? 'bg-tb-gradient text-ink-pri rounded-br-md'
                  : 'bg-canvas-elevated border border-bdr text-ink-pri rounded-bl-md',
              )}>
                {m.content}
                <div className={cn('text-[10px] mt-0.5', isMe ? 'text-ink-pri/70' : 'text-ink-muted')}>
                  {relativeTime(m.createdAt)}
                </div>
              </div>
            </div>
          );
        })}

        <div ref={endRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-bdr flex items-center gap-2 flex-none">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          placeholder="Nhắn tin…"
          className="flex-1 bg-canvas-elevated border border-bdr rounded-full px-4 py-2.5 text-sm text-ink-pri placeholder:text-ink-muted outline-none focus:border-amber-400/50"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="w-10 h-10 rounded-full bg-tb-gradient text-ink-pri flex items-center justify-center cursor-pointer border-0 disabled:opacity-40 disabled:cursor-not-allowed flex-none"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
