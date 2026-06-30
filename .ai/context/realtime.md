# Real-time / WebSocket Conventions

## Current state (as of 2026-06-02)

- **`socket.io-client` is NOT installed** — absent from `package.json`. Run `npm install socket.io-client` before any WS work (ask first — `npm install` is blocked by default).
- **`ChatRoom.tsx`** (`src/features/product/ChatRoom.tsx`) is a mock-only placeholder. It uses `MOCK_HISTORY` + `setTimeout` to simulate responses. There is no real socket connection anywhere in the frontend.
- No notification socket hook exists yet.

---

## Gateway Reference

| Purpose | URL | Namespace | Events from server | Events from client |
|---|---|---|---|---|
| Notifications | `ws://localhost:3000/notifications` | `/notifications` | `notification` | none — server-push only |
| Chat | `ws://localhost:3000/chat` | `/chat` | `new_message`, `error` | `join`, `send_message` |

Auth: both gateways read the `access_token` HttpOnly cookie automatically when `withCredentials: true`. No token passing in handshake options.

Full event payloads → `.ai/context/backend-api.md` §WebSocket.

---

## Where socket code lives

- **Connection logic goes in a dedicated hook** — never inline in a component.
  - Chat: `src/features/chat/useChatSocket.ts` (when implemented)
  - Notifications: `src/hooks/useNotificationSocket.ts` (cross-cutting → `hooks/`)
- The hook owns the socket instance, event listeners, and local message state.
- The component receives messages and a `sendMessage` callback from the hook — it never touches the socket directly.

---

## Lifecycle pattern — React 19 + StrictMode

```ts
// Example: useChatSocket.ts
import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { Message } from '@/types';

const CHAT_URL = import.meta.env.VITE_CHAT_URL ?? 'http://localhost:3000';

export function useChatSocket(conversationId: number) {
  const [messages, setMessages] = useState<Message[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(`${CHAT_URL}/chat`, {
      withCredentials: true, // sends access_token cookie — never pass jwt manually
    });
    socketRef.current = socket;

    socket.emit('join', { conversationId });

    socket.on('new_message', (msg: Message) => {
      setMessages((prev) => [...prev, msg]);
    });

    socket.on('error', (err: string) => {
      console.error('[ChatSocket]', err);
    });

    // cleanup: always disconnect — handles StrictMode double-mount cleanly
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [conversationId]);

  function sendMessage(content: string, parentMessageId?: number) {
    socketRef.current?.emit('send_message', { conversationId, content, parentMessageId });
  }

  return { messages, sendMessage };
}
```

### StrictMode note

React 19 in dev mode mounts → unmounts → remounts every component. The cleanup `socket.disconnect()` ensures each mount starts a fresh connection. Do **not** guard with `if (socketRef.current) return` — that skips cleanup on the first unmount and leaves a stale connection alive.

---

## Auth rules

- Always `withCredentials: true` — the `access_token` HttpOnly cookie is sent automatically.
- Never pass the JWT via `handshake.auth.token`, `handshake.query.token`, or `Authorization` header in production code. (`handshake.auth.token` is backend dev/testing fallback only.)
- Never read a token from `localStorage` and inject it into the socket connection.

---

## TanStack Query and socket state

- **Do not push socket events into TanStack Query cache.** Real-time messages are event-driven state, not server state.
- Keep socket messages in `useState` inside the hook (as in the example above).
- The `queryKeys.auth.me` or other query keys should not be used as a channel for WS data.
- Exception: after a `notification` event you MAY call `queryClient.invalidateQueries` to refetch a count badge — but store the notification list itself in local state, not in the cache.

---

## Known issues in current code

### ChatRoom.tsx (`src/features/product/ChatRoom.tsx`)

This file is a mock placeholder that violates several future conventions — document, do not fix yet:

1. **No hook abstraction** — message state and send logic are inline in the component. When real WS is wired, these must move to `useChatSocket`.
2. **Inline `Message` type** — defines its own `{ id, sender, text, isMe }` interface; the backend shape is `{ id, conversationId, senderId, content, parentMessageId, createdAt }`. Types must align when implementing.
3. **`setTimeout` fake response** — must be removed entirely when real socket is connected.
4. **Wrong folder** — see FOLLOW-UP in `.ai/context/structure.md`.

---

## FOLLOW-UP checklist (before shipping real WS)

- [ ] `npm install socket.io-client` (ask user — blocked by default)
- [ ] Add `VITE_CHAT_URL` and `VITE_NOTIFICATION_URL` to `.env.example`
- [ ] Add `Message`, `Conversation`, `Notification` types to `src/types/index.ts` matching backend shapes
- [ ] Create `src/hooks/useNotificationSocket.ts`
- [ ] Create `src/features/chat/useChatSocket.ts`
- [ ] Wire `ChatRoom.tsx` to `useChatSocket` and remove mock data (separate PR from the move to `features/chat/`)
