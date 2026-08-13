# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-08-13 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
> Keep this LEAN: chỉ giữ bức tranh sống (overview, việc còn mở/bị chặn, known issues).
> Việc đã xong nằm ở `CHANGELOG.md` (cùng thư mục, không auto-load) — **đừng chép lại vào đây**.
> Convention/rule nằm ở `.ai/context/` — cũng không duplicate vào đây.

## Overview

React 19 + Vite FE cho marketplace microservices. Khung đầy đủ: marketplace, cart, checkout,
order, seller, social, admin, chat, wishlist, sổ địa chỉ. **Toàn bộ P0/P1/P2 đã đóng phía FE**;
riêng P0-03 còn hở đúng nhánh update (create đã atomic BE-side từ INV-CONTRACT-01, deploy prod
2026-08-12).
Public-ID migration (PUBID-01–07) đã
xong — storefront id là opaque string end-to-end.

**Gates (chạy lại + verify 2026-08-13):** `npm run build` ✓ · `npm run lint` 0 error /
3 warning advisory · `npm run test:run` 708 test / 100 file, all pass. Không đóng item nào khi 3
lệnh này chưa xanh.

> ⚠️ `npm run build` **mới** thực sự typecheck từ 2026-08-04. Trước đó script chỉ là `vite build`
> (esbuild vứt type) trong khi doc ghi là có `tsc` → 3 lỗi type nằm im 2 tuần. Chi tiết +
> bài học → `.ai/context/pitfalls.md` mục 9, lý do → `CHANGELOG.md`. Mọi con số gate ghi trong
> CHANGELOG **trước** ngày này chỉ chứng minh bundle build được, không chứng minh type sạch.

**Production gate:** không release trước khi P0 đóng *và* có regression test cho
login → product → cart → checkout → payment/order.

## Recent closes (chi tiết → `CHANGELOG.md`)

