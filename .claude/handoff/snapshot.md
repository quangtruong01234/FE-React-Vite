# API Application Handoff — Snapshot

**Date:** 2026-06-03
**Source of truth:** `.claude/context/backend-api.md`
**Compared against:** `frontend/src/api/index.ts`, `frontend/src/features/**`, `frontend/src/hooks/**`, `frontend/src/types/index.ts`

---

## Coverage Summary

| Bucket | Count | Meaning |
|---|---|---|
| ✅ Applied | 40 | Registered in `api/index.ts` AND consumed by a hook/query |
| 🟡 Partial | 0 | Registered but wrong shape / no hook / dead code |
| 🔴 Missing | 22 | No api fn, no hook at all |
| **Total** | **62** | 60 HTTP endpoints + 2 WebSocket connections |

---

## 1. Current State (Snapshot)

### 1.1 Auth & User

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| POST | /api/user/register | ✅ | `auth.register` | `LoginPage.tsx` (inline useMutation) |
| POST | /api/user/login | ✅ | `auth.login` | `useLogin.ts` + `LoginPage.tsx` |
| POST | /api/user/logout | ✅ | `auth.logout` | `useAuth.ts` (useMutation) |
| GET | /api/user/me | ✅ | `auth.me` | `useRole.ts` (useQuery · `queryKeys.auth.me`) · consumed by `ProfilePage.tsx`, `LeftRail.tsx`, layout guards |
| GET | /api/user/:id | ✅ | `users.getById` | `ProfilePage.tsx` (inline useQuery · `queryKeys.users.detail(userId)`) |
| PATCH | /api/user/:id | ✅ | `users.update` | `EditProfileModal.tsx` (useMutation · invalidates `queryKeys.users.detail` + `queryKeys.auth.me`) |
| GET | /api/user/all | 🔴 | `users.getAll` | — (api fn registered; no hook/consumer — reserved for Phase 9 `AdminUsers`) |

### 1.2 Product

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| POST | /api/products | ✅ | `products.create` | `CreateProductModal.tsx` (inline useMutation) |
| GET | /api/products | 🔴 | `products.getPlainList` | — (api fn not yet added; deferred to Phase 8/9) |
| GET | /api/products/search | 🔴 | `products.search` | — (api fn registered; no hook/consumer — Header search navigates to `/marketplace?search=` which uses `getList` with params) |
| GET | /api/products/brands | ✅ | `products.getBrands` | `CreateProductModal.tsx` (inline useQuery) |
| POST | /api/products/brands | 🔴 | `products.createBrand` | — (api fn registered; no hook/consumer — reserved for Phase 9 `AdminTaxonomy`) |
| GET | /api/products/brands/:id | 🔴 | `products.getBrandById` | — (api fn registered; no consumer) |
| GET | /api/products/categories | ✅ | `products.getCategories` | `CreateProductModal.tsx` (inline useQuery) |
| POST | /api/products/categories | 🔴 | `products.createCategory` | — (api fn registered; no hook/consumer — reserved for Phase 9 `AdminTaxonomy`) |
| GET | /api/products/categories/:id | 🔴 | `products.getCategoryById` | — (api fn registered; no consumer) |
| GET | /api/products/category/:categoryId | 🔴 | `products.getByCategory` | — (api fn registered; no hook — `MarketplacePage` uses `getList` with `categoryId` param instead) |
| GET | /api/products/brand/:brandId | 🔴 | `products.getByBrand` | — (api fn registered; no hook — `MarketplacePage` uses `getList` with `brandId` param instead) |
| GET | /api/products/sku/:sku | 🔴 | `products.getBySku` | — (api fn registered; no consumer) |
| GET | /api/products/:id | 🔴 | — | intentionally deferred — removed from `api/index.ts`; `ProductDetail.tsx` uses `getWithInventory` which also covers stock; re-register only if a no-inventory context emerges in future |
| PATCH | /api/products/:id | 🔴 | `products.update` | — (api fn registered; no hook/consumer — reserved for Phase 8 `MyProducts`) |
| DELETE | /api/products/:id | 🔴 | `products.delete` | — (api fn registered; no hook/consumer — reserved for Phase 8 `MyProducts`) |
| GET | /api/products/with-inventory/all | ✅ | `products.getList` | `useProducts.ts` (useQuery · `queryKeys.products.list(params)` / `queryKeys.products.all` · typed `PaginatedResponse<ProductWithInventory>`) · consumed by `MarketplacePage.tsx` |
| GET | /api/products/:id/with-inventory | ✅ | `products.getWithInventory` | `ProductDetail.tsx` (inline useQuery) |
| POST | /api/products/with-inventory/multiple | ✅ | `products.getMultipleWithInventory` | `CheckoutPage.tsx` (direct await in mutation) |
| GET | /api/products/:id/stock-check | 🔴 | `products.checkStock` | — (api fn registered; no hook/consumer — reserved for Phase 8 checkout stock-check) |

