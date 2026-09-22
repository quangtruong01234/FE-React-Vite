# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-09-23 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
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

**Gates (chạy lại + verify 2026-09-23, sau lượt vá npm AUDIT-NPM-01):** `npm run build` ✓ ·
`npm run lint` 0 problem · `npm run test:run` **1212 test / 144 file**, all pass. Không đóng item
nào khi 3 lệnh này chưa xanh.

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
| 2026-09-22 | **HEALTH-PATH-01 · probe demo-mode gọi nhầm đường health ⇒ demo mode đè lên backend đang sống** (class **A** thuần FE, nhưng có chạm config Worker + vite proxy). **Đây là bug của DEMO-MODE-01, đã lên prod, và đo được là đang hỏng thật** lúc 04:34 ICT 22-09 trong một browser context sạch (`swCount: 0`, không có MSW xen vào): `/api/gateway/health` → **404** với body đúng format exception filter của gateway, trong khi `/api/products/categories` → **200 kèm dữ liệu thật** (`id "9"`, "Âm thanh") ⇒ gateway **đang sống**, chỉ là route đó **không tồn tại**. Gateway khai `setGlobalPrefix("api", { exclude: [...] })` với `health` nằm trong exclude ⇒ đường thật là `GET /health` ở **gốc**. `classifyProbe` đọc mọi non-2xx thành `offline` ⇒ **404 từ một gateway khoẻ = "backend chết"** ⇒ MSW bật ngay giữa khung giờ phục vụ, mà `POST /user/login` cố ý **không** mock nên rơi vào `offlineFallback` trả **503** ⇒ **khách thật không đăng nhập được**, còn catalogue hiển thị là hàng fixture. **Nguồn gốc là doc:** `.ai/context/backend-api.md` §10 ghi nhầm endpoint là `/api/gateway/health`, `src/api/misc.ts` chép theo doc, probe chép theo `misc.ts` — đã sửa cả ba. **Cách sửa hiển nhiên hỏng ngược chiều:** `/health` không nằm trong `PROXY_PREFIXES` ⇒ `resolveUpstreamUrl` trả `null` ⇒ `worker/index.ts:50` đưa request về `env.ASSETS.fetch`, nơi `not_found_handling = "single-page-application"` đáp **200 index.html** ⇒ probe báo "online" **vĩnh viễn**, kể cả khi backend tắt hẳn (đo được: `/health` → `200 text/html`); vite dev cũng chỉ proxy `/api`. **Nên patch 3 lớp:** hằng `HEALTH_PROBE_PATH` · **ba** đầu proxy (`PROXY_PREFIXES` + `run_worker_first` + `server.proxy`) · **guard content-type** trong `classifyProbe` (đòi `application/json`). Lớp 3 là thứ duy nhất phân biệt được gateway với SPA fallback, và nó biến "ai đó xoá nhầm một dòng config" từ *hỏng im lặng* thành *rơi về demo mode* — hướng an toàn. **Dọn kèm:** xoá `src/api/misc.ts` + `misc` khỏi `api/index.ts` — không ai gọi, và **không thể** viết đúng qua `request()` vì hàm đó luôn prepend `API_BASE`; để lại thì đúng bằng gài sẵn lại cái bug vừa sửa. +6 test (2 `classifyProbe`, 2 `probeBackend`, 2 `worker/proxy.test.ts`). **Đã verify trên prod sau deploy `8691a23` (xanh 10:10:09Z), CẢ HAI CHIỀU, mỗi chiều một browser context riêng — chiều *online* là thứ trước nay chưa ai đo và chính là lỗ hổng đã cho bug lọt:** EC2 **bật** ⇒ `/health` **200 `application/json`** (`status:"ok"`, có `dependencies`), `swCount: 0`, không banner, catalogue thật (`id "9"`), **đăng nhập `user1` được** (`/user/me` → 200 `usr_WchSOuXCJknvKU7O`, feed thật), console **0 error/0 warn**; EC2 **tắt** ⇒ `/health` **522 `text/html`** (trang origin-unreachable của Cloudflare — bắt bằng `ok !== true`, guard content-type là lưới thứ hai), `swCount: 1`, banner + **6** `prod_demo…`, marketplace "6 sản phẩm" + filter, `POST /user/login` → **503** đúng thiết kế. Bảng đo đầy đủ + hai thứ suýt đọc nhầm thành bug (`DemoModeGate` cố ý **không** dùng `disabled` mà phủ overlay; `/api/products` 503 là artifact của người đo vì handler nằm ở `/products/with-inventory/all`) → `CHANGELOG.md`. |
| 2026-09-21 | **REPO-DOCS-01 · README/AGENTS.md viết lại cho người đọc, + DEMO/METRICS/LICENSE** (class **A** — tài liệu + 1 dòng eslint ignore, không chạm business logic). Theo `../../.agent-local/TryBuy-repo-update-prompt.md`; trong 13 mục checklist chỉ **7** chạm `frontend/`. README trước đó vẫn là **template Vite**; bản mới có sơ đồ Mermaid toàn hệ thống (đánh dấu repo này là **một** ô), bảng layer, và 6 quyết định kỹ thuật mà mỗi cái **nói ra phương án đã loại**. AGENTS.md từ 41 dòng routing Codex → tài liệu onboarding cho người; bản viết đầu **đánh rơi** `codex-safety.md` + `.ai/workflows/`/`.ai/roles/`, đã thêm lại. `docs/METRICS.md` **do `scripts/metrics.sh` sinh**, LOC từ `git ls-files` (không lạc vào `node_modules`), màn hình đếm từ `router.tsx` (page không route ≠ màn hình); script tự ghi phần **không đo ở đây** (throughput BE phải đo trên máy phục vụ traffic, không phải laptop đo đường truyền). `docs/DEMO.md` đặt ở FE **dù checklist #8 giao cho repo BE** — cross-repo cấm ghi vào `api/`, mà banner offline cần link sống; đã báo user. Ảnh **dùng lại ảnh thật** trong `.agent-local/interview/assets/` (BE chỉ sống 14:00–19:00), mỗi tấm mở ra nhìn trước khi copy; loại `02-mkt-03-product-detail.png` vì 357 081 byte > 300KB. **Quét secret (#6) — báo, chưa sửa theo đúng prompt:** `.env` không track + có trong `.gitignore`, `.env.example` đủ 4 key, **nhưng `e2e/accounts.ts` đang track credential thật** (khác `Pass@1234` in trong README/DEMO — mấy cái đó cố ý công khai); **đang chờ user quyết**. **`msw` cố tình giữ ở `devDependencies`** dù user duyệt thêm msw: chuyển sang `dependencies` làm lệch `package-lock.json` (`"dev": true`) ⇒ gãy `npm ci` ở cả `ci.yml` lẫn `deploy.yml`, mà `npm install` bị chặn — và không mất gì vì `deploy.yml` chạy `npm ci` trơn (**không** `--omit=dev`) còn Vite bundle từ `node_modules` lúc build. |
| 2026-09-21 | **DEMO-MODE-01 · MSW phục vụ catalogue read-only khi backend nghỉ** (class **A** thuần FE). BE chạy EC2 **14:00–19:00 ICT** còn storefront static sống 24/7, mà **mọi** route nằm sau `ProtectedRoute` ⇒ ngoài khung giờ khách bị đá về `/login` mà `/login` cũng chết — trang đọc thành **hỏng** chứ không phải **theo lịch**. `bootstrapBackendStatus()` probe `GET /gateway/health` timeout 3s bằng `fetch` **thô** (qua `api` client thì interceptor 401 redirect ngay giữa một lần kiểm tra liveness); online ⇒ **không mock gì**, offline ⇒ banner + MSW với fixture. **Probe `await` trước `createRoot`** vì SW phải intercept trước request đầu tiên; `msw/browser` là **dynamic import** nên chunk 178 kB chỉ tải ở nhánh offline. **Ranh giới mock lệch với chữ của prompt, có chủ ý:** prompt nói "không mock login và checkout" — đọc là cấm **luồng credential**, không cấm **phiên** ⇒ `GET /user/me` **có** mock (không session thì không route nào hiện ra), `POST /user/login` **không**; mọi write trả **503 không kèm `Retry-After`**; role demo cố ý là `user` trần nên `/sell`+`/admin` vẫn đóng; nút cần BE thật bọc `DemoModeGate`. **Nhánh no-op mới là nhánh đáng lo:** SW sống lâu hơn lượt offline, nhưng `start()` không gọi ⇒ `activeClientIds` rỗng ⇒ mọi request đi thẳng qua (`public/mockServiceWorker.js:111`), lượt online hôm sau không bị worker cũ chặn. `public/mockServiceWorker.js` vào `globalIgnores` (file `msw init` copy nguyên văn, mang sẵn header `eslint-disable` bị config flag là unused). ~~**Chưa verify runtime trên prod**~~ — **đã verify 2026-09-22, cả hai chiều** (chi tiết ở dòng `HEALTH-PATH-01` bên trên và `CHANGELOG.md`). Lưu ý: bản DEMO-MODE-01 lên prod ban đầu **hỏng thật** vì probe gọi sai đường; nó chỉ chạy đúng từ `e1413da` trở đi. |
| 2026-09-19 | **DATEFIELD-01 · lịch riêng (`components/shared/DateField.tsx` + `lib/date/calendar.ts`) thay `<input type="date">` trên `/sell/orders`** (class **A** thuần FE). User: *"thiết kế UI cho lịch, hiện thấy đang xài mặc định không đẹp"*. Lịch native là chrome của browser — không token `tb-*` nào với tới, mỗi browser một kiểu, và **automation không lái được** (segment trong shadow DOM, chính là bẫy harness của EXPORT-CSV-01) ⇒ đổi sang picker tự viết, mọi control là `<button>` thường. **Không thêm dependency** (`ui/` + `shared/` không có calendar, repo không có `react-day-picker`/`date-fns`/`dayjs`, `npm install` bị chặn) — chỉ mượn `lodash/chunk`. Toán lịch tách ra file thuần: lưới **6×7 cố định** (popover đo được 350px ở mọi tháng), ô ngoài tháng là `null` nên **không** có ngày của tháng kế bên; toàn bộ chạy **UTC + so sánh chuỗi ISO**, `formatIsoDay` cắt chuỗi thay vì `toLocaleDateString` (cái đó lệch ngày theo timezone), `monthOfIsoDay('2026-02-31')` → `null` thay vì để `Date.parse` mở nhầm tháng 3. **`TextField` được trả lại `type?: 'text' \| 'password' \| 'email'`** — `min`/`max` nới ở EXPORT-CSV-01 nay là API chết; câu "không đẻ `DateField`" của entry đó **đã bị thay**. `<button>` là labelable nên `getByLabelText` trong test panel sống nguyên. **Bẫy đào được (→ `pitfalls.md §6b`):** `index.css` giữ rule scaffold `button:hover { border-color: #F59E0B }` — **(0,1,1) > class đơn (0,1,0)** nên **mọi** border tĩnh trên `<button>` bị đổi sang amber lúc hover; viền lỗi `border-accent-red` thôi đỏ **đúng lúc user rê chuột vào**, mà build/lint/test jsdom đều xanh vì class vẫn nằm trong DOM, chỉ thua cascade. **Đã thử bọc `:where()` cho rule global rồi bỏ** — đo thấy **17/38 button** trên trang (9 tab lọc, phân trang) đang lấy chính nó làm hover duy nhất ⇒ sửa tại component bằng cách lặp màu ở biến thể `hover:`. Guard nằm ở class list chứ không quét CSS được: vitest `css: false` ⇒ `?raw` trả rỗng, `node:fs` gãy `tsc` (TS 6 bỏ auto-include `@types/*`). **Verify runtime (MCP, local full stack, `techstore_demo`):** ngày chọn phủ `linear-gradient(135deg, rgb(245,158,11), rgb(239,68,68))` + glow, 12 ngày trong khoảng được tint, `T2…CN` Monday-first, `min`/`max` khoá chéo nên không tạo được range đảo chiều, Escape/click-ngoài đều đóng; chọn 26/06 → export **200**, `filename="trybuy-orders-2026-06-26-2026-09-17.csv"` 8 941 byte; 172 ngày ⇒ nút disabled + không request nào bay đi; sau khi vá hover: lỗi giữ `rgb(239,68,68)`, đang-mở giữ `rgba(245,158,11,0.5)`, tab lọc vẫn hover amber như cũ; console sạch. +34 test / +2 file → **1142 test / 137 file**. |
| 2026-09-17 | **EXPORT-CSV-01 · nút "Xuất CSV" + 2 date picker trên `/sell/orders`, và `downloadBlob` dùng chung** (class **B** thuần FE — endpoint BE đã lên prod từ `87fc2f8`, old FE vẫn đúng vì chỉ là thêm route mới ⇒ **không mở hold**). BE mở `GET /api/order/seller/export?from=&to=[&status=]`, trả **chính file CSV** (`text/csv`, BOM + CRLF, 17 cột, **một dòng cho mỗi order ITEM**) chứ không phải envelope `{data}`. **Chọn `fetch` + blob thay vì `window.location.href` như entry BE gợi ý** — href tải được thật, nhưng nó không hiện được pending và, nặng hơn, **không đọc được body của 400**; mà 400 chính là nơi BE nói "Export matches 7421 item rows; the maximum is 5000" ⇒ mất luôn câu duy nhất bảo người bán phải thu hẹp bao nhiêu. Vì thế `api.orders.exportSellerOrders` **bỏ qua `request()`** (đúng tiền lệ `getInvoice`) nhưng ở nhánh lỗi thì `await res.json()` để lấy `message`, không lùi về `res.statusText`. **Validate range phía client là *pre-check*, không phải nguồn chân lý:** `exportRangeError()` soi lại đúng 3 nhánh 400 mà FE biết trước (thiếu ngày, ngày không parse được, đảo chiều, >90 ngày) và **chặn request**, còn cap 5 000 dòng thì chỉ server biết nên message server luôn thắng — `sellerOrderExportErrorMessage()` in **nguyên văn** 400 có message, và chỉ dịch sang tiếng Việt khi 400 rỗng / 401 / lỗi khác. `dayTimestamp()` round-trip qua `toIsoDate` để `2026-02-31` bị loại thay vì bị `Date.parse` lặng lẽ đọc thành 3/3. **Lookup order chạy đủ trước khi tạo file:** `ui/` không có date field, `shared/TextField` có sẵn ⇒ nới `type?: 'date'` + `min`/`max` (4 dòng) chứ không đẻ `DateField`; hai picker **cross-link** bound (`from.max = to`, `to.min = from`) nên picker native không tạo được range đảo chiều. **DRY–Logic:** `useOrderInvoice` đã có đúng 8 dòng anchor dance ⇒ tách `src/lib/file/download.ts` `downloadBlob()`, `useOrderInvoice` chỉ còn 2 dòng thay đổi; `defaultExportRange()` dùng lại `rangePresetDates` của analytics nên hai màn hình hiểu "30 ngày" giống nhau. Panel truyền **tab trạng thái đang mở** làm `status` — xuất ra khớp với thứ đang nhìn; `ORDER_STATUS_META[status].label` in vào dòng hint nên người bán thấy phạm vi trước khi bấm. Ba mục "trông như bug mà không phải" của BE **không cần FE làm gì**: FE không render CSV, chỉ lưu file ⇒ `shippingFee`/`orderTotal` trống ở dòng 2+ và guard Excel `="…"` đi qua nguyên vẹn; còn file header-only cho non-seller thì không tới được từ UI này (panel chỉ tồn tại trong route seller-gated). **Verify runtime (Chrome DevTools MCP, full stack local `:5173`→`:3000`, `techstore_demo`):** range mặc định `2026-08-19→2026-09-17` → 200; mở rộng `2026-06-26→2026-09-17` → 200 với `content-disposition: attachment; filename="trybuy-orders-2026-06-26-2026-09-17.csv"` — **khớp từng ký tự** với tên FE tự tính — 8 644 byte `text/csv; charset=utf-8`; bật tab "Đã hủy" → `?from=2026-06-26&to=2026-09-17&status=canceled` → 200 (param `status` chỉ xuất hiện khi có tab, nhờ `toQuery` bỏ `undefined`). Cửa sổ 260 ngày ⇒ nút disabled, viền picker `rgb(239, 68, 68)`, câu lỗi in đúng số ngày thật, và **không** có request nào bay đi. Hộp picker + nút đều cao 44px cùng top/bottom, icon lệch 0px, không overflow ngang; console sạch. **Bẫy harness:** `fill` của MCP trên `<input type="date">` **không** vào được React state (segment spinbutton), phải set qua native value setter rồi dispatch `input` — lần đầu bấm Xuất CSV nó vẫn gửi range cũ và trông như bug của panel. +25 test / +3 file → **1108 test / 135 file**. |
| 2026-09-16 | **CONFIRM-PAD-01 + DOC-STALE-0916 · title `ConfirmDialog` chui dưới nút X, và dọn "CHƯA push" đã cũ** (class **A** thuần FE). Bắt được trên prod bằng Chrome DevTools MCP ở luồng admin đổi vai trò: title dài wrap xuống rồi chạy dưới chữ X. **Đo ra số chứ không cảm tính:** `DialogContent` `p-6` (24px) + nút đóng neo `right-4 top-4` với icon 16px ⇒ mép trái X cách mép phải 32px, khung title dừng ở 24px ⇒ **chồng 8px**; title ngắn thì không lộ nên lỗi sống qua cả 8 consumer. Vá bằng `pr-6` trên `DialogTitle` **ở phía consumer** — `src/components/ui/` write-blocked, và title là prop do caller truyền nên primitive không tự chừa góc được; có comment ghi lại phép đo tại chỗ. Test pin `keeps the title clear of the close button` dựng đúng title đã thấy trên prod. Phần doc: 8 dòng "CHƯA push"/"HOLD class C" đã sai từ lúc `2c65b1d` + `api` `87fc2f8` lên sóng — **chính mấy dòng đó làm tôi loại nhầm 3 tính năng khỏi tài liệu dùng thử chiều nay**, nên sửa hàng ở đây, thêm banner ✅ RELEASED đầu `CHANGELOG.md` (giữ nguyên văn các câu cũ — chúng là ảnh chụp lúc viết), và trim bảng này về 5 hàng như convention. +1 test → **1083 test / 132 file**. |

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
  này nữa**, và tab "Bảo mật" trên prod không còn ra `404`. Còn đúng một việc nhỏ chưa làm: FE vẫn
  ánh xạ `404` → *"Tính năng đổi mật khẩu chưa sẵn sàng"* trong `changePassword.ts`; nhánh đó giờ
  là code chết, gỡ được bất cứ lúc nào (để lại có hại: nó nói dối nếu sau này `404` đến từ lý do
  khác). Khi verify prod: **phải dùng tài khoản dùng-một-lần**, đừng đổi mật khẩu của
  `user1`/`shop1`/`admin1` — lượt 2026-09-11 chỉ gửi mật khẩu hiện tại **sai** nên không đổi gì.
