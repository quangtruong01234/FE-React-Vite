# Domain Rules — order · return/refund · voucher · payment · roles

> On-demand. Load khi task đụng **nghiệp vụ**: order state, trả hàng/hoàn tiền, voucher,
> thanh toán/idempotency, hoặc "role nào thấy gì".
> Không load cho task styling / data-fetching thuần.
>
> Đây là loại kiến thức **không suy ra được từ code trong một lần đọc** — nó nằm rải ở
> `features/order/`, `features/cart/`, `lib/domain/`, `lib/auth/`. Mọi khẳng định dưới đây
> verify từ code thật ngày **2026-08-04**; mỗi mục ghi kèm file sở hữu sự thật đó.
> Khi sửa logic, **sửa ở file sở hữu** rồi cập nhật file này — đừng fork rule sang chỗ khác.

---

## 1 · Order state machine

**9 status** — `src/types/order.ts` (`OrderStatus`):
`pending` · `confirmed` · `processing` · `shipped` · `delivering` · `completed` · `canceled` ·
`return_requested` · `refunded`

**Per-status facts** (label, badge, nhóm filter) — `src/lib/domain/orderStatus.ts`,
`ORDER_STATUS_META`. Đây là **nguồn duy nhất**; đừng hardcode label/màu status ở component.

| Nhóm | Status | Dùng ở |
|---|---|---|
| `isActive` (đang chạy) | pending, confirmed, processing, shipped, delivering | tab buyer "Đang xử lý" |
| `isReturn` | return_requested, refunded | tab buyer "Trả hàng/Hoàn tiền" |
| terminal, không thuộc nhóm nào | completed, canceled | — |

### Ai đẩy được transition nào

**Seller** — `src/features/order/sellerOrderActions.ts` (single source of truth):

| Từ | Action | Sang |
|---|---|---|
| `pending` | `confirm` — "Xác nhận đơn" (`PATCH /order/:id/confirm`) | `confirmed` |
| `confirmed` | `ready-to-ship` — "Sẵn sàng giao" (giao kiện cho GHN) | `processing` |

Status **sau** `confirmed` không expose action nào cho seller. Trách nhiệm seller dừng ở
carrier hand-off (kiểu Shopee): `shipped → delivering → completed` do **webhook GHN** đẩy, và
GHN cũng là nguồn duy nhất của `ghnOrderCode`. Cho seller bấm tay qua các bước đó sẽ nhảy
status mà không có vận đơn → lệch với hãng vận chuyển.

**Buyer** — `src/features/order/OrderDetailPage.tsx`:

- **Huỷ đơn**: chỉ khi status ∈ {`pending`, `confirmed`, `processing`} (`canCancel`, dòng 135).
- **Thanh toán lại** ("Thanh toán ngay"): status ∈ {`pending`, `confirmed`} **và**
  `paymentMethod !== 'cod'` (`needsPayment`, dòng 137).
- **Đánh giá sản phẩm**: chỉ khi order `completed` (dòng 305).

> ⚠️ **Gap đã biết:** comment ở `sellerOrderActions.ts` nói `completed` đạt được khi "buyer
> confirms receipt (or auto-complete)", nhưng **FE không có nút buyer xác nhận đã nhận hàng**.
> `useConfirmOrder` (`/order/:id/confirm`) là action **của seller**, chỉ dùng ở
> `SellerOrdersPage.tsx`. Đừng nhầm hai cái này. Nếu cần buyer-confirm thì đó là việc mới,
> chưa có endpoint FE nào gọi.

---

## 2 · Return / refund (F2, id `rr_`)

Sở hữu: `src/features/order/returnRequest.ts` · types ở `src/types/order.ts`.

- **Mở được request khi** status ∈ {`delivering`, `completed`} (`canRequestReturn`). Backend
  từ chối mọi status khác bằng **400**.
- Tạo request → order lật sang `return_requested`. Nên "status hợp lệ" đã tự hàm ý "chưa có
  request đang chờ" — không cần check riêng.