| Ngày | Item |
|---|---|
| 2026-08-13 | **BE-REPORT-0813 · dọn nốt 3 FYI cuối của inbox BE + đóng DEPLOY-0813** (class **B**, chưa push). `IDLEAK-01`: BE bảo "no FE change needed" — vẫn đi soi từng consumer thay vì tin: `checkStock` không đọc `productId`, `reviewedBy` vốn đã `string \| null`, `moderatorId` **không có consumer nào**, `client.ts` chỉ đọc `message` + status nên ENVELOPE-01 vô hình; thứ duy nhất sai là **fixture test** `postModeration.test.ts` còn assert `'Post 7 not found'` (social 404 giờ bỏ id) → sửa. `submittedBy` **cố ý giữ nguyên `number`** đúng như BE dặn (class C, BE giữ). `GHN-CREATE-01`: BE cũng bảo không cần sửa, nhưng nhánh fallback sẽ ném **tiếng Anh kèm tên endpoint nội bộ** (`pick a district from GET /api/shipping/districts`) vào mặt người mua trong UI tiếng Việt → helper thuần `features/cart/checkoutSubmitError.ts` đưa refusal của GHN về **đúng câu của banner phí ship**, mọi message khác giữ nguyên; `isGhnAddressRefusal()` khoá theo **400 + từ vựng địa chỉ GHN** nên 400 hết hàng/voucher không bị đổi lời, và strip luôn đuôi `— pick a … from GET …` cho cả banner. Tiện thể sửa bug tiềm ẩn ở call site: nó `String(err.message)` vô điều kiện nên có lúc in ra chữ `"undefined"`. **Verify prod (MCP)**: cả 3 fix BE của DEPLOY-0813 **đã lên prod** — comments/replies có `author`, `refundAmount` là number, ward lệch quận trả **400** đúng 3 câu đã code; và **nhánh `author` thật đã render được ở runtime** (bundle local trỏ API prod, `/post/…` in `shop1`/`user1` + reply lồng cấp, không còn chữ `Người dùng`, không rò `usr_`) — đây là món lượt trước còn nợ. Không probe `POST /api/order` trên prod: đoán sai là đặt đơn thật. +9 test / +1 file |
| 2026-08-13 | **BATCH-0813 · drain 5 entry BE inbox trong một lượt** (class **B** — old FE vẫn đúng, chưa push). `SOCIAL-AUTHOR-01`: `Comment.author: PostAuthor \| null` (tái dùng type của post, không khai thêm type gần-trùng) + helper thuần `features/social/commentAuthor.ts` → `CommentNode` render username/avatar thật, và khi `author` vắng/null thì ra `Người dùng` **không kèm id** (trước là `Người dùng #usr_xxx` — rò id opaque ra UI) · `RET-NUM-01`: bỏ `Number(refundAmount)` ở 3 trang trả hàng — `formatVnd` đã nhận `number \| string` nên chạy đúng với **cả** BE cũ (`"45000.00"`) lẫn BE mới · `ORD-RBAC-01`: xoá 3 wrapper chết `ship`/`deliver`/`complete` trong `api/orders.ts` (0 call site, giờ admin-only) + để lại comment vì sao seller dừng ở `ready-to-ship` · `GHN-DIST-01` và `PATCH-ATOMIC-01`: **không cần sửa code** — cascade reset ward/district và invalidate ở nhánh `onError` đã đúng sẵn; vì BE change làm cascade thành load-bearing (ward lệch giờ là 400 chặn đặt hàng) nên pin lại bằng 2 RTL test. **Verify prod (Chrome DevTools MCP)**: cả 3 thay đổi BE **chưa deploy** — `/social/posts/:id/comments` + `/replies` chưa có `author`, `refundAmount` vẫn là string `"45000.00"`, `shipping-fee` ward lệch quận vẫn trả 201. Chạy build mới trỏ vào API prod: comment + reply lồng cấp ra `Người dùng` sạch id, `/returns` in `45.000 đ`/`90.000 đ`/`160.000 đ` đúng ⇒ degrade an toàn, đúng class B. +8 test / +2 file. **Cập nhật cuối ngày 2026-08-13:** cả ba đã lên prod và verify lại — xem dòng BE-REPORT-0813 ở trên |
| 2026-08-13 | **SOCIAL-COUNT-01 + verify social/chat trên prod** — chạy E2E post → comment → reply → chat với 2 tài khoản thật (user1 ↔ shop1) và tìm ra 1 bug FE: `useCreateComment`/`useCreateReply`/`useDeleteComment` chỉ invalidate `social.comments(postId)`, **không** invalidate `social.post(postId)` — mà `commentCount` nằm trong payload của post, nên header vẫn in "Bình luận (0)" sau khi vừa gửi comment, phải reload mới đúng. Fix: helper `lib/query/socialInvalidation.ts` (`invalidateCommentViews`, cùng khuôn với `invalidateOrderViews`) — invalidate **một** key `social.post(postId)` là đủ vì nó là prefix của `social.comments(postId)` (thêm guard prefix vào `queryKeys.test.ts`, gọi 2 lần chồng nhau sẽ refetch comment list 2 lượt). Verify prod: like 0→1, comment + reply lồng cấp render ngay, notification `comment`/`reply` bắn realtime (badge 65→66 và 44→45, **không reload**), chat 2 chiều tới nơi tức thì. Ghi sang `backend-handoff.md`: comment/reply **không kèm `author`** nên UI in `Người dùng #usr_xxx` thay vì username (post thì có `author` đầy đủ) |
| 2026-08-13 | **Runtime verify BATCH-0811 + BATCH-0812 trên prod — 6/6 + 5/5 PASS** (Chrome DevTools MCP, 4 tài khoản song song trong isolated context). Storefront: đăng bán 1 SP → đúng 1 request, stock đúng · `/orders` gõ mã đơn → đúng 1 request `?q=`, phân trang trên kết quả tìm · đơn online chưa trả tiền → "Khách chưa thanh toán — chưa thể xử lý đơn", không có nút (đơn COD cạnh đó vẫn có nút) · chuông thông báo đủ **6** type mới, `order_confirmed`/`order_processing` bắn thật khi seller đẩy đơn, `new_order` mở `/sell/orders` · checkout địa chỉ GHN không giao tới → banner đỏ + nút đặt hàng disabled. **RETURN-STOCK-01** (2026-08-13, sau khi đẩy đơn `ord_o00rM7DkTCMM3rzm` tới `completed` bằng `demo-status`): buyer gửi yêu cầu trả hàng → seller "Duyệt & hoàn tiền" → tồn kho SP đi từ **49 → 50** (tổng kho 10084 → 10085) mà **không reload** trang, đơn thành "Đã hoàn tiền", refund `45.000 đ` hiện đúng ở cả 2 phía. GHN console **5/5 PASS** (GHN-RAW/ENUM/ACT/HIST/RBAC-01) — chi tiết ở `../.agent-local/frontend-handoff-ghn.md`. Phát hiện mới ghi sang `backend-handoff.md`: `POST /api/order/shipping-fee` với `toDistrictId` không tồn tại vẫn trả **201** thay vì 400 |
| 2026-08-12 | **BATCH-0811 · tích hợp 8 entry BE trong một lượt** (class C — đã push và verify prod 2026-08-12, xem `../.agent-local/release-gate.md` → Released). `INV-CONTRACT-01`: xoá `persistSimpleStock()`, luồng đăng bán còn đúng **1** request `POST /products` (BE tự seed inventory + rollback nếu hỏng) · `FE-INBOX-0811 #4`: search mã đơn thành **server-side** `?q=` (debounce 400ms, cap 32 ký tự) ⇒ **xoá được cả module `orderHistoryPaging.ts`**, hết fetch-all và hết empty-state nói dối · `ORD-GUARD-01`: field mới `paidAt` + 2 helper thuần `getSellerOrderActionState()`/`isAwaitingPayment()` — đơn online chưa trả tiền hiện lý do thay vì cái nút chắc chắn 400; cả hai so `=== null` để BE cũ (field vắng) degrade chứ không khoá cứng · `ORDER-SHAPE-01`: type `SellerOrderListRow`, card seller render thẳng từ list · `NOTIF-LIFECYCLE-01`: 6 type mới, `new_order` link `/sell/orders` (buyer view sẽ 403) · `RESIL-01`: `shippingFeeFailure()` — GHN **400 chặn** đặt hàng (địa chỉ giao không tới), **503 không chặn** (phí tính khi giao) · `RETURN-STOCK-01`: duyệt trả hàng invalidate thêm `inventory.all`+`products.all` · `STOCK-SYNC-01`: invalidate ở nhánh `onError` của form sửa. 12 file, +5 test file, 687 test xanh |