- ~~**REPORT-TOTAL-01**~~ — **ĐÃ ĐÓNG (BE push 2026-08-2x).** `514e67c fix(social): exclude
  orphaned reports from the admin report queue` **đã có trên `api` `origin/main`** (đo lại
  2026-08-26 bằng `git log --oneline origin/main`; entry doc kèm theo là `ad67e15`). FE **không
  sửa dòng nào** — `ReportedPostsPage.tsx` chỉ đọc `totalPages`/`hasNext`, không đọc `total`. Còn
  nợ đúng một việc rẻ: khi prod sống lại, `admin1` mở `/admin/reports` curl 3 tab xem
  `total`/`totalPages` đã khớp `data.length` chưa. Hành vi "report sống lâu hơn post" nằm ở
  `.ai/context/domain.md` §8.
- **UPLOAD-SIZE-01 — nửa còn lại (`?bytes=`) chờ BE push.** FE đã đọc `maxBytes`/`maxVideoBytes`
  từ response chữ ký (fallback về hằng số cũ khi field vắng ⇒ chạy đúng với **cả** BE cũ lẫn mới).
  Chưa gửi query param `?bytes=file.size` vì `5ceb46c` cũng chỉ nằm trên branch
  `fix/upload-size-01-server-cap`: BE hiện tại nhiều khả năng trả **400 "property bytes should not
  exist"** (đúng cái bẫy đã ghi ở `backend-handoff.md` §DEPLOY-0813) ⇒ **hỏng mọi upload**. Thêm
  param sau khi BE lên prod. Lưu ý: đây vẫn **không phải** security guard — BE đã probe và
  Cloudinary không cho ký tham số size, client bỏ qua vẫn upload được.

