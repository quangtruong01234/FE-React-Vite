# CHANGELOG — TryBuy Frontend

> Historical record of completed FE work. **NOT auto-loaded** by any agent entry point.
> Read on demand only when you need the history/rationale of a past change.
> Current state (readiness, open/blocked tasks, known issues) lives in `snapshot.md`.
> Newest first. Việc trước **2026-07-10** đã dời sang `CHANGELOG.archive.md` (cùng thư mục).

## Maintenance

### CHG-PW-02 · hai loại `401` của đổi mật khẩu giống hệt nhau trên prod — bỏ đọc `message`, hỏi thẳng server (2026-08-29)

Verify CHG-PW-01 **trên prod** (sau khi user push `f809197..ce02013`, tài khoản dùng-một-lần
`e2eprod0806`) lộ ra một bug **chỉ prod mới có**: nhập **sai mật khẩu hiện tại** thì form in
*"Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."* — câu sai hoàn toàn, phiên vẫn sống.

**Vì sao local đúng mà prod sai.** `isExpiredSession()` phân biệt hai loại `401` bằng `message`
(*"Access token is required"* / *"Unauthorized"* ⇒ hết phiên; còn lại ⇒ sai mật khẩu). Trên prod,
exception filter của gateway **dẹp `message` xuống đúng tên HTTP error**, nên cả hai loại về
byte-identical:

```
401 {"statusCode":401,"status":"error","error":"Unauthorized","message":"Unauthorized", …}
```

Nghĩa là câu sai-mật-khẩu rơi trúng nhánh hẹp của `isExpiredSession()`. Đo bằng cách so **lần
submit sai thật** (reqid=314, cookie sống) với một probe `credentials: 'omit'` (không cookie —
guard tự chặn): hai body giống nhau từng ký tự. Không có cách nào sniff `message` mà đúng được.

**Sửa: bỏ hẳn việc đoán, hỏi server.** `isExpiredSession()` và `messageOf()` **xoá**; thay bằng

- `isAuthFailure(error)` — đúng nghĩa đen: status là `401`/`403`, không đọc chữ.
- `isSessionAlive()` — gọi `GET /user/me`; `200` ⇒ phiên còn sống ⇒ `401` vừa rồi là **sai mật
  khẩu**; `401`/`403` ⇒ phiên chết thật. Lỗi mạng ⇒ trả `true`, tức **thiên về giữ user ở lại**:
  đá một phiên đang sống ra `/login` vì rớt mạng tệ hơn là in nhầm câu lỗi.

`changePasswordError(error, sessionAlive = true)` nhận thêm tham số thay vì tự đọc `message`;
`ChangePasswordForm` chỉ trả giá một request phụ **trên nhánh lỗi 401/403**, đường thành công và
mọi status khác (`429`/`400`/`404`) không đụng tới. Mặc định `true` giữ hàm dùng được trong test
mà không cần dựng probe.

Đây là **contract gap của BE chứ không phải của FE** — đã ghi `../.agent-local/backend-handoff.md`
→ `CHG-PW-02` (3 cách sửa nhận được: giữ nguyên `message` gốc, thêm `errorCode` ổn định, hoặc trả
`400`/`422` cho sai mật khẩu). Có một trong ba là FE bỏ được probe.

**Gates:** `npm run build` ✓ · **921 test / 115 file** (riêng `changePassword.test.ts` **21 test**
— +5: 2 case đổi sang probe, `describe('isAuthFailure')` 2 case, `describe('isSessionAlive')` 3
case dùng `msw` chặn `/user/me`).

---

### CHG-PW-01 · đổi mật khẩu khi đang đăng nhập — tab "Bảo mật" (2026-08-29)

User: *"test change password chưa?"* → *"BE đã done CHG-PW-01 tiep tuc"*. FE đã dựng sẵn form từ
trước nhưng endpoint chưa có nên **chưa test thật được** (mọi lần submit ra `404`); lượt này BE
code xong `POST /user/change-password` ở local, nên làm nốt phần verify thật + hai chỗ contract
mà chỉ chạy thật mới lộ ra.

---

**Chỗ đặt:** `EditProfileModal` thêm cặp tab **"Hồ sơ" / "Bảo mật"**. Hai `<form>` render **luân
phiên**, không lồng nhau — form lồng form là HTML không hợp lệ và submit của form trong sẽ kích
luôn form ngoài.

**Hai cạnh sắc của contract, cả hai đẩy vào helper thuần có test chứ không để inline trong form:**

- **Body đúng hai field** `currentPassword` + `newPassword`. `confirmPassword` là của form, không
  phải của API — gateway validate bằng `forbidNonWhitelisted` nên để nó lọt xuống dây là **biến
  một lần đổi hợp lệ thành `400`**. `changePasswordPayload()` thu ba field xuống hai, có test chốt
  `not.toContain('confirmPassword')` để lần sau ai nối thẳng `data` vào body thì gãy ở test.
- **Hai loại `401` cùng về một call, chỉ `message` phân biệt được:** sai mật khẩu hiện tại (guard
  đã qua, cookie **còn sống**) vs. `JwtAuthGuard` tự chặn (*"Access token is required"* /
  *"Unauthorized"* — phiên chết thật). Call đặt `skipUnauthorizedRedirect` nên loại thứ nhất
  không còn bị interceptor đá về `/login`; `isExpiredSession()` match **theo chiều hẹp** — chỉ
  đúng câu chữ của guard mới tính là hết phiên. Cố ý ngược đời: BE mà đổi lời văn câu
  sai-mật-khẩu thì case phổ biến vẫn rơi đúng ô, còn nếu match chiều kia thì một lần BE sửa copy
  là user bị đá ra khỏi phiên đang sống.

Phần còn lại của `changePasswordError()`: `429` (rate limit 5 lần/60s ở gateway) → câu ở form,
`400` → ô mật khẩu mới, `404` → *"Tính năng chưa sẵn sàng"* (nói thẳng thay vì để rơi vào nhánh
lỗi mạng — đây chính là cái đã che mất sự thật "endpoint chưa có" ở lượt trước).

**`PasswordField` dời `features/auth/` → `components/shared/`** vì giờ hai feature folder dùng
(`auth` + `user`), đúng ngưỡng DRY của `core.md`; thêm prop `autoComplete` để ô mật khẩu hiện tại
khai `current-password`. Hai chỗ gọi cũ (`LoginPage`, `ForgotPasswordForm`) đổi import, giữ
nguyên hành vi.

**Verify runtime thật** (FE `localhost:5174`, BE local, Chrome DevTools MCP, tài khoản dùng-một-lần
`chgpw_test` trên **dev DB** — không đụng prod): submit rỗng → 3 lỗi field; nhập lại lệch → lỗi ở
ô confirm; mật khẩu mới trùng mật khẩu cũ → chặn **client-side**, không có request nào bay đi;
sai mật khẩu hiện tại → **401**, câu lỗi nằm dưới ô "Mật khẩu hiện tại", vẫn ở nguyên trang và
`GET /user/me` sau đó **200** (chứng minh `skipUnauthorizedRedirect` chạy đúng); đổi hợp lệ →
**201**, form clear, phiên còn sống; đăng nhập lại bằng mật khẩu cũ → **401**, bằng mật khẩu mới
→ **201**.

**Chưa push:** đây là item lớp **C** — `POST /user/change-password` phía BE **mới chỉ ở working
tree**, `origin/main` của `api` vẫn `97fec7b` (đo bằng `git ls-remote`, không đọc ref local). Đẩy
FE trước là giao cho user một tab bấm vào ra `404`. Xem `../.agent-local/release-gate.md`.

**Gates:** `npm run build` ✓ · `npm run lint` 0 problem · **916 test / 115 file** (riêng
`changePassword.test.ts` **16 test**).

---

### NAV-DEDUP-01 · mỗi mục điều hướng một trang, không mục nào trùng mục nào (2026-08-29)

Header, `LeftRail` và dropdown avatar lớn dần thành **ba bản sao chồng lên nhau** của cùng một tập
link: thông báo vừa ở rail vừa sau cái chuông, "Đơn mua" + trang cá nhân vừa ở rail vừa ở
dropdown, "Đăng sản phẩm" ở rail trong khi chính console người bán đã có nút đó. Hai mục trỏ một
trang thì user không phân biệt được, và cái họ không bấm trông như hỏng.

**`navItems.ts` thành registry duy nhất, mỗi đích nằm ở đúng một nhóm:** header icon (tin nhắn,
yêu thích, giỏ — cộng cái chuông sở hữu `/notifications` vì nó còn mang badge + preview),
dropdown cho **mọi thứ thuộc về cá nhân** (trang cá nhân, đơn mua, trả hàng, sổ địa chỉ), rail cho
những chỗ **không thuộc về một người** (bảng tin, chợ, console shop/admin). Dưới `md` rail bị ẩn
nên dropdown gánh nốt console theo role — **chỉ ở đó**, nên không bề rộng nào hiện hai mục cho một
trang.

**`isNavItemActive` dùng chung** thay vì mỗi surface tự suy: `exact` cho mục cha có con riêng
(`/admin`), `excludes` cho route con đã có mục riêng, `includes` cho trang **đi vào từ mục này mà
không có mục riêng** — `/sell` giờ chỉ làm sáng "Kênh người bán" chứ không còn là lối vào thứ hai.

**`chromeDestinations()` tồn tại để test kiểm được:** `navItems.test.ts` chốt luật một-đích-một-chỗ
trên cả bốn tổ hợp role. Đây đúng là tính chất cứ review xong lại hỏng, nên nay để test giữ chứ
không giữ bằng mắt. Logo brand **cố ý đứng ngoài** danh sách: đó là affordance về trang chủ mà
site nào cũng có, không phải một mục menu.

**Gates:** `npm run build` ✓ · `npm run lint` 0 problem · +1 file test (`navItems.test.ts`) → nằm
trong **916 test / 115 file** cùng CHG-PW-01.

---

### VOUCHER-SHOP-FE-01 · màn voucher cho seller — một màn hình, hai role (2026-08-29)

User: *"check xem bên handoff có nói về nó không nếu có thì làm"*. Có: `frontend-handoff.md` §F3,
mục 3 của "FE action needed" — *"Optional: a seller voucher screen off the three `shop`-role
routes"* — và chính lượt SWEEP-0826 đã ghi *"**Item 3 deliberately skipped** — it is marked
optional"*. Lượt này làm nốt. Ba route shop đó (cộng `PATCH …/:id` của VOUCHER-EDIT-01) đã live
trên prod từ 2026-08-26, nên đây là class **B** thuần FE: không có gì bên BE phải đợi.

---

**Vấn đề không phải "viết một trang mới", mà là "đừng viết trang thứ hai".** `AdminVouchersPage`
là **682 dòng**: form 10 field, bảng, phân trang, confirm tắt/nới lỏng, mirror hai cái 400 của mã
đã redeem. Màn của seller giống tới ~95% — luật BE **y hệt** ở cả hai phía, chỉ khác URL và ý
nghĩa của một cái 403. Copy-paste là nhân đôi mọi luật voucher và đảm bảo hai bên lệch nhau sau
lần sửa đầu tiên; `core.md` §DRY cũng bắt tách khi một pattern UI xuất hiện ở 2+ chỗ.

**1 · Tách thành `src/features/voucher/` — role-neutral.** Không đặt ở `components/shared/` (chỗ
đó dành cho reusable *generic*, không phải một console của một domain), cũng không để trang role
`shop` import ngược từ `features/admin/` (ngược chiều phụ thuộc). Bố cục:

- `voucherRules.ts` + `voucherRules.schema.ts` — `git mv` từ `features/admin/voucherAdmin.ts`,
  **nội dung luật không đổi một dòng nào**. Đổi đúng hai thứ: docblock nói rõ luật dùng chung cho
  cả hai role, và `voucherAdminErrorMessage(error, action)` → `voucherConsoleErrorMessage(error,
  action, forbidden?)` — **chỉ** nhánh 401/403 nhận được câu chữ từ caller, 409/404/400 vẫn là
  câu chung (test chốt điều này, vì nới rộng chỗ override là mở đường cho hai console nói khác
  nhau về cùng một lỗi).
- `VoucherConsole.tsx` — nguyên thân `AdminVouchersPage` cũ, nhận `binding`.
- `voucherConsoleBinding.ts` — **toàn bộ** khác biệt giữa hai role gom vào đây: 4 endpoint, 2
  query key, 5 câu copy. Nhờ vậy `VoucherConsole` **không bao giờ** rẽ nhánh theo role.

Hai trang còn lại là vỏ 14 dòng: `features/admin/AdminVouchersPage.tsx` (giữ nguyên đường import
của route cũ) và `features/shop/SellerVouchersPage.tsx`. Build xác nhận tách có lợi thật: hai
trang lazy nay dùng chung một chunk `voucherConsoleBinding` **23.45 kB / 7.38 kB gzip** thay vì
mỗi trang một bản console.

**2 · Ba cái bẫy của route shop, xử ngay ở binding chứ không ở JSX.**

- **Tạo mã không được mang `sellerId`** — không phải "bị bỏ qua" mà là **400
  `SELLER_NOT_ASSIGNABLE`**; quyền sở hữu lấy từ cookie. May là `buildCreateVoucherDto` vốn không
  phát field đó, nên không phải sửa gì — nhưng có test chốt `expect(dto).not.toHaveProperty('sellerId')`
  để lần sau ai thêm vào form thì gãy ở test chứ không gãy trên prod.
