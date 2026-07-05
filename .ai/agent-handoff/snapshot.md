# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-07-03 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
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
- **Còn mở (theo thứ tự cũ → mới):** GHN structured address + address book (2026-07-01)
  · F4 seller analytics
  dashboard (2026-07-01). Socket CORS entry là FYI (đã tích hợp namespace fix 2026-06-30).

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

- **23 lint warnings có sẵn (FE-fixable).** Chủ yếu `react-refresh/only-export-components`
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
- **🟡 `key={i}` trên list dynamic — bug tiềm ẩn, không chỉ perf.**
  `src/features/product/product-form/VariationBuilder.tsx:150` — variation groups
  add/remove được nhưng key là index; remove group đầu có thể làm local state của
  `GroupRow` (input "thêm option") dính sang row sai. Fix: key theo id ổn định
  (thêm `id` vào group state).
- **🟡 `<img>` thiếu ràng buộc kích thước → CLS.**
  - `src/features/social/PostCard.tsx:174` — post 1 ảnh: `max-h-[520px] object-contain`
    không có `aspect-*`/`width`/`height`; feed bị layout shift khi ảnh load (hot path).
  - `src/features/social/CreatePostModal.tsx:265` — preview `max-h-60` không aspect
    (minor, trong modal).
- **ℹ️ Không có `placeholderData: keepPreviousData` ở bất kỳ paginated query nào**
  (MarketplacePage pagination, Admin Users 20/trang). List flash empty giữa các trang —
  performance.md data rule khuyến nghị dùng cho paginated lists.

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
  nhưng tốn tài nguyên. FE dùng transports mặc định (có thử ws) → check phía BE.

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
