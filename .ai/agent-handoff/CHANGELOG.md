# CHANGELOG — TryBuy Frontend

> Historical record of completed FE work. **NOT auto-loaded** by any agent entry point.
> Read on demand only when you need the history/rationale of a past change.
> Current state (readiness, open/blocked tasks, known issues) lives in `snapshot.md`.

## P0 — release blockers

### P0-01 — Hợp nhất cart thành server cart — DONE (2026-06-24)

- Server cart là source of truth duy nhất. `src/context/CartContext.tsx` và `CartSidebar.tsx` đã xóa; không còn import `CartContext` nào trong `src/` (đã grep xác nhận).
- Quick-add `ProductCard.tsx` và social `ProductChip.tsx` đều dùng `useAddToCart()` từ `src/hooks/useCart.ts`. Header badge, `CartPage`, `CartDrawer`, `CheckoutPage` đọc cùng query key `queryKeys.cart.all`; mutation invalidate đúng cart query.

**Acceptance đã đạt:** add từ marketplace + product detail + product chip cho cùng kết quả; quantity/remove/clear đồng bộ qua refresh/tab mới; không còn component commerce nào import `CartContext`.

### P0-02 — Variation → SKU matching — DONE (FE) (2026-06-25)

- Logic match SKU tập trung tại `src/lib/sku.ts` (có test `sku.test.ts`): `isValidSku`/`getValidSkus` loại SKU dị dạng (số tier ≠ số variation); `findMatchingSku` chỉ trả SKU khi chọn đủ tier và match exact; `getOptionStock` trả `null` cho tổ hợp không tồn tại → option bị `disabled` trước khi click.
- `ProductDetail.tsx` dùng chung các helper này cho availability, price, max quantity và payload add-cart (cùng một luật). Product dị dạng (không có valid SKU) hiện banner "Phân loại sản phẩm đang được cập nhật", không cho add.
- **Verify create-path (2026-06-25, seller `test1`, qua API):** tạo product 1 variation (2 options) → SKU `tierIdx` ra `[0]`/`[1]` (len 1 = số variation); tạo product 2 variation → `[0,0] [0,1] [1,0] [1,1]` (len 2). Cả `POST /api/products` lẫn `GET /api/products/:id/with-inventory` trả về đúng contract. → **Luồng tạo mới KHÔNG sinh dữ liệu hỏng**; FE (`buildCombosInternal` dựng tierIdx theo tích Descartes) + backend đều chuẩn. 2 product test đã xóa (`DELETE` 204).

> Còn chờ backend (xem `snapshot.md`): migration/cleanup dữ liệu legacy (product cũ `tierIdx` len ≠ số variation); quét toàn catalog chưa hoàn tất (rate limit 20 req/60s).

### P0-03 — Tạo product tạo/cập nhật inventory nguyên tử — DONE (FE mitigation) (2026-06-23)

- `CreateProductPage.tsx` không còn nuốt `409`. Helper `persistSimpleStock()` xử lý seed tồn kho cho simple product: `POST /inventory`, nếu `409` thì `GET /inventory/product/:id` rồi `PUT /inventory/:id` để reconcile SKU + `availableStock` về đúng product mới (xử lý stale/orphan row do reuse ID).
- Stock-persist fail (ngoài 409 do trùng SKU lúc create product) sẽ reject mutation → hiển thị error banner ở action bar, không còn báo "Đã đăng!" giả. `onSuccess` invalidate thêm `inventory.all` + `inventory.byProduct(id)`.

> Còn chờ backend (xem `snapshot.md`): transaction atomic create product+inventory và cleanup orphan inventory khi xóa product (FE recovery chỉ là mitigation phía client).

### P0-04 — Không xóa cart trước payment success — DONE (2026-06-25)

- Online payment KHÔNG còn clear cart trước khi redirect gateway. `CheckoutPage` lưu `pendingCheckout` (orderIds + cartItemIds + `clearAll`) vào `sessionStorage` (`src/features/cart/pendingCheckout.ts`) rồi mới redirect.
- `PaymentResultPage` chỉ consume cart khi gateway xác nhận success: `clearCart` (full) hoặc remove đúng các `cartItemIds` (selected subset), sau đó xóa pending state. Cancel/fail không vào page success nên cart được giữ nguyên.
- Khi lấy payment URL fail sau khi order đã tạo: điều hướng người dùng tới order detail (`/order/:id`) — nơi có nút "Thanh toán ngay" (`useOrderPaymentUrl`) để retry trên cùng order — thay vì để họ submit lại tạo order trùng. Multi-seller → `/orders`.
- Backend đã thêm `Idempotency-Key` header cho `POST /api/order` (single-flight Redis: 409 khi đang in-flight, replay response khi retry sau hoàn tất). FE giờ sinh và gửi key này: `api.orders.create(dto, idempotencyKey?)` set header `Idempotency-Key`.
- `CheckoutPage` giữ key ổn định theo "checkout intent" qua `idemKeyRef`: helper thuần `src/features/cart/idempotency.ts` (`buildCheckoutSignature` = chữ ký productId/skuId/quantity không phụ thuộc thứ tự; `resolveIdempotencyKey` tái dùng key khi chữ ký không đổi, sinh key mới khi giỏ đổi). Double-submit / retry mạng → cùng key → backend replay thay vì tạo đơn trùng; đổi giỏ → key mới. Key sinh bằng `crypto.randomUUID()`.
- **Test:** `idempotency.test.ts` (6 cases) — chạy pass (config node thuần, P3-01). `npm run build` pass.

