# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-07-12 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
> Keep this LEAN: only the live picture (overview, open/blocked work, known issues).
> Push finished work to `CHANGELOG.md` (same folder, not auto-loaded).
> Conventions/rules live in `.ai/context/` — do not duplicate them here.

## Overview

React 19 + Vite FE cho marketplace microservices. Khung đầy đủ: marketplace, cart,
checkout, order, seller, social, admin. **Tất cả P0 đã đóng phía FE** (cart source of
truth, SKU matching, payment/idempotency, edit-variation hydrate); P0-03 còn là FE
mitigation chờ backend transaction. Các điểm gãy mua hàng ban đầu (2026-06-19 audit)
đã vá — chi tiết từng item trong `CHANGELOG.md`.

**Production gate:** không release trước khi toàn bộ P0 đóng *và* có regression test
cho login → product → cart → checkout → payment/order. Test infra (P3-01) đã cài và
xanh (`lint`/`build`/`test:run`). Hiện chặn bởi: backend items bên dưới.

## Active Tasks — open / remaining

### Backend đã giao — FE cần tích hợp (2026-06-25) — TẤT CẢ ĐÃ TÍCH HỢP (2026-06-26)

> P0-03/P0-04/P0-05/P1-01/P1-03/P1-04: backend DONE + FE integration DONE. Chi tiết
> từng item (contract + code) → `CHANGELOG.md` (same folder). P1-03 (social↔commerce:
> product picker, `ProductChip`, edit/report post) và P1-04 (multi-category shop table
> + editor prefill) hoàn tất 2026-06-26; `build`/`lint`(0 err)/`test:run`(115) xanh.

### Backend handoff queue (`../.agent-local/frontend-handoff.md`) — tiến độ tích hợp

- **SEC-L3 · 409 duplicate brand/category proposal — FE DONE + runtime-verified
  (2026-07-12, /sweep).** BE nay 409 khi tên proposal trùng (case-insensitive, trimmed) row
  active *hoặc pending*. FE: helper thuần `proposalErrorMessage` (`features/product/
  product-form/proposalErrors.ts`, test 4) map 409 → "Thương hiệu/Danh mục này đã tồn tại
  hoặc đang chờ duyệt.", non-409 giữ message generic cũ; 2 catch block trong
  `BasicInfoSection` dùng helper. Client-side exact-match giữ làm UX; 409 chủ yếu bắt trùng
  pending row (FE không thấy trong list). Verified live: propose "SweepDupL3 1783" → 201,
  reload → propose lại → 409 → message đúng render. Chi tiết → `CHANGELOG.md`.
- **SEC-M8 · Signed `allowed_formats` trong upload signature — FE DONE + runtime-verified
  (2026-07-12, /sweep).** BE ký thêm `allowed_formats` vào SHA1 signature → FE BẮT BUỘC gửi
  field này lên Cloudinary (thiếu = "Invalid Signature", hỏng toàn bộ upload). Helper thuần
  `signedUploadFields` (`src/lib/http/signedUploadFields.ts`, test 4) build bộ param đã ký,
  `uploadChunked` dùng cho cả 4 đường upload (post/product/avatar, cả chunked >6MB).
  Verified live: signature 201 (`allowed_formats:"jpg,png,webp,mp4"`) → Cloudinary POST 200
  → close modal → orphan cleanup DELETE 200. Chi tiết → `CHANGELOG.md`.
- **F2 · Return/refund — FE DONE (2026-07-03).** Buyer request return trên OrderDetail
  (+ `/returns` list), seller queue `/sell/returns` approve/reject, order statuses mới
  `return_requested`/`refunded` phủ badge/tab/filter. Chi tiết → `CHANGELOG.md` (F2).
  Còn nợ runtime E2E 2 tài khoản; hỏi BE về status-counts keys.
- **F3 · Voucher checkout — FE DONE (2026-07-03).** Input mã ở checkout summary
  (preview qua `/order/voucher/validate`, reset khi basket đổi, guard single-seller),
  `voucherCode` vào create-order, discount line ở checkout + OrderDetail. 195 tests +
  build xanh. Admin voucher CRUD UI chưa làm (optional). Chi tiết → `CHANGELOG.md` (F3).
- **F5 · Admin moderation queue — FE DONE + runtime-verified (2026-07-03).** Trang
  `/admin/reports` (ProtectedRoute admin, link LeftRail "Kiểm duyệt bài viết"): 3 tab
  pending/resolved/dismissed, card group theo post (author, preview, reasons, badges),
  actions Hide/Unhide/Dismiss/Delete (delete confirm 2 bước) + refetch/toast. Verified
  live hide/unhide/dismiss-gating trên post #8. 206 tests + build xanh. Chi tiết →
  `CHANGELOG.md` (F5).
- **Marketplace filter params — FE DONE + runtime-verified (2026-07-04).** Đổi
  `categoryId`/`brandId` → `categoryIds`/`brandIds` trong `api/products.ts` (gateway
  whitelist strip key lạ → filter từng NO-OP). Helper `buildProductListQuery` + 6 tests.
  Verified live: Audio → 6 SP, +Sony → 2 SP. Chi tiết → `CHANGELOG.md`.
- **Comment/reply notification deep-link + preview — FE DONE + runtime-verified
  (2026-07-06).** `Notification` type + `notificationDisplay` đọc `postId`/`actorId`/
  `preview` mới: body kèm trích đoạn bình luận, click → `/post/:id` (legacy row không
  `postId` giữ nguyên không link). ~~Gap BE: `preview` bị cắt 20 ký tự~~ **BE đã fix
  (handoff 2026-07-07): preview nay ≤255 chars cho row mới** — không cần đổi code FE
  (FE render `preview` nguyên văn); row cũ vẫn giữ giá trị ngắn đã lưu. Chi tiết → `CHANGELOG.md`.
- **Public profile email/role privacy — FE DONE (2026-07-07).** `GET /user/:id` nay chỉ trả
  `{ id, username, name, avatar, isActive }` (bỏ email/role) → sửa crash About-tab ở
  `ProfilePage` (`user.role.rol_name` throw). Thêm type `PublicUser` (`User extends PublicUser`),
  `getById → PublicUser`; email/role lấy từ `currentUser` (`/user/me`) qua helper
  `profileContactInfo` (chỉ hiện ở profile của chính mình). Test `profileAbout.test.ts` (3).
  Còn nợ runtime E2E. Chi tiết → `CHANGELOG.md`.