## Active Tasks — open / blocked

### Chờ thao tác của người dùng (code đã xong, không agent nào làm hộ được)

- **CD-FE-01 · Cloudflare Workers deploy — chờ setup một lần.** Chốt 2026-08-07: **Workers
  static assets + GitHub Actions**. Không dùng Pages, và **không** nối Git integration của
  Cloudflare (Workers Builds) — nó nghe webhook `push` thuần, không chờ được CI, nối cả hai là
  mỗi push build 2 lần và bản chưa test có thể thắng. Repo đã có `wrangler.toml` (assets-only,
  `name = "fe-react-vite"`, `not_found_handling = "single-page-application"`), `ci.yml`,
  `deploy.yml` (gate `workflow_run` + `conclusion == 'success'`, giống repo api), runbook
  `DEPLOYMENT.md`. Còn 3 việc chỉ chủ tài khoản làm được: (1) tạo API token Cloudflare theo
  template *Edit Cloudflare Workers* → secret `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`;
  (2) tạo Environment `production` với 3 **variable** `VITE_*`; (3) sau lần deploy đầu, đặt
  `FRONTEND_URL` + `AUTH_COOKIE_SAME_SITE=none` cho gateway trên EC2 — thiếu thì login "thành
  công" nhưng mọi request sau đó 401. Chi tiết → `DEPLOYMENT.md`.

  ✅ **CD-FE-03 đã xong hẳn 2026-08-11:** hai variable socket đổi sang `/`, push `ffa42a0` →
  CI → Deploy tự chạy, bundle live `index-BRya1NEn.js` không còn origin gateway. Verify trên
  **prod thật**: socket đi `wss://fe-react-vite…workers.dev/socket.io/`, `40/notifications,` +
  `40/chat,`, 0 close, và tin nhắn từ tài khoản thứ hai về tới nơi (`42/chat,["new_message",…]`)
  không cần reload.

### Chờ backend (FE đã ship mitigation, chỉ backend mới đóng được)