### P0-05 — Edit variation product (hydrate đầy đủ) — DONE (FE) (2026-06-23)

- `useProductForm(initial?, initialImages?)` nhận seed. `CreateProductPage` hydrate đầy đủ ở edit mode qua `useMemo`:
  - `initialFields`: name/description/sku/brand/condition/isActive/categoryIds/sellerNotes/hasVariations + `groups` (từ `existingProduct.variations`) + `rows` (map `JSON.stringify(sku.tierIdx)` → price/stock) + singlePrice/singleStock.
  - `initialImages`: map `imageUrls`/`imageUrl` → `{ url, publicId: '' }`. `publicId: ''` đánh dấu ảnh đã-persist: `removeImage`/`clearImages` KHÔNG gọi `deleteMedia` cho ảnh này (chỉ xóa khỏi list), tránh phá ảnh khi user cancel.
- Variation builder + SKU matrix render ở CẢ create lẫn edit (đã bỏ block "Chỉnh sửa phân loại chưa được hỗ trợ").
- Guard phá hủy SKU: `originalTierIdx` (Set các `tierIdx` gốc); `handleSubmit` `window.confirm` khi edit mà có `tierIdx` gốc biến mất khỏi `form.combos`.
- `onSuccess` invalidate thêm `products.detail(id)` + `products.withInventory(id)`. `buildPayload()` tự dựng `variations` + `skuList` + `imageUrls` từ state hydrate nên save-không-đổi bảo toàn dữ liệu.

**Đã verify runtime (Chrome DevTools, 2026-06-23, seller `test1`):**

- Product #2 (1 variation `Màu sắc` [Đỏ,Xanh], SKU `[0]`/`[1]`): mở edit nạp đủ name/SKU/danh mục/variation + ma trận SKU đúng giá/kho (Đỏ 199000/30, Xanh 249000/20). Save-không-đổi gửi `PATCH /api/products/2` với đầy đủ `variations` + `skuList`; response giữ nguyên → bảo toàn dữ liệu xác nhận.
- Guard phá hủy SKU: xóa option `Xanh` rồi Save → `window.confirm`; Cancel → KHÔNG gửi PATCH, SKU `[1]` vẫn còn. ✓
- **2 bug phát hiện & sửa khi test:** (1) `categoryIds`/`brandId` backend trả **string** (`["2"]`) → checkbox không tick khi edit; fix coerce `.map(Number)`/`Number()`. (2) Danh sách danh mục/brand **render trùng đôi** ở edit mode (effect so `prev` id string với `propIds` id number); fix normalize `prev` id → number trước filter (`BasicInfoSection.tsx`).

> Còn chờ backend (xem `snapshot.md`): diff create/update/delete SKU ở tầng API và bảo vệ SKU đã có order/cart reference (FE mới confirm phía client).

## P1

### P1-02 — Order item enrichment (FE) — DONE + runtime-verified (2026-06-25)