### 1.3 Order

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| POST | /api/order | ✅ | `orders.create` | `CheckoutPage.tsx` (inline useMutation · full `CreateOrderDto` with `payment_method: PaymentMethod`, `shipping_address`, `product_name` per item) |
| GET | /api/order/admin/orders | 🔴 | `orders.getAdminOrders` | — (api fn registered; no consumer — `AdminPage.tsx` is a stub; reserved for Phase 9) |
| GET | /api/order/:id | ✅ | `orders.getById` | `useOrder.ts` (useQuery · `queryKeys.orders.detail(orderId)`) · consumed by `OrderDetailPage.tsx` |
| GET | /api/order/user/:id | ✅ | `orders.getByUser` | `useOrdersByUser.ts` (useQuery · `queryKeys.orders.byUser(userId)` · `PaginatedResponse<Order>`) → consumed by `OrderHistoryPage.tsx` |
| PATCH | /api/order/:id/cancel | ✅ | `orders.cancel` | `useCancelOrder.ts` (useMutation · invalidates `orders.detail` + `orders.byUser`) · consumed by `OrderDetailPage.tsx` |
| GET | /api/order/:id/invoice | ✅ | `orders.getInvoice` | `useOrderInvoice.ts` (useMutation · Blob download → anchor click) · consumed by `OrderDetailPage.tsx` |
| GET | /api/order/:id/payment-url | ✅ | `orders.getPaymentUrl` | `useOrderPaymentUrl.ts` (useMutation · `window.location.href = order_url`) · consumed by `OrderDetailPage.tsx` |

### 1.4 Payment

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| GET | /api/payment/options | ✅ | `payment.getOptions` | `usePaymentOptions.ts` (useQuery · `queryKeys.payment.options`) · consumed by `CheckoutPage.tsx` |
| GET | /api/gateway/payment-result | ✅ | `payment.getResult` | `PaymentResultPage.tsx` (inline useQuery · reads search params → displays success/failure) |
| POST | /ghn/webhook | 🔴 | — | Server-to-server callback from GHN shipping service — no frontend implementation needed |

> `POST /ghn/webhook` is a server-to-server callback called by GHN. No frontend action needed — omit from implementation.

### 1.5 Inventory

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| POST | /api/inventory | 🔴 | `inventory.create` | — (api fn registered; no hook/consumer — reserved for Phase 8 `ShopInventory`) |
| GET | /api/inventory | 🔴 | `inventory.getAll` | — (api fn registered; no hook/consumer) |
| GET | /api/inventory/low-stock | 🔴 | `inventory.getLowStock` | — (api fn registered; no hook/consumer — reserved for Phase 8 low-stock alert) |
| GET | /api/inventory/product/:productId | 🔴 | `inventory.getByProduct` | — (api fn registered; no hook/consumer) |
| GET | /api/inventory/sku/:sku | 🔴 | `inventory.getBySku` | — (api fn registered; no hook/consumer) |
| GET | /api/inventory/:id | 🔴 | `inventory.getById` | — (api fn registered; no hook/consumer) |
| PUT | /api/inventory/:id | 🔴 | `inventory.update` | — (api fn registered; no hook/consumer — reserved for Phase 8 `ShopInventory`) |
| DELETE | /api/inventory/:id | 🔴 | `inventory.delete` | — (api fn registered; no hook/consumer) |
| POST | /api/inventory/check-stock | 🔴 | `inventory.checkStock` | — (api fn registered; no hook/consumer) |
| POST | /api/inventory/reserve-stock | 🔴 | `inventory.reserveStock` | — (api fn registered; no hook/consumer) |
| POST | /api/inventory/release-stock | 🔴 | `inventory.releaseStock` | — (api fn registered; no hook/consumer) |

### 1.6 Social

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| POST | /api/social/posts | ✅ | `social.createPost` | `CreatePostModal.tsx` (useMutation · RHF + zod · invalidates `social.feed` onSuccess) |
| GET | /api/social/posts | ✅ | `social.getFeed` | `useFeed.ts` (useInfiniteQuery · `queryKeys.social.feed(1)` · IntersectionObserver pagination) · consumed by `FeedPage.tsx` |
| GET | /api/social/posts/user/:userId | ✅ | `social.getPostsByUser` | `ProfilePage.tsx` (inline useQuery · `queryKeys.social.postsByUser(userId)`) |
| GET | /api/social/posts/:id | ✅ | `social.getPostById` | `PostDetailPage.tsx` (inline useQuery · `queryKeys.social.post(id)`) |
| POST | /api/social/posts/:id/like | ✅ | `social.likePost` | `useLikePost` in `useFeed.ts` (useMutation · optimistic update on `pages[]` cache · rollback onError) · consumed by `PostCard.tsx`, `PostDetailPage.tsx` |
| DELETE | /api/social/posts/:id/like | ✅ | `social.unlikePost` | `useUnlikePost` in `useFeed.ts` (useMutation · optimistic decrement · rollback onError) · consumed by `PostCard.tsx`, `PostDetailPage.tsx` |
| DELETE | /api/social/posts/:id | ✅ | `social.deletePost` | `PostCard.tsx` / `PostDetailPage.tsx` (inline useMutation) |
| POST | /api/social/posts/:id/comments | ✅ | `social.createComment` | `useCreateComment` in `useComments.ts` (useMutation · invalidates `social.comments(postId)`) · consumed by `PostDetailPage.tsx` |
| GET | /api/social/posts/:id/comments | ✅ | `social.getComments` | `useComments` in `useComments.ts` (useQuery · `queryKeys.social.comments(postId)`) · consumed by `PostDetailPage.tsx` |
| DELETE | /api/social/comments/:id | ✅ | `social.deleteComment` | `useDeleteComment` in `useComments.ts` (useMutation · invalidates comments + replies caches) · consumed by `CommentNode.tsx` |
| POST | /api/social/comments/:id/replies | ✅ | `social.createReply` | `useCreateReply` in `useComments.ts` (useMutation · invalidates `social.replies(commentId)`) · consumed by `CommentNode.tsx` |
| GET | /api/social/comments/:id/replies | ✅ | `social.getReplies` | `useReplies` in `useComments.ts` (useQuery · `queryKeys.social.replies(commentId)` · lazy `enabled` flag) · consumed by `CommentNode.tsx` |

