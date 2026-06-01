# UI/UX Task List — TryBuy

**Nguồn:** `design_handoff_trybuy_ui/` · **Ngày:** 2026-06-02
**Tham chiếu prototype:** `design_handoff_trybuy_ui/reference/TryBuy Prototype.html`
**Thứ tự làm:** Phase 0 → 1 → 3 → 4 → 2 → 5 → 6 → 7 → 8 → 9

---

## Phase 0 — Foundation & Fixes  🔴 BẮT BUỘC trước

> Chuẩn hoá nền tảng. Không làm phase sau khi phase này chưa build sạch.

- [ ] **`src/types/index.ts`** — Bổ sung `Order.status` đủ 6 giá trị: `'pending' | 'processing' | 'shipped' | 'delivering' | 'completed' | 'canceled'`
- [ ] **`src/types/index.ts`** — Thêm types: `Post`, `Comment`, `Notification`, `Conversation`, `Message`, `PaymentOption`, `HealthStatus`, `UploadSignature`
- [ ] **`src/api/index.ts`** — Thêm đầy đủ namespaces: `social`, `notifications`, `chat`, `payment`, `inventory`, `users`, `admin` (theo `context/backend-api.md`)
- [ ] **`src/hooks/queryKeys.ts`** — Thêm keys: `posts`, `comments`, `notifications`, `conversations`, `messages`, `me`, `users`
- [ ] **`src/components/ui/StatusBadge.tsx`** *(mới)* — Map 6 trạng thái đơn → màu badge (`pending`→amber, `processing`→cyan, `shipped`→violet, `delivering`→blue, `completed`→green, `canceled`→red). Ref: `reference/app/ui.jsx` → `STATUS_BADGE`
- [ ] **`src/hooks/useRole.ts`** *(mới)* — `useQuery` GET `/api/user/me` → trả `{ me, role, isSeller, isAdmin }`. `isSeller = me.id` khớp sản phẩm hoặc do API xác định.
- [ ] **Verify:** `npm run build` sạch; đặt 1 đơn COD thật thành công (payload có `payment_method` + `shipping_address`)

---

## Phase 1 — Social Feed (thay Home)

> `/` chuyển từ lưới sản phẩm sang feed bài viết thật. Ref: `reference/app/feed.jsx`

- [ ] **`src/features/social/FeedPage.tsx`** *(mới)* — Composer soạn bài + tabs (Dành cho bạn / Đang theo dõi) + danh sách `PostCard` phân trang (scroll-paginate)
- [ ] **`src/features/social/PostCard.tsx`** *(mới)* — Header tác giả (avatar + tên + thời gian), nội dung text, ảnh grid, hàng `ProductChip`, hàng action (Like / Comment / Share với số đếm thật)
- [ ] **`src/features/social/ProductChip.tsx`** *(mới)* — Chip sản phẩm gắn trong post: ảnh thumbnail + tên + giá + nút "Mua nhanh" (thêm vào giỏ)
- [ ] **`src/features/social/CreatePostModal.tsx`** *(mới)* — Soạn bài, đính ảnh (Cloudinary), gắn sản phẩm theo tên/SKU; `POST /api/social/posts`
- [ ] **`src/features/social/useFeed.ts`** *(mới)* — `useInfiniteQuery` `GET /api/social/posts`; mutation `likePost`/`unlikePost` với optimistic update `likeCount`
- [ ] **`src/router.tsx`** *(sửa)* — Route `index` → `FeedPage`; chuyển lưới sản phẩm cũ sang `/marketplace`
- [ ] **Verify:** Feed tải post phân trang; like cập nhật optimistic; bài mới tạo hiện đầu feed

---

## Phase 2 — Post Detail + Comment lồng nhau

> `/post/:id` cây comment → reply đệ quy. Ref: `reference/app/feed.jsx` (`PostDetailPage`, `CommentNode`)

- [ ] **`src/features/social/PostDetailPage.tsx`** *(mới)* — Header post đầy đủ + nội dung + ảnh + hàng action + section bình luận
- [ ] **`src/features/social/CommentNode.tsx`** *(mới)* — Đệ quy render reply; ô trả lời inline; nút xoá (chỉ chủ comment); load thêm replies theo depth
- [ ] **`src/features/social/useComments.ts`** *(mới)* — `useQuery` comments + replies; mutation `createComment`, `createReply`, `deleteComment`
- [ ] **`src/router.tsx`** *(sửa)* — Thêm route `/post/:id`
- [ ] **Verify:** Xem post, bình luận, reply lồng nhau; `reply_count` đúng; xoá comment của mình