- Backend (DONE 2026-06-25) enrich mỗi order item trên cả 3 endpoint (`GET /order/:id`, `GET /order/user/:id` batch cả trang, `GET /order/seller/:id`): thêm `productName`, `skuId`, `skuLabel` (vd `"Màu sắc: Đỏ, Size: M"`, hoặc `null` khi không có variation) và `image` (ảnh đầu realtime, hoặc `null`). **Runtime self-test (Chrome DevTools MCP, user 17) xác nhận cả 3 field + `productName` có mặt trên cả list lẫn detail.**
- **Bỏ hẳn `useProductsByIds` ở cả 2 trang buyer order** — đọc thẳng `item.productName`/`item.image`/`item.skuLabel`. Đây cũng là **bug fix**: `POST /products/with-inventory/multiple` trả `404 "Product not found"` khi BẤT KỲ product nào trong batch đã bị xóa → trước đây giết toàn bộ tên sản phẩm (rơi về "N sản phẩm"). Verify: 404 đó đã biến mất, tên thật render đúng.
- **Types:** `OrderItem` thêm `productName?`/`skuId?`/`skuLabel?`/`image?` (optional, `null`-able); `SellerOrderItemDetail` bỏ `productName`/`skuId` trùng (kế thừa từ base, vẫn narrow image/skuLabel về required). Thêm `OrderStatusCounts` (`types/order.ts`).
- **Helpers (`orderSummary.ts`):** `orderItemsSummary(items)` + `orderCoverImage(items)` giờ chỉ nhận `items` (đọc `item.productName`/`item.image`), bỏ tham số `productMap`.
- **Buyer detail (`OrderDetailPage`):** thumbnail = `item.image`; tên = `item.productName`; render `item.skuLabel` dưới tên. Bỏ dòng seller-name (chỉ có khi hydrate product — vốn đã chết do 404).
- **Buyer list (`OrderHistoryPage`):** filter-tab badges chuyển sang server count toàn lịch sử qua `GET /order/user/:id/status-counts` (`api.orders.getStatusCounts` + `useOrderStatusCounts` + queryKey `orders.statusCounts(userId)` nested dưới `byUser` → `useCancelOrder` invalidate `byUser` đã cover badge refresh). Helper thuần `orderFilterCounts()` map per-status → 4 tab (pending tab gộp pending+confirmed+processing+shipped+delivering). **Verify live: badges 42/11/6/25 khớp đúng map `{all:42,pending:9,confirmed:0,processing:1,shipped:1,delivering:0,completed:6,canceled:25}`.**
- **Test:** `orderFilterCounts.test.ts` (3 cases) + `orderSummary.test.ts` viết lại theo signature mới (item-based). Full suite **18 files / 103 tests pass**; `build`/`lint` (0 errors) xanh.
- Còn nợ: order snapshot tại thời điểm mua (P2-02) — `image`/`skuLabel`/`productName` hiện realtime nên order cũ sẽ lệch nếu product đổi/xóa. (Lưu ý ngoài scope: cart pages vẫn dùng `useProductsByIds` → cùng endpoint 404 nếu cart chứa product đã xóa.)

### P1-01 — Seller order lifecycle — DONE (2026-06-25)

- State machine seller tập trung tại `src/features/order/sellerOrderActions.ts` (`getSellerOrderAction(status)`): `pending → confirm`, `confirmed → ready-to-ship`, `processing → ship` ("Đã bàn giao vận chuyển"), `shipped → deliver` ("Bắt đầu giao hàng"), `delivering → complete` ("Hoàn tất đơn hàng"); chỉ `completed`/`canceled` terminal. Label khớp transition thực, chỉ render action hợp lệ.
- Backend đã expose: (a) `GET /api/order/seller/:id` — detail riêng cho seller, mỗi item enrich `image` (`imageUrls[0]`) + `skuLabel` (build từ `variations` + `skuTierIdx`) + `productName`; (b) `PATCH /api/order/:id/ship|deliver|complete` — transition single-step sau `processing`, race-safe với GHN webhook.
- **API + hooks:** `api.orders.getSellerOrderDetail/ship/deliver/complete`; `useAdvanceOrder()` (1 hook dispatch ship/deliver/complete, invalidate `orders.seller` + `orders.detail(id)` + `orders.sellerDetail(id)`); `SellerOrdersPage.handleAction`/`pendingKindFor` xử lý cả 5 kind. `confirm`/`ready-to-ship` giữ hook cũ.
- **Detail accordion enrich item:** `useSellerOrderDetail(id, enabled)` lazy-fetch khi mở accordion (enabled theo `expanded` → list view nhẹ); item render `<ProductThumb>` (ảnh, fallback Package), tên thật, `skuLabel`. Fallback item rỗng khi detail chưa load; skeleton trong lúc fetch. Buyer/địa chỉ/payment/GHN lấy từ `OrderWithBuyer` của list (detail endpoint không trả buyer; list không refetch `GET /order/:id` để tránh 403).
- `PAYMENT_LABEL` tách `src/features/order/orderConstants.ts` dùng chung buyer (`OrderDetailPage`) + seller (DRY). Types: `SellerOrderItemDetail` + `SellerOrderDetail` (`types/order.ts`). queryKey `orders.sellerDetail(id)` (prefix `['orders','seller']`).
- **Test:** `sellerOrderActions.test.ts` (6 cases) pass. `npm run build` pass.

### P1-02 — Buyer orders — DONE (FE) (2026-06-24)

- `useOrdersByUser` chuyển sang `useInfiniteQuery` (page size 10, dừng theo `hasNext`); giữ key `orders.byUser` nên `useCancelOrder` invalidate vẫn refresh. `OrderHistoryPage` flatten `pages` + nút "Tải thêm đơn hàng" (chỉ tab "Tất cả").
- Enrich item bằng hook dùng chung `src/hooks/useProductsByIds.ts` (`POST /products/with-inventory/multiple`, share cache `products.cartItems`): `OrderHistoryPage` hiện ảnh + tên sản phẩm đầu ("… +N sản phẩm khác"); `OrderDetailPage` hiện ảnh/tên/seller (brand→user.name) + link product, fallback Package khi thiếu ảnh.
- Invoice download, retry payment (`useOrderPaymentUrl`), cancel policy theo state (`pending|confirmed|processing`) đã có sẵn ở `OrderDetailPage` — verify đạt.
- Logic tóm tắt order row tách pure helper `src/features/order/orderSummary.ts` (`orderItemsSummary`/`orderCoverImage`) + test `orderSummary.test.ts` (7 cases pass).