- **Cart item owner-bound 404 — FE DONE (2026-07-07).** BE nay trả `404` (row unchanged)
  khi PATCH/DELETE `/cart/items/:id` trúng item id stale/của người khác. FE thêm predicate
  `isStaleCartItemError` + `onError` ở `useUpdateCartItem`/`useRemoveCartItem` → invalidate
  `cart.all` (drop phantom row + refetch); test `cartItemErrors.test.ts` (7 case). Còn nợ
  runtime E2E (cần BE live + forged foreign id). Chi tiết → `CHANGELOG.md`.
- **F4 seller + admin analytics — đã integrate (2026-07-06),** entry đã nằm ở Done trong
  `frontend-handoff.md`.
- **Media cap 10 ảnh (product) — FE DONE (2026-07-09).** BE cap `imageUrls[]` ≤ 10 (400 nếu
  quá). `useProductForm.addImages` nay dùng helper `capFilesToLimit` + `MAX_PRODUCT_IMAGES=10`
  (`lib/http/uploadValidation.ts`): truncate batch vượt cap + báo user, reject khi đã đủ 10.
  Post đã cap 4 sẵn. Ownership 403 no-op (chỉ submit own upload); cleanup-caveat đã thỏa (persisted
  img `publicId=''` không bị deleteMedia). Test +5. Còn nợ runtime E2E. → `CHANGELOG.md`.
- **Dead API cleanup — FE DONE (2026-07-09).** BE xóa route thừa (unused-API sweep 2026-07-06);
  FE bỏ method chết không consumer: `inventoryApi.getAll/getBySku/getById/delete/checkStock/
  reserveStock/releaseStock` + `usersApi.getAll`. Giữ route live + `getPaginated`/`getFeaturedSellers`.
  → `CHANGELOG.md`.
- **Low-stock seller dashboard — FE DONE + runtime-verified (2026-07-09).** Panel "Sản phẩm
  sắp hết hàng" ở `ShopPage` (chỉ hiện khi có row), đọc `queryKeys.inventory.lowStock` qua
  `inventoryApi.getLowStock`; pure helper `buildLowStockRows` (`features/shop/lowStock.ts`)
  coerce bigint-string id, default minimumStock 0. Stabilize luôn `products` fallback
  (`useMemo`) → đóng flag ShopPage bên dưới, lint 24→23. Chi tiết → `CHANGELOG.md`.
  - **Follow-up 2026-07-10 (/sweep):** BE denormalize `productName` vào row (handoff
    2026-07-10) → `buildLowStockRows` bỏ client-side join theo product list (hết vấn đề
    "product off-page chỉ hiện SKU"), giữ fallback SKU cho `productName` null (orphaned row).
    Verified live qua curl (test1): row `SSSS_3663` nay trả `productName: "iPhone 15 Pro
    256GB"`. Test 6 case. → `CHANGELOG.md`.
- **F6 · Wishlist/favorites UI — FE DONE (2026-07-09).** Full wishlist stack: types
  (`WishlistItem`/`WishlistToggleResult`), `api/products` (`getWishlist`/`add`/`removeWishlist`),
  query keys (`products.wishlist*`), pure helpers `wishlistCache.ts` (id-set + immutable toggle,
  test +7), hooks `useWishlist.ts` (`useWishlistPage` paginated + `useWishlistIds` membership Set +
  optimistic `useToggleWishlist`), shared `WishlistButton` (safe-in-`<Link>`), page `/wishlist`
  (dedicated card — no stock/add-to-cart vì `WishlistItem` thiếu inventory). Wired: Header nav Heart,
  ProductCard overlay, ProductDetail (thay dead Heart button). 345 tests + build + lint(0 err) xanh.
  Membership id-set fetch 1 trang 200-item (caveat ghi trong hook). Còn nợ runtime E2E (Chrome
  DevTools MCP không connect; BE+FE live, `/wishlist` → 401 đúng contract). Chi tiết → `CHANGELOG.md` (F6).
- **GHN structured address + address book (2026-07-01) đã tích hợp (2026-07-09, /sweep).** Socket
  CORS entry là FYI (đã tích hợp namespace fix 2026-06-30).
- **Batch product max-50-ids (SEC-H2) — FE DONE (2026-07-10, /sweep).** BE validate
  `POST /products/with-inventory/multiple` ≤ 50 id (400 nếu quá) → cart >50 SP distinct sẽ
  hỏng nguyên batch hydrate. FE: helper thuần `batchProductIds` (dedupe + `lodash/chunk`,
  `MAX_BATCH_PRODUCT_IDS=50`) trong `api/products.ts`; `getMultipleWithInventory` chạy từng
  batch qua `fetchBatchTolerant` rồi merge — phủ cả 6 call site. Happy path (<50) giữ nguyên
  1 request. Test +5. Còn nợ runtime E2E (>50 path cần 51 SP trong cart). → `CHANGELOG.md`.
- **Forgot/reset password — FE DONE + runtime-verified (2026-07-11, /sweep).** Login page
  "Quên mật khẩu?" (bỏ disabled) → flow 2 bước in-page (`ForgotPasswordForm`): email →
  neutral 201 luôn advance (anti-enumeration) → code 6 số + mật khẩu mới → về login với
  banner thành công (KHÔNG auto-login). Resend cooldown 60s mirror server; mọi reset-400
  map 1 message "Mã xác nhận không đúng hoặc đã hết hạn". Extract `PasswordField` dùng
  chung register+reset; step-forms có `key=` chống React reuse DOM (email leak vào code
  field). Helpers + test `forgotPassword.ts(.test.ts)` (9), RTL +4. Verified live: 201 →
  step 2, wrong code → 400 → đúng message + giữ step, countdown 60s→0 re-enable, back-link
  OK. Còn nợ E2E success-leg (code thật chỉ in ở console user-service — SMTP off dev).
  → `CHANGELOG.md`.
