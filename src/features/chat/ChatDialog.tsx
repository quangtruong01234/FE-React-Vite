import { useEffect, useState, type ReactElement } from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/api';
import { queryClient } from '@/lib/query/queryClient';
import { queryKeys } from '@/hooks/query/queryKeys';
import { cn } from '@/lib/format/utils';
import { ChatThread } from './ChatThread';
import type { Conversation, User } from '@/types';

interface ChatDialogProps {
  otherUser: User;
  open: boolean;
  onClose: () => void;
}

export function ChatDialog({ otherUser, open, onClose }: ChatDialogProps): ReactElement {
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const { mutate: createConv, isPending } = useMutation({
    mutationFn: () => api.chat.createConversation({ otherUserId: otherUser.id }),
    onSuccess: (conv) => {
      setConversation(conv);
      queryClient.setQueryData<Conversation[]>(queryKeys.conversations.all, (old) => {
        if (!old) return [conv];
        if (old.some((c) => c.id === conv.id)) return old;
        return [conv, ...old];
      });
    },
  });

  useEffect(() => {
    if (open) {
      createConv();
    } else {
      setConversation(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2',
            'w-[min(420px,calc(100vw-32px))] h-[560px]',
            'bg-canvas-surface border border-bdr rounded-tb-card shadow-tb-card overflow-hidden',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          )}
        >
          <DialogPrimitive.Title className="sr-only">
            Chat với {otherUser.name ?? otherUser.username}
          </DialogPrimitive.Title>

          {/* Close button — always visible, overlays top-right corner of header */}
          <DialogPrimitive.Close
            className="absolute top-3 right-3 z-10 size-7 p-0 grid place-items-center rounded-full bg-canvas-elevated border border-bdr text-ink-muted hover:text-ink-pri hover:border-accent-amber/50 transition-colors"
            aria-label="Đóng"
          >
            <X size={14} className="shrink-0" />
          </DialogPrimitive.Close>

          {isPending && (
            <div className="h-full flex items-center justify-center">
              <span className="text-sm text-ink-muted">Đang kết nối…</span>
            </div>
          )}

          {conversation && (
            <ChatThread
              conversation={conversation}
              onBack={onClose}
              otherUser={otherUser}
            />
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