> Còn chờ backend (xem `snapshot.md`): SKU label per item + order snapshot (P2-02); per-status count chính xác cần server-side filter.

### P1-03 — Kết nối social với commerce — DONE (phần không phụ thuộc backend) (2026-06-24)

- **Global create-post:** `CreatePostModal` tách khỏi `FeedPage` lên app scope qua `src/features/social/GlobalCreatePost.tsx`, mount trong `AppShell` (cả 2 branch). Listen event `tb:createpost` (Header dispatch) → CTA mở từ mọi route. Modal lazy-load (`React.lazy`) → không kéo code upload Cloudinary vào main bundle (index 585kB → 448kB). `FeedPage` đã bỏ state/listener/render modal.
- **Post action menu:** nút `MoreHorizontal` (trước là dead button) thay bằng `src/features/social/PostActionMenu.tsx` (dropdown click-outside theo pattern `ProfileMenu`, dùng `<IconButton>`): "Sao chép liên kết" (mọi người) + "Xóa bài viết" (chỉ chủ bài, `window.confirm`, `useDeletePost` → `DELETE /social/posts/:id`). Dùng ở cả `PostCard` và `PostDetailPage` (DRY). `useDeletePost` xóa post khỏi cache feed + invalidate following-feed/user posts + remove post detail query.
- **Share:** nút "Chia sẻ" (trước no-op) nối `src/lib/sharePost.ts` (`sharePost` = Web Share API, fallback clipboard; `copyPostLink`; `postShareUrl` + test `sharePost.test.ts`). Toast qua hook `useSharePost` + component `ShareToast` (local-state, không thêm dep).
- **Follow seller:** đã có sẵn trong `PostCard` — verify đạt.

#### Backend integration — DONE (2026-06-26)

- **Gắn sản phẩm vào post (`productId`):** types thêm `Post.productId: number | null`, `CreatePostDto.productId?`, `UpdatePostDto`, `ReportPostDto` (`src/types/social.ts`). `api.social.updatePost` (PATCH partial) + `reportPost` (POST) thêm vào `src/api/index.ts`.
- **Product picker (composer):** `src/features/social/ProductPicker.tsx` — debounce search (`useDebouncedValue` 350ms) qua `useProducts({ search, limit: 6 }, { enabled })`, chọn/bỏ chip. Tích hợp vào `CreatePostModal` (`attachedProduct` state, hydrate khi edit qua `useProductsByIds`).
- **Render `ProductChip` trong feed/detail:** `src/features/social/AttachedProduct.tsx` tự hydrate qua `useProductsByIds([productId])` (dùng chung cache `products.cartItems`, dedupe theo id) → render `ProductChip`. Gắn vào `PostCard` + `PostDetailPage` (`{post.productId != null && …}`) — phủ mọi consumer (Feed/Profile/Detail) không cần prop-drill.
- **Edit post (PATCH):** `useUpdatePost` (`src/features/social/useFeed.ts`) cập nhật cache feed + post detail + invalidate following/user feed. Tái dùng global composer cho edit qua `src/features/social/composerEvents.ts` (`openEditPost(post)` dispatch `tb:editpost` mang `Post`); `GlobalCreatePost` listen cả create+edit, unmount khi đóng để reset prefill. `PostActionMenu` thêm item "Chỉnh sửa bài viết" (owner). Media đã-persist đánh dấu `publicId === ''` → không xóa khi remove/cancel.
- **Report post:** `src/features/social/ReportPostDialog.tsx` (reason ≤500) + item "Báo cáo bài viết" (`!isOwner && canReport`). Lỗi map qua pure helper `reportPostError.ts` (`409`→đã báo cáo, `400`→tự báo cáo, `429`→rate-limit; test `reportPostError.test.ts` 5 case).
- **Verify:** `npm run build` + `npm run lint` (0 errors) + `npm run test:run` (115 pass) xanh.

### P1-04 — Hoàn thiện Profile / Shop — DONE (FE) (2026-06-24)

- Tab "Sản phẩm" ở `ProfilePage` không còn empty-state hardcode. Dùng chung hook `useProducts({ userId, limit: 50, isActive: true })` (thêm option `{ enabled }` lazy-load khi mở tab, backward-compatible với `ShopPage`). Render grid bằng `ProductCard` có sẵn; skeleton/empty-state; label tab hiện count `(n)`. Comment cũ sai ("getList does not support userId filter") đã xóa.
- `ShopPage` đã dùng `userId: currentUser?.id` filter từ trước — verify đạt.

#### Multi-category integration — DONE (2026-06-26)