### 1.7 Notification

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| GET | /api/notifications | ✅ | `notifications.getList` | `useNotifications.ts` (useQuery · `queryKeys.notifications.list(1)` · page 1 limit 50) · consumed by `NotificationsPage.tsx`, `NotificationBell.tsx` |
| PATCH | /api/notifications/:id/read | ✅ | `notifications.markRead` | `useNotifications.ts` (useMutation · optimistic `is_read: true` update · rollback onError) · consumed by `NotificationsPage.tsx`, `NotificationBell.tsx` |

### 1.8 Chat (HTTP)

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| POST | /api/chat/conversations | ✅ | `chat.createConversation` | `MessagesPage.tsx` (inline useMutation) |
| GET | /api/chat/conversations | ✅ | `chat.getConversations` | `useConversations` in `useChat.ts` (useQuery · `queryKeys.conversations.all`) · consumed by `MessagesPage.tsx` |
| GET | /api/chat/conversations/:id/messages | ✅ | `chat.getMessages` | `useChat` in `useChat.ts` (useQuery · `queryKeys.messages.byConversation(conversationId)`) · consumed by `ChatThread.tsx` |

### 1.9 Upload

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| POST | /api/upload/signature | ✅ | `upload.getSignature` | `CreatePostModal.tsx` (direct await in mutation · Cloudinary upload flow) · `EditProfileModal.tsx` (avatar upload) |

### 1.10 Misc

| Method | Path | Bucket | api fn | Hook / consumer |
|---|---|---|---|---|
| GET | /api/gateway/health | 🔴 | `misc.health` | — (api fn registered; no hook/consumer — reserved for admin status page) |

### 1.11 WebSocket

| Connection | URL | Bucket | Consumer |
|---|---|---|---|
| Notification WS | `ws://localhost:3010` | ✅ | `useNotifications.ts` — socket.io `withCredentials: true`; `on('notification')` → prepend to `notifications.list(1)` cache + increment `unreadCount` |
| Chat WS | `ws://localhost:3011/chat` | ✅ | `useChat.ts` — socket.io `/chat` namespace `withCredentials: true`; `emit('join', conversationId)` on connect; `on('new_message')` → merge into messages + update conversation preview; `emit('send_message')` on send |

---

### 1.12 Partial — All Resolved ✅ (fix-first pass 2026-06-02)

These were registered in `api/index.ts` but were broken or mismatched against the reference. All four resolved in the fix-first pass.

**P1 — `products.getList` return type** (`api/index.ts:49`)
- Original: `Promise<unknown>` — breaks type safety downstream in `useProduct.ts`
- Original fix plan: change signature to `Promise<PaginatedResponse<ProductWithInventory>>` and remove the defensive runtime unwrapping in `useProduct.ts` once the type is correct
- ✅ DONE — getList typed; runtime unwrapping removed from `useProduct.ts`
- P0 / bonus: `useProduct.ts` query keys migrated from inline `['products']` to `queryKeys.products.list(params)` / `queryKeys.products.all` — previously a known inconsistency called out in `context/data-fetching.md`

**P2 — `orders.create` missing fields** (`api/index.ts:77`)
- Original: sends `{ items }` only
- Original fix plan: update `CreateOrderDto` type (add `payment_method: PaymentMethod`, `shipping_address: string`); update `CreateOrderItemDto` (add `product_name: string`); update `CheckoutPage.tsx` call site
- Note: `PaymentMethod` enum (`zalopay | vnpay | cod`) was not yet in `types/index.ts`
- ✅ DONE — `PaymentMethod` type added; `CreateOrderDto`/`CreateOrderItemDto` updated; `CheckoutPage.tsx` sends full body

**P3 — `orders.getByUser` consumed outside useQuery** (`OrderHistoryPage.tsx:47`)
- Original: called via raw `await api.orders.getByUser(userId)` inside a component — violates project convention (no `useState` + `useEffect`/raw await for server data)
- Original fix plan: create `useOrdersByUser(userId)` hook using `useQuery`; add `queryKeys.orders.byUser(userId)` (already defined in `queryKeys.ts`); fix return type from `Order[]` to `PaginatedResponse<Order>`
- ✅ DONE — `useOrdersByUser.ts` created; `OrderHistoryPage.tsx` uses hook; return type fixed to `PaginatedResponse<Order>`

**P4 — `products.getById` is dead code** (`api/index.ts:54`)
- Original: registered but never consumed — `ProductDetail.tsx` calls `getWithInventory` instead
- Original fix plan: either remove `getById` and keep only `getWithInventory`, or add a lightweight hook; do not leave unused registered fns
- ✅ DONE — `getById` removed (decision: no other caller; keeping dead code misleads)

---

## 2. Task Batches

Each batch follows the same execution order within it:
1. Add/update **types** in `src/types/index.ts`
2. Add **api fn(s)** in `src/api/index.ts`
3. Add **queryKeys** entry in `src/hooks/queryKeys.ts` (if useQuery)
4. Write **hook** in `src/features/<name>/use<Name>.ts` or `src/hooks/`
5. **Wire** into the consuming component

---

### Batch A — Auth / User *(prerequisite for everything)*

**Endpoints:** GET /user/me · GET /user/:id · PATCH /user/:id · GET /user/all

**Partials fixed here:** none (new fns only)

**Types to add:**
- Extend `User` with `name`, `avatar`, `role`, `isActive` fields (currently stripped)
- Add `UpdateUserDto { name?, email?, avatar? }`

