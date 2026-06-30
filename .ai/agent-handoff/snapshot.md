# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-06-30 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
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

- **Price formatting / API contract mismatch (FE + backend contract).** Runtime marketplace
  and right rail show prices like `2000.00 đ`, `39.00 đ`, `299000.00 đ`. FE types declare
  `Product.price` / `ProductSku.price` as `number`, but backend/runtime values arrive as
  decimal strings. `formatPrice()` accepts `number`, so a string value keeps its raw
  decimal text. Fix options: normalize numeric money fields in the API adapter before
  data reaches components, or update the shared contract to model backend decimal strings
  and coerce inside price helpers. Add regression tests for string decimal input.
- **Auth loading blank state (FE).** `ProtectedRoute` returns `null` while `/user/me` is
  loading, producing a blank protected route instead of `PageSkeleton`.
- **Internal error navigation does a full reload (FE).** `ApiErrorState` uses
  `window.location.href` for internal app routes; should use router navigation.
- **Header search submit button lacks accessible name (FE).** The icon-only search button
  has no visible text or `aria-label`; runtime a11y snapshot reports it as an unnamed
  button.
- **Socket dev configuration gap (FE config + backend CORS/environment).** On FE origin
  `127.0.0.1:5174`, chat socket requests to `http://localhost:3000/socket.io` spam CORS
  errors. This may be expected if backend allow-list only permits `localhost:5173`, but
  repo also lacks `.env.example` and code uses `VITE_WS_NOTIFICATION_URL` while guidance
  mentions `VITE_NOTIFICATION_URL`. Align env docs/names and verify socket CORS on the
  canonical dev origin.
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
  - `ShopPage`: stabilize `products` fallback so `useMemo` deps do not change every
    render.
  - `CheckoutPage`: React Hook Form `watch()` warning is an advisory; keep unless it
    produces stale UI, or isolate the subscription in a smaller hook.
  - Fast-refresh export warnings (`ui/button`, `ui/badge`, contexts, router) are dev
    ergonomics only; lower priority than runtime-facing warnings.
- **Styling debt (FE).** Static scan still finds inline `style={{}}` outside `Avatar`,
  hardcoded hex, raw Tailwind palette classes, and arbitrary sizing/radius in multiple
  UI files (`TextField`, `LoginPage`, `CheckoutPage`, `PaymentResultPage`, order/social
  pages). This is not a runtime blocker but violates project styling rules and should be
  cleaned in small scoped passes.

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
