import { useState, useMemo, useEffect, useRef, type ReactElement } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { useQueries, useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/useRole';
import { queryKeys } from '@/hooks/queryKeys';
import { api } from '@/api';
import { queryClient } from '@/lib/queryClient';
import { useConversations } from './useChat';
import { ChatThread } from './ChatThread';
import { cn } from '@/lib/utils';
import type { Conversation, User } from '@/types';

function timeAgo(iso: string): string {
  const ms = new Date(iso).getTime();
  if (isNaN(ms)) return '';
  const diff = Math.floor((Date.now() - ms) / 60000);
  if (diff < 1) return 'Vừa xong';
  if (diff < 60) return `${diff}p`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}g`;
  return `${Math.floor(h / 24)}n`;
}

export default function MessagesPage(): ReactElement {
  const role = useRole();
  const meId = role?.me?.id;

  const location = useLocation();
  const navigate = useNavigate();
  const initOtherUserId = (location.state as { otherUserId?: number } | null)?.otherUserId;

  const { conversations, isLoading } = useConversations();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const { mutate: openConversation } = useMutation({
    mutationFn: (otherUserId: number) => api.chat.createConversation({ otherUserId }),
    onSuccess: (conv) => {
      setSelectedId(conv.id);
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) => {
        if (!old) return [conv];
        if (old.some((c) => c.id === conv.id)) return old;
        return [conv, ...old];
      });
    },
  });

  const handledRef = useRef(false);
  useEffect(() => {
    if (handledRef.current || !initOtherUserId) return;
    handledRef.current = true;
    openConversation(initOtherUserId);
    navigate('/messages', { replace: true, state: null });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function otherUserId(c: Conversation): number {
    return meId !== undefined && c.user1Id === meId ? c.user2Id : c.user1Id;
  }

  const otherUserIds = useMemo(() => {
    const ids = new Set<number>();
    conversations.forEach((c) => ids.add(otherUserId(c)));
    return Array.from(ids);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversations, meId]);

  const userResults = useQueries({
    queries: otherUserIds.map((id) => ({
      queryKey: queryKeys.users.detail(id),
      queryFn: () => api.users.getById(id),
      staleTime: 5 * 60 * 1000,
    })),
  });

  const userMap = useMemo(() => {
    const map = new Map<number, User>();
    userResults.forEach((r, i) => {
      if (r.data) map.set(otherUserIds[i], r.data);
    });
    return map;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userResults, otherUserIds]);

  const filtered = search.trim()
    ? conversations.filter((c) => {
        const otherId = otherUserId(c);
        const u = userMap.get(otherId);
        const label = u?.name ?? u?.username ?? String(otherId);
        return label.toLowerCase().includes(search.trim().toLowerCase());
      })
    : conversations;

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  return (
    <div className="h-full bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr]">
      {/* Conversation list */}
      <div className={cn('border-r border-bdr flex flex-col min-h-0', selectedConv && 'hidden md:flex')}>
        <div className="px-4 py-3.5 border-b border-bdr flex-none">
          <h2 className="font-display font-black text-xl uppercase tracking-wide text-ink-pri m-0 mb-3">
            Tin nhắn
          </h2>
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm hội thoại…"
              className="w-full bg-canvas-elevated border border-bdr rounded-full py-2 pl-9 pr-3 text-sm text-ink-pri placeholder:text-ink-muted outline-none focus:border-amber-400/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-3 border-b border-bdr/50">
                  <Skeleton className="w-[46px] h-[46px] rounded-full flex-none bg-canvas-elevated" />
                  <div className="flex-1 flex flex-col gap-1.5">
                    <Skeleton className="h-3.5 w-28 bg-canvas-elevated rounded" />
                    <Skeleton className="h-3 w-40 bg-canvas-elevated rounded" />
                  </div>
                </div>
              ))}
            </>
          )}

          {!isLoading && filtered.length === 0 && (
            <div className="py-12 flex flex-col items-center gap-2 text-center px-4">
              <MessageSquare size={28} className="text-ink-muted" />
              <p className="text-sm text-ink-sec m-0">Chưa có hội thoại nào</p>
            </div>
          )}

          {!isLoading && filtered.map((c) => {
            const isActive = c.id === selectedId;
            const otherId = otherUserId(c);
            const otherUser = userMap.get(otherId);
            const displayName = otherUser?.name ?? otherUser?.username ?? `Người dùng #${otherId}`;
            const initials = displayName.charAt(0).toUpperCase();
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-3 border-b border-bdr/50 cursor-pointer text-left transition-colors',
                  isActive ? 'bg-canvas-elevated' : 'hover:bg-canvas-elevated/50',
                )}
              >
                <Avatar size={46} src={otherUser?.avatar ?? undefined} alt={displayName} initials={initials} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm text-ink-pri truncate">
                      {displayName}
                    </span>
                    <span className="text-[10px] text-ink-muted flex-none">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-ink-sec truncate">
                    @{otherUser?.username ?? otherId}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread area */}
      <div className="min-h-0 overflow-hidden flex flex-col">
        {selectedConv ? (
          <ChatThread
            conversation={selectedConv}
            onBack={() => setSelectedId(null)}
            otherUser={userMap.get(otherUserId(selectedConv))}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
            <MessageSquare size={40} className="text-ink-muted" />
            <p className="font-body text-sm text-ink-sec m-0">
              Chọn một hội thoại để bắt đầu
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