**api fns:**
- `api.auth.me()` → GET /user/me
- `api.users.getById(id)` → GET /user/:id
- `api.users.update(id, data)` → PATCH /user/:id
- `api.users.getAll()` → GET /user/all

**queryKeys:** `auth.me`, `users.detail(id)`, `users.all`

**Hooks:** `useCurrentUser()` (replaces localStorage reads in `useAuth.ts`), `useUser(id)`, `useUpdateUser()`, `useAllUsers()`

**Consuming components:** `useAuth.ts` — remove `loadUser()`/`localStorage.setItem` pattern once `useCurrentUser` is wired; `TODO` comment on line 6 of `useAuth.ts` will be resolved

**Dependencies:** none — this is a foundation batch; other batches that read current user depend on it

**Model + Effort:** Sonnet · Medium (straightforward CRUD, but the localStorage→useQuery migration in `useAuth.ts` needs care)

---

### Batch B — Product CRUD extensions

**Endpoints:** GET /products · GET /products/search · PATCH /products/:id · DELETE /products/:id · GET /products/sku/:sku · POST /products/brands · GET /products/brands/:id · POST /products/categories · GET /products/categories/:id · GET /products/category/:categoryId · GET /products/brand/:brandId · GET /products/:id/stock-check

**Partials fixed here:** P1 (`products.getList` → typed), P4 (`products.getById` → decision + cleanup)

**Types to add:**
- `StockCheckResult { available: boolean; availableStock: number }`
- Extend `Brand` with `description`, `isActive`
- Extend `Category` with `description`, `isActive`
- `CreateBrandDto`, `CreateCategoryDto`

**api fns:** `products.getPlainList`, `products.search`, `products.update`, `products.delete`, `products.getBySku`, `products.createBrand`, `products.getBrandById`, `products.createCategory`, `products.getCategoryById`, `products.getByCategory`, `products.getByBrand`, `products.checkStock`

**queryKeys:** `products.bySku(sku)`, `products.byCategory(categoryId)`, `products.byBrand(brandId)`, `brands.all`, `brands.detail(id)`, `categories.all`, `categories.detail(id)`

**Hooks:** `useUpdateProduct`, `useDeleteProduct`, `useProductBySku`, `useCreateBrand`, `useBrandById`, `useCreateCategory`, `useCategoryById`, `useProductsByCategory`, `useProductsByBrand`, `useStockCheck`

**Dependencies:** none (standalone product CRUD)

**Model + Effort:** Sonnet · High (many fns, but all follow the same pattern)

---

### Batch C — Order fixes + extensions *(depends on Batch A for user context)*

**Endpoints:** POST /order (fix) · GET /order/user/:id (fix) · GET /order/:id · GET /order/admin/orders · PATCH /order/:id/cancel · GET /order/:id/invoice · GET /order/:id/payment-url

**Partials fixed here:** P2 (`orders.create` body), P3 (`orders.getByUser` → useQuery)

**Types to add:**
- `PaymentMethod` enum type: `'zalopay' | 'vnpay' | 'cod'`
- `OrderStatus` enum type: `'pending' | 'processing' | 'shipped' | 'delivering' | 'completed' | 'canceled'` (current `Order` only has 3 values)
- `CreateOrderDto { payment_method: PaymentMethod; shipping_address: string; items: CreateOrderItemDto[] }`
- Update `CreateOrderItemDto` — add `product_name: string`
- `PaginatedOrder` (use shared `PaginatedResponse<Order>`)
- `OrderWithBuyer extends Order` with `buyer: { id, username, email, name }`

**api fns:** fix `orders.create`, fix `orders.getByUser`, `orders.getById`, `orders.getAdminOrders`, `orders.cancel`, `orders.getInvoice` (returns `Blob`), `orders.getPaymentUrl`

**queryKeys:** `orders.detail(id)`, `orders.admin`

**Hooks:** `useCreateOrder` (wraps useMutation, replaces inline in `CheckoutPage.tsx`), `useOrdersByUser(userId)` (replaces raw await), `useOrder(id)`, `useAdminOrders`, `useCancelOrder`, `useOrderPaymentUrl`

**Invoice note:** `orders.getInvoice` must skip the JSON parse in `request()` — use raw `fetch` returning `Blob` for the PDF binary

**Dependencies:** Batch A (admin orders hook reads current user role)

**Model + Effort:** Sonnet · High (P2/P3 fixes have ripple effects into `CheckoutPage.tsx` and `OrderHistoryPage.tsx`)

---

### Batch D — Payment options + result page *(depends on Batch C)*

**Endpoints:** GET /payment/options · GET /gateway/payment-result

**Types to add:**
- `PaymentOption { id: PaymentMethod; name: string; description: string }`
- `PaymentResult { gateway: string; status: string; transId: string; amount: string }`

**api fns:** `api.payment.getOptions()`, `api.payment.getResult(params)`

**queryKeys:** `payment.options`

**Hooks:** `usePaymentOptions()` (useQuery, consumed in `CheckoutPage.tsx` to render payment method picker), `usePaymentResult(params)` (useQuery or called once on landing page)

**Dependencies:** Batch C (checkout uses payment options alongside order creation)

**Model + Effort:** Haiku · Low (2 read-only endpoints, simple types)

---

### Batch E — Inventory *(depends on Batch C checkout fix)*

**Endpoints:** All 11 `/api/inventory/*` endpoints