- **Payment return URL trả order id nội bộ dạng số** (`../.agent-local/backend-handoff.md`,
  **Done** 2026-08-07 — không còn chờ BE, chỉ chờ đám pending cũ hết hạn). Verify live 2026-08-04: `buildFrontendPaymentResultUrl()` gửi
  `?order=111` — cùng biến sau đó đi qua `Number(orderId)` — trong khi `/api/order/111` **400**
  `"Invalid id — expected format ord_<16 alphanumeric characters>"`. Trước đây snapshot ghi
  ngược ("regex số không khớp `ord_`"): thật ra regex **nhận** id số rồi dựng `/order/111`, tức
  là link chết chắc chắn, không phải id bị rơi. FE mitigation: `resolveResultOrderId()`
  (`src/features/payment/paymentResultParams.ts`) chỉ nhận shape `ord_…`, số → fallback
  `/orders`. Guard theo shape nên BE đổi contract là deep-link tự sống lại, FE không sửa gì.
  Kèm theo: `.env.example` của payments trỏ return URL về endpoint JSON của gateway —
  chi tiết trong handoff.
  ✅ **BE ĐÃ FIX (2026-08-07):** redirect giờ mang `order=ord_<16>`, deep-link tự sống lại,
  FE **không phải sửa gì**. Nhưng **giữ nguyên `resolveResultOrderId()`** — payment row tạo
  *trước* thay đổi này vẫn giữ URL cũ có `?order=<số>` (chữ ký VNPay phủ `vnp_ReturnUrl` nên
  không rewrite server-side được). Chỉ bỏ guard khi đám pending cũ đã hết hạn.
- **P0-03 · Product create/update inventory không atomic — nhánh CREATE đã đóng, còn nhánh
  UPDATE.** INV-CONTRACT-01 (2026-08-11, chưa deploy): `POST /products` tự tạo inventory row và
  **rollback product nếu bước đó hỏng**, nên `201` = row chắc chắn tồn tại. FE đã xoá
  `persistSimpleStock()` — hết cảnh "201 xong vẫn in lỗi đỏ". Còn mở: `PATCH /products/:id
  { stockQuantity }` (STOCK-SYNC-01) có ghi vào inventory nhưng **BE chưa nói là atomic**; giả
  định nó không, cho tới khi có xác nhận. FE không mitigate được nhánh này.
- **Orphan cleanup cho ảnh trong HTML đã lưu (UP-03(i))** — mảnh **cuối** còn hở. SEC-M7
  (2026-07-11) đã đóng phần còn lại: BE diff media URL trước/sau commit rồi destroy asset bị bỏ,
  gồm cả **avatar cũ khi save** → UP-02(c) **đóng**. Nhưng SEC-M7 diff các *field* media
  (`imageUrls`/`videoUrl`/`avatar`), **không** parse ảnh nhúng trong HTML `description`, nên ảnh
  RichTextEditor đã nằm trong bản lưu vẫn thành orphan (và FE không được cleanup lúc unmount —
  làm vậy là phá ảnh của bản save thành công).
  ⚠️ Snapshot cũ trỏ item này tới "`backend-handoff.md` Open 2026-07-07" — **entry đó không tồn
  tại** trong file; nội dung nằm ở `frontend-handoff.md` (SEC-M7, giờ ở **Done**).
- **Max-size chưa nằm trong chữ ký upload.** Ownership thì đã xong hẳn: `DELETE /upload/media`
  verify `public_id` theo prefix chủ sở hữu (`403` với id của người khác, `400` với folder ngoài
  allowlist) — verify runtime 2026-07-08. SEC-M8 đã ký `allowed_formats`; còn max-size.