- Request bị **rejected** → order khôi phục về `previousOrderStatus`, và **được request lại**.
- `ReturnRequestStatus`: `pending_review` → `approved` | `rejected`.
- `RefundStatus` (chỉ có khi `approved`): `refunded` (phương thức online, settle ngay) ·
  `manual_pending` (COD, operator xử lý tay).
- Danh sách `/return-requests/mine` sort **mới nhất trước** → phần tử match đầu tiên là request
  hiện hành của order đó (`findReturnRequestForOrder`).
- Màn hình: buyer `/returns` (`ReturnRequestsPage`) · seller `/sell/returns`
  (`SellerReturnRequestsPage`).

---

## 3 · Voucher (F3)

Sở hữu: `src/features/cart/voucher.ts`.

- **Hai bước tách biệt:** `POST /order/voucher/validate` chỉ **preview** (không redeem);
  `POST /order` nhận `voucherCode` optional và mới thực sự dùng mã.
- Mã **case-insensitive** — normalize uppercase trước khi gửi/so sánh (`normalizeVoucherCode`).
- **Chỉ áp dụng cho giỏ một seller.** Giỏ nhiều seller + có mã → **400**. Đếm seller bằng
  `distinctSellerCount`, **bỏ qua** item chưa load xong product (seller `undefined`) — nếu
  không, guard sẽ bật/tắt loạn giữa lúc load.
- **Thứ tự tính tiền** (mirror backend, `discountedGrandTotal`):
  `total = max(0, itemsTotal − discount) + shippingFee`
  → discount **không** ăn vào phí ship; clamp ở 0 xảy ra **trước** khi cộng ship.
- Trên `Order`: `total` đã trừ discount sẵn; `discountAmount` có thể về dạng **string decimal**
  (`"50000.00"`) ở response cũ → luôn `Number()` trước khi tính.
- Lỗi: **404** = mã không tồn tại/đã vô hiệu. **400** = bị từ chối, phân loại theo keyword
  trong message backend (`expired` · `not started` · `min` · `per-user`/`already` · `usage`/
  `limit` · `seller`/`multi`) — xem `voucherErrorMessage`.

### Voucher console (F3-ADMIN)

Sở hữu: `src/features/voucher/` — `voucherRules.ts` + `voucherRules.schema.ts` (luật thuần),
`VoucherConsole.tsx` (màn hình), `voucherConsoleBinding.ts` (endpoint + query key + copy theo
role). Hai trang chỉ là vỏ: `/admin/vouchers` (`features/admin/AdminVouchersPage`) và
`/sell/vouchers` (`features/shop/SellerVouchersPage`).

- **Một màn hình, hai role.** Luật y hệt nhau ở cả hai phía nên `VoucherConsole` **không bao
  giờ** rẽ nhánh theo role — mọi khác biệt nằm trong binding. Thêm luật mới thì sửa
  `voucherRules.ts` (dùng chung), đổi URL/copy thì sửa binding.
  - admin (`/order/admin/vouchers…`): toàn sàn, sửa được mọi mã.
  - shop (`/order/vouchers`, `/order/vouchers/mine`, `…/:id/deactivate`, `…/:id`): **chỉ mã của
    chính mình**, quyền sở hữu lấy từ cookie. Gửi kèm `sellerId` là **400
    `SELLER_NOT_ASSIGNABLE`** — `buildCreateVoucherDto` vốn không phát field đó, đừng thêm.
  - **403 ở route shop mơ hồ có chủ đích**: hoặc sai role, hoặc mã của shop khác, backend cố ý
    không nói rõ cái nào ⇒ copy phải phủ cả hai (`SELLER_VOUCHER_BINDING.copy.forbidden`).
- **4 thao tác:** tạo (409 nếu trùng mã) · list (mới nhất trước) · `…/:id/deactivate` ·
  `PATCH …/:id` (sửa; `{ isActive: true }` chính là **bật lại**, không có endpoint riêng).
  UI phải `window.confirm` trước khi tắt.