**Types to add:**
- `InventoryRecord { id: number; productId: number; sku: string; availableStock: number; reservedStock?: number; minimumStock?: number; location?: string; isLowStock: boolean }`
- `CreateInventoryDto`, `UpdateInventoryDto`
- `StockCheckRequest { productId: number; quantity: number }`
- `StockCheckResponse { available: boolean; availableStock: number }`

**api fns namespace `api.inventory`:** `create`, `getAll`, `getLowStock`, `getByProduct`, `getBySku`, `getById`, `update`, `delete`, `checkStock`, `reserveStock`, `releaseStock`

**queryKeys:** `inventory.all`, `inventory.lowStock`, `inventory.byProduct(productId)`, `inventory.bySku(sku)`, `inventory.detail(id)`

**Hooks:** `useInventory`, `useLowStockInventory`, `useInventoryByProduct(productId)`, `useInventoryBySku(sku)`, `useInventoryById(id)`, `useUpdateInventory`, `useDeleteInventory`, `useCheckStock`, `useReserveStock`, `useReleaseStock`

**Checkout dependency note:** `checkStock`/`reserveStock`/`releaseStock` are the inventory fns most immediately needed by `CheckoutPage.tsx` — implement these first within the batch

**Dependencies:** Batch C (`CheckoutPage.tsx` currently calls `getMultipleWithInventory` as a workaround; the inventory batch enables a proper stock-check step before order submission)

**Model + Effort:** Sonnet · High (11 endpoints; reserve/release have optimistic-update implications for checkout)

---

### Batch F — Social *(self-contained feature)*

**Endpoints:** All 12 `/api/social/*` endpoints

**Types to add:**
- `Post { id: number; userId: number; content: string; imageUrls?: string[]; videoUrl?: string; likeCount: number; createdAt: string }`
- `Comment { id: number; postId: number; userId: number; content: string; reply_count: number; createdAt: string }`
- `CommentTree extends Comment` with nested `replies: CommentTree[]`
- `CreatePostDto`, `CreateCommentDto { content: string }`, `CreateReplyDto { content: string; postId: number }`

**api fns namespace `api.social`:** `createPost`, `getFeed`, `getPostsByUser`, `getPostById`, `likePost`, `unlikePost`, `deletePost`, `createComment`, `getComments`, `deleteComment`, `createReply`, `getReplies`

**queryKeys:** `social.feed(page)`, `social.postsByUser(userId)`, `social.post(id)`, `social.comments(postId)`, `social.replies(commentId)`

**Hooks:** `useCreatePost`, `useSocialFeed`, `usePostsByUser`, `usePost(id)`, `useLikePost`, `useUnlikePost`, `useDeletePost`, `useCreateComment`, `usePostComments(postId)`, `useDeleteComment`, `useCreateReply`, `useCommentReplies(commentId)`

**Dependencies:** Batch A (posts/comments are authored by the current user; need `useCurrentUser`)

**Model + Effort:** Opus · High (largest single feature namespace; like/unlike have optimistic update UX expectations; comment tree has recursive shape)

---

### Batch G — Notification *(depends on WS batch H)*

**Endpoints:** GET /notifications · PATCH /notifications/:id/read

**Types to add:**
- `Notification { id: number; user_id: number; type: string; order_id: number; message: string; is_read: boolean; created_at: string }`

**api fns namespace `api.notifications`:** `getList(page?, limit?)`, `markRead(id)`

**queryKeys:** `notifications.list(page)`, `notifications.unreadCount`

**Hooks:** `useNotifications(page?)`, `useMarkNotificationRead()`

**Integration note:** the HTTP polling hook and the WS push hook (Batch H) should both invalidate `queryKeys.notifications.list` so the notification bell stays in sync whether the update arrives via HTTP refetch or WS push

**Dependencies:** Batch H (WS) for real-time; Batch A (user identity for filtering)

**Model + Effort:** Sonnet · Medium

---

### Batch H — WebSocket (Notification + Chat) *(depends on Batches F, G)*

**Connections:**
- Notification WS: `ws://localhost:3010`, namespace `/`, event: `notification`
- Chat WS: `ws://localhost:3011/chat`, namespace `/chat`, client events: `join`, `send_message`; server events: `new_message`, `error`

**Types to add:**
- `WsNotificationPayload` (reuse `Notification` type from Batch G)
- `WsMessage` (reuse `Message` type from Batch I)
- `WsChatError { message: string }`

**Hooks:**
- `useNotificationSocket()` — connects to port 3010 with `withCredentials: true`; on `notification` event, appends to query cache for `notifications.list` and increments unread count; disconnects on unmount
- `useChatSocket(conversationId)` — connects to port 3011/chat; emits `join` on connect; on `new_message`, appends to `chat.messages(conversationId)` query cache; exposes `sendMessage(content, parentMessageId?)` fn; handles `error` event

**Setup note:** both sockets authenticate via HttpOnly cookie (`withCredentials: true`) — no manual token. Use `socket.io-client`. Check if already installed: `package.json` should be verified before Batch H starts.

**Dependencies:** Batch G (notification cache shape); Batch I (chat message cache shape); `socket.io-client` package may need installing (check `package.json` first — do not `npm install` without confirming)

**Model + Effort:** Sonnet · High (socket lifecycle, cache integration, cleanup on unmount)

---

### Batch I — Chat HTTP *(depends on Batch A)*

**Endpoints:** POST /chat/conversations · GET /chat/conversations · GET /chat/conversations/:id/messages

**Types to add:**
- `Conversation { id: number; user1Id: number; user2Id: number; createdAt: string }`
- `Message { id: number; conversationId: number; senderId: number; content: string; parentMessageId: number | null; createdAt: string }`
- `CreateConversationDto { otherUserId: number }`

