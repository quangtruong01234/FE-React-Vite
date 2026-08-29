# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-08-29 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
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

**Gates (chạy lại + verify 2026-08-29):** `npm run build` ✓ · `npm run lint` 0 problem ·
`npm run test:run` **921 test / 115 file**, all pass. Không đóng item nào khi 3 lệnh này chưa xanh.

> ⚠️ `npm run build` **mới** thực sự typecheck từ 2026-08-04. Trước đó script chỉ là `vite build`
> (esbuild vứt type) trong khi doc ghi là có `tsc` → 3 lỗi type nằm im 2 tuần. Chi tiết +
> bài học → `.ai/context/pitfalls.md` mục 9, lý do → `CHANGELOG.md`. Mọi con số gate ghi trong
> CHANGELOG **trước** ngày này chỉ chứng minh bundle build được, không chứng minh type sạch.

**Production gate:** không release trước khi P0 đóng *và* có regression test cho
login → product → cart → checkout → payment/order.

## Recent closes (chi tiết → `CHANGELOG.md`)

| Ngày | Item |
|---|---|
| 2026-08-29 | **CHG-PW-02 · hai loại `401` của đổi mật khẩu giống hệt nhau trên prod** (class **A** thuần FE, **đã commit, chưa push** — báo user theo mẫu gate rồi chờ). Verify CHG-PW-01 **trên prod** bằng tài khoản dùng-một-lần `e2eprod0806` lộ bug **chỉ prod mới có**: sai mật khẩu hiện tại → form in *"Phiên đăng nhập đã hết hạn"*, trong khi phiên vẫn sống. Nguyên nhân: exception filter của gateway **dẹp `message` xuống đúng tên HTTP error**, nên `401` sai-mật-khẩu và `401` của guard về **byte-identical** (`{"error":"Unauthorized","message":"Unauthorized", …}`) — đo bằng cách so lần submit sai thật (reqid=314, cookie sống) với probe `credentials: 'omit'`. `isExpiredSession()` match theo `message` vì thế trúng nhánh sai ở **case phổ biến nhất**. Sửa: **bỏ hẳn việc đoán** — `isExpiredSession()`/`messageOf()` xoá, thay bằng `isAuthFailure()` (chỉ đọc status `401`/`403`) + `isSessionAlive()` (gọi `GET /user/me`; `200` ⇒ phiên sống ⇒ là sai mật khẩu). Lỗi mạng trong probe ⇒ trả `true`, **thiên về giữ user ở lại**: đá một phiên sống ra `/login` vì rớt mạng tệ hơn in nhầm câu lỗi. `changePasswordError(error, sessionAlive = true)` nhận thêm tham số thay vì tự đọc chữ; form chỉ trả giá một request phụ **trên nhánh 401/403**, đường thành công và `429`/`400`/`404` không đụng tới. Đây là **contract gap của BE** — đã ghi `../.agent-local/backend-handoff.md` → `CHG-PW-02` (giữ `message` gốc / thêm `errorCode` / trả `400`-`422` cho sai mật khẩu; có một trong ba là FE bỏ được probe). +5 test → **921 test / 115 file**. |
| 2026-08-29 | **CHG-PW-01 · đổi mật khẩu khi đang đăng nhập — tab "Bảo mật"** (class **C**, **ĐÃ PUSH 2026-08-29** — user tự chạy `git push origin main`, `f809197..ce02013`, CD Cloudflare Workers tự chạy; bundle live đổi `index-1xHrNHZu.js` → `index-Dil8MQJp.js`. **Verify prod cùng ngày** với `e2eprod0806`: đường thành công đúng hết — `201`, form clear, phiên còn sống, đăng nhập lại bằng mật khẩu mới OK; nhưng nhánh **sai mật khẩu hiện tại in nhầm câu hết phiên** ⇒ đẻ ra CHG-PW-02 ở hàng trên. Mật khẩu của tài khoản đã trả về `Test@1234` để `test-accounts.md` còn đúng). User: *"test change password chưa?"* → *"BE đã done CHG-PW-01 tiep tuc"*. Form có sẵn từ lượt trước nhưng endpoint chưa tồn tại nên **mọi lần submit ra `404`** ⇒ chưa từng test thật; lượt này BE code xong ở local nên chạy verify thật + bịt hai chỗ contract chỉ chạy thật mới lộ. `EditProfileModal` thêm tab **"Hồ sơ" / "Bảo mật"**, hai `<form>` render **luân phiên** (lồng form là HTML không hợp lệ). **(1) Body đúng hai field** `currentPassword` + `newPassword` — `confirmPassword` là của form, gateway validate `forbidNonWhitelisted` nên để nó lọt xuống dây là **biến một lần đổi hợp lệ thành 400**; `changePasswordPayload()` thu ba xuống hai, test chốt `not.toContain('confirmPassword')`. **(2) Hai loại `401` cùng về một call**, chỉ `message` phân biệt: sai mật khẩu hiện tại (cookie **còn sống**) vs. `JwtAuthGuard` chặn (*"Access token is required"* / *"Unauthorized"*). Call đặt `skipUnauthorizedRedirect` để loại thứ nhất không bị đá về `/login`; `isExpiredSession()` match **chiều hẹp** — chỉ câu chữ của guard mới tính là hết phiên, để BE đổi lời văn câu sai-mật-khẩu thì case phổ biến vẫn rơi đúng ô. Còn lại: `429` (rate limit 5/60s) → câu ở form, `400` → ô mật khẩu mới, `404` → *"Tính năng chưa sẵn sàng"* (nói thẳng thay vì rơi vào nhánh lỗi mạng — chính nó đã che mất sự thật ở lượt trước). `PasswordField` dời `features/auth/` → `components/shared/` (2 feature folder dùng, đúng ngưỡng DRY) + prop `autoComplete`. **Verify runtime** (FE `localhost:5174` + BE local, MCP, tài khoản dùng-một-lần `chgpw_test` trên **dev DB**, không đụng prod): submit rỗng → 3 lỗi field; nhập lại lệch → lỗi ô confirm; mới trùng cũ → chặn **client-side**, không có request; sai mật khẩu hiện tại → **401** hiện dưới đúng ô, vẫn ở nguyên trang, `GET /user/me` sau đó **200**; đổi hợp lệ → **201**, form clear, phiên sống; đăng nhập lại: mật khẩu cũ **401**, mật khẩu mới **201**. +16 test / +1 file. |
| 2026-08-29 | **NAV-DEDUP-01 · mỗi mục điều hướng một trang, không mục nào trùng mục nào** (class **B** thuần FE, **đã commit, chưa push** — nằm chung cây với CHG-PW-01 nên bị lớp C của cây kéo theo). Header + `LeftRail` + dropdown avatar đã thành **ba bản sao chồng nhau** của cùng một tập link: thông báo vừa ở rail vừa sau chuông, "Đơn mua"/trang cá nhân vừa rail vừa dropdown, "Đăng sản phẩm" ở rail trong khi console người bán đã có sẵn nút đó — hai mục trỏ một trang thì cái user không bấm trông như hỏng. `navItems.ts` thành **registry duy nhất, mỗi đích đúng một nhóm**: header icon (tin nhắn/yêu thích/giỏ + chuông sở hữu `/notifications` vì nó mang badge + preview), dropdown cho **mọi thứ cá nhân** (trang cá nhân, đơn mua, trả hàng, sổ địa chỉ), rail cho chỗ **không thuộc về một người** (bảng tin, chợ, console shop/admin). Dưới `md` rail bị ẩn ⇒ dropdown gánh console theo role, **chỉ ở đó**, nên không bề rộng nào hiện hai mục cho một trang. `isNavItemActive` dùng chung thay vì mỗi surface tự suy: `exact` (mục cha có con riêng), `excludes` (con đã có mục riêng), `includes` (trang đi vào từ mục này mà không có mục riêng — `/sell` nay chỉ làm sáng "Kênh người bán"). `chromeDestinations()` tồn tại để `navItems.test.ts` chốt luật một-đích-một-chỗ trên **cả bốn tổ hợp role** — tính chất này cứ review xong lại hỏng nên để test giữ. Logo brand **cố ý đứng ngoài**: affordance trang chủ, không phải mục menu. +1 file test. |
| 2026-08-29 | **VOUCHER-SHOP-FE-01 · màn voucher cho seller — một màn hình, hai role** (class **B**, **đã push 2026-08-29** — `main` `c01a081..1b5ceb7`, CD Cloudflare Workers tự chạy; **✅ đã verify runtime trên prod 2026-08-29** bằng `shop1` — chi tiết ở §Active Tasks và CHANGELOG). User: *"check xem bên handoff có nói về nó không nếu có thì làm"* — `frontend-handoff.md` §F3 mục 3 (*"Optional: a seller voucher screen"*) là mục SWEEP-0826 cố ý bỏ; ba route shop đã live prod từ 2026-08-26 nên FE làm một mình được. **Việc thật là "đừng viết trang thứ hai"**: `AdminVouchersPage` 682 dòng, màn seller giống ~95% vì luật BE y hệt hai phía — chỉ khác URL và **ý nghĩa của một cái 403**. Tách `src/features/voucher/` role-neutral: `voucherRules(.schema).ts` (`git mv` từ `features/admin/voucherAdmin.ts`, **luật không đổi một dòng**), `VoucherConsole.tsx` (thân trang cũ), `voucherConsoleBinding.ts` gom **toàn bộ** khác biệt (4 endpoint · 2 query key · 5 câu copy) ⇒ console **không bao giờ** rẽ nhánh theo role; hai trang còn lại là vỏ 14 dòng (`AdminVouchersPage` giữ nguyên đường import của route cũ, `shop/SellerVouchersPage` mới). Chunk dùng chung 23.45 kB / 7.38 kB gzip cho cả hai trang lazy. **Ba bẫy của route shop**, xử ở binding: (a) tạo mã **không được mang `sellerId`** — 400 `SELLER_NOT_ASSIGNABLE` chứ không phải bị bỏ qua; `buildCreateVoucherDto` vốn đã đúng, thêm test chốt `not.toHaveProperty('sellerId')`; (b) **403 mơ hồ có chủ đích** (sai role *hoặc* mã của shop khác, BE cố ý không nói rõ) ⇒ `voucherConsoleErrorMessage` cho caller override **chỉ** nhánh 401/403, copy seller phủ cả hai nghĩa, 409/404/400 vẫn dùng câu chung; (c) query key **không** được là `["orders","seller","vouchers"]` — `orders.seller` là prefix invalidate của *đơn bán*, mọi thao tác đơn sẽ kéo refetch list voucher ⇒ `["orders","vouchers","mine"]`, test chốt cả prefix-của-page-key, hai console rời nhau, và nằm ngoài `orders.seller`. Route `/sell/vouchers` (`requiredRole="shop"`, lazy) + `LeftRail`: loại `/sell/vouchers` khỏi active-check của mục `/sell` (nếu không **hai mục cùng sáng**) và đặt nhãn **"Mã giảm giá shop"** vì block admin đã có nhãn "Mã giảm giá" — tài khoản vừa shop vừa admin sẽ thấy hai nhãn y hệt. **Bẫy Windows ăn một lượt build:** `voucherConsole.ts` cạnh `VoucherConsole.tsx` ⇒ **`TS1149`** (FS case-insensitive, tsc coi là một file) — đổi tên helper, không đổi tên component. **KHÔNG làm:** không đụng luật trong `voucherRules.ts`; không thêm cột `scope` cho bảng admin. +36 test / +1 file → **882 test / 113 file**. |
| 2026-08-28 | **SWEEP-0828 · GHN-MSG-01 + GHN-WARD-01 — câu từ chối địa chỉ của GHN, dịch sang tiếng Việt và gắn đúng field.** Hai entry **Open** duy nhất của `frontend-handoff.md` mà FE không bị chặn bởi một lượt push của BE; cùng field, cùng flow, cùng class **B**, đã live prod từ 2026-08-26 ⇒ gộp một lượt. **Bug thật:** regex cắt đuôi "gọi endpoint này đi" trong `shippingFeeError.ts` là `…pick an? \w+ from GET …` — nhánh `an?` chỉ khớp `a`/`an`, **không khớp `another`**, nên cả `"GHN cannot deliver to this ward — pick another shipping address"` lẫn `"GHN no longer delivers to ward <code> — pick another ward from GET /api/shipping/wards"` lọt qua bộ cắt và rơi vào nhánh nội suy ⇒ người mua đọc nguyên tiếng Anh, và câu GHN-WARD-01 **lộ tên endpoint nội bộ** ra banner checkout (đúng loại rò rỉ BE-REPORT-0813 đã dọn cho biến thể `district`). **Sửa:** `WARD_REFUSALS` là 3 regex **neo hai đầu** (`^…$`, đúng lời BE dặn *"match on the whole string"*) cho ba câu BE đã đóng băng — hai câu trên + `"Ward X does not belong to GHN district Y"` — dùng chung một câu copy tiếng Việt, vì với người mua cả ba nói cùng một điều. BE đổi lời văn sau này thì **rơi về nhánh pass-through** chứ không bị dịch sai; 400 chưa đóng băng (vd lỗi `master_data_validate_phone`) vẫn in verbatim, vì bảo người mua sửa **địa chỉ** là chỉ sai field. **Gắn đúng chỗ:** câu đầy đủ chuyển xuống ngay dưới `AddressBookPicker` ở mục **1. Địa chỉ giao hàng**; banner cột tóm tắt rút thành một dòng trỏ ngược lên — chỉ cho nhánh `kind === 'address'`, nhánh `outage`/`unknown` giữ nguyên vì đó là vấn đề của *phí*. **Cache ward:** thêm prefix `queryKeys.shipping.wardsAll`, mutation phí `onError` invalidate khi `isGhnAddressRefusal(error)` ⇒ list ward cache trước lúc GHN khai tử ward không còn mời chọn lại đúng ward chết (`staleTime` 1 giờ). **KHÔNG làm:** không lọc ward phía FE — chín ward Quận 8 (`20801`-`20803`, `20808`-`20813`) GHN từ chối nhưng không phân biệt được với ward tốt trong master-data, FE đoán hộ sẽ chặn nhầm ward sống. +2 test → **873 test / 112 file**. **✅ Verify runtime trên prod 2026-08-28** (sau khi push, worker chạy bundle mới): thêm địa chỉ probe Quận 8 / Phường 1 cho `user1` (**không** đặt mặc định ⇒ địa chỉ thật không bị sửa), `POST /order/shipping-fee` trả **400** đúng chuỗi `"GHN cannot deliver to this ward — pick another shipping address"`, UI hiện câu tiếng Việt dưới mục 1 + dòng trỏ ngược ở cột tóm tắt + phí *"Không giao được"* + nút đặt hàng **disabled**, và `main.innerText` **không** chứa `GET` / `/api/` / `deliver`. `GET /shipping/wards?districtId=1450` vẫn trả đủ **16 ward kể cả chín ward chết** ⇒ xác nhận quyết định không lọc phía FE là đúng. Đã xoá địa chỉ probe, sổ địa chỉ về đúng 1 địa chỉ mặc định như trước; không đặt đơn. |
| 2026-08-27 | **CRASH-0827 · giỏ hàng không được phép nói dối khi backend hỏng** (class **A**). **Entry viết bù 2026-08-28** — lượt 2026-08-27 làm xong code + test nhưng không đóng vòng (không CHANGELOG, không snapshot, chưa commit), nên file này còn ghi 856/111 trong khi `backend-handoff.md` cùng lượt đã ghi 871/112; dựng lại từ diff 3 commit + inbox BE chứ không từ trí nhớ. Một chủ đề chung: **chỗ nào hệ thống biến "tôi không biết" thành "không có"** — đúng cái lie BATCH-FAIL-01 diệt ở gateway, lượt này tìm nốt bản sao phía client. **(1) `ErrorBoundary`**: chưa có boundary nào dưới router ⇒ một route ném là trắng cả app (vết SKU-NULL-01); nay `RootErrorBoundary` bọc cây provider + `RouteErrorBoundary` **trong** `<main>` ⇒ trang chết nhưng **vỏ app vẫn sống** (nav/giỏ/chat bấm được). **(2) `fetchBatchTolerant` trigger thứ hai**: hàm chỉ fan-out khi batch **404**, nhưng BE đo lại 2026-08-27 xác nhận gateway `.catch(() => [])` ⇒ 404 **không bao giờ tới**, cái tới là `200 []`. Rỗng tệ hơn 404 vì không có gì để `catch`: **một** dòng giỏ trỏ id chết là render giỏ **rỗng sạch** + chặn checkout bằng "Chỉ còn 0" mọi dòng. Nay mảng rỗng cho danh sách id không rỗng bị coi là *chưa xác minh* ⇒ fan-out. Comment `P2-06` ghi "backend now skips missing ids" là **sai sự thật**, đã sửa. **(3) Type giỏ**: `ServerCart.id`/`ServerCartItem.cartId` thành nullable, `createdAt`/`updatedAt` optional — SHAPE-01 chốt **đủ 5 key ở cả hai trạng thái**; giữ `?` để **prod cũ vẫn đúng type**. **(4) `cartLineName()`**: `CartPage` dán `"Sản phẩm không còn tồn tại"` cho **mọi** dòng không tra được ⇒ cùng câu nói dối của gateway, chỉ dời vào UI: product-service chớp một cái là người mua đọc "cả giỏ đã bị xoá" và **thêm lại món chưa từng mất**; nay tra hỏng ⇒ "Chưa tải được tên sản phẩm" + banner "Giỏ hàng của bạn vẫn còn nguyên" + nút thử lại. `CheckoutPage` đã đúng sẵn, không đụng. **KHÔNG làm:** không bỏ trigger 404 — gỡ **cả hai** chỉ sau khi BATCH-FAIL-01 lên prod, vì `extractStatusCode` đoán status theo từ khoá (`"not found"` → 404) nên giữ lại sẽ biến lỗi hạ tầng bắt được thành `[]` im lặng. **871 test / 112 file**. **Runtime verify: không có** — cả ba nhánh chỉ hiện khi product-service chết, không dựng được trên prod mà không phá dịch vụ thật. |
| 2026-08-26 | **SWEEP-0826 · F3 voucher (phần FE) + VOUCHER-EDIT-01 + VOUCHER-GUARD-01 — class **B**, đã verify runtime trên prod, chưa push (chờ user duyệt).** Ba việc trong một lượt. **(1) Sửa voucher (VOUCHER-EDIT-01)**: `AdminVouchersPage` trước đây chỉ tạo + tắt, tắt là **một chiều** — sai một ký tự trong `description` là phải bỏ mã đi tạo lại. Nay `CreateVoucherForm` tổng quát thành `VoucherForm({ voucher?, … })` dùng chung cho cả tạo lẫn sửa (không nhân bản form 10 field), thêm nút **Sửa** + **Bật lại**. Toàn bộ ngữ nghĩa PATCH nằm trong helper thuần `voucherAdmin.ts` chứ không rải trong JSX: `voucherToFormData` (DECIMAL `"10.00"` → `"10"`, null → `''`), `buildUpdateVoucherDto` (**vắng = giữ nguyên, `null` = xoá, `{}` = no-op** — và **không bao giờ** phát `code`/`discountType`/`discountValue`/`sellerId` vì BE trả 400 `property … should not exist`), `hasVoucherEdits`, `voucherEditBlockedMessage` (mirror **cả hai** 400 của mã đã có người dùng: `usedCount > 0` chỉ được **nới lỏng**, và `usageLimit < usedCount`), `voucherLooseningConfirm` (nới lỏng **không đi ngược lại được** ⇒ chặn bằng `window.confirm` trước khi gửi). Sửa luôn 2 câu copy **sai sự thật** đang nằm trên UI: form tạo từng ghi "không sửa được" cho *mọi* field, và confirm tắt mã từng ghi là vĩnh viễn. **(2) Gợi ý voucher ở checkout (F3 mục 2)**: `POST /order/vouchers/available` + `queryKeys.orders.availableVouchers(basketSignature)` (dùng lại chữ ký giỏ có sẵn làm cache key) → danh sách mã bấm-để-điền dưới ô nhập, `features/cart/voucherSuggestions.ts` xếp mã dùng được (giảm nhiều nhất trước) → mã **sắp** dùng được (`MIN_ORDER_NOT_MET`, thiếu ít nhất trước, in "Mua thêm X để dùng mã này") → mã chết, và dịch 8 giá trị `ineligibleReason` sang tiếng Việt — **không bao giờ** để enum thô lọt ra UI (có test riêng pin điều này). Query để `retry: false` + render rỗng khi lỗi ⇒ endpoint chưa có trên prod thì trang checkout **y hệt như cũ**, đường nhập tay không suy suyển. **(3) VOUCHER-GUARD-01**: `discountValue >= minOrderAmount` với mã `fixed` là đơn 0đ ⇒ chặn ngay ở zod, nhưng **chỉ khi** có đặt đơn tối thiểu > 0 — thiếu sót thì rơi về đúng 400 mà `voucherAdminErrorMessage` đã in verbatim. `toVoucherNumber` tách sang `lib/domain/voucherMoney.ts` (2 feature dùng chung, đúng ngưỡng DRY). **KHÔNG làm**: F3 mục 3 (màn voucher cho seller) — optional, để lượt sau. +40 test / +2 file → **846 test / 111 file**. **Verify runtime trên prod cùng ngày** (dev server local trỏ `VITE_API_TARGET` vào worker, dữ liệu prod thật): cụm route voucher **đã lên `api` `origin/main`** lúc 14:39 (`e10506f`) — lượt đọc `git log origin/main` đầu phiên còn thấy `ad67e15` nên entry gate ban đầu ghi nhầm class **C**; đã sửa thành **B** và chuyển sang *Ready to release*. Lượt MCP bắt được **2 bug thật trong chính code lượt này**, đã sửa + test: (a) nhãn/chữ công tắc bị hard-code "Đang bật" cho mọi mã ở chế độ sửa ⇒ mã đã tắt vẫn đọc là đang bật, screen reader nhận tên sai — tách `voucherActiveToggleCopy`; (b) `datetime-local` chỉ giữ tới phút mà `diffOptionalDate` so với ISO thô ⇒ `expiresAt` prod `…23:59:59.000Z` bị chấm là lệch 59 giây, mở form rồi bấm Lưu là bị chặn "siết Thời gian kết thúc" (và trên mã chưa ai dùng thì sẽ **âm thầm dời hạn sớm hơn 59 giây**) — nay so với chính chuỗi đã seed vào input. **Lượt audit tiếp theo cùng ngày** (user: *"còn bug voucher bên FE thì fix luôn"*) đọc thẳng source BE (`voucher.dto.ts` + `orders.service.ts`, read-only) và ra **3 bug FE nữa**, đã sửa + test: (a) 🔴 xoá ô **Đơn tối thiểu** ở form sửa gửi `minOrderAmount: null` → cột là `NOT NULL DEFAULT 0`, `@IsOptional()` cho `null` lọt pipe, handler `.toFixed(2)` không guard ⇒ **500 chứ không phải 400**; nay helper riêng `diffMinOrderAmount` gửi **`0`** (row đã `0` thì bỏ key) và `types/order.ts` bỏ `| null` để tsc chặn tại compile-time; (b) 🔴 form **tạo** cho phép mã `fixed` không có đơn tối thiểu, mà guard BE là `discountValue >= (minOrderAmount ?? 0)` nên **400 chắc chắn 100%** — ô trống so với `0` chứ không phải "không có gì để so"; nay `fixed` bắt buộc có đơn tối thiểu lớn hơn số tiền giảm, hint dưới ô đổi theo loại mã; (c) 🟡 lỗi VOUCHER-GUARD-01 gắn `path: ['discountValue']` — field **`readOnly` ở chế độ sửa** ⇒ admin nhận lỗi trên ô không bấm được, nay chuyển sang `['minOrderAmount']`. Kéo theo tách `voucherCreateSchema` / `voucherEditSchema`: chế độ sửa **cố ý không** enforce luật fixed-vs-minimum vì BE chỉ re-check khi patch *có mang* `minOrderAmount` — enforce ở zod sẽ khoá cứng một row cũ vi phạm sẵn (không sửa nổi cả `description`); ca patch có mang minimum thì `voucherEditBlockedMessage` bắt vì hàm đó biết diff. Đã ghi `backend-handoff.md`: BE nên trả **400 có message** thay vì 500 trắng cho `minOrderAmount: null` (không chặn FE — FE không gửi null nữa, và `null` vốn không hợp lệ theo chính contract BE). **Đánh giá flow: không đổi flow, chỉ đổi guard** — cả 3 bug là *guard sai chỗ* do FE **đoán** luật BE thay vì đọc. +10 test → **856 test / 111 file** |
| 2026-08-21 | **SKU-NULL-01 · crash trắng trang `/sell/:id` — bắt được lúc verify OVERFETCH-01 trên prod** (class **A**, không đụng contract BE). Mở trang sửa sản phẩm bằng `shop1` ra `Unexpected Application Error! Cannot read properties of null (reading 'trim')`. Truy từ stack minified: `_g` = `skuForPayload` (`n.trim()`), gọi từ memo dựng payload; sản phẩm prod trả `"sku": null`. Gốc rễ là **type nói dối**: `Product.sku` khai `string` non-null trong khi cột BE nullable (seller để trống lúc tạo, hoặc mã nằm ở `skus[]`) ⇒ `CreateProductPage.tsx:117` đổ thẳng `null` vào field. **Không phải regression của batch OVERFETCH-01**: `git show HEAD~6` có y hệt dòng đó, `git log -S` quy về `88975c4`. Sửa theo hướng để compiler tự chỉ chỗ: `sku: string \| null` (sự thật BE) rồi để `tsc` liệt kê consumer — lòi ra **chỗ crash thứ hai chưa ai thấy**: ô tìm kiếm ở `/shop` (`p.sku.toLowerCase()`) sẽ nổ ngay ký tự đầu tiên nếu shop có **một** sản phẩm không SKU. Hai helper thuần thay cho guard inline: `skuForField()` (`product-form/productSku.ts`) và `filterProductsByQuery()` (`features/shop/productSearch.ts`). `ProductDetail.tsx:255` vốn đã guard `detail.sku &&` ⇒ không đụng; `lowStock.ts` đọc `InventoryRecord.sku` (type khác, BE luôn trả). +9 test / +1 file → **806 test / 109 file**. **ĐÃ LÊN PROD 2026-08-21** — 2 commit `2ca28f7..58593ac`; bundle live đổi `index-pu_rTDgS` → `index-CB1r6daf`, `CreateProductPage-CFi9uyBF` → `BHxf_w1l`, `ShopPage-CAvQNGGZ` → `Bu6OSltv`. Verify lại bằng `shop1`: `/sell/prod_BWg2OVHUlmrlEfP5` render đủ form (tên/danh mục/giá 45000/kho 50/cân 250, ô **Mã SKU trống** đúng như `sku: null`), không còn error screen; `/shop` gõ `a` → 15 hàng, `tai nghe` → 2, `zzzqqq` → *"Không tìm thấy sản phẩm nào."*, xoá query → 23 hàng, **0 console error của app**. Danh sách prod của `shop1` có **đúng 2** sản phẩm SKU rỗng ⇒ test này đi thật vào nhánh null chứ không phải may. **Bổ sung cùng ngày:** tạo thêm `prod_82NLlCVqNmyiuK9b` (có `skus[]`, giá 10.000đ) trên prod để phủ nốt **prefill ma trận SKU** — chi tiết ở §OVERFETCH-01 bên dưới |
| 2026-08-16 | **SWEEP-0816 · đóng cả 4 mục audit 2026-08-16 + 3 lỗ a11y chỉ MCP mới thấy** (class **A** — không đụng contract BE). **AUD-0816-01** (🔴, tiền thật): `PaymentResultPage` in "Thanh toán thất bại" khi *request xác minh* hỏng chứ không phải khi thanh toán hỏng ⇒ buyer đã trả tiền có thể trả lần hai. Tách verdict ra helper thuần `features/payment/paymentResultVerdict.ts` — `resolvePaymentVerdict(data, isError)` → `success \| failed \| unverified`; `data === undefined` **không còn** rơi vào nhánh đỏ mà ra panel hổ phách "chưa xác minh được" trỏ `/order/:id` (nguồn sự thật). Giữ `retry: false` **cố ý**: retry một callback gateway đã redirect xong không làm nó đúng thêm. **AUD-0816-02**: 6 trang render lỗi query y hệt "rỗng thật" (`CartPage` ra "giỏ hàng trống", 2 trang duyệt ra "không có gì chờ duyệt" ⇒ moderator tin hàng đợi đã sạch, `AdminPage`/2 trang analytics ra trắng). Thêm `lib/http/apiError.ts` (`toApiError`) + `components/shared/TableErrorRow.tsx` (bọc `ApiErrorState … embedded` trong `<tr><td colSpan>`) rồi nối `error`+`refetch` ở cả 6 site — dùng lại `ApiErrorState` có sẵn, không đẻ khuôn mới. **AUD-0816-03**: thay vì vá 19 call site, ép tên vào **type**: `IconButton` nhận union `AccessibleName` (`aria-label` hoặc `title` — thiếu cả hai là **lỗi compile**), `ModalCloseButton` tự đặt tên. **AUD-0816-04**: bỏ `Number()` thừa quanh tiền ở `AdminPage:105`, `OrderHistoryPage:210`, `SellerOrdersPage:99/162/215` — `Number(null)=0` vô hiệu hoá guard `null → '—'` của `toMoneyNumber`. **Phần chỉ MCP mới bắt được** (quét a11y tree thật của Chrome, không phải regex): regex cũ chỉ soi `<IconButton` nên **mù** hẳn một lớp control — 12 `role="switch"` trên `/shop` (mỗi hàng sản phẩm một cái) đọc lên chỉ là "switch, checked", ô upload ảnh nét đứt ở `/sell`, và 4 nút mở lightbox trong `PostCard` (ảnh `alt=""` nên nút phải tự đặt tên). Sửa theo cùng lối bền vững: `label` thành prop **bắt buộc** của `ToggleSwitch` + `aria-label` trên control (không phải trên `<div>` bọc — `title` ở wrapper **không** đặt tên cho button bên trong). Cũng verify runtime bằng MCP: chặn `fetch` một endpoint trả 4xx/5xx qua `initScript` để bắt nhánh lỗi chạy thật (categories ra "Hệ thống đang bảo trì"), không cần đụng backend. Quét lại `/`, `/cart`, `/shop`, `/sell`, `/orders`, `/sell/orders`, `/admin*`: **0 control không tên, 0 nút icon méo, 0 icon bẹp**. 3 nghi ngờ tự loại sau khi đo (`rounded-full` là pill **chữ**, badge header 36→42px là padding chứ không overflow, `'0 đ'` khớp nhầm bên trong số lớn hơn). +22 test / +3 file → **746 test / 106 file** |

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
- **CHG-PW-01 — FE xong hết, chờ `api` push.** `POST /user/change-password` đã code + self-test
  xong phía BE nhưng **mới ở working tree**: `api` `origin/main` vẫn `97fec7b` (đo bằng
  `git ls-remote` 2026-08-29 — đừng đọc ref local, lượt VOUCHER-BE-01 đã sai đúng kiểu đó). FE đã
  commit nhưng **không push**: tab "Bảo mật" gọi route chưa tồn tại trên prod ⇒ user bấm vào ra
  `404`. Cả cây làm việc vì thế là lớp **C**, kéo theo cả NAV-DEDUP-01 (tự nó là B). Push BE
  trước, FE ngay sau, cùng phiên — entry ở `../.agent-local/release-gate.md` §Ready to release đã
  `✅` cả hai ô. Verify prod sau khi push: đúng 6 case đã chạy ở local (xem Recent closes) nhưng
  **phải dùng tài khoản dùng-một-lần**, đừng đổi mật khẩu của `user1`/`shop1`/`admin1`.
