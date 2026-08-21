# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-08-21 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
> Keep this LEAN: chỉ giữ bức tranh sống (overview, việc còn mở/bị chặn, known issues).
> Việc đã xong nằm ở `CHANGELOG.md` (cùng thư mục, không auto-load) — **đừng chép lại vào đây**.
> Convention/rule nằm ở `.ai/context/` — cũng không duplicate vào đây.

## Overview

React 19 + Vite FE cho marketplace microservices. Khung đầy đủ: marketplace, cart, checkout,
order, seller, social, admin, chat, wishlist, sổ địa chỉ. **Toàn bộ P0/P1/P2 đã đóng phía FE**,
kể cả P0-03: nhánh create atomic BE-side từ INV-CONTRACT-01 (prod 2026-08-12), nhánh update
**không atomic và không thể atomic** — PATCH-ATOMIC-01 (2026-08-12) trả lời dứt điểm, FE giữ
`onError` refetch vĩnh viễn (xem §Guard cố ý giữ).
Public-ID migration (PUBID-01–07) đã
xong — storefront id là opaque string end-to-end.

**Gates (chạy lại + verify 2026-08-21):** `npm run build` ✓ · `npm run lint` 0 problem ·
`npm run test:run` **806 test / 109 file**, all pass. Không đóng item nào khi 3 lệnh này chưa xanh.

> ⚠️ `npm run build` **mới** thực sự typecheck từ 2026-08-04. Trước đó script chỉ là `vite build`
> (esbuild vứt type) trong khi doc ghi là có `tsc` → 3 lỗi type nằm im 2 tuần. Chi tiết +
> bài học → `.ai/context/pitfalls.md` mục 9, lý do → `CHANGELOG.md`. Mọi con số gate ghi trong
> CHANGELOG **trước** ngày này chỉ chứng minh bundle build được, không chứng minh type sạch.

**Production gate:** không release trước khi P0 đóng *và* có regression test cho
login → product → cart → checkout → payment/order.

## Recent closes (chi tiết → `CHANGELOG.md`)

