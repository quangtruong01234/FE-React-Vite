# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-10-08 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
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

**Gates (chạy lại 2026-10-08, sau `/sweep` "làm hết"; bundle 710,979 / 750,000):** `npm run build` ✓ · `npm run check:bundle` ✓ ·
`npm run lint` 0 error · `npm run test:run` **1765 test / 195 file**, all pass. Không đóng item
nào khi 4 lệnh này chưa xanh. E2E smoke (không thuộc gate) **43/43 pass, 0 skip** trên stack local
2026-10-05 (`/sweep audit`, gateway uptime không reset trong lượt chạy; dev server đang chạy sẵn — fail lạ thì khởi động lại trước, pitfalls §18).

> ⚠️ `npm run build` **mới** thực sự typecheck từ 2026-08-04. Trước đó script chỉ là `vite build`
> (esbuild vứt type) trong khi doc ghi là có `tsc` → 3 lỗi type nằm im 2 tuần. Chi tiết +
> bài học → `.ai/context/pitfalls.md` mục 9, lý do → `CHANGELOG.md`. Mọi con số gate ghi trong
> CHANGELOG **trước** ngày này chỉ chứng minh bundle build được, không chứng minh type sạch.

**Production gate:** không release trước khi P0 đóng *và* có regression test cho
login → product → cart → checkout → payment/order.

## Recent closes (chi tiết → `CHANGELOG.md`)

*(Trim 2026-09-16 (lần 2): **cây HOLD đã mở — cả 10 hàng của 2026-09-14…16 đã push + released.**
`frontend` `origin/main` = **`2c65b1d`** (đo bằng `git ls-remote`, không tin ref local) và `api`
prod = **`87fc2f8` từ 2026-09-16 14:39Z**, sau khi user khôi phục DEPLOY-PG-01 bằng run
`35109797956`; SEARCH-01 (`?search=` trên `/social/posts`, `/user/search`) và `PATCH /user/:id/role`
đều probe được trên chính prod. Ngoại lệ "giữ hàng chưa push dù quá 5" vì thế **hết hiệu lực** ⇒
trim về 5 hàng; 6 hàng rời đi (NAME-TRIM-01, LOGO-01, AUTHOR-NAME-01, SEARCH-01-FE, CHART-SWAP-01,
rồi ROLE-ADMIN-01 2026-09-15 khi hàng CONFIRM-PAD-01 chen vào) vẫn nằm nguyên văn trong
`CHANGELOG.md` — đã grep từng cái trước khi xoá.*

*📌 **Bảng này không ghi trạng thái push nữa.** Đó chính là thứ vừa mục ở trên: một chữ "chưa
push" viết hôm nay thành lời nói dối vào ngày mai mà không ai đụng vào file. Muốn biết cây đã lên
chưa thì **đo**: `git ls-remote origin main` so với `git rev-parse HEAD`, rồi `gh run list` cho
deploy — mất 2 giây và luôn đúng. Trạng thái release liên-repo nằm ở
`../../.agent-local/release-gate.md`.*

*⚠️ **Bài học, và nó đã cắn đúng một lần:** một dòng "CHƯA push" trong snapshot **không phải phép
đo** — nó là ảnh chụp lúc viết, và nó không tự già đi. Chiều 2026-09-16 tôi đọc đúng mấy dòng này
rồi báo user rằng prod BE vẫn là `d8b7f4e`, và **loại 3 tính năng khỏi tài liệu dùng thử** vì tưởng
chúng chưa lên — trong khi `release-gate.md` §Holding và `backend-handoff.md` §Done đều đã ghi
ngược lại từ trước đó. Phép đo đúng luôn là `git ls-remote` + probe runtime trên chính prod, rồi
mới tới doc.)*

| Ngày | Item |
|---|---|
| 2026-10-08 | **`/sweep` "làm hết" — IMG-CAP-01 · MOBILE-OVERFLOW-01 · PERF-E2E-01 · DEMO-RETRY-01 vòng 3 + trả 9 nợ runtime** (class **A**). IMG-CAP-01: form SP cắt ảnh ở **6** (BE cho 10) và cắt *trước* khi tới `capImageBatch` ⇒ ảnh 7–10 rơi im lặng; giờ đếm theo `MAX_PRODUCT_IMAGES`, cả lô vào hook. MOBILE-OVERFLOW-01: header 380px/390px, `/cart` 560px, `/product/:id` 425px trên điện thoại ⇒ trang trượt ngang, tap "ĐẶT HÀNG" trúng phần tử khác; sửa `grid-cols-1` + dải thumbnail `overflow-x-auto` + header gọn dưới `sm`, khoá bằng `mobile-layout.buyer` (360 + 390). PERF-E2E-01: project `perf` + `npm run test:perf`. DEMO-RETRY-01: `request()` không gửi lại 503 khi demo mode. |
| 2026-10-07 | **PRODUCT-QA-01 · hỏi đáp sản phẩm bằng AI trên `/product/:id`** (`/pair` với `api-b1`, class **B**, **push `api` trước** — FE lên trước thì mọi câu hỏi ra 404 "sản phẩm không còn bán"). `ProductQuestionBox` (3..300 ký tự sau trim, marker `[n]` → `<sup>` + danh sách nguồn có badge, abstain `NO_SOURCES`/`LOW_CONFIDENCE` là trạng thái trung tính, live region + trả focus về textarea); `request()` có opt-out `skipOverloadRetry` để 503 `ASSISTANT_UNAVAILABLE` không bị gửi lại (mỗi lần gửi tốn 1 trong 5 lượt/phút). Đã đối chiếu API thật local: 200/abstain/400/404/429 khớp contract. Flow hỏi-đáp chưa có e2e (phụ thuộc LLM + rate limit) — còn nợ. |
| 2026-10-06 | **CAPTCHA-01 · Turnstile trên đăng ký + quên mật khẩu** (class **B**: field `captchaToken` optional, BE cũ bỏ qua). `captcha.ts` (loader 1 lần, `withCaptchaToken`, `isCaptchaRequired`) + `TurnstileWidget` (`interaction-only`, theme/ngôn ngữ theo app, reset sau **mọi** submit vì token dùng 1 lần); `CAPTCHA_REQUIRED` → "Vui lòng xác minh captcha lại", không gắn field. **Key trống ⇒ không widget, không field** — prod chưa có `VITE_TURNSTILE_SITE_KEY` nên chưa chạy thật (xem §Runtime verification còn nợ). |
| 2026-10-06 | **F10 · "Mua lại" trên `/order/:id`** (đơn `completed`/`canceled`; class **A**). `planReorder` đối chiếu sản phẩm *hiện tại* (`getMultipleWithInventory`): bỏ món đã xoá / ngừng bán / SKU đổi / hết hàng, kẹp số lượng theo tồn; `ReorderResultPanel` báo theo dòng; `/cart` chọn sẵn đúng các dòng vừa thêm (`initialCartSelection`). Mitigation vì `POST /cart` không kiểm tồn ⇒ BE inbox CART-STOCK-01. Deep `reorder.buyer` ✓. |
| 2026-10-06 | **F9 "Mua ngay" + F11 "Sản phẩm khác của shop"** (class **A**). F9: add → tìm dòng giỏ bằng `findCartLine` (productId + skuId) → `/checkout` với `selectedIds`; `useCart` ghi thẳng giỏ trả về vào cache. F11: `ShopOtherProducts` chỉ fetch khi cuộn gần tới (IntersectionObserver, không đè LCP), bỏ SP đang xem, tối đa 6. Deep `buy-now.buyer` ✓; MCP nút 450×48 icon lệch 0, dải 6 SP không tràn ngang. |