- Backend giờ trả CẢ `categories[]` (object đầy đủ) LẪN `categoryIds: number[]` trên mọi product read. Type `Product` thêm `categories?: Category[]` (`src/types/product.ts`).
- Shop table hiển thị nhiều danh mục: pure helper `src/features/product/productCategories.ts` (`productCategoryNames` — ưu tiên `categories[]`, fallback `category`; test 3 case). `ShopPage` ProductRow render pill multi-category (flex-wrap) thay cho single `category?.name`.
- Editor multi-select prefill: `CreateProductPage` đã prefill `categoryIds` từ `existingProduct.categoryIds` (`BasicInfoSection` multi-checkbox) — verify đạt.
- **Verify:** `npm run build` + `npm run lint` (0 errors) + `npm run test:run` (115 pass) xanh.

> Còn chờ backend (xem `snapshot.md`): pagination Shop (stats + search server-side, P2-05).

### P1-05 — Notification socket ownership — DONE (2026-06-24)

- **Root cause:** `useNotifications()` gọi ở CẢ `NotificationBell` (Header, luôn mounted) lẫn `NotificationsPage`; mỗi lần gọi `useEffect` tự `io()` socket riêng → ở `/notifications` có 2 socket cùng prepend → notification nhân đôi + tốn 2 kết nối.
- **Fix — single socket owner:** tách `src/features/notifications/notificationSocket.ts` — singleton socket ref-count (`acquireNotificationSocket()`): mở ở consumer đầu, đóng khi consumer cuối unmount → luôn chỉ 1 socket. `NotificationBell` luôn mounted → socket hiệu quả app scope, không cần Provider. `useNotifications` chỉ `useEffect(() => acquireNotificationSocket(), [])`.
- **Dedupe theo ID:** pure helper `src/features/notifications/notificationCache.ts` (`prependNotification`) — bỏ qua nếu `id` đã tồn tại. Header + page đọc chung cache qua query key `notifications.list(1)`; mark-read/unread badge derive từ cache đó → đồng bộ 2 nơi.
- **Reconnect:** socket.io tự reconnect; dedupe đảm bảo replay không tạo bản trùng.
- **Test:** `notificationCache.test.ts` (4 cases). `npm run build` pass.

### P1-06 — Chat reliability — DONE (phần không phụ thuộc backend) (2026-06-24)

- **Nối CTA Chat product detail:** nút "Chat" ở seller card (`ProductDetail.tsx`) trước là dead button. Giờ điều hướng `/messages` kèm `state: { otherUserId: detail.userId }` (chưa login → `/login`). Dùng lại luồng deep-link đã có (`MessagesPage` consume `initOtherUserId` → `createConversation`) — DRY.
- **Connection states:** `useChat` expose `connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'` (track qua `connect`/`disconnect` + Manager `socket.io.on('reconnect_attempt'|'error')`). `ChatThread` render banner trạng thái (helper thuần `chatConnection.ts` → text/tone, `null` khi connected).
- **Cleanup listeners:** cleanup effect giờ `socket.io.removeAllListeners()` + `socket.removeAllListeners()` trước `disconnect()`. `currentUserId` đọc qua `useRef` (không còn trong deps) → đổi account không re-subscribe (stale closure fix).
- **Dọn dead code:** xóa `src/features/product/ChatRoom.tsx` — mock chat cũ (dữ liệu giả, hardcoded hex, vi phạm styling).
- **Test:** `chatConnection.test.ts` (5 cases). `npm run build` pass. `ChatDialog.tsx` (popup inline) đã có nhưng chưa wire — để dành.

#### P1-06 follow-up — Chat metadata (lastMessage + unreadCount) tích hợp — DONE (2026-06-26)

Backend giao (handoff P1-06, 2026-06-26): `GET /chat/conversations` giờ trả mỗi conversation kèm `lastMessage` + `unreadCount` + `user1/2LastReadAt`, đã sort active-first; thêm `POST /chat/conversations/:id/read` reset unread của viewer.

- **Types** (`types/chat.ts`): `Conversation` thêm `user1LastReadAt`/`user2LastReadAt`/`lastMessage: ConversationLastMessage | null`/`unreadCount`. Type mới `ConversationLastMessage`.
- **API**: `api.chat.markConversationRead(id)` → `POST /chat/conversations/:id/read`.
- **Bỏ hack localStorage**: `useConversations` xóa hẳn activity-map (`tb:chat:activity`, `STALE_KEY`/`STALE_MS`, `readActivityMap`/`markActivity`) + sort/staleness client-side — server đã sort active-first + trả metadata thật. Giờ chỉ `return data ?? []`.
- **Helper thuần + test** (`chatConversations.ts` + `.test.ts`, 11 case): `conversationActivityTime`/`sortByActivity` (active-first), `applyIncomingMessage` (cập nhật `lastMessage`, bump `unreadCount` cho inbound ở thread không active, giữ 0 cho thread đang mở, không bump outbound, re-sort), `markConversationReadInList` (zero badge optimistic).
- **Socket** (`useChat`): `new_message` dùng `applyIncomingMessage` thay vì set field `updatedAt` không tồn tại; bỏ `markActivity`.
- **`useMarkConversationRead`** (mutation, optimistic zero badge qua `markConversationReadInList`).
- **`MessagesPage`**: preview render `lastMessage.content` (prefix "Bạn: " khi tự gửi, fallback "Bắt đầu cuộc trò chuyện") thay vì `@username`; badge `unreadCount` (pattern `bg-tb-gradient` như `NotificationBell`); tên + preview in đậm khi có unread; thời gian theo `lastMessage.createdAt ?? createdAt`; click thread → `markConversationRead(id)`.
- **Test:** full suite **126 unit tests pass** (22 files); `build` + `lint` (0 errors) xanh.
- Còn nợ runtime: E2E 2 tài khoản (open → send → receive → unread badge → mark read → reconnect).

