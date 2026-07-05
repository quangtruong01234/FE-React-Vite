# Real-time / WebSocket Conventions

## Current state (as of 2026-07-01)

Real-time chat + notifications are **implemented and live** (this doc previously
described a mock placeholder — that is no longer accurate).

- **`socket.io-client` is installed** (`^4.8.3` in `package.json`).
- **Chat** uses two socket layers (see below):
  - App-scoped presence socket — `src/features/chat/chatPresenceSocket.ts`
  - Per-thread socket — `src/features/chat/useChat.ts`
- **Notifications** — app-scoped, ref-counted socket in
  `src/features/notifications/notificationSocket.ts`.
- The old mock `ChatRoom.tsx` is gone. Chat UI now lives under `src/features/chat/`
  (`ChatDialog.tsx`, `ChatThread.tsx`, `MessagesPage.tsx`).

---

## Gateway Reference

| Purpose | URL | Namespace | Events from server | Events from client |
|---|---|---|---|---|
| Notifications | `ws://localhost:3000/notifications` | `/notifications` | `notification` | none — server-push only |
| Chat | `ws://localhost:3000/chat` | `/chat` | `new_message`, `error` | `join`, `leave`, `send_message` |

Origins come from env (fallback `http://localhost:3000`):
- Chat → `VITE_CHAT_URL`
- Notifications → `VITE_WS_NOTIFICATION_URL`

Auth: both gateways read the `access_token` HttpOnly cookie automatically when
`withCredentials: true`. No token passing in handshake options.

Full event payloads → `.ai/context/backend-api.md` §WebSocket.

---

## Chat architecture — two socket layers

Chat combines **HTTP history (TanStack Query)** with **two socket.io layers**.

### 1. Presence socket (app-scoped, one connection)

`src/features/chat/chatPresenceSocket.ts` — mounted once via `useChatPresence(meId)`
in the Header (always rendered when authenticated).

- **Ref-counted**: first consumer opens the connection, last consumer closes it —
  mirrors the notification socket. Never more than one socket.
- The chat contract is **room-based**: the server only delivers `new_message` for
  conversations the socket has `join`ed. So on connect it joins **every** conversation
  the viewer has, and re-joins when the conversation-list cache grows (a new thread
  started while online) via a `queryCache.subscribe`.
- On `new_message`: plays the received sound (unless it's the active thread or the
  viewer's own message) and updates `lastMessage` / `unreadCount` in the cached list.
- Purpose: an online viewer hears a ping for **any** incoming message, on any thread,
  from anywhere in the app.

### 2. Per-thread socket

`src/features/chat/useChat.ts` — opens a dedicated socket for the open thread.

- `join` on connect, `leave` + `disconnect` on unmount (StrictMode-safe cleanup).
- Handles that thread's `new_message` (append + sound), connection status banner, and
  optimistic send.
- Calls `setActiveConversation(id)` so the presence socket skips the active thread and
  doesn't beep twice.

### Message merge & display

```
httpMessages (useInfiniteQuery, reversed oldest→newest)
  + socketMessages (deduped by id via mergeMessages)
  + pendingMessages (optimistic, still sending)
= messages
```

Infinite query pages 10 messages at a time; `hasNextPage` scrolls older history.

### Optimistic send

`sendMessage` pushes a temp message (negative `id`, `status: 'sending'`), emits
`send_message`, then reconciles when the server echoes `new_message` back. A socket
`error` flips pending messages to `status: 'error'`.

### Read / unread

- `useMarkConversationRead()` → POST + optimistic badge clear (`markConversationReadInList`).
- The active thread stays read: `applyIncomingMessage` keeps `unreadCount = 0` for
  `activeConversationId`.

Pure list helpers (`applyIncomingMessage`, `sortByActivity`, `markConversationReadInList`)
live in `chatConversations.ts`; presence sound gating in `chatPresence.ts`; connection
banner in `chatConnection.ts`. Each has a colocated `*.test.ts`.

---

## Where socket code lives

- **Connection logic goes in a dedicated hook/module** — never inline in a component.
  - Chat per-thread: `src/features/chat/useChat.ts`
  - Chat presence: `src/features/chat/chatPresenceSocket.ts`
  - Notifications: `src/features/notifications/notificationSocket.ts`
- The module owns the socket instance, event listeners, and message/local state.
- Components receive messages + a `sendMessage` callback — they never touch the socket.

---

## Lifecycle pattern — React 19 + StrictMode

React 19 in dev mounts → unmounts → remounts every component. The per-thread socket in
`useChat.ts` always `disconnect()`s in cleanup so each mount starts fresh. Do **not**
guard with `if (socketRef.current) return` — that skips cleanup on the first unmount and
leaves a stale connection alive.

App-scoped sockets (presence, notifications) solve the same problem with **ref-counting**:
the connection survives individual consumer remounts and only closes when the last
consumer releases.

---

## Auth rules

- Always `withCredentials: true` — the `access_token` HttpOnly cookie is sent automatically.
- Never pass the JWT via `handshake.auth.token`, `handshake.query.token`, or an
  `Authorization` header in production code. (`handshake.auth.token` is backend
  dev/testing fallback only.)
- Never read a token from `localStorage` and inject it into the socket connection.

---

## TanStack Query and socket state

- A `new_message` is written into the **paginated messages cache** for its conversation
  (`appendMessageToCache` on `queryKeys.messages.byConversation(id)`), by both the thread
  socket and the presence socket (dedupe-safe). This is deliberate: it makes messages
  **durable** across the thread unmounting, so switching conversations and returning shows
  them instantly instead of waiting on a stale-cache refetch. Live in-session append still
  also uses `useState` in `useChat`; `mergeMessages` dedupes the overlap.
- A `new_message` / `notification` event also updates the **list preview, order, and unread
  badge** — `applyIncomingMessage` on `queryKeys.conversations.all`, or the notification
  count. Keep the notification *list body* driven by its own fetch, not the socket.
- Do **not** use an unrelated query key (e.g. `queryKeys.auth.me`) as a channel for WS data.