## Active Tasks — open / blocked

### Chờ backend (chỉ backend mới đóng được — FE không mitigate thêm được gì)

*(Mục nào ghi "BE inbox `<id>`" thì **đã có entry trong `../.agent-local/backend-handoff.md` §Open**
từ 2026-08-15 — trước đó chúng chỉ nằm ở file này, tức là chưa ai thật sự hỏi BE. Đừng viết entry
mới, cập nhật entry cũ.)*

*(2026-08-15, lượt 2 — BE đã trả lời **cả 4** mục từng nằm ở đây. `UP-03(i)` đóng hẳn (BE làm,
FE không phải sửa gì); `submittedBy`/IDLEAK-02 đã làm xong phía FE — xem Recent closes. Hai mục
còn lại dưới đây **không còn chờ BE viết code** nữa, chúng chờ BE **push**: cả hai đang nằm trên
branch chưa merge, đã verify bằng `git branch --contains` trong `api/`, không phải đoán.)*

- ~~**VOUCHER-BE-01**~~ — **ĐÃ ĐÓNG (BE push 2026-08-26 14:39).** `api` `origin/main` = `e10506f`;
  `git ls-remote` là cách đo đúng — lượt `git log origin/main` đầu phiên còn thấy `ad67e15` vì ref
  local chưa fetch, và tôi đã kết luận nhầm class **C** từ số liệu cũ đó. Cả cụm đã live và verify
  được trên prod: `PATCH /order/admin/vouchers/:id` → 200, `POST /order/vouchers/available` → 201.
  Entry gate nay là **B**, nằm ở *Ready to release*.
- ~~**CHG-PW-01**~~ — **ĐÃ ĐÓNG (2026-09-11): route đã sống trên prod.** Mục này ghi "chờ `api`
  push, `origin/main` vẫn `97fec7b`" từ 2026-08-29 và đã **stale** từ lâu. Đo lại bằng
  `git ls-remote`: `api` `origin/main` = `d8b7f4e`, và `8d2bfd7` (CHG-PW-02, nằm **sau**
  CHG-PW-01) là ancestor của nó. Bằng chứng mạnh hơn cả git: gọi thẳng
  `POST /api/user/change-password` trên prod hôm nay trả **`401` + `errorCode`**, không phải
  `404` — tức handler thật sự tồn tại và chạy. Vì thế **cây làm việc không còn là lớp C vì mục
  này nữa**, và tab "Bảo mật" trên prod không còn ra `404`. Nhánh `404` → *"chưa sẵn sàng"* trong
  `changePassword.ts` **đã gỡ** (đọc lại 2026-10-05; `changePassword.test.ts` khoá việc `404` không
  còn nói tính năng chưa có). Khi verify prod: **phải dùng tài khoản dùng-một-lần**, đừng đổi mật khẩu của
  `user1`/`shop1`/`admin1` — lượt 2026-09-11 chỉ gửi mật khẩu hiện tại **sai** nên không đổi gì.
- ~~**REPORT-TOTAL-01**~~ — **ĐÃ ĐÓNG (BE push 2026-08-2x).** `514e67c fix(social): exclude
  orphaned reports from the admin report queue` **đã có trên `api` `origin/main`** (đo lại
  2026-08-26 bằng `git log --oneline origin/main`; entry doc kèm theo là `ad67e15`). FE **không
  sửa dòng nào** — `ReportedPostsPage.tsx` chỉ đọc `totalPages`/`hasNext`, không đọc `total`. Còn
  nợ đúng một việc rẻ: khi prod sống lại, `admin1` mở `/admin/reports` curl 3 tab xem
  `total`/`totalPages` đã khớp `data.length` chưa. Hành vi "report sống lâu hơn post" nằm ở
  `.ai/context/domain.md` §8.

### Known issue còn mở — advisory `@tiptap/*` cố ý chưa vá (AUDIT-NPM-01, 2026-09-23)

Lượt vá npm 2026-09-23 hạ 46 → **41 advisory**; 41 cái còn lại **không có cái nào ship tới người
mua**. Phần chưa vá là họ `@tiptap/*` 3.26.0, chỉ nằm trên đường soạn thảo của seller
(`RichTextEditor` → `product-form/BasicInfoSection`). Chặn không phải do ta: npm 10.9.7 **crash**
(`Cannot read properties of null (reading 'edgesOut')`) khi giải peer pin exact-version của tiptap,
tái hiện ở cả `audit fix` lẫn `install` sạch. Ba đường vòng (`npm update` lẻ, `overrides`,
`--legacy-peer-deps`) đều để lại cây lệch **hỏng hơn** hiện tại — `npm update` từng tạo **hai bản
`@tiptap/core`** cùng lúc, mà ProseMirror so plugin key bằng identity. Thử lại khi npm sửa arborist
hoặc tiptap nới peer range. Bối cảnh + bài học "đừng xoá lockfile trước khi `--dry-run`" →
`CHANGELOG.md` §AUDIT-NPM-01.

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
- **Ba route bị email của BE deep-link tới** — `/order/:id`, `/orders`, `/sell/orders`
  (`router.tsx`). MAIL-UI-02 (2026-09-08): mail đơn hàng nay là HTML có nút CTA, URL dựng từ
  `FRONTEND_URL[0]` + đúng ba path này. Mail **đã gửi đi rồi thì không sửa lại được** ⇒ đổi tên hay
  bỏ một trong ba là làm chết link trong hộp thư người dùng, kể cả khi FE tự thêm redirect (BE còn
  đọc path để dựng URL mới). Muốn đổi thì **báo BE trước** và đổi hai phía cùng lượt. Không có gì
  để implement phía FE — cả ba route đã tồn tại, `/sell/orders` bọc `ProtectedRoute requiredRole="shop"`.
- **`resolveResultOrderId()`** (`features/payment/paymentResultParams.ts`) chỉ nhận shape `ord_…`,
  id số → fallback `/orders`. BE đã fix redirect từ **2026-08-07** (`order=ord_<16>`) nên deep-link
  đã tự sống lại, nhưng payment row tạo **trước** ngày đó vẫn giữ URL cũ có `?order=<số>` — chữ ký
  VNPay phủ `vnp_ReturnUrl` nên không rewrite server-side được. Chỉ bỏ guard khi đám pending cũ đã
  hết hạn.