#### ready-to-ship now gates on a real GHN waybill — failure surfaced to seller — DONE (2026-06-29)

Backend giao (handoff NEW, 2026-06-28): `PATCH /api/order/:id/ready-to-ship` giờ resolve free-text shipping address → GHN IDs và **tạo waybill trước** khi advance. Thành công → `200`, order `processing` với `ghnOrderCode` non-null thật. Address không resolve được → `400`, order **giữ `confirmed`**. GHN unreachable → `500`, giữ `confirmed`.

- **FE action #1 (render `ghnOrderCode`)**: đã sẵn — `SellerOrdersPage` render mã GHN ở cả card row + detail block (`order.ghnOrderCode`), không cần đổi code, chỉ bỏ giả định field luôn null.
- **FE action #2 (surface failure)**: ready-to-ship/confirm không còn nuốt lỗi vào `console.error`. Helper thuần `sellerOrderActionError.ts` (`sellerOrderActionErrorMessage(error, kind)`) map status → message tiếng Việt: ready-to-ship `400` → "địa chỉ giao hàng không hợp lệ…", `500` → "không kết nối được GHN, đơn vẫn ở trạng thái đã xác nhận…"; fallback dùng server message rồi generic theo `kind`. `SellerOrdersPage` derive `actionError` từ mutation nào đang `isError` (kèm `variables` = order id) và render banner `#id · message` dưới banner lỗi list.
- **Test:** `sellerOrderActionError.test.ts` (7 case, ready-to-ship 400/500/fallback/server-message + confirm không áp mapping 400). `build` (tsc + vite) xanh.
- Còn nợ runtime: full-stack E2E (seller bấm "Sẵn sàng giao" với address xấu → 400 + banner; address tốt → `ghnOrderCode` hiện).

## P2

### P2-06 — Batch product endpoint resilience (FE mitigation) — DONE (2026-06-25)

- **Vấn đề:** `POST /products/with-inventory/multiple` trả `404 "Product not found"` nếu BẤT KỲ id nào trong batch đã bị xóa → giết cả response, blank toàn bộ hydrate. Order pages đã thoát phụ thuộc (P1-02); cart pages (`CartDrawer`/`CartPage`/`CheckoutPage`) vẫn hydrate qua `useProductsByIds` → 1 product đã xóa trong giỏ làm hỏng toàn bộ.
- **Fix tại API layer (DRY, cover hết 5 consumer):** `src/lib/fetchBatchTolerant.ts` — happy path vẫn 1 request batch; chỉ khi batch ném `404` mới fan-out per-id (`Promise.allSettled`) và giữ lại các id resolve được, drop id thiếu. Lỗi non-404 vẫn propagate để React Query surface/retry. `api.products.getMultipleWithInventory` bọc qua helper này (inject `fetchBatch` + `fetchOne` để test).
- **Test:** `fetchBatchTolerant.test.ts` (4 cases: happy-path không fan-out, empty ids → `[]`, 404 → fan-out drop id thiếu, non-404 rethrow). Full suite **19 files / 107 tests pass**; `build`/`lint` (0 errors) xanh.
- Còn nợ phía backend: endpoint nên skip id thiếu trả mảng partial thay vì 404 (khi đó FE fan-out thành no-op, vẫn an toàn).

### P2-01 — Responsive baseline — DONE (2026-06-24)

- **Checkout** (`CheckoutPage.tsx`): grid `grid-cols-[1fr_380px]` → `grid-cols-1 lg:grid-cols-[1fr_380px]`; summary chỉ `lg:sticky`; padding `px-4 sm:px-6`. Product row `flex-wrap` + info `min-w-[120px]` + controls `ml-auto` (đã verify hết overflow ở 360px: `scrollWidth === clientWidth`).
- **Login** (`LoginPage.tsx`): `grid-cols-[1.1fr_1fr]` → `grid-cols-1 md:grid-cols-[1.1fr_1fr]`; form padding `px-6 py-12 md:px-[64px] md:py-[60px]`.
- **Header** (`Header.tsx`): search `w-[520px] hidden sm:block` → `hidden md:block flex-1 max-w-[520px]`; nút "Tạo bài viết" thu gọn còn icon `<` sm.
- **Mobile navigation:** thêm `src/components/layout/MobileNav.tsx` — bottom tab bar `md:hidden fixed bottom-0` (Bảng tin/Chợ/Thông báo/Đơn hàng/Cá nhân), mount trong `AppShell`. DRY: tách nav list ra `src/components/layout/navItems.ts` (`getPrimaryNavItems`); `LeftRail` dùng chung.
- **Verify runtime (Chrome DevTools, seller `test1`):** 360×800 + 768×1024 đạt. `npm run build` pass.