- **XSS-DESC-01 — stored XSS seller → buyer qua `description` sản phẩm.** BE inbox `XSS-DESC-01`
  (2026-09-23). `ProductDetail.tsx:445` render `detail.description` bằng `dangerouslySetInnerHTML`;
  DTO BE chỉ `@IsString()`, không sanitize. Payload kiểu `<img src=x onerror=…>` chạy **với session
  của người đang xem** vì `credentials: 'include'` là mặc định toàn cục của `request()`. Sửa đúng
  nằm ở BE (allow-list lúc ghi — chi tiết trong entry inbox, kèm ràng buộc `img[src]` phải sống sót
  cho `collectProductMediaUrls` của UP-03). **FE mitigate được** bằng sanitize lúc render, nhưng cần
  thêm dependency (DOMPurify) ⇒ **chờ user duyệt**, chưa làm.

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

### Known issue còn mở — `useAuthContext().currentUser` stale ngay sau khi đăng nhập trong app

**Chưa sửa. Ảnh hưởng mọi nơi đọc `currentUser` từ context.** `useAuth.loginSuccess`
(`src/hooks/auth/useAuth.ts`) gọi `queryClient.clear()` rồi mới `setQueryData(queryKeys.auth.me)`.
TanStack v5: `clear()` **xoá cache entry mà không notify observer đang sống** (chính file đó đã ghi
nhận điều này — handler cross-tab cố ý dùng `resetQueries()` vì lý do đó), và `setQueryData` sau
`clear()` dựng một Query **mới** mà observer cũ chưa gắn vào. Hệ quả: sau khi đăng nhập **không
reload**, `AuthProvider` vẫn báo `currentUser === null` cho tới lần re-render kế tiếp, trong khi
`useRole()` / `ProtectedRoute` (mount observer mới trên chính query `auth.me`) đã thấy user ⇒ app
**trông** như đã đăng nhập, chỉ những chỗ gate bằng context là chết âm thầm.