### Còn lại phía FE

*(verify từ code thật 2026-08-14; không mục nào chặn runtime — đây là scale-consistency + lint)*

- 🟢 **E2E-DEBT — 0/30 route chỉ có smoke** (đo lại từ `e2e/routes.ts` 2026-10-05, `/sweep audit`:
  30/30 route có `deep` khác rỗng và mọi spec trong đó đều tồn tại; smoke 43/43 pass, 0 skip; `/messages` =
  `messages.buyer`, viết sau khi BE thêm `DELETE /api/chat/messages/:id` — CHAT-E2E-CLEANUP-01).
  **Nợ chạy:** `messages.buyer` và test ORDER-TIMELINE-01 trong `order-detail.buyer` **đã chạy xanh
  2026-10-04** (stack local; smoke `/order/:id`, `/returns`, `/sell/returns` cũng xanh trong lượt 43/43).
  Deep `return-request.buyer` + `seller-returns.shop` và lượt MCP cho picker ảnh RETURN-PHOTO-01
  **đã chạy xanh 2026-10-05** (`/sweep 3`) ⇒ **hết nợ chạy**. EMAIL-REAUTH-01 đã có nhánh từ chối trong `profile.buyer` (không bao giờ đổi
  email thật của account seed — nhánh thành công vẫn cố ý không tự động hoá).
  Trả hàng chỉ có nhánh **từ chối** trong suite — nhánh duyệt là hoàn tiền một chiều, cố ý không
  tự động hoá.
  Cách làm: `/e2e fill [n]` (`.ai/workflows/e2e.md`); `/sweep` chỉ chọn mục này khi không còn
  🔴/🟡. Mỗi route xong → bỏ khỏi danh sách và cập nhật số đếm; `/sweep audit` làm tươi lại con số.

- **DEMO-RETRY-01 — ĐÃ ĐÓNG. Cả 2 vòng đã lên prod (`50e773b`, `369dbc6`, `557d2b8`) và verify
  bằng MCP trên 10 route với EC2 tắt thật.**
  Console đỏ ở nhánh demo (backend nghỉ) là lỗi sản phẩm — đó là thứ người tuyển dụng nhìn thấy —
  và mỗi request rơi vào Worker là một invocation có tính tiền, thứ duy nhất trong hệ tính theo
  request.
  - **Vòng 1 (đã prod):** 4 read của layout (`notifications`, `notifications/unread-count`,
    `user/featured-sellers`, `social/users/:id/following` — do `NotificationBell` + `RightRail` phát)
    rơi xuống `offlineFallback` 503 rồi bị retry ⇒ 16 dòng đỏ; cộng 2 cảnh báo WebSocket vì MSW
    không chặn được socket.io. Sửa: mock cả 4 trong `lib/demo/handlers.ts`, và
    `createRefCountedSocket.acquire()` (`lib/realtime/socket.ts`) no-op khi `isDemoMode()`.
  - **⚠️ Đính chính — "console trống hoàn toàn" của vòng 1 chỉ đúng với trang feed.** Cả hai lần
    verify chỉ mở `/` và `/marketplace`. Quét lại **toàn bộ** route khách demo mở được (trên prod,
    EC2 tắt thật) thì còn **9 route bắn 8–12 lỗi 503 mỗi trang**: `/marketplace`, `/wishlist`,
    `/orders`, `/returns`, `/addresses`, `/messages`, `/checkout`, `/post/:id`, `/profile/:id`
    (`/cart` + `/notifications` đã sạch). Bài học: bug console phải đo trên **mọi route reachable**,
    không phải trên route mình tình cờ đang mở.
  - **Vòng 2 — sửa hai lớp** (`557d2b8`): (a) **14 handler** nữa trong
    `lib/demo/handlers.ts` + 4 fixture mới (`demoPublicUsers`, `demoOrderStatusCounts`,
    `demoPaymentOptions`) phủ hết read còn lại — rỗng là câu trả lời đúng sự thật vì phiên demo chưa
    từng ghi gì, mỗi trang render empty state thật; (b) **`retryQuery` trong `lib/query/queryClient.ts`**
    (`retry: 1` → hàm trả `false` khi `isDemoMode()`) làm lưới đỡ: read nào quên mock sau này chỉ tốn
    1 attempt/mount thay vì 2. Phải là **hàm** — module evaluate lúc import, trước khi
    `bootstrapBackendStatus()` resolve probe, nên giá trị đọc tại đó luôn là `online`.
  - **Thứ tự handler là một phần của fix:** MSW match theo thứ tự đăng ký và bỏ qua query string ⇒
    `/user/:id` phải nằm **dưới** `/user/me`, `/user/featured-sellers`, `/user/search` (cùng 2
    segment). Có test ghim thứ tự này — đừng sắp xếp lại `demoHandlers` cho "gọn".
  - **Đo lại vòng 2** (build thật + static server trả 522 như Cloudflare, 11/11 route): **0 lỗi 503**
    ở mọi route, mỗi trang đúng 1 dòng console — và dòng đó là artifact của server local; trên prod
    probe `/health` kết thúc bằng `net::ERR_ABORTED` (AbortController 3s bắn trước khi CF kịp dựng
    522) nên **không sinh dòng nào**. Đừng bỏ probe để "sửa" nó. Full suite **1212 xanh (144 file)**,
    build + lint sạch.
  - **Verify trên prod sau khi push** (CI `35770477621` ✓, Deploy `35770662344` ✓ 40s; EC2 tắt
    thật; 10 route, mỗi route isolated context + cache-buster vì HTML prod nằm sau edge cache):
    **10/10 sạch** — mọi `/api/*` trả 200 **bắn đúng 1 lần**, 0 lỗi 503, 0 request websocket,
    console error+warn trống ở cả 10 trang. Non-200 duy nhất là `GET /health [net::ERR_ABORTED]`
    (artifact im lặng của probe).
  - **Vòng 3 — câu hỏi "4 vòng thay vì 2" đã trả lời (2026-10-08), không phải double-mount.** 4 mốc
    0 / 2053 / 3070 / 5085 ms = 2 attempt của query × 2 fetch mỗi attempt: `request()` gửi lại 503
    không `Retry-After` một lần sau 2 s (SCALE-05) — 0→2053, rồi `retry: 1` sau 1 s → 3070, resend →
    5085. Sửa: `request()` bỏ resend khi `isDemoMode()` (503 demo = backend nghỉ, không phải bị shed);
    test trong `api/index.test.ts`. Giả thuyết `<Suspense>` quật layout là **sai** — đừng đi tìm nữa.

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
  phép), `assets/react.svg` (asset), và `lib/chart/chartTheme.ts` (canvas không ăn Tailwind —
  đã whitelist ở `.ai/workflows/check-tailwind.md` §Check 4).
- **AN-01(c): ĐÃ ĐÓNG (2026-09-14).** Lúc đổi recharts → Chart.js đã extract luôn
  `src/lib/chart/chartTheme.ts`; giờ có 4 chart surface nên điều kiện "thêm chart thứ 2" thỏa.
  `AnalyticsDashboard` không còn literal nào.
