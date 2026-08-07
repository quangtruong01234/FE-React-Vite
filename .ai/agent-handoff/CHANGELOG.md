# CHANGELOG — TryBuy Frontend

> Historical record of completed FE work. **NOT auto-loaded** by any agent entry point.
> Read on demand only when you need the history/rationale of a past change.
> Current state (readiness, open/blocked tasks, known issues) lives in `snapshot.md`.
> Newest first. Việc trước **2026-07-10** đã dời sang `CHANGELOG.archive.md` (cùng thư mục).

## Maintenance

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