**api fns namespace `api.chat`:** `createConversation(otherUserId)`, `getConversations()`, `getMessages(conversationId, page?, limit?)`

**queryKeys:** `chat.conversations`, `chat.messages(conversationId)`

**Hooks:** `useCreateConversation`, `useConversations`, `useConversationMessages(conversationId)`

**Dependencies:** Batch A (current user), Batch H (WS sends/receives messages into the same cache keys)

**Model + Effort:** Sonnet · Medium

---

### Batch J — Upload *(depends on Batches B, F — product/social image upload)*

**Endpoints:** POST /upload/signature

**Types to add:**
- `UploadSignature { signature: string; timestamp: number; cloudName: string; apiKey: string; folder: string }`

**api fn:** `api.upload.getSignature(folder: string)`

**queryKeys:** none (this is a mutation, not a query — signatures are one-time use)

**Hook:** `useUploadSignature()` — useMutation that fetches signature, then the component uploads directly to Cloudinary using the returned credentials

**Dependencies:** Batch B (product image upload in `CreateProductModal`); Batch F (post image upload); the Cloudinary upload itself uses the Cloudinary SDK or a direct `fetch` to Cloudinary's API — not through `api/index.ts`

**Model + Effort:** Haiku · Low (single endpoint, well-defined flow)

---

### Batch K — Misc *(standalone)*

**Endpoints:** GET /gateway/health

**Types to add:**
- `HealthStatus { status: string; timestamp: string; uptime: number; memory: { used: number; total: number }; services: Record<string, string> }`

**api fn:** `api.misc.health()`

**queryKeys:** `misc.health`

**Hook:** `useHealthCheck()` — useQuery with a long `staleTime` (e.g. 30 s); primarily for an admin dashboard or status page

**Dependencies:** none

**Model + Effort:** Haiku · Low

---

## 3. Suggested Execution Order

| # | Batch | Rationale |
|---|---|---|
| 1 | **A — Auth / User** | Foundation: removes localStorage user cache; `useCurrentUser` is imported by nearly every other feature |
| 2 | **C — Order fixes** | P2/P3 are active checkout bugs — broken payload and convention violation; fix before adding new features |
| 3 | **D — Payment options** | Checkout immediately needs payment method list; small batch, high checkout UX impact |
| 4 | **B — Product CRUD** | Enables the product management surface (edit, delete, filter by category/brand); P1 + P4 cleanup |
| 5 | **E — Inventory** | Unlocks proper checkout stock-check flow; reserve/release-stock blocks order submission correctness |
| 6 | **J — Upload** | Needed before social posts and product images can be uploaded; low effort |
| 7 | **F — Social** | Largest feature; depends on user identity (A) and upload (J) being ready |
| 8 | **G — Notification HTTP** | Depends on user identity; wire before WS so HTTP fallback works first |
| 9 | **I — Chat HTTP** | HTTP layer before adding WS real-time on top |
| 10 | **H — WebSocket** | Add real-time layer last — cache keys from G and I must exist first |
| 11 | **K — Misc / Health** | No dependencies; add opportunistically alongside any other batch |

---

## Changelog

### Phase 7 — Profile + Edit — 2026-06-03
Files created: 2 · Files changed: 1

- src/features/user/ProfilePage.tsx — tạo mới; cover + avatar + tên + bio + stats; tabs Bài viết / Sản phẩm / Giới thiệu; inline useQuery `users.getById` + `social.getPostsByUser` + `products.getList`; nút Chỉnh sửa chỉ hiện cho chủ tài khoản (`useRole`)
- src/features/user/EditProfileModal.tsx — tạo mới; RHF + zod; name / email / avatar (Cloudinary upload flow); PATCH /api/user/:id; invalidate `queryKeys.users.detail` + `queryKeys.auth.me`
- src/router.tsx — thêm route `/profile/:id` → ProfilePage (lazy)

### Phase 6 — Chat / Messaging — 2026-06-03
Files created: 3 · Files changed: 1

- src/features/chat/useChat.ts — tạo mới; `useConversations` (useQuery `conversations.all`); `useChat(conversationId)` (useQuery messages + socket.io `/chat` namespace; `emit('join')` khi mở thread; `on('new_message')` → merge vào cache; `emit('send_message')`); `mergeMessages` dedup by id
- src/features/chat/MessagesPage.tsx — tạo mới; layout 2 cột `[300px_1fr]`; list hội thoại bên trái; ChatThread bên phải; tạo conversation mới
- src/features/chat/ChatThread.tsx — tạo mới; bong bóng tin (trái/phải theo senderId); input gửi tin; scroll to bottom
- src/router.tsx — thêm route `/messages` → MessagesPage (lazy)

### Phase 5 — Notifications + Realtime — 2026-06-03
Files created: 2 · Files changed: 1

- src/features/notifications/useNotifications.ts — tạo mới; useQuery `notifications.list(1)` limit 50; useMutation `markRead` với optimistic update + rollback; socket.io `ws://localhost:3010` `withCredentials: true`; `on('notification')` → prepend cache + tăng unreadCount; cleanup on unmount
- src/features/notifications/NotificationsPage.tsx — tạo mới; danh sách phân trang; nhóm theo ngày; click → navigate đơn hàng; nút "Đọc tất cả"
- src/router.tsx — thêm route `/notifications` → NotificationsPage (lazy)

### Phase 4C — Commerce (order lifecycle) — 2026-06-03
Files created: 5 · Files changed: 2