- **`/NN` trên alias: gỡ gốc ở THEME-01 (2026-09-25)** — mọi token màu giờ là
  `rgb(var(--x) / <alpha-value>)` nên `/NN` chạy trên **mọi** alias; `aliasAlpha` test đã xoá, thay
  bằng `src/test/themeTokens.test.ts` (kiểm shape token trong config, không quét `src/`). 265 chỗ mà
  ALIAS-ALPHA-01 đã đổi sang `tb-*` vẫn đúng — **đừng** đổi ngược, churn không lợi gì.
- **Nhánh `shop` của badge read-only ở `AdminPage.tsx` là code không tới được (đọc 2026-09-16).**
  `roleEditability()` chỉ trả read-only cho (a) hàng của chính admin đang đăng nhập hoặc (b) role GHN
  không gán được ⇒ badge chỉ có thể render với `admin` hoặc một trong hai role GHN, **không bao giờ**
  `shop`. Nhánh `user.role.name === 'shop' && 'bg-tb-amber/15 …'` vẫn được sửa cùng lượt cho đúng
  token, nhưng **không** demo được trên browser — đừng ghi là "đã verify runtime". Xoá được nếu ai đó
  muốn dọn, chỉ là nó sẽ gãy im lặng nếu sau này `roleEditability()` khoá thêm điều kiện.
- **17 input/select trên `/admin` không có `id`/`name` (đo 2026-09-15) — non-bug, đừng churn.**
  Chrome ghi issue "A form field element should have an id or name attribute" (16 select role của
  ROLE-ADMIN-01 + 1 ô search sẵn có ở header). Đây là gợi ý **autofill**, không phải a11y: accessible
  name của cả 17 đến từ `aria-label` và đã đúng. Bảng phân trang nên `id` phải sinh động theo hàng —
  thêm vào chỉ để tắt cảnh báo là đổi code lấy số 0.

## Feature Roadmap

*(`/sweep propose` 2026-09-25, rà luồng chính trước rồi mới tới luồng phụ. **F9–F12: đã xong cả bốn**
(F12 2026-10-03, F9–F11 2026-10-06). F13 (theme): user đã chọn, đang làm. F1–F7 đã có chủ ở CHANGELOG/handoff ⇒ đánh số tiếp từ F8. Rewards/điểm
thưởng **user đã loại** — service `rewards` của BE có ghi điểm nhưng không có route gateway, đừng đề
xuất lại.)*

**Luồng chính** (sản phẩm → giỏ → checkout → đơn):

- ✅ **F9 "Mua ngay" · F10 "Mua lại" · F11 "Sản phẩm khác của shop"** — xong 2026-10-06 (`/sweep`,
  user chọn cả ba) — xem Recent closes / `CHANGELOG.md`.

**Luồng phụ:**

- ✅ **F12 — Dòng thời gian cho người mua trên `/order/:id`** — xong 2026-10-03 (ORDER-TIMELINE-01,
  BE mở route `GET /order/:id/history`) — xem Recent closes / `CHANGELOG.md`.
- ✅ *Suýt vào danh sách:* ảnh bằng chứng khi trả hàng — xong 2026-10-03 (RETURN-PHOTO-01).
- 🟢 **UPLOAD-GRID-DRY-01 — đề xuất, chưa làm.** Lưới ảnh upload (thumbnail + nút xoá + ô "thêm")
  nay có **3 bản**: form sản phẩm seller, `CreatePostModal`, `ReturnPhotoPicker`. Quá ngưỡng DRY ⇒
  đề xuất tách `components/shared/ImageUploadGrid` (+ hook upload chung). Chờ user đồng ý — không
  refactor lén trong `/sweep`.

**F13 — Công tắc sáng / tối cho toàn web** *(user chọn 2026-09-25, làm tuần tự THEME-01 → 06, mỗi
bước một `/sweep`)*. BE: không. Mọi bước class A (chỉ FE). Quyết định đã chốt:
(1) **mặc định theo `prefers-color-scheme`** của hệ điều hành, công tắc của user ghi đè và nhớ
trên máy; (2) chế độ sáng dùng **cam đậm `#B45309`** cho chữ và viền (vì `#F59E0B` trên nền trắng chỉ
~2.1:1), còn nền gradient CTA giữ nguyên. Công tắc **chỉ hiện ở dev** (`import.meta.env.DEV`) cho
tới THEME-06, nên người dùng thật không bao giờ thấy chế độ sáng làm dở.

- ✅ THEME-01 (nền móng token) đã xong 2026-09-25 — xem Recent closes / `CHANGELOG.md`.
- ✅ THEME-02 (bảng màu sáng) đã xong 2026-09-25 — xem Recent closes / `CHANGELOG.md`. Khối
  `[data-theme="light"]` nay được THEME-03 bật (chỉ ở dev).
- ✅ THEME-03 (cơ chế + công tắc) đã xong 2026-09-26 — xem Recent closes / `CHANGELOG.md`. Ở dev,
  Playwright và Chrome DevTools MCP giả lập `prefers-color-scheme` (Playwright mặc định **light**)
  nên e2e trên dev giờ render theme sáng.
- ✅ THEME-04 (dọn màu viết thẳng) đã xong 2026-09-26 — xem Recent closes / `CHANGELOG.md`.
  `src/` không còn `text-white`/`bg-black`/`rgba()`/hex; `themeTokens.test.ts` chặn chúng quay lại.
- ✅ THEME-04-FU (nút tim trên ảnh) đã xong 2026-09-26 — xem Recent closes / `CHANGELOG.md`.
- ✅ THEME-05 (chart theo theme) đã xong 2026-09-26 — xem Recent closes / `CHANGELOG.md`. Chart
  đổi màu ngay khi bật công tắc; `chartTheme.test.ts` ghim 2 palette vào `index.css`.
- ✅ THEME-06 (rà toàn bộ + phát hành) đã xong 2026-09-27 — xem Recent closes / `CHANGELOG.md`.
  **F13 xong: 2 theme lên production**, cả hai cổng dev đã gỡ. Chữ cam theme sáng giờ là `#964308`
  (không còn `#B45309`) để qua AA trên chính chip tint của nó.
- 🔵 **THEME-07 (tuỳ chọn) — 5 cặp dưới AA của bảng tối.** `ink-muted` 2.2–2.6:1 trên cả 3 nền,
  `accent-violet` 4.0–4.45 trên surface/elevated — có từ trước F13, `themeTokens.test.ts` ghim
  đúng 5 cặp. Sửa là đổi giao diện tối người dùng đang quen ⇒ cần user quyết. Sửa cặp nào thì xoá
  dòng của nó khỏi test. Chữ trắng trên gradient CTA (2.15:1) là quyết định thương hiệu, không assert.
