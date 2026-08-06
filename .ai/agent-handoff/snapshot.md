# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-08-06 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
> Keep this LEAN: chỉ giữ bức tranh sống (overview, việc còn mở/bị chặn, known issues).
> Việc đã xong nằm ở `CHANGELOG.md` (cùng thư mục, không auto-load) — **đừng chép lại vào đây**.
> Convention/rule nằm ở `.ai/context/` — cũng không duplicate vào đây.

## Overview

React 19 + Vite FE cho marketplace microservices. Khung đầy đủ: marketplace, cart, checkout,
order, seller, social, admin, chat, wishlist, sổ địa chỉ. **Toàn bộ P0/P1/P2 đã đóng phía FE**;
riêng P0-03 vẫn là FE mitigation chờ backend transaction. Public-ID migration (PUBID-01–07) đã
xong — storefront id là opaque string end-to-end.

**Gates (chạy lại + verify 2026-08-06):** `npm run build` ✓ · `npm run lint` 0 error /
3 warning advisory · `npm run test:run` 614 test / 89 file, all pass. Không đóng item nào khi 3
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
| 2026-08-06 | BE handoff inbox batch (7 entry → Done): dirty-field PATCH sản phẩm (`dirtyProductPatch`, hết lost-update) · 409 duplicate SKU về đúng field `sku` · order detail phân biệt 404 vs 403/5xx (`orderLoadError` + `ApiErrorState`) · message thật từ `/payment/url` (`paymentUrlErrorMessage`) · `ApiErrorState` hết render `null` (blank screen) |
| 2026-08-05 | GHN-ADDR-01 checkout gửi `toDistrictId`+`toWardCode` (vận đơn thật, hết `ghnOrderCode: null`) · socket.io release grace (hết warning "WebSocket is closed before…") · 4 dialog thiếu `DialogDescription` · xoá `CartDrawer` (dead) |
| 2026-07-23 | raw-palette drain (STY pass 4 + token `tb-cyan`) · chunked-upload chunk-math test cover |
| 2026-07-22 | sku-optional base-product create · SCALE-01b socket websocket-only · SCALE-05 `request()` retry 503 · react-router production alias · `redirectToPaymentGateway` · `routerLayouts.tsx` · xoá `ApiErrorContext` (dead code) |
| 2026-07-17 | UP-05 + UP-08 upload signature · AI-02 F1–F4 risk queue · PUBID-01–07 · Marketplace province filter |

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

### Chờ backend (FE đã ship mitigation, chỉ backend mới đóng được)

- **`GET /order/user/:id` thiếu param `status`** (`../.agent-local/backend-handoff.md`,
  Open 2026-08-04). Tab lọc của buyer phải kéo **hết** lịch sử về client mới lọc đúng
  (`features/order/orderHistoryPaging.ts`) — 65 đơn = 7 request. `SellerOrdersQueryDto` đã có
  `status`, chỉ cần mirror sang DTO buyer là FE xoá được mitigation.
- **Payment return URL trả order id nội bộ dạng số** (`../.agent-local/backend-handoff.md`,
  Open 2026-08-04). Verify live 2026-08-04: `buildFrontendPaymentResultUrl()` gửi
  `?order=111` — cùng biến sau đó đi qua `Number(orderId)` — trong khi `/api/order/111` **400**
  `"Invalid id — expected format ord_<16 alphanumeric characters>"`. Trước đây snapshot ghi
  ngược ("regex số không khớp `ord_`"): thật ra regex **nhận** id số rồi dựng `/order/111`, tức
  là link chết chắc chắn, không phải id bị rơi. FE mitigation: `resolveResultOrderId()`
  (`src/features/payment/paymentResultParams.ts`) chỉ nhận shape `ord_…`, số → fallback
  `/orders`. Guard theo shape nên BE đổi contract là deep-link tự sống lại, FE không sửa gì.
  Kèm theo: `.env.example` của payments trỏ return URL về endpoint JSON của gateway —
  chi tiết trong handoff.
- **`PATCH /products/:id` không xoá được optional field** (`../.agent-local/backend-handoff.md`,
  Open 2026-08-06). PATCH coi key vắng mặt là "giữ nguyên", mà JSON thì bỏ luôn key `undefined`
  → không có cách nào clear `description`/`brand`… Không phải regression (PATCH full-form trước
  đây cũng vậy), nhưng `dirtyProductPatch` làm nó lộ rõ. Cần BE xác nhận `null` = clear.
- **P0-03 · Product create/update inventory không atomic.** FE mitigation đang giữ; chỉ BE
  transaction mới đóng thật.
- **Orphan cleanup server-side cho persisted media** (`../.agent-local/backend-handoff.md`,
  Open 2026-07-07). Chặn 2 mảnh còn hở: (a) UP-02(c) — xóa avatar CŨ đã persist khi save (FE
  không giữ `publicId` của nó); (b) UP-03(i) — ảnh RichTextEditor đã nằm trong HTML đã lưu
  (unmount cleanup sẽ phá ảnh của bản save thành công).
- **`DELETE /upload/media` có verify ownership `public_id` không** (cùng entry handoff). Phần
  "ký kèm ràng buộc upload" đã đóng một nửa qua SEC-M8 (`allowed_formats` vào chữ ký); max-size
  vẫn chưa ký.
- **4× Cloudinary 404 ảnh post cũ** — URL trong DB lặp folder (`trybuy/posts/trybuy/posts/…`)
  hoặc public_id prefix `undefined_`. Data cũ; flow upload hiện tại không sinh được URL kiểu
  này → cần BE/DB cleanup. Đây là console error **trên happy path của feed**.

### Còn lại phía FE

*(mọi item dưới đây đã verify lại từ code thật ngày 2026-08-04)*

- **3 lint warning advisory — blocked/deferred.** `react-refresh/only-export-components` trên
  `ui/badge.tsx:36`, `ui/button.tsx:56` (shadcn vendored trong `src/components/ui/` —
  write-protected, không extract `cva` variants được) và `context/AuthContext.tsx:19`
  (`useAuthContext` nhiều importer → churn rộng cho một warning dev-only). Đã từ 23 → 3 qua các
  sweep 2026-07-09 → 07-22; 3 cái còn lại đúng bằng danh sách này, không phát sinh thêm.
- **`src/features/inventory/` vẫn là folder RỖNG (dead).** `ls` xác nhận không có file nào bên
  trong. Xoá hoặc điền — đừng để agent tưởng có feature ở đó.
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

- P0-03 / P0-04 / P0-05 — endpoint self-test happy-path + 409/idempotency.
- P1-06 / chat — E2E 2 tài khoản (open → send → receive → reconnect).
- F2 return/refund — E2E 2 tài khoản. F3 voucher — cần admin tạo voucher thật trước.
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