---

## Phase 3 — Marketplace + Tìm kiếm / Lọc

> `/marketplace` tách riêng. Sửa ô search readOnly. Bỏ `Math.random()`. Ref: `reference/app/marketplace.jsx`

- [ ] **`src/features/product/MarketplacePage.tsx`** *(mới)* — Sidebar filter (category / brand / giá min-max) + lưới `ProductCard` + sort + phân trang `hasNext`
- [ ] **`src/features/product/ProductCard.tsx`** *(mới)* — Ảnh, tên, giá, badge brand, nút "Thêm vào giỏ"; không có nút Like/Comment giả
- [ ] **`src/features/product/useProducts.ts`** *(sửa từ `useProduct.ts`)* — Nhận params `{ search, categoryId, brandId, minPrice, maxPrice, sortBy, sortOrder, page }`; xoá `Math.random()` (likes/comments/online); dùng count thật từ API
- [ ] **Header search** — Nối ô tìm kiếm trong `Header.tsx` → điều hướng `/marketplace?search=...`; bỏ `readOnly`
- [ ] **`src/router.tsx`** *(sửa)* — Thêm route `/marketplace`
- [ ] **Verify:** Gõ search → kết quả; lọc/sort gọi API; phân trang `hasNext` hoạt động

---

## Phase 4 — App Shell chung + Commerce hoàn chỉnh

> Header/nav dùng chung theo vai trò. Đóng kín vòng đời đơn hàng. Ref: `reference/app/shell.jsx`, `commerce.jsx`

### Shell layout
- [ ] **`src/components/layout/AppShell.tsx`** *(mới)* — Wrapper `min-h-screen bg-canvas-base`; grid `md:[210px_1fr] lg:[210px_1fr_300px]` (rightRail optional)
- [ ] **`src/components/layout/Header.tsx`** *(mới)* — Logo TryBuy, ô search (submit → `/marketplace?search=`), nút Tạo (dropdown post/product), icon Tin nhắn (badge unread), `NotificationBell`, icon Giỏ hàng (badge count), `ProfileMenu`
- [ ] **`src/components/layout/LeftRail.tsx`** *(mới)* — Nav: Bảng tin / Chợ sản phẩm / Tin nhắn / Thông báo (badge) / Đơn hàng / Trang cá nhân / Giỏ hàng; Kênh người bán (chỉ `isSeller || isAdmin`); Quản trị sàn (chỉ `isAdmin`)
- [ ] **`src/components/layout/RightRail.tsx`** *(mới)* — Seller nổi bật (verified users) + Đang hot (trending products)
- [ ] **`src/components/layout/NotificationBell.tsx`** *(mới)* — Dropdown 360px; badge gradient unread count; mark-read per item; link "Xem tất cả → `/notifications`"
- [ ] **`src/components/layout/ProfileMenu.tsx`** *(mới)* — Avatar → dropdown: Trang cá nhân / Đơn hàng / Kênh người bán / Quản trị sàn (theo role) / Đăng xuất

### Commerce
- [ ] **`src/features/cart/CheckoutPage.tsx`** *(sửa)* — Tải payment options động từ `GET /api/payment/options` (bỏ hardcode `card/momo/bank`); hiện đúng `zalopay/vnpay/cod`; ô nhập `shipping_address`; gửi full payload `CreateOrderDto`
- [ ] **`src/features/order/OrderDetailPage.tsx`** *(mới)* — Timeline 6 bước trạng thái; mã GHN; nút **Hủy đơn** (`PATCH /:id/cancel`, chỉ `pending`/`processing`); nút **Tải hóa đơn PDF** (`GET /:id/invoice` → Blob download); nút **Thanh toán** (`GET /:id/payment-url` → redirect)
- [ ] **`src/features/order/PaymentResultPage.tsx`** *(mới)* — Landing page sau ZaloPay/VNPay; đọc query params từ `GET /api/gateway/payment-result`; hiển thị thành công/thất bại + link về đơn hàng
- [ ] **`src/features/order/OrderHistoryPage.tsx`** *(sửa)* — Card bấm vào → `/order/:id`; `StatusBadge` đủ 6 trạng thái; bỏ raw-await (đã xong Phase 0)
- [ ] **`src/router.tsx`** *(sửa)* — Thêm routes: `/order/:id`, `/payment-result`; bọc authenticated routes trong `AppShell`
- [ ] **Route guards** — `/admin` chỉ `isAdmin`; `/shop` chỉ `isSeller || isAdmin`; unauthenticated → `/login`
- [ ] **Verify:** Đặt đơn ZaloPay → landing → chi tiết đơn; hủy đơn `pending`; tải PDF; `StatusBadge` đúng màu