| Ngày | Item |
|---|---|
| 2026-08-21 | **SKU-NULL-01 · crash trắng trang `/sell/:id` — bắt được lúc verify OVERFETCH-01 trên prod** (class **A**, không đụng contract BE). Mở trang sửa sản phẩm bằng `shop1` ra `Unexpected Application Error! Cannot read properties of null (reading 'trim')`. Truy từ stack minified: `_g` = `skuForPayload` (`n.trim()`), gọi từ memo dựng payload; sản phẩm prod trả `"sku": null`. Gốc rễ là **type nói dối**: `Product.sku` khai `string` non-null trong khi cột BE nullable (seller để trống lúc tạo, hoặc mã nằm ở `skus[]`) ⇒ `CreateProductPage.tsx:117` đổ thẳng `null` vào field. **Không phải regression của batch OVERFETCH-01**: `git show HEAD~6` có y hệt dòng đó, `git log -S` quy về `88975c4`. Sửa theo hướng để compiler tự chỉ chỗ: `sku: string \| null` (sự thật BE) rồi để `tsc` liệt kê consumer — lòi ra **chỗ crash thứ hai chưa ai thấy**: ô tìm kiếm ở `/shop` (`p.sku.toLowerCase()`) sẽ nổ ngay ký tự đầu tiên nếu shop có **một** sản phẩm không SKU. Hai helper thuần thay cho guard inline: `skuForField()` (`product-form/productSku.ts`) và `filterProductsByQuery()` (`features/shop/productSearch.ts`). `ProductDetail.tsx:255` vốn đã guard `detail.sku &&` ⇒ không đụng; `lowStock.ts` đọc `InventoryRecord.sku` (type khác, BE luôn trả). +9 test / +1 file → **806 test / 109 file**. **ĐÃ LÊN PROD 2026-08-21** — 2 commit `2ca28f7..58593ac`; bundle live đổi `index-pu_rTDgS` → `index-CB1r6daf`, `CreateProductPage-CFi9uyBF` → `BHxf_w1l`, `ShopPage-CAvQNGGZ` → `Bu6OSltv`. Verify lại bằng `shop1`: `/sell/prod_BWg2OVHUlmrlEfP5` render đủ form (tên/danh mục/giá 45000/kho 50/cân 250, ô **Mã SKU trống** đúng như `sku: null`), không còn error screen; `/shop` gõ `a` → 15 hàng, `tai nghe` → 2, `zzzqqq` → *"Không tìm thấy sản phẩm nào."*, xoá query → 23 hàng, **0 console error của app**. Danh sách prod của `shop1` có **đúng 2** sản phẩm SKU rỗng ⇒ test này đi thật vào nhánh null chứ không phải may. **Bổ sung cùng ngày:** tạo thêm `prod_82NLlCVqNmyiuK9b` (có `skus[]`, giá 10.000đ) trên prod để phủ nốt **prefill ma trận SKU** — chi tiết ở §OVERFETCH-01 bên dưới |
| 2026-08-16 | **SWEEP-0816 · đóng cả 4 mục audit 2026-08-16 + 3 lỗ a11y chỉ MCP mới thấy** (class **A** — không đụng contract BE). **AUD-0816-01** (🔴, tiền thật): `PaymentResultPage` in "Thanh toán thất bại" khi *request xác minh* hỏng chứ không phải khi thanh toán hỏng ⇒ buyer đã trả tiền có thể trả lần hai. Tách verdict ra helper thuần `features/payment/paymentResultVerdict.ts` — `resolvePaymentVerdict(data, isError)` → `success \| failed \| unverified`; `data === undefined` **không còn** rơi vào nhánh đỏ mà ra panel hổ phách "chưa xác minh được" trỏ `/order/:id` (nguồn sự thật). Giữ `retry: false` **cố ý**: retry một callback gateway đã redirect xong không làm nó đúng thêm. **AUD-0816-02**: 6 trang render lỗi query y hệt "rỗng thật" (`CartPage` ra "giỏ hàng trống", 2 trang duyệt ra "không có gì chờ duyệt" ⇒ moderator tin hàng đợi đã sạch, `AdminPage`/2 trang analytics ra trắng). Thêm `lib/http/apiError.ts` (`toApiError`) + `components/shared/TableErrorRow.tsx` (bọc `ApiErrorState … embedded` trong `<tr><td colSpan>`) rồi nối `error`+`refetch` ở cả 6 site — dùng lại `ApiErrorState` có sẵn, không đẻ khuôn mới. **AUD-0816-03**: thay vì vá 19 call site, ép tên vào **type**: `IconButton` nhận union `AccessibleName` (`aria-label` hoặc `title` — thiếu cả hai là **lỗi compile**), `ModalCloseButton` tự đặt tên. **AUD-0816-04**: bỏ `Number()` thừa quanh tiền ở `AdminPage:105`, `OrderHistoryPage:210`, `SellerOrdersPage:99/162/215` — `Number(null)=0` vô hiệu hoá guard `null → '—'` của `toMoneyNumber`. **Phần chỉ MCP mới bắt được** (quét a11y tree thật của Chrome, không phải regex): regex cũ chỉ soi `<IconButton` nên **mù** hẳn một lớp control — 12 `role="switch"` trên `/shop` (mỗi hàng sản phẩm một cái) đọc lên chỉ là "switch, checked", ô upload ảnh nét đứt ở `/sell`, và 4 nút mở lightbox trong `PostCard` (ảnh `alt=""` nên nút phải tự đặt tên). Sửa theo cùng lối bền vững: `label` thành prop **bắt buộc** của `ToggleSwitch` + `aria-label` trên control (không phải trên `<div>` bọc — `title` ở wrapper **không** đặt tên cho button bên trong). Cũng verify runtime bằng MCP: chặn `fetch` một endpoint trả 4xx/5xx qua `initScript` để bắt nhánh lỗi chạy thật (categories ra "Hệ thống đang bảo trì"), không cần đụng backend. Quét lại `/`, `/cart`, `/shop`, `/sell`, `/orders`, `/sell/orders`, `/admin*`: **0 control không tên, 0 nút icon méo, 0 icon bẹp**. 3 nghi ngờ tự loại sau khi đo (`rounded-full` là pill **chữ**, badge header 36→42px là padding chứ không overflow, `'0 đ'` khớp nhầm bên trong số lớn hơn). +22 test / +3 file → **746 test / 106 file** |
| 2026-08-15 | **SWEEP-0815b · BE trả lời 4 mục inbox → triển khai phần FE làm được ngay** (class **B** — BE cũ vẫn đúng). Không tin nhãn "done" của handoff: đọc `release-gate.md` rồi `git branch --contains` trong `api/` mới thấy **CHAT-ROOM-01 (`1ea9ed6`) và UPLOAD-SIZE-01 (`5ceb46c`) chỉ nằm trên branch, chưa có trên `origin/main`** ⇒ chia việc theo cái thật sự đang chạy trên prod, không theo cái BE viết. **IDLEAK-02 — làm đủ**: `submittedBy?: string \| null` trên `PendingBrand`+`PendingCategory` (`types/catalog.ts`), helper thuần `features/admin/submitterLabel.ts` (null/undefined/chuỗi rỗng → `—`; vẫn nhận `number` **cố ý** vì prod còn trả PK số) thay cho `#{brand.submittedBy}` ở `PendingBrandsPage.tsx:101` + `PendingCategoriesPage.tsx:101` — bỏ luôn dấu `#` vì ghép `#` vào `usr_…` là rò id opaque ra UI; `TopProductStat.productId` nới thành `string \| null` (0 consumer — `AnalyticsDashboard` chart theo `productName`). FE ship trước BE **an toàn**: prod trả `23` thì render `23`. **UPLOAD-SIZE-01 — làm nửa an toàn**: `maxBytes`/`maxVideoBytes` (optional) trên `UploadSignature` + `resolveUploadCap()`/`oversizeMessage()` (`lib/http/uploadValidation.ts`) + chặn theo cap của server ngay đầu `uploadChunked` — field vắng thì fallback về hằng số cũ nên **BE cũ lẫn mới đều đúng**, và bắt được đúng cái bất đối xứng BE chỉ ra (ảnh 11 MB vào `trybuy/posts` lọt trần video 100 MB). Test pin caps **không bao giờ** được append vào form (param không ký ⇒ hỏng chữ ký SHA1, đúng vết UP-05). **Cố ý KHÔNG gửi `?bytes=`** — BE prod hiện tại sẽ trả `400 "property bytes should not exist"` ⇒ chết mọi upload. **CHAT-ROOM-01 — cố ý 0 dòng**: bỏ `joinAll` bây giờ là mất chuông + mất preview cho mọi hội thoại không mở. **UP-03(i)**: BE làm server-side (GC có đếm tham chiếu), FE giữ nguyên `RichTextEditor.tsx:66-71`. **Bonus — bug thật bắt được lúc verify bằng Chrome DevTools MCP**: cả 2 trang duyệt `map()` ra `<>` trần rồi đặt `key` lên `<tr>` bên trong ⇒ React log `Each child in a list should have a unique "key" prop … from PendingCategoriesPage` và **reconcile hàng theo vị trí** (duyệt/từ chối 1 hàng giữa danh sách → hàng dưới kế thừa state của hàng trên, gồm cả ô "Lý do từ chối" đang mở). Sửa: `<Fragment key={x.id}>`, bỏ `key` thừa trên `<tr>` + `<tr>` reject. +4 test / +2 file → **724 test / 103 file**. Đã flip ô `frontend` của IDLEAK-02 sang ✅ trong `release-gate.md` (entry vẫn Holding: `web-flow-GHN` còn ⏳) |
| 2026-08-15 | **SWEEP-0815 · triage backlog "chờ backend" — 0 dòng code FE, 2 mục stale bị clear, 3 mục lần đầu được hỏi BE thật** (class **A**, chỉ doc + inbox). Không sửa `src/**`: đi soi từng mục rồi mới kết luận, và kết luận là **không mục nào còn việc cho FE**. Clear vì **stale**: (1) **P0-03 "update chưa chắc atomic"** — PATCH-ATOMIC-01 (2026-08-12) đã trả lời từ 3 ngày trước mà snapshot vẫn treo: **không atomic và không thể atomic** (MySQL catalog vs Postgres inventory, không transaction chung, không compensation cho update) ⇒ `onError` refetch ở `CreateProductPage.tsx:220-254` là **guard vĩnh viễn**, chuyển sang §Guard cố ý giữ; lời dặn "invalidate cả `skuList`" **đã tự thoả mãn** vì `products.detail(id)` = `["products", id]` là prefix của `["products", id, "inventory"]` (`queryKeys.ts`). (2) **"Ảnh post 404 — prod chưa quét"** — quét prod hôm nay: feed prod có đúng **1** post `imageUrls: null` và **0** URL Cloudinary ⇒ không có gì để dọn. Nguyên nhân gốc khiến 2 mục còn lại treo vô hạn: chúng nằm ở snapshot FE dưới nhãn "chờ backend" nhưng **chưa bao giờ được viết vào inbox của BE** — nay đã filed: `UP-03(i)` (orphan ảnh nhúng trong `description`; dẫn `product.service.ts:1626/:1640` — `destroyDroppedImages` chỉ diff `imageUrls`) và `UPLOAD-SIZE-01` (`upload.service.ts:48` mới ký `allowed_formats&folder&public_id&timestamp`; `MAX_IMAGE_BYTES` bên FE chỉ là guard UX). Thêm `CHAT-ROOM-01`: ask FE→BE về emit `new_message` theo room user nằm **nhầm inbox** từ 2026-06-30 (đặt ở `frontend-handoff.md` = file BE không đọc) → chuyển sang `backend-handoff.md`, vẫn còn đúng (`chatPresenceSocket.ts:41` `joinAll`, `:89` re-join). `submittedBy` giữ `number`: đo lại prod, `topProducts[].productId` vẫn là `23` ⇒ hold class C còn hiệu lực. Ghi kèm block "đã kiểm chứng — KHÔNG phải bug" vào inbox BE để lượt sau khỏi đi truy lại. Gate trên working tree đang có (từ FE-DEBT-0814): build ✓ · lint **0 problem** · 708 test / 100 file xanh |
| 2026-08-13 | **BE-REPORT-0813 · dọn nốt 3 FYI cuối của inbox BE + đóng DEPLOY-0813** (class **B**). `IDLEAK-01`: BE bảo "no FE change needed" — vẫn đi soi từng consumer thay vì tin: `checkStock` không đọc `productId`, `reviewedBy` vốn đã `string \| null`, `moderatorId` **không có consumer nào**, `client.ts` chỉ đọc `message` + status nên ENVELOPE-01 vô hình; thứ duy nhất sai là **fixture test** `postModeration.test.ts` còn assert `'Post 7 not found'` (social 404 giờ bỏ id) → sửa. `submittedBy` **cố ý giữ nguyên `number`** đúng như BE dặn (class C, BE giữ). `GHN-CREATE-01`: BE cũng bảo không cần sửa, nhưng nhánh fallback sẽ ném **tiếng Anh kèm tên endpoint nội bộ** (`pick a district from GET /api/shipping/districts`) vào mặt người mua trong UI tiếng Việt → helper thuần `features/cart/checkoutSubmitError.ts` đưa refusal của GHN về **đúng câu của banner phí ship**, mọi message khác giữ nguyên; `isGhnAddressRefusal()` khoá theo **400 + từ vựng địa chỉ GHN** nên 400 hết hàng/voucher không bị đổi lời, và strip luôn đuôi `— pick a … from GET …` cho cả banner. Tiện thể sửa bug tiềm ẩn ở call site: nó `String(err.message)` vô điều kiện nên có lúc in ra chữ `"undefined"`. **Verify prod (MCP)**: cả 3 fix BE của DEPLOY-0813 **đã lên prod** — comments/replies có `author`, `refundAmount` là number, ward lệch quận trả **400** đúng 3 câu đã code; và **nhánh `author` thật đã render được ở runtime** (bundle local trỏ API prod, `/post/…` in `shop1`/`user1` + reply lồng cấp, không còn chữ `Người dùng`, không rò `usr_`) — đây là món lượt trước còn nợ. Không probe `POST /api/order` trên prod: đoán sai là đặt đơn thật. +9 test / +1 file. **ĐÃ LÊN PROD 2026-08-13 21:03** — 8 commit `14dac67..80de0b3` push → CI → Deploy; bundle live đổi `index-BRya1NEn.js` → `index-CK3z688j.js`, chunk `CheckoutPage` mang `from GET` + `Đặt hàng thất bại`, `PostDetailPage` in `Người dùng` **không** kèm `#` |
| 2026-08-13 | **BATCH-0813 · drain 5 entry BE inbox trong một lượt** (class **B** — old FE vẫn đúng). `SOCIAL-AUTHOR-01`: `Comment.author: PostAuthor \| null` (tái dùng type của post, không khai thêm type gần-trùng) + helper thuần `features/social/commentAuthor.ts` → `CommentNode` render username/avatar thật, và khi `author` vắng/null thì ra `Người dùng` **không kèm id** (trước là `Người dùng #usr_xxx` — rò id opaque ra UI) · `RET-NUM-01`: bỏ `Number(refundAmount)` ở 3 trang trả hàng — `formatVnd` đã nhận `number \| string` nên chạy đúng với **cả** BE cũ (`"45000.00"`) lẫn BE mới · `ORD-RBAC-01`: xoá 3 wrapper chết `ship`/`deliver`/`complete` trong `api/orders.ts` (0 call site, giờ admin-only) + để lại comment vì sao seller dừng ở `ready-to-ship` · `GHN-DIST-01` và `PATCH-ATOMIC-01`: **không cần sửa code** — cascade reset ward/district và invalidate ở nhánh `onError` đã đúng sẵn; vì BE change làm cascade thành load-bearing (ward lệch giờ là 400 chặn đặt hàng) nên pin lại bằng 2 RTL test. **Verify prod (Chrome DevTools MCP)**: cả 3 thay đổi BE **chưa deploy** — `/social/posts/:id/comments` + `/replies` chưa có `author`, `refundAmount` vẫn là string `"45000.00"`, `shipping-fee` ward lệch quận vẫn trả 201. Chạy build mới trỏ vào API prod: comment + reply lồng cấp ra `Người dùng` sạch id, `/returns` in `45.000 đ`/`90.000 đ`/`160.000 đ` đúng ⇒ degrade an toàn, đúng class B. +8 test / +2 file. **Cập nhật cuối ngày 2026-08-13:** cả ba đã lên prod và verify lại — xem dòng BE-REPORT-0813 ở trên |