- *Ngoài phạm vi:* `components/ui/` dùng `bg-background`/`text-foreground`/… nhưng config
  không định nghĩa các màu đó ⇒ hiện chúng không ra màu gì. Định nghĩa chúng thì giao diện tối cũng
  đổi theo ⇒ phải có quyết định riêng.

**F14 — Song ngữ Tiếng Việt / English (i18n)** *(user chọn 2026-10-01, làm tuần tự I18N-01 → 07,
mỗi bước một lượt)*. BE: không. Mọi bước class **A** (chỉ FE). Quy mô đo 2026-10-01: ~168 file
non-test chứa chuỗi tiếng Việt, ~1 400 dòng. Quyết định đã chốt:
(1) **không thêm dependency** — tự viết lớp i18n nhỏ, có type (`src/lib/i18n/`), không dùng
`react-i18next`; (2) **từ điển đặt cạnh feature** (`<feature>/<name>.i18n.ts`, `defineMessages({ vi, en })`)
thay vì một file trung tâm ⇒ chuỗi của trang lazy nằm trong chunk lazy, entry chunk không phình
(`check:bundle`); `en` bị TypeScript ép đủ key của `vi` ⇒ thiếu bản dịch là lỗi build;
(3) **mặc định luôn là `vi`**, không đọc `navigator.language` — người dùng chính là người Việt, và
Playwright chạy `en-US` trong khi mọi e2e assert chữ Việt; lựa chọn của user nhớ ở `localStorage`
key `tb-lang`, `<html lang>` đặt trước first paint như theme; (4) **chuỗi do BE sinh ra không dịch**
(message lỗi, nội dung thông báo từ server) — chỉ dịch chuỗi FE tự viết, kể cả nhãn FE ánh xạ từ
`errorCode`/status; (5) tiền vẫn là VND; ngày giờ định dạng theo ngôn ngữ (`vi-VN` / `en-US`).
Công tắc nằm cạnh công tắc theme (ProfileMenu + `/login`).

⏸️ **TẠM DỪNG sau I18N-01 (user dặn 2026-10-01 "ghi vào snapshot để làm sau").** I18N-02 → 07
**chưa làm**, đừng tự nhận làm tiếp; chỉ làm khi user bảo. Điểm tiếp tục là **I18N-02**.
*(2026-10-02: user bảo làm I18N-02 → đã xong; rồi bảo làm I18N-03 → đã xong; rồi "làm 04 luôn" → đã xong; rồi "tiep tuc I18N-05" → đã xong; rồi `/sweep lam task i18n` → I18N-06 đã xong; rồi "làm tiếp I18N-07" → đã xong ⇒ **F14 đóng**.
Code I18N-02 → 07 cũng chưa commit/push, và quyết định công tắc bên dưới vẫn chưa có — giờ cả app
đã dịch nên cách 1 (push luôn, không giấu công tắc) không còn trộn ngôn ngữ.)*
- Code I18N-01 đang nằm trong working tree, **chưa commit, chưa push**. Nó lẫn với các thay đổi
  khác chưa commit, nên phải `git status` trước khi commit.
- ⚠️ **Trước khi push, cần user quyết định:** công tắc đã hiện thật nhưng mới dịch được khung app.
  Người dùng chọn EN sẽ thấy nav/menu tiếng Anh còn nội dung trang vẫn tiếng Việt. Hai cách:
  1. Push như vậy (chấp nhận trộn hai ngôn ngữ).
  2. Giấu công tắc tới khi xong I18N-07, giống cách F13 từng gác `THEME_SWITCH_ENABLED` rồi gỡ ở THEME-06.

- ✅ I18N-01 (nền móng + công tắc + khung app) đã xong 2026-10-01 — xem Recent closes / `CHANGELOG.md`.
  **Cách làm cho các bước sau:** tạo `<feature>/<name>.i18n.ts` bằng `defineMessages({ vi, en })`;
  component gọi `const t = useT(book)`; helper thuần nhận thêm `lang: Lang = 'vi'` (xem
  `soldCountLabel`, `roleLabel`, `monthTitle`) và component truyền `useLanguage().lang` vào. Prop
  có default tiếng Việt ⇒ bỏ default, render `prop ?? t(key)`. Không cần provider trong test (context
  mặc định là `vi`) ⇒ test cũ assert chữ Việt vẫn chạy nguyên. Còn để lại cho I18N-07: chữ trong
  `BackendOfflineBanner` (nằm ở `lib/demo/backendStatus`); cho I18N-05: `relativeTime` + nội dung
  trong `NotificationBell` (qua `notificationDisplay.ts`).
- ✅ I18N-02 (auth, user, address, search, wishlist, payment) đã xong 2026-10-02 — xem Recent
  closes / `CHANGELOG.md`. **Cách làm thêm cho zod:** message trong schema là **key** của book
  (`userMsg('nameRequired')`), component render qua `translateIfKey(book, lang, text)` ⇒ lỗi từ
  server (không phải key) đi qua nguyên văn. Còn để lại cho I18N-07: các caller khác của
  `listSearchEmptyText` (admin, seller, feed, voucher — vẫn mặc định `vi`), câu lỗi của
  `validateUploadFile`. Deep e2e `/wishlist`, `/profile/:id`, `/addresses` vẫn `deep: []` (còn nợ).
  Post card trên `/profile/:id` vẫn tiếng Việt — thuộc I18N-05 (social).
- ✅ I18N-03 (product, cart, checkout, form seller) đã xong 2026-10-02 — xem Recent closes /
  `CHANGELOG.md`. Lỗi validate của `useProductForm` dịch lúc set (đổi ngôn ngữ giữa chừng thì
  giữ chữ cũ tới lần validate sau). Còn để lại cho I18N-07: notice upload `firstUploadError` /
  `capImageBatch`. `enrichProductForUI` trong `useProducts.ts` là code chết, không đụng.
  Deep `/product/:id`, `/sell/:id` vẫn `deep: []` (còn nợ).
- ✅ I18N-04 (order buyer + seller, trả hàng, export CSV, analytics shop) đã xong 2026-10-02 — xem
  Recent closes / `CHANGELOG.md`. Nhãn trạng thái đơn giờ là `orderStatusLabel(status, lang)`
  (`ORDER_STATUS_META` không còn `label`). Còn để lại cho I18N-06: `orderStatusSlices` ở `AdminPage`
  vẫn mặc định `vi`. Cho I18N-07: `formatDateTime` và `formatPrice` (`250.000 đ`) chưa theo ngôn ngữ;
  nhãn kỳ trên trục biểu đồ analytics là chuỗi BE trả về. Deep `/order/:id` cancel + payment-retry
  skip vì thiếu đơn pending (data, không phải nợ spec).