- **F1 · Product reviews — close-out (2026-07-10, /sweep).** UI vốn đã ship từ commit `88975c4`
  (list/delete `ProductReviews.tsx` + form per-item ở OrderDetailPage khi `completed` + aggregate
  rating) nhưng entry chưa move Done. Bug thật tìm thấy khi verify: **pagination reviews không
  refetch** (query key thiếu `page`) → thêm `queryKeys.reviews.byProductPage` +
  `placeholderData: keepPreviousData`; extract `reviewErrorMessage` helper dùng chung (test +9).
  Còn nợ runtime E2E pagination (dev data 0 review — cần 11 user mua xong 1 sản phẩm).
  Kèm: `.env.example` mới (đóng known-issue env-config). Chi tiết → `CHANGELOG.md`.

### Còn chờ backend (FE đã ship mitigation, chỉ backend mới đóng được)

- **P1-02 · Order item enrichment — FE DONE + runtime-verified (2026-06-25).**
  FE bỏ hẳn `useProductsByIds` ở 2 trang buyer order, đọc thẳng
  `item.productName`/`item.image`/`item.skuLabel`; filter badges dùng `GET
  /order/user/:id/status-counts`. Đã verify live qua Chrome DevTools MCP (user 17):
  badges 42/11/6/25 khớp, tên thật render, 404 `products/with-inventory/multiple`
  đã biến mất (chi tiết + bug-fix → `CHANGELOG.md`).
  - Order snapshot (P2-02) đã DONE — `item.image`/`skuLabel` giờ là snapshot tại
    thời điểm mua, đúng cả khi product bị xóa/đổi ảnh.
- **P1-06 · Chat metadata — DONE (backend + FE, 2026-06-26).** `GET /chat/conversations`
  trả `lastMessage`/`unreadCount`/`user1-2LastReadAt`, sort active-first; `POST
  /chat/conversations/:id/read` reset unread. FE bỏ hack localStorage activity-map,
  render preview + badge, mark-read khi mở thread. Chi tiết → `CHANGELOG.md` (P1-06
  follow-up). Còn nợ runtime: E2E 2 tài khoản.
- **P2-02 · Order snapshot — DONE (backend + FE, 2026-06-26).** `item.image`/`skuLabel`
  giờ backed bởi snapshot purchase-time; order pages đã đọc field này từ P1-02 nên
  không cần đổi code (chỉ refresh comment type). Chi tiết → `CHANGELOG.md`.
- **P2-06 · Batch product endpoint resilience — DONE (backend + FE, 2026-06-26).**
  Backend skip id thiếu trả mảng partial (+ `inventory: null` khi inventory down)
  thay vì 404 toàn batch. FE giữ `lib/fetchBatchTolerant` làm safety net (fan-out
  no-op trên happy path). Chi tiết → `CHANGELOG.md` (P2-06 follow-up).
- **P2-05 · Pagination/stat endpoints — DONE (backend + FE, 2026-06-26).**
  Admin Users `GET /user?page=&limit=` (paginated UI 20/trang); Shop stats
  `GET /products/shop/stats` (3 stat card, fallback client-side khi load);
  Notifications badge `GET /notifications/unread-count` (count toàn cục + optimistic
  decrement + socket increment). Chi tiết → `CHANGELOG.md` (P2-05 follow-up).

### Còn lại phía FE