- **2× Cloudinary 404 ảnh post cũ** (HEAD check live 2026-08-09 lên cloud `shopdev1234`: **2/3 ảnh
  của feed page 1** trả 404 — con số cũ "1×" ghi 2026-08-07 là đếm thiếu, ảnh thứ hai nằm ở post
  không lọt vào 10 post đầu). Hai pattern legacy (`trybuy/posts/trybuy/posts/…` và prefix
  `undefined_`) **đã hết** — BE sanitize ở read path, grep `src/` không có workaround nào để xoá.
  Hai cái còn lại qua cả sanitizer lẫn validator (URL đúng chuẩn) nhưng là **hai nguyên nhân khác
  nhau** — đọc ra từ chính URL, ghi gộp ở bản 2026-08-08 là sai:
  - `…/upload/**v1**/trybuy/posts/**17_mine**.jpg` — version `v1` placeholder + public id viết tay
    ⇒ **chưa từng upload**, row seed viết thẳng vào DB. Seed cleanup.
  - `…/upload/**v1780516926**/trybuy/posts/**dvh93r029vpy5rssldcc**.png`
    (`post_5732da0c81d811f1`) — version là timestamp thật, khớp `createdAt` của post, public id đúng
    dạng 20 ký tự Cloudinary tự sinh ⇒ **đã upload thật rồi bị xoá sau đó**, row DB còn trỏ tới.
    ✅ **BE trả lời 2026-08-11 (MEDIA-ORPHAN-01): KHÔNG phải SEC-M7.** Đường destroy duy nhất chỉ
    nhận URL mà row vừa save/delete **không còn mang nữa**, trong khi cả 5 URL chết vẫn đang được
    chính post của nó trỏ tới. Cloud dev từng bị xoá sạch một lần — `trybuy/posts` chỉ còn đúng 1
    asset. Vậy đây **không** phải bug sống, không đẻ thêm 404 mới.

  Upload **không hỏng**: `20_4u4glh7.png` (post 2026-07-08) và avatar `23_opyhl5h.png` đều 200.
  ✅ **DEV đã sạch 2026-08-11:** BE set `imageUrls = null` cho 5 URL chết trên 4 post; feed dev còn
  đúng 1 ảnh Cloudinary và nó trả 200, không còn request 404 nào. **Prod chưa quét** (EC2 trong
  khung giờ tắt lúc BE fix) — nếu còn thấy 404 trên prod thì đó là data prod, **chỉ BE đóng được**.
  Kèm theo, cleanup media giờ **đếm tham chiếu**: một URL gắn trên nhiều post chỉ bị destroy khi
  post cuối cùng trỏ tới nó biến mất (trước đây sửa 1 post là hỏng ảnh của các post còn lại).
  Phần FE **đã xong 2026-08-08**: `PostImage` (Recent closes) che ảnh hỏng ở cả `PostCard` lẫn
  `PostDetailPage`, verify runtime 2026-08-09. Che ≠ hết: request vẫn fail và console vẫn có error
  **trên happy path của feed** cho tới khi row được dọn.

### Còn lại phía FE

*(mọi item dưới đây đã verify lại từ code thật ngày 2026-08-04)*

- **3 lint warning advisory — blocked/deferred.** `react-refresh/only-export-components` trên
  `ui/badge.tsx:36`, `ui/button.tsx:56` (shadcn vendored trong `src/components/ui/` —
  write-protected, không extract `cva` variants được) và `context/AuthContext.tsx:19`
  (`useAuthContext` nhiều importer → churn rộng cho một warning dev-only). Đã từ 23 → 3 qua các
  sweep 2026-07-09 → 07-22; 3 cái còn lại đúng bằng danh sách này, không phát sinh thêm.
- **Arbitrary sizing/radius rải rác** — 269 occurrence / 60 file (`rounded-[10px]` ở
  `LeftRail`/`Header`/`ProfileMenu`, `LoginPage` `px-[64px]`/`text-[64px]`/`gap-[22px]`…).
  Chỉ là scale-consistency, không chặn runtime.
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
- ~~P1-06 / chat — E2E 2 tài khoản~~ — **đã chạy trên prod 2026-08-13** (user1 ↔ shop1, 2 isolated
  context): open conversation → send → tab kia nhận **không reload**, cả hai chiều; list hội thoại
  đổi preview + "Vừa xong" ngay. Còn lại nhánh **reconnect** (ngắt mạng giữa chừng) chưa chạy.
- ~~F2 return/refund~~ — **đã chạy full E2E trên prod 2026-08-13** (buyer yêu cầu → seller duyệt →
  hoàn tiền + trả tồn kho); còn lại nhánh **từ chối** yêu cầu chưa chạy. F3 voucher — cần admin
  tạo voucher thật trước.
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