- ✅ I18N-05 (social, chat, thông báo, thời gian tương đối) đã xong 2026-10-02 — xem Recent closes /
  `CHANGELOG.md`. `relativeTimeShort/Long` giờ là `(dateStr, lang, now)` — `now` đứng cuối để
  component không phải gọi `Date.now()` trong render (lint `react-hooks/purity`). Còn để lại cho
  I18N-07: notice upload (`firstUploadError`, `capImageBatch`, `resolveUploadOwner`,
  `validateUploadFile` trong `lib/http`) vẫn tiếng Việt trong `CreatePostModal`; giờ chat dùng
  `toLocaleTimeString(undefined)` (theo locale trình duyệt); giá `đ` trên `ProductChip`.
- ✅ I18N-06 (admin, voucher, shop) đã xong 2026-10-02 — xem Recent closes / `CHANGELOG.md`.
  Hằng số copy trong `userRole.ts` thành hàm theo `lang` (`assignableRoleOptions(lang)`,
  `roleChangeConfirmBody(lang)`); `REPORT_STATUS_LABEL` (key) dùng chung cho tab lọc và pill. Còn để
  lại cho I18N-07: `formatVnd` / `formatPrice` (`đ`) — kể cả số tiền trong câu cờ "giá thấp bất
  thường" của `riskFlagDescription` — và `formatDateTime` / `formatDate` trên bảng admin. Lý do từ
  chối / lý do báo cáo / mô tả voucher là dữ liệu người dùng, đi qua nguyên văn. `/admin`,
  `/admin/vouchers`, `/admin/analytics`, `/shop`, `/shop/analytics` vẫn `deep: []` (còn nợ).
- ✅ I18N-07 (`lib/` + rà toàn bộ) đã xong 2026-10-02 — xem Recent closes / `CHANGELOG.md` ⇒ **F14 đóng**.
  Test `src/test/vietnameseCopy.test.ts` quét mọi `.ts`/`.tsx` non-test (trừ `*.i18n.ts`): chữ Việt
  mới viết thẳng ⇒ fail; muốn giữ thì thêm vào `ALLOWED` kèm lý do (số đếm phải khớp). **Bẫy:**
  truyền formatter dạng callback trần (`formatVnd`, `formatDateTime`, `formatPrice`) làm rơi
  `lang` ⇒ ra `vi`; luôn bọc arrow `(n) => formatVnd(n, lang)`. Chữ Việt còn lại trên UI EN là
  dữ liệu (nội dung post, tên tỉnh GHN, tên phân loại, lý do người dùng nhập). Deep e2e vẫn nợ như
  các bước trên.

## Perf — đo thật, phần còn mở

Lighthouse `/login` và bundle: số đo **2026-10-05** (`/sweep audit`; LHCI = prod build qua
`vite preview`, mobile mặc định, simulated throttling, median 3 lượt). Từ 2026-09-24 **CI tự đo mỗi
push/PR** (job `lighthouse`, budget ở `lighthouserc.json`); report nằm trong artifact
`lighthouse-reports` của run. `check:bundle` cũng chạy trong CI (PERF-BUDGET-01). Re-run tay:

```bash
npm run build && npm run check:bundle                # gzip từng chunk vs trần trong scripts/check-bundle.mjs
npx -y vite-bundle-visualizer -t list -o <out>.yml   # chunk nặng chứa gì
npm run build && npx -y @lhci/cli@0.15.x autorun     # tự bật vite preview :4173, report → .lighthouseci/
```

- **Lighthouse `/login` (2026-10-05, máy local):**
  - Trước PERF-LCP-02, 2 lượt: LCP median **4.55s** rồi **4.00s**. Cả hai đều **fail** assertion
    LCP ≤ 4000.
  - Sau PERF-LCP-02 (`socket.io-client` lazy), 3 run: LCP 3992 / 3876 / 3725 ⇒ median **3.88s**, pass.
    FCP 3.27–3.58s · TBT 26–35ms · Perf 0.79–0.82 · transfer script **194 kB** (trước 207 kB).
  - Phần tử LCP vẫn là heading `<h2>`, 100% render delay ⇒ bị chặn bởi JS boot + font.
  - Headroom chỉ ~120ms ⇒ vẫn sát budget.

  Các mốc trước: 2026-09-24 Perf 0.85–0.86 · FCP ~3.0s · LCP ~3.43s · TBT 0–18ms; 2026-07-02 Perf 78 ·
  FCP 3.7s · LCP 4.2s.
- ✅ **PERF-FONT-01 — xong 2026-10-06** (CHANGELOG). Sau fix, 3 run `/login`: LCP 3545 / 3543 / 3692 ⇒
  median **3.55s** (headroom ~450ms), FCP 3.13–3.28s, Perf 0.83–0.84, CLS 0; render-blocking chỉ còn CSS app
  ~150ms. Font tải xong ~650ms, trước FCP ⇒ không thấy FOUT. LCP giờ bị chặn bởi JS entry (152.8 kB
  gzip) — đòn bẩy tiếp theo là `unused-javascript` (entry 47% unused, `schemas` 87% unused).
  Không nới budget.
- **Bundle (chunk phát ra, 2026-10-05, raw / gzip theo `check:bundle` / trần):**
  - `index` (entry) 480,9 kB / **152 713 B** / 180 000 (85%) sau PERF-LCP-02 (socket.io-client →
    chunk lazy ~13,3 kB). Gồm react-dom + react-router + tailwind-merge. Trước đó 522,1 kB / 165 935
    sáng 2026-10-05; mốc cũ hơn: 495,7 kB / 157 725 hôm 2026-09-25, raw 475,0 kB hôm 2026-08-04.
  - `CreateProductPage` 477,3 kB / 150 464 / 170 000. TipTap + ProseMirror, đã route-lazy. Muốn
    giảm nữa thì dynamic-import riêng phần editor.
  - `cookieStore` 177,8 kB / 63 486 / 72 000. **Đây là MSW** — Rollup đặt tên chunk theo một
    module bên trong nó. Chỉ tải ở demo mode.
  - `DoughnutChart` 179,1 kB / 63 049 / 72 000. Chart.js, route-lazy, chấp nhận. Trước khi đổi
    recharts là 402,1 kB trong chunk `useAnalyticsFilters`.
  - `schemas` 93,5 kB / 28 022 / 32 000. react-hook-form + zod.
  - Mọi chunk khác ≤ 24 273 B (trần mặc định 30 000). CSS entry 11 478 / 13 000. Tổng 111 file
    705 092 / 750 000 (94%).

  ⚠️ gzip ở đây là zlib mức mặc định của Node, **không** trùng số gzip Vite in ra (số 2026-08-04
  cũ là của Vite). Chỉ so gzip với gzip do `check:bundle` đo. Còn "245 kB" cho `schemas` ở bản
  cũ hơn là module size từ bundle-visualizer, lại là một metric khác nữa. Nhận định cũ "trang
  login kéo cả chunk, 87% unused → tách schema per-form" chưa đo lại.