- **Đã trả giá một lần:** SEARCH-01-FE (2026-09-15) — nhóm Seller không bao giờ hiện sau khi đăng
  nhập trong app. Repro được 100%, reload là hết ⇒ rất dễ kết luận nhầm là bug BE hoặc bug cache.
- **Cách né đang dùng:** gate bằng **query** `auth.me` (`useRole()`), không bằng context. Đây cũng
  là thứ `ProtectedRoute` làm sẵn từ trước — coi như convention.
- **Fix gốc chưa làm:** đổi `clear()` → `resetQueries()` (hoặc `removeQueries` có scope) trong
  `loginSuccess`. Blast radius rộng — chạm mọi query sau login — nên cần một lượt riêng có verify
  runtime, đừng nhét kèm feature.

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
  - **Còn mở, không chặn:** tại sao mỗi read hỏng lại bắn **4** vòng trong khi `retry: 1` chỉ dự đoán
    2 (mốc 0 / 2053 / 3070 / 5085 ms; thời lượng 48/9/9/9 ms nên **không** phải do response chậm kéo
    dãn backoff). Giả thuyết chưa chứng minh: `<Suspense>` duy nhất nằm **trên** `FeedLayout`
    (`router.tsx:48`) trong khi `FeedPage` lazy nằm **trong** nó, nên chunk suspend có thể quật cả
    layout ra rồi mount lại → 2 mount × 2 attempt. Cái bẫy khi đi kiểm chứng: query *thành công* chỉ
    bắn 1 lần vì `staleTime: 60s`, query *lỗi* refetch ngay khi mount lại — nên "read đã mock chỉ bắn
    1 lần" **không** đủ để loại trừ double-mount. `retryQuery` che triệu chứng trong demo mode chứ
    không trả lời câu hỏi; nếu giả thuyết đúng thì layout đang double-mount ở **cả** nhánh online.

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
- **`/NN` trên alias `var()`: ĐÃ ĐÓNG (ALIAS-ALPHA-01, 2026-09-16)** — 265 site / 56 file swap sang
  token hex literal, `src/` còn **0**. Giờ có test chặn tái phát (`src/test/aliasAlpha.test.ts` quét
  cả `src/` qua `import.meta.glob`), nên đừng chỉ dựa vào Check 8 thủ công nữa. Nhắc lại phần dễ
  quên: `accent-violet`/`accent-blue` là **hex literal** ⇒ `/NN` chạy bình thường, **không** phải
  violation; và `ink-pri` (#FFFFFF) không có token `tb-*` nào nên bản vá là `white/NN`.
- **`loginSchema` (`features/auth/auth.schema.ts:3`) là code chết (phát hiện 2026-09-15).** Grep ra
  **0** call site — `LoginPage` validate nhánh đăng nhập bằng tay, chỉ `registerSchema` đi qua
  `zodResolver`. Để nguyên trong lượt NAME-TRIM-01 vì xoá không thuộc diff tối thiểu của item đó, và
  vì `LoginFormData` vẫn được import làm type. Muốn dọn thì xoá cả schema lẫn type và đổi
  `LoginPage` sang một interface cục bộ — hoặc ngược lại, nối `loginSchema` vào form đăng nhập cho
  hai nhánh cùng một đường validate (đừng thêm `.trim()` vào đó: BE **cố ý** không trim login).
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
  phần editor · **`DoughnutChart` 178,5 kB / gzip 62,9 kB** (Chart.js, chunk chứa toàn bộ chart —
  đo lại 2026-09-14; trước khi đổi recharts là 402,1 kB / gzip 116,0 kB trong chunk
  `useAnalyticsFilters`) — route-lazy, chấp nhận · `schemas` 93,0 kB / gzip 27,9 kB
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
  E2E trên prod 2026-08-13. **F3 voucher — đã verify runtime trên prod 2026-08-26** (admin: sửa /
  chặn siết / confirm nới / tắt-bật; buyer: gợi ý ở checkout, áp mã, tổng đúng) **và 2026-08-29**
  (seller, xem gạch đầu dòng dưới — nhánh **tạo mã mới** giờ đã chạy thật). Còn nợ: nhánh **đặt đơn
  thật có mã** (cố ý không đặt đơn trên prod). Dữ liệu prod cần
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
- Upload error path (UP-01/02/03/04/06) — không ép được file lỗi / fail giữa batch qua picker.
- Batch >50 product id (SEC-H2) — cần 51 SP distinct trong cart.
- Cart item stale/foreign 404 — cần forge foreign item id.
- Public profile privacy · media cap 10 · `keepPreviousData` visual check.
- **Mobile** — viewport emulation chưa hoàn tất lần nào (Vite dev process chết giữa chừng ở
  audit 2026-06-30). Login → add cart → checkout → order trên mobile vẫn chưa verify.

## Pitfall đã trả giá

Đã chuyển sang `.ai/context/pitfalls.md` (16 mục, on-demand) — pitfall là kiến thức vĩnh viễn,
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