- **Sửa là partial PATCH:** vắng key = giữ nguyên · `null` = xoá · `{}` = no-op.
  `code`/`discountType`/`discountValue`/`sellerId` **bất biến** — gửi là 400 `property … should
  not exist`, nên form khoá `readOnly` ở chế độ sửa. Mã đã có người dùng (`usedCount > 0`) chỉ
  được **nới lỏng**, và nới lỏng **không đi ngược lại được** ⇒ confirm trước khi gửi
  (`voucherLooseningConfirm`).
- **`minOrderAmount` không bao giờ được gửi `null`** — cột `NOT NULL DEFAULT 0`, `null` ra
  **500** chứ không phải 400. Xoá ô ⇒ gửi `0` (`diffMinOrderAmount`).
- `voucher.id` là **số nguyên auto-increment**, không phải public id `xxx_` — route deactivate
  nhận số. Đừng đổi sang string id.
- Query key hai console phải **rời nhau** và **không** nằm dưới `queryKeys.orders.seller` (đó là
  prefix invalidate của *đơn* bán) — `["orders","vouchers","mine"]`, có test chốt.
- **Field optional phải bỏ hẳn key**, không gửi `null`: backend đọc key thiếu là "không giới
  hạn"/"không có window", còn `null` rớt class-validator → **400**. `buildCreateVoucherDto`
  lo việc này; `maxDiscountAmount` cũng bị bỏ khi voucher là `fixed`.
- Form giữ mọi field số/ngày ở dạng **string** (`voucherFormSchema`) — coerce sớm sẽ biến ô
  trống thành `0`, tức là "giới hạn 0 lượt" thay vì "không giới hạn".
- `datetime-local` không có timezone → `localInputToIso` đọc theo giờ máy admin rồi đổi ra ISO UTC.
- Trạng thái hiển thị (`voucherStatusMeta`) theo thứ tự ưu tiên: `inactive` → `expired` →
  `used_up` → `scheduled` → `active`. Mã đã tắt luôn báo "Đã tắt" kể cả khi cũng đã hết hạn,
  vì đó mới là trạng thái admin tác động được.

---

## 4 · Payment · cart consumption · idempotency

### Cart chỉ bị consume SAU khi thanh toán thành công (P0-04)

Đây là luật quan trọng nhất của luồng checkout:

1. Checkout tạo order → lưu `PendingCheckout` vào **`sessionStorage`**
   (`src/features/cart/pendingCheckout.ts`): `{ orderIds, cartItemIds, clearAll }`.
2. Redirect sang cổng thanh toán — **giỏ vẫn nguyên**.
3. Chỉ khi `PaymentResultPage` xác nhận success mới xoá đúng những item đó
   (`clearAll` → clear cart, ngược lại remove từng `cartItemIds`), rồi
   `clearPendingCheckout()`.
4. Thanh toán fail/cancel không bao giờ tới bước 3 → giỏ còn nguyên để retry.

`sessionStorage` là cố ý: cổng trả về **cùng tab** nên record sống qua round-trip cross-origin,
mà không rò sang tab khác hay session sau.

### Idempotency (P0-04)

`src/features/cart/idempotency.ts`:

- **Signature** = `productId:skuId:quantity` của từng dòng, **sort** rồi join `|` → độc lập với
  thứ tự mảng.
- `Idempotency-Key` random được **giữ nguyên** khi signature không đổi (double-submit / retry
  mạng replay đúng order cũ, không tạo đơn trùng), và **sinh mới** khi giỏ đổi nội dung (giỏ
  khác về bản chất = đơn logic mới).

### Payment URL

`src/lib/domain/paymentUrl.ts`:

- Cổng sinh `orderUrl` **bất đồng bộ** → endpoint `payment-url` của order vừa tạo có thể trả
  `orderUrl: null` trong chốc lát. `resolvePaymentUrl` poll mặc định **4 lần × 800 ms** rồi mới
  ném lỗi. Order cũ đã có URL nên resolve ngay lần đầu, không tốn delay.
- `redirectToPaymentGateway(url)` là **chỗ duy nhất được dùng `window.location`** trong repo —
  router (`useNavigate`) chỉ đi giữa route SPA, không đi cross-origin. Đừng viết
  `window.location` ở component/hook.