### P2-02 — Cart/order image fallback — DONE (FE) (2026-06-24)

- **Root cause:** `CartPage`/`CartDrawer` render `<img src={imageUrl}>` không guard, `imageUrl` fallback `''` → `<img src="">` (request rác + vỡ layout). Các nơi khác tự chế fallback khác icon (🛍️/`ShoppingCart`/`Package`/`Package2`) → vi phạm DRY.
- **Fix — shared component:** thêm `src/components/shared/ProductThumb.tsx` (+ test, 4 cases): không bao giờ `<img src="">`; có `src` → `<img object-cover>`, không có → icon `Package` trong `grid place-items-center`. Optional prop `to` → render `<Link>`.
- **Migrate 7 call site:** `CartPage`, `CartDrawer`, `CheckoutPage`, `ProductChip`, `ShopPage`, `OrderHistoryPage`, `OrderDetailPage`. `ProductCard` giữ inline (badge overlay tuyệt đối). `npm run build` pass.

#### P2-02 follow-up — backend order snapshot tích hợp — DONE (2026-06-26)

Backend persist snapshot purchase-time của product image + SKU label cho order item (handoff P2-02, 2026-06-26); response shape không đổi — `item.image`/`item.skuLabel` giờ backed bởi snapshot thay vì live lookup, order cũ render đúng dù product bị sửa/xóa.

- **FE không cần đổi hành vi:** order pages đã đọc decorated `item.image`/`item.skuLabel`/`item.productName` từ P1-02; `useProductsByIds` đã gỡ khỏi mọi order page (chỉ social attachment còn dùng).
- Chỉ refresh 2 comment type trong `src/types/order.ts` (`OrderItem.image`, `SellerOrderItemDetail.image`) từ "realtime" → "purchase-time snapshot" cho đúng semantics. Đóng note "còn nợ backend" của P2-02 dưới P1-02.

### P2-03 — Auth completeness — DONE (2026-06-25)

- **Quyết định: disable + "sắp ra mắt"** (không implement). Backend chỉ có `login/register/logout/me`.
- **`LoginPage` gỡ control chết:** remember-me checkbox (state set nhưng không gửi → xoá state), "Quên mật khẩu?", 2 nút OAuth Google/Facebook đều `disabled` + `aria-disabled` + `title="Tính năng sắp ra mắt"` + style mờ; thêm nhãn "(sắp ra mắt)" + caption. Hằng `COMING_SOON_TITLE` dùng chung.
- **401 redirect — extract + test:** logic trong `request()` tách `src/api/unauthorized.ts` (`shouldRedirectToLogin`/`buildLoginRedirect`, pure) + test `unauthorized.test.ts` (10 cases).
- **Role boundary tests:** `src/lib/roleAccess.test.ts` (P2-04) phủ logic guard.
- **Register E2E:** cần RTL (chưa cài — P3-01); flow register→auto-login để lại cho khi test infra có.
- `npm run build` pass; 25/25 test pass (unauthorized 10 + roleAccess 15) qua node-env config tạm.

### P2-04 — Admin completion — DONE (2026-06-25)

- **Backend đã hoàn tất** approval flow Phase 1/2/2b/2c (pending list, review+note, notification tới seller, product lock/unlock). FE approve/reject UI (`PendingBrandsPage`/`PendingCategoriesPage`) đã wire `api.products.reviewBrand|reviewCategory(id, {action, note})` + invalidate + toast — khớp contract.
- **Fix nav gating:** admin trước đây thấy seller nav vì 3 nơi OR nhầm `isSeller || isAdmin`. Seller capability = role `shop`, admin KHÔNG phải seller → gate seller nav/route bằng `isSeller`.
- **DRY + testable:** extract `src/lib/roleAccess.ts` (`canSell`/`canAdminister`/`roleSatisfies`) single source of truth + test `roleAccess.test.ts` (15 cases). `useRole` + `ProtectedRoute` dùng helper; `LeftRail`/`ProfileMenu` gate seller block bằng `isSeller`. LeftRail admin block thêm divider.
- `npm run build` pass; 15/15 test pass.
- **Đề xuất DRY (chưa làm, cần xác nhận):** `PendingBrandsPage` + `PendingCategoriesPage` gần trùng 100% → nên extract `PendingReviewTable` (shared) nhận `items`/`reviewFn`/labels.

### P2-05 — Pagination 10/page nhất quán — DONE (phần API đã hỗ trợ) (2026-06-25)

> Mục tiêu: mọi list page phân trang 10 item/trang, NGOẠI TRỪ `/marketplace` (12/trang theo grid). Component chung `src/components/shared/Pagination.tsx`; helper `getPageItems` ở `src/lib/pagination.ts` + test.