- src/features/order/useOrder.ts — tạo mới; useQuery `orders.detail(orderId)` → `OrderDetailPage`
- src/features/order/useCancelOrder.ts — tạo mới; useMutation `orders.cancel`; invalidate `orders.detail` + `orders.byUser`
- src/features/order/useOrderInvoice.ts — tạo mới; useMutation; Blob download → anchor click → `order-{id}.pdf`
- src/features/order/useOrderPaymentUrl.ts — tạo mới; useMutation; `window.location.href = order_url`
- src/features/order/OrderDetailPage.tsx — tạo mới; timeline 6 bước; nút Hủy / Tải PDF / Thanh toán; StatusBadge
- src/features/cart/usePaymentOptions.ts — tạo mới; useQuery `payment.options` → CheckoutPage picker
- src/features/payment/PaymentResultPage.tsx — tạo mới; đọc search params; inline useQuery `payment.getResult`; hiển thị success/failure + link đơn hàng
- src/router.tsx — thêm routes `/order/:id`, `/payment-result`

### Phase 4B — Router + Guards + Lazy-loading — 2026-06-03
Files created: 1 · Files changed: 1

- src/components/auth/ProtectedRoute.tsx — tạo mới; `useRole()` → redirect `/login` nếu chưa authen; role guard prop cho `/admin` (isAdmin) và `/shop` (isSeller || isAdmin)
- src/router.tsx — bọc authenticated routes trong AppShell + ProtectedRoute; lazy import tất cả page-level components; thêm routes `/marketplace`, `/post/:id`, `/profile/:id`, `/messages`, `/notifications`, `/order/:id`, `/payment-result`

### Phase 4A — App Shell (6 layout components) — 2026-06-03
Files created: 6 · Files changed: 0

- src/components/layout/AppShell.tsx — tạo mới; wrapper `min-h-screen bg-canvas-base`; grid `md:[210px_1fr] lg:[210px_1fr_300px]`; rightRail optional
- src/components/layout/Header.tsx — tạo mới; Logo + search (submit → `/marketplace?search=`); nút Tạo dropdown; icon Tin nhắn (badge); NotificationBell; icon Giỏ hàng (badge); ProfileMenu
- src/components/layout/LeftRail.tsx — tạo mới; nav links theo role; Kênh người bán chỉ `isSeller || isAdmin`; Quản trị sàn chỉ `isAdmin`
- src/components/layout/RightRail.tsx — tạo mới; seller nổi bật + trending products
- src/components/layout/NotificationBell.tsx — tạo mới; dropdown 360px; badge gradient unread count; mark-read per item; link Xem tất cả
- src/components/layout/ProfileMenu.tsx — tạo mới; avatar → dropdown theo role; Đăng xuất

### Phase 3B — Header search — 2026-06-03
Files changed: 1

- src/components/layout/Header.tsx — nối ô search → điều hướng `/marketplace?search=...`; bỏ `readOnly`; debounce 300ms

### Phase 3A — Marketplace core — 2026-06-03
Files created: 3 · Files changed: 2

- src/features/product/MarketplacePage.tsx — tạo mới; sidebar filter (category / brand / giá min-max) + lưới ProductCard + sort + phân trang `hasNext`
- src/features/product/ProductCard.tsx — tạo mới; ảnh, tên, giá, badge brand, nút Thêm vào giỏ; không có Like/Comment giả
- src/features/product/useProducts.ts — tạo mới (thay `useProduct.ts`); nhận params `{ search, categoryId, brandId, minPrice, maxPrice, sortBy, sortOrder, page }`; xoá `Math.random()`
- src/router.tsx — thêm route `/marketplace` → MarketplacePage
- src/features/product/useProduct.ts — đã xoá (thay bằng useProducts.ts)

### Phase 2 — Post Detail + Comments — 2026-06-03
Files created: 3 · Files changed: 1

- src/features/social/PostDetailPage.tsx — tạo mới; header post + nội dung + ảnh + action row + section bình luận; inline useQuery `social.getPostById`
- src/features/social/CommentNode.tsx — tạo mới; đệ quy render reply; ô trả lời inline; nút xoá chỉ chủ comment; load thêm replies theo depth
- src/features/social/useComments.ts — tạo mới; `useComments(postId)`, `useReplies(commentId)`, `useCreateComment`, `useCreateReply`, `useDeleteComment`
- src/router.tsx — thêm route `/post/:id` → PostDetailPage

### Phase 1 — Social Feed — 2026-06-02
Files created: 5 · Files changed: 1

- src/features/social/useFeed.ts — useInfiniteQuery
  queryKeys.social.feed(); likePost / useUnlikePost với
  optimistic update trên pages[] cache; rollback onError
- src/features/social/ProductChip.tsx — thumbnail + tên +
  giá (font-mono) + "Mua nhanh" → CartContext
- src/features/social/PostCard.tsx — author header, content,
  image grid, ProductChip row, action row (like/comment/share
  với số đếm thật); like gọi useLikePost/useUnlikePost
- src/features/social/FeedPage.tsx — composer bar + tabs
  (Dành cho bạn / Đang theo dõi) + PostCard list;
  IntersectionObserver → fetchNextPage; skeleton / empty /
  error states
- src/features/social/CreatePostModal.tsx — RHF + zod;
  text + Cloudinary image upload (getSignature flow) +
  product attach by name/SKU; invalidate social.feed onSuccess
- src/router.tsx — route index → FeedPage;
  route /marketplace → component lưới sản phẩm cũ

Ref: design_handoff_trybuy_ui/reference/app/feed.jsx
Verify pending: feed phân trang, like optimistic, bài mới đầu feed.

