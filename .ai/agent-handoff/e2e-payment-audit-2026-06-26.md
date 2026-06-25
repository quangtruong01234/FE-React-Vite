# E2E Audit — Create → Cart → Checkout → Payment/QR → Success/Cancel (2026-06-26)

> Run qua Chrome DevTools MCP, 2 isolated context: shop `techstore_demo` (user 23) +
> buyer `canceltest1779978329` (user 17). Mục tiêu user: tạo product multi-SKU (giá
> 1000–4000), đặt đơn ≥2 sản phẩm trả ZaloPay/VNPay → màn QR scan → test case success
> + cancelled. **Không hoàn tất live được vì backend write-path đang chết** (xem BE-1..4).
> File này là checklist để test lại khi backend ổn. Tag: `[BE]` backend/env · `[FE]` code FE · `[UI]` visual/UX.
> Đọc kèm `snapshot.md` (P2-06 liên quan BE-3) — KHÔNG duplicate rule trong `.ai/context/`.

## 🔴 Blocker — backend write-path down (chặn live test)

- **BE-1 · `POST /api/order` → 502** cho CẢ cod / zalopay / vnpay (DTO hợp lệ
  `{productId, productName, quantity, skuId}`). Không tạo được order mới → không chạy
  được new-order → pay → success. Read (`GET /api/order/user/:id`) vẫn 200 → chỉ write down.
- **BE-2 · `PATCH /api/order/:id/cancel` → 503.** Mutation FE bắn đúng (verify trên
  `/order/96`) nhưng service unavailable.
- **BE-3 · `POST /api/products/with-inventory/multiple` → 500 (AggregateError)** với MỌI
  input (đã thử tới 1 id, cả seeded). Single `GET /api/products/:id/with-inventory` thì
  200 đúng giá/kho. ⚠️ **Khác P2-06:** mitigation `fetchBatchTolerant` chỉ fan-out khi
  batch ném **404**; lần này là **500** nên KHÔNG fan-out → cart/checkout vẫn vỡ.
  → Cần backend fix, hoặc nới `fetchBatchTolerant` fan-out cả khi 500 (cân nhắc cost).
- **BE-4 · Single-SKU `POST /api/products` → 502** (2 lần). Multi-SKU create cùng flow
  thì OK (đã tạo product 47 @1500đ, 50 @3800đ). Khác biệt isolate được: chỉ single-SKU 502.

## 🟠 Bug FE (fix được không phụ thuộc backend)

- **FE-1 · Cancel fail im lặng — không feedback.** `useCancelOrder.onError` chỉ
  `console.error`. Khi 503 trả về, UI KHÔNG hiện gì (no toast/inline) → user tưởng nút
  không ăn. Cần error toast / inline message. File: `src/features/order/useCancelOrder.ts`.
- **FE-2 · Re-pay pending order luôn dính VNPay "hết hạn".** `GET /order/:id/payment-url`
  trả 200 + redirect đúng tới VNPay sandbox THẬT, nhưng URL tái dùng `vnp_CreateDate`
  GỐC (lúc tạo order, đã nhiều tuần) → gateway báo *"Giao dịch đã quá thời gian chờ
  thanh toán"* (Error code 15) TRƯỚC khi render QR. Nút "Thanh toán ngay" non-functional
  cho mọi order chưa trả trong window. → payment-url cần sinh timestamp mới. **Đây chính
  là chỗ màn "scan QR to pay" phải hiện** — gateway tới được, nhưng order bị reject expired.
  Liên quan: `src/features/order/useOrderPaymentUrl.ts` (FE chỉ redirect; fix có thể ở BE gen URL).
- **FE-3 · Checkout over-block nút xác nhận trên lỗi display-only.** `CheckoutPage`
  `disabled={loading || productsError || …}`. `productsError` đến từ batch enrichment chết
  (BE-3) — chỉ là data hiển thị. Nhưng `onSubmit` build order từ `{productId, productName,
  quantity, skuId}` (giá tính server-side) → đơn vẫn tạo được khi enrich fail. Không nên
  hard-block checkout vì lỗi fetch display. File: `src/features/cart/CheckoutPage.tsx`.
- **FE-4 · Cart hiểu nhầm enrich-fail thành "sản phẩm không còn tồn tại" + 0đ, vẫn cho
  checkout 0đ.** Khi BE-3 500, row hiện "Sản phẩm không còn tồn tại" @ **0đ** (product
  vẫn sống — chỉ batch fail), tổng 0đ mà nút vẫn bấm được → hazard đơn 0đ.

## 🟡 UI / polish

- **UI-1 · Order detail render shipping address thô, pipe-delimited.** Hiện nguyên văn
  `Nguyen Van A|0987654321|123 Nguyen Hue|Phuong Ben Nghe|Quan 1|Ho Chi Minh`. Cần parse
  `name|phone|street|ward|district|city` thành block. File: `src/features/order/OrderDetailPage.tsx`.
- **UI-2 · Cart action count desync.** "Xóa đã chọn (4)" / "ĐẶT HÀNG (4)" khi giỏ không
  có 4 item hợp lệ. Selection count chưa reconcile với valid line items.
- **UI-3 · Nút "Tự động tạo SKU" cần bấm 2 lần** (lần 1 no-op). State/timing first-invoke.
  Trang `/sell` create product.
- **UI-4 · Copy lỗi sai khi product save fail.** Single-SKU create 502 hiện *"Không thể
  lưu tồn kho cho sản phẩm…"* → ngụ ý đã tạo product xong chỉ lỗi tồn kho, thực ra create fail.
- **UI-5 · a11y warning:** "A form field element should have an id or name attribute"
  (search field Header).

## ✅ Đã verify chạy được trong audit này

- Multi-SKU product create (product 47 @1500đ, 50 @3800đ) — giá trong range 1000–4000.
- Order reads (`GET /order/user/17`, `GET /order/:id`) — 200.
- `GET /order/:id/payment-url` → redirect tới VNPay sandbox THẬT (gateway reachable).
- Cancel mutation bắn đúng từ UI (chỉ chết ở BE-2).

## Re-test checklist khi backend write-path xanh lại

1. [ ] BE-1: tạo order ≥2 sản phẩm (47×2 Đen skuId21 + 50×1 100W skuId24 = 6800đ) trả ZaloPay/VNPay.
2. [ ] FE-2: từ order pending mới → "Thanh toán ngay" → **màn QR scan hiện** (xác nhận không còn Error 15).
3. [ ] Case **success:** trả xong gateway → `/payment-result` hiện "Thanh toán thành công" + cart consume đúng (P0-04).
4. [ ] Case **cancelled:** hủy ở gateway HOẶC `PATCH /order/:id/cancel` → state về `canceled`, cart GIỮ nguyên, FE-1 hiện feedback.
5. [ ] BE-3/BE-4: cart enrich batch + single-SKU create không còn 500/502.
