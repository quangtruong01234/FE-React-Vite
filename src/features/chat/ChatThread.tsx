import { useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/auth/useRole';
import { useChat } from './useChat';
import { chatConnectionBanner } from './chatConnection';
import { formatMessageTime } from './chatMessageTime';
import { chatCopy } from './chat.i18n';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { cn } from '@/lib/format/utils';
import { userDisplayName } from '@/lib/format/user';
import type { Conversation, PublicUser } from '@/types';

interface ChatThreadProps {
  conversation: Conversation;
  onBack: () => void;
  otherUser?: PublicUser;
}

export function ChatThread({ conversation, onBack, otherUser }: ChatThreadProps): ReactElement {
  const role = useRole();
  const meId = role?.me?.id;
  const t = useT(chatCopy);
  const { lang } = useLanguage();

  const { messages, isLoading, sendMessage, hasNextPage, fetchNextPage, isFetchingNextPage, connectionStatus } =
    useChat(conversation.id, meId);
  const [text, setText] = useState('');
  const banner = chatConnectionBanner(connectionStatus, lang);

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

  // Empty fallback on purpose: the peer embed is absent while its query is in
  // flight, and the header then falls back to the conversation id below.
  const peerName = userDisplayName(otherUser, '');

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
          alt={peerName}
          initials={(peerName || '?').charAt(0).toUpperCase()}
        />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-ink-pri truncate">
            {peerName || t('conversationFallback', { id: conversation.id })}
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
              ? 'bg-tb-red/10 text-accent-red'
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
          const isMe = meId !== undefined && m.senderId === meId;
          const prevMsg = messages[i - 1];
          const showAvatar = !isMe && (i === 0 || prevMsg?.senderId !== m.senderId);
          const isLastMine = isMe && !m.status && messages.slice(i + 1).every((n) => n.senderId !== meId);

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
                <div data-testid="chat-message" className={cn(
                  'px-3.5 py-2 text-sm leading-relaxed break-words rounded-2xl',
                  isMe
                    ? 'bg-tb-gradient text-ink-on-accent rounded-br-md'
                    : 'bg-canvas-elevated border border-bdr text-ink-pri rounded-bl-md',
                  m.status === 'error' && 'opacity-60',
                )}>
                  {m.content}
                  <div className={cn('text-[10px] mt-0.5', isMe ? 'text-ink-on-accent/70' : 'text-ink-muted')}>
                    {formatMessageTime(m.createdAt, new Date(), lang)}
                  </div>
                </div>
                {isMe && m.status === 'sending' && (
                  <div className="flex justify-end mt-1">
                    <Loader2 size={11} className="animate-spin text-ink-muted shrink-0" />
                  </div>
                )}
                {isMe && m.status === 'error' && (
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-accent-red">{t('sendFailed')}</span>
                  </div>
                )}
                {isLastMine && (
                  <div className="flex justify-end mt-1">
                    <span className="text-[10px] text-ink-muted">{t('sent')}</span>
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
          placeholder={t('inputPlaceholder')}
          className="flex-1 bg-canvas-elevated border border-bdr rounded-full px-4 py-2.5 text-sm text-ink-pri placeholder:text-ink-muted outline-none focus:border-tb-amber/50"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim()}
          className="rounded-full bg-tb-gradient text-ink-on-accent flex items-center justify-center cursor-pointer border-0 disabled:opacity-40 disabled:cursor-not-allowed flex-none"
        >
          <Send size={18} strokeWidth={2.5} className="shrink-0" />
        </button>
      </div>
    </div>
  );
}