### Multi-seller checkout

`MultiSellerOrderResponse` (`src/types/order.ts`): gateway **tách giỏ thành N order** và
pre-initiate **một** payment phủ hết. `CreateOrderResponse = Order | MultiSellerOrderResponse`
→ luôn narrow trước khi đọc `.id`.

### `order` trong return URL của cổng thanh toán

Cổng redirect về `/payment-result?order=…&method=…`, và `order=` hiện là **id nội bộ dạng số**
(`?order=111`), không phải public id — verify live 2026-08-04. `/order/111` thì `400` ở API, nên
**không được** dựng deep-link thẳng từ param đó.

`resolveResultOrderId()` (`src/features/payment/paymentResultParams.ts`) chỉ nhận
`/^ord_[0-9A-Za-z]{16}$/`; sai shape → coi như không có id → trang fallback `/orders`. Guard viết
theo shape đích nên ngày BE gửi `ord_…` là deep-link tự sống lại, không phải sửa FE.

> Ghi chú lịch sử: drift này từng được ghi ngược trong `snapshot.md` ("regex số **không khớp**
> `ord_`", tức id bị rơi). Thật ra regex **nhận** id số rồi ship một link chết. Chỉ đọc code FE
> thì ra kết luận ngược — phải bắn request thật. Xem `pitfalls.md` §5.

---

## 5 · Shipping fee (GHN)

Sở hữu: `src/features/cart/shippingFee.ts` · DTO ở `src/types/order.ts`.

- `shippingAddress` gửi GHN là chuỗi **pipe-delimited**:
  `"name|phone|address|ward|district|province"`.
- Mỗi item gửi kèm `weight` (**gram**) lấy từ product. Product thiếu/`null` weight →
  `undefined` → backend dùng default của nó.
- **Đơn giá hiệu lực** (`effectiveUnitPrice`): giá của SKU khớp khi dòng có `skuId` *và* SKU đó
  tồn tại; ngược lại giá base của product. Money field có thể về dạng string → `Number()`.

## 6 · Stock check trước khi submit

`src/features/cart/checkoutItems.ts`:

- Dòng có `skuId` *và* product có SKU → tồn kho = `sku.stockQuantity`.
- Ngược lại → tồn kho = `product.inventory.availableStock`.
- Product **không có trong lần fetch tươi** → coi như **0**.
- `buildOrderItems` chỉ đính `skuId` khi dòng thực sự có — backend coi **key có mặt** là "đơn
  theo SKU" và validate theo tồn kho SKU.

---

## 7 · Ai thấy gì (role × màn hình)

Sở hữu: `src/lib/auth/roleAccess.ts` · guard ở `src/components/auth/ProtectedRoute.tsx` ·
bảng route ở `src/router.tsx`.

**Role là single-valued** (`me.role.name` — backend 2026-08-06 reshape `role` thành
`{ id, name, slug }`). Chỉ có hai capability:

- `canSell(role)` → **chỉ** `'shop'`
- `canAdminister(role)` → **chỉ** `'admin'`

> 🔴 **Admin KHÔNG phải seller.** Admin là platform operator. Admin không được thấy nav/tool của
> seller. Đừng viết `role === 'admin' || role === 'shop'` cho tính năng bán hàng.

| requiredRole | Route |
|---|---|
| `shop` | `/shop` · `/sell` · `/sell/:id` · `/sell/orders` · `/sell/returns` · `/shop/analytics` |
| `admin` | `/admin` · `/admin/brands/pending` · `/admin/categories/pending` · `/admin/reports` · `/admin/product-risk` · `/admin/analytics` |
| (không) | mọi route còn lại — chỉ cần đã đăng nhập |

`ProtectedRoute` gọi `api.auth.me()` (`GET /user/me`, `retry: false`): chưa login / lỗi →
`/login`; login rồi nhưng sai role → `/` (không phải trang 403).

### Field private của user

`src/types/user.ts`:

- `PublicUser` = `id` · `username` · `name` · `avatar` · `isActive`. Read công khai
  (`GET /user/:id`, seller/author decoration) **không** trả `email`/`role` — backend strip.
- Cần `email`/`role` của **chính mình** → `useAuthContext().currentUser` (nguồn `/user/me`).
  Đừng mong đọc được chúng từ profile người khác.

---

## 8 · Admin moderation

### Post reports (F5) — `src/features/admin/postModeration.ts`

| Action | Tác dụng lên report | Tác dụng lên post |
|---|---|---|
| `hide` | pending → **resolved** | ẩn khỏi feed |
| `unhide` | **không** mở lại report | hiện lại |
| `dismiss` | pending → **dismissed** | post vẫn hiển thị |
| `delete` | xoá hết report row | xoá post vĩnh viễn |

Action khả dụng (`moderationActionsFor`): `hide`/`unhide` toggle theo `post.isHidden` (luôn có
một trong hai) · `dismiss` **chỉ khi** `pendingCount > 0` · `delete` luôn có.
404 = post đã bị xoá → nhắc reload list; 403 = không đủ quyền.

**Report sống lâu hơn post — và hàng đợi cố tình giấu chúng đi** (REPORT-TOTAL-01, 2026-08-21).
Hai đường xoá post **không** giống nhau, đọc code BE mới thấy:

| Ai xoá | BE | Report row |
|---|---|---|
| **Admin**, nút *Xoá* ở `/admin/reports` | `adminDeletePost` — transaction `delete(PostReport)` rồi `remove(post)` | **xoá sạch** (đúng như bảng trên) |
| **Chính tác giả**, xoá bài của mình | `deletePost` — chỉ `remove(post)`, không FK, không cascade | **còn lại, thành mồ côi** |

Nên một người bị báo cáo **tự xoá bài trước khi moderator kịp xử lý** sẽ để lại report row trỏ
vào post không còn tồn tại. `GET /social/admin/reports` `INNER JOIN posts` ở **cả** câu đếm lẫn
câu phân trang để loại chúng ⇒ với FE, mồ côi là **vô hình**: không nằm trong `data`, không được
tính vào `total`. Hệ quả thực tế cần biết:

- Report có thể **biến mất khỏi tab *Chờ xử lý* mà không ai bấm gì** — tác giả xoá bài, thế thôi.
  Đây không phải bug, đừng đi truy "ai đã dismiss".
- `total` **thấp hơn** số row `post_reports` thật của status đó là **đúng thiết kế**. Đừng đối
  chiếu tay hai con số này rồi kết luận BE đếm sai.
- Row mồ côi vẫn nằm trong DB làm dấu vết kiểm duyệt của bài đã gỡ, chỉ là không với tới được
  qua HTTP.

### Product risk queue (AI-02) — `src/features/admin/productRisk.ts`

- **Điểm rủi ro là advisory** — không bao giờ chặn đăng bán hay tự gỡ listing. Queue chỉ là
  công cụ triage.
- Tier: `≥70` cao · `≥40` trung bình · `≥1` thấp · `0` không có cờ.
- Flag: `duplicate_image` (hamming distance ảnh) · `price_anomaly` (so trung vị danh mục) ·
  `similar_name`.
- `riskScoringStatus`: `pending` | `ready` | `failed`, kèm `riskScoringAttempts` /
  `riskNextRetryAt` / `riskLastError`. Chỉ `ready` mới không hiện badge trạng thái.
- Backfill **resumable** qua cursor — fold từng response `202` bằng `applyBackfillResult`.
- Feedback Confirm/Dismiss của moderator chỉ mở khi row có cờ `duplicate_image`.

---

## Liên quan

- Endpoint thô, query param, đủ field → `.ai/context/backend-api.md`
- Hợp đồng `api` object / `request()` → `.ai/api-reference.md`
- Query key + invalidate cho order → `.ai/context/data-fetching.md`,
  `src/lib/query/orderInvalidation.ts`
- Bức tranh sống + việc đang mở → `.ai/agent-handoff/snapshot.md`