- **CHAT-ROOM-01 — BE xong nhưng CHƯA lên prod; FE **cố ý chưa dọn**.** `1ea9ed6` chỉ có trên
  branch `feat/chat-room-01-user-rooms`, **không** có trên `api` `origin/main` (đo 2026-08-15).
  Nên `joinAll()` (`chatPresenceSocket.ts:41`) + re-join theo query cache (`:89`) vẫn là **thứ duy
  nhất** làm presence socket nhận được `new_message`; bỏ bây giờ là mất tiếng chuông và mất cập
  nhật preview cho **mọi** hội thoại không mở, cho tới khi BE merge. Bỏ ngay sau khi BE push (FE
  đổi một mình được, không cần entry Holding — `emit('join')` vẫn sống nên hai chiều đều đúng).
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
- Forgot-password success-leg — code thật chỉ in ở console user-service (SMTP tắt ở dev).
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

## History

Việc đã xong — toàn bộ item P0/P1/P2, các sweep đã đóng, và lý do của từng thay đổi — nằm trong
`CHANGELOG.md` (cùng thư mục, không auto-load). Đọc khi cần lịch sử của một thay đổi cụ thể.

> Backlog của **bộ context agent** (`.ai/`, `.claude/`, `.codex/`) — khác backlog sản phẩm ở trên —
> nằm ở `context-system-backlog.md` cùng thư mục. `/sweep` không đọc file đó.
> Đợt audit 2026-08-03/04 đã đóng **hết**, file đó giờ là sử liệu chứ không còn việc.
> Từ nay dùng `/sync-context` để rà drift doc↔code thay vì làm tay.
