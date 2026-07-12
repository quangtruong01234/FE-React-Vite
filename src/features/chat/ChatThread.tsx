import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/auth/useRole';
import { useChat } from './useChat';
import { chatConnectionBanner } from './chatConnection';
import { cn } from '@/lib/format/utils';
import type { Conversation, PublicUser } from '@/types';

function formatMessageTime(iso: string): string {
  const normalized = iso.endsWith('Z') || iso.includes('+') ? iso : iso + 'Z';
  const date = new Date(normalized);
  if (isNaN(date.getTime())) return '';
  const hhmm = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', hour12: false });
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 86400000;
  const sevenDaysAgo = startOfToday - 6 * 86400000;
  const dayOfWeek = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const t = date.getTime();
  if (t >= startOfToday) return hhmm;
  if (t >= startOfYesterday) return `Hôm qua ${hhmm}`;
  if (t >= sevenDaysAgo) return `${dayOfWeek[date.getDay()]} ${hhmm}`;
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()} ${hhmm}`;
}

interface ChatThreadProps {
  conversation: Conversation;
  onBack: () => void;
  otherUser?: PublicUser;
}

export function ChatThread({ conversation, onBack, otherUser }: ChatThreadProps): ReactElement {
  const role = useRole();
  const meId = role?.me?.id;

  const { messages, isLoading, sendMessage, hasNextPage, fetchNextPage, isFetchingNextPage, connectionStatus } =
    useChat(conversation.id, meId);
  const [text, setText] = useState('');
  const banner = chatConnectionBanner(connectionStatus);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);
  const shouldPreserveScrollRef = useRef(false);
  const initialLoadDoneRef = useRef(false);

  // Reset state when switching conversations
  useEffect(() => {
    initialLoadDoneRef.current = false;
    shouldPreserveScrollRef.current = false;
  }, [conversation.id]);

  // Capture scroll height before load-more fetch starts (useEffect = after paint)
  useEffect(() => {
    if (isFetchingNextPage) {
      prevScrollHeightRef.current = scrollAreaRef.current?.scrollHeight ?? 0;
      shouldPreserveScrollRef.current = true;
    }
  }, [isFetchingNextPage]);

  // Manage scroll position after DOM updates (useLayoutEffect = before paint)
  useLayoutEffect(() => {
    const el = scrollAreaRef.current;
    if (!el || isFetchingNextPage) return;

    if (shouldPreserveScrollRef.current) {
      // Older messages prepended: anchor scroll so current messages stay visible
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      shouldPreserveScrollRef.current = false;
      return;
    }

    if (!initialLoadDoneRef.current) {
      // Initial load: jump to bottom once loading is done
      if (!isLoading) {
        el.scrollTop = el.scrollHeight;
        initialLoadDoneRef.current = true;
      }
      return;
    }

    // New socket message: scroll to bottom only if already near bottom
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 150) el.scrollTop = el.scrollHeight;
  }, [messages.length, isFetchingNextPage, isLoading]);

  // IntersectionObserver: load older messages when top sentinel enters view
  useEffect(() => {
    const sentinel = topSentinelRef.current;
    const root = scrollAreaRef.current;
    if (!sentinel || !root) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { root, rootMargin: '80px' },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  function handleSend(): void {
    const trimmed = text.trim();
    if (!trimmed || meId === undefined) return;
    sendMessage(trimmed, meId);
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
        <Avatar
          size={40}
          src={otherUser?.avatar ?? undefined}
          alt={otherUser?.name ?? otherUser?.username ?? ''}
          initials={(otherUser?.name ?? otherUser?.username ?? '?').charAt(0).toUpperCase()}
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-ink-pri truncate">
            {otherUser?.name ?? otherUser?.username ?? `Hội thoại #${conversation.id}`}
          </div>
          {otherUser?.username && (
            <div className="text-xs text-ink-muted">@{otherUser.username}</div>
          )}
        </div>
      </div>

      {/* Connection status banner */}
      {banner && (
        <div
          className={cn(
            'px-4 py-1.5 text-xs font-medium text-center flex-none border-b border-bdr',
            banner.tone === 'error'
              ? 'bg-accent-red/10 text-accent-red'
              : 'bg-canvas-elevated text-ink-sec',
          )}
        >
          {banner.text}
        </div>
      )}

      {/* Messages */}
      <div ref={scrollAreaRef} className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-0">

        {/* Top sentinel — triggers load-more when scrolled into view */}
        <div ref={topSentinelRef} className="h-px" />

        {/* Spacer pushes messages to bottom when content doesn't fill the container */}
        <div className="flex-1" />

        {/* Loading older messages indicator */}
        {isFetchingNextPage && (
          <div className="flex justify-center py-2">
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        )}

        {/* Initial loading skeletons */}
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
          const isMe = meId !== undefined && Number(m.senderId) === Number(meId);
          const prevMsg = messages[i - 1];
          const showAvatar = !isMe && (i === 0 || prevMsg?.senderId !== m.senderId);
          const isLastMine = isMe && !m.status && messages.slice(i + 1).every((n) => Number(n.senderId) !== Number(meId));

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
              <div className="flex flex-col">
                <div className={cn(
                  'px-3.5 py-2 text-sm leading-relaxed break-words rounded-2xl',
                  isMe
                    ? 'bg-tb-gradient text-ink-pri rounded-br-md'
                    : 'bg-canvas-elevated border border-bdr text-ink-pri rounded-bl-md',
                  m.status === 'error' && 'opacity-60',
                )}>
                  {m.content}
                  <div className={cn('text-[10px] mt-0.5', isMe ? 'text-ink-pri/70' : 'text-ink-muted')}>
                    {formatMessageTime(m.createdAt)}
                  </div>
                </div>
                {isMe && m.status === 'sending' && (
                  <div className="flex justify-end mt-1">
                    <Loader2 size={11} className="animate-spin text-ink-muted shrink-0" />
                  </div>
                )}
                {isMe && m.status === 'error' && (
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-accent-red">Gửi thất bại</span>
                  </div>
                )}
                {isLastMine && (
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-ink-muted">Đã gửi</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

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
          className="rounded-full bg-tb-gradient text-ink-pri flex items-center justify-center cursor-pointer border-0 disabled:opacity-40 disabled:cursor-not-allowed flex-none"
        >
          <Send size={18} strokeWidth={2.5} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}