## Active Tasks — open / blocked

### Chờ backend (chỉ backend mới đóng được — FE không mitigate thêm được gì)

*(Mục nào ghi "BE inbox `<id>`" thì **đã có entry trong `../.agent-local/backend-handoff.md` §Open**
từ 2026-08-15 — trước đó chúng chỉ nằm ở file này, tức là chưa ai thật sự hỏi BE. Đừng viết entry
mới, cập nhật entry cũ.)*

*(2026-08-15, lượt 2 — BE đã trả lời **cả 4** mục từng nằm ở đây. `UP-03(i)` đóng hẳn (BE làm,
FE không phải sửa gì); `submittedBy`/IDLEAK-02 đã làm xong phía FE — xem Recent closes. Hai mục
còn lại dưới đây **không còn chờ BE viết code** nữa, chúng chờ BE **push**: cả hai đang nằm trên
branch chưa merge, đã verify bằng `git branch --contains` trong `api/`, không phải đoán.)*

- **CHAT-ROOM-01 — BE xong nhưng CHƯA lên prod; FE **cố ý chưa dọn**.** `1ea9ed6` chỉ có trên
  branch `feat/chat-room-01-user-rooms`, **không** có trên `api` `origin/main` (đo 2026-08-15).
  Nên `joinAll()` (`chatPresenceSocket.ts:41`) + re-join theo query cache (`:89`) vẫn là **thứ duy
  nhất** làm presence socket nhận được `new_message`; bỏ bây giờ là mất tiếng chuông và mất cập
  nhật preview cho **mọi** hội thoại không mở, cho tới khi BE merge. Bỏ ngay sau khi BE push (FE
  đổi một mình được, không cần entry Holding — `emit('join')` vẫn sống nên hai chiều đều đúng).