- **Marketplace LCP** — số cũ 1.44s (load delay 1.38s, đo 2026-07-02). Hai việc đã xong:
  - Attribute ảnh (`fetchPriority`, bỏ `loading="lazy"` ở ảnh LCP) đóng 2026-08-05.
  - Waterfall `/user/me` → chunk → list đóng 2026-09-24 (PERF-LCP-01): route loader prefetch list,
    nên request list đi cùng `/user/me`.

  **Chưa đo lại LCP trên prod build**, vì LHCI chỉ audit `/login`: `/marketplace` cần session +
  data. Ảnh vẫn không discoverable từ HTML, đó là bản chất SPA.
- Feed `/`: LCP 718ms (714ms là render delay = JS boot của SPA) · CLS 0 — OK.
- Forced reflow ~31ms trong `index` chunk (minified, chưa attribute được về source — cần trace
  có sourcemap nếu muốn đào).
- **Đo liên tục:** Lighthouse CI chạy trên mỗi PR/push (PERF-MON-01, 2026-09-24). Từ PERF-BUDGET-01
  (2026-09-25) còn thêm bước `check:bundle` trong job `frontend`. Vượt budget ở bất kỳ bên nào thì
  CI đỏ **và deploy bị chặn**. Muốn nới budget: sửa số trong `lighthouserc.json` hoặc
  `scripts/check-bundle.mjs`, trong cùng PR có lý do. Vẫn **chưa có RUM** (Web Vitals từ người dùng thật). Nếu cần sau này có hai hướng:
  - Cloudflare Web Analytics: 1 beacon, không thêm dep.
  - `web-vitals` gửi về endpoint BE: cần dep + endpoint mới.

  Cả hai phải hỏi user trước.
- **Route đăng nhập có perf spec (PERF-E2E-01, 2026-10-08):** `npm run test:perf` chạy
  `e2e/routes.perf.spec.ts` (project `perf`) trên `vite preview` `:4173` — LCP / CLS / blocking time
  qua `PerformanceObserver`, median 3 lượt, ngưỡng rộng (4000 ms / 0.1 / 600 ms). Cần BE thật ⇒
  không vào CI; bước 7c của `/sweep` dùng spec này thay trace MCP. **Baseline local 2026-10-08**
  (LCP ms / CLS / blocking ms): `/marketplace` 936 / 0.031 / 0 · `/cart` 1620 / 0 / 0 · `/checkout`
  988 / 0.046 / 0 · `/orders` 604 / 0.067 / 0 · `/order/:id` 1052 / 0.051 / 0 · `/sell` 572 / 0 / 0.

> Ngoài tầm static scan (phải ĐO, không đoán): re-render thật → React DevTools Profiler; bundle
> size → `check:bundle` (bên trong chunk → visualizer); LCP/CLS/INP → Lighthouse, hoặc trace MCP
> trên `npm run preview`, **không** dùng dev server. `/check-perf` chỉ bắt được mức grep.

## Runtime verification còn nợ

Cần full-stack live (FE↔BE) và/hoặc 2 tài khoản; không repro được qua UI thường:

- ⏸ **CAPTCHA-01 — key đã có, chờ push FE; chưa chạy widget thật lần nào** (2026-10-06). **Cập nhật 13:11Z:** user đã tạo widget và set `VITE_TURNSTILE_SITE_KEY` ở Environment `production` (bước 1 + nửa bước 3 xong); đã báo BE ở `backend-handoff.md` → CAPTCHA-01 (BE được set secret shadow mode, **chưa** được enforce). Code FE xong và có
  test, nhưng mọi môi trường đang để `VITE_TURNSTILE_SITE_KEY` trống ⇒ không render widget, không gửi field.
  Còn lại, theo thứ tự rollout của BE: (1) user tạo site Turnstile trên Cloudflare (free) → site key
  public + secret; (2) BE set `TURNSTILE_SECRET_KEY` (shadow mode); (3) user set
  `VITE_TURNSTILE_SITE_KEY` ở GitHub Environment `production` (biến `vars`, không phải secret) rồi push
  FE; (4) MCP: widget hiện / tự qua ở form đăng ký + quên mật khẩu (cùng route `/login`), body có `captchaToken`, submit
  lần 2 vẫn ok (đã reset); (5) **FE báo BE** trong `backend-handoff.md` rồi BE mới bật
  `CAPTCHA_ENFORCE=true`. Bật (5) trước (3) ⇒ mọi đăng ký 400. Test key local: `1x00000000000000000000AA`.

> ✅ **BATCH-0811 đã verify đủ 6/6 trên prod 2026-08-13** — không còn nợ mục nào.
>
> **Cách đẩy một đơn tới `delivering`/`completed` trên prod mà không có webhook GHN thật** (mở khoá
> mọi kịch bản trả hàng / hoàn tiền, kể cả mục F2 dưới đây): đăng nhập `shipping1` (quyền
> `shipping:update:any`) rồi `POST /api/order/admin/ghn/orders/:id/demo-status` với
> `{ ghnStatus }` — `picking`→`shipped`, `delivering`→`delivering`, `delivered`→`completed`.
> Prod đang bật `GHN_DEMO_ENDPOINTS_ENABLED=true` (project demo cố ý giữ true). Đơn phải đã có
> waybill (`ready-to-ship` xong) thì mới đi tiếp được; mapping forward-only nên đã `completed`
> hoặc `canceled` thì mọi status sau đó bị bỏ qua.

> ✅ **9 mục nợ cũ đã chạy thật trên stack local 2026-10-08** (`/sweep` "làm hết"; probe Playwright
> dùng-một-lần, đã xoá; mọi đơn / SP / dòng giỏ tạo ra đều đã huỷ / xoá) — hết nợ:
> P0-03 / P0-05 happy-path, P0-04 409 khi đang xử lý · chat **reconnect** (ngắt mạng giữa chừng) ·
> upload UP-01 (500 giữa lô: giữ ảnh đã lên, báo lỗi, dừng ảnh sau) / UP-02 (huỷ avatar ⇒ `DELETE
> /upload/media`) / UP-03 (xoá ảnh editor ⇒ `deleteMedia`) / UP-04 (.txt bị chặn, 0 lần xin chữ
> ký) — **UP-06 không chạm được qua UI** (mọi route đều protected), chỉ có `uploadOwner.test.ts` ·
> SEC-H2 >50 id ⇒ 400 · cart 404 stale/foreign · profile người khác chỉ trả
> `id,username,name,avatar,isActive` (không email, không "Sửa hồ sơ") · `keepPreviousData` trang 2
> `/marketplace` giữ 24 thẻ cũ, không skeleton · media cap 10 (lộ ra **IMG-CAP-01**, đã sửa) ·
> **mobile** login → thêm giỏ → checkout → đặt COD trên 390px (lộ ra **MOBILE-OVERFLOW-01**, đã
> sửa; COD thành công về `/orders` sau 3 s là đúng thiết kế). Đo tràn ngang bằng `clientWidth`,
> **không** `innerWidth` — với `isMobile` layout viewport nở theo nội dung nên `innerWidth` luôn khớp.
- ~~Trả hàng nhánh **từ chối**~~ — ✅ 2026-09-28 chạy thật local qua `seller-returns.shop.spec.ts`
  (và `return-request.buyer.spec.ts` dọn bằng reject); nhánh duyệt + hoàn tiền + trả tồn kho đã chạy full
  E2E trên prod 2026-08-13. **F3 voucher — đã verify runtime trên prod 2026-08-26** (admin: sửa /
  chặn siết / confirm nới / tắt-bật; buyer: gợi ý ở checkout, áp mã, tổng đúng) **và 2026-08-29**
  (seller, xem gạch đầu dòng dưới — nhánh **tạo mã mới** giờ đã chạy thật). Nhánh **đặt đơn
  thật có mã** đã chạy trên **local** 2026-10-08 (đơn đã huỷ); trên prod vẫn cố ý không đặt đơn. Dữ liệu prod cần
  giữ: `TRYBUY10` đang **active** và guide có trích dẫn mã này — **đừng tắt**; `TRYBUY20K` đang
  **inactive** ⇒ bật để thử thì nhớ tắt lại ngay; `E2EPROD0806` có `usedCount` 1 — đây là mã duy
  nhất chạm được nhánh siết/nới, **đừng nới lỏng** (một chiều, không hoàn lại được).