- **P3-01 · Quality gates — Tiến độ FE (2026-06-25) — DONE.**
  - `typescript-eslint` bật cho `**/*.{ts,tsx}` (eslint.config.js). React Compiler
    advisories của react-hooks@7 (`set-state-in-effect`/`refs`/`purity`/`immutability`)
    + `react-refresh/only-export-components` hạ xuống `warn`; `rules-of-hooks` giữ
    `error` (đã bắt 2 conditional-hook bug thật → fix tại `OrderHistoryPage`,
    `ApiErrorState`, đồng thời xoá `console.log` sót). `npm run lint` → **0 errors**
    (24 warnings advisory, non-blocking).
  - Dev test deps đã cài (vitest 4 / jsdom / @testing-library/* / msw 2). Full suite:
    `npm run test:run` → **19 files, 107 tests pass**. `npm run build` xanh.
  - Test bổ sung khi RTL có: register flow (`LoginPage.test.tsx`, 3 case) + 401-redirect
    integration qua `request()` thật (`api/index.test.ts`, 3 case). Role boundary đã có
    ở `roleAccess.test.ts` (P2-04/P2-03).

### Backlog dọn dẹp còn mở sau đợt refactor architecture (2026-07-05)

> Đợt deepening (order-status module, socket factory, `lib/time`, `orderInvalidation`,
> `cartCache`, chat message helpers, `checkoutItems`, chuyển `useProductReviews` lên
> `hooks/`) đã DONE + gates xanh (build / lint 0 err / test:run 42 files · 277 tests).
> Chi tiết → `CHANGELOG.md`. Hai việc dưới KHÔNG chặn gates hiện tại, để fix sau:

- **22 lint warnings có sẵn (FE-fixable, 23→22 sau AN-01(b) 2026-07-10).** Chủ yếu `react-refresh/only-export-components`
  + React Compiler advisories. Danh mục chi tiết ở mục "React Compiler / lint warnings"
  bên dưới — chưa đụng tới trong đợt refactor.
- **Latent tsc errors khi chạy `tsc --noEmit` KHÔNG incremental.** `npm run build` dùng
  `tsc -b` (incremental) nên xanh, nhưng `npx tsc --noEmit` phẳng lộ một số lỗi type
  tồn đọng. Cần audit + fix riêng; không ảnh hưởng build/CI hiện tại.

### Runtime verification còn nợ (cần full-stack / 2 tài khoản)

- P0-03 / P0-04 / P0-05: backend đã DONE (code sạch); còn nợ endpoint self-test qua
  full-stack run (FE↔BE thật) để chốt happy-path + 409/idempotency.
- P1-06: E2E chat 2 tài khoản (open → send → receive → reconnect).
- Register + 401 redirect + role boundary (P2-03): ĐÃ phủ bằng RTL/integration test
  (`LoginPage.test.tsx`, `api/index.test.ts`, `roleAccess.test.ts`). Còn lại chỉ là
  full-stack E2E thật (live backend) nếu muốn smoke cuối.

### Known issues from whole-web audit (2026-06-30)

Verified:

- `npm.cmd run build` pass.
- `npm.cmd run test:run` pass: 26 files / 148 tests.
- `npm.cmd run lint` exits 0 with 23 warnings.
- Runtime smoke on desktop (`techstore_demo`, FE on `127.0.0.1:5174`): login, feed,
  marketplace render without horizontal overflow. Mobile runtime still needs a stable dev
  server session; the background Vite process died during viewport emulation/reload.

Open bugs / gaps:

- ~~**Price formatting / API contract mismatch.**~~ **RESOLVED (2026-07-05).** Backend now
  serializes money fields as JSON numbers (handoff 2026-07-01); FE hardened `formatPrice`/
  `formatVnd` (`src/lib/utils.ts`) to coerce `number | string` via `toMoneyNumber` so any
  residual decimal string (`"2000.00"`) still renders as grouped VND. Regression tests in
  `src/lib/utils.test.ts`. Chi tiết → `CHANGELOG.md`.
- ~~**Auth loading blank state (FE).**~~ **RESOLVED (2026-07-10, /sweep).**
  `ProtectedRoute` nay render `PageSkeleton` trong lúc `/user/me` loading thay vì `null`
  (blank page). Test colocated `ProtectedRoute.test.tsx` (4 case: skeleton khi pending,
  children khi authenticated, redirect `/login` khi 401, redirect `/` khi thiếu role).
  Chi tiết → `CHANGELOG.md`.
- ~~**Internal error navigation does a full reload (FE).**~~ **RESOLVED (2026-07-11,
  /sweep).** `ApiErrorState` nay dùng `useNavigate()` (router v7) thay
  `window.location.href`; nút back = `navigate(-1)` với fallback `/`. Sole consumer là
  catch-all 404 route trong `router.tsx` nên luôn nằm dưới RouterProvider. Test colocated
  `ApiErrorState.test.tsx` (3 case). Runtime-verified: SPA marker
  (`window.__spaMarker`) sống sót qua click "TRANG CHỦ" trên trang 404 → không full reload.
  Chi tiết → `CHANGELOG.md`.
- ~~**Header search submit button lacks accessible name (FE).**~~ **RESOLVED (2026-07-11,
  /sweep).** Thêm `aria-label="Tìm kiếm"` cho nút search icon-only (`Header.tsx`). Test
  colocated `Header.test.tsx` (2 case: accessible name + submit điều hướng
  `/marketplace?search=`). Runtime-verified: a11y tree báo `button "Tìm kiếm"`.
  Chi tiết → `CHANGELOG.md`.
- ~~**Socket dev configuration gap (FE config + backend CORS/environment).**~~
  **RESOLVED (2026-07-10, /sweep).** (a) CORS: backend nay allow mọi origin
  `localhost`/`127.0.0.1` bất kỳ port ở dev (handoff 2026-07-01) — hết lỗi CORS trên
  `:5174`. (b) Env docs: thêm `.env.example` (4 var: `VITE_API_URL`/`VITE_API_TARGET`/
  `VITE_CHAT_URL`/`VITE_WS_NOTIFICATION_URL`, cùng 1 gateway origin, không có socket port
  riêng); `realtime.md` vốn đã dùng đúng tên `VITE_WS_NOTIFICATION_URL` — mention
  `VITE_NOTIFICATION_URL` cũ chỉ nằm trong chính note này. Chi tiết → `CHANGELOG.md`.
  Còn riêng vụ socket kẹt long-polling → mục runtime trace bên dưới (BE đã verify WS
  upgrade OK 2026-07-04; FE runtime re-check còn nợ).
- **React Compiler / lint warnings (FE-fixable).** `npm run lint` has 23 warnings.
  These are not caused by API responses. Track as FE cleanup, with priority on the
  warnings that can cause extra renders/stale state:
  - `ProfilePage`: replaces `useState(() => setPostsLoaded(true))` effect-like trigger;
    reset pagination without synchronous effect churn.
  - `MarketplacePage`: move `page/setPage` state before the URL-sync effect; avoid
    `setState` directly in effect if the search param can be derived.
  - `CartPage`, `ProductDetail`, `ChatDialog`, `BasicInfoSection`, `ApiErrorState`:
    remove/reshape synchronous `setState` in effects where possible.
  - `useChat`, `CreateProductPage`: stop writing refs during render; update refs in
    effects or restructure handlers.
  - ~~`ShopPage`: stabilize `products` fallback~~ **DONE (2026-07-09, /sweep)** —
    `useMemo(() => data?.data ?? [], [data])`; lint 24→23.
  - `CheckoutPage`: React Hook Form `watch()` warning is an advisory; keep unless it
    produces stale UI, or isolate the subscription in a smaller hook.
  - Fast-refresh export warnings (`ui/button`, `ui/badge`, contexts, router) are dev
    ergonomics only; lower priority than runtime-facing warnings.
- **Styling debt (FE) — pass 1 DONE (2026-07-11, /sweep), hex→token đã sạch.**
  Đã fix toàn bộ hardcoded hex trong className/icon props: `TextField` (full retoken:
  hex→`canvas/ink/accent/bdr/tb-*`, `rounded-tb-input`, focus shadow→`ring-4 ring-tb-amber/10`,
  arbitrary px→scale), `LoginPage` (`bg-[#0B0B0E]`→`bg-tb-base`), `ChatThread`/`PostDetailPage`
  (icon `color="#fff"`→inherit/`text-ink-pri` + `shrink-0` + span container→`size-* grid
  place-items-center`), `CheckoutPage` (payment icon ternary hex→`cn()` token classes,
  `text-white`→`text-ink-pri`, `w-5 h-5`→`size-5`). Hex còn lại duy nhất =
  `AnalyticsDashboard` (recharts SVG, justified). **Pitfall tìm thấy + doc vào `tokens.md`:**
  opacity modifier (`/50`) KHÔNG hoạt động trên alias var()-based (`accent-amber/50` silently
  no-op, ring rơi về blue default) — phải dùng `tb-*` literal hex khi cần alpha. Runtime-verified
  (computed style: focus ring `rgba(245,158,11,…)` đúng design). **Còn lại (pass sau):** raw
  Tailwind palette (~20 file: `amber-400/50` focus borders, `red-950/30` error banners,
  `red-300/400/500` order pages, `green-*` PaymentResultPage, `text-gray-*` CheckoutPage footer)
  + arbitrary sizing/radius rải rác (`rounded-[10px]`, `py-[10px]`, LoginPage `px-[64px]`…).
  Không chặn runtime.

### Upload media audit (2026-07-07) — report-only, chưa fix

Audit logic upload image/video (`lib/http/cloudinary.ts` + 4 consumer). Kiến trúc OK
(signed upload, orphan-cleanup pattern P0-05, reset input, progress). Bug/gap tìm thấy,
ưu tiên từ trên xuống:

- ~~**🔴 UP-01 · Batch upload fail giữa chừng → mất ảnh + orphan không cleanup được.**~~
  **RESOLVED (2026-07-08, /sweep).** Extract pure helper `uploadFilesSequential`
  (`src/lib/http/uploadSequential.ts`) commit từng ảnh ngay khi upload xong (per-file
  `onItem`) thay vì gom `uploaded[]` rồi set state cuối. `CreatePostModal.uploadImageFiles`
  + `useProductForm.addImages` giờ đều dùng helper → file thứ N fail thì các file trước đã
  vào state (và `imagesRef`), `handleClose`/`removeMedia`/`removeImage`/`clearImages` xóa
  được trên Cloudinary, user không mất ảnh. Test `uploadSequential.test.ts` (4, gồm case
  mid-batch fail giữ nguyên phần đã commit). Đóng luôn Convention note bên dưới (logic
  batch-upload trùng ở 2 feature folder → nay 1 helper chung). Còn nợ runtime E2E (cần ép
  1 file fail giữa batch — không repro được qua UI thường). Chi tiết → `CHANGELOG.md`.
- ~~**🔴 UP-02 · EditProfileModal avatar orphan**~~ **RESOLVED FE-part (2026-07-08, /sweep).**
  `EditProfileModal` giờ track `pendingAvatar {url, publicId}` (trước chỉ giữ `url`, vứt
  `publicId` nên không xóa được). (a) cancel/close → `deleteMedia` avatar chưa lưu; (b) chọn
  avatar khác → xóa cái upload trước; save thành công → clear tracking KHÔNG xóa (đã persist).
  Pure helper `avatarUpload.ts` (`replacePendingAvatar`/`discardedAvatarOrphan`) + test (4).
  **(c) vẫn cần BE:** xóa avatar CŨ đã persist khi save — FE không có `publicId` của nó; đã
  ghi `backend-handoff.md` (Open 2026-07-07, mục orphan cleanup server-side cho persisted
  media / avatar replace). Còn nợ runtime E2E. Chi tiết → `CHANGELOG.md`.
- ~~**🟡 UP-03 · RichTextEditor upload không try/catch**~~ **RESOLVED (2026-07-08, /sweep).**
  `RichTextEditor` (`src/components/shared/RichTextEditor.tsx`) giờ (a) try/catch quanh
  `onUploadImage` → error state inline (`text-accent-red`) + `uploading` indicator, khớp
  pattern 3 consumer còn lại; (b) track `{ url, publicId }` của mọi ảnh upload trong session
  (`trackedRef`), prune ảnh bị xóa khỏi editor qua pure helper `partitionEditorImages`
  (`src/components/shared/richTextImages.ts`) trong `onUpdate` → `deleteMedia` publicId
  không còn trong HTML (ảnh persist trong `value` không bị đụng vì chỉ track session upload).
  Prop `onUploadImage` widen `{ url }` → `{ url, publicId }` (khớp `UploadResult`). Test
  `richTextImages.test.ts` (4). Còn nợ: (i) orphan khi cancel/unmount cả form (không xóa được
  vì ảnh đã nằm trong HTML đã lưu — unmount cleanup sẽ phá ảnh của bản save thành công); (ii)
  runtime E2E — error/orphan path không repro được qua UI thường. (i) đã nằm trong
  `backend-handoff.md` (Open 2026-07-07, orphan cleanup server-side cho persisted media).
  Chi tiết → `CHANGELOG.md`.
- ~~**🟡 UP-04 · Không validate file client-side**~~ **RESOLVED (2026-07-09, /sweep).**
  Pure helper `validateUploadFile` + `firstUploadError` (`src/lib/http/uploadValidation.ts`):
  check MIME prefix (fallback ext khi browser bỏ trống `type`), block SVG (BE reject script
  vector), max size (image 10MB / video 100MB) — trả message VN, chặn TRƯỚC khi upload tốn
  băng thông. Wired vào cả 4 consumer: `CreatePostModal` (ảnh batch + video), `useProductForm.addImages`,
  `EditProfileModal` avatar, `RichTextEditor`. Batch → reject cả lô ở file lỗi đầu tiên. Test
  `uploadValidation.test.ts` (14). Đóng luôn phần "no SVG" của handoff Cloudinary-URL-validation
  (2026-07-07). Còn nợ runtime E2E (không ép được file lỗi qua picker `accept` bình thường —
  cùng ràng buộc UP-01/02/03). Chi tiết → `CHANGELOG.md`.
- **🟡 UP-05 · `upload_id` là form field không nằm trong chữ ký** (`cloudinary.ts:39-41`):
  Cloudinary chunked upload chỉ dùng header `X-Unique-Upload-Id` (đã có ở dòng 47);
  `upload_id` không phải param của upload API → nguy cơ "Invalid Signature" cho file
  >6MB (chủ yếu video). Cần runtime-verify với file >6MB rồi xóa dòng này.
- **ℹ️ UP-06 · `currentUser?.id ?? 0`** (`CreatePostModal.tsx:122,166`): chưa login mà
  upload được thì publicId thành `0_xxx` sai owner. Guard sớm thay vì fallback 0.
- ~~**ℹ️ UP-07 · Vượt `MAX_IMAGES` bị slice im lặng** (`CreatePostModal.tsx:114`) —
  không báo user file thừa bị bỏ.~~ **RESOLVED (2026-07-11, /sweep).** Helper mới
  `capImageBatch` (`uploadValidation.ts`) trả `{ accepted, notice }`; notice VN hiện ở
  error slot của cả `CreatePostModal.uploadImageFiles` lẫn `useProductForm.addImages`
  ("Chỉ thêm được X/Y ảnh — tối đa N ảnh", hoặc "Tối đa N ảnh" khi không thêm được gì).
  Test `uploadValidation.test.ts` +4 case. Runtime-verified (synthetic `DataTransfer`
  5 file lên input): notice "Chỉ thêm được 4/5 ảnh — tối đa 4 ảnh" hiện, counter 4/4,
  nút add disabled; close modal → 4× `DELETE /upload/media` 200 (orphan cleanup OK).
  Chi tiết → `CHANGELOG.md`.
- **Convention:** ~~`uploadImageFiles` (social) ≈ `addImages` (product-form) — cùng logic
  batch-upload~~ **phần sequential-commit + progress đã extract** → `uploadFilesSequential`
  (`src/lib/http/uploadSequential.ts`), dùng chung ở cả 2 site (2026-07-08). Không tách
  full `useMediaUpload` hook vì state shape khác nhau (`MediaItem[]` type image/video vs.
  `ImageItem[]`); giữ per-feature state, share orchestration. `cloudinary.ts` vẫn chưa có
  test (chunk math, progress, orphan logic) — để sau.
- **Cần BE check** → đã ghi `../.agent-local/backend-handoff.md` (Open, 2026-07-07):
  (a) `DELETE /upload/media` có verify ownership của `public_id` không; (b) orphan
  cleanup phía server cho persisted media bị thay/xóa (post edit, product edit, avatar
  replace — FE không có publicId của media đã persist nên không tự xóa được); (c) signature
  endpoint có nên sign kèm ràng buộc upload (`allowed_formats`, max size) để limit không
  bypass được từ client.

### Sweep audit toàn project (2026-07-07) — report-only, chưa fix

Gates tại thời điểm audit: `build` ✓ · `test:run` 44 files / 291 tests ✓. Không tìm thấy
BE gap mới (contract analytics F4 khớp type; các BE entry cũ trong `backend-handoff.md`
giữ nguyên). Finding mới (đã dedupe với các mục trên):

- ~~**🔴 SEC-01 · Credential files ở repo root không gitignore.**~~ **RESOLVED (2026-07-08, /sweep).**
  `.gitignore` nay ignore `login.json` + `*.cookies`; sửa luôn dòng malformed
  `public# Local...` (entry `public` bị dính vào comment → `public/` hết bị ignore, làm
  4 test image `imag1/image2/...` lộ ra untracked) tách lại thành `public` riêng dòng.
  Verified qua `git check-ignore`: credentials + test image đều ignored, `public/vite.svg`
  vẫn tracked, porcelain sạch. Chi tiết → `CHANGELOG.md`.
- **🟡 FMT-01 · Reformat toàn file lẫn vào diff F4.** `src/api/orders.ts` +
  `src/types/order.ts` (kiểm tra thêm `api/users.ts`) bị format lại toàn bộ sang
  double-quote/prettier-style khác convention single-quote của repo → diff khổng lồ che
  thay đổi thật (chỉ ~40 dòng analytics là mới). Fix: revert phần format-only trước khi
  commit, giữ functional diff.
- ~~**🟡 QK-01 · Inline query keys trong invalidation.**~~ **RESOLVED (2026-07-09, /sweep).**
  Thêm list-level key `social.followingFeedAll` (`['social','following-feed']`) +
  `social.userScopeAll` (`['social','user']`, phủ profile posts/followers/following) vào
  `hooks/query/queryKeys.ts`; `useFeed.ts` (`useUpdatePost`/`useDeletePost` onSuccess) nay
  invalidate qua factory thay vì mảng inline → prefix không còn drift im lặng khi factory
  đổi shape. Behavior byte-identical (cùng mảng key). Test `queryKeys.test.ts` (3) guard
  prefix relationship (list-level là prefix của item-level, đúng cách invalidateQueries
  match). Chi tiết → `CHANGELOG.md`.
- **🟢 AN-01 · `AnalyticsDashboard.tsx` (F4) — nợ nhỏ:** ~~(a) logic `applyRangePreset`/
  `toIsoDate` chưa có test~~ **DONE (2026-07-09, /sweep)** — extract `analyticsRange.ts`
  (`toIsoDate`/`rangePresetDates`, `now` injectable) + test (5); verified live 90-day preset
  refetch `?from=2026-04-10&to=2026-07-08`. ~~(b) hook `useAnalyticsFilters` export từ file
  component~~ **DONE (2026-07-10, /sweep)** — extract `useAnalyticsFilters.ts` (+ type
  `AnalyticsFilters`), test +2, lint warnings 23→22. Còn: (c) hex literals cho recharts có
  comment justify (SVG không ăn Tailwind) — nếu thêm chart thứ 2 thì extract `chartTheme.ts`
  dùng chung (conditional, không phải việc mở).
- ~~**🟢 STY-addendum · Icon props sai convention (social).**~~ **RESOLVED (2026-07-09, /sweep).**
  `PostCard`/`FeedPage`/`CreatePostModal` icon `size="n"` string → `size={n}` + `shrink-0`;
  stats-heart container `w-5 h-5 inline-flex` → `size-5 grid place-items-center`; `color="#fff"`
  → `text-white`; `FollowListModal` inline `style` transform → `-translate-x-1/2 -translate-y-1/2`.
  className/prop-only. Verified live (feed icons render, console chỉ có 404 ảnh cũ). → `CHANGELOG.md`.
- **ℹ️ Bundle:** recharts (dep mới của F4) tạo chunk `AnalyticsDashboard` 402 kB /
  gzip 116 kB — đã route-lazy (chỉ tải khi mở trang analytics), chấp nhận được.

**GHN structured address + address book đã đóng (2026-07-09, /sweep, full feature)** — types/api
(`shipping` + address book) + query keys + `features/address/` (hooks, `AddressSelect`,
`AddressFormModal`, `AddressBookPicker`, `AddressesPage`) + `/addresses` route + LeftRail link;
CheckoutPage nay dùng address book (default auto-select, fee preview theo địa chỉ đã chọn, pipe string
qua `buildGhnShippingAddress`); `checkout.schema.ts` rút còn `paymentMethod`. build/lint/test xanh
(353). ✅ runtime-verified (2026-07-09, /sweep): login → `/addresses` render, GHN province→district→ward cascade tải live + reset đúng, create → list refresh (invalidate `users.addresses`), delete-confirm → list refresh; LeftRail "Sổ địa chỉ" link hoạt động.
**TOP FIX (next):** small backlog — STY debt pass 2 (raw palette, ~20 file; pass 1 hex→token
đã đóng 2026-07-11), lint warnings
(runtime-facing trước), UP-05 (runtime-verify chunked upload >6MB), UP-06 (guard login
trước upload), FMT-01 (murky — kiểm tra commit trước). `ApiErrorState` full-reload nav +
Header search a11y + UP-07 đã đóng 2026-07-11. `ProtectedRoute` blank loading đã đóng 2026-07-10. AN-01(b) đã đóng 2026-07-10; AN-01(c) conditional (chỉ khi thêm chart thứ 2). Paginated `keepPreviousData` đã đóng
TOÀN BỘ 2026-07-10 (reviews + Marketplace/Shop/Profile/ProductPicker + Admin Users + wishlist).
Env-config gap + F1 reviews close-out (pagination-key bug) đã đóng 2026-07-10. **F6 Wishlist,
CLS TOP FIX, QK-01, UP-01/UP-02(FE)/UP-03/UP-04, SEC-01, VariationBuilder index-key, product
image-cap-10, dead API cleanup, low-stock dashboard, STY-addendum(icons), AN-01(a) đã đóng.** (FMT-01
revert format-only diff cũng còn mở nhưng murky — kiểm tra file đã commit chưa trước.)

### Perf scan — static anti-patterns (`/check-perf` all project, 2026-07-02)

Report-only (chưa fix). Clean: 0 whole-lib lodash import; 0 nested `.find()`-in-`.map()`;
`router.tsx` lazy-load đủ 17 page. ~18 chỗ `key={i}` khác đều là loading skeleton (OK);
image-grid `key={i}` trong PostCard/PostDetailPage/ProductDetail là list tĩnh theo
entity (chấp nhận được).

Flags cần xử lý (ưu tiên từ trên xuống):

- ~~**🟡 Context value không memoize (2 chỗ).**~~ **DONE (2026-07-06).** `useAuth`
  giờ `useCallback` cho `loginSuccess`/`logout` + `useMemo` cho object trả về;
  `ApiErrorProvider` `useMemo` value (`setGlobalError` từ useState vốn stable). Stable-identity
  test ở `useAuth.test.tsx`. Chi tiết → `CHANGELOG.md`.
- ~~**🟡 `key={i}` trên list dynamic — bug tiềm ẩn, không chỉ perf.**~~
  **RESOLVED (2026-07-09, /sweep).** `VarGroup` nay có `id` ổn định (factory
  `makeVarGroup` trong `useProductForm.ts`, id tăng dần); `DEFAULT_FIELDS`/`addGroup`/
  edit-mode hydrate (`CreateProductPage`) đều dùng factory, `VariationBuilder` key theo
  `group.id` thay vì index → remove group đầu không còn reuse instance `GroupRow` (draft
  "thêm option") sang row sai. Test `VariationBuilder.test.tsx` (3, gồm regression tái
  hiện leak bằng `fireEvent` để bỏ qua onBlur-commit — fail với index key, pass với id
  key). `id` bị strip ở `buildPayload` (variations chỉ map name+options). Chi tiết →
  `CHANGELOG.md`.
- ~~**🟡 `<img>` thiếu ràng buộc kích thước → CLS.**~~ **RESOLVED + runtime-verified (2026-07-09, /sweep).**
  Post 1-ảnh (`PostCard.tsx`) nay có container `aspect-[4/3] max-h-[520px]` (reserve slot
  trước khi ảnh load, img `max-h-full object-contain`) → hết feed layout shift; preview
  `CreatePostModal` đổi `max-h-60` → `w-full aspect-video object-contain` (khớp video sibling).
  className-only (không logic → không unit test). Runtime-verified qua Chrome DevTools MCP: slot
  reserve đúng cả khi URL ảnh 404 (data cũ hỏng, không phải regression). → `CHANGELOG.md`.
- ~~**ℹ️ `placeholderData: keepPreviousData` thiếu ở đa số paginated query**~~
  **RESOLVED (2026-07-10, /sweep).** `useProducts` (phủ Marketplace/Shop/Profile/ProductPicker),
  Admin Users query (`AdminPage`), `useWishlistPage` đều thêm `placeholderData: keepPreviousData`
  (reviews đã xong cùng ngày). Test +3 (renderHook + MSW: page flip giữ data trang cũ thay vì
  flash empty). Còn nợ runtime visual check (MCP không connect). → `CHANGELOG.md`.

Gap phát hiện trong lúc scan (không phải perf): VariationBuilder index-key ở trên vừa
là perf flag vừa là correctness gap — nếu fix thì kèm test theo rule "every fix ships
with a test".

> Ngoài tầm static scan (cần đo, không đoán): re-render thật → React DevTools Profiler;
> bundle size → visualizer (dev dep mới, phải hỏi trước); LCP/CLS/INP → Lighthouse.

### Perf đo thật — bundle + Lighthouse (2026-07-02)

Đo qua `npx` (không thêm dep nào, không đổi config). Re-run:

```bash
npx -y vite-bundle-visualizer -t list -o <out>.yml   # bundle theo module (rendered size)
npm run build && npx vite preview --port 4173        # rồi:
npx -y lighthouse http://localhost:4173/login --only-categories=performance \
  --output=json --output-path=<out>.json --chrome-flags="--headless=new"
```

**Bundle (rendered size, trước minify; gzip thật ghi kèm):**

- `index` chunk **457 kB gzip 144 kB** — react-dom 540 kB, react-router 217 kB,
  tailwind-merge 100 kB (bình thường với stack này).
- `CreateProductPage` chunk **455 kB gzip 142 kB** — TipTap + ProseMirror ≈ 800 kB
  rendered. Đã route-lazy nên chỉ seller mở editor mới tải; nếu muốn giảm nữa thì
  dynamic-import riêng phần editor trong page. Không ưu tiên.
- `schemas` chunk 245 kB — react-hook-form 97 kB + zod 145 kB, share giữa các form page.

**🟡 GAP mới — react-router 7.15.1 bundle bản development vào production.**
Exports map của `react-router` trỏ mọi condition (`module`/`import`/`default`) vào
`dist/development/`; bản `dist/production/` tồn tại nhưng không reachable qua exports.
Hai bản giống hệt nhau về size, chỉ khác `ENABLE_DEV_WARNINGS = true/false` → prod
đang chạy RR với dev warnings/debug logging BẬT (console noise + overhead nhỏ mỗi
navigation; KHÔNG phình bundle). Evidence: chuỗi debug "Matched leaf route at location"
có trong `dist/assets/index-*.js`. Fix options: (a) `resolve.alias` react-router →
`dist/production` trong vite.config (verify lại bằng grep chuỗi trên sau build);
(b) upgrade react-router 8.x (major, latest 8.1.0). Chưa fix — cần quyết định.

**Lighthouse `/login`** (prod build qua `vite preview`, headless, simulated throttling):
Perf **78** · FCP 3.7s · LCP 4.2s · TBT 0ms · **CLS 0** · SI 3.7s. Chi tiết:

- Unused JS: `index` 73/141 KiB (52% — app shell, chấp nhận được), `schemas` 24/27 KiB
  (87% — trang login kéo cả chunk zod+RHF; sẽ tự cải thiện nếu tách schema per-form).
- Forced reflow ~31ms trong `index` chunk (minified, chưa attribute được về source —
  cần trace có sourcemap nếu muốn đào).
- FCP/LCP 3.7–4.2s là số simulated-throttle của SPA chưa SSR — hợp lý; muốn cải thiện
  thì nhắm vào giảm `index` chunk, không phải micro-tweak.

### Runtime trace sau-login — Chrome DevTools MCP (2026-07-02)

Prod build (`vite preview :4173`) + backend live, login `techstore_demo`, máy local
không throttle (số lạc quan hơn thực tế người dùng):

- **Feed `/`:** LCP 718ms (714ms là render delay = JS boot của SPA) · CLS 0. OK.
- **Marketplace:** LCP 1.44s, trong đó **load delay 1.38s** — waterfall SPA
  (boot JS → chờ `GET /products/with-inventory/all` → render → mới request ảnh).
  Ảnh LCP fail cả 3 check LCPDiscovery: có `loading="lazy"` (ProductCard đặt lazy
  cho MỌI card kể cả above-the-fold), thiếu `fetchpriority="high"`, không
  discoverable từ HTML (bản chất SPA). FE win nhỏ: bỏ lazy / thêm fetchpriority
  cho N card đầu; win thật là rút ngắn waterfall (index chunk + API).
- **React-router dev-warnings (gap ở trên):** KHÔNG thấy console log RR nào trên
  happy path → impact thấp hơn dự đoán, hạ ưu tiên (vẫn nên fix khi tiện).

**Bug/gap mới từ trace (console + network trên happy path — vi phạm tiêu chí
"không console error trong happy path"), đã ghi `../.agent-local/backend-handoff.md`
(Open, 3 entry 2026-07-02):**

- ~~`GET /api/user/all` → **403 ×2** mỗi lần load feed~~ **ĐÃ FIX (2026-07-04).**
  RightRail đổi sang `GET /user/featured-sellers?limit=5` (endpoint public BE giao);
  hết 403 + console error, card "Seller nổi bật" populate thật. Chi tiết → `CHANGELOG.md`.
- **4× Cloudinary 404** ảnh post cũ: URL trong DB bị lặp folder
  (`trybuy/posts/trybuy/posts/...`) hoặc public_id prefix `undefined_`. Data cũ —
  flow upload hiện tại (`lib/cloudinary.ts` lưu `secure_url` Cloudinary trả về)
  không thể sinh URL sai kiểu này. Cần BE/DB cleanup.
- **Socket.IO kẹt long-polling** — không có websocket upgrade nào trên `/chat`
  (origin `localhost:4173` → gateway `:3000`); polling 200 chạy đúng chức năng
  nhưng tốn tài nguyên. FE dùng transports mặc định (có thử ws) → ~~check phía BE~~
  **BE đã verify WS upgrade hoạt động cả 2 namespace (handoff 2026-07-04)** → còn nợ
  FE runtime re-check (nếu vẫn polling-only thì lỗi nằm ở FE path/proxy/browser).

## Definition of production-ready

- Toàn bộ P0 đóng và được regression test; không còn 2 cart source of truth.
- Không thể tạo order trùng do retry; cart online payment chỉ consume sau success.
- Product create/edit bảo toàn inventory/SKU/variation/ảnh.
- Seller/buyer nhìn cùng một order state machine.
- Mobile hoàn thành login → add cart → checkout → order.
- `build`, `typecheck`, `lint`, `test:run` đều pass trong CI.
- Không console error / failed request chưa xử lý trong happy path.

## Test data / convention reference

- **Ảnh test khi tạo product** (Chrome DevTools MCP / manual): upload ảnh local trong
  `frontend/public/`: `imag1.png`, `image2.png`, `image_screen_1.png`, `screen_2.png`.
  Không để product không có ảnh (tránh fallback `src=""` của P2-02). Dùng
  `mcp__chrome-devtools__upload_file` trỏ đường dẫn tuyệt đối cho file input ở
  `BasicInfoSection`.
- Test accounts: `../.agent-local/test-accounts.md`.

## History

Finished work — mọi item P0/P1/P2 đã DONE, các flow đã pass runtime audit, và dữ liệu
test đã tạo — nằm trong `CHANGELOG.md` (same folder, không auto-load). Đọc khi cần
lịch sử/lý do của một thay đổi.