- **UPLOAD-SIZE-01 — nửa còn lại (`?bytes=`) chờ BE push.** FE đã đọc `maxBytes`/`maxVideoBytes`
  từ response chữ ký (fallback về hằng số cũ khi field vắng ⇒ chạy đúng với **cả** BE cũ lẫn mới).
  Chưa gửi query param `?bytes=file.size` vì `5ceb46c` cũng chỉ nằm trên branch
  `fix/upload-size-01-server-cap`: BE hiện tại nhiều khả năng trả **400 "property bytes should not
  exist"** (đúng cái bẫy đã ghi ở `backend-handoff.md` §DEPLOY-0813) ⇒ **hỏng mọi upload**. Thêm
  param sau khi BE lên prod. Lưu ý: đây vẫn **không phải** security guard — BE đã probe và
  Cloudinary không cho ký tham số size, client bỏ qua vẫn upload được.

### Guard cố ý giữ — đừng "dọn" khi refactor

- **`onError` refetch ở form sửa sản phẩm** (`CreateProductPage.tsx:220-254` — invalidate
  `products.detail(id)` + `products.withInventory(id)`). **Vĩnh viễn, không phải TODO.**
  PATCH-ATOMIC-01 (2026-08-12) trả lời dứt điểm: nhánh update **không atomic và không thể atomic** —
  catalog (MySQL) và inventory (Postgres) là 2 service DB riêng, không có transaction chung và
  không có đường compensation cho update, nên `PATCH` có thể đã ghi xong một phần trước khi bước
  inventory hỏng. Refetch để lấy lại baseline diff thay vì tin view trước khi submit; form giữ
  nguyên input của seller vì nó chỉ seed một lần. Lời dặn kèm theo của BE ("invalidate cả
  `skuList`") **đã tự thoả mãn**: `products.detail(id)` = `["products", id]` là **prefix** của mọi
  key con, kể cả `["products", id, "inventory"]`.
- **`resolveResultOrderId()`** (`features/payment/paymentResultParams.ts`) chỉ nhận shape `ord_…`,
  id số → fallback `/orders`. BE đã fix redirect từ **2026-08-07** (`order=ord_<16>`) nên deep-link
  đã tự sống lại, nhưng payment row tạo **trước** ngày đó vẫn giữ URL cũ có `?order=<số>` — chữ ký
  VNPay phủ `vnp_ReturnUrl` nên không rewrite server-side được. Chỉ bỏ guard khi đám pending cũ đã
  hết hạn.

### Còn lại phía FE

*(verify từ code thật 2026-08-14; không mục nào chặn runtime — đây là scale-consistency + lint)*

- **OVERFETCH-01 (phần FE) — ĐÃ LÊN PROD 2026-08-21, verify bằng MCP.** Audit response GET
  (mục OVERFETCH-01 trong `../.agent-local/backend-handoff.md`) → BE đã cắt 6 field và thêm 3
  embed `{id, username, avatar}`. FE đã dọn xong:
  - **Xoá type chết:** `Role.slug`, `Conversation.user1LastReadAt`/`user2LastReadAt`,
    `ReturnRequest.previousOrderStatus`, `FollowerItem.followerId`, `FollowingItem.followingId`.
    `tsc` chỉ gãy ở fixture test ⇒ chứng minh không có code sản phẩm nào đọc chúng.
  - **Xoá field FE tự bịa:** `ProductSku.stock` (BE không có cột này — fallback `s.stock` ở
    `CreateProductPage.tsx:111` là nhánh chết) và `Product.categoryId` số ít.
  - **Dùng embed mới:** `userSummaryLabel()` (`src/lib/format/user.ts`) — `@username`, fallback
    `#id` khi embed vắng (response cũ / id null). Dùng ở `ReportedPostsPage` (cột người báo cáo),
    `notificationDisplay` (comment/reply nêu tên actor, fallback "Có người" chứ **không** phải id
    thô), `returnRequest.reviewerLabel()` → `ReturnRequestsPage`.
  - `FollowUser` giờ là alias của `UserSummary` (`src/types/user.ts`) — một định nghĩa duy nhất.
  - **Hậu kiểm (FE báo → BE sửa cùng ngày):** `actor` lúc đầu ra nullable cả ba field trong khi
    `reviewer`/`reporter` non-null. BE đã pin shape bằng type `NotificationActor` và chỉ phát
    embed khi có đủ `publicId` + `username` ⇒ **hoặc đầy đủ hoặc `null`**, không nửa vời. Ba embed
    giờ chung đúng một shape ⇒ `UserSummary` khai non-null là đúng sự thật. **Không đổi code FE.**
    Vẫn giữ nhánh fallback trong `userSummaryLabel()` vì nó lo luôn ca embed **vắng** (response cũ).
  - **`actor` có cả trên WS:** event `notification` (namespace `/notifications`) chạy cùng
    `exposeReferences` nên mang embed y hệt. `notificationSocket.ts` vốn type payload là
    `Notification` và đẩy thẳng vào cache ⇒ toast/bell nêu tên người ngay từ socket, **không** cần
    `GET /api/notifications` bồi thêm. Không phải làm gì.
  - **Verify prod 2026-08-21 (Chrome DevTools MCP, 6 commit `c42d1d4..a8b165e`):** vì change này
    **cố ý vô hình** dưới BE cũ, UI test không phân biệt được bundle cũ/mới ⇒ chứng minh deploy đã
    lên bằng cách **grep chuỗi chỉ code mới mới có** trong chunk đang phục vụ (`"Người duyệt"`,
    `"Có người"`) — so hash chunk không đáng tin vì build prod khác env. Kết quả: `Người duyệt:
    @shop1`/`@admin1` render trên return request đã xử lý (hàng `pending_review` đúng là để trống),
    notification ra `@shop1 vừa bình luận về bài viết của bạn: "…"` không rò `usr_`, và API prod
    đã sạch `previousOrderStatus` / `Role.slug` / read-cursor hội thoại / `followerId`.
  - **Cột người báo cáo — verify prod 2026-08-21 (user cho phép tạo dữ liệu thử).** Prod vốn có
    **0** report nên phải tự sinh: `shop1` báo cáo bài của `user1` qua chính UI (`post_JS61MaVvS7tVJiA9`,
    lý do gắn tiền tố `[TEST]`) → `/admin/reports` bằng `admin1` in **`@shop1 · [TEST]…`** ở cả tab
    *Chờ xử lý* lẫn *Đã bỏ qua*, `hasRawId: false`; API trả `reporter: {id, username, avatar}` non-null
    đúng shape `UserSummary`. **Đã dọn:** bấm *Bỏ qua báo cáo* ngay sau khi kiểm ⇒ hàng đợi pending
    về 0, report nằm ở `dismissed`. Lưu ý cho lượt sau: report bài viết **không** có embed `reviewer`
    (`reviewedBy` không nằm trong response `admin/reports`) — khác return request; đó là thiết kế BE,
    không phải thiếu sót.
  - **Prefill ma trận SKU — verify prod 2026-08-21 (user cho phép tạo dữ liệu thử).** Prod trước đó
    không có sản phẩm nào mang `skus[]` nên phải tự tạo: `shop1` đăng
    `[TEST SKU-MATRIX] Áo thun TryBuy` (`prod_82NLlCVqNmyiuK9b`, danh mục *Phụ kiện*, nhóm *Màu sắc*
    = Đen/Trắng, mỗi dòng 10.000đ · kho 50) qua chính form `/sell`, **không ảnh** — `missingFields()`
    chỉ chặn tên/danh mục/giá nên ảnh không bắt buộc. Mở lại `/sell/prod_82NLlCVqNmyiuK9b`: switch
    *Nhiều phân loại* bật sẵn, tên nhóm + 2 dòng ma trận hydrate đúng `10000` / `50`, checkbox
    *Phụ kiện* tick sẵn, **0 console error**. Sản phẩm này còn là ca `sku: null` **thật** trên prod
    (cả `product.sku` lẫn `skus[].sku` đều null vì BE không tự sinh mã cho nhánh có phân loại) ⇒
    chính là dữ liệu từng làm trắng trang trang sửa; nay không lỗi. Ô search `/shop` gõ `áo thun`
    lọc còn `1/24`, không crash — phủ nốt crash site thứ hai của SKU-NULL-01 bằng dữ liệu thật.
    **Giữ lại sản phẩm này** làm fixture prod cho lượt sau (giá 10.000đ, đang hiển thị).

- **Lint: 0 warning.** 3 advisory cũ đã đóng 2026-08-14. `context/AuthContext.tsx` tách làm ba:
  `authContextValue.ts` (context object) + `useAuthContext.ts` (hook) + `AuthContext.tsx` (chỉ còn
  provider) — 11 importer repoint sang `@/context/useAuthContext`. Hai cái trong
  `src/components/ui/` (`badge.tsx`, `button.tsx`) không sửa được vì folder write-blocked, nên tắt
  rule bằng override **có scope đúng folder đó** trong `eslint.config.js`. Từ giờ warning nào sống
  sót qua `npm run lint` là warning thật — không còn nhiễu nền.
- **Arbitrary sizing/radius — đã convert hết phần có token khớp đúng byte; phần còn lại là cố ý.**
  Dọn 2026-08-14, tổng 94 occurrence:
  - `rounded-[10px]`/`rounded-[20px]` → `rounded-tb-input`/`rounded-tb-sheet`: **43 → 0**. Không
    còn `rounded-[…]` nào trong `src/`.
  - Spacing (`px/py/pt/pb/pl/pr/p/m*/gap/top/left/w/h/size`) có token đúng byte — 2px→0.5,
    10px→2.5, 14px→3.5, 40px→10, 44px→11, 64px→16: **99 → 53**.
  - `text-[Npx]`: **122 → 117**. Chỉ đổi 5 site đã tự pin `leading-*` (4× `text-[36px]`→`text-4xl`
    kèm `leading-[1.05]`, 1× `text-[18px]`→`text-lg` kèm `leading-relaxed`).

  53 + 117 còn lại **giữ nguyên có chủ đích**: 18/22/26/34/42/46/52/60/68/72/76/84px và các
  container width không có token nào khớp đúng — đổi là dời pixel. Riêng `text-[14px]` (7) và
  `text-[16px]` (3) *có* `text-sm`/`text-base` nhưng named size kèm luôn `line-height` mà 10 site
  đó không pin `leading-*`, nên đổi sẽ đổi cả khoảng dòng → bỏ qua.

  > ⚠️ Đừng convert kiểu regex quét cả `src/`. Lần thử 2026-08-14 làm hỏng 92 file vì `\[` trong
  > chuỗi `node -e` bị bash nuốt thành character class (`top-0` → `top-px0.5.5`). Nếu phải quét,
  > viết script ra **file**, match cả class token có biên hai đầu, và self-test trước khi ghi.
- **Hex + raw-palette: sạch.** Grep toàn `src/` chỉ còn 3 file dính hex: `index.css` (được
  phép), `assets/react.svg` (asset), và `features/order/analytics/AnalyticsDashboard.tsx`
  (19 literal — AN-01(c) bên dưới).
- **AN-01(c) · recharts hex literals** trong `AnalyticsDashboard` (SVG không ăn Tailwind, đã có
  comment justify + đã whitelist ở `.ai/workflows/check-tailwind.md`). Chỉ extract
  `chartTheme.ts` **nếu** thêm chart thứ 2 — conditional, không phải việc đang mở.

## Perf — đo thật, phần còn mở

Lighthouse/LCP: số đo **2026-07-02** (prod build qua `vite preview`, headless, simulated
throttling) — chưa đo lại. Bundle: số đo **2026-08-04** (`npm run build`). Re-run:

```bash
npx -y vite-bundle-visualizer -t list -o <out>.yml
npm run build && npx vite preview --port 4173
npx -y lighthouse http://localhost:4173/login --only-categories=performance \
  --output=json --output-path=<out>.json --chrome-flags="--headless=new"
```

- **Lighthouse `/login`:** Perf **78** · FCP 3.7s · LCP 4.2s · TBT 0ms · **CLS 0** · SI 3.7s.
- **Bundle (chunk phát ra, 2026-08-04):** `index` 475,0 kB / gzip 149,1 kB (react-dom +
  react-router + tailwind-merge — bình thường với stack này) · `CreateProductPage` 457,3 kB /
  gzip 142,9 kB (TipTap + ProseMirror) — đã route-lazy; muốn giảm nữa thì dynamic-import riêng
  phần editor · `useAnalyticsFilters` 402,1 kB / gzip 116,0 kB (recharts, chunk chứa
  `AnalyticsDashboard`) — route-lazy, chấp nhận · `schemas` 93,0 kB / gzip 27,9 kB
  (react-hook-form + zod). ⚠️ Con số "245 kB" cho `schemas` ở bản snapshot cũ là **module size
  từ bundle-visualizer**, không phải chunk phát ra — hai metric khác nhau, đừng so trực tiếp.
  Nhận định cũ "trang login kéo cả chunk, 87% unused → tách schema per-form" chưa đo lại.
- **🟡 Marketplace LCP 1.44s, trong đó load delay 1.38s** (đo 2026-07-02) — waterfall SPA (boot
  JS → `GET /products/with-inventory/all` → render → mới request ảnh). Ảnh LCP hồi đó fail cả 3
  check LCPDiscovery. **Hai trong ba đã đóng (verify code 2026-08-05):** `fetchPriority` giờ có ở
  8 chỗ (`ProductCard.tsx:40`, `ProductDetail.tsx:191`, `PostCard.tsx:188/204/234`,
  `PostDetailPage.tsx:170/180`, `WishlistPage.tsx:29`) và chỉ còn 3 `loading="lazy"` **đều là
  ảnh non-LCP** (`RightRail.tsx:111`, `ProductDetail.tsx:215`, `PostCard.tsx:215`). Check thứ ba
  — ảnh không discoverable từ HTML — vẫn đúng và là bản chất SPA. **Chưa đo lại LCP sau thay
  đổi này.** Win thật còn lại là rút ngắn waterfall, không phải attribute ảnh.
- Feed `/`: LCP 718ms (714ms là render delay = JS boot của SPA) · CLS 0 — OK.
- Forced reflow ~31ms trong `index` chunk (minified, chưa attribute được về source — cần trace
  có sourcemap nếu muốn đào).

> Ngoài tầm static scan (phải ĐO, không đoán): re-render thật → React DevTools Profiler; bundle
> size → visualizer; LCP/CLS/INP → Lighthouse. `/check-perf` chỉ bắt được mức grep.

## Runtime verification còn nợ

Cần full-stack live (FE↔BE) và/hoặc 2 tài khoản; không repro được qua UI thường:

> ✅ **BATCH-0811 đã verify đủ 6/6 trên prod 2026-08-13** — không còn nợ mục nào.
>
> **Cách đẩy một đơn tới `delivering`/`completed` trên prod mà không có webhook GHN thật** (mở khoá
> mọi kịch bản trả hàng / hoàn tiền, kể cả mục F2 dưới đây): đăng nhập `shipping1` (quyền
> `shipping:update:any`) rồi `POST /api/order/admin/ghn/orders/:id/demo-status` với
> `{ ghnStatus }` — `picking`→`shipped`, `delivering`→`delivering`, `delivered`→`completed`.
> Prod đang bật `GHN_DEMO_ENDPOINTS_ENABLED=true` (project demo cố ý giữ true). Đơn phải đã có
> waybill (`ready-to-ship` xong) thì mới đi tiếp được; mapping forward-only nên đã `completed`
> hoặc `canceled` thì mọi status sau đó bị bỏ qua.

- P0-03 / P0-04 / P0-05 — endpoint self-test happy-path + 409/idempotency.
- Chat **reconnect** (ngắt mạng giữa chừng) — nhánh cuối của P1-06; phần E2E 2 tài khoản đã chạy
  trên prod 2026-08-13 (user1 ↔ shop1, hai chiều, không reload).
- Trả hàng nhánh **từ chối** — nhánh cuối của F2; nhánh duyệt + hoàn tiền + trả tồn kho đã chạy full
  E2E trên prod 2026-08-13. F3 voucher — cần admin tạo voucher thật trước.
- Forgot-password success-leg — code thật chỉ in ở console user-service (SMTP tắt ở dev).
- Upload error path (UP-01/02/03/04/06) — không ép được file lỗi / fail giữa batch qua picker.
- Batch >50 product id (SEC-H2) — cần 51 SP distinct trong cart.
- Cart item stale/foreign 404 — cần forge foreign item id.
- Public profile privacy · media cap 10 · `keepPreviousData` visual check.
- **Mobile** — viewport emulation chưa hoàn tất lần nào (Vite dev process chết giữa chừng ở
  audit 2026-06-30). Login → add cart → checkout → order trên mobile vẫn chưa verify.

## Pitfall đã trả giá

Đã chuyển sang `.ai/context/pitfalls.md` (13 mục, on-demand) — pitfall là kiến thức vĩnh viễn,
không thuộc live-picture. Đọc file đó khi debug thứ "trông đúng mà không chạy".

## Definition of production-ready

- Toàn bộ P0 đóng và được regression test; không còn 2 cart source of truth.
- Không thể tạo order trùng do retry; cart online payment chỉ consume sau success.
- Product create/edit bảo toàn inventory/SKU/variation/ảnh.
- Seller/buyer nhìn cùng một order state machine.
- Mobile hoàn thành login → add cart → checkout → order.
- `build`, `typecheck`, `lint`, `test:run` đều pass trong CI.
- Không console error / failed request chưa xử lý trong happy path.

## Test data / convention reference

- **Ảnh test khi tạo product** (Chrome DevTools MCP / manual): ảnh local trong `public/` —
  `imag1.png`, `image2.png`, `image_screen_1.png`, `screen_2.png`. Không để product không có
  ảnh (tránh fallback `src=""` của P2-02). Dùng `mcp__chrome-devtools__upload_file` trỏ đường
  dẫn tuyệt đối cho file input ở `BasicInfoSection`.
- Test accounts: `../.agent-local/test-accounts.md`.

## History

Việc đã xong — toàn bộ item P0/P1/P2, các sweep đã đóng, và lý do của từng thay đổi — nằm trong
`CHANGELOG.md` (cùng thư mục, không auto-load). Đọc khi cần lịch sử của một thay đổi cụ thể.

> Backlog của **bộ context agent** (`.ai/`, `.claude/`, `.codex/`) — khác backlog sản phẩm ở trên —
> nằm ở `context-system-backlog.md` cùng thư mục. `/sweep` không đọc file đó.
> Đợt audit 2026-08-03/04 đã đóng **hết**, file đó giờ là sử liệu chứ không còn việc.
> Từ nay dùng `/sync-context` để rà drift doc↔code thay vì làm tay.