- **403 ở route shop mơ hồ *có chủ đích*** — hoặc sai role, hoặc mã của shop khác, và BE cố ý
  không nói rõ cái nào. Nên copy của seller phải phủ cả hai nghĩa (*"Shop chỉ sửa được mã của
  chính mình"*) chứ không dùng lại câu của admin (*"Bạn không có quyền quản lý mã giảm giá"*),
  câu đó đọc như một khẳng định sai.
- **Query key**: viết `["orders","seller","vouchers"]` là sai — `queryKeys.orders.seller` là
  prefix **invalidate của đơn bán**, TanStack match theo prefix nên **mọi** thao tác đơn của
  seller sẽ kéo theo refetch list voucher. Key thật là `["orders","vouchers","mine"]` (soi theo
  route), kèm test chốt cả ba tính chất: `listKey` phải là prefix của mọi `listPageKey`, hai
  console phải **rời nhau**, và seller-voucher phải **nằm ngoài** `orders.seller`.

**3 · Route + rail.** `/sell/vouchers`, `ProtectedRoute requiredRole="shop"`, lazy như mọi trang
route-level. Hai chỗ suýt sai trong `LeftRail`: (a) mục `/sell` ("Đăng sản phẩm") active bằng
`isActive('/sell')` và mới chỉ loại trừ `/sell/orders` ⇒ vào `/sell/vouchers` là **hai mục cùng
sáng**, đã loại trừ nốt; (b) block admin đã có sẵn một link nhãn **"Mã giảm giá"** — tài khoản
vừa `shop` vừa `admin` sẽ thấy **hai nhãn y hệt nhau** trỏ hai trang khác nhau, nên nhãn của
seller là **"Mã giảm giá shop"**.

**Bẫy Windows, ăn một lượt build:** đặt tên `voucherConsole.ts` (helper) cạnh `VoucherConsole.tsx`
(component) ⇒ **`TS1149`** — filesystem case-insensitive nên với tsc đó là *một* file. Đổi tên
helper thành `voucherRules.*` chứ không đổi tên component.

**Không làm:** không đụng `evaluateVoucher`/luật ở `voucherRules.ts` (tách là tách, không kèm
refactor luật); không thêm cột `scope` cho bảng admin trong lượt này.

**✅ Verify runtime trên prod 2026-08-29** (`shop1`, FE origin thật, sau khi CD ship `1b5ceb7` —
trang render được chính là bằng chứng deploy): guard role đúng (`user1` → `/`, ẩn danh → `/login`);
`GET /order/vouchers/mine` → 200, `total 3`, **mọi dòng** `sellerId usr_xU2Q7pGhhFpduGWz`;
`POST /order/vouchers` → **201**, body **không có khoá `sellerId`**, code tự hoa (`shopfe0829` →
`SHOPFE0829`), optional rỗng bị bỏ hẳn, sau đó **đúng một** lượt refetch list; form sửa hydrate
khoá đúng code/loại/mức giảm; `PATCH /order/vouchers/8/deactivate` → **200**. Mã test `SHOPFE0829`
để lại ở trạng thái **tắt**, `usedCount 0`; không đặt đơn, không đụng mã nào có sẵn. **Hai nhánh
chưa chạy qua UI** (thao tác bị permission classifier chặn, không phải lỗi sản phẩm): **403 chạm mã
shop khác** và **nhánh lưu** của form sửa — cả hai đã verify ở tầng API 2026-08-26, câu chữ 403 có
test trong `voucherConsoleBinding.test.ts`.

**Gates:** `npm run build` ✓ · `npm run lint` 0 problem · +36 test / +1 file → **882 test / 113 file**.

**Files:** `src/features/voucher/{VoucherConsole.tsx, voucherConsoleBinding.ts(+test),
voucherRules.ts(+test), voucherRules.schema.ts}` (3 file sau `git mv` từ `features/admin/`),
`src/features/admin/AdminVouchersPage.tsx` (682 → 14 dòng), `src/features/shop/SellerVouchersPage.tsx`,
`src/api/orders.ts`, `src/hooks/query/queryKeys.ts`, `src/router.tsx`,
`src/components/layout/LeftRail.tsx`, `.ai/context/{structure,domain}.md`.

### SWEEP-0828 · GHN-MSG-01 + GHN-WARD-01 — địa chỉ GHN từ chối, nói bằng tiếng Việt và nói đúng chỗ (2026-08-28)

User: `/sweep` (không tham số) ⇒ lấy đúng **một** item ưu tiên cao nhất trong backlog. Hai entry
**Open** duy nhất của `frontend-handoff.md` mà FE **không** bị chặn bởi một lượt push của BE là
GHN-MSG-01 và GHN-WARD-01 — cùng một field, cùng một flow, cùng class **B**, và cả hai đã live
trên prod từ 2026-08-26. Gộp làm một lượt. (BATCH-FAIL-01, nhánh bỏ fan-out của SHAPE-01,
CHAT-ROOM-01, UPLOAD-SIZE-01 đều đang chờ BE lên prod; VOUCHER-NULL-01, VOUCHER-CANCEL-01,
REPORT-TOTAL-01, OVERFETCH-01, F3 đều là "FE không phải sửa gì".)

---

**Bug thật, không phải việc dọn dẹp.** BE đóng băng lời văn cho hai câu từ chối mới:

- GHN-MSG-01 — `"GHN cannot deliver to this ward — pick another shipping address"`
- GHN-WARD-01 — `"GHN no longer delivers to ward <code> — pick another ward from GET /api/shipping/wards"`

`shippingFeeError.ts` cắt cái đuôi "gọi endpoint này đi" bằng regex `…pick an? \w+ from GET …`.
Nhánh `an?` chỉ khớp `a` / `an`, **không khớp `another`** ⇒ cả hai câu mới đi thẳng qua bộ cắt,
rồi rơi vào nhánh nội suy `Không giao được tới địa chỉ này: ${reason}.` Người mua nhận nguyên
tiếng Anh — và với GHN-WARD-01 là **lộ luôn tên endpoint nội bộ** `GET /api/shipping/wards` ra
banner checkout, đúng loại rò rỉ mà BE-REPORT-0813 đã dọn cho biến thể `district` trước đây.

**1 · Dịch — khớp cả chuỗi, không khớp chuỗi con.** BE nói rõ *"Match on the whole string"*, nên
`WARD_REFUSALS` là ba regex **neo hai đầu** (`^…$`) chứ không phải `includes`: câu GHN-MSG-01, câu
GHN-WARD-01, và câu `"Ward X does not belong to GHN district Y"` có sẵn từ GHN-DIST-01. Cả ba nói
cùng một điều với người mua — GHN không nhận giao tới phường/xã của địa chỉ này — nên dùng chung
một câu copy. BE đổi lời văn sau này thì rơi về nhánh pass-through cũ chứ **không** bị dịch sai.
Câu 400 nào BE chưa đóng băng vẫn giữ nguyên đường cũ: lỗi số điện thoại
(`master_data_validate_phone …`) vẫn in verbatim, vì bảo người mua đi sửa **địa chỉ** là chỉ sai
field. Regex đuôi cũng mở rộng cho `another` + cho câu `— pick another shipping address` (không có
`from GET`).

**2 · Gắn lỗi vào đúng field.** Trước lượt này thông điệp chỉ nằm ở cột tóm tắt bên phải, cạnh nút
đã bị disable — cách mục **1. Địa chỉ giao hàng** cả một trang. Nay câu đầy đủ nằm ngay dưới
`AddressBookPicker`, còn banner cột phải rút thành một dòng trỏ ngược lên (`"… ở mục 1 để tiếp
tục."`) thay vì lặp y hệt. Chỉ đổi cho nhánh `kind === 'address'`; nhánh `outage` (503) và
`unknown` giữ nguyên chỗ cũ vì đó là vấn đề của **phí**, không phải của địa chỉ.

**3 · Cache ward.** GHN-WARD-01 mục (2): một list ward đã cache trước khi GHN khai tử ward vẫn
mời người mua chọn đúng cái ward chết đó (`useWards` để `staleTime` 1 giờ). `queryKeys.shipping`
thêm prefix `wardsAll`, và mutation tính phí `onError` gọi `invalidateQueries` khi
`isGhnAddressRefusal(error)` ⇒ lượt chọn lại được đọc từ list GHN thật sự chấp nhận. Không phải
"invalidate một lần lúc khởi động": đánh đúng vào thời điểm biết chắc list đang sai.

**Không làm:** không lọc thêm ward phía FE. Chín ward Quận 8 (`20801`-`20803`, `20808`-`20813`)
vẫn bị GHN từ chối mà **không** phân biệt được với ward tốt trong master-data — BE đã nói rõ là
không lọc được, và FE đoán hộ thì sẽ chặn nhầm ward sống. Người mua chạm phải sẽ nhận đúng câu
tiếng Việt ở mục 1, đó là toàn bộ những gì làm được cho tới khi GHN sửa master-data.

**Files:** `src/features/cart/shippingFeeError.ts` (+test), `src/features/cart/checkoutSubmitError.test.ts`,
`src/features/cart/CheckoutPage.tsx`, `src/hooks/query/queryKeys.ts`.

**Gates:** `npm run build` ✓ · `npm run lint` 0 problem · `npm run test:run` **873 test / 112 file**
✓ (+2 test).

**✅ Runtime verify trên prod 2026-08-28 (sau khi push, worker đã chạy bundle mới).** Lượt sweep
không có backend nên để nợ; trả nợ ngay sau khi CD lên xong. Cách làm **không đụng dữ liệu cũ**:
`user1` **thêm** một địa chỉ mới ("GHN Ward Probe", Quận 8 / Phường 1), **không** tick mặc định
⇒ địa chỉ thật của `user1` không bị sửa một chữ nào; xong việc thì xoá địa chỉ probe, sổ địa chỉ
trở lại đúng **1 địa chỉ mặc định** như trước. Không đặt đơn, không đụng voucher.

- `GET /api/shipping/wards?districtId=1450` trả **16 ward, vẫn có đủ chín ward bị từ chối**
  (`20801` = "Phường 1" … `20816` = "Phường 16") ⇒ xác nhận đúng lời BE: **không phân biệt được**
  ward chết với ward sống từ master-data, nên FE lọc hộ là chặn nhầm.
- `POST /api/order/shipping-fee` với `toDistrictId: 1450`, `toWardCode: "20801"` → **400**, body
  `"message": "GHN cannot deliver to this ward — pick another shipping address"` — **đúng chuỗi
  GHN-MSG-01 mà regex `an?` cũ để lọt**. Cùng phiên, địa chỉ Quận 1 vẫn ra **201** bình thường.
- UI: dưới mục **1. Địa chỉ giao hàng** hiện *"Không giao được tới địa chỉ này: đơn vị vận chuyển
  không nhận giao tới phường/xã đã chọn. Vui lòng chọn hoặc cập nhật địa chỉ khác."*; cột tóm tắt
  rút còn *"Vui lòng chọn hoặc cập nhật địa chỉ giao hàng ở mục 1 để tiếp tục."*; dòng phí là
  *"Không giao được"*; nút **XÁC NHẬN ĐẶT HÀNG disabled**.
- Quét rò rỉ trên `main.innerText`: **không** có `GET`, **không** có `/api/`, **không** có
  `deliver`. Hai chữ `GHN`/`ward` duy nhất trên trang đến từ **tên địa chỉ probe tôi tự đặt**
  ("GHN Ward Probe"), không phải từ câu lỗi.

### CRASH-0827 · giỏ hàng không được phép nói dối khi backend hỏng (2026-08-27)

> **Entry này viết bù ngày 2026-08-28.** Lượt 2026-08-27 làm xong code + test nhưng **không đóng
> vòng**: không có entry CHANGELOG, không có dòng snapshot, và cũng chưa commit — nên
> `snapshot.md` vẫn ghi `856 test / 111 file` trong khi `backend-handoff.md` của chính lượt đó đã
> ghi `871 / 112`. Phát hiện lúc `/sweep` 2026-08-28 dọn cây làm việc. Nội dung dưới đây dựng lại
> từ diff của ba commit `ee6689a` / `825453e` / `025e786` + mục 4 trong entry "BATCH-FAIL-01 hậu
> kiểm" của `backend-handoff.md`, **không** phải từ trí nhớ của phiên đó. Class **A** — không
> đụng contract nào.

**Một chủ đề chung cho cả ba: chỗ nào hệ thống đang biến "tôi không biết" thành "không có".**
Đó đúng là cái lie mà BATCH-FAIL-01 diệt ở gateway (`.catch(() => [])`), và lượt này đi tìm nốt
các bản sao của nó ở phía client.

**1 · `ErrorBoundary` — một route ném là trắng cả app.** Không có boundary nào dưới router, nên
một lỗi render bất kỳ ăn trắng toàn bộ trang (đúng vết SKU-NULL-01: `/sell/:id` ra
*"Unexpected Application Error!"*). Nay hai lớp, cố ý khác nhau về phạm vi:
`RootErrorBoundary` bọc cây provider, `RouteErrorBoundary` nằm **trong** `<main>` của `AppShell`
⇒ một trang chết thì **vỏ ứng dụng vẫn sống** — nav, giỏ hàng, chat vẫn bấm được, người dùng đi
tiếp được thay vì phải F5. `src/components/shared/ErrorBoundary.tsx` (+ 157 dòng test).

**2 · `fetchBatchTolerant` — trigger thứ hai: `200 []`.** Hàm này vốn chỉ fan-out khi batch trả
**404**. Nhưng BE đo lại 2026-08-27 (SHAPE-01 hậu kiểm) và xác nhận gateway bọc call sản phẩm
trong `.catch(() => [])` ⇒ **404 không bao giờ tới**; cái tới là `200` với mảng rỗng. Rỗng còn tệ
hơn 404: không có gì để `catch`, nên **một** dòng giỏ hàng trỏ vào id chết là render giỏ **rỗng
hoàn toàn** và chặn checkout bằng "Chỉ còn 0" trên mọi dòng. Nay mảng rỗng trả về cho một danh
sách id **không** rỗng bị coi là *chưa xác minh* chứ không phải sự thật ⇒ fan-out từng id. Giá
phải trả: một lượt fan-out thừa khi id chết thật — hiếm, và câu trả lời cuối cùng vẫn là `[]`.
Comment `P2-06` trong `api/products.ts` ghi *"backend now skips missing ids"* là **sai sự thật**,
đã sửa lại đúng cái prod đang làm.

**3 · Type giỏ hàng — khai đúng cái BE trả.** `ServerCart.id` là `number | null` và
`createdAt`/`updatedAt` optional-nullable, `ServerCartItem.cartId` là `number | null`: SHAPE-01
chốt giỏ rỗng trả **đủ năm key ở cả hai trạng thái** (`{ id: null, userId, createdAt: null,
updatedAt: null, items: [] }`) thay vì bỏ bớt key. Giữ `?` để **prod cũ vẫn đúng type**.

**4 · `cartLineName()` — tách "đã bị xoá" khỏi "chưa tra được".** `CartPage` cố ý nuốt lỗi
product và dán nhãn `"Sản phẩm không còn tồn tại"` cho **mọi** dòng không tra được — tức là cùng
một câu nói dối của gateway, chỉ dời từ BE vào UI: product-service chớp một cái là người mua đọc
"toàn bộ giỏ đã bị xoá" trong khi hàng còn nguyên, và phản xạ đầu tiên của họ là **thêm lại
những món chưa từng mất**. Nay tra được mà thiếu ⇒ vẫn `"Sản phẩm không còn tồn tại"`; tra hỏng
⇒ `"Chưa tải được tên sản phẩm"` + banner *"Giỏ hàng của bạn vẫn còn nguyên"* kèm nút thử lại.
`CheckoutPage` đã đúng sẵn (panel lỗi + chặn submit) nên **không đụng**.

**KHÔNG làm:** không bỏ trigger `404` cũ. Cả hai trigger chỉ được gỡ **sau khi** BATCH-FAIL-01 lên
prod — và khi đó phải gỡ **cả hai**, vì `extractStatusCode` của gateway đoán status theo từ khoá
trong message (`"not found"` → 404), nên giữ trigger 404 lại sẽ biến một lỗi hạ tầng bắt được
thành `[]` im lặng: đúng cái cửa sau đã ghi ở `backend-handoff.md` mục 2.

**Files:** `src/components/shared/ErrorBoundary.tsx` (+test), `src/App.tsx`,
`src/components/layout/AppShell.tsx`, `src/lib/http/fetchBatchTolerant.ts` (+test),
`src/api/products.ts`, `src/types/cart.ts`, `src/hooks/query/cartCache.test.ts`,
`src/features/cart/checkoutItems.ts` (+test), `src/features/cart/CartPage.tsx`.

**Gates (đo lại 2026-08-28 cùng cây với SWEEP-0828):** `npm run build` ✓ · `npm run lint`
0 problem · `npm run test:run` ✓. Con số của riêng lượt này là **871 test / 112 file**
(`backend-handoff.md` ghi cùng ngày). **Runtime verify: không có** — cả ba nhánh chỉ hiện ra khi
product-service chết, không dựng được trên prod mà không phá dịch vụ thật.

### SWEEP-0826 · F3 voucher (phần FE) + VOUCHER-EDIT-01 + VOUCHER-GUARD-01 (2026-08-26)

User: *"làm các task về voucher, sau khi làm xong bạn xem flow làm như thế có gây thiệt hại gì không?"*

Class **B** — **chưa push** (chờ user duyệt), entry ở *Ready to release* trong `release-gate.md`.

---

**Class C rồi thành B — và vì sao.** Đọc `api/` (read-only, đúng ranh giới cross-repo) trước khi
viết dòng nào: `git log origin/main` cho `ad67e15`, không có `POST /order/vouchers/available` hay
`PATCH /order/admin/vouchers/:id` ⇒ tôi xếp cả cây là **C** và mở entry Holding. **Đo sai.** Ref
`origin/main` trong bản clone local đã cũ; `git ls-remote origin main` cho `e10506f` — agent BE
push lúc 14:39 cùng ngày. Bài học ghi lại cho lượt sau: **`git ls-remote` mới là cách đo trạng thái
repo khác**, `git log origin/main` chỉ nói về lần fetch gần nhất. Cụm route đã live, verify được
trên prod, nên class đúng là **B** và entry đã chuyển sang *Ready to release*.

**1 · VOUCHER-EDIT-01 — sửa voucher, và bật lại mã đã tắt.**

`/admin/vouchers` trước đây chỉ có *tạo* + *tắt*, và tắt là **một chiều**. Hệ quả thực tế: gõ sai
một ký tự trong `description`, hoặc muốn nới hạn dùng thêm một tuần, đều phải bỏ mã cũ đi tạo mã
mới — mã cũ thì người mua đã lưu, đã share.

Toàn bộ ngữ nghĩa PATCH nằm ở helper thuần trong `voucherAdmin.ts`, không rải trong JSX:

- `voucherToFormData` — DECIMAL `"10.00"` → `"10"`, null → `''` (form giữ chuỗi rỗng = "không
  giới hạn", không được coerce thành `0`).
- `isoToLocalInput` — nghịch đảo của `localInputToIso` đã có; test pin round-trip.
- `buildUpdateVoucherDto` — **vắng field = giữ nguyên, `null` = xoá, `{}` = no-op**, đúng contract
  BE. Và **không bao giờ** phát `code`/`discountType`/`discountValue`/`sellerId`: BE trả
  400 `property … should not exist` cho field immutable, nên gửi kèm "cho chắc" là hỏng cả request.
  Mã `fixed` thì bỏ hẳn `maxDiscountAmount` khỏi payload.
- `voucherEditBlockedMessage` — mirror **cả hai** 400 của mã đã có người dùng: `usedCount > 0` chỉ
  cho **nới lỏng** (siết lại là đổi luật với người đã cầm mã), và `usageLimit` không được nhỏ hơn
  `usedCount`. Bắt trước khi gửi để admin thấy lý do bằng tiếng Việt, không phải sau round-trip.
- `voucherLooseningConfirm` — nới lỏng **không đi ngược lại được** (đã nới thì không siết lại được
  nữa). Chặn bằng `window.confirm` nêu đúng field sắp nới.

UI: `CreateVoucherForm` tổng quát thành `VoucherForm({ voucher?, onCancel, onSaved })` dùng chung
cho tạo + sửa — không nhân bản một form 10 field. Field immutable ở chế độ sửa là `readOnly` /
`disabled` chứ không biến mất, để admin vẫn đọc được giá trị. Mỗi hàng có **Sửa** (luôn có),
**Tắt mã** (khi đang bật), **Bật lại** (khi đang tắt).

Tiện thể sửa **2 câu copy sai sự thật** đang nằm trên UI: form tạo ghi là mã "không sửa được"
(giờ sửa được phần điều kiện), và confirm tắt mã ngụ ý vĩnh viễn (giờ bật lại được).

**2 · F3 mục 2 — gợi ý voucher ở checkout.**

`POST /order/vouchers/available` + `queryKeys.orders.availableVouchers(basketSignature)` — dùng lại
đúng chữ ký giỏ đã có làm cache key, giỏ đổi thì gợi ý tự đổi theo. Dưới ô nhập mã hiện danh sách
bấm-để-điền, xếp bởi `features/cart/voucherSuggestions.ts`: mã dùng được (giảm nhiều nhất trước) →
mã **sắp** dùng được (`MIN_ORDER_NOT_MET`, thiếu ít nhất trước, in *"Mua thêm X để dùng mã này"*) →
mã chết. 8 giá trị `ineligibleReason` được dịch sang tiếng Việt và có test pin rằng **enum thô
không bao giờ lọt ra UI**; giá trị lạ (BE thêm về sau) rơi về câu chung chứ không render mã máy.

Response được coi là **gợi ý, không phải giấy phép** — nguồn sự thật vẫn là `validate` lúc bấm và
`POST /order` lúc đặt. Query để `retry: false` và render **rỗng** khi lỗi/404 ⇒ endpoint hỏng thì
trang checkout **y hệt trước đây**, đường nhập mã tay không suy suyển.

**3 · VOUCHER-GUARD-01.** Mã `fixed` có `discountValue >= minOrderAmount` là đơn 0đ (hoặc âm) ⇒
chặn ngay ở zod. **Chỉ** kiểm khi có đặt đơn tối thiểu > 0 — không có mức tối thiểu thì không có gì
để so, và mọi ca guard này bỏ sót vẫn rơi đúng vào 400 mà `voucherAdminErrorMessage` in verbatim.

`toVoucherNumber` tách sang `lib/domain/voucherMoney.ts` — hai feature (`admin` + `cart`) cùng dùng,
đúng ngưỡng DRY của `core.md`, thay vì để bản sao thứ hai trong `voucherSuggestions.ts`.

**Cố ý KHÔNG làm:** F3 mục 3 — màn hình voucher cho seller. Mục này vốn là *optional* trong handoff.

**4 · Verify runtime trên prod (MCP) — và 2 bug nó bắt được trong chính code lượt này.**

Chạy dev server local với `VITE_API_TARGET` trỏ vào Cloudflare Worker (worker reverse-proxy `/api/*`
sang gateway) ⇒ **code FE chưa push chạy trên dữ liệu prod thật**. Đăng nhập `admin1` rồi `user1`.

- 🔴 **Công tắc bật/tắt nói dối ở chế độ sửa.** Mở **Sửa** trên `E2EPROD0806` (`isActive: false`,
  hàng in "Đã tắt") thì công tắc hiện `switch "Mã đang được bật"` + chữ "Đang bật". Bind thì đúng
  (`checked={isActive}`), nhưng **cả nhãn lẫn chữ bên cạnh bị hard-code** theo `isEdit`. Screen
  reader nhận tên "Mã đang được bật" cho một switch đang off. Tách `voucherActiveToggleCopy(isEdit,
  isActive)`: **accessible name phải đứng yên** — role `switch` tự đọc checked/unchecked — còn chữ
  hiển thị mới là thứ mang trạng thái.
- 🔴 **Mở form rồi bấm Lưu = bị chặn "siết Thời gian kết thúc", dù không sửa gì.** `expiresAt` của
  `E2EPROD0806` trên prod là `2026-12-31T23:59:59.000Z`, mà `datetime-local` chỉ giữ tới **phút** ⇒
  ISO dựng lại sớm hơn **59 giây**, và `diffOptionalDate` so nó với ISO thô nên chấm là một lần siết.
  Trên mã đã có người dùng thì bị chặn (đó là cái tôi thấy); trên mã **chưa ai dùng** thì tệ hơn —
  không có guard nào, PATCH đi và **âm thầm dời hạn mã sớm lại 59 giây** mỗi lần admin mở form bấm
  Lưu. Sửa: so `raw` với **chính chuỗi đã seed vào input** (`isoToLocalInput(current)`) thay vì so
  hai mốc ISO; field nào input không biểu diễn nổi thì không thể là "đã sửa".

Phần verify còn lại đều đúng như thiết kế: lưu-khi-không-đổi ⇒ "Chưa có thay đổi nào để lưu." và
**không phát request**; hạ `usageLimit` 5→3 ⇒ chặn client-side nêu đúng tên trường; nâng 5→7 ⇒
`window.confirm` cảnh báo một chiều (**đã hủy** — nới trên prod là không hoàn lại được); round-trip
Bật lại → Tắt mã trên `TRYBUY20K` ⇒ PATCH 200 + refetch, đã trả về nguyên trạng; checkout `user1`
giỏ 10.000 đ ⇒ "Mua thêm 90.000 đ để dùng mã này.", lên 110.000 đ ⇒ "−11.000 đ", áp mã ⇒ tổng
99.000 đ. Không đặt đơn. Dữ liệu prod sau lượt test **giống hệt trước lượt test**.

**5 · Audit lại toàn bộ bề mặt voucher đối chiếu source BE — 3 bug FE nữa.**

User: *"còn bug voucher bên FE thì fix luôn, mà bạn đánh giá xem cần sửa lại flow voucher gì
không, nếu có lí do tại sao?"* Đọc `api/` read-only (`voucher.dto.ts`, `orders.service.ts`) rồi
soi ngược lại code FE lượt này — không đoán contract, đọc thẳng handler.

- 🔴 **Xoá ô "Đơn tối thiểu" ở form sửa = 500 trên prod.** `minOrderAmount` là cột
  `NOT NULL DEFAULT 0`, DTO khai `minOrderAmount?: number` (**không** `nullable: true`), handler
  gọi `input.minOrderAmount.toFixed(2)` không guard. Mà `@IsOptional()` của class-validator bỏ qua
  validation cho **cả `null`**, nên `null` lọt pipe và ném `TypeError` ⇒ **500, không phải 400**.
  FE lượt trước dùng `diffOptionalNumber` chung cho mọi số ⇒ ô trống → `null` → nổ. Bất kỳ admin
  nào cũng chạm được, vì `voucherToFormData` seed ô bằng `"0"` kể cả khi row là `0.00`. Sửa: helper
  riêng `diffMinOrderAmount` — trống = "không yêu cầu" = **`0`**; row đã `0` thì bỏ hẳn key. Và
  `types/order.ts` bỏ `| null` khỏi field này để TypeScript chặn tại compile-time, không chỉ tại
  runtime. Đã ghi vào `backend-handoff.md` (BE nên trả 400 có message thay vì 500 trắng) — nhưng
  đây **không** phải workaround: `null` vốn không hợp lệ, chính entry VOUCHER-EDIT-01 của BE đã
  ghi *"muốn bỏ ngưỡng thì gửi `0`"*.
- 🔴 **Form tạo cho phép mã `fixed` không có đơn tối thiểu — BE 400 100% số lần.** Guard BE là
  `discountValue >= (minOrderAmount ?? 0)`: ô trống **không phải** "không có gì để so", nó so với
  `0` và luôn thua. Zod lượt trước lại `minOrder > 0` mới kiểm ⇒ đúng ca hỏng chắc chắn thì bỏ qua.
  Sửa: mã `fixed` **bắt buộc** có đơn tối thiểu lớn hơn số tiền giảm; hint dưới ô đổi theo loại mã
  ("Bỏ trống = không yêu cầu" chỉ còn đúng với `percent`).
- 🟡 **Lỗi VOUCHER-GUARD-01 chỉ vào field không bấm được.** Issue gắn `path: ['discountValue']` —
  field **`readOnly` ở chế độ sửa**. Admin hạ `minOrderAmount` của mã `fixed` thì nhận lỗi đỏ trên
  ô không sửa được, còn ô sửa được thì sạch. Chuyển sang `path: ['minOrderAmount']`.

Kéo theo một quyết định về **schema**: tách `voucherCreateSchema` / `voucherEditSchema` (cùng một
object, khác `superRefine`). Chế độ sửa **cố ý không** enforce luật fixed-vs-minimum, vì BE chỉ
re-check khi patch *có mang* `minOrderAmount` — enforce ở zod sẽ khoá cứng một row cũ vi phạm sẵn,
admin không sửa nổi cả `description` lẫn nút tắt. Ca patch *có* mang minimum thì
`voucherEditBlockedMessage` bắt, vì hàm đó biết diff.

**Đánh giá flow (user hỏi thẳng): không cần đổi flow, chỉ đổi guard.** Ba bug trên đều là *guard sai
chỗ*, không phải kiến trúc sai: dữ liệu vẫn một chiều form → DTO thuần → mutation, nguồn sự thật vẫn
là BE, gợi ý vẫn chỉ là gợi ý. Cái sai chung của cả ba là **FE đoán luật BE thay vì đọc luật BE** —
`null` thì "chắc là xoá", `?? 0` thì "chắc là không so". Một thứ **có thể** đổi nhưng là quyết định
sản phẩm nên để user chốt: danh sách gợi ý ở checkout đang render **mọi** dòng BE trả về, gồm cả
EXPIRED / FULLY_REDEEMED / USER_LIMIT_REACHED / NO_DISCOUNT — thứ người mua không cách nào biến
thành tiền. Sắp xếp đã đẩy dòng dùng được lên đầu nên tác hại thấp, và giữ dòng chết có cái lợi là
"mã này có thật, tôi hết lượt rồi" — nên **không tự ý lọc**.

Gates: build ✓ · lint 0 problem · **856 test / 111 file** (+50 test / +2 file so với đầu lượt).

---

### SWEEP-0816 · đóng cả 4 mục audit + 3 lỗ a11y mà chỉ MCP mới nhìn thấy (2026-08-16)

User: *"còn bug/gap nào không?"* → `/sweep audit` ra 4 mục → *"làm all"* → *"nhớ run mcp check UI"*.

Class **A** (không đụng contract BE, không đổi request/response nào) — nhưng đây **không** phải lượt
dọn cosmetic: mục 🔴 đầu tiên là một bug tiền thật.

---

**AUD-0816-01 🔴 · `PaymentResultPage` khẳng định "thanh toán thất bại" khi thứ hỏng là *request xác minh*.**

`useQuery({ retry: false })` không lấy `isError` ra, và verdict được tính bằng
`data?.status === 'success' | '1' | '00'`. Nghĩa là `data === undefined` — cái xảy ra khi
`GET payment result` dính 500 / timeout / mất mạng — rơi **thẳng** vào nhánh đỏ. Kịch bản hỏng:
buyer thanh toán VNPay/ZaloPay **thành công**, gateway redirect về, request xác minh hỏng, trang in
"Giao dịch qua VNPay không thành công. Vui lòng thử lại." ⇒ buyer có thể trả tiền lần hai. Effect
tiêu cart chỉ chạy khi `isSuccess` nên giỏ hàng còn nguyên, càng giống "chưa thanh toán".

Sửa: tách verdict ra helper thuần `features/payment/paymentResultVerdict.ts` —
`resolvePaymentVerdict(data, isError): 'success' | 'failed' | 'unverified'`, `SUCCESS_CODES` là một
`Set` (`success`/`1`/`00`) thay vì chuỗi `||`. `PaymentResultPage` render ba nhánh phẳng; nhánh mới
là panel hổ phách "chưa xác minh được" trỏ về `/order/:id` — **nguồn sự thật duy nhất** cho việc tiền
đã vào hay chưa, và tuyệt đối không khẳng định thất bại.

Hai thứ **cố ý giữ nguyên**:

- `retry: false` — retry một callback mà gateway đã redirect xong không làm nó đúng thêm; cái buyer
  cần là được chỉ sang đơn hàng, không phải xoay spinner.
- Không tự tiêu cart ở nhánh `unverified` — chưa biết đơn có tồn tại hay không thì xoá giỏ là phá
  dữ liệu của buyer.

**AUD-0816-02 🟡 · 6 trang render lỗi query y hệt "rỗng thật".**

Không phân biệt được "fetch hỏng" với "không có gì" là bug về sự thật, không phải về mỹ thuật:
`CartPage` ra màn "giỏ hàng trống" (buyer tưởng giỏ bị xoá), `PendingBrandsPage`/`PendingCategoriesPage`
in "Không có thương hiệu/danh mục chờ duyệt" (moderator tin hàng đợi đã sạch), `AdminPage` ra hai
bảng rỗng không một dòng báo lỗi, `AdminAnalyticsPage`/`ShopAnalyticsPage` → `AnalyticsDashboard`
(`!isLoading && data &&`) render **trắng hoàn toàn**.

Sửa bằng cách dùng lại khuôn có sẵn (`ApiErrorState`, đúng lối `OrderDetailPage` đang làm), chỉ thêm
hai mảnh còn thiếu:

- `lib/http/apiError.ts` — `toApiError(error: unknown): ApiError | null`, narrow đúng kiểu strict-mode
  thay vì `as` bừa ở 6 chỗ.
- `components/shared/TableErrorRow.tsx` — `<tr><td colSpan>` bọc `<ApiErrorState … embedded />`, vì
  ba trong sáu site là **bảng** và nhét một `<div>` vào `<tbody>` là HTML sai.

Rồi nối `error` + `refetch` ở cả 6 site. Không đẻ component lỗi thứ hai.

**AUD-0816-03 🟡 · 19/28 icon-only button không có tên cho screen reader — sửa ở *type*, không sửa ở call site.**

Vá `aria-label` cho 19 chỗ thì lượt sau lại mọc chỗ thứ 20. `IconButton` giờ nhận union
`AccessibleName`: phải có `aria-label` **hoặc** `title`, thiếu cả hai là **lỗi compile**. `ModalCloseButton`
(dùng chung cho mọi modal) tự đặt tên. Cả một lớp bug chuyển từ "phải nhớ" sang "không viết sai được".

**AUD-0816-04 🟢 · `Number()` thừa quanh tiền.**

Đợt RET-NUM-01 bỏ sót `AdminPage:105`, `OrderHistoryPage:210`, `SellerOrdersPage:99/162/215`. Hôm nay
chưa sai, nhưng `Number(null) = 0` **vô hiệu hoá** guard `null → '—'` của `toMoneyNumber`
(`lib/format/utils.ts:14-18`) — ngày nào field thành nullable thì tiền thiếu in ra `0 đ`, và `0 đ`
là con số trông hợp lệ nên không ai nhận ra.

---

**Phần MCP (`/verify-ui`) — và tại sao nó tìm được thứ regex không bao giờ tìm ra.**

Verify runtime cả 4 fix trên app sống, rồi quét tiếp. Hai kỹ thuật đáng giữ lại:

1. **Ép nhánh lỗi chạy thật mà không đụng backend:** `navigate_page` với `initScript` patch
   `window.fetch` để trả 4xx/5xx cho **đúng một** endpoint. Trang duyệt danh mục ra
   "Hệ thống đang bảo trì" — tức là AUD-0816-02 đúng ở runtime chứ không chỉ đúng trong test.
2. **Hỏi a11y tree thật của Chrome thay vì grep source.** Audit tĩnh của tôi soi `<IconButton`, nên
   nó **mù** hẳn một lớp control không đi qua component đó:
   - **12 `role="switch"` không tên trên `/shop`** — một cái mỗi hàng sản phẩm; đọc màn hình nghe
     đúng "switch, checked", không biết đang bật/tắt cái gì.
   - **Ô upload ảnh nét đứt ở `/sell`** (`product-form/BasicInfoSection.tsx`) — control cuối cùng
     không tên của trang.
   - **4 nút mở lightbox trong `PostCard`** — `<img alt="">` (post không có caption để mượn) nên
     **nút** phải tự đặt tên, nếu không cả feed toàn "button".

   Sửa theo đúng lối bền vững của AUD-0816-03: `label` thành prop **bắt buộc** của `ToggleSwitch` +
   `aria-label` đặt trên **control**. Ghi rõ ở comment vì đây là chỗ dễ sai lại: `title` trên `<div>`
   bọc ngoài **không** đặt tên cho `<button>` bên trong — attribute phải nằm trên chính control.

**Ba nghi ngờ tự loại sau khi đo** (ghi lại để lượt sau khỏi "phát hiện" lại):

- `rounded-full` 91,9×30 trên "Theo dõi" — pill **chữ**, không phải icon button méo.
- Badge header 36→42px — padding, không phải overflow.
- `'0 đ'` trên `/sell/orders` — khớp nhầm **bên trong** một số lớn hơn; đi bộ theo leaf node ra
  `count: 0`.

Quét lại `/`, `/cart`, `/shop`, `/sell`, `/orders`, `/sell/orders`, `/admin*`: **0 control không tên ·
0 nút icon méo · 0 icon bẹp · 0 lỗi absolute-centering**.

**Gate:** `npm run build` ✓ 14,30s · `npm run lint` 0 problem · `npm run test:run`
**746 test / 106 file** (+22 test / +3 file: `paymentResultVerdict.test.ts`, `apiError.test.ts`,
`ToggleSwitch.test.tsx`).

**Không có entry BE mới** — cả 4 mục lẫn 3 lỗ a11y đều là FE-side, không mục nào chạm contract.

### SWEEP-0815b · BE trả lời 4 mục inbox → triển khai đúng phần FE làm được **hôm nay** (2026-08-15)

User: *"BE đã fix xong và note => bắt đầu triển khai code"*.

**Cái quyết định toàn bộ lượt này: không tin nhãn "done" của handoff.** `frontend-handoff.md` §Open
ghi cả `CHAT-ROOM-01` lẫn `UPLOAD-SIZE-01` là đã xong, "release class B" — đọc như thế thì FE cứ
việc dọn mitigation. Nhưng `release-gate.md` lại nói **toàn bộ working tree của `api` đang bị giữ ở
class C**, tức là BE *viết xong* chứ chưa *ship*. Đi đọc thẳng repo `api/` (read-only, đúng
cross-repo boundary) thì ra bằng chứng:

- `1ea9ed6` (CHAT-ROOM-01) chỉ có trên branch `feat/chat-room-01-user-rooms`; `origin/main` đang ở
  `6bcb6da` và **không** chứa nó.
- `b071a25`, `786bdc3`, `5ceb46c` (UPLOAD-SIZE-01) chỉ có trên `fix/upload-size-01-server-cap`;
  `git merge-base --is-ancestor 5ceb46c origin/main` → **không phải ancestor**.

⇒ Việc được chia lại theo **cái đang chạy trên prod**, không theo cái BE viết trong inbox. Ba mục ra
ba kết cục khác nhau, và mỗi kết cục đều là quyết định có lý do chứ không phải "làm được đến đâu hay
đến đó".

**IDLEAK-02 — làm đủ (mục duy nhất FE đi trước là an toàn).**

BE đổi `submittedBy` từ PK số sang public id `usr_…`, và trả `null` khi tài khoản không resolve
được, **vắng hẳn field** khi user service chết. Trước đó FE render thẳng `#{brand.submittedBy}`.

- `types/catalog.ts` — `submittedBy?: string | null` trên **cả** `PendingBrand` và `PendingCategory`
  (optional vì trạng thái "vắng field" là thật, không phải phòng xa).
- `features/admin/submitterLabel.ts` (mới) — helper thuần: `null`/`undefined`/chuỗi rỗng → `—`, còn
  lại in nguyên. **Cố ý nhận cả `number`**: BE đang bị giữ ở class C nên prod *vẫn* trả PK số, và
  helper phải đúng ở cả hai thời điểm. Đây là lý do FE ship trước được — `submitterLabel(23)` ra
  `'23'`, degrade sạch.
- `PendingBrandsPage.tsx:101` + `PendingCategoriesPage.tsx:101` — thay `#{...}` bằng
  `{submitterLabel(...)}`. **Bỏ luôn dấu `#`**: ghép `#` vào `usr_…` là in id opaque ra UI, đúng cái
  IDLEAK sinh ra để chặn (cùng vết với `Người dùng #usr_xxx` đã sửa ở BATCH-0813).
- `types/order.ts` — `TopProductStat.productId` nới thành `string | null`. Tidy-up thuần: **0
  consumer** (`AnalyticsDashboard` chart theo `productName`), nhưng để `number` ở đó là để lại một
  cái bẫy `Number()` cho lượt sau.
- +5 test (`submitterLabel.test.ts`): public id, `null`, `undefined`, số `23`, chuỗi rỗng.

**UPLOAD-SIZE-01 — làm nửa an toàn, cố ý bỏ nửa còn lại.**

BE giờ trả `maxBytes`/`maxVideoBytes` kèm chữ ký, và nhận `?bytes=` để từ chối sớm.

- `types/upload.ts` — thêm 2 field **optional**, camelCase (của mình, không phải của Cloudinary).
- `lib/http/uploadValidation.ts` — `resolveUploadCap(caps, kind)` + `oversizeMessage(kind, max)`;
  `validateUploadFile` dùng lại `oversizeMessage` để hai guard nói **cùng một câu**.
- `lib/http/cloudinary.ts` — chặn theo cap của server ngay đầu `uploadChunked`. Cái này bắt được
  đúng chỗ chữ ký **không thể** tự bắt: chữ ký cấp trước khi có byte nào nên chỉ biết trần của
  *folder* — ảnh 11 MB vào `trybuy/posts` lọt qua trần video 100 MB của folder đó, chỉ check
  theo-type mới chặn.
- Field vắng ⇒ fallback về `MAX_IMAGE_BYTES`/`MAX_VIDEO_BYTES` ⇒ **hôm nay hành vi không đổi một
  ly**, và khi BE hạ trần thì FE tuân theo mà không cần deploy.
- +1 test ở `signedUploadFields.test.ts` ghim caps **không bao giờ** được append vào FormData — param
  không nằm trong chữ ký SHA1 sẽ làm Cloudinary từ chối, đúng vết **UP-05**. +6 test ở
  `uploadValidation.test.ts`.
- **Không gửi `?bytes=file.size`.** BE prod hiện tại (`forbidNonWhitelisted`) sẽ trả
  `400 "property bytes should not exist"` — đúng cái bẫy đã ghi ở `backend-handoff.md` §DEPLOY-0813
  — nghĩa là **chết mọi upload**, đổi một cải tiến thành sự cố. Thêm sau khi BE lên prod.

**CHAT-ROOM-01 — cố ý 0 dòng.** Dọn `joinAll()` (`chatPresenceSocket.ts:41`) và re-join theo query
cache (`:89`) hôm nay là tắt tiếng chuông + đóng băng preview/badge cho **mọi** hội thoại không mở,
cho tới lúc branch kia merge. Giữ nguyên, ghi rõ trong snapshot là chờ **push** chứ không chờ code.

**UP-03(i) — không có việc cho FE.** BE dọn orphan server-side (GC có đếm tham chiếu), nên
`RichTextEditor.tsx:66-71` giữ **nguyên**: nó track theo session rồi `deleteMedia`, và vẫn không
được cleanup lúc unmount vì làm vậy là phá ảnh của bản save thành công.

**Bonus — key bug bắt được lúc runtime-verify, không phải lúc đọc code.**

Verify IDLEAK-02 bằng Chrome DevTools MCP: prod trả `data: []` ở **cả hai** hàng đợi duyệt nên
không có hàng nào để nhìn. Thay vì tạo brand/category chờ duyệt thật trên prod, stub `window.fetch`
qua `initScript` với 4 trạng thái hợp đồng (PK số `23`, `usr_…`, `null`, thiếu hẳn field) + chuỗi
rỗng. Cột render đúng cả 4 (`23` · `usr_60ccb7b981c411f1` · `—` · `—`), không tràn cột. Nhưng
`list_console_messages` trả về một lỗi React không liên quan tới IDLEAK-02:

> `Each child in a list should have a unique "key" prop … Check the render method of \`tbody\`.
> It was passed a child from PendingCategoriesPage.`

Cả hai trang `map()` ra `<>` **trần** rồi đặt `key` lên `<tr>` bên trong. `key` phải nằm trên phần
tử mà `map` trả về; đặt vào con thì React không thấy và **reconcile hàng theo vị trí**. Hệ quả thật,
không chỉ là log bẩn: duyệt/từ chối một hàng ở giữa danh sách làm mọi hàng dưới nó tụt lên một bậc
trong khi DOM/state giữ nguyên chỗ cũ — ô "Lý do từ chối" đang mở nhảy sang nhầm hàng.

- `PendingBrandsPage.tsx` + `PendingCategoriesPage.tsx` — `<>` → `<Fragment key={x.id}>`, bỏ `key`
  thừa trên `<tr>` chính và trên `<tr>` reject (`key={\`reject-…\`}` cũng vô nghĩa: nó là con của
  fragment, không phải phần tử của list).
- +4 test / +2 file (`PendingBrandsPage.test.tsx`, `PendingCategoriesPage.test.tsx`) — spy
  `console.error`, assert **không** có warning `unique "key" prop`, cộng assert nhãn người gửi.
  Đã kiểm chứng ngược: tạm trả `key` về `<tr>` thì test fail đúng chuỗi warning ở trên.

**Gates:** `npm run build` ✓ (tsc + vite) · `npm run lint` ✓ 0 problem · `npm run test:run`
**724 test / 103 file** pass (từ 708/100). +16 test / +3 file.

**Release:** class **B** — BE cũ vẫn đúng ở cả ba thay đổi. Đã flip ô `frontend` của **IDLEAK-02**
sang `✅ ready` trong `release-gate.md`; entry **vẫn nằm ở Holding** vì `web-flow-GHN` còn `⏳`
(`topProducts[].productId`), nên `api` chưa được mở khoá. Chưa push — chờ user.

### SWEEP-0815 · triage backlog "chờ backend" — clear 2 mục stale, filed 3 mục lần đầu (2026-08-15)

User: *"làm các task BE report, trước khi làm check xem task bị cũ thì clear hoặc coi lại đã tự fix
ở task khác chưa"*.

**Kết quả: 0 dòng code FE thay đổi.** Không phải vì lười đi soi — mà vì đi soi từng mục xong thì
mỗi mục đều rơi vào một trong ba ô: đã có người trả lời rồi mà snapshot chưa cập nhật, đã tự đóng ở
task khác, hoặc thật sự chỉ backend mới sửa được. Vì không sửa `src/**` nên không có test mới; ba
gate vẫn chạy để xác nhận working tree (đang mang phần chưa commit của FE-DEBT-0814) còn xanh.

**Stale — clear khỏi §Chờ backend.**

- **P0-03 · "nhánh update của inventory chưa chắc atomic"** — treo từ trước, nhưng
  **PATCH-ATOMIC-01** (2026-08-12, `backend-handoff.md` §Done) đã trả lời dứt điểm ba ngày trước
  đó: **không atomic, và không thể atomic**. Catalog (MySQL) và inventory (Postgres) là hai service
  DB riêng, không có transaction chung, và **không có đường compensation cho nhánh update** — khác
  create (create hỏng thì rollback nguyên con product, đó là INV-CONTRACT-01). Nghĩa là `PATCH
  /products/:id` có thể đã ghi xong một phần field trước khi bước inventory hỏng, **vĩnh viễn**.
  ⇒ Guard `onError` ở `CreateProductPage.tsx:220-254` (invalidate `products.detail(id)` +
  `products.withInventory(id)`) **không phải TODO tạm**, mà là hành vi đúng lâu dài → chuyển sang
  §Guard cố ý giữ để lượt refactor sau không "dọn" nhầm. Lời dặn kèm theo của BE ("nhớ invalidate
  cả `skuList`") **đã tự thoả mãn** — `queryKeys.ts` khai `detail: (id) => ["products", id]` và
  `withInventory: (id) => ["products", id, "inventory"]`, mà TanStack Query invalidate theo
  **prefix**, nên invalidate `detail` là quét luôn mọi key con. Không cần thêm dòng nào.
- **"Ảnh post 404 — prod chưa quét lần nào"** — quét prod hôm nay qua Chrome DevTools MCP (isolated
  context, `fetch` với `credentials: 'include'`): feed prod có đúng **1** post mang `imageUrls:
  null` và **0** URL Cloudinary trong toàn bộ feed. Không có ảnh chết nào để dọn, không có console
  error nào trên happy path. Mục này chỉ còn là giả thiết chưa ai kiểm — nay kiểm rồi, sạch.

**Nguyên nhân gốc khiến 2 mục còn lại treo vô hạn.**

`UP-03(i)` và max-size **chưa bao giờ được viết vào inbox của backend**. Chúng nằm ở snapshot FE
dưới nhãn "chờ backend" — nhưng `snapshot.md` là file FE tự đọc, không phải file BE đọc. Tức là
suốt thời gian qua không ai thật sự hỏi. Nay đã filed vào `../.agent-local/backend-handoff.md`
§Open, mỗi entry kèm line-number của chính chỗ hở trong `api/` (đọc chứ không sửa — cross-repo
boundary):

- **`UP-03(i)`** — `apps/product/src/product.service.ts:1626` / `:1640` gọi
  `destroyDroppedImages(previousImageUrls, updated.imageUrls ?? [])`, tức chỉ diff **field**
  `imageUrls` và không bao giờ parse HTML trong `description`. Ảnh RichTextEditor đã nằm trong bản
  lưu ⇒ orphan mãi mãi. Xin BE cho `description` đi qua cùng đường diff bằng
  `destroyUnreferencedMedia()` (đã có reference counting từ MEDIA-ORPHAN-01). FE đã mitigate hết
  mức: `RichTextEditor.tsx:66-71` track theo session rồi `deleteMedia`; **không** được cleanup lúc
  unmount vì như vậy là phá ảnh của một bản save thành công.
- **`UPLOAD-SIZE-01`** — `apps/gateway/src/upload/upload.service.ts:48` mới ký
  `allowed_formats&folder&public_id&timestamp`. `MAX_IMAGE_BYTES` (`lib/http/uploadValidation.ts`,
  dùng ở `useProductForm.addImages:287` + `RichTextEditor:100`) là guard **UX**, không phải guard
  bảo mật — client bỏ qua nó là upload thẳng lên Cloudinary được. Xin `max_bytes` nằm trong chuỗi
  ký (hoặc signed upload preset có `max_file_size`), và xin BE nói rõ con số.

**Sai inbox — `CHAT-ROOM-01`.**

Ask "emit `new_message` vào room theo user" là hướng **FE→BE**, nhưng từ 2026-06-30 nó nằm trong
`frontend-handoff.md` (inbox BE→FE, tức file backend agent **không** đọc như inbox của mình). Đó là
lý do nó đứng yên gần hai tháng. Đọc lại code để chắc ask còn đúng: `chatPresenceSocket.ts:41`
`joinAll(convs)` vẫn join từng conversation một, `:89` vẫn subscribe query cache để re-join khi
danh sách đổi — ask còn nguyên giá trị. Chuyển sang `backend-handoff.md` §Open; bên
`frontend-handoff.md` để lại dòng "Done = done sitting in the wrong inbox, không phải đã trả lời".

**Giữ nguyên — `submittedBy` class C.**

Đo lại prod: `topProducts[].productId` vẫn trả `23` (number) ⇒ BE chưa ship. FE **đúng** khi giữ
`types/catalog.ts:14,29` là `number` theo lời dặn ở BE-REPORT-0813. Hold còn hiệu lực.

**Ghi kèm vào inbox BE: block "đã kiểm chứng 2026-08-15 — KHÔNG phải bug, đừng đi truy lại"** —
gồm ảnh post 404 trên prod (không tồn tại), class C vẫn numeric trên prod, và P0-03 đã được
PATCH-ATOMIC-01 trả lời + advice `skuList` đã tự thoả mãn. Mục đích: chặn lượt sweep sau đi
re-derive lại đúng ba thứ này.

**Gate** (chạy trên working tree đang có, gồm phần chưa commit của FE-DEBT-0814): `npm run build` ✓
· `npm run lint` **0 problem** · `npm run test:run` **708 test / 100 file** xanh.

### FE-DEBT-0814 · đóng 3 lint warning + convert arbitrary sizing có token khớp (2026-08-14)

User: *"làm các task Nợ FE"* — dọn backlog scale-consistency trong snapshot §Còn lại phía FE.

**Lint 3 → 0.**

- `src/context/AuthContext.tsx` tách ba: `authContextValue.ts` giữ `AuthContextValue` +
  `createContext`, `useAuthContext.ts` giữ hook, `AuthContext.tsx` chỉ còn `AuthProvider`.
  `react-refresh/only-export-components` fire khi một module vừa export component vừa export
  non-component; tách file là cách sửa duy nhất. 11 importer repoint sang
  `@/context/useAuthContext`; `App.tsx` + `LoginPage.test.tsx` vẫn lấy `AuthProvider` từ
  `@/context/AuthContext` (đúng, không đổi).
- `ui/badge.tsx` + `ui/button.tsx` export `cva` variants cạnh component — đúng thứ rule bắt, nhưng
  `src/components/ui/` write-blocked nên warning không bao giờ actionable, chỉ che warning thật.
  Tắt bằng override **scope đúng folder đó** trong `eslint.config.js`, kèm comment lý do.

**Arbitrary sizing → token: 94 occurrence.**

| Nhóm | Trước | Sau | Quy tắc |
|---|---|---|---|
| `rounded-[10px]` / `rounded-[20px]` | 43 | **0** | → `rounded-tb-input` (10px) / `rounded-tb-sheet` (20px) |
| Spacing `-[Npx]` | 99 | **53** | chỉ N có token đúng byte: 2→0.5, 10→2.5, 14→3.5, 40→10, 44→11, 64→16 |
| `text-[Npx]` | 122 | **117** | chỉ 5 site đã tự pin `leading-*` |

Nguyên tắc: **chỉ đổi khi token khớp đúng byte**. 18/22/26/34/42/46/52/60/68/72/76/84px và
container width không có token → giữ. `text-[14px]`/`[16px]` có `text-sm`/`text-base` nhưng named
size set luôn `line-height`, 10 site đó không pin `leading-*` → giữ. Trước khi nhận đổi radius đã
quét mọi call `cn()` xem có hai class `rounded-*` chọi nhau không (`tailwind-merge` không nhận
`rounded-tb-*` là border-radius như nó nhận `rounded-[10px]`) — 0 hit.

**Sự cố trong lúc làm — đã khôi phục sạch.** Lượt convert spacing đầu chạy regex qua
`node -e "…"`; bash nuốt `\\[` thành `[` nên `-\[14px\]` biến thành character class, 7 pass dồn
nhau ghi hỏng **92 file** (`top-0` → `top-px0.5.5`), chạm cả `src/components/ui/` và file test.
Khôi phục bằng `git stash push -- src` về HEAD `80de0b3` (không dùng `git checkout` — bị deny
trong `.claude/settings.json`), rồi apply lại bằng script ghi ra file, literal-replace, có
self-test 8 ca (gồm đúng ca `top-0 z-[100]` phải bất biến) chạy trước khi ghi. Số thay thế khớp
đúng con số scan dự đoán (46) trước khi tin.

Gate: `npm run lint` 0 problem · `npm run build` ✓ · `npm run test:run` **708/708 pass**.

### DOC-STALE-0813 · dọn state cũ trong snapshot / DEPLOYMENT / release-gate (2026-08-13)

Không đổi code. User yêu cầu sau khi một lượt tra cứu ra kết luận sai: *"clear giúp tôi những cái cũ
hoặc đã hoàn thành đi chứ research lại ra sai tiếp"*. Bốn chỗ state đã chết nhưng vẫn đọc như việc
đang mở:

- **CD-FE-01 đóng.** `snapshot.md` còn nguyên mục "Chờ thao tác của người dùng · CD-FE-01 — chờ
  setup một lần" với 3 việc chủ tài khoản Cloudflare/GitHub phải nhập. Thực tế đã nhập xong từ
  trước 2026-08-11: `deploy.yml` có **3 guard fail-fast** (bất kỳ `VITE_*` nào rỗng → `::error::`,
  `dist/` còn `localhost:3000` → fail, `GATEWAY_ORIGIN` rỗng → fail trước `wrangler deploy`), nên
  một deploy xanh **tự nó là bằng chứng** mọi giá trị đã có — mà CD-FE-03 đã deploy xanh + verify
  prod ngày 2026-08-11. Xoá khỏi snapshot; `DEPLOYMENT.md` §One-time setup được gắn banner
  "already done — reference for a token rotation, not open work".
- **`DEPLOYMENT.md` §4 (backend env) không còn bắt buộc.** Nó viết "FE is cross-origin to the
  gateway" — tiền đề đã sai từ CD-FE-02: Worker reverse-proxy `/api/*` + `/socket.io/*` nên request
  là same-origin, CORS không gate nữa. Đổi thành cảnh báo "not required anymore", giữ nội dung cũ
  cho ngày FE trỏ thẳng vào gateway. Tiện thể sửa "add three **variables**" → **four** (bảng ngay
  dưới liệt kê 4 dòng: 3 × `VITE_*` + `GATEWAY_ORIGIN`).
- **8 commit hôm nay đã lên prod, không phải "chưa push".** `origin/main` = `80de0b3`, reflog
  `update by push` lúc 21:03. Verify bằng chính bundle live (MCP, isolated context): entry đổi
  `index-BRya1NEn.js` → `index-CK3z688j.js`; chunk `CheckoutPage-3cL7Kved.js` mang cả `from GET`
  lẫn `Đặt hàng thất bại` (hai chuỗi **chỉ** có trong BE-REPORT-0813), `PostDetailPage-B2OeGL2J.js`
  in `Người dùng` **không** kèm `#` ⇒ SOCIAL-AUTHOR-01 live. Entry `release-gate.md` chuyển
  **Ready to release → Released** kèm bằng chứng này.
- **Payment return URL nằm nhầm mục "Chờ backend"** — BE đã fix từ 2026-08-07, cái còn lại thuần FE
  ("đừng xoá `resolveResultOrderId()` cho tới khi payment row cũ hết hạn"). Tách ra mục mới
  **"Guard cố ý giữ — đừng dọn khi refactor"**.

Kèm theo, snapshot gọn lại: khối MEDIA-ORPHAN 25 dòng (phần lớn là lịch sử điều tra + một
meta-correction về entry handoff không tồn tại) rút còn 1 bullet giữ đúng phần còn actionable —
*prod chưa quét*; hai mục `~~gạch ngang~~` ở "Runtime verification còn nợ" (P1-06 chat, F2
return/refund — đã chạy E2E prod 2026-08-13) rút còn đúng nhánh chưa chạy (reconnect, từ chối);
`submittedBy` (class C, BE giữ) được **thêm** vào snapshot — trước đó chỉ nằm trong
`../.agent-local/frontend-handoff.md`, đọc snapshot một mình sẽ không thấy. `release-gate.md` còn
một con trỏ chết "hai phát hiện mới → `backend-handoff.md` → **Open**": cả hai đã đóng trong
DEPLOY-0813, sửa lại kẻo lần sau đi tìm ở Open.

### BE-REPORT-0813 · dọn nốt 3 FYI cuối của inbox BE + đóng DEPLOY-0813 (2026-08-13)

Lượt `/sweep` thứ hai trong ngày, user chỉ định phạm vi: *"làm task BE report"* — tức phần `## Open`
còn lại của `../.agent-local/frontend-handoff.md`. Sau BATCH-0813 chỗ đó còn đúng ba entry, **cả ba
đều được BE dán nhãn "no FE change needed — FYI"**, cộng một ask FE→BE (per-user chat room) không
phải việc của FE. Bài học của lượt này nằm ở chỗ: *nhãn "no FE change needed" là kết luận của BE về
contract, không phải kết luận về UI.* Một trong ba entry hoá ra vẫn có việc phải làm.

**IDLEAK-01 — đúng là không phải sửa source, nhưng phải đi soi mới biết.**
BE đóng bốn chỗ còn rò id số nội bộ. Thay vì tin nhãn, kiểm từng consumer:
`productsApi.checkStock` khai response là `{available, availableStock}` và **không hề đọc**
`productId`; `reviewedBy` đã là `string | null` ở `types/order.ts:64` từ trước — runtime bây giờ mới
khớp với type chứ type không sai; `moderatorId` **không có consumer nào** trong FE (risk feedback là
fire-and-forget); ENVELOPE-01 vô hình vì `src/api/client.ts` chỉ đọc `message` + HTTP status, không
bao giờ đụng field `error`. Thứ duy nhất sai thật là một **fixture test**: `postModeration.test.ts`
assert trên `'Post 7 not found'`, trong khi social 404 giờ là `'Post not found'` (BE bỏ id khỏi
message). Test vẫn xanh vì assert `toContain('không còn tồn tại')`, nhưng fixture đã mô tả một
contract không còn tồn tại — sửa kèm comment trỏ về entry.

`submittedBy` trên pending brands/categories **cố ý không đụng tới**. BE dặn nguyên văn *"Do not
change your types pre-emptively"*: nó vẫn là `number` trên dây, là **release class C** (BE đổi một
mình thì `PendingBrandsPage.tsx:101` / `PendingCategoriesPage.tsx:101` sẽ in `#usr_…`), và cả hai
phía phải lên cùng ngày. `types/catalog.ts` giữ nguyên.

**GHN-CREATE-01 — chỗ duy nhất FE không đồng ý với "không cần sửa".**
`POST /api/order` giờ ném lại `400` của GHN cho địa chỉ không giao được thay vì đặt đơn ở
`shippingFee: 0`. Lập luận của BE đúng cho happy path — checkout đã chặn từ `POST /api/order/shipping-fee`
nên người mua không tới được đây. Chỗ không đúng là câu tiếp theo: *"the generic checkout error path
renders GHN's message, which is the correct text anyway"*. Message đó là **tiếng Anh và có tên một
endpoint nội bộ trong đó** — `"GHN does not know district 999999 — pick a district from GET
/api/shipping/districts"` — ném thẳng vào một UI tiếng Việt, ở đúng cái nút người ta vừa bấm để trả
tiền. Race thật sự có: sửa địa chỉ giữa lúc preview phí và lúc submit.

Helper thuần mới `src/features/cart/checkoutSubmitError.ts` → `checkoutSubmitErrorMessage(error)`:
refusal địa chỉ của GHN được đưa về **đúng câu banner phí ship đang dùng** ("Không giao được tới địa
chỉ này: … Vui lòng chọn hoặc cập nhật địa chỉ khác."), mọi message khác của BE đi qua **nguyên vẹn**,
chỉ khi thiếu/blank mới rơi về câu chung. Nhận diện nằm ở `isGhnAddressRefusal()` trong
`shippingFeeError.ts` — khoá theo **status 400 + từ vựng địa chỉ mà chỉ GHN dùng**
(`ghn|ward|district|province`), nên 400 hết hàng ("Insufficient stock for product prod_…") hay 400
voucher vẫn giữ nguyên lời của nó; bảo người mua đi sửa địa chỉ khi thật ra hết hàng thì còn tệ hơn
tiếng Anh. `shippingFeeError.ts` đồng thời strip đuôi `— pick a … from GET …` cho **cả** banner phí
ship, chỗ trước giờ vẫn in nguyên si.

Tiện thể sửa một bug tiềm ẩn ngay tại call site: `CheckoutPage` cũ làm
`String((err as {message: unknown}).message)` vô điều kiện, nên một error có key `message` nhưng giá
trị `undefined` sẽ hiện đúng chữ **`"undefined"`** trên form. Helper mới đòi `typeof === 'string'` và
non-blank trước khi dùng.

**Không verify được qua UI, và không giả vờ là verify được.** Đúng như BE nói, cách duy nhất chạm tới
`400` này là bypass hoặc race lời gọi phí — nên unit test (+9) là mức phủ trung thực. Bù lại, **ba
chuỗi message mà test assert được lấy sống từ prod**, không phải chép từ handoff.

**DEPLOY-0813 đóng — đo lại trên prod, cả ba fix đã live.**
Entry này ở `backend-handoff.md` ghi rằng ba fix của 2026-08-13 chưa lên prod, và tự hẹn *"sẽ verify
lại ngay lượt `/sweep` sau"*. Đo lại bằng Chrome DevTools MCP (isolated context, tài khoản `user1`):
`GET /api/social/posts/post_JS61MaVvS7tVJiA9/comments` giờ có `author`, reply tree cũng có
(`{id: "usr_xU2Q7pGhhFpduGWz", username: "shop1", avatar: null}`) ⇒ SOCIAL-AUTHOR-01 deployed;
`GET /api/order/return-requests/mine` trả `refundAmount` là **number** (`45000`/`45000`/`90000` + một
`null`) ⇒ RET-NUM-01 deployed; `POST /api/order/shipping-fee` ward `20110` dưới district `1443` →
**400** *"Ward 20110 does not belong to GHN district 1443 — pick a ward from GET /api/shipping/wards"*,
district `999999` → **400**, control `1442`/`20110` → **201** ⇒ GHN-DIST-01 deployed.

**Món nợ của lượt trước đã trả: nhánh `author` có thật đã chạy được ở runtime.** Bundle local (đang
mang BATCH-0813, chưa push) trỏ vào API prod qua dev proxy, đăng nhập `user1`, mở
`/post/post_JS61MaVvS7tVJiA9`: hai comment in **`shop1`** và reply lồng cấp in **`user1`**, kèm
avatar-initial, mở rộng reply tree vẫn đúng. Không còn chữ `Người dùng` nào trên trang và không id
`usr_` nào lọt ra UI — tức là cả nhánh có `author` lẫn nhánh fallback đều đã được chứng minh, chứ
trước đó chỉ có nhánh fallback là chạy thật.

**Hai cái bẫy ghi lại để lượt sau khỏi mất thì giờ** (đã ghi cả sang `backend-handoff.md`):
probe `POST /api/order/shipping-fee` phải dùng `items[].productName` — gửi `name` thì DTO trả
`400 "property name should not exist"` cho **mọi** case kể cả case control, rất dễ đọc nhầm thành "BE
đã deploy"; và mọi response của gateway đều bọc `{statusCode, status, message, timestamp, data}` với
list phân trang nằm ở `data.data[]`, nên `(j.data ?? j).slice` sẽ ném. Ngoài ra **không** probe
`POST /api/order` trên prod: nếu đoán sai về việc GHN-CREATE-01 đã deploy hay chưa thì cái giá là một
đơn hàng thật nằm lại trong DB prod.

Gates: `npm run build` ✓ · `npm run lint` 0 error / 3 warning advisory (cũ) ·
`npm run test:run` **708 test / 100 file** (từ 699/99). Class **B** — chưa push, chờ release gate.

### BATCH-0813 · drain 5 entry BE inbox (2026-08-13)

Một lượt `/sweep` trên toàn bộ `## Open` của `../.agent-local/frontend-handoff.md`. Cả 5 entry đều là
**class B** (BE additive, FE cũ vẫn đúng) và `release-gate.md` → **Holding rỗng**, nên không entry nào
bị chặn bởi repo khác.

**SOCIAL-AUTHOR-01 — comment/reply giờ kèm `author`.**
Đây chính là entry FE đã ghi sang `backend-handoff.md` hôm 2026-08-13 (xem SOCIAL-COUNT-01 bên dưới):
comment không có `author` nên UI phải in `Người dùng #usr_xU2Q7pGhhFpduGWz` — rò một id opaque ra mặt
người dùng. `Comment` thêm `author: PostAuthor | null`; **tái dùng `PostAuthor`** thay vì khai một type
gần-trùng, vì shape BE trả (`{id, username, avatar}`) đúng bằng `PostAuthor` trừ `name` optional.
Nullable là **có chủ đích**, không phải phòng thủ thừa: BE nói rõ `author` là `null` khi user đã xoá
hoặc user-service không với tới được, trong khi read comment vẫn thành công.

Logic hiển thị tách ra `src/features/social/commentAuthor.ts` — `commentAuthorView(author)` trả
`{ displayName, avatarSrc }`, ưu tiên `name` → `username` → hằng `COMMENT_AUTHOR_FALLBACK`
(`'Người dùng'`, **không kèm id**), coi chuỗi rỗng/toàn khoảng trắng như vắng, và trả `undefined`
(không phải `null`) cho `avatarSrc` để spread thẳng vào `<Avatar src>`. Để ở helper thuần chứ không
nhét inline trong JSX vì đúng hai nhánh đáng test — `author` null và field blank — đều không test được
nếu nằm trong component. `CommentNode` giờ render `displayName` + `<Avatar src={avatarSrc}>`;
`<Link to={/profile/${comment.userId}}>` **giữ nguyên** — `userId` vẫn là public id `usr_` và vẫn là
cái dùng để biết comment có phải của mình không.

**RET-NUM-01 — `refundAmount` thành number.** Bỏ `Number(...)` ở `OrderDetailPage`,
`ReturnRequestsPage`, `SellerReturnRequestsPage`, giữ nguyên guard `!= null`. An toàn hai chiều vì
`formatVnd(n: number | string)` chuẩn hoá qua `toMoneyNumber` — case string đã được pin sẵn ở
`utils.test.ts` (`formatVnd('1500000.00') === '1.500.000 đ'`), nên không cần thêm test.

**ORD-RBAC-01 — `ship`/`deliver`/`complete` thành admin-only.** Ba wrapper trong `api/orders.ts` có
**0 call site** (grep toàn `src/`) và giờ chắc chắn 403 với role `shop`, nên xoá hẳn thay vì để lại
cái bẫy. Chỗ cũ để lại comment: vòng đời của seller dừng ở `ready-to-ship`, trạng thái sau đó do
carrier báo, màn "đẩy tay" nếu có thì thuộc admin/GHN console chứ không thuộc storefront.

**GHN-DIST-01 — ward lệch quận giờ là 400.** Kiểm lại `AddressFormModal`: `handleDistrictChange` đã
`setWard(null)` và `handleProvinceChange` đã reset cả district lẫn ward — **không phải sửa gì**. Nhưng
thay đổi BE làm cái reset đó từ "cho gọn" thành **load-bearing**: ward cũ sót lại giờ khiến
`POST /order/shipping-fee` trả 400, và checkout dịch 400 thành banner đỏ "không giao tới" **chặn đặt
hàng** (RESIL-01). Nên pin lại bằng 2 RTL test trong `AddressFormModal.test.tsx` — đổi district ⇒ ward
rỗng, đổi province ⇒ cả district lẫn ward rỗng. Modal này là đường vào duy nhất: edit mode hydrate một
cặp đã lưu và nhất quán, còn checkout dùng `AddressBookPicker` (chỉ chọn địa chỉ đã lưu).

**PATCH-ATOMIC-01 — `PATCH /products/:id` không atomic giữa 2 DB.** Nhánh `onError` của
`CreateProductPage` đã invalidate `products.detail` + `products.withInventory` ở edit mode kèm comment
giải thích, nên **không sửa gì** — chỉ xác nhận là dòng đó phải ở lại. Phần "nếu form gửi `skuList` thì
invalidate cả query SKU" không áp dụng: `queryKeys.ts` không có query danh sách SKU (`bySku` là lookup),
mọi thứ SKU đi kèm `products.detail`.

**Verify prod (Chrome DevTools MCP).** Kiểm thẳng API prod trước: **cả 3 thay đổi BE đều chưa deploy** —
`/social/posts/:id/comments` và `/social/comments/:id/replies` trả về đúng
`[id, postId, userId, content, createdAt, replyCount]`, **không có key `author`**; `refundAmount` vẫn là
string `"45000.00"`; `POST /order/shipping-fee` với ward thuộc quận 1442 nhưng gửi kèm district 1443 vẫn
trả **201** (`shippingFee: 0`) chứ chưa phải 400. Vì vậy chạy `vite dev` với
`VITE_API_TARGET=https://tryhavejob.ooguy.com` để soi **bundle mới đánh BE cũ** — đúng cái tổ hợp sẽ live
nếu push trước BE: post detail render 2 comment + 1 reply lồng cấp đều ra `Người dùng` **sạch id**, avatar
ra placeholder, layout không xê dịch; `/returns` in `45.000 đ` / `90.000 đ` / `160.000 đ` đúng từ payload
string. Degrade an toàn ⇒ đúng class B. Nhánh `author` có thật thì **chưa verify được ở runtime** cho tới
khi BE lên — hiện chỉ có unit test phủ.

⚠️ Ghi chú cho lượt sau: `GET /social/comments/:id/replies` **từ chối** `page`/`limit`
(400 `property page should not exist`). FE gọi đúng (chỉ `depth` optional) — cái 400 gặp khi verify là do
script probe tự thêm param, **không phải bug**.

12 file · +3 test file (`commentAuthor.test.ts`, `AddressFormModal.test.tsx`, và 2 test mới trong đó).
Gates: build ✓ · lint 0 error / 3 warning cũ · `test:run` **699 test / 99 file** xanh (từ 691/97).

### SOCIAL-COUNT-01 · comment mutation không refresh `commentCount` của post (2026-08-13)

Tìm ra khi chạy E2E social + chat trên prod với 2 tài khoản thật (user1 ↔ shop1, isolated context).

**Triệu chứng.** shop1 gửi comment vào `post_JS61MaVvS7tVJiA9` → comment hiện ngay trong danh sách,
nhưng header vẫn in `Bình luận (0)` và `0 bình luận`. Reload thì thành `1`. Reply cũng vậy:
`GET /api/social/posts/:id` trả `commentCount: 3` trong khi trang đang hiện `Bình luận (2)`.

**Nguyên nhân.** `commentCount` nằm trong payload của **post**, không nằm trong response danh sách
comment. `useCreateComment`/`useCreateReply`/`useDeleteComment` chỉ invalidate
`queryKeys.social.comments(postId)` nên query `social.post(postId)` không bao giờ bị đánh dấu stale
— với `staleTime: 60_000` thì con số đứng im tới khi cache hết hạn hoặc user reload. Không phải lỗi
dữ liệu: API trả đúng ngay từ request đầu.

**Fix.** `src/lib/query/socialInvalidation.ts` — `invalidateCommentViews({ postId, parentCommentId })`,
cùng khuôn với `invalidateOrderViews` đã có. Chỉ invalidate **một** key `social.post(postId)`: nó là
prefix của `social.comments(postId)` (`["social","posts",id]` ⊂ `["social","posts",id,"comments"]`)
nên TanStack quét luôn cả comment list. Cố tình **không** gọi thêm dòng `comments(postId)` — hai lần
invalidate chồng prefix nhau sẽ refetch comment list 2 lượt. Vì fix dựa vào quan hệ prefix đó nên
thêm guard vào `queryKeys.test.ts` (cùng chỗ với QK-01) để đổi shape key là test đỏ ngay.
Ba call site trong `useComments.ts` giờ mỗi cái một dòng.

Test: `src/lib/query/socialInvalidation.test.ts` (3 case, spy `QueryClient` giả như
`orderInvalidation.test.ts`) + 1 case prefix trong `queryKeys.test.ts`.
Gates: build ✓ · lint 0 error / 3 warning cũ · `test:run` **691 test / 97 file** xanh.

**Verify prod (2026-08-13, Chrome DevTools MCP).** Đây là phần chạy trước khi fix, nên các số dưới
là hành vi của bundle đang live:
- **Post** — user1 tạo bài qua dialog "TẠO BÀI VIẾT", hiện ngay trong feed ("Vừa xong"), không reload.
- **Like** — shop1 like: 0 → 1 ngay tại chỗ.
- **Comment + reply** — shop1 comment 2 lần, user1 reply lồng cấp; cây reply render đúng, "Ẩn phản hồi"
  hoạt động, nút "Xoá" chỉ hiện trên comment của chính mình (user1 không xoá được comment của shop1
  kể cả trên bài của mình).
- **Notification realtime** — badge user1 **65 → 66** khi shop1 comment, badge shop1 **44 → 45** khi
  user1 reply, cả hai **không reload, không thao tác gì trên tab nhận**. Dropdown render tiếng Việt
  ("Bình luận mới" / "Phản hồi mới" + preview) dù message BE là tiếng Anh — FE tự map theo `type`,
  nên chuỗi tiếng Anh của BE không lộ ra ngoài.
- **Chat 2 chiều** — user1 → shop1 và shop1 → user1, tin nhắn tới tab kia **không reload**; danh sách
  hội thoại đổi preview + "Vừa xong" ngay. Đóng luôn mục **P1-06** trong `snapshot.md` (còn nhánh
  reconnect chưa chạy).

**Ghi sang `../.agent-local/backend-handoff.md`** (không sửa được ở FE):
- `GET /api/social/posts/:id/comments` và `/social/comments/:id/replies` trả item **không có
  `author`** (chỉ `userId`), trong khi `GET /api/social/posts/:id` có `author {id, username, avatar}`
  đầy đủ ⇒ `CommentNode.tsx` in ra `Người dùng #usr_xU2Q7pGhhFpduGWz` cho người dùng thật. FE không
  tự fetch profile từng comment được (N+1).
- Quan sát không phải bug: **like không sinh notification** — `likePost()` bên `apps/social` không
  emit event nào và `apps/notification` không có handler `like`; chưa từng được implement.

### Runtime verify BATCH-0811 + BATCH-0812 trên prod thật (2026-08-12 → 13) — 11/11 PASS

Chrome DevTools MCP, prod (`fe-react-vite.quangtruong01234.workers.dev` → `tryhavejob.ooguy.com`,
console GHN `web-flow-ghn.vercel.app`), 4 tài khoản chạy song song trong isolated browser context
(shop1 · user1 · shipping1 · logistic1). Không đổi dòng code nào — đây là checklist runtime mà
BATCH-0811 nợ lại vì lúc đó BE chưa deploy.

**Storefront — 6/6 PASS.**
1. **INV-CONTRACT-01** — đăng bán 1 SP thường: đúng **1** request `POST /products`, stock hiện đúng,
   form không in vệt lỗi đỏ nào.
2. **FE-INBOX-0811 #4** — `/orders` gõ mã đơn: đúng **1** request mang `?q=`, sang page 2 vẫn nằm
   trong kết quả tìm (không rơi về danh sách đầy đủ).
3. **ORD-GUARD-01** — `/sell/orders?status=pending` cho thấy hai đơn cạnh nhau: đơn online chưa trả
   tiền hiện lý do "Khách chưa thanh toán — chưa thể xử lý đơn" và **không** có nút; đơn COD ngay
   dưới có nút "Xác nhận đơn" bật bình thường.
4. **NOTIF-LIFECYCLE-01** — đủ **6** type (không phải 5 như ghi lúc tích hợp). `order_confirmed`
   ("Đơn hàng đã xác nhận") và `order_processing` ("Đang chuẩn bị hàng") **bắn thật** khi seller đẩy
   đơn qua confirm → ready-to-ship, cả hai mang public id `ord_`. `new_order` render "Đơn hàng mới"
   và mở `/sell/orders`. Ba type còn lại (`order_shipped`/`order_delivering`/`order_completed`) do
   GHN sở hữu nên không bắn được trên prod — chứng minh phần render bằng cách bơm row tổng hợp vào
   response: "Đơn hàng đang giao" / "Đang giao đến bạn" / "Giao hàng thành công" đều đúng.
5. **RESIL-01** — checkout với địa chỉ GHN không giao tới: banner đỏ + nút đặt hàng **disabled**.
6. **RETURN-STOCK-01 — PASS (2026-08-13).** Lần đầu bị chặn vì không tạo nổi yêu cầu trả hàng:
   `canRequestReturn()` chỉ cho phép ở `delivering`/`completed`, mà state machine của seller dừng ở
   `processing` và GHN sandbox không bao giờ đẩy waybill đi tiếp. **Mở khoá bằng `demo-status`** —
   `shipping1` gọi `POST /api/order/admin/ghn/orders/:id/demo-status` với `picking` → `delivering`
   → `delivered`, đẩy `ord_o00rM7DkTCMM3rzm` (zalopay, đã thanh toán, waybill `L8VQA3`) từ
   `processing` lên `completed`. Rồi: buyer gửi yêu cầu trả hàng → đơn thành `return_requested`,
   `rr_YT5zuF1HYbiEWg2E` vào hàng chờ của seller → seller bấm "Duyệt & hoàn tiền" → tồn kho
   "Tai nghe không dây Bluetooth 5.3" đi **49 → 50** (tổng kho 10084 → 10085) ở `/shop`, **không
   reload** (patch `fetch` cài trước đó vẫn sống ⇒ chứng minh chỉ điều hướng SPA). Đơn hiện
   "Đã hoàn tiền", khối trả hàng hiện "Đã duyệt · ZaloPay · 45.000 đ" ở cả buyer lẫn seller.
   Ghi chú độ chặt của phép đo: lần fetch `/shop` gần nhất trước khi duyệt đã quá 60s (staleTime),
   nên riêng lần refetch đó **chưa tách bạch được** invalidate với hết hạn cache. Đối chứng chạy
   ngay sau: vào `/sell/orders` rồi quay lại `/shop` trong vòng **33s** → **0** request
   `products`/`inventory`. Tức mount không tự refetch khi cache còn tươi ⇒ trong luồng thật (seller
   duyệt xong bấm về kênh người bán sau vài giây) con số chỉ có thể mới nhờ `invalidateQueries`.

**GHN console (BATCH-0812) — 5/5 PASS**, chi tiết ghi ở `../.agent-local/frontend-handoff-ghn.md`
(repo khác, FE storefront không sửa code ở đó): GHN-RAW-01 (~44 key allow-list, không lộ id số),
GHN-ENUM-01 (filter sai → 400 kèm enum hợp lệ), GHN-ACT-01 (6 action cho `shipping_manager`, 2 cho
`logistics_operator`), GHN-HIST-01 (history mang `ord_`/`usr_`), GHN-RBAC-01 (analytics ẩn hết
field tiền cho `logistics_operator`, UI đổi nhãn theo).

**Phát hiện mới → `../.agent-local/backend-handoff.md` (Open):** `POST /api/order/shipping-fee` với
`toDistrictId: 999999` trả **201** `{ shippingFee: 0 }` thay vì 400. Đây **không** phải chuyện số 0
(đã đóng ở GHN-ADDR-01: sandbox gateway trả `total_fee: 0` cho mọi địa chỉ) mà là status code —
district không tồn tại lọt qua nhánh 400 của RESIL-01 nên FE cho đặt hàng bình thường.

### BATCH-0811 · tích hợp 8 entry handoff của BE trong một lượt (2026-08-12) — DONE (đã push + verify prod 2026-08-12)

Gate cuối: build ✓ · lint 0 error / **3** warning cũ · **687 test / 96 file ✓** (+20 test, +5 file).
12 file source đổi, 2 file tạo, **2 file xoá**.

`/sweep làm task BATCH-0811`. BE ship một loạt 11 item ngày 2026-08-11 và nằm chờ trong working
tree của `api/`; release-gate xếp cả cây là **class C** nên `api/` không push được cho tới khi FE
xong phần của mình. BATCH-0812 (console GHN, cả hai ô đã ✅) dùng chung working tree đó nên **cũng
đang bị chặn bởi entry này** — làm xong là mở khoá hai batch.

**Vì sao class C, cụ thể ở đâu.** Đúng một thay đổi khiến FE mới **không chạy được** với BE cũ:
INV-CONTRACT-01 xoá `persistSimpleStock()`, nên nếu FE này lên trước thì `POST /products` với BE
cũ tạo product **không có inventory row**. Mọi thứ còn lại đều degrade an toàn theo cả hai chiều —
xem phần `=== null` bên dưới.

**INV-CONTRACT-01 — luồng đăng bán còn đúng 1 request.** Trước: `POST /products` xong bắn thêm
`POST /inventory` (luôn 409 vì BE đã tạo row), `GET /inventory/product/:id`, rồi `PUT /inventory`
(400 vì DTO không nhận `sku`) — seller thấy "tạo thành công" kèm một vệt lỗi đỏ. BE xác nhận
`POST /products` tự seed inventory **và rollback product nếu bước đó hỏng**, tức `201` = row chắc
chắn tồn tại. Xoá cả helper. Đây cũng là nửa create của **P0-03** (atomicity), đóng BE-side; nhánh
`PATCH /products/:id { stockQuantity }` chưa được BE khẳng định là atomic nên snapshot vẫn để mở.

**FE-INBOX-0811 #4 — search mã đơn thành server-side, xoá được cả một module.** `?q=` (ANDed với
`status`, cap 32 ký tự, quá thì 400) cho phép bỏ hẳn `orderHistoryPaging.ts` + test của nó —
đúng như docblock của chính module đó đã hẹn từ 2026-08-07. Trước đây ô search lọc client-side
trên các page **đã tải**, nên một đơn khớp nằm ở page chưa fetch sẽ hiện "không tìm thấy"; module
mitigation phải vừa search vừa tự kéo nốt các page còn lại. Giờ: `buildUserOrdersQuery` gửi `q`
(trim; blank/whitespace bỏ hẳn key — `?q=` là "khớp chuỗi rỗng", không phải "không lọc"),
`queryKeys.orders.byUserList` nhận `q` nên mỗi từ khoá cache và phân trang riêng, ô input debounce
400ms + `maxLength={ORDER_SEARCH_MAX}` để không bao giờ chạm ngưỡng 400 của BE. `hasNext` giờ mô
tả đúng tập đã tìm nên nút "Tải thêm" phân trang được cả kết quả search. Ba item còn lại của entry
(#1 wishlist ids, #2 batch read 200, #3 review `userId`) kiểm lại code thật: FE **không có** chỗ
nào phải đổi — không tồn tại map `publicId` phía wishlist, `fetchBatchTolerant` vốn đã gửi
`productIds`, và trong `src/` không có check `=== 201` nào.

**ORD-GUARD-01 + `=== null`, không phải nullish — quyết định quan trọng nhất của batch.** BE thêm
`paidAt` và chặn confirm đơn online chưa trả tiền. FE thêm 2 helper thuần có test:
`getSellerOrderActionState()` thay nút bằng dòng "Khách chưa thanh toán — chưa thể xử lý đơn"
(trước đây nút hiện ra rồi ăn 400), và `isAwaitingPayment()` thay heuristic theo status ở
`OrderDetailPage`. Cả hai so **`=== null`**: `null` = "chưa thu tiền" (tín hiệu thật), `undefined`
= "response chưa có field này" (BE cũ) — hai thứ khác nhau. Nếu dùng `== null` gộp cả hai thì với
BE cũ **mọi seller bị khoá cứng** mọi hành động và **mọi đơn** hiện nút "Thanh toán". Với `===`,
field vắng ⇒ degrade về hành vi cũ. Cũng vì thế `paidAt` khai báo `?: string | null`. Lưu ý ngữ
nghĩa khác nhau theo phương thức: COD giữ `null` tới lúc giao, nên `null` ở COD nghĩa là "chưa
giao" chứ không phải "chưa trả tiền" — COD không bao giờ bị chặn.

**RESIL-01 — GHN 400 chặn checkout, 503 thì không.** BE tách lỗi GHN: `400` = địa chỉ GHN từ chối,
`503` = GHN không với tới được/circuit mở. `shippingFeeFailure()` (mới, có test) map ra 3 kind và
strip prefix `GHN … error:` — prefix đó gọi tên hệ thống của mình, không phải thứ người mua sửa
được. **Có một mâu thuẫn phải chọn**: handoff bảo 400 thì chặn và bắt chọn lại địa chỉ, trong khi
một comment cũ trong `CheckoutPage` ghi "never block checkout". Theo handoff — vì từ GHN-ADDR-01
FE đã gửi district/ward id chính xác, nên 400 bây giờ là "địa chỉ này giao không tới" thật, không
còn là nhiễu do resolve tên. Cho đơn đi tiếp chỉ để nó chết ở bước tạo waybill thì tệ hơn. 503 giữ
nguyên tinh thần cũ: phí hiện "Tính khi giao hàng", checkout đi tiếp.

**Ba cái còn lại.** `ORDER-SHAPE-01`: thêm type `SellerOrderListRow extends OrderWithBuyer` và
luồng qua `getSellerOrders` → `useSellerOrders` → `SellerOrdersPage`; card seller render thẳng
name/image/quantity từ list, bỏ nhánh flatten `items: []`. Không sửa `OrderWithBuyer` vì
`getAdminOrders` dùng chung và chưa chắc được decorate. `NOTIF-LIFECYCLE-01`: 5 `TYPE_CONFIG` mới
(`new_order`, `order_confirmed`, `order_processing`, `order_delivering`, `order_completed`) —
trước đó rơi xuống fallback "Thông báo" + message tiếng Anh thô; `new_order` là row **của seller**
nên link `/sell/orders`, không phải `/order/:id` (buyer view, seller mở sẽ 403).
`RETURN-STOCK-01`: duyệt trả hàng cộng lại `availableStock` nên `useReviewReturnRequest` invalidate
thêm `inventory.all` + `products.all` — chỉ ở nhánh `approve`, vì `reject` không đụng tồn kho.
`STOCK-SYNC-01`: đường ghi vốn đã đúng (form sửa vẫn gửi `stockQuantity` qua `PATCH`, ô stock đơn
đã ẩn sẵn cho SP có variation); chỉ thêm invalidate ở nhánh `onError` để baseline diff của form
được refetch thay vì giữ giá trị stale sau một lần save hỏng — an toàn vì `useProductForm` seed
đúng **một lần** (`initializedRef`), refetch không xoá thứ seller đang gõ.

**⚠️ Runtime verification còn nợ nguyên batch.** BE chưa deploy nên không môi trường nào phục vụ
contract mới; verify trên prod hiện tại chỉ chạy nhánh fallback, và riêng INV-CONTRACT-01 thì
verify trên BE cũ sẽ **tạo ra product không có inventory row** — rác thật, không phải test. Chrome
DevTools MCP cũng không connect trong session này. Checklist 6 bước để chạy ngay sau khi hai repo
lên `main` nằm ở `snapshot.md` mục "Runtime verification còn nợ".

### CD-FE-03 · Socket.IO đi qua Worker proxy — realtime chết im trên prod (2026-08-11) — DONE

Gate cuối: build ✓ · lint 0 error / **3** warning cũ · **667 test / 95 file ✓**.

Tìm được khi test end-to-end toàn bộ API prod bằng Chrome DevTools MCP: mọi REST call 200, nhưng
badge thông báo chỉ nhúc nhích khi **reload trang**, và chat không nhận tin mới. Không có lỗi nào
trong console — đây là kiểu hỏng tệ nhất: nhìn từ UI thì app vẫn "chạy".

**Nguyên nhân.** Gateway set `access_token` **host-only** (không có `Domain`). Từ `df47a1f`
(CD-FE-02) REST đi qua Worker proxy nên cookie được lưu dưới tên miền `…workers.dev` — nhưng hai
socket vẫn quay số thẳng tới origin của gateway (`VITE_CHAT_URL` / `VITE_WS_NOTIFICATION_URL` là
URL tuyệt đối). Handshake thành cross-site, không mang cookie, gateway đá namespace ra. Bắt được
tận frame bằng cách chèn `initScript` bọc `window.WebSocket` trước khi app boot:
transport `open` → `0{"sid":…}` → **`41/notifications,`** (namespace DISCONNECT), rồi `41/chat,`.

**Cách sửa — đúng một lựa chọn FE tự ship được.** Ba hướng: (a) cho FE + gateway chung một domain
cha để cookie đi cross-subdomain, (b) đổi handshake sang token, (c) proxy `/socket.io/*` qua chính
Worker. (a) và (b) đều cần backend đổi; (c) không. Chọn (c) — cùng lý do và cùng cơ chế với
`/api/*`, socket lúc này là same-origin nên cookie tự đi kèm.

- `worker/index.ts` — nhánh upgrade phải trả `fetch(upstreamUrl, request)` (Request làm init).
  Dựng lại request từ `Headers` là hỏng: `Upgrade`/`Connection` là hop-by-hop và
  `buildUpstreamHeaders` strip đúng chúng → gateway trả 200 thay vì 101. Response trả **nguyên
  vẹn** để WebSocket đính kèm sống sót; Cloudflare tự nối hai socket.
- `wrangler.toml` — `run_worker_first` liệt kê `/socket.io` **cả có và không có** wildcard, vì
  socket.io gọi `/socket.io/?EIO=4&transport=websocket`. Asset tĩnh vẫn đi đường asset-first
  (miễn phí, không tính quota). Một WebSocket proxy tính **1 request**, không phải 1/frame.
- `src/lib/realtime/socketUrl.ts` (mới) — `resolveSocketUrl(origin, namespace)`. Chỉ `''` và `'/'`
  nghĩa là same-origin; `undefined` vẫn fallback `http://localhost:3000` y như cũ. Ba call site
  (`notificationSocket`, `chatPresenceSocket`, `useChat`) hết tự nối chuỗi.
- Env prod: cả ba `VITE_*` giờ đều tương đối — `/api`, `/`, `/`.

**Verify live** qua `wrangler dev --var GATEWAY_ORIGIN:<prod>` đánh thẳng gateway thật (đúng cách
đã dùng để chốt CD-FE-02): login `POST /api/user/login` 201 + `GET /api/user/me` 200 (cookie
host-only `Secure` được nhận trên `http://127.0.0.1:8787`), rồi sau khi login bằng **form UI**:
`40/notifications,` + `40/chat,` — **CONNECT cả hai, không có `41`, không close** (đo lại sau 20s:
0 close / 7 frame). Đẩy tiếp một tin thật từ tài khoản seller ở context thứ hai:
`42/chat,["new_message",{…}]` về tới tab buyer — realtime sống end-to-end qua proxy.

**Bẫy chỉ có ở máy Windows:** build trong Git Bash biến `VITE_API_URL=/api` thành
`C:/Program Files/Git/api` (MSYS path conversion) → bundle nạp `file:///…/user/login`, UI báo
"Failed to fetch". Dùng `MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL='*'` khi build tay. CI ubuntu
không dính.

### RIGHTRAIL-IMG + cache URL ảnh đã fail — hai bug tìm được *nhờ* đi verify (2026-08-09) — DONE

Gate cuối: build ✓ · lint 0 error / **3** warning cũ · **645 test / 93 file ✓**.

Không phải sweep item. Cả hai lộ ra khi đọc network log lúc verify `PostImage` bằng MCP — đây là
lý do bước verify runtime đáng làm kể cả khi unit test đã xanh: log nói những thứ test không nói.

**1. `RightRail` fallback ảnh trending trỏ ra Unsplash.** Network log của trang chủ có một request
đi `images.unsplash.com`. Truy ra `RightRail.tsx:106` + `:113`: cùng một URL Unsplash hardcode vừa
làm **default** khi `p.imageUrl` null, vừa làm đích của `onError`. Ba vấn đề, giảm dần:

- `onError` gán thẳng `(e.target as HTMLImageElement).src`. Nếu chính URL fallback fail thì
  `onError` bắn lại với **cùng** src → **vòng lặp request**. Đây đúng là cái bẫy mà `ProductThumb`
  (2026-08-07) rồi `PostImage` (2026-08-08) né bằng state keyed theo URL đã fail; `RightRail` là
  chỗ thứ ba của cùng pattern và là chỗ duy nhất còn làm sai. Sửa DOM ngoài React cũng là lý do
  phụ — React không biết gì về lần gán đó.
- Request **bên thứ ba** nằm trong happy path của landing route.
- Trùng việc với `ProductThumb` → sai thứ tự lookup UI của `core.md`.

Sửa bằng cách xoá cả block `<img>` → `<ProductThumb src={p.imageUrl} …>` (`w-11 h-11 rounded-lg`,
`width={96}` giữ nguyên derivative cũ, `iconSize={18}` cho ô 44px). URL Unsplash biến mất khỏi
`src/` — chỉ còn đúng một lần trong `cloudinaryUrl.test.ts` làm fixture "URL không phải Cloudinary",
chỗ đó là cố ý. Không thêm test mới: hành vi (src null → placeholder, `onError` → placeholder,
retry khi đổi src) đã là 6 test sẵn có của `ProductThumb`; change này **xoá** code chứ không thêm.

**2. `failedPostImages.ts` — set URL đã fail dùng chung.** Log cho thấy click vào ảnh hỏng bắn
**thêm một 404 nữa**: reqid 148 (`w_1200`, feed tile) rồi reqid 152 (`w_1600`, lightbox). Đúng
thiết kế cũ — lightbox là mount khác, không biết gì về lần fail của tile, mà derivative khác width
thì là URL khác thật. Giờ có set module-scope keyed theo **`src` gốc** (không phải derivative) nên
một lần fail phủ mọi width. State local vẫn còn, chỉ để re-render instance hiện tại; set mới là chỗ
quyết định, nên một slot mount thẳng vào URL đã biết hỏng cũng không bắn request.

Trade-off ghi rõ trong file: fail tạm thời sẽ dính hết session (reload là hết). Chấp nhận được vì
thứ đang chặn là asset bị xoá/chưa upload — retry không làm nó sống lại. Set nằm ở **module riêng**
chứ không cạnh component: export nó từ `PostImage.tsx` làm lint đẻ ra warning
`react-refresh/only-export-components` thứ 4, mà snapshot chốt đúng 3 cái được miễn. +2 test
(instance thứ hai không request lại URL đã fail; URL khác vẫn request bình thường) + `beforeEach`
reset — set module-scope thì rò giữa các case.

**Verify live sau khi sửa** (cùng session MCP): request `images.unsplash.com` **biến mất**; mở
lightbox vào ảnh hỏng thì overlay vẫn ra placeholder nhưng **không** có request thứ hai — network
còn đúng **1** lần 404 thay vì 2, console còn **1** error thay vì 2.

**Đã ghi cho BE** (`../.agent-local/backend-handoff.md`, Open 2026-08-09): `GET /api/social/posts`
502 chập chờn (2 lần, 2 ngày — lần này 502 rồi 200 ngay ở retry, reqid 139 → 144; FE **không** xây
retry riêng, mặc định của TanStack Query đang che đủ), và `POST /products/with-inventory/multiple`
trả `201` cho một read (cosmetic, FE không branch theo status).

### `PostImage` — ảnh post 404 hết render ảnh vỡ trên happy path của feed (2026-08-08) — DONE

`/sweep` fix-mode, 1 item. Gate cuối: build ✓ · lint 0 error / 3 warning cũ ·
**643 test / 93 file ✓**.

**Vấn đề.** Snapshot mang một item "1× Cloudinary 404 ảnh post cũ" từ 2026-08-07: một row post seed
trỏ vào `…/v1/trybuy/posts/17_mine.jpg`, URL **đúng chuẩn** (đúng folder, đúng prefix `<userId>_`)
nên qua cả sanitizer lẫn validator của BE — asset chỉ đơn giản là chưa từng được upload. Nguyên
nhân gốc là data, chỉ BE dọn được. Nhưng hệ quả FE thì FE tự chịu: `/` là landing route, nên
**mọi** người vào app đều thấy một ảnh vỡ + console error ngay lần load đầu, và
"không console error trong happy path" nằm trong Definition of production-ready.

**Tại sao item này từng bị hoãn.** Snapshot ghi *"Sửa được nhưng là diff rộng cho một ảnh hỏng"* —
`PostCard` render ảnh qua 5 chỗ `<img>` ở 4 nhánh layout (1 ảnh / 3 ảnh / 2–4 ảnh / lightbox), cộng
2 chỗ nữa ở `PostDetailPage`: rắc `onError` + `useState` vào từng chỗ là 7 bản sao của cùng một
logic. Cách thoát là **rút gọn diff bằng cách gom lại**, không phải nhân bản: một component
`features/social/PostImage.tsx` (đặt ở feature folder, không phải `shared/` — đúng ngưỡng DRY của
`core.md`: cả 2 consumer đều nằm trong `features/social/`). Ròng: 7 chỗ `<img>` → 7 chỗ
`<PostImage>`, logic fallback tồn tại đúng **một** lần.

- **Cùng contract với `ProductThumb`** (2026-08-07), khác phần post-shaped: state key theo **URL đã
  fail** chứ không phải boolean — slot feed bị recycle sang post khác phải thử lại ảnh mới thay vì
  thừa hưởng lỗi của ảnh cũ; `alt=""` (ảnh post là trang trí, không phải nội dung); caller giữ
  quyền quyết định class của box.
- **Placeholder dùng lại đúng `className` của slot**, chỉ thêm `bg-canvas-elevated grid
  place-items-center p-6` + icon `ImageOff` → **không layout shift** (feed hiện đang CLS 0, đừng
  phá). Nhưng *cách* nó không shift khác nhau theo nhánh, đã đo bằng MCP: nhánh có class fill
  (`w-full h-full` ở grid tile, `w-full aspect-[3/2]` ở `PostDetailPage`) thì placeholder **lấp
  đầy ô** (đo được 638×425 ở detail page); nhánh `object-contain` (`max-w-full max-h-full` ở ảnh
  đơn + lightbox) thì `div` co lại quanh icon → **80×80** căn giữa, và ô vẫn không đổi kích thước
  vì **parent** `<button>` mới là chỗ giữ chỗ (`aspect-[4/3] max-h-[520px]`, đo được 948×520).
  Cả hai đều đúng, chỉ đừng đọc "placeholder dùng lại class slot" thành "placeholder luôn lấp đầy".
- **`onClick` đi xuyên qua cả hai nhánh** — lightbox đóng bằng click nền, nếu placeholder nuốt mất
  handler thì ảnh hỏng trong lightbox sẽ thành cái bẫy không thoát ra được. Có test riêng cho nhánh
  này.
- **Không nuốt mất perf attribute:** `loading` / `fetchPriority` vẫn do caller truyền, giữ nguyên
  `priority`-first-post của feed (ảnh LCP candidate vẫn `eager` + `fetchPriority="high"`).
- Test `PostImage.test.tsx` (+6): render derivative đúng `w_<n>`, fallback khi `onError`,
  placeholder giữ class slot, retry khi đổi `src`, `onClick` sống trên placeholder, pass-through
  `loading`/`fetchPriority`.

**Che ≠ hết — đã ghi cho BE.** Component chỉ giấu ảnh vỡ; request vẫn fail và console vẫn có error.
Đã thêm entry vào `../.agent-local/backend-handoff.md` (**Open** 2026-08-08) nói rõ đây **không**
thuộc lớp legacy-URL mà BE đã sanitize ở read path, và chỉ DB/seed cleanup mới đóng được. FE giữ
`PostImage` kể cả sau khi BE dọn — nó là hành vi đúng cho mọi asset bị xoá về sau.

**Runtime verify: DONE (2026-08-09, Chrome DevTools MCP).** Lúc sweep chạy thì social service trả
**502** nên phải ghi PENDING; hôm sau service sống lại, verify đủ 3 nhánh, login `canceltest1779978329`:

- **Feed `/`** — post `ownership test - own image` cho `imgs: []`, `placeholders: 1`, ô 948×520 giữ
  nguyên; post ngay trên nó vẫn load ảnh thật (`natural 1200×659`), tức fallback **không** lan sang
  ảnh lành.
- **Lightbox** — click vào slot hỏng mở overlay `fixed inset-0 z-[200] bg-black/90`, trong đó
  **không có `<img>`**, chỉ placeholder mang đúng class lightbox. Click vào placeholder **không**
  đóng (`stopPropagation` còn sống), click nền **đóng** → đúng cái bẫy đã lo ở bullet `onClick`.
- **`PostDetailPage`** — `/post/post_5732da0c81d811f1` render placeholder lấp đầy 638×425, 0 ảnh vỡ.

**Đếm lại: 2, không phải 1.** Snapshot 2026-08-07 ghi "1× Cloudinary 404" là đếm thiếu — HEAD check
trực tiếp lên cloud `shopdev1234` cho thấy **2/3 ảnh của feed page 1 trả 404**: `17_mine.jpg` *và*
`dvh93r029vpy5rssldcc.png` (post `post_5732da0c81d811f1`, không nằm trong 10 post đầu nên lần trước
không thấy). Đã sửa cả snapshot lẫn backend-handoff. Không đổi kết luận, chỉ đổi quy mô — và củng cố
lý do gom component thay vì vá một chỗ.

**Che ≠ hết, đã xác nhận bằng số:** request derivative của `17_mine.jpg` vẫn là **404** (reqid 148)
và console vẫn có error — đúng như đã ghi cho BE. Component chỉ chặn phần người dùng nhìn thấy.

Ngoài lề, không do change này: `GET /api/social/posts?page=1&limit=10` trả **502** (reqid 139) rồi
**200** ở retry của React Query (reqid 144) — social service chập chờn, retry của TanStack Query đỡ
được nên user không thấy gì.

### Drain BE handoff inbox · 13 entry → Done, `ProductThumb` onError, xoá folder chết (2026-08-07) — DONE

`/sweep` fix-mode, cùng batch với ORD-STATUS-FILTER. Gate cuối: build ✓ · lint 0 error /
3 warning cũ · **637 test / 92 file ✓**.

**Nguyên tắc: không entry nào được "đóng" bằng cách đọc entry.** Mỗi cái phải verify lại bằng
code thật, vì `FE action needed: none` do BE viết chỉ là *phỏng đoán* của BE về FE. Đúng một cái
sai — và nó là bug thật (xem `ProductThumb` bên dưới).

- **`ProductThumb` thêm `onError` fallback.** Entry SEC-M7 ghi *"add an onError placeholder on
  order-item images (likely already exists)"* — **không hề có**. Component chỉ guard `src=""`.
  Nghĩa là: seller xoá sản phẩm → BE destroy asset Cloudinary (SEC-M7) → đơn hàng cũ vẫn giữ URL
  chụp lúc mua (`order_items.product_image`, P2-02) → hàng đơn cũ render **ảnh vỡ**. Giờ fallback
  về đúng placeholder `Package`. State key theo **URL đã fail**, không phải boolean — một row bị
  recycle sang sản phẩm khác phải thử lại ảnh mới, không thừa hưởng lỗi của ảnh cũ. +2 test.
- **12 entry còn lại không cần code**, nhưng lý do thì đáng ghi vì hai cái là *cố tình không làm*:
  `Number(price)` **giữ nguyên** (order item vẫn serialize `price` dạng chuỗi decimal —
  `orderSummary.ts:51`, `SellerOrdersPage.tsx:210`, `shippingFee.ts:21`; bỏ hàng loạt là sai tổng
  tiền), và **`429` backoff không xây** (limit 60 req/60s, batch FE tối đa 10 file — client đúng
  chuẩn không chạm tới). Hai entry khác (post `productId` dạng chuỗi, SEC-L1 id số) đã bị **PUBID
  thay thế** hoàn toàn — ghi rõ để lần sau khỏi đi tìm nhánh id số không còn tồn tại.
- **Drift lộ ra khi verify:** snapshot trỏ orphan-cleanup tới "`backend-handoff.md` Open
  2026-07-07" — **entry đó không tồn tại**; nội dung nằm ở `frontend-handoff.md` (SEC-M7). Và
  UP-02(c) (avatar cũ) thực ra **đã đóng** bởi SEC-M7; chỉ còn UP-03(i) (ảnh nhúng trong HTML đã
  lưu — SEC-M7 diff *field* media, không parse HTML `description`). Đã sửa cả hai chỗ.
- **Feed 404 đo lại:** 4× → **1×**, và **khác nguyên nhân**. Hai pattern legacy đã sạch (BE
  sanitize; grep `src/` không có workaround nào để gỡ). Cái còn lại — `…/v1/trybuy/posts/
  17_mine.jpg` — đúng chuẩn folder + prefix owner nên qua cả sanitizer lẫn validator, asset chỉ
  đơn giản là không tồn tại (data seed). Cần DB cleanup; `PostCard` có 5 chỗ `<img>` ở 4 nhánh
  layout, thêm `onError` cả 5 là diff rộng cho một ảnh hỏng → để lại trong snapshot.
- **`src/features/inventory/` (folder rỗng) đã xoá.** Không file nào tham chiếu; build sạch.

Inbox `../.agent-local/frontend-handoff.md` giờ còn **đúng 1 entry Open** — cái FE→BE xin per-user
room cho chat (đã re-check: `chatPresenceSocket.ts` vẫn chạy vòng join-all, nên ask còn nguyên).

### ORD-STATUS-FILTER · tab đơn mua lọc server-side, bỏ mitigation fetch-all (2026-08-07) — DONE

`/sweep` fix-mode. Gate cuối: build ✓ · lint 0 error / 3 warning cũ · **635 test / 92 file ✓**
(trước: 627/91). Verify runtime bằng Chrome DevTools MCP trên gateway local (`techstore_demo`).

**Vấn đề.** `GET /order/user/:id` trước đây không lọc được, nên FE kéo **toàn bộ** lịch sử về
rồi mới lọc theo tab ở client (`orderHistoryPaging` auto-`fetchNextPage` tới khi hết page — 65
đơn = 7 request), và `total`/`hasNext` mô tả lịch sử đầy đủ chứ không phải tập đang hiển thị.
BE ship param `status` ngày 2026-08-07 → FE chuyển tab thành filter server-side.

- **`buildUserOrdersQuery(page, limit, statuses)`** (`api/orders.ts`, export riêng để test được)
  là chỗ duy nhất đóng đinh contract query string. Gateway parse query kiểu Express **simple**:
  repeated key số ít chạy (`?status=a&status=b`), cú pháp `status[]=` bị strip → **400**. Cùng
  cái bẫy đã ghi cho `provinceId`/`categoryIds` ở `buildProductListQuery`. List rỗng phải **không
  emit key nào** — `?status=` là *giá trị sai*, không phải "không lọc".
- **`filterTabStatuses(tab)`** (`features/order/orderFilterCounts.ts`) là một định nghĩa duy nhất
  cho ánh xạ tab↔status, giờ badge đếm và filter server dùng chung — trước đó grouping bị chép
  hai nơi, lệch một status là badge nói một đằng list một nẻo. Có test khoá riêng chuyện
  **không có `delivered`** và `canceled` một chữ `l` (gõ sai là 400 cả tab).
- **Query key** `orders.byUserList(userId, statuses)` = `["orders","user",id,"list",…]` — vẫn nằm
  **dưới prefix `byUser`**, nên `invalidateOrderViews({ buyerId })` sẵn có refresh cả 5 tab lẫn
  badge, không phải sửa chỗ invalidate nào.
- **`orderHistoryPaging.ts` bị thu hẹp chứ không xoá** (handoff bảo xoá). Ô **"Tìm theo mã đơn…"**
  không có param server tương ứng, nên nó vẫn lọc trên các page đã tải — đúng cái lời nói dối cũ
  ở quy mô nhỏ. Invariant "còn page chưa tải thì chưa được render empty-state" giữ nguyên nhưng
  **scope lại đúng lúc đang search**; tab status thì `total === 0` là tin được. Đã ghi backend gap
  (`?q=`/`?orderId=`) vào `../.agent-local/backend-handoff.md`; có param đó là xoá cả module.

Verify (MCP, 5/5 tab đều **200**, mỗi tab đúng **1 request**, không còn vòng fetch-all): "Tất cả"
→ `?page=1&limit=10` (**không** có key `status`) · "Đang xử lý" →
`&status=pending&status=confirmed&status=processing&status=shipped&status=delivering` ·
"Trả hàng/Hoàn tiền" → `&status=return_requested&status=refunded` · "Hoàn thành" →
`&status=completed` (body `{"data":[],"total":0,"hasNext":false}` — envelope mô tả **tập đã lọc**,
và UI render đúng empty-state "Không có đơn hàng nào trong mục này" chứ không phải spinner) ·
"Đã hủy" → `&status=canceled`.

### BE handoff inbox · null-clear PATCH + `role` reshape + 409 duplicate credential (2026-08-07) — DONE

`/sweep` fix-mode, 2 entry `## Open` của `../.agent-local/frontend-handoff.md`. Gate cuối:
build ✓ · lint 0 error / 3 warning cũ · **627 test / 91 file ✓** (trước: 614/89). Verify runtime
bằng Chrome DevTools MCP trên gateway local (`techstore_demo` + `testadmin`), test data khôi
phục nguyên trạng sau khi đo.

**1 · `PATCH /api/products/:id` — `null` = "xoá field này".** BE mở đúng **6 field**:
`description`, `sku`, `brandId`, `sellerNotes`, `weight`, `imageUrls`. Mọi field khác gửi `null`
là **400 cứng**, và vắng key vẫn là "giữ nguyên".

- `dirtyProductPatch` (`features/product/product-form/productPatch.ts`) giờ emit `null` thay vì
  bỏ key — **nhưng chỉ khi baseline thật sự có giá trị** (`isClearable(key) && baseline[key] != null`).
  Xoá một field vốn đã rỗng vẫn không gửi gì, nên save no-op vẫn là no-op (patch rỗng → không
  request). Danh sách clearable là một `Set` + type guard `isClearable()`, không phải quy ước
  rải rác.
- **Chặn ở compile-time, không đợi 400 runtime:** `UpdateProductDto = Omit<Partial<CreateProductDto>,
  ClearableProductField> & { [K in ClearableProductField]?: … | null }` (`types/product.ts`).
  Gán `null` cho `name`/`price`/`skuList`… giờ là lỗi `tsc`.
- Bullet 2 của entry (`GET /api/products` đổi sang envelope phân trang) là **no-op với repo này**
  — FE không hề gọi `GET /api/products` trần; marketplace lẫn dashboard đều dùng
  `/products/with-inventory/all` (vốn đã phân trang). Ghi lại để lần sau khỏi đi tìm nhánh
  "array hay object" không tồn tại.

**⚠️ 2 bug hydration lộ ra lúc verify — cả hai đều có sẵn từ trước, và ngữ nghĩa null-clear mới
biến chúng thành mất dữ liệu.** Đây là lý do runtime-verify không bỏ qua được:

- `CreateProductPage.initialFields` **quên hydrate `weight`** → sản phẩm có `weight: 28` render ô
  trống. Seller không thấy, cũng không xoá được (ô trống vốn = "không đổi" với diff).
- `RichTextEditor` truyền `content` vào `useEditor()` — TipTap **chỉ seed lúc mount**. Ở edit mode
  product query resolve *sau* mount, nên editor trống trong khi `fields.description` đã giữ text
  thật. Trước đây vô hại (editor rỗng chỉ làm rơi key). **Sau null-clear thì thành
  `description: null` → xoá trắng cột.** Sửa bằng re-seed có kiểm soát:
  `editor.commands.setContent(value || '', { emitUpdate: false })` — `emitUpdate:false` để lần
  hydrate không bị tính là seller sửa (nếu tính, PATCH sẽ mang theo field seller không đụng vào).
  Test `RichTextEditor.test.tsx` (+3) khoá đúng ba điều đó.

Verify (MCP, `prod_ffc7fd3181d211f1`): xoá ô weight → body PATCH đúng **`{"weight":null}` 15 byte
→ 200**, `description`/`sku`/`brandId`/`imageUrls` nguyên vẹn, version 32→33. Trả lại `weight: 28`
(version 34). Ghi chú công cụ: `fill(uid, "")` của MCP **không kích hoạt** React onChange — phải
dùng native setter + `dispatchEvent(new Event('input',{bubbles:true}))`, nếu không sẽ tưởng nhầm
là code không gửi patch.

**2 · `role` reshape `{id,name,slug}` — đây là gãy thật, không phải dọn dẹp.** BE bỏ entity thô
`rol_*` (kèm `rol_grants` — permission không nên tới browser). Trước khi sửa,
`me.role.rol_name` là `undefined` → `roleSatisfies` so sánh `undefined` → **tài khoản `shop` bị
đá khỏi `/sell/:id`** (verify được: route redirect về `/`). Sửa `types/user.ts` (`Role` mới,
xoá `RoleGrant`), `useRole.ts`, `ProtectedRoute.tsx:25`, `profileAbout.ts:19`,
`AdminPage.tsx:171-175` + 4 fixture test. Doc còn sót `rol_name` cũng đã sửa
(`.ai/context/domain.md`, `.ai/context/conventions.md`).

**3 · 409 duplicate username/email về đúng field.** Trước đây cả hai là `500 "Database operation
failed"` nên form không biết chỉ vào đâu. `credentialConflictError(error, fallback)`
(`lib/domain/credentialConflict.ts`, +7 test) trả `{field: 'username'|'email'|null, message}`;
dùng chung ở `RegisterForm` (`features/auth/LoginPage.tsx`) và `EditProfileModal` — đặt ở `lib/`
vì 2 feature folder cần (DRY rule), theo tiền lệ `paymentUrl.ts`.

- Match trên **`statusCode` + `message`**, *không* trên `error` — envelope BE vẫn ghi
  `"HttpException"` chứ không phải `"Conflict"` (known issue #5 của BE).
- Chỉ đọc `message` khi **có HTTP status thật**. Nhờ vậy `TypeError("Failed to fetch")` (lỗi
  mạng) không rò chữ tiếng Anh vào form, và `500 "Database operation failed"` **không bao giờ**
  làm sáng ô email — cả hai đều có test khoá.
- `EditProfileModal` bỏ luôn đoạn stringify `updateUser.error` thành một dòng chung chung.

Verify (MCP): username trùng → "Tên đăng nhập này đã có người dùng…" ngay dưới ô username, không
có banner trên đầu; email trùng → câu tương ứng dưới EMAIL; **không tạo account nào**. Modal Sửa
hồ sơ với email của người khác: dialog ở nguyên, message dưới EMAIL, `/api/user/me` không đổi.
`/admin` (`testadmin`) load được và cột VAI TRÒ hiện tên thật (`user`, `logistics_operator`,
`shipping_manager`, `shop`) — xác nhận `AdminPage` đọc `user.role.name` đúng.

**Không có entry mới cho `backend-handoff.md`:** mọi endpoint đụng tới đều hành xử **đúng như
contract BE mô tả**; hai bug tìm được đều thuần FE (hydration). Không có API gap để báo ngược.

### BE handoff inbox · 7 entry integrate một lượt (2026-08-06) — DONE

`/sweep` chạy fix-mode trên toàn bộ mục `## Open` của `../.agent-local/frontend-handoff.md`.
Bảy entry được đóng trong một batch; mỗi entry đã có bullet **FE INTEGRATED** riêng trong file
handoff. Gate cuối: build ✓ · lint 0 error / 3 warning cũ · **614 test / 89 file ✓** (trước:
589/86). Verify runtime bằng Chrome DevTools MCP trên gateway local, seller `techstore_demo`,
console sạch.

**Nguyên nhân gốc chung — `ApiError` không phải `Error`.** `request()` (`src/api/client.ts`)
`throw` một **plain object** `{ statusCode, status, message }`. Mọi chỗ FE viết
`error instanceof Error ? error.message : fallback` vì thế **luôn** rơi vào fallback và **vứt
sạch message backend** — đúng thứ mà 3 trong 7 entry của BE than phiền. Cách sửa xuyên suốt:
duck-type trên `message` / `statusCode`, không dùng `instanceof`.

**HO-1 · message thật từ `POST /payment/url`.** `paymentUrlErrorMessage(error)`
(`src/lib/domain/paymentUrl.ts`, +3 test) lấy `message` khi nó là string non-empty, ngược lại
trả câu fallback tiếng Việt. Dùng ở `OrderDetailPage` (dưới nút thanh toán) và
`CheckoutPage` — chỗ này trước đây `catch` **im lặng**; giờ `console.error` nhưng **vẫn
navigate** sang trang đơn (đơn đã tạo xong rồi, submit lại là nhân đôi đơn — comment đã ghi rõ
lý do này để lần sau không ai "sửa" thành retry). Verify: stub 502 → panel hiện
"Cổng thanh toán ZaloPay không phản hồi. Vui lòng thử lại sau." đúng như envelope BE.

**HO-2 · order detail phân biệt 404 với 403/5xx.** Trước đây `!order` ⇒ luôn
"Không tìm thấy đơn hàng." — đơn của người khác (403) hay DB chết (500) đều hiện y hệt, người
dùng tưởng đơn bị xoá. `orderLoadError(error)` (`src/features/order/orderDetailError.ts`,
+5 test) trả `null` cho 404 (giữ nguyên empty-state cũ) và trả `ApiError` cho phần còn lại →
`<ApiErrorState onRetry={refetchOrder}>`. Verify: 404 thật → "Không tìm thấy đơn hàng." ·
stub 403 → "BẠN KHÔNG CÓ QUYỀN TRUY CẬP" + message BE · stub 500 → "MÁY CHỦ GẶP SỰ CỐ".

**Bug tiềm ẩn tự lộ ra khi làm HO-2:** `ApiErrorState` map theo status cứng và **render `null`**
cho status không có trong map → một 500 trơn sẽ cho **trang trắng**. Đã thêm entry `500` +
`UNEXPECTED` fallback, và `resolveErrorConfig()` gom mọi `>= 500` về entry 500. Không có
đường nào ra `null` nữa (`ApiErrorState.test.tsx` +3).

**HO-3 · 409 duplicate SKU về đúng field.** `productSubmitError(error)`
(`src/features/product/product-form/productSubmitError.ts`, +7 test) trả
`{ field: 'sku' | null, message }`: 409 + `/\bsku\b/i` ⇒ `field: 'sku'`, tách được tên SKU khỏi
`"sku FOO already exists"` để nhắc đúng mã; 409 version-conflict phân loại riêng, message mềm.
`CreateProductPage.onError` route `field === 'sku'` vào `form.setFieldError('sku', …)`.
Verify: nhập SKU trùng → 409 → viền đỏ + "SKU này đã được dùng cho sản phẩm khác…" ngay dưới ô
SKU, state form giữ nguyên (trước đây là toast chung chung, người bán không biết sửa ô nào).

**HO-4 · PATCH sản phẩm chỉ gửi field bẩn.** `dirtyProductPatch(baseline, next)`
(`src/features/product/product-form/productPatch.ts`, +8 test) diff bằng `lodash/isEqual`.
Hai điểm không hiển nhiên: (a) `variations` + `skuList` là **cặp bất khả phân** — BE validate
`skuList` với `variations` của *cùng* request, gửi một nửa là mất row biến thể, nên hễ một vế
bẩn thì gửi cả hai; (b) key có giá trị `undefined` bị **drop** thay vì gửi. `SubmitVars` giờ là
discriminated union (`create` full DTO vs `edit` patch); patch rỗng ⇒ điều hướng luôn, không
bắn request. Verify: sửa mỗi giá biến thể → `PATCH /api/products/prod_ffc802c681d211f1` **200**
với body **192 byte** đúng 3 key `price` + `skuList` + `variations` — không `sku`, không `name`,
không `imageUrls`/`categoryIds` (trước: nguyên form). Dữ liệu dev đã khôi phục về 2000.
Không opt-in field `version`: BE ghi rõ nó là opt-in và ồn, còn lost-update thì dirty-patch đã
xử lý ở gốc.

**HO-5 · `isActive` + BUG-B `userId`.** Không phải bug: `userId` trên
`GET /products/with-inventory/all` là **load-bearing** — đó chính là cái làm `/shop` chỉ hiện
sản phẩm của người bán đang đăng nhập. Đã thêm comment giữ chỗ ở `ShopPage.tsx:256` để lần sau
không ai dọn nhầm. Verify: `/shop` gọi
`…/with-inventory/all?limit=50&userId=usr_60ccbe6081c411f1`. Nhân tiện xác nhận contract
public-id còn sống: `?userId=23` → **400** `"userId must match usr_<16 alphanumeric characters>"`.

**BUG-D (cancel 503)** không có gì để gỡ — FE chưa từng ship mitigation cho nó; đã xác nhận lại
với BE trong file handoff.

**Gap mới ghi cho BE:** `PATCH /products/:id` **không xoá được optional field**. PATCH coi key
vắng mặt là "giữ nguyên", JSON lại bỏ luôn key `undefined` → không có đường nào clear
`description`/`brand`. Không phải regression (PATCH full-form trước đây cũng vậy) nhưng
`dirtyProductPatch` làm nó lộ rõ → đã append vào `../.agent-local/backend-handoff.md`, chờ BE
xác nhận `null` = clear.

### GHN-ADDR-01 · checkout gửi đúng `toDistrictId` + `toWardCode` (2026-08-05) — DONE

Backend mở hai field optional này từ **2026-07-23** và nhắc lại ở entry 2026-08-04, nhưng
`grep -rn "toDistrictId\|toWardCode" src/` trả về **0 kết quả** — FE chưa bao giờ tích hợp. Hệ quả:
**mọi** lần checkout đều rơi về free-text resolution, GHN tự đoán quận/phường từ chuỗi pipe
`shippingAddress`. Tên mơ hồ resolve ra một địa điểm *sai mà vẫn hợp lệ* → đúng triệu chứng
`shippingFee: 0` + `ghnOrderCode: null` trên đơn "thành công".

Logic quyết định nằm trọn trong một helper thuần để test được:

- `ghnLocationIds(address)` (`src/features/address/addressUtils.ts`) → `{ toDistrictId, toWardCode }`
  từ địa chỉ đã lưu, hoặc `{}` khi một trong hai vế không dùng được (district id không phải số
  nguyên / `< 1`, ward code rỗng).
- **Cặp này all-or-nothing phía server** — gửi một nửa bị coi như không gửi gì. Nên trả `{}` để
  rơi về free-text **có chủ đích**, thay vì rơi vì lỡ.
- `toWardCode` giữ nguyên **string**: code kiểu `"013010"` mất số 0 đầu nếu đi qua bất kỳ vòng
  chuyển số nào.

`GhnLocationDto` mới ở `src/types/order.ts`; `CreateOrderDto` và `ShippingFeeDto` cùng `extends`
nó. `CheckoutPage.tsx`: mutation tính phí ship giờ nhận nguyên `Address` (trước nhận chuỗi pipe)
để spread được cặp id, và dto tạo đơn spread đúng cặp id đó — preview và vận đơn dùng chung một
địa điểm chính xác.

Test `addressUtils.test.ts` (+8): cả hai id trả về đúng · ward code có số 0 đầu giữ nguyên · ward
code thừa khoảng trắng được trim · 5 case hỏng (ward rỗng/blank, district `0`/âm/không nguyên)
đều ra `{}`. Gate: build ✓ · lint 0 error / 3 warning cũ · **589 test / 86 file ✓**.

Verify runtime (DevTools MCP, `test1`, gateway thật): tạo địa chỉ HCMC / Quận 1 / Phường Bến Nghé
→ `POST /order/shipping-fee` mang `"toDistrictId":1442,"toWardCode":"20101"`; đơn COD
`POST /order` mang đúng cặp đó và trả về **`ghnOrderCode: "L8LR6R"`** (`ord_NiGCJU6Twm6fJupo`) —
vận đơn thật thay cho `null` trước đây.

Còn hở: `shippingFee` vẫn về `0` dù id đúng và `expectedDeliveryTime` hợp lệ. FE không sửa được
(chỉ hiển thị số BE trả) → đã ghi vào `../.agent-local/backend-handoff.md` kèm 3 giả thuyết để BE
loại trừ (from-district của seller chưa cấu hình / cùng quận / item `weight: null`).

### order-history-filter · tab đếm 1 mà list rỗng (2026-08-04) — DONE

Người dùng báo: tab "Trả hàng/Hoàn tiền **(1)**" bấm vào ra "Không có đơn hàng nào" — tưởng
badge hardcode. Không phải: **badge và list đọc hai nguồn khác phạm vi**.

- Badge ← `GET /order/user/:id/status-counts`, server đếm **toàn bộ lịch sử**.
- List ← `useInfiniteQuery` mới tải **trang 1 (10 dòng)**, rồi `Array.filter` trên 10 dòng đó.
- Live 2026-08-04, `usr_60ccb4be81c411f1` 65 đơn: `refunded: 1`, mà đơn refunded duy nhất
  (`ord_516a9cee816611f1`) nằm index 18 → **trang 2**. Tab "Đang xử lý (15)" cũng chỉ hiện 4.
- Nút "Tải thêm" bị gate `filterTab === 'all'` → trên tab đã lọc **không có lối thoát**.
- Search theo mã đơn dính đúng lỗi đó: chỉ tìm trong 10 dòng đã tải.

Không sửa được ở server: `GetOrdersByUserQueryDto` chỉ có `page` + `limit`, **không có `status`**
(list seller thì có — `SellerOrdersQueryDto`). Gửi bừa `status=` bị `whitelist` nuốt im lặng, vẫn
`200`, list không lọc.

Mitigation `features/order/orderHistoryPaging.ts` (+ 6 test): tab ≠ `all` hoặc đang search →
kéo **hết** trang còn lại rồi mới lọc; và chặn empty-state trong lúc còn trang chưa tải — trước
đây nó khẳng định "không có" khi chưa xem xong. Nút "Tải thêm" chuyển sang gate `!narrowed` (chỉ
còn ý nghĩa ở tab `all`). Verify live: tab return hiện đúng 1 đơn, tab "Đang xử lý" đúng 15/15.

Giá phải trả: 65 đơn = 7 request (`page=1..7`) để lọc ra 1 dòng; 500 đơn = 50 request. Đã ghi
`backend-handoff.md` (Open 2026-08-04) — thêm `?status=` là xoá hẳn module này. Kèm theo:
`backend-api.md` sửa dòng "Status counts are not page-scoped… That is correct, not a bug" (đọc
xong dễ tưởng lệch là chuyện bình thường) + `pitfalls.md` §1b.

Gates: build ✓ · lint 0 error / 3 warning cũ · test 571/571 (84 file).

### payment-result-orderid · deep-link sau thanh toán là link chết (2026-08-04) — DONE

Snapshot ghi item này là "regex `/^\d+$/` không khớp public id `ord_`". Verify live bằng Chrome
DevTools MCP thì **ngược lại**, và nặng hơn:

- Backend gửi `?order=111` — id **nội bộ dạng số**. Bằng chứng: `buildFrontendPaymentResultUrl()`
  (`apps/payments/src/payments.service.ts:340-374`) nhận đúng biến `orderId` mà `:114` đưa vào
  `{ orderId: Number(orderId) }`; `payments.service.spec.ts:162` assert nguyên văn
  `?order=111&method=vnpay`.
- Regex cũ **nhận** số đó rồi dựng `/order/111`. Mà `GET /api/order/111` → **400**
  `"Invalid id — expected format ord_<16 alphanumeric characters>"` (đối chứng:
  `/api/order/ord_516a9c38816611f1` → 200), nên `/order/111` render "Không tìm thấy đơn hàng."
  → không phải "id bị rơi về `/orders`" mà là **link chết chắc chắn** sau mọi lần thanh toán.

Fix: tách `resolveResultOrderId()` ra `src/features/payment/paymentResultParams.ts`, guard bằng
`/^ord_[0-9A-Za-z]{16}$/` — đúng shape `libs/common/src/public-id/public-id.util` validate. Viết
theo **shape public id** chứ không theo luật "reject số", nên ngày BE đổi contract thì deep-link
tự sống lại, FE không phải sửa. Số → coi như không có id → fallback `/orders`.

- `paymentResultParams.test.ts` — 5 test (public id · id số live `111`/`999` · null/rỗng ·
  txn ref của cổng · near-miss 14/17 ký tự, sai prefix, có gạch, có space).
- `e2e/payment-result.buyer.spec.ts` viết lại: 2 → 4 case, mỗi nhánh success/failure một lần với
  public id và một lần với id số. Spec cũ assert `#999` + `href="/order/999"` — tức là **đang
  đóng đinh chính con bug** (vi phạm `/e2e` rule 5).
- Backend gap ghi vào `../.agent-local/backend-handoff.md` (Open 2026-08-04), kèm một phát hiện
  phụ: `apps/payments/.env.example:119,127` trỏ return URL của cả 2 cổng về
  `/api/gateway/payment-result` — endpoint trả **JSON thuần**, không redirect, nên user thật sẽ
  đứng trên trang JSON.

Gates: build ✓ (24,8s, gồm tsc) · lint 0 error / 3 warning advisory cũ · test 565/565 (83 file).

### ai-context-audit · đại tu bộ context `.ai/` (2026-08-03/04) — DONE

Rà toàn bộ guidance mà agent đọc. Chi tiết từng batch + phần còn treo: `context-system-backlog.md`.

- **A — 9 mâu thuẫn nguy hiểm.** Doc bảo agent làm hỏng code đang đúng. Nặng nhất: luật
  `renderHook` wrapper sai ở `testing.md` + `add-test.md` + `review.md`.
- **B — path/name drift.** 28× `frontend/src`→`src`; `hooks/queryKeys.ts`→`hooks/query/queryKeys.ts`;
  `hooks/useAuth.ts`→`hooks/auth/useAuth.ts`; `CartContext.tsx:22`→`AuthContext.tsx:22`.
- **C1/C2/C4 — cắt mỡ.** `snapshot.md` 67.150→9.044 B (−86,5%) · `project.md` −74 dòng ·
  `CHANGELOG.md` 173.758→89.845 B (−48%, phần trước 2026-07-10 sang `CHANGELOG.archive.md`
  **nguyên văn**).
- **D — 4 file kiến thức mới/mở rộng.** `context/domain.md` (state machine đơn hàng, return/refund,
  voucher, idempotency, role × màn hình) · `context/pitfalls.md` (13 mục *triệu chứng → nguyên nhân
  → luật*, chủ đề chung là **thất bại im lặng**) · mục E2E trong `testing.md` · lớp `Common Types`
  của `context/backend-api.md`.
- **E — 2 lệnh mới.** `/sync-context` (quét drift doc↔code, 7 check) · `/e2e`.
- **C3 — rà dead content bằng chính `/sync-context`: CLEAN.** 136 path, 88 tên, 31 route, mọi
  npm script đều resolve. Path chết chỉ còn trong changelog — đúng thiết kế.
- **Hai lỗi thật lòi ra từ việc verify chứ không chép doc:** `npm run build` không typecheck
  (entry riêng ngay dưới) và enum `OrderStatus` trong `backend-api.md` ghi 6 giá trị trong khi code
  có 9 — agent tin bảng cũ sẽ viết `switch` không exhaustive.
- **Chi phí context:** always-loaded 12.239 → **12.627 B ≈ 3,5k token/session**. Mọi file mới đều
  **on-demand** qua Context Map, không cái nào vào `@import`.
- **C5+C6 — `.claude/settings.json`, user dán tay** (file nằm trong deny list của chính nó nên
  agent soạn patch chứ không sửa được): `Edit(.claude/context/**)` → `Edit(.ai/**)` — allow-list
  vẫn trỏ vào thư mục đã xoá nên **mọi lần sửa doc đều phải approve tay**, chính là ma sát suốt
  đợt này; thêm deny `git checkout*` / `git clean*` (xoá được việc chưa commit) và `curl *` /
  `Invoke-WebRequest*`; gỡ `tsc` khỏi Stop hook vì gate `build` đã lo. Đã đọc lại file xác nhận.
- **Gates:** markdown-only ở batch cuối; vẫn chạy đủ — xem entry `build-typecheck`.

### build-typecheck · `npm run build` giờ mới thực sự chạy `tsc` + 3 lỗi type tồn đọng (2026-08-04) — DONE

Phát hiện khi viết `.ai/context/pitfalls.md`: chạy `npx tsc --noEmit` để lấy bằng chứng cho một
mục thì ra **3 lỗi thật**, trong khi `npm run build` vẫn xanh.

- **Nguyên nhân gốc.** `"build": "vite build"` — không gọi `tsc` ở đâu cả (Vite transpile bằng
  esbuild, vứt hết type). Template Vite chuẩn là `"tsc -b && vite build"`; chỗ này bị rơi mất.
  Trong khi đó **4 file doc** (`core.md:12`, `project.md:80`, `workflows/fix-typescript.md:3`,
  `workflows/review.md:27`) đều khẳng định build "includes `tsc --noEmit`" → không ai chạy
  typecheck riêng, và `npm run lint` ở repo này không bật type-aware rule nên cũng không bắt hộ.
  Hệ quả: 3 lỗi sống trong working tree từ **2026-07-22 → 2026-08-04**.
- **Fix 1 — gate.** `package.json` → `"build": "tsc --noEmit && vite build"`. Chọn sửa **code cho
  khớp doc** (không sửa doc cho khớp code) vì ý định của doc mới là đúng: không bao giờ đóng task
  với TS error. Script `typecheck` sẵn có giữ nguyên cho lần chạy lẻ.
- **Fix 2 — `SOCKET_CONNECT_OPTIONS` (2 lỗi).** `as const` làm `transports` thành
  `readonly ["websocket"]`, không assign được vào `string[] | TransportCtor[]` của socket.io ở cả
  `socket.ts:53` và `useChat.ts:121`. Đổi sang annotation tường minh
  `Partial<ManagerOptions & SocketOptions>` (bỏ `as const`) — vẫn là single source of truth,
  test `socket.test.ts` giữ nguyên và vẫn pass.
- **Fix 3 — `persistSimpleStock` sku (1 lỗi).** Đợt sku-optional (2026-07-22) đổi
  `CreateProductDto.sku` thành optional nhưng không kéo theo `CreateInventoryDto.sku` và
  `persistSimpleStock(productId, sku: string, …)`. Runtime vốn đã đúng — bỏ trống thì backend cấp
  fallback `PROD-<productId>` (đã runtime-verify 2026-07-22: `inventory.sku: "PROD-60"`); chỉ có
  **type** là tụt lại. Nới `CreateInventoryDto.sku?: string` (kèm comment ghi nguồn xác minh) và
  `persistSimpleStock` nhận `string | undefined`.
- **Không thêm test.** Cả 3 đều là type-only, không sinh nhánh runtime nào để unit-test; bản thân
  `tsc` trong gate mới **chính là** cái test cho lớp lỗi này (trước đó không tồn tại).
- **Gates:** `npm run build` ✓ (giờ gồm tsc, 14,6s) · `npm run lint` 0 error / 3 warning
  (đúng danh sách advisory cũ) · `npm run test:run` 560/560 ✓ / 82 file.
- Bài học ghi thường trú vào `.ai/context/pitfalls.md` mục 9.

### raw-palette-retoken · drain raw-Tailwind-palette styling debt (2026-07-23, /sweep) — DONE

Audit-lens sweep found ~28 raw Tailwind-palette classes (numbered palette: `amber-400`,
`red-500`, `red-950`, `amber-500`, …) still surviving across 11 files — a core-rule
violation ("No hardcoded hex and no raw palette — use `tb-*` tokens"). Retokened all of
them to `tb-*` / `accent-*` equivalents.

- **New token.** Added literal-hex `tb-cyan` (`#06B6D4`) to `tailwind.config.js`, mirroring
  the earlier `tb-green` addition. Needed because the `ApiErrorState` cyan tone (404/503
  configs) uses opacity modifiers (`/30`, `/10`), and the CRITICAL pitfall (tokens.md, verified
  live 2026-07-11) is that opacity modifiers silently no-op on var()-based aliases like
  `accent-cyan` — rings fall back to default blue. Literal `tb-cyan` emits real hex-alpha.
- **Retokened (11 files).** `ApiErrorState.tsx` TONES (amber/red/cyan rings, chips, dots →
  `tb-*`/`accent-*`); `PaymentResultPage.tsx` (spinner + error banner); `LoginPage.tsx` &
  `ForgotPasswordForm.tsx` & `PostDetailPage.tsx` & `ProfilePage.tsx` (error banners
  `bg-red-9xx` → `bg-tb-red/10`); `ChatThread.tsx`, `MessagesPage.tsx`, `CommentNode.tsx`,
  `PostDetailPage.tsx` (composer `focus:border-amber-400/50` → `focus:border-tb-amber/50`);
  `ProductDetail.tsx` (selected-variant border + highlight bg); `CartPage.tsx` &
  `MarketplacePage.tsx` (native form-control `accent-amber-*` → `accent-tb-amber`).
- **Docs.** `tokens.md` updated: `tb-cyan` added to the color-token table, listed as the
  `tb-*` equivalent for `accent-cyan`, folded into the opacity-modifier guidance and quick
  decision table (cyan is no longer "alias-only").
- **Validation.** `npm run build` ✓, `npm run lint` 0 errors (3 pre-existing deferred warnings:
  `ui/button`, `ui/badge`, `AuthContext`), `npm run test:run` 560 ✓. No test added — pure
  token-equivalent className/config swap with no testable logic (documented precedent).
- **Verified via built CSS (static, no runtime):** rebuilt and confirmed every new opacity
  class emits correct hex-alpha, proving the alias no-op pitfall was avoided — `tb-cyan/30`
  = `#06b6d44d`, `tb-cyan/10` = `#06b6d41a`, `tb-red/10` = `#ef44441a`, `tb-amber/50`
  = `#f59e0b80`, `accent-tb-amber` = `accent-color:#F59E0B`; 0 stale raw-palette classes
  remain in the bundle. Full-stack runtime skipped: color-equivalent visual swap, no backend
  confirmed running.

### cloudinary-chunk-plan · test-cover chunked-upload math (2026-07-23, /sweep) — DONE

Closed the deferred snapshot Convention gap "`cloudinary.ts` vẫn chưa có test (chunk math,
progress, orphan logic)". The chunk-planning math was inline inside `uploadChunked` (wrapped
around `fetch`), so it could not be unit-tested without stubbing the network.

- **Extract.** New pure helper `src/lib/http/uploadChunkPlan.ts` — `planUploadChunks(fileSize,
  chunkSize = CHUNK_SIZE)` returns the ordered `{ index, start, end, contentRange, percent }[]`
  (offsets, `bytes <start>-<end-1>/<size>` header, and rounded cumulative progress); plus
  `buildUploadId(timestamp, publicId)` for the `X-Unique-Upload-Id` value. `CHUNK_SIZE` (6 MB)
  moved here too.
- **Wire.** `uploadChunked` now iterates `planUploadChunks(file.size)` and emits each chunk's
  `contentRange` / `percent` — byte-identical to the previous inline `for` loop (same header
  string, same `Math.round(((i+1)/total)*100)` progress).
- **Test.** `uploadChunkPlan.test.ts` (+9): single sub-chunk file, multi-chunk with a small
  remainder, exact-multiple (no empty trailing chunk), contiguous non-overlapping ranges, last
  chunk ends exactly at file size, `Content-Range` last-byte = `end-1`, progress `25→50→75→100`,
  zero-byte/negative/zero-chunk → `[]`, custom chunk size, and `buildUploadId` join. Orphan
  cleanup (`deleteMedia`) was already covered by `deleteMediaOutcome.test.ts`; what remains
  untested in `cloudinary.ts` is only the `fetch` I/O orchestration (integration-level).
- **Validation.** `npm run build` ✓, `npm run lint` 0 errors (3 pre-existing deferred warnings:
  `ui/button`, `ui/badge`, `AuthContext`), `npm run test:run` 551→560 ✓.
- **Runtime-verified (Chrome DevTools MCP, techstore_demo, live gateway :3000, dev :5173,
  2026-07-23):** uploaded an 8,673,083-byte PNG (2 chunks) via `/sell` → signature `POST
  /api/upload/signature?folder=trybuy%2Fproducts` **201** → two Cloudinary chunk POSTs both **200**,
  and the live `Content-Range` / `X-Unique-Upload-Id` headers matched the helper exactly: chunk 0
  `bytes 0-6291455/8673083` (resp `{done:false,bytes:6291456}`), chunk 1 `bytes
  6291456-8673082/8673083` (resp `{done:true, secure_url:…}`), shared upload id
  `1784755719_23_zdm1kDY6wZ`. Image rendered in slot 1 (1/6, BÌA badge); no new console errors
  (only pre-existing 502s on cart/notifications + a socket.io warn).

### apierror-deadcode · delete unused `ApiErrorContext` (2026-07-22, /sweep) — DONE

Cleared the `react-refresh/only-export-components` warning on `src/context/ApiErrorContext.tsx`
by removing the file — investigation showed it was **entirely dead code**.

- **Finding.** `ApiErrorProvider` is never mounted (`App.tsx` wraps only `QueryClientProvider`
  + `AuthProvider` around the router), `useApiError` is never called, and there is no test or
  barrel re-export — a full-repo grep for `useApiError` / `ApiErrorProvider` / `ApiErrorContext`
  matched only doc files. The global-error mechanism it modelled was superseded: 401s go through
  `registerUnauthorizedHandler` (→ redirect), and API errors render via the `ApiErrorState`
  component + react-query error state. (It was memoized back on 2026-07-06, but that hardened a
  provider nothing consumes.)
- **Fix.** `git rm src/context/ApiErrorContext.tsx` (−31 lines). Extracting the hook to a
  sibling file would have been pointless ceremony for code with zero consumers; deletion removes
  the warning *and* the cruft.
- **Validation.** `npm run build` ✓, `npm run lint` 4→3, `npm run test:run` 537/537 ✓.
  Runtime smoke-tested via Chrome DevTools MCP (`canceltest1779978329`): login succeeds, `/`
  (`FeedLayout` + `RightRail`) and `/messages` (`MessagesLayout`) render; only pre-existing
  console noise (socket.io reconnect warnings + one broken-image 404), no new errors.
- **Remaining 3 warnings** (`ui/button`, `ui/badge`, `AuthContext`) stay blocked/deferred — see
  the router-layouts entry below.

### router-layouts · move layout components out of `router.tsx` for Fast Refresh (2026-07-22, /sweep) — DONE

Cleared the 3 `react-refresh/only-export-components` warnings on `src/router.tsx` (the
`router` export is a non-component object, so colocating the `AppLayout` / `MessagesLayout` /
`FeedLayout` function components in the same module breaks Fast Refresh for that file).

- **Fix.** Moved the 3 layout components — plus the `FeedPage` / `MessagesPage` lazy handles
  they exclusively render — into a new `src/routerLayouts.tsx` (a components-only module, a
  valid Fast Refresh boundary). `router.tsx` imports them and now exports only `router`.
  Dropped the now-unused `Outlet` / `AppShell` / `RightRail` imports from `router.tsx`
  (`ProtectedRoute` stays — still used directly by role-gated route elements).
- **No behavior change.** Same route tree, same lazy chunks, same layout wrapping — a pure
  file reorganization. No unit test (a component-relocation refactor has no branching logic;
  build + existing suite verify it — same rationale as the RR-prod-alias item).
- **Validation.** `npm run build` ✓, `npm run lint` 7→4 (router×3 gone), `npm run test:run`
  537/537 ✓.
- **Remaining 4 warnings are blocked/deferred:** `ui/button` + `ui/badge` (`cva` variant
  exports) live under the write-protected `src/components/ui/` shadcn-primitives dir; moving
  `AuthContext`'s `useAuthContext` hook would churn its 12 importers — not justified by a
  dev-only Fast Refresh warning.

### payment-redirect · extract external gateway redirect into `redirectToPaymentGateway` (2026-07-22, /sweep) — DONE

The one remaining runtime-facing lint warning (`react-hooks/immutability` on
`CheckoutPage.tsx:286` `window.location.href = paymentUrl`) is closed. The identical
external payment-gateway redirect was also duplicated in `useOrderPaymentUrl.ts:13` (the
"Thanh toán ngay" re-pay action) — a DRY case (same logic in 2 places).

- **Fix.** New helper `redirectToPaymentGateway(url)` in `src/lib/domain/paymentUrl.ts`
  (`window.location.assign(url)`) — both call sites already resolve the URL through that
  module, so it is the natural single home. `CheckoutPage` and `useOrderPaymentUrl` now call
  the helper instead of assigning `window.location.href` inline. Behavior is identical
  (both navigate the browser to the same gateway URL and push a history entry).
- **Why this is the sanctioned `window.location`.** Core rule bans `window.location` in
  favor of `useNavigate`/`<Link>`, whose sole exception is a cross-origin handoff the SPA
  router cannot perform (the payment gateway). Isolating it behind a named lib helper keeps
  components/hooks free of raw `window.location` and stops the React Compiler flagging the
  global assignment inside a component.
- **Test.** `paymentUrl.test.ts` (+1): stubs `window.location` (jsdom's `location.assign`
  is non-configurable so the whole object is swapped via `defineProperty` and restored in a
  `finally`) and asserts the helper calls `assign` once with the given URL.
- **Not runtime-verified via MCP:** exercising it end-to-end requires initiating a real VNPay
  handoff that navigates off-app to a third-party gateway; the change is a behavior-preserving
  refactor of the redirect and the unit test covers the helper.
- **Gates:** build ✓ / lint 0 errors (**8→7** warnings; all 7 left are advisory fast-refresh
  export warnings) / test:run 537 ✓ (was 536, +1).

### RR-prod-alias · react-router production build in prod bundle (2026-07-22, /sweep) — DONE

React Router 7.15.1's package `exports` map points every condition (`module`/`import`/`default`)
at `dist/development/*`, and the reachable-but-unlisted `dist/production/*` build is byte-for-byte
the same API with `ENABLE_DEV_WARNINGS` compiled to `false`. As shipped, the production bundle
carried the dev build → per-navigation debug logging (`warning()` calls like "Matched leaf route
at location") and small per-navigation overhead. Confirmed pre-fix: dev chunks have
`ENABLE_DEV_WARNINGS = true`, prod chunks `= false`; the debug string lived in `dist/assets/index-*.js`.

- **Fix (option a — alias, no dep change).** `vite.config.ts` now redirects the two bare specifiers
  that `react-router-dom` re-exports — `react-router` → `node_modules/react-router/dist/production/index.mjs`
  and `react-router/dom` → `.../dist/production/dom-export.mjs` — but **only when `mode === 'production'`**,
  via regex `find` aliases (`^react-router$` / `^react-router\/dom$`). The dev server and vitest keep
  `mode` `development`/`test`, so they resolve React Router normally through its exports map and keep the
  dev warnings. The `@` alias was moved to the array alias form alongside them. Option (b), upgrading to
  react-router 8.x (major), was intentionally not taken — no dependency changes.
- **No unit test** — a build-config alias has no branching logic to extract into a pure helper. The
  verification is the build artifact itself.
- **Verified via bundle grep after `npm run build`:** `dist/assets/*.js` now contains **0**
  "Matched leaf route at location" and **0** `ENABLE_DEV_WARNINGS` (both present before), while React
  Router invariant literals ("Absolute route path", "useRoutes") remain → the production RR build is
  bundled, not tree-shaken away. `vite preview` boots and serves `index.html` + the main bundle (both 200).
- Gates green: build ✓ / lint 0 errors (8 pre-existing warnings) / test:run 536 ✓ (the RTL suite renders
  `RouterProvider`/`MemoryRouter` and navigates, exercising the RR runtime in `mode: test` — unaffected).
- Full DevTools MCP console-noise click-through (login → navigate, confirm no RR debug logs) is optional
  and left pending; it needs full-stack. The bundle-grep + preview-boot proof covers the fix's intent.

### SCALE-05 · `request()` retries once on 503 + Retry-After (2026-07-22, /sweep) — DONE

Backend hardening (handoff SCALE-05) sheds excess load early with `503` + a `Retry-After`
header (default 2s) instead of letting saturated requests hang ~10s and time out. The request
is shed *before* the handler runs, and payment callbacks/health probes are never shed, so a
single retry is safe for any method (no double-processing).

- **Pure policy helper.** Added `overloadRetryDelayMs(status, retryAfterHeader)` in
  `src/api/retry.ts` → returns the ms to wait before one retry, or `null` for any non-503.
  Caps the wait at `MAX_RETRY_DELAY_MS = 5000` (a garbage/huge header can't hang the UI) and
  falls back to `DEFAULT_RETRY_AFTER_SECONDS = 2` when the header is missing/blank/non-numeric/
  HTTP-date/negative.
- **Wiring.** `request()` (`src/api/client.ts`) now sends via a `send()` closure, checks the
  first response through the helper, and — on a 503 — waits then re-sends **once**. If the retry
  also sheds, the `503` throws as a normal `ApiError` and generic 5xx handling takes over. JSON
  string bodies re-fetch cleanly.
- **Tests:** `retry.test.ts` (+6, helper decision matrix) and `index.test.ts` (+2 MSW round-trips:
  503→retry→200 resolves; 503→503 throws `statusCode: 503`; both use `Retry-After: 0` so no wait).
- Gates green: build ✓ / lint 0 errors (8 pre-existing warnings) / test:run 536 ✓.
- Not runtime-verified — reproducing it needs the gateway actually overloaded; the MSW
  integration test exercises the real fetch + retry path instead.

### SCALE-01b · Sockets connect websocket-only (2026-07-22, /sweep) — DONE + runtime-verified

Backend prep (handoff SCALE-01b) lets the gateway run as N clustered workers with no sticky
sessions; the Socket.IO **polling** handshake round-robins across workers and breaks, while
pure websocket works cross-worker (Redis adapter fans out broadcasts). Also closes the
long-standing snapshot "polling-only" mystery — re-checked live 2026-07-19 the FE was still
polling-only, and the root cause was simply that the client never forced the websocket transport.

- **Shared options constant.** Added `SOCKET_CONNECT_OPTIONS = { withCredentials: true,
  transports: ['websocket'] } as const` to `src/lib/realtime/socket.ts` and routed both
  `io()` call sites through it: the ref-counted factory (presence + notification sockets) and
  the per-thread chat socket in `useChat.ts`. Single source of truth so the two never drift.
- **Test:** `socket.test.ts` (+1) asserts `SOCKET_CONNECT_OPTIONS` carries `withCredentials`
  and the `['websocket']` transport (the invariant the backend requires to scale).
- **Docs:** `realtime.md` gains a "Transport" note under Gateway Reference.
- Gates green: build ✓ / lint 0 errors (8 pre-existing warnings) / test:run 529 ✓.
- **Runtime-verified (Chrome DevTools MCP, techstore_demo, live gateway :3000, dev :5173):**
  `/messages` thread opened with no disconnected/reconnecting banner; sent
  "sweep SCALE-01b websocket-only verify" → optimistic message reconciled with a server
  timestamp (server echoed `new_message` back over the socket), input cleared. **Zero
  `socket.io/?EIO=4&transport=polling` requests in the entire network log** (previously these
  flooded to `:3000`), confirming the polling handshake is gone and the websocket transport
  connects against today's single-instance gateway.

### refs-during-render group cleared + FMT-01 closed + flat-tsc clean (2026-07-19, /sweep 3)

**Item 1 — lint refs-during-render (4 warnings, 12→8).**
- **`useChat`** — `currentUserIdRef.current = currentUserId` moved from render into a
  `useEffect([currentUserId])`; the socket effect's sync `setConnectionStatus('connecting')`
  replaced by shared `useResetOnChange(conversationId, …)` (guarded so an emptied id tears
  down without resetting), so a thread switch resets status during render with no cascading
  re-render and no frame showing the previous thread's status.
- **`CreateProductPage`** — `clearImagesRef.current = form.clearImages` moved into a
  `useEffect([form.clearImages])`; unmount orphan-cleanup semantics unchanged.
- **`MessagesPage`** — removed the unused `react-hooks/exhaustive-deps` eslint-disable on the
  `userMap` memo.
- Tests: new `useChat.test.tsx` (2, socket.io-client mocked via `vi.hoisted` FakeSocket):
  connect → `connected`; switching conversations resets to `connecting`, joins the new room
  and never re-joins the old one.
- Runtime-verified (Chrome DevTools MCP, techstore_demo, live gateway): `/messages` thread
  shows "Đang kết nối…" then clears on connect; send → "Đã gửi" + list preview updates;
  console clean. Observed socket.io still polling-only (known open item, unrelated).

**Item 2 — FMT-01 closed as moot.** The double-quote reformat of `api/orders.ts` /
`types/order.ts` / `api/users.ts` is already in HEAD (landed with the F4 commit), so the
recorded fix ("revert format-only diff before commit") has no window left; the current
working-tree diff on those files is purely functional PUBID typing (`number`→`string`).
Re-reverting quote style now would create exactly the format-only mega-diff FMT-01 warned
about. No code change; lesson retained in snapshot.

**Item 3 — latent flat-tsc errors fixed.** `npx tsc --noEmit` (non-incremental) exposed:
`BasicInfoSection.onAddImages` still typed `Promise<void>` after AI-02 F3 made
`useProductForm.addImages` return the uploaded batch → widened to `Promise<ImageItem[]>`
(type-only; the section itself ignores the return). Also kept the new test lib-safe
(`sockets[length-1]` helper instead of `.at()`, which the flat root config's older lib
rejects). Flat `tsc --noEmit` now exits 0 — the "latent tsc errors" backlog item is closed.

Gates: build ✓ · lint 0 errors / **8 warnings (12→8)** · test:run 78 files / 528 tests ✓ ·
flat `npx tsc --noEmit` ✓.

### set-state-in-effect group cleared — CartPage/ProductDetail/ChatDialog/BasicInfoSection (2026-07-18, /sweep)

Cleared the remaining `react-hooks/set-state-in-effect` warning group (6 warnings incl.
CartPage's companion `exhaustive-deps`) by removing the sync-`setState` effects in all four
files. The removed effects also ran on mount, which `useResetOnChange` deliberately does not —
so each component gained a lazy `useState` initializer to preserve mount-time behavior, with
`useResetOnChange` handling subsequent changes in the same render pass:

- **`CartPage`** — select-all now seeds from `items` in the initializer; reselect-all is keyed
  on `cart?.id` (refetches of the same cart keep the user's manual selection).
- **`ProductDetail`** — default variant tier selection extracted to pure helper
  `defaultTierSelection(variations, skus)` in `lib/domain/sku.ts` (first in-stock option per
  tier, malformed SKUs filtered via `getValidSkus`). The `products.withInventory` query moved
  above the state declarations so the initializer sees cached data; three `useResetOnChange`
  keys (`id`, `variations`, `skus`) share one idempotent `resetSelection`.
- **`ChatDialog`** — stale conversation dropped during render on close (reopen can no longer
  flash the previous thread); the create-on-open effect keeps `createConv` in deps and the
  `eslint-disable` was removed (TanStack v5 `mutate` is stable).
- **`BasicInfoSection`** — the verbatim-duplicated brand/category mirror effects extracted to
  pure helper `mergeLocalOptions` (`product-form/localOptions.ts`): normalize ids to number,
  keep session-proposed rows not yet in the prop list, dedupe once the server list contains
  them. Lazy init now normalizes at mount (previously un-normalized until the effect ran).

Tests: `sku.test.ts` +4 (`defaultTierSelection`), `localOptions.test.ts` 4,
`CartPage.test.tsx` 2 (MSW: auto-select on load; manual deselect sticks),
`ChatDialog.test.tsx` 2 (create-on-open renders thread; delayed second create after
close/reopen shows "Đang kết nối…" with no stale thread).

Gates: build ✓ · lint 0 errors / **12 warnings (18→12)** · test:run 77 files / 526 tests ✓.
Runtime-verified (Chrome DevTools MCP, canceltest… + techstore_demo): cart loads with item
auto-selected, deselect updates summary to 0 with no reset loop; product
`prod_ffc8017d…` mounts with "Đen" SKU matched (add-to-cart enabled), clicking "Trắng"
switches price 1.500→3.500 đ; `/sell` renders 14 categories and the brand combobox filters
("So" → Microsoft/Sony + propose-new). Console clean. ChatDialog has no production mount
point (the product-page Chat button navigates to `/messages`) — jsdom coverage only.
No backend gap surfaced.

### ApiErrorState countdown — set-state-in-effect warning cleared (2026-07-18, /sweep)

The 429 rate-limit countdown reset (`setLeft(seconds)` in a `useEffect` keyed on `seconds`)
was the priority runtime-facing lint warning: the effect fires after commit, so a new error
painted one frame with the stale countdown before resetting. Replaced with the existing shared
hook `useResetOnChange` (`src/hooks/ui/useResetOnChange.ts`, adjust-state-during-render pattern
from the 2026-07-16 pagination sweep) — reset now lands in the same render pass. One-line swap
in `ApiErrorState.tsx`; the per-second tick effect (real timer subscription) is untouched.

Tests: `ApiErrorState.test.tsx` +3 (parse retry window from message + retry disabled; tick
30s→29s under fake timers; new 429 error resets 28s→10s and relabels the retry button).
Note: chained ticks need one `act(advanceTimersByTime(1000))` per tick — the next timeout is
scheduled in an effect after the previous flush, so a single 2000ms advance only fires once.

Gates: build ✓ · lint 0 errors / **18 warnings (19→18)** · test:run 74 files / 514 tests ✓.
Runtime-verified (Chrome DevTools MCP, techstore_demo): 404 catch-all route renders the
component correctly post-change, console clean. The 429 leg itself is unit-covered only
(forcing a live 429 requires spamming a rate-limited endpoint).

### STY pass 3 — tokenized PaymentResult success green (2026-07-18, /sweep)

Added literal Tailwind token `tb-green` (`#10B981`) so success backgrounds can use opacity
modifiers without the CSS-variable alias pitfall. `PaymentResultPage` now uses `bg-tb-green/15`
and `text-accent-green` instead of raw Tailwind greens; `.ai/tokens.md` documents when to choose
the semantic alias versus the literal token. Styling-only change, so no unit test was added.

Gates: build ✓ · lint 0 errors / 19 pre-existing warnings · test:run 74 files / 511 tests ✓.
Runtime-verified with Chrome DevTools on an isolated mocked success response: success badge 80×80,
computed background `rgba(16, 185, 129, 0.15)`, icon 44×44 / `rgb(16, 185, 129)`, no overflow.

## Feature integration

### sku-optional — base-product SKU is now optional on the create form (2026-07-22, /sweep) — DONE + runtime-verified

Integrated the backend "Product create without SKU fallback" handoff (2026-07-11): sellers can
now create a base-price product without typing a SKU, and the backend provisions `PROD-<id>`.

- **Finding.** The BE made `sku` optional (omit → inventory row gets `PROD-<productId>`), but the
  FE still hard-required it in three places: `useProductForm.validate()` rejected a blank SKU,
  `buildPayload()` substituted a `'DRAFT'` placeholder, and `CreateProductPage`'s `isReady` /
  `missingItems` submit-gate listed SKU. So a seller was blocked before the request ever left.
- **Fix (minimal diff).**
  - `productSku.ts` (new pure helper) — `skuForPayload(raw)` trims and maps blank/whitespace to
    `undefined` (omit the field) instead of `'DRAFT'`; `buildPayload()` uses it.
  - `productReadiness.ts` (new pure helper) — `missingFields(fields)` / `isFormReady(fields)`
    compute the submit-gate without SKU; `CreateProductPage` derives `isReady` and the "Còn thiếu"
    list from it (replacing the inline duplicated logic).
  - `validate()` dropped the "SKU không được để trống" rule.
  - `CreateProductDto.sku` is now optional (`sku?: string`).
  - `BasicInfoSection` label dropped the `*` and shows the hint "Bỏ trống để hệ thống tự tạo mã."
- **Tests.** `productSku.test.ts` (+4), `productReadiness.test.ts` (+10, incl. explicit "never
  lists SKU" + display-order assertions).
- **Validation.** `npm run build` ✓, `npm run lint` 0 errors (3 pre-existing warnings), `npm run
  test:run` 551/551 ✓ (+14). Runtime-verified via Chrome DevTools MCP (`techstore_demo`, live
  gateway): the form went "Sẵn sàng để đăng" with SKU blank; `POST /api/products` body carried no
  `sku` → **201**; `GET /products/:id/with-inventory` showed `product.sku:null` +
  `inventory.sku:"PROD-60"`; fixture deleted with **204** (re-fetch 404).

### UP-05 + UP-08 — chunked-upload signature fixes (2026-07-17, /sweep)

Two bugs on the same Cloudinary upload path, both found/fixed in one pass:

- **UP-08 (discovered during UP-05 runtime verify — the bigger one):** since the PUBID migration,
  `user.id` is an opaque `usr_…` string, but FE forwarded it as `userId` to
  `POST /api/upload/signature`, which validates `userId must be an integer number` → **every**
  upload (post images/video, product images, avatars) failed with 400 before Cloudinary was even
  reached. Probing showed the param-less call returns 201 and the backend derives the owner from
  the JWT cookie, returning an owner-prefixed `public_id` (`23_xxx`) — which `uploadChunked`
  already consumed. Fix: `api.upload.getSignature(folder)` drops `userId`/`publicId`;
  `makePublicId` deleted. The four upload wrappers keep their `(_userId)` arg so call sites and
  the UP-06 login gate stay untouched.
- **UP-05:** the unsigned `upload_id` form field (old `cloudinary.ts:39-41`) broke Cloudinary's
  SHA1 verification (every form param except `file`/`api_key`/`signature` is verified) → "Invalid
  Signature" for every multi-chunk (>6MB) upload. Chunk association correctly rides the
  `X-Unique-Upload-Id` header. Fix: per-chunk form building extracted to `buildChunkForm(chunk,
  sig)` in `signedUploadFields.ts` — file + signed fields, nothing else.

Tests: +3 in `signedUploadFields.test.ts` (exact key set incl. `allowed_formats`; `upload_id`
never present; chunk under `file` with signed values verbatim). Gates: build ✓ · lint 0 errors
(19 pre-existing warnings) · 74 files / 511 tests ✓. Runtime-verified (DevTools MCP, seller
`/sell`, 8MB generated PNG): signature 201 without params → two Cloudinary chunk POSTs 200
(`Content-Range` 0–6MB, 6MB–8MB) → `secure_url` returned, image shown as BÌA 1/6, AI-02 F3
duplicate-check fired (200); removing the image issued `DELETE /api/upload/media` 200 (no orphan).
Backend gap (signature endpoint rejects opaque `usr_` ids) recorded in `backend-handoff.md` —
informational only; FE no longer needs the param.

### AI-02 F1–F4 — durable risk state, resumable backfill, seller duplicate advisory, moderator feedback (2026-07-17, /sweep)

Integrated the four AI-02 follow-up features from the backend handoff (2026-07-16). Scoring stays
advisory — nothing blocks submit or auto-unlists.

- **Types (`src/types/product.ts`):** `RiskScoringStatus` (`pending|ready|failed`); `RiskProduct`
  extended with `riskScoringStatus`, `riskScoredAt`, `riskScoringAttempts`, `riskNextRetryAt`,
  `riskLastError`; new `RiskBackfillParams/Result`, `RiskFeedbackDecision/Dto/Record`,
  `DuplicateCheckResult` (match has `productId: string` — `prod_...` opaque). No pHash anywhere.
- **API (`src/api/products.ts`):** `backfillRisk` (`POST /products/admin/risk/backfill`),
  `sendRiskFeedback` (`POST /products/admin/risk/:id/feedback`), `checkRiskDuplicate`
  (`POST /products/risk/duplicate-check`). All mutations — no new query keys needed.
- **F1 scoring state (`features/admin/productRisk.ts` + `ProductRiskPage.tsx`):** `riskStatusMeta`
  (pending → amber badge, failed → red, ready → null/no badge) rendered next to the score pill;
  `riskRetryDetail` one-liner (`đã thử N lần · thử lại lúc <t> · lỗi: <msg>`, error part only when
  failed) under the card header.
- **F2 resumable backfill:** header button wired to a `useMutation` + pure reducer
  (`BackfillState`/`INITIAL_BACKFILL_STATE`/`applyBackfillResult` — accumulates `enqueuedTotal`,
  carries `nextCursor` session-locally) and `backfillButtonLabel` (idle "Chấm điểm sản phẩm cũ" →
  "Đang xếp hàng..." → "Tiếp tục backfill (đã xếp N)" → disabled "Backfill hoàn tất — đã xếp N").
  Success invalidates `queryKeys.products.adminRisk`.
- **F4 moderator feedback:** rows with a `duplicate_image` flag (`hasDuplicateImageFlag`) show
  "Xác nhận trùng" (red) / "Bỏ qua cảnh báo" → `sendRiskFeedback({decision})` + toast + invalidate.
  `riskErrorMessage` gained `backfill`/`feedback` actions with Vietnamese generic fallbacks.
- **F3 seller duplicate advisory:** `useProductForm.addImages` now returns the uploaded batch
  (`Promise<ImageItem[]>`; mid-batch failure still resolves with the committed prefix — UP-01
  preserved). `CreateProductPage` (create mode only) checks the first image of each uploaded batch
  via `checkRiskDuplicate`; `duplicateCheck.ts` builds the warning view (hidden when dismissed, no
  likely match, or the flagged image was removed from the form); `DuplicateWarningHint.tsx` renders
  the amber non-blocking box with "Xem sản phẩm trùng" (`/product/:id`, new tab) and explicit
  "Tiếp tục đăng" dismiss. API errors are silent (advisory, PriceSuggestionHint pattern).
- **Tests (+17):** `productRisk.test.ts` extended (status meta, retry detail, dup-flag gate,
  backfill reducer/labels, new error actions); new `duplicateCheck.test.ts` (warning view incl.
  dismissal and stale-image cases).

Gates: `npm run build` ✓ · `npm run lint` 0 errors (19 pre-existing warnings) · `npm run test:run`
74 files / 508 tests ✓. Runtime-verified (Chrome DevTools MCP): admin (`testadmin`) — list response
carries all five new fields; backfill click → 202, button "Backfill hoàn tất — đã xếp 28" disabled,
"Đang chờ chấm điểm" badge appeared on the re-queued row. Seller (`techstore_demo`) — `/sell`
renders with the new wiring, no console errors; duplicate-check foreign URL → 403
("Cannot attach media uploaded by another user"), owned Cloudinary asset → 200
`{duplicateLikely:false, match:null}`. Feedback POST not runtime-exercised (no duplicate-flag row
in the test DB; live write denied by permission policy) — covered by unit tests + gating verified
(buttons absent on non-dup rows). No backend gaps found. Handoff entry moved to Done.

### PUBID-01–07 opaque public-ID rollout (2026-07-17)

Integrated the backend's complete public-ID migration across the frontend. Converted domains now
use opaque strings end-to-end: users `usr_`, products `prod_`, orders `ord_`, addresses `addr_`,
notifications `ntf_`, return requests `rr_`, posts `post_`, comments/replies `cmt_`, conversations
`conv_`, and messages `msg_`.

- Updated domain types and API contracts, including converted foreign keys and nullable legacy
  `OrderItem.productId` after pre-snapshot product deletion.
- Removed numeric coercion from converted route params and preserved public IDs in query keys,
  ownership comparisons, wishlist/cart/checkout state, order navigation, and notification links.
- Migrated social and chat REST/WebSocket payloads, reply threading, caches, presence, and optimistic
  message IDs to strings.
- Generalized tolerant batch fetching for string product IDs and updated fixtures/regressions to
  assert representative opaque IDs.
- Updated canonical agent guidance so future work distinguishes public string IDs from still-numeric
  catalog, SKU, cart-row, inventory-row, and GHN identifiers.

Gates: `tsc --noEmit` ✓; `npm run build` ✓; `npm run lint` 0 errors (19 pre-existing warnings);
`npm run test:run` 73 files / 491 tests ✓. Chrome DevTools runtime verification against the live API:
login exposed `usr_5W9c1VIy1h8L6pEV`; profile and product deep links rendered; order history exposed
`ord_...` links; order detail resolved a nested `prod_...` link. Browser console had no errors (two
transient Socket.IO close warnings while navigating). PUBID handoff entries moved to Done.

### Marketplace filter by seller province + `sellerProvince` on product cards (2026-07-17)

User request: filter products by the shop's city/province. FE had no location data on products —
recorded as a backend gap 2026-07-16; BE shipped same day (`sellerProvince: {id,name}|null` per row
from the seller's default GHN address, plus a `provinceId` filter param on both list endpoints —
singular repeated key, `provinceId[]` brackets are stripped by the gateway).

- `src/types/product.ts` — `Product.sellerProvince?: { id; name } | null`; `ProductParams.provinceIds?: number[]`.
- `src/api/products.ts` — `buildProductListQuery` appends `provinceId=<id>` per value (+2 tests
  locking the singular-key/no-bracket contract).
- `src/features/product/productParams.ts` — `provinceIds` in `ProductQueryState`/`buildProductParams`
  (omitted when empty; tests updated).
- `src/features/product/marketplaceUrl.ts` — `provinceIds` in `MarketplaceFilters`; URL param
  `?province=201,299` (csv, validated, omitted when empty; +1 test, round-trip covers it).
- `src/features/product/MarketplacePage.tsx` — "Tỉnh/Thành" `SelectFilter` section in the sidebar
  (reuses the category/brand component; options from `useProvinces()` — GHN master data, 1h stale);
  counts into the filter badge / clear-all / `hasActiveFilters`.
- `src/features/product/ProductCard.tsx` — renders `sellerProvince.name` with a `MapPin` icon when present.

Follow-up (same date): removed the quick add-to-cart button from `ProductCard` (Marketplace +
ProfilePage lists) — products can have SKU variations, so a list-level add can put the wrong
SKU/price in the cart. Adding now happens only on the detail page, which resolves the matched
`skuId`. Tests updated to assert the button is gone (491/491 green). Note: `ProductChip` (social
posts) still does a direct `addToCart` without SKU — same bug class, not yet requested/changed.

Gates: `npm run build` ✓, eslint 0 on touched files, `npm run test:run` 490/490 ✓ (incl. new cases).
Runtime-verified via Chrome DevTools MCP: sidebar renders full GHN province list; clicking "Hà Nội" →
URL `?province=201`, request `...&provinceId=201`, 28→12 products all showing "Hà Nội"; multi-select →
`province=201,202` with repeated `provinceId` keys; reload restores both selections. Handoff entry moved
to Done in `../.agent-local/frontend-handoff.md` with the integration note.

### URL-driven pagination + filters + fetch overlay across all 9 paginated pages (2026-07-16)

User report: clicking pagination gave no loading feedback, and neither page number nor filters were
reflected in the URL (no `?page=2`, no shareable/back-button-friendly filter state). Scope confirmed
via AskUserQuestion: **all paginated pages**, loading style = dim old grid + centered spinner.

**Shared primitives (new):**

- `src/hooks/ui/usePageParam.ts` (+ test 6) — `[page, setPage]` backed by `useSearchParams`;
  `parsePageParam` falls back to 1 on junk; `setPage(1)` *deletes* the param (clean URLs, no `?page=1`).
  Supports custom param names (`usePageParam('postsPage')`).
- `src/hooks/ui/useFilterParam.ts` (+ test 6) — `[value, setValue]` for a string-union filter with an
  allow-list + fallback; setting the default value deletes the param, and **every set also deletes
  `page`** so a filter change + page reset land in ONE history entry / one request.
- `src/components/shared/FetchingOverlay.tsx` — wraps a list/grid; when `fetching` (pass
  `isFetching && !isLoading`) it dims children (`opacity-40 pointer-events-none`) and centers a
  `Loader2` spinner. Layout classes go on an inner div, not the overlay.
- `src/features/product/marketplaceUrl.ts` (+ test 13) — full Marketplace URL codec:
  `parseMarketplaceFilters` / `serializeMarketplaceFilters` (params `search/category/brand/minPrice/
  maxPrice/sort/page`, defaults omitted, csv id lists validated, inverted price range → no filter) +
  `settledFilterPatch(live, debounced, committed)` guard: commit a debounced field to the URL only when
  `debounced === live` (user stopped typing) AND `debounced !== committed` (actually changed) — stale
  debounced values can never clobber external URL changes (header search, back/forward).

**MarketplacePage rewritten:** the URL is the single source of truth (`parseMarketplaceFilters(searchParams)`);
live input state exists only for search text + price fields, down-synced from the URL during render
(guarded inequality checks) and up-committed via a debounced effect with `{ replace: true }` (no history
spam while typing). Clicks (sort/category/brand/page) push normally so back/forward steps through states.
Any filter change resets `page` to 1 in the same URL update. The old `useResetOnChange(searchParam, …)`
header-search sync block is gone — obsolete once the URL is the state.

**Wired pages (9):** MarketplacePage (full filters), WishlistPage (`page`), NotificationsPage
(`page` + `tab=all|unread`), ReturnRequestsPage (`page`), SellerReturnRequestsPage (`page` +
`status`, default `pending_review`), SellerOrdersPage (`page` + `status`, default `all`),
ProductRiskPage (`page` + `minScore=1|40|70|0`), ReportedPostsPage (`page` + `status`, +
`keepPreviousData` added to its inline query), ProfilePage (`postsPage` + `productsPage`; the
`useResetOnChange(userId, …)` page reset was **removed** — `<Link>` navigation to another profile
drops the query string, so pagination resets naturally, and `setSearchParams` during render would be
illegal navigation anyway; `keepPreviousData` added to the posts query). `keepPreviousData` also added
to `useMyReturnRequests` / `useReturnRequestQueue` / `useSellerOrders` / notifications list query, with
`isFetching` exposed where missing. All lists wrapped in `<FetchingOverlay fetching={isFetching && !isLoading}>`.

Gates: `npm run build` ✓ · `lint` 0 err / 19 pre-existing warn · `test:run` **73 files / 487 tests** ✓.
**Runtime-verified (Chrome DevTools MCP, techstore_demo):** marketplace click page 2 → URL
`/marketplace?page=2`; sort click → `?sort=price_asc` (page dropped); brand click → `?brand=2&sort=price_asc`;
reload restores state from URL (sort button active, grid filtered 12→4); browser Back → `?sort=price_asc`
with full grid back; notifications tab → `?tab=unread`; seller orders tab → `/sell/orders?status=completed`.
Zero console errors/warnings. Pure FE change (no backend gap).

### Wishlist membership fetch — fix 400 on `getWishlist(limit=200)`, page under BE's 100 cap (2026-07-16, /sweep)

`useWishlistIds()` (drives the "already favorited" heart state on every product card + detail) fetched
the membership set with a single `getWishlist({ page: 1, limit: 200 })`. The backend rejects any
`limit > 100` with `400 Bad Request` (`"limit must not be greater than 100"`), so this request **always
400'd** → the membership `Set` was always empty → hearts never rendered filled, even for favorited
products. (Surfaced during the /sweep runtime pass: `GET /api/products/wishlist?page=1&limit=200` red.)

Fix keeps full coverage instead of silently capping (which would drop favorites past item 100 from the
Set): new pure helper `collectWishlistIds(fetchPage)` in `wishlistCache.ts` pages through
`/products/wishlist` at `WISHLIST_ID_PAGE_SIZE = 100` (= BE max), accumulating ids until the server
reports `!hasNext`, bounded by `MAX_WISHLIST_ID_PAGES = 10` so a pathological wishlist can't fan out
unboundedly. `useWishlistIds` now calls it via `collectWishlistIds((page, limit) => api.products.getWishlist({ page, limit }))`;
the old `WISHLIST_ID_LIMIT = 200` constant is gone. Colocated tests +5 (caps page size ≤100, single-page
stop, multi-page merge, string-bigint id coercion across pages, page-bound). Runtime-verified via Chrome
DevTools MCP: request is now `wishlist?page=1&limit=100 → 200`. Pure FE fix (no backend gap). Gates:
build ✓, lint 0 err / 19 warn, test:run green.

### `useResetOnChange` — kill pagination `setState`-in-`useEffect` on ProfilePage + MarketplacePage (2026-07-16, /sweep)

Both `ProfilePage` and `MarketplacePage` reset pagination to page 1 when a route/URL value changed
by calling `setState` inside a `useEffect` — the React-Compiler-flagged anti-pattern
(`react-hooks/set-state-in-effect`). The effect fires *after* the render commits, so React painted a
frame and the paginated `useQuery` kicked off a fetch with the **stale** page before the reset landed,
then re-rendered and refetched — an avoidable cascading render + wasted request. `MarketplacePage` also
tripped "cannot access `setPage`/`page` before declaration" because the effect referenced state
declared below it.

- **Shared hook `src/hooks/ui/useResetOnChange.ts` (test 5):** the React-recommended "adjusting state
  during render" escape hatch, extracted since the pattern lived in 2+ feature folders (DRY rule).
  Tracks the previous key in state; when `!Object.is(key, prevKey)` it updates the stored key and runs
  the caller's `reset()` synchronously during render, so React discards the in-progress render and
  restarts with the reset already applied — no stale frame/refetch escapes, and it never fires on the
  initial render. Colocated `useResetOnChange.test.ts`: no-run-on-mount, run-once-on-change,
  no-run-when-key-stable, run-again-per-distinct-change, and `NaN→NaN` treated as unchanged.
- **`ProfilePage`:** dropped the `useEffect(() => { setPostsPageNum(1); setProductsPageNum(1); }, [userId])`
  for `useResetOnChange(userId, …)`; removed the now-unused `useEffect` import.
- **`MarketplacePage`:** derived `searchParam = searchParams.get('search') ?? ''`, moved all `useState`
  declarations above the reset, and replaced the URL-sync effect with
  `useResetOnChange(searchParam, () => { setSearch(searchParam); setPage(1); })` — syncs the search box
  to the URL and jumps to page 1 in one render. Removed the `useEffect` import.
- **Gates:** `npm run build` ✓ · `npm run lint` 0 errors, **19 warnings (was 22** — the 3 targeted
  warnings gone, no new ones from the hook) · `npm run test:run` 70 files / 457 tests ✓.
- **Runtime-verified (Chrome DevTools MCP, techstore_demo):** on `/marketplace` (28 products, 3 pages)
  clicked page 2 → `GET /products/with-inventory/all?page=2…`; header search "sony" → in-place nav to
  `/marketplace?search=sony` refetched **`page=1&…&search=sony`** (not a stale `page=2`), the 2 results
  rendered (no empty state), and the sidebar/header search inputs synced to "sony". The only console
  error was the pre-existing unrelated `GET /products/wishlist` 400 (F6 caveat).

### Invoice PDF — seller + admin download access (2026-07-15, /sweep)

Backend shipped a production-ready invoice PDF (real Vietnamese font + full money breakdown) and
**widened access** on `GET /api/order/:id/invoice` from buyer-only to **buyer OR seller OR admin**
(handoff "PDF invoice is now production-ready", 2026-07-15). FE previously exposed the download only
on the buyer's `OrderDetailPage`.

- **Shared `features/order/InvoiceDownloadButton.tsx`:** one component for all three surfaces (buyer,
  seller, admin), replacing the inline buyer-only button. Owns its own `useOrderInvoice` mutation so
  each button tracks independent pending/error state. Two variants: full (label + `Đang tải…` pending
  text + inline Vietnamese error line) and `iconOnly` (compact `<IconButton>` with `FileDown`, error
  surfaced via red border + `title`). No new mitigation needed — the download was already blob-based
  (`api.orders.getInvoice` → `res.blob()`), so nothing to drop; this change only widens where the
  button appears + hardens error UX.
- **Pure helper `features/order/orderInvoice.ts` (test 6):** `invoiceFileName(orderId)` →
  `invoice-<id>.pdf`, and `invoiceErrorMessage(unknown)` narrows `statusCode` and maps
  400/401/403/404 → Vietnamese messages (+ generic fallback). `useOrderInvoice` now uses
  `invoiceFileName` for the download attribute and no longer swallows the error in `onError`, so
  consumers can render it.
- **Wiring:** buyer `OrderDetailPage` (full, in the actions row) · seller `SellerOrdersPage` (full,
  right-aligned in the expanded order card) · admin `AdminPage` orders table (new "Hóa đơn" column,
  `iconOnly` per row; `colSpan` bumped 5→6).
- build / lint (0 err, 22 pre-existing warn) / test:run green.
- **Runtime-verified (Chrome DevTools MCP):** buyer full-button → `GET /api/order/118/invoice` 200;
  admin (non-buyer) download of order #119 → `200 application/pdf`, 20843 bytes, `%PDF-` header;
  non-party user → 403. (Note: the MCP `click` tool intermittently failed to land on the compact
  admin icon-button; a direct DOM click confirmed the same button fires the request — an MCP
  interaction artifact, not a code defect.)

### UX — Checkout auto shipping-fee + OrderDetail price breakdown (2026-07-14)

Two buyer-reported gaps: checkout only showed the shipping fee after clicking a "Tính phí"
button, and the order-detail summary showed only the product line + final total (no
subtotal / shipping / discount), reading as "incomplete".

- **Checkout auto-calc (`CheckoutPage.tsx`):** replaced the manual `handleCalcShipping`
  button with an effect keyed `[selectedAddressId, basketSignature, productsReady]` that
  recomputes the GHN fee preview whenever the chosen address, basket, or product-load state
  changes — guarded so it only fires with a selected address + ready products + non-empty
  basket. `AddressBookPicker` auto-selects the default address on mount, so the fee shows on
  checkout load with no user action. The old button is gone; the fee cell now shows a passive
  hint ("Đang tính…" / "Chọn địa chỉ giao hàng"), and GHN failures still degrade to "Tính khi
  giao hàng" (never block checkout). Dropped the now-unused `clearErrors` from `useForm`.
- **OrderDetail breakdown (`OrderDetailPage.tsx`):** the summary footer now renders Tạm tính /
  Phí vận chuyển (Miễn phí when 0) / Giảm giá (+ `voucherCode` when present) / Tổng cộng.
- **Pure helper (`orderSummary.ts` → `orderPriceBreakdown`):** initially derived `shippingFee =
  max(0, total − subtotal + discount)` (clamped, `Number()`-coerced) because the order API
  returned only the net `total`; backend gap was recorded in `../.agent-local/backend-handoff.md`.
- **Backend follow-up integrated (2026-07-14):** BE shipped explicit `subtotal: number` and a
  non-null `shippingFee: number` on every order read path + single-seller `POST /api/order`
  (gateway-only, additive, `total = subtotal − discountAmount + shippingFee`). FE now reads them
  directly: `Order` type gained optional `subtotal`/`shippingFee`, and `orderPriceBreakdown`
  prefers the BE values, keeping the `total − subtotal + discount` derivation only as a
  fallback for legacy/multi-seller responses that predate the fields. Tests +3 (BE values used,
  BE `shippingFee` wins over derivation, decimal-string coercion) = 14 total.
- build / lint (0 err, 22 pre-existing warn) / test:run (68 files, 446) green.
- **Runtime-verified (Chrome DevTools MCP, user 17):** order #115 → Tạm tính 5.800đ / Phí vận
  chuyển Miễn phí (total==subtotal → clamp 0) / Tổng cộng 5.800đ; `/checkout` with Sony
  WF-1000XM5 (299đ) and the default address auto-selected → Phí vận chuyển 46.207đ + Tổng thanh
  toán 46.506đ shown automatically, no click.
- **Sweep close-out (2026-07-18):** moved the stale backend handoff entry from Open to Done
  after reconfirming the shipped integration. Gates remain green: build ✓, lint 0 errors
  (19 tracked warnings), test:run 511/511 ✓. No new code or backend gap.

### UP-06 — Block unauthenticated uploads instead of stamping owner `0` (2026-07-14, /sweep)

`CreatePostModal` called `uploadImage/uploadVideo(file, currentUser?.id ?? 0, …)`, so an
upload attempted without a logged-in user would stamp the Cloudinary `public_id` with a
`0_…` owner prefix — the wrong owner, which the backend rejects and which a real user can
never clean up. Replaced the `?? 0` fallback with an explicit login guard.

- **Pure helper (`src/lib/http/uploadOwner.ts`, 4 tests):** `resolveUploadOwner(currentUser)`
  returns `{ ownerId }` when a user is present and `{ error: UPLOAD_LOGIN_REQUIRED }` (VN
  message) otherwise. Guards on `id == null` (not truthiness) so a legitimate id `0` is
  still accepted while `null`/`undefined` are rejected.
- **`CreatePostModal.tsx`:** both `uploadImageFiles` (image batch) and `handleVideoSelect`
  guard at the top — on `error` they set the upload error state, reset the file input, and
  return before any network call; on success they pass the resolved `owner.ownerId` to
  `uploadImage`/`uploadVideo`.
- Runtime E2E still owed — the modal is only reachable while authenticated, so the unauth
  path can't be forced through the normal UI.

### STY debt pass 2 — order pages + checkout retoken to `tb-*`/semantic aliases (2026-07-14, /sweep)

Second styling pass (pass 1 hex→token closed 2026-07-11): removed raw Tailwind palette
classes from the order and checkout surfaces, all className-only (no logic change).

- **Order (`OrderDetailPage`):** active-step / progress gradients
  `bg-gradient-to-br from-amber-400 to-orange-500` → `bg-tb-gradient`, `bg-gradient-to-r …`
  → `bg-tb-gradient-90`; canceled banner + return button `border-red-500/30 bg-red-500/5
  text-red-300 hover:bg-red-500/10` → `border-tb-red/30 bg-tb-red/5 text-accent-red
  hover:bg-tb-red/10`; `text-white` → `text-ink-pri`.
- **Order lists (`OrderHistoryPage`, `SellerOrdersPage`, `ReturnRequestsPage`,
  `SellerReturnRequestsPage`):** error banners `bg-red-950/30` → `bg-tb-red/10`; reject
  buttons retoken to `tb-red`/`accent-red`; search-input `focus:border-amber-400/50` →
  `focus:border-tb-amber/50`, order-card `hover:border-amber-400/30` →
  `hover:border-tb-amber/30`; `text-white` → `text-ink-pri`. `ShippingAddressBlock`
  `text-white` → `text-ink-pri`.
- **`CheckoutPage`:** footer `text-gray-500` → `text-ink-muted`, `text-gray-400` →
  `text-ink-sec`; order/stock error banners `bg-red-950/30|20` → `bg-tb-red/10`; voucher
  input `focus:border-amber-400/50` → `focus:border-tb-amber/50`; headings `text-white` →
  `text-ink-pri`.
- Used literal-hex `tb-*` tokens wherever alpha is needed (`tb-red/10`, `tb-amber/50`)
  because opacity modifiers no-op on var()-based aliases (see `tokens.md`).
- Runtime-verified (Chrome DevTools MCP, techstore_demo): `/orders` list + `/checkout`
  (COD, 1 item) render cleanly with correct contrast and no layout shift.
- **Deferred to pass 3:** `PaymentResultPage` `bg-green-500/15` — there is no `tb-green`
  token (`accent-green` is alias-only, no alpha), so a clean retoken needs a new config
  token first (a design decision, not opened here).

### AI-01 — Catalog price suggestion for the seller product form (2026-07-14, /sweep)

Backend shipped an advisory catalog price-statistics endpoint for authenticated sellers
(`GET /api/products/price-suggestion?categoryId=&brandId?=&condition=`). It returns the
median plus P25/P75/min/max (integer VND) for comparable listings and never validates or
changes the submitted product price. The FE surfaces it as an optional, editable hint in
the create/edit product form — sellers keep full control of the price.

- **Types (`src/types/product.ts`):** `PriceSuggestion`
  (`sufficientData: boolean`, `sampleSize: number`, and `median/p25/p75/min/max: number | null`)
  and `PriceSuggestionParams` (`categoryId: number`, optional `brandId?: number`,
  `condition?: ProductCondition`).
- **API (`src/api/products.ts`):** `getPriceSuggestion(params)` → `PriceSuggestion`
  (`GET /products/price-suggestion`, query built with the existing `toQuery`).
- **Query keys:** `products.priceSuggestion(params)` — keyed on the full params object so
  category/brand/condition changes cache independently.
- **Pure helper (`src/features/product/product-form/priceSuggestion.ts`, 8 tests):**
  `buildPriceSuggestionParams(categoryIds, brandId, condition)` returns `null` when no
  category is selected (query stays disabled), otherwise anchors on the first selected
  category and includes `brandId` only when present. `priceSuggestionView(data)` returns
  `null` while loading, when `sufficientData` is false, or on a degenerate response missing
  `median/p25/p75`; otherwise it formats the P25–P75 range + median as VND (`formatVnd`) and
  carries the raw median for one-tap apply.
- **Hook (`src/features/product/product-form/usePriceSuggestion.ts`):** memoizes params on
  primitives (first category id / brand id / condition) so the debounce timer only re-arms on
  a real change, debounces 400ms via `useDebouncedValue`, runs `useQuery` only when a category
  exists (`enabled`), with a 5-minute `staleTime`. Returns the view model or `null` — failures
  stay silent since the hint is advisory.
- **Widget (`src/features/product/product-form/PriceSuggestionHint.tsx`):** renders nothing
  until there is a suggestion; otherwise an `accent-amber` advisory box (`TrendingUp` icon,
  "Giá phổ biến cùng danh mục: {range} (dựa trên {n} sản phẩm)") with a "Dùng {median}" apply
  button.
- **Wiring (`CreateProductPage.tsx`):** the hint sits at the top of Section 03 above the price
  field; apply sets `singlePrice` (single-price product) or fills every variation row's price
  when `hasVariations`.

Gates: `npm run build` ✓ · `npm run lint` ✓ (0 errors, 22 pre-existing warnings) ·
`npm run test:run` ✓ (67 files, 435 tests). **Runtime E2E verified (Chrome DevTools MCP,
techstore_demo):** selecting "Audio" (category 17) fired
`GET /api/products/price-suggestion?categoryId=17&condition=new` → 200
`{sufficientData:true, sampleSize:7, median:299, p25:129, p75:1500, min:39, max:3500}`; the
hint rendered "129 đ – 1.500 đ (dựa trên 7 sản phẩm)" with a "Dùng 299 đ" button, and clicking
it populated the price field with 299. No backend gap — the contract matched exactly.

### AI-02 — Admin product risk / duplicate-detection queue (2026-07-13, /sweep)

Backend shipped advisory post-commit risk scoring for products (cross-seller
perceptual-image similarity, unusually low category pricing, near-duplicate names) behind
two admin-only routes. Scores never block seller flows or auto-unlist products — the FE
queue is a triage aid only.

- **Types (`src/types/product.ts`):** `ProductRiskFlag` discriminated union
  (`duplicate_image` / `price_anomaly` / `similar_name`), `RiskProduct extends Product`
  (`riskScore: number`, `riskFlags: ProductRiskFlag[]` — clean/unscored rows are
  backend-normalized to `0`/`[]`, see runtime-verify note), `ProductRescoreResult`,
  `ProductRiskParams`.
- **API (`src/api/products.ts`):** `getAdminRisk({minScore,page,limit})` →
  `PaginatedResponse<RiskProduct>` (`GET /products/admin/risk`; `toQuery` keeps
  `minScore: 0`, which includes clean/unscored products) and `rescoreRisk(id)`
  (`POST /products/admin/risk/:id/rescore`).
- **Query keys:** `products.adminRisk` (list-level prefix) +
  `products.adminRiskList(minScore, page)` — rescore invalidates the prefix so every
  filter/page combination refetches.
- **Pure helper (`src/features/admin/productRisk.ts`, 8 tests):** `riskScoreMeta`
  (tiers ≥70 red / ≥40 amber / ≥1 neutral / 0 green), `riskFlagDescription` (Vietnamese
  human-readable reason per flag, prices via `formatVnd`, ratios/similarity as percent),
  `riskFlagMatchedProductId` (link target for image/name matches), `riskErrorMessage`
  (404 → product gone, 403 → permission, server message passthrough, per-action generic).
- **Page (`src/features/admin/ProductRiskPage.tsx`):** reuses the F5 moderation layout —
  minScore filter pills (Có cờ 1 / Từ trung bình 40 / Rủi ro cao 70 / Tất cả 0), card per
  product (ProductThumb, name → `/product/:id`, seller id/name, `formatPrice`, score badge,
  inactive marker), flag list with matched-product links, actions "Xem sản phẩm" +
  "Chấm điểm lại" (spinner while `isPending`, success toast with the new score).
  `placeholderData: keepPreviousData` per the paginated-query convention.
- **Wiring:** route `/admin/product-risk` (admin-guarded, lazy) in `router.tsx`; LeftRail
  admin link "Rủi ro sản phẩm" (`ShieldAlert`); route-table row in `.ai/context/structure.md`.
- **Gates:** `build` ✓ · `lint` 0 errors (22 pre-existing warnings) · `test:run`
  66 files / 428 tests ✓.
- **Runtime E2E verified (2026-07-13, Chrome DevTools MCP, `testadmin`):** started nodeA+nodeB,
  logged in, walked `/admin/product-risk` — `GET .../risk?minScore=1&page=1&limit=20` → 200
  (empty state, dev DB has no flagged products), filter "Tất cả sản phẩm" →
  `minScore=0` refetch 200 renders 20 cards + pagination (2 pages), rescore on SP #38 →
  `POST .../risk/38/rescore` 200 → prefix invalidation refetch 200. LeftRail link + active
  state, score badges, product links all render correctly (screenshot taken).
- **Real bug found during verification:** unscored products (visible at `minScore=0`) came
  back with `riskScore: null` / `riskFlags: null` — the handoff contract says `number`/`[]` —
  crashing the card on `riskFlags.length`. FE shipped a temporary `normalizeRiskFields`
  mitigation + nullable types and filed the gap in `../.agent-local/backend-handoff.md`.
  **BE fixed it the same day** (response-boundary normalization to `0`/`[]`, no migration
  needed), so the mitigation was dropped again: non-null types restored, helper + its 2
  tests removed, `RiskProductCard` reads the fields directly. Verified live post-fix: curl
  probe shows `{riskScore:0,riskFlags:[]}` for clean rows and `/admin/product-risk` at
  minScore=0 renders 20 cards. Gap CLOSED (both handoff files updated).
- Handoff entry moved to **Done** in `../.agent-local/frontend-handoff.md`. (A pre-submit
  seller duplicate warning is explicitly later scope backend-side.)

### F7 — `order_created` notification display + deep-link (2026-07-13, /sweep)

Backend added the `order_created` notification type for buyers immediately after order
placement. The notification row shape and socket event are unchanged; only the additive
type value is new. Order-lifecycle email delivery is server-side and required no FE work.

- **`src/features/notifications/notificationDisplay.ts`:** added a dedicated
  `order_created` display config using the existing `ShoppingBag` treatment, Vietnamese
  title/body, and included the type in the order notification set so numeric or bigint-
  string `orderId` values navigate to `/order/:id`.
- **`notificationDisplay.test.ts`:** covers title/body generation, non-default icon
  mapping, and the order-detail deep-link for the new type.
- **Gates:** `build` ✓ · `lint` 0 errors (22 pre-existing warnings) · `test:run`
  65 files / 419 tests ✓.
- **Runtime-verified (Chrome DevTools MCP, live gateway, buyer user 17):** notification
  id 89 rendered “Đặt hàng thành công” / “Đơn hàng #118 đã được đặt thành công.”; clicking
  it opened the live order detail at `/order/118`.
- Handoff entry moved to **Done** in `../.agent-local/frontend-handoff.md`. No backend
  gap surfaced; the contract matched the handoff.

## Cleanup / hardening

### SEC-L3 — 409 duplicate brand/category proposals mapped to a friendly message (2026-07-12, /sweep)

Backend handoff SEC-L3 (2026-07-12): `POST /api/products/brands` and
`POST /api/products/categories` now return `409` when the proposed name case-insensitively
matches an existing **active or pending** row (after trimming). Previously the FE showed the
generic "Không thể tạo … Thử lại sau." for every failure, which is misleading for conflicts —
retrying can never succeed.

- **`src/features/product/product-form/proposalErrors.ts` (new pure helper, 4 tests):**
  `proposalErrorMessage(kind, error)` narrows `unknown` → `ApiError` (checks `statusCode`
  with `status` fallback) and maps `409` → "Thương hiệu/Danh mục này đã tồn tại hoặc đang
  chờ duyệt."; every other error keeps the pre-existing generic retry message per kind.
- **`src/features/product/product-form/BasicInfoSection.tsx`:** both proposal catch blocks
  (brand combobox `handleCreateBrand`, category add `handleCreateCategory`) changed from a
  bare `catch` + hardcoded string to `catch (error: unknown)` + the helper. The client-side
  exact-match check stays as UX only — it hides the add button for *active* duplicates, so
  the live 409 path chiefly covers duplicates of **pending** rows, which are invisible to
  the FE brand/category lists.
- **Gates:** `build` ✓ · `lint` 0 errors (22 pre-existing warnings) · `test:run`
  65 files / 418 tests ✓.
- **Runtime-verified (Chrome DevTools MCP, live gateway, shop user `test1`):** `/sell` →
  brand combobox → propose fresh name "SweepDupL3 1783" → `POST /api/products/brands` `201`
  (pending); reload `/sell` (pending rows absent from `GET /products/brands`, add button
  reappears) → propose the same name → `POST` `409` → UI renders "Thương hiệu này đã tồn
  tại hoặc đang chờ duyệt." in the combobox error slot. Category path shares the same
  helper + identical catch shape (covered by unit tests).
- Handoff entry moved to **Done** in `../.agent-local/frontend-handoff.md`. No backend gap —
  contract behaved exactly as documented.

### SEC-M8 — signed `allowed_formats` echoed to Cloudinary (2026-07-12, /sweep)

Backend handoff SEC-M8 (2026-07-11): `POST /api/upload/signature` now returns
`allowed_formats` and includes it in the SHA1 signature params. Because the field is
signed, the FE MUST send it verbatim in the direct Cloudinary upload FormData — omitting
it makes Cloudinary reject every upload with "Invalid Signature". This was therefore a
breaking contract change blocking all uploads (post image/video, product image, avatar).

- **`src/types/upload.ts`**: `UploadSignature` gains `allowed_formats?: string`. Kept
  optional so the FE stays compatible with a backend that doesn't sign it (send-when-
  present mirrors the signature exactly in both directions).
- **`src/lib/http/signedUploadFields.ts` (new pure helper, 4 tests):**
  `signedUploadFields(sig)` returns the signed FormData param set — `signature`,
  `timestamp` (stringified), `api_key`, `folder`, `public_id`, plus `allowed_formats`
  only when non-empty. Extracted so the "FormData must mirror the signed params exactly"
  invariant is unit-testable without touching `fetch`.
- **`src/lib/http/cloudinary.ts`**: `uploadChunked` builds its per-chunk FormData from
  the helper (fields repeat on every chunk, so chunked >6MB uploads are covered too).
  All 4 upload entry points (`uploadImage`/`uploadVideo`/`uploadProductImage`/
  `uploadAvatar`) share this path — no per-consumer change needed.
- **Gates:** `build` ✓ · `lint` 0 errors (22 pre-existing warnings) · `test:run`
  64 files / 414 tests ✓.
- **Runtime-verified (Chrome DevTools MCP, live gateway + real Cloudinary):** login
  user 17 → create-post modal → upload `public/imag1.png` → signature `201` with
  `allowed_formats:"jpg,png,webp,mp4"` → Cloudinary POST `200` with `secure_url`
  (success proves the signed field round-tripped — a mismatch would 400) → close modal
  → orphan cleanup `DELETE /upload/media` `200`. Console clean (only pre-existing
  legacy-image 404 + shadcn Dialog description warning).
- Handoff entry moved to **Done** in `../.agent-local/frontend-handoff.md`. No backend
  gap — contract behaved exactly as documented.

### STY debt pass 1 — hardcoded hex → tokens (2026-07-11, /sweep)

Closed all hardcoded-hex styling violations outside the justified recharts SVG file
(`AnalyticsDashboard.tsx`). Scope = 5 files, className/icon-prop only, no logic:

- **`TextField.tsx` (shared) — full retoken.** `bg-[#1C1C1E]`→`bg-canvas-elevated`,
  `border-[#27272A]`→`border-bdr`, `border-[#EF4444]`→`border-accent-red`,
  `text-[#A1A1AA]`→`text-ink-sec`, `text-[#52525B]`/placeholder→`text-ink-muted`,
  `text-white`→`text-ink-pri`; focus rgba shadow → `focus-within:ring-4 ring-tb-amber/10`
  + `border-tb-amber/50` (error: `ring-tb-red/10`); exact-scale arbitrary values →
  scale (`h-[44px]`→`h-11`, `rounded-[10px]`→`rounded-tb-input`, `gap-[6px]`→`gap-1.5`,
  `pl-[12px]`→`pl-3`, `py-[12px] px-[14px]`→`py-3 px-3.5`, `pr-[10px]`→`pr-2.5`,
  `text-[14px]`→`text-sm`, `font-[500]`→`font-medium`, `flex-shrink-0`→`shrink-0`).
  Non-exact arbitrary values (`text-[11px]`, `leading-[1.4]`, `tracking-[0.04em]`,
  `duration-[120ms]`) kept — no scale equivalent, changing them alters design.
- **`LoginPage.tsx`**: `bg-[#0B0B0E]`→`bg-tb-base` (the long-recorded Known Violation).
- **`ChatThread.tsx`**: send `<Send color="#FFFFFF">` → inherits button's `text-ink-pri`
  (+`shrink-0`).
- **`PostDetailPage.tsx`**: stats heart `color="#fff"`→`text-ink-pri shrink-0`; container
  `w-4 h-4 inline-flex items-center justify-center`→`size-4 grid place-items-center`
  (same fix as the PostCard STY-addendum).
- **`CheckoutPage.tsx`**: payment-method icon `color={active ? "#F59E0B" : "#A1A1AA"}`
  → `cn('shrink-0', active ? 'text-accent-amber' : 'text-ink-sec')`; radio
  `bg-amber-400/[0.08] border-amber-400/50`→`bg-tb-amber/[0.08] border-tb-amber/50`;
  `w-5 h-5`→`size-5` grid, `w-[10px] h-[10px]`→`size-2.5`, `text-white`→`text-ink-pri`.

**Pitfall found + documented in `tokens.md`:** opacity modifiers (`/50`, `/[0.08]`) are
silent no-ops on the var()-based semantic aliases (no `<alpha-value>` in
`tailwind.config.js`) — first attempt used `ring-accent-amber/10` and the focus ring
fell back to Tailwind's default blue at runtime. Rule: alpha modifier ⇒ literal-hex
token (`tb-*`, `accent-violet`, `accent-blue`).

Gates: `build` ✓ · `lint` 0 errors (22 warnings unchanged) · `test:run` 63 files / 410 ✓.
No unit test added (className-only, no logic — same precedent as STY-addendum/CLS pass).
Runtime-verified (Chrome DevTools MCP, live FE `:5173`): login page computed styles —
field box `rgb(28,28,30)` / border `rgb(39,39,42)` / radius 10px / height 44px, label
`rgb(161,161,170)`, aside `rgb(9,9,11)`; focus-within border `rgba(245,158,11,0.5)` +
ring `rgba(245,158,11,0.1) 0 0 0 4px` (caught the alias-alpha no-op live before fix).
Remaining STY debt (pass 2, recorded in snapshot): raw Tailwind palette in ~20 files +
scattered non-exact arbitrary sizing.

### Known-issue small batch: ApiErrorState router nav + Header search a11y + UP-07 silent image slice (2026-07-11, /sweep 3)

Three small open items from the whole-web audit / upload audit closed in one batch:

- **ApiErrorState full-reload navigation (known issue, TOP FIX).** `ApiErrorState`
  (`src/components/shared/ApiErrorState.tsx`) defined a local `navigate = window.location.href`
  shim — every "Trang chủ" / "Đăng nhập lại" / fallback-back click full-reloaded the SPA,
  violating the "never window.location" hard rule. Now uses `useNavigate()` (component only
  renders under the router — sole consumer is `router.tsx` catch-all 404 route); back button
  uses `navigate(-1)` with the same history-length guard. Test `ApiErrorState.test.tsx` (3:
  Trang chủ → `/` via MemoryRouter without reload, 401 primary → `/login`, unmapped status
  renders nothing).
- **Header search submit button a11y name (known issue).** Icon-only submit `<button>` in
  `Header.tsx` gained `aria-label="Tìm kiếm"`. Test `Header.test.tsx` (2: accessible name
  exists; submit navigates to `/marketplace?search=…` via router) — cart/role/chat-presence/
  NotificationBell/ProfileMenu stubbed via `vi.mock` (socket-backed, irrelevant to the form).
- **UP-07 · over-`MAX_IMAGES` batch sliced silently (CreatePostModal).** New shared pure helper
  `capImageBatch(currentCount, files, max)` (`src/lib/http/uploadValidation.ts`) = existing
  `capFilesToLimit` + user-facing notice (`null` when all fit / "Tối đa N ảnh" when nothing fits
  / "Chỉ thêm được X/Y ảnh — tối đa N ảnh" on partial drop). Wired into
  `CreatePostModal.uploadImageFiles` (previously: silent `slice` + silent return at cap) and
  `useProductForm.addImages` (previously: partial-drop message only set in `finally`; now the
  notice rides the error slot from upload start, `finally` simplified to preserve it — a real
  upload error from `catch` still wins). Tests +4 (`uploadValidation.test.ts` `capImageBatch`
  describe).

Gates: `build` ✓ · `lint` 0 errors (22 warnings unchanged) · `test:run` 63 files / 410 ✓ (+9).
Runtime verify (Chrome DevTools MCP, user 17): all 3 verified live. (1) ApiErrorState — on
`/this/route/does-not-exist`, set `window.__spaMarker='alive'`, clicked "TRANG CHỦ" →
`{path:'/', marker:'alive'}` (marker survived ⇒ SPA nav, no full reload). (2) Header — a11y
tree reports `button "Tìm kiếm"`. (3) UP-07 — synthetic `DataTransfer` with 5 files on the
image input → notice "Chỉ thêm được 4/5 ảnh — tối đa 4 ảnh", counter 4/4, add button
disabled; closing unpublished → 4× `DELETE /upload/media` 200 (orphan cleanup intact).

### Forgot password / reset password via emailed verification code (2026-07-11, /sweep)

Backend handoff 2026-07-11: new public endpoints `POST /api/user/forgot-password` (`{ email }` →
always neutral `201`, anti-enumeration; 60s server-side resend cooldown; rate limit 5/60s) and
`POST /api/user/reset-password` (`{ email, code: 6 digits, newPassword ≥ 6 }` → `201 { success }`;
ALL verification failures → same `400 "Invalid or expired verification code"`; code valid 10 min,
single-use, max 5 wrong attempts; reset does NOT log in). FE ships the full flow:

- **Types/API:** `ForgotPasswordDto`/`ResetPasswordDto` (`src/types/auth.ts`);
  `authApi.forgotPassword`/`resetPassword` (`src/api/auth.ts`).
- **Schemas:** `forgotEmailSchema` + `resetPasswordSchema` (code `^\d{6}$`, newPassword min 6,
  confirmPassword refine) in `auth.schema.ts`.
- **Pure helpers:** `src/features/auth/forgotPassword.ts` — `forgotPasswordErrorMessage` /
  `resetPasswordErrorMessage` (429 → generic VN rate-limit since `request()` drops `retryAfter`;
  reset 400 → single "Mã xác nhận không đúng hoặc đã hết hạn…" per contract) +
  `resendCooldownRemaining` (`RESEND_COOLDOWN_SECONDS = 60`, ceil, clamped).
- **UI:** `ForgotPasswordForm.tsx` — two-step in-page flow (email → code + new password), 1s
  interval countdown on the resend button mirroring the server cooldown, neutral step-2 copy,
  code input `inputMode="numeric" maxLength={6} autoComplete="one-time-code"`. **Both step
  `<form>`s carry `key=`** — without a remount React reuses the input DOM node at the same tree
  position and the typed email leaks into the code field (caught by RTL, confirmed live-fixed).
- **DRY:** extracted `PasswordField.tsx` (labeled password input + Eye toggle, was inline
  `RegisterPasswordField` in LoginPage) — shared by register + reset forms; gained
  `autoComplete="new-password"` (Chrome DevTools verbose hint).
- **LoginPage:** `showRegister` boolean → `view: 'login' | 'register' | 'forgot'`; "Quên mật
  khẩu?" enabled (was disabled "sắp ra mắt"); on reset success → back to the login form with a
  green `accent-green` banner "Đặt lại mật khẩu thành công…" (NOT logged in, per contract).
- **Tests (+13):** `forgotPassword.test.ts` (9: error mapping ×6, cooldown ×3) +
  `LoginPage.test.tsx` forgot-password describe (4: zod email gate; send → `{ email }` body +
  step 2 + disabled resend `(\d+s)`; full reset → exact body + login view + success banner;
  reset 400 → error message, stays on code step).
- **Gates:** `build` ✓ · `lint` 0 errors (22 warnings unchanged) · `test:run` 61 files / 401 ✓.
- **Runtime-verified (Chrome DevTools MCP, live gateway):** forgot-password → real 201 → step 2
  with empty code field (key-fix confirmed live) + resend "Gửi lại mã (60s)" counting down to
  re-enabled; wrong code `000000` → live 400 → correct VN message, stayed on code step;
  back-link returns to login. Console/network clean (only the intentional 400 + session-probe
  401). **Pending:** success-leg E2E with a REAL code — SMTP off in dev, the code is only
  printed in the backend user-service console, unreachable from the FE session. No backend gap
  (contract matched live).

### Register form: password confirmation field + show/hide toggles (2026-07-11)

FE-only UX: register form gains "Nhập lại mật khẩu". `registerSchema` (`auth.schema.ts`) adds
`confirmPassword` + `.refine` equality check (error on the confirm field: "Mật khẩu nhập lại
không khớp"). `RegisterForm` (`LoginPage.tsx`) renders the extra password input;
`confirmPassword` is stripped in the mutationFn — the `POST /user/register` body stays
`{ username, email, password }` (asserted by the existing exact-body test). Both register
password inputs got an Eye/EyeOff show/hide toggle (independent per field) via local
sub-component `RegisterPasswordField` (same suffix-button pattern as the login TextField
toggle; `TextField` itself is controlled/no ref forwarding so it can't take RHF `register()`
directly — local component keeps minimal diff). Tests: +1 mismatch case, +1 visibility-toggle
case, `fillRegister` helper fills the confirm field (defaults to matching). Gates: build ✓ ·
lint 0 errors · test:run 60 files / 388 ✓.

### Login "Ghi nhớ đăng nhập" wired to backend `rememberMe` (2026-07-11)

Backend handoff 2026-07-10: `POST /api/user/login` now accepts optional `rememberMe: boolean`
(true → HttpOnly cookie + JWT last 7 days; omitted/false → unchanged 5h). The FE checkbox was a
disabled "(sắp ra mắt)" placeholder (P2-03) — now live.

- **Type:** `LoginDto` gains `rememberMe?: boolean` (`src/types/auth.ts`).
- **Hook:** `useLogin` (`src/features/auth/useLogin.ts`) gains `rememberMe` state +
  `toggleRememberMe`; submit spreads `rememberMe: true` only when checked, omits the field
  entirely when unchecked (per contract — must be a real JSON boolean, string → 400).
- **UI:** `LoginPage.tsx` checkbox enabled (disabled/title/"sắp ra mắt" removed), wired
  `checked`/`onChange`; hardcoded `accent-[#F59E0B]` on the touched line replaced with
  `accent-tb-amber` token. Forgot-password + social login stay disabled (still no endpoints).
- **Tests (+2):** `LoginPage.test.tsx` login-flow describe — MSW captures the login body:
  ticked → `{ username, password, rememberMe: true }`; unticked → field absent.
- **Gates:** `build` ✓ · `lint` 0 errors · `test:run` 60 files / 386 ✓.
- **Runtime:** cookie handling is automatic (`credentials: 'include'` global); browser E2E of
  the 7-day Max-Age rides the next Chrome DevTools MCP session. No backend gap.

### ProtectedRoute renders PageSkeleton while the session probe loads (2026-07-10, /sweep)

Closed the snapshot known issue "Auth loading blank state": `ProtectedRoute`
(`src/components/auth/ProtectedRoute.tsx`) returned `null` while the `/user/me` query was
loading, so every protected route (AppLayout/Messages/Feed + shop/admin pages) flashed a
fully blank page on first load and on cross-tab auth resets.

- **Fix:** `isLoading` now renders the existing `<PageSkeleton />` (shared shell skeleton —
  same fallback the router already uses for lazy `<Suspense>`), return type tightened
  `ReactElement | null` → `ReactElement`. One-line behavior change, no new UI pattern.
- **Tests (+4):** colocated `ProtectedRoute.test.tsx` — skeleton (not blank) while the probe
  hangs (`delay('infinite')` MSW), children render once authenticated, 401 → redirect
  `/login`, insufficient role (`user` vs `requiredRole="admin"`) → redirect `/`.
- **Gates:** `build` ✓ · `lint` 0 errors (22 warnings) · `test:run` 60 files / 384 ✓.
- **Runtime:** loading state is transient (ms on localhost) — covered by the RTL render test;
  browser visual pass rides the next Chrome DevTools MCP session (MCP unavailable this
  session).
- Snapshot known issue marked RESOLVED. No backend gap.

### Low-stock rows read denormalized `productName` — client-side join dropped (2026-07-10, /sweep)

Backend handoff 2026-07-10: `GET /api/inventory/low-stock` rows now carry
`productName: string | null` (null only when the product was deleted / lookup transiently
failed). This closes the FE→BE request from the 2026-07-09 low-stock panel work — previously
the panel joined names from the paginated shop product list, so any low-stock product outside
the current page rendered its SKU instead of a name.

- **Type:** `InventoryRecord` gains optional `productName?: string | null`
  (`src/types/inventory.ts`, low-stock endpoint only).
- **Helper:** `buildLowStockRows` (`src/features/shop/lowStock.ts`) drops the `products`
  join param and reads `row.productName ?? row.sku` (SKU fallback kept for null/absent).
  `ShopPage` call site simplified (`products` out of the memo deps).
- **Tests:** `lowStock.test.ts` rewritten to the new contract — 6 cases (name from record,
  null → SKU, absent → SKU for older shapes, bigint-string coercion, minimumStock default,
  ordering preserved).
- **Gates:** `build` ✓ · `lint` 0 errors (22 warnings) · `test:run` 60 files / 380 ✓.
- **Runtime:** contract verified live via curl (shop `test1`): the row that previously
  SKU-fell-back (`SSSS_3663`, product off page 1) now returns
  `productName: "iPhone 15 Pro 256GB"`. Browser-level visual check pending (Chrome DevTools
  MCP unavailable this session); panel render path unchanged since the 2026-07-09 live verify.
- Handoff entry moved to **Done** in `frontend-handoff.md`. No new backend gap.

### AN-01(b): `useAnalyticsFilters` extracted out of the component file (2026-07-10, /sweep)

Closed AN-01 (b) — the F4 analytics dashboard exported a hook from a component file
(`react-refresh/only-export-components` warning class: fast refresh degrades when a component
file exports non-components).

- **Moved** `useAnalyticsFilters` + the `AnalyticsFilters` interface from
  `src/features/order/analytics/AnalyticsDashboard.tsx` into a new
  `src/features/order/analytics/useAnalyticsFilters.ts`; the dashboard now imports the type,
  and `ShopAnalyticsPage` / `AdminAnalyticsPage` import the hook from the new module. Pure
  module move — zero behavior/render change.
- **Tests (+2):** `useAnalyticsFilters.test.ts` (renderHook: default `{ interval: 'day' }`,
  setter replaces state).
- **Gates:** `build` ✓ (recharts chunk unchanged at 402 kB, Rollup just renames it after the
  module split) · `lint` 0 errors, warnings 23 → **22** · `test:run` 59 files / 379 ✓.
- **Runtime:** not applicable — no behavior change; covered by build + tests.
- AN-01 (c) (shared `chartTheme.ts` for the recharts hex literals) stays conditional on a
  second chart consumer. No backend gap.

### Paginated lists keep previous page while fetching (keepPreviousData) (2026-07-10, /sweep)

Closed the remaining perf-scan flag "`placeholderData: keepPreviousData` thiếu ở đa số paginated
query" (reviews already done earlier the same day). Without it, every page flip drops the query to
`data: undefined` → list flashes empty (and Marketplace shows the skeleton grid) until the next
page resolves.

- **Marketplace / ShopPage / ProfilePage / ProductPicker:** `useProducts`
  (`src/features/product/useProducts.ts`) now sets `placeholderData: keepPreviousData` — one hook
  covers all its paginated/filtered consumers; `isFetching` (already exposed) signals the swap.
- **Admin Users (20/trang):** inline users query in `src/features/admin/AdminPage.tsx` gains the
  same option.
- **Wishlist page:** `useWishlistPage` (`src/hooks/data/useWishlist.ts`) gains the same option
  (membership id-set + toggle untouched).
- **Tests (+3, 2 new files):** `useProducts.test.tsx` + `useWishlist.test.tsx` — renderHook + MSW
  page-parameterized handlers assert the regression directly: after a page flip the hook still
  returns page-1 data (`isPlaceholderData`/`isFetching`) instead of `undefined`, then swaps to
  page 2.
- **Gates:** `build` ✓ · `lint` 0 errors (23 pre-existing warnings) · `test:run` 58 files / 377 ✓.
- **Runtime:** pending — Chrome DevTools MCP did not connect this session (BE + FE dev server both
  live and probed 200). Behavior is fully covered by the hook-level regression tests; visual
  re-check (no empty flash flipping Marketplace pages) can ride the next MCP session.
- No backend gap; nothing to move in `frontend-handoff.md` (snapshot-side perf item).

### Batch product endpoint max-50-ids (SEC-H2): chunked cart hydration (2026-07-10, /sweep)

Backend handoff 2026-07-09: `POST /products/with-inventory/multiple` now validates its body —
`{ productIds: number[] }`, **max 50 items**, integers only, `400` over the limit (success stays
`201`, unknown ids skipped, duplicates deduped server-side). The entry guessed "FE action likely
none", but cart hydration (`CartPage`, `CartDrawer`, `CheckoutPage` display + submit-time stock
check) sends **all distinct cart product ids in one batch** — a cart with >50 distinct products
would 400 the entire hydration (blank cart/checkout, failed stock check).

- **Fix (API layer, covers all call sites):** pure helper `batchProductIds` in `src/api/products.ts`
  — dedupe via `Set` (same product in multiple SKU rows no longer wastes batch slots) +
  `lodash/chunk` at `MAX_BATCH_PRODUCT_IDS = 50`. `getMultipleWithInventory` maps each batch
  through the existing `fetchBatchTolerant` safety net and merges (`Promise.all` + `.flat()`).
  6 call sites covered: cart ×4, social attached-product ×2 (those only ever send 1 id).
- **Happy path unchanged:** <50 distinct ids still produce one identical request; query keys and
  hook contracts untouched.
- **Tests:** +5 in `api/products.test.ts` (`batchProductIds`: empty → no batches, small set single
  batch, dedupe, exact-50 boundary stays one batch, 120 ids → 50/50/20 covering every id).
- **Gates:** `build` ✓ · `lint` 0 errors (23 pre-existing warnings) · `test:run` 56 files / 374 ✓.
- **Runtime:** >50 path not E2E-verifiable via normal UI (needs 51 distinct products in one cart);
  covered by unit tests + backend's own runtime verification of the 400 (51 ids → 400, 5/5 checks).
- Handoff entry moved to **Done**; no new backend gap.

### F1 reviews close-out: pagination bug fix + shared error helper + env-config gap (2026-07-10, /sweep)

Sweep pass closing the two oldest handoff Open threads.

**F1 · Product reviews — verified complete + pagination bug fixed.** The handoff entry still said
"build the product reviews UI" but the UI shipped long ago in commit `88975c4`: `ProductReviews.tsx`
(public list, own-review delete, pagination) on ProductDetail, `OrderItemReviewForm` on
OrderDetailPage (write-review per item, only when `order.status === 'completed'` — matches the
verified-purchase gate), aggregate `rating`/`ratingCount` on ProductDetail. Real bug found while
verifying: **reviews pagination never refetched** — `useProductReviews` fetched `page` but its query
key was `reviews.byProduct(productId)` without the page, so clicking "Trước/Sau" changed state while
TanStack served the same cached entry.

- **Fix:** new factory key `queryKeys.reviews.byProductPage(productId, page)`; `useProductReviews`
  keys on it + `placeholderData: keepPreviousData` (no empty flash between pages — first paginated
  query to adopt the performance.md recommendation). `byProduct` stays the invalidation prefix used
  by `useCreateReview`/`useDeleteReview` (prefix match still hits every page).
- **Tests:** `queryKeys.test.ts` +2 (key varies with page; `byProduct` is a prefix of every
  `byProductPage`, not across products).
- **DRY:** inline `resolveReviewError` in OrderDetailPage extracted to pure helper
  `reviewErrorMessage` + `REVIEW_COMMENT_MAX` (`src/features/product/productReview.ts`, behavior
  identical: 404 → completed-order gate, 409 → already-reviewed, else server message → generic;
  test +7 `productReview.test.ts`).
- **Runtime:** backend live; `GET /products/:id/reviews` → 200 across probed ids but **every product
  has 0 reviews** in dev data, so the >10-review pagination path can't be walked E2E (needs 11 users
  with completed orders on one product) — covered by the key regression test instead.

**Env-config gap (snapshot known issue + CORS handoff entry FE action).** Added `.env.example`
documenting all 4 vars against the single gateway origin (`VITE_API_URL=/api`,
`VITE_API_TARGET`/`VITE_CHAT_URL`/`VITE_WS_NOTIFICATION_URL` = `http://localhost:3000`, no separate
socket port); verified not gitignored (`git check-ignore` exit 1). Docs already used the canonical
names — the stale `VITE_NOTIFICATION_URL` mention existed only inside the snapshot note itself.
Also annotated: notification-preview 20-char BE gap resolved (BE handoff 2026-07-07, ≤255 now),
socket long-polling item updated (BE verified WS upgrade OK 2026-07-04 → remaining check is FE-side).
Handoff moves: F1 + notification-preview → Done; CORS entry marked FE INTEGRATED.

Gates: `build` ✓ · `lint` 0 errors (23 warn) · `test:run` 56 files / **369** tests ✓.


---

# Phần cũ hơn → `CHANGELOG.archive.md`

Các sweep đầu tháng 7 (2026-07-05 → 2026-07-09) và toàn bộ **P0 / P1 / P2 / P3-01** của đợt
release-blocker tháng 6 (2026-06-19 → 2026-06-25) đã dời sang **`CHANGELOG.archive.md`**
(cùng thư mục) ngày 2026-08-04 — nguyên văn, không sửa. Mở file đó khi cần truy nguyên một
thay đổi trước 2026-07-10.