---

## Phase 5 — Notifications + Realtime

> Chuông + dropdown + trang `/notifications`. Ref: `reference/app/shell.jsx` (`NotificationBell`), `social.jsx` (`NotificationsPage`)

- [ ] **`src/features/notification/NotificationsPage.tsx`** *(mới)* — Danh sách phân trang; nhóm theo ngày; click → navigate đến đơn hàng liên quan; nút "Đọc tất cả"
- [ ] **`src/features/notification/useNotifications.ts`** *(mới)* — `useQuery` `GET /api/notifications`; mutation `markRead(id)`; socket.io `ws://localhost:3010` (`withCredentials: true`) → sự kiện `notification` → append cache + tăng badge
- [ ] **`NotificationBell`** (từ Phase 4) nối `useNotifications` thay dữ liệu mock
- [ ] **Verify:** Danh sách phân trang; đánh dấu đã đọc; thông báo mới push realtime, badge tăng

---

## Phase 6 — Chat / Messaging (WebSocket)

> `/messages` 2 cột: list hội thoại + khung chat realtime. Ref: `reference/app/social.jsx` (`MessagesPage`, `ChatThread`)

- [ ] **`src/features/chat/MessagesPage.tsx`** *(mới)* — Layout 2 cột (`[300px_1fr]`); mobile: 1 cột; list hội thoại bên trái, `ChatThread` bên phải
- [ ] **`src/features/chat/ChatThread.tsx`** *(mới)* — Bong bóng tin (trái/phải theo `senderId`); input gửi tin; scroll to bottom khi có tin mới
- [ ] **`src/features/chat/useChat.ts`** *(mới)* — `useQuery` conversations + messages; socket.io `ws://localhost:3011/chat` (`withCredentials`); `emit('join', conversationId)` khi mở thread; `emit('send_message', ...)` khi gửi; `on('new_message')` → append cache
- [ ] **`src/router.tsx`** *(sửa)* — Thêm route `/messages`
- [ ] **Verify:** Mở hội thoại; gửi/nhận tin realtime; preview tin cuối ở list conversations

---

## Phase 7 — Profile + Chỉnh sửa

> `/profile/:id` hồ sơ + tab Bài viết / Sản phẩm / Giới thiệu. Ref: `reference/app/social.jsx` (`ProfilePage`, `EditProfileModal`)

- [ ] **`src/features/user/ProfilePage.tsx`** *(mới)* — Cover + avatar + tên + bio + stats (bài viết, sản phẩm, người theo dõi); tab Bài viết (`PostCard` list) / Sản phẩm (lưới) / Giới thiệu; nút "Chỉnh sửa" chỉ hiện cho chủ tài khoản
- [ ] **`src/features/user/EditProfileModal.tsx`** *(mới)* — Form: name / email / avatar (upload Cloudinary); `PATCH /api/user/:id`; invalidate `queryKeys.users.detail(id)` + `queryKeys.auth.me`
- [ ] **`src/router.tsx`** *(sửa)* — Thêm route `/profile/:id`
- [ ] **Verify:** Xem hồ sơ bất kỳ; chủ tài khoản sửa được name/email/avatar; ảnh upload Cloudinary

---

## Phase 8 — Shop (Seller) Dashboard

> `/shop` kênh người bán — số liệu giới hạn `userId`. Ref: `reference/app/admin.jsx` (`ShopPage`)

- [ ] **`src/features/shop/ShopDashboard.tsx`** *(mới)* — Stats: doanh thu shop / đơn nhận / đang bán / sắp hết hàng; tabs: Sản phẩm / Đơn hàng / Tồn kho
- [ ] **`src/features/shop/MyProducts.tsx`** *(mới)* — Bảng sản phẩm của shop; nút Sửa / Xóa (`PATCH`/`DELETE /api/products/:id`); nút mở `CreateProductModal`
- [ ] **`src/features/shop/ShopOrders.tsx`** *(mới)* — Đơn hàng có chứa sản phẩm của shop; lọc theo trạng thái
- [ ] **`src/features/shop/ShopInventory.tsx`** *(mới)* — Tồn kho từng SKU; cảnh báo low-stock; nút chỉnh số lượng (`PUT /api/inventory/:id`)
- [ ] **`src/features/product/CreateProductModal.tsx`** *(sửa)* — Nối Cloudinary upload (`POST /api/upload/signature`); nối `POST /api/products` thật
- [ ] **Route guard** `/shop` — chỉ `isSeller || isAdmin` (từ `useRole`)
- [ ] **Verify:** Đăng/sửa/xoá sản phẩm; xem đơn & tồn kho riêng shop; cảnh báo low-stock hiển thị