- ✅ **Màn voucher của seller (`/sell/vouchers`) — đã verify runtime trên prod 2026-08-29** bằng
  `shop1` qua FE origin thật (đồng thời là bằng chứng CD đã ship `1b5ceb7`). Chạy được: guard role
  (`user1` → `/`, ẩn danh → `/login`), list `mine` **chỉ** trả 3 mã của chính shop
  (`sellerId usr_xU2Q7pGhhFpduGWz`), create → **201** với body **không có khoá `sellerId`** (code tự
  hoa, optional rỗng bị bỏ) + đúng 1 lượt refetch, form sửa hydrate khoá đúng 3 trường giá trị,
  deactivate → **200**. **Chưa chạy qua UI:** nhánh **403 chạm mã shop khác** (fixture id 6
  `WRONGSELL0826`) và nhánh **lưu** của form sửa — cả hai bị permission classifier chặn, đã verify ở
  tầng API 2026-08-26, câu chữ 403 có test. Dữ liệu để lại: mã **id 8 `SHOPFE0829`** (shop1, fixed
  5.000 đ, min 100.000 đ, 1 lượt, `usedCount` 0, **đã tắt**) — guide phỏng vấn Phần 6 Bước 9 trích
  dẫn nó làm ví dụ trạng thái *Đã tắt*, **đừng bật lại và đừng xoá**.
> ✅ **GHN-MSG-01 / GHN-WARD-01 (SWEEP-0828) đã verify trên prod 2026-08-28** — hết nợ. Công thức
> repro giữ lại vì rẻ và **không tạo đơn** (chết ngay ở bước tính phí): **thêm** một địa chỉ Quận 8
> (`districtId=1450`) + một trong chín ward `20801`-`20803` / `20808`-`20813` — nhớ **không** tick
> "đặt làm mặc định" để địa chỉ thật của tài khoản không bị đụng — rồi vào `/checkout` và chọn nó,
> xong thì xoá địa chỉ probe. `POST /order/shipping-fee` trả **400** với message
> `"GHN cannot deliver to this ward — pick another shipping address"`; UI phải hiện câu tiếng Việt
> **dưới mục 1**, cột tóm tắt chỉ còn dòng trỏ lên mục 1, phí là "Không giao được", nút đặt hàng
> disabled, và **không** có `GET` / `/api/` / `deliver` nào trong `main.innerText`.
> ✅ **Forgot-password success-leg đã verify trên dev 2026-09-08 (MAIL-UI-01)** — hết nợ. Công thức
> repro giữ lại vì **không cần SMTP và không cần hộp thư thật**: `user.service.ts` ghi mã vào Redis
> **trước** khi gửi mail và không rollback khi SMTP ném, nên một tài khoản dùng-một-lần trên domain
> giả (`mailui0908@example.com`) vẫn có mã đọc được bằng
> `docker exec redis redis-cli GET user:pwreset:code:<userId>` (`KEYS user:pwreset:*` để tìm id;
> `attempts:<id>` và `cooldown:<id>` là hai key còn lại). **Đừng chạy nhánh này trên prod** — prod
> không cấu hình SMTP (lời dặn của BE trong MAIL-UI-01), và đừng đổi mật khẩu của
> `user1`/`shop1`/`admin1`. Đăng nhập sau khi reset phải dùng **username**, không phải email.
> ✅ **ROLE-ADMIN-01 đã verify trên full stack local 2026-09-15** — hết nợ (chi tiết ở §Recent
> closes). Công thức repro giữ lại vì rẻ: `npm run dev` + gateway `:3000`, đăng nhập `admin1`,
> đổi role một tài khoản **dùng-một-lần** (đừng đụng `user1`/`shop1`/`admin1`) rồi **trả role về
> `user`** ngay sau khi đo. **Vẫn còn nợ một nhánh:** chạy lại trên **prod** khi `api` đẩy
> `PATCH /user/:id/role` lên — lần đo này là local nên không chứng minh được gì về prod. Nhánh 400
> (tự đổi role của mình) vẫn chỉ có unit test vì UI chặn trước. ~~Đừng phí thời gian đổi role qua
> UI bằng Chrome DevTools MCP — `window.confirm` bị auto-suppress ⇒ luôn trả `false`.~~
> **Không còn đúng từ 2026-09-16 (CONFIRM-UI-01):** luồng này nay đi qua `<ConfirmDialog>` — DOM
> thật, MCP click nút "Đổi vai trò" bình thường. Không cần Playwright, không cần gọi thẳng `fetch`
> nữa. Rào auto-suppress đó là **lý do chính** của luật cấm native dialog ở `core.md`.

## Pitfall đã trả giá

Đã chuyển sang `.ai/context/pitfalls.md` (18 mục, on-demand) — pitfall là kiến thức vĩnh viễn,
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
- **`mailui0908` / `mailui0908@example.com` / `NewPass@1234`** — tài khoản dùng-một-lần tạo trên
  **dev DB** 2026-09-08 để chạy nhánh reset password (xem §Runtime verification). Không có trên
  prod, không nằm trong `test-accounts.md`, không ai phụ thuộc vào nó — cứ xoá khi dọn dev DB.

## History

Việc đã xong — toàn bộ item P0/P1/P2, các sweep đã đóng, và lý do của từng thay đổi — nằm trong
`CHANGELOG.md` (cùng thư mục, không auto-load). Đọc khi cần lịch sử của một thay đổi cụ thể.

> Backlog của **bộ context agent** (`.ai/`, `.claude/`, `.codex/`) — khác backlog sản phẩm ở trên —
> nằm ở `context-system-backlog.md` cùng thư mục. `/sweep` không đọc file đó.
> Đợt audit 2026-08-03/04 đã đóng **hết**, file đó giờ là sử liệu chứ không còn việc.
> Từ nay dùng `/sync-context` để rà drift doc↔code thay vì làm tay.