---

### Phase 0 completion pass — 2026-06-02
Files changed: 5 touched, 2 created

- src/types/index.ts — User extended (name, avatar, role, isActive);
  Order.status đủ 6 giá trị; types mới: Post, Comment, CommentTree,
  Notification, Conversation, Message, PaymentOption, PaymentResult,
  InventoryRecord, UploadSignature, HealthStatus, OrderWithBuyer + DTOs
- src/api/index.ts — toQuery() helper; auth.me(); namespaces mới:
  users, social, notifications, chat, payment, inventory, upload, misc;
  products + orders extended với Batch B/C fns
- src/hooks/queryKeys.ts — key groups mới: brands, categories, social,
  notifications, conversations, messages, payment, inventory, misc
- tailwind.config.js — tokens mới: accent-violet (#8b5cf6),
  accent-blue (#3b82f6); pattern badge: bg-*/10 + text-* + border-*/20
- src/components/shared/StatusBadge.tsx — tạo mới (không phải ui/ —
  shadcn write-blocked); 6 trạng thái → accent-* tokens
- src/hooks/useRole.ts — tạo mới; api.auth.me() → { me, role,
  isSeller, isAdmin }; role values: "admin"/"seller"/"user"

npm run build — zero TS errors. Phase 0 ✅ complete.

---

### RHF + Zod migration pass — 2026-06-02
Files changed: 5 touched, 3 created

- `.claude/context/conventions.md` — section Form Handling viết lại:
  RHF + Zod đã install; pattern chuẩn (register / Controller / zodResolver);
  schema co-locate rule; thay thế dòng "neither installed yet"
- `src/features/auth/auth.schema.ts` — tạo mới: `loginSchema`, `registerSchema`,
  `LoginFormData`, `RegisterFormData`
- `src/features/cart/checkout.schema.ts` — tạo mới: `checkoutSchema` (shipping_address,
  payment_method enum zalopay|vnpay|cod), `CheckoutFormData`
- `src/features/product/product.schema.ts` — tạo mới: `createProductSchema` (10 fields,
  z.coerce cho number fields), `CreateProductFormData`
- `src/features/auth/LoginPage.tsx` — migrate sang useForm + zodResolver; xoá
  useState form fields + validate thủ công; server error → setError('root')
- `src/features/cart/CheckoutPage.tsx` — 4 useState address fields → useForm;
  payment_method via Controller; shipping_address via register
- `src/features/product/CreateProductModal.tsx` — 30+ dòng validate thủ công → zodResolver;
  shadcn Select/Checkbox → Controller; z.coerce.number() cho price/stock/brandId

Dependencies installed: react-hook-form, zod, @hookform/resolvers

---

### Fix-first pass — 2026-06-02
Files changed: 6 touched, 1 created
- `src/types/index.ts` — `PaginatedResponse<T>` shape corrected; `PaymentMethod` type; `CreateOrderDto`; `CreateOrderItemDto` extended
- `src/api/index.ts` — `getList` typed; `getById` removed; `orders.create` takes `CreateOrderDto`; `orders.getByUser` return type fixed
- `src/features/product/useProduct.ts` — unwrap removed; query keys migrated to factory
- `src/features/order/useOrdersByUser.ts` — created (new)
- `src/features/order/OrderHistoryPage.tsx` — raw await replaced with `useOrdersByUser` hook
- `src/features/cart/CheckoutPage.tsx` — payment method typed; full `CreateOrderDto` payload

P0 consumers touched by `PaginatedResponse` reconcile: `useProduct.ts`, `OrderHistoryPage.tsx` (both had their own defensive unwrap — now both gone). No other consumers affected.

---

## 4. Implementation Notes (carry-forward from reference)

**Cookie auth**
All requests use `credentials: 'include'`. The global `request()` fn in `api/index.ts` already sets this. Never add `Authorization` header or pass tokens manually.

**Order `total` field**
TypeORM returns `DECIMAL` columns as strings. Always parse with `Number(order.total)` before arithmetic. The `Order` type should reflect `total: string` (raw) or document the coercion site.

**`PaginatedResponse<T>` shape**
```
{ data: T[]; total: number; page: number; limit: number; totalPages: number; hasNext: boolean }
```
Current `PaginatedResponse<T>` in `types/index.ts` has a different shape (`data.items` instead of `data[]`). Reconcile this before implementing paginated hooks — the type definition must match what the API actually returns.

**Upload flow**
`POST /api/upload/signature` → returns Cloudinary credentials → client uploads *directly* to Cloudinary (not through the backend). The `api/index.ts` fn only calls the signature endpoint; the actual file upload goes to Cloudinary's API.

**WebSocket auth**
Both gateways (port 3010 and 3011/chat) authenticate via the `access_token` HttpOnly cookie. Connect with `withCredentials: true` — no manual token passing. `handshake.auth.token` / `handshake.query.token` work as dev-only fallbacks.

**WebSocket ports**
- Notification: `ws://localhost:3010` (no namespace path)
- Chat: `ws://localhost:3011/chat` (namespace `/chat`)
Use `VITE_WS_NOTIFICATION_URL` / `VITE_WS_CHAT_URL` env vars rather than hardcoding ports.

**GHN webhook**
`POST /ghn/webhook` is called by GHN's shipping service directly to the backend. It is excluded from the `/api/` prefix. No frontend implementation needed.

**`socket.io-client` dependency**
Before implementing Batch H, check `package.json`. If `socket.io-client` is not listed, confirm with the user before running `npm install` — `npm install` is blocked in project settings by default.