---

## Phase 9 — Admin (Platform) Dashboard

> `/admin` quản trị toàn sàn. Ref: `reference/app/admin.jsx` (`AdminPage`)

- [ ] **`src/features/admin/AdminDashboard.tsx`** *(mới)* — Stats sàn: tổng doanh thu / tổng đơn / người dùng / cửa hàng; tabs: Đơn hàng / Người dùng / Taxonomy / Kiểm duyệt
- [ ] **`src/features/admin/AdminOrders.tsx`** *(mới)* — `GET /api/order/admin/orders` kèm buyer info; lọc theo trạng thái; `StatusBadge`
- [ ] **`src/features/admin/AdminUsers.tsx`** *(mới)* — `GET /api/user/all`; nhãn user/shop/admin theo `role`; nút khoá tài khoản (nếu API có `PATCH /user/:id`)
- [ ] **`src/features/admin/AdminTaxonomy.tsx`** *(mới)* — Quản lý category (`POST /api/products/categories`) + brand (`POST /api/products/brands`); danh sách + form tạo mới
- [ ] **`src/features/admin/AdminModeration.tsx`** *(mới)* — UI hàng chờ kiểm duyệt; nếu BE chưa có endpoint → hiển thị empty state + `// TODO: wire when moderation API is ready`
- [ ] **Route guard** `/admin` — chỉ `isAdmin` (từ `useRole`)
- [ ] **Verify:** Admin xem mọi đơn/người dùng; tạo category/brand; guard chặn non-admin

---

## Cross-cutting — áp dụng tất cả các màn

| Yêu cầu | Chi tiết |
|---|---|
| **Loading state** | Mỗi màn có skeleton khi `isLoading` — không dùng spinner tròn chung chung |
| **Empty state** | `EmptyState` component khi data `[]` — icon + tiêu đề + mô tả |
| **Error state** | Banner đỏ `bg-red-500/10 border-red-500/30` khi `isError`; hiện `error.message` |
| **Responsive** | Không dùng fixed-width `[260px]` không có breakpoint; Rail ẩn mobile (`hidden md:flex`) |
| **Icon** | Chỉ dùng `lucide-react`; không trộn emoji vào icon hệ thống |
| **Typography** | Tiêu đề trang: `font-display font-black uppercase`; giá tiền & mã: `font-mono`; nội dung: `font-body` |
| **Token** | Không dùng hex `[#...]` hoặc raw palette `text-gray-500`; dùng `tb-*` tokens |
| **Rating/count** | Không hardcode `"★ 4.9 · 1.2k"` — dùng `product.rating` & `ratingCount` thật; ẩn nếu = 0 |
| **Order total** | `Number(order.total)` trước khi tính — TypeORM trả DECIMAL dạng string |
| **Cloudinary** | Upload flow: `POST /api/upload/signature` → client upload thẳng Cloudinary (không qua BE) |
| **WS auth** | `withCredentials: true` — không truyền token thủ công |
| **tsc** | Chạy `npm run build` sau mỗi thay đổi; không mark done khi còn TS error |

---

## Trạng thái hiện tại (2026-06-02)

| Phase | Màn | Trạng thái |
|---|---|---|
| 0 | Foundation / Fixes | ✅ DONE (fix-first pass) — xem `snapshot.md` |
| 1 | Social Feed | 🔴 Chưa bắt đầu |
| 2 | Post Detail + Comments | 🔴 Chưa bắt đầu |
| 3 | Marketplace | 🔴 Chưa bắt đầu |
| 4 | App Shell + Commerce | 🔴 Chưa bắt đầu |
| 5 | Notifications | 🔴 Chưa bắt đầu |
| 6 | Chat / Messaging | 🔴 Chưa bắt đầu |
| 7 | Profile | 🔴 Chưa bắt đầu |
| 8 | Shop Dashboard | 🔴 Chưa bắt đầu |
| 9 | Admin Dashboard | 🔴 Chưa bắt đầu |

> Phase 0 types/api đã được chuẩn hoá trong fix-first pass (`PaginatedResponse`, `PaymentMethod`, `CreateOrderDto`, `useOrdersByUser`). Một số items của Phase 0 (StatusBadge, useRole, social/chat/notification namespaces trong api) vẫn cần tạo trước khi bắt đầu Phase 1.
