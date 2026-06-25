# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-06-25 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
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
  - Còn nợ phía backend: order snapshot name/image/SKU tại thời điểm mua (xem
    P2-02 — fields hiện realtime, sẽ sai nếu product bị xóa/đổi ảnh).
- **P1-06 · Chat metadata.** Trả `lastMessage` + `unreadCount` trên `Conversation`
  cho unread count / last-message preview.
- **P2-02 · Order snapshot.** Lưu product name/image/SKU tại thời điểm mua để order
  cũ render đúng dù product đổi/xóa (FE chỉ enrich realtime qua `useProductsByIds`).
- **P2-06 · Batch product endpoint resilience — FE mitigation DONE (2026-06-25).**
  `POST /products/with-inventory/multiple` trả `404 "Product not found"` nếu BẤT KỲ
  id nào trong batch đã bị xóa → giết cả response. **FE đã vá tại API layer:**
  `api.products.getMultipleWithInventory` bọc qua `lib/fetchBatchTolerant` — happy
  path vẫn 1 batch request, chỉ fan-out per-id khi gặp 404 rồi drop id thiếu (cover
  hết 5 consumer kể cả cart pages). Test `fetchBatchTolerant.test.ts` (4 case).
  **Còn nợ backend:** nên skip id thiếu trả mảng partial thay vì 404 (khi đó FE
  fan-out thành no-op).
- **P2-05 · Pagination/stat endpoints** (FE giữ `limit` cao tới khi có, tránh giấu data):
  - Admin Users: `GET /user?page=&limit=` trả `PaginatedResponse<User>` (hiện
    `GET /user/all` → `User[]` không phân trang).
  - Shop stats + search: endpoint tổng-stock/low-stock độc lập pagination + search
    server-side theo name/SKU, rồi `/sell` mới drop 10/trang.
  - Notifications unread badge: `GET /notifications/unread-count` (hoặc field
    `unreadCount` trên list response) cho badge chính xác toàn cục.

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