- **`SellerOrdersPage`** (`/sell/orders`): `LIMIT` 20 → 10; `<Pagination>` thay block prev/next inline.
- **`ProfilePage`** tab Bài viết + Sản phẩm: page state (reset khi đổi `userId`), `getPostsByUser(userId, page, 10)` + `useProducts({ userId, page, limit: 10 })`; label tab đếm theo `total` server; `<Pagination>`. `queryKeys.social.postsByUser` thêm `page`.
- **`NotificationsPage`** (`/notifications`): `useNotifications(page)` parameterize, limit 50 → 10; `markRead` optimistic target đúng cache trang hiện tại; `<Pagination>`.
- **`MarketplacePage`**: migrate sang `<Pagination>` dùng chung, GIỮ `limit: 12` (ngoại lệ).

#### P2-05 follow-up — backend pagination/stat endpoints tích hợp — DONE (2026-06-26)

Backend giao 3 endpoint additive (handoff P2-05, 2026-06-26). FE đã chuyển khỏi các fallback `limit` cao / tính client-side:

- **Admin Users → `GET /user?page=&limit=`** (`api.users.getPaginated`, `PaginatedResponse<User>`). `AdminPage` đổi từ `users.getAll()` (`/user/all`) sang paginated (20/trang): query key `[...users.all, page, limit]`, state `usersPage`, card "Tổng người dùng" đọc `total` server (không còn `users.length` của 1 trang), thêm prev/next + "Trang x / y". `getAll()` giữ lại cho consumer khác.
- **Shop stats → `GET /products/shop/stats`** (`api.products.getShopStats` → `{ productCount, totalStock, lowStockCount }`, query key `products.shopStats`). `ShopPage` 3 stat card đọc số toàn shop từ endpoint, fallback về aggregation client-side (`products.length`/reduce/filter) khi đang load → số đúng cả khi danh sách phân trang, không chỉ trang hiện tại.
- **Notifications badge → `GET /notifications/unread-count`** (`api.notifications.getUnreadCount` → `{ unreadCount }`, query key `notifications.unreadCount`). `useNotifications` badge đọc count toàn cục thay vì đếm `!isRead` trên trang đã load. `markRead` optimistic decrement count cache (chỉ khi item đang unread) + rollback on error; socket realtime increment count khi insert thật (dedup qua `didInsert`).
- **Test:** `didInsert` helper (pure, `notificationCache.ts`) + 3 case trong `notificationCache.test.ts`. Full suite **118 unit tests pass**; `build` + `lint` (0 errors) xanh.

#### P2-06 follow-up — backend tolerant batch endpoint — DONE (2026-06-26)

Backend fix `POST /products/with-inventory/multiple`: skip id thiếu trả mảng partial (+ `inventory: null` khi inventory service down) thay vì 404 toàn batch. FE giữ `fetchBatchTolerant` làm safety net (fan-out giờ no-op trên happy path); cập nhật comment ở `api.products.getMultipleWithInventory`.

### P3-01 — Quality gates (phần đã làm) (2026-06-25)

- `npm run build` pass.
- `globalIgnores` thêm `design_handoff_trybuy_ui` → `npm run lint` sạch (exit 0, từ 370 lỗi → 0). Scripts `typecheck`/`lint`/`test:run` đã có trong `package.json`. Gate lint dùng được ngay (hiện chỉ phủ js/jsx).
- Test infra files đã có (`vite.config.ts` test block, `src/test/setup.ts`, `src/test/msw/`, `renderWithProviders`) + test colocate (`sku.test.ts`, `orderSummary.test.ts`, `sellerOrderActions.test.ts`, `utils.test.ts`, `ProductCard.test.tsx`).

> Còn lại (xem `snapshot.md`): `typescript-eslint` dep (lint TS/TSX) + cài dev deps test (vitest/jsdom/RTL/msw) — cả hai chặn bởi `npm install`.

## Flows đã chạy pass trong runtime audit

- Login/logout bằng user, shop và admin. Role routes `/sell`, `/sell/orders`, `/admin`.
- Marketplace load products/categories/brands. Server cart page + checkout selection.
- COD: shipping fee → create order → clear cart → order history. Buyer order detail + cancel.
- Cloudinary upload + create product. Social create post tại feed.
- Seller order list/filter/confirm mutation. Admin dashboard + pending brand/category pages.
- Chat/notification WebSocket handshake khi FE dùng origin `http://localhost:5173`. Production build.

> Pass ở đây chỉ xác nhận happy-path đã chạy; không xóa backlog về consistency/retry/responsive/UX.

## Dữ liệu test đã tạo/thay đổi (audit 2026-06-19)

- Product `#16 — E2E Bottle 20260619`, bị stock `0` do inventory conflict.
- Post `E2E social smoke test 20260619`.
- Order `#97`, đã cancel sau xác nhận flow.
- Seller order `#4`, đã chuyển qua confirm + ready-to-ship, trạng thái cuối quan sát `processing`.
