import { useState, type ReactElement } from 'react';
import { MessageSquare, Search } from 'lucide-react';
import { Avatar } from '@/components/shared/Avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { useRole } from '@/hooks/useRole';
import { useConversations } from './useChat';
import { ChatThread } from './ChatThread';
import { cn } from '@/lib/utils';
import type { Conversation } from '@/types';

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

  const { conversations, isLoading } = useConversations();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const filtered = search.trim()
    ? conversations.filter((c) => String(c.id).includes(search.trim()))
    : conversations;

  const selectedConv = conversations.find((c) => c.id === selectedId) ?? null;

  function otherUserId(c: Conversation): number {
    return meId !== undefined && c.user1Id === meId ? c.user2Id : c.user1Id;
  }

  return (
    <div className="h-[calc(100vh-150px)] bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden grid grid-cols-1 md:grid-cols-[300px_1fr]">
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
                <Avatar size={46} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-semibold text-sm text-ink-pri truncate">
                      Người dùng #{otherId}
                    </span>
                    <span className="text-[10px] text-ink-muted flex-none">
                      {timeAgo(c.createdAt)}
                    </span>
                  </div>
                  <div className="text-xs text-ink-sec truncate">
                    Hội thoại #{c.id}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Thread area */}
      <div className="min-h-0">
        {selectedConv ? (
          <ChatThread
            conversation={selectedConv}
            onBack={() => setSelectedId(null)}
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
