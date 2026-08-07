# Pitfalls — bẫy đã trả giá thật

> On-demand. Đọc khi debug một thứ "trông như đúng mà không chạy", hoặc trước khi kết luận
> "code này ổn" ở một trong các vùng dưới đây.
>
> Điều kiện để một mục nằm ở đây: **đã thực sự tốn thời gian của một session trước đó**, và
> kiến thức đó **vĩnh viễn** (không phải trạng thái hiện tại của backlog — cái đó ở
> `../agent-handoff/snapshot.md`). Mỗi mục ghi rõ *triệu chứng → nguyên nhân → luật*, kèm file
> làm bằng chứng.

Điểm chung của gần hết danh sách này: **thất bại im lặng**. Không exception, không log, không
đỏ trên màn hình — chỉ là kết quả sai. Đó là lý do chúng đắt.

---

## 1 · Backend nuốt key lạ trong im lặng

**Triệu chứng:** gửi filter/param lên, API trả `200`, danh sách trả về y như không lọc.

**Nguyên nhân:** gateway dùng `ValidationPipe({ whitelist: true })` — key không có trong DTO bị
**strip** trước khi tới handler, và không hề báo lỗi. Sai một chữ trong tên param = param đó
biến mất, response vẫn `200`.

**Luật:** filter/param mới → verify bằng **network log** (Chrome DevTools MCP `list_network_requests`),
không tin UI. UI hiển thị "không có kết quả phù hợp" và "param của bạn bị vứt" nhìn giống hệt nhau.
Tên field đúng → `backend-api.md`.

## 1b · Badge đếm ở server, list lọc ở client — hai nguồn, một màn hình

**Triệu chứng:** tab ghi "Trả hàng/Hoàn tiền **(1)**" nhưng bấm vào thì "Không có đơn hàng nào
trong mục này". Trông y như hardcode.

**Nguyên nhân:** con số lấy từ `GET /order/user/:id/status-counts` — **toàn bộ lịch sử**,
server đếm. Danh sách lấy từ `useInfiniteQuery` mới tải **trang 1 (10 dòng)**, rồi lọc bằng
`Array.filter` trên đúng 10 dòng đó. Live 2026-08-04: 65 đơn, đơn `refunded` duy nhất nằm ở
index 18 → trang 2 → không có trong bộ nhớ. Nút "Tải thêm" khi đó lại bị gate `filterTab === 'all'`
nên **không có lối thoát**. Không exception, không log — chỉ là một câu khẳng định sai.

**Luật:** một con số và cái danh sách nó mô tả phải **cùng phạm vi dữ liệu**. Nếu đếm ở server
mà lọc ở client thì trước khi lọc phải nắm đủ dữ liệu, và **trong lúc chưa đủ thì cấm render
empty-state** — "chưa tìm xong" khác "không có". Xem `features/order/orderHistoryPaging.ts`.
Cách đúng vẫn là để server lọc: kiểm tra endpoint có param `status` không (buyer **không có**,
seller **có** — §1 giải thích vì sao gửi bừa vẫn `200`).

## 2 · `limit` bị cap ở 100 — quá thì `400`, không phải cắt bớt

**Triệu chứng:** `GET …?limit=200` → `400 Bad Request` (`"limit must not be greater than 100"`).
Toàn bộ request hỏng, không phải "trả về 100 cái đầu".

**Nguyên nhân:** cap phía backend trên các list endpoint.

**Luật:** cần > 100 item thì **phân trang**, đừng nâng `limit`. Đừng "sửa" bằng cách hạ xuống 100
và bỏ qua phần dư — thế là mất dữ liệu im lặng.
Mẫu đúng: `src/features/wishlist/wishlistCache.ts` (`WISHLIST_ID_PAGE_SIZE = 100`, lặp từng trang).

## 3 · Batch product id tối đa 50/request

Cùng họ với #2 nhưng ngưỡng khác và đã có helper: `MAX_BATCH_PRODUCT_IDS = 50` +
`chunk()` trong `src/api/products.ts:49-54`. Giỏ hàng lớn hydrate qua đây. Đừng tự gọi endpoint
batch với mảng id thô.

## 4 · Tiền có thể về dưới dạng **chuỗi** decimal

**Triệu chứng:** tổng tiền ra `"50000.00250000.00"`, hoặc `NaN`, hoặc so sánh `>` cho kết quả
vô lý.

**Nguyên nhân:** cột decimal ở backend serialize thành string trên một số response
(`src/types/order.ts:81`: *"Decimal column — may arrive as a string (`"50000.00"`) on older responses"*).
TypeScript không cứu được vì type đã khai báo union / vì giá trị tới từ `any` của response.

**Luật:** ép `Number(...)` **ngay tại biên** (khi map response), không phải rải rác chỗ tính toán.
Cộng tiền bằng `+` trên giá trị chưa ép là bug nối chuỗi.

## 5 · Public ID là chuỗi — mọi guard "là số" đều là code trước PUBID

**Triệu chứng:** deep-link im lặng rơi về trang fallback; `Number(id)` ra `NaN`; route match hụt.

**Nguyên nhân:** đợt PUBID-01–07 đổi id storefront sang opaque string (`usr_`, `prod_`, `ord_`,
`addr_`, `ntf_`, `rr_`, `post_`, `cmt_`, `conv_`, `msg_`). Code cũ còn sót guard kiểu `/^\d+$/`
hoặc `parseInt` thì không throw — nó chỉ **âm thầm coi id hợp lệ là không hợp lệ**.

**Chiều nguy hiểm hơn — guard số **nhận** id sai rồi dựng link chết:** `PaymentResultPage`
từng có `/^\d+$/.test(orderParam)`, và backend thì gửi đúng id **nội bộ dạng số**
(`?order=111`). Guard không loại nó ra — nó **cho qua**, rồi trang dựng `/order/111`, mà
`/api/order/111` trả `400 "Invalid id — expected format ord_<16 alphanumeric characters>"`.
Kết quả không phải "id bị rơi về fallback" (chẩn đoán trong snapshot lúc đó ghi ngược) mà là
**deep-link chết chắc chắn** sau mọi lần thanh toán. Fix ở
`src/features/payment/paymentResultParams.ts`.

**Luật:** thấy `\d`, `Number(`, `parseInt(` gần một biến id → dừng, kiểm tra id đó thuộc nhóm
public hay không. Danh sách id **chưa** đổi (vẫn numeric): catalog/SKU, cart-row, inventory-row, GHN.

**Luật 2 — guard viết theo shape đích, không theo "loại cái sai".** `/^ord_[0-9A-Za-z]{16}$/`
tốt hơn `!/^\d+$/` ở đúng một điểm: ngày backend sửa contract, guard theo shape **tự chấp nhận**
giá trị mới, còn guard "reject số" thì vẫn phải sửa tay. Và khi id sai shape thì degrade về
route chắc chắn sống (`/orders`) thay vì ship một URL sẽ 400.

**Luật 3 — drift kiểu này phải verify bằng request thật, đừng đọc code FE rồi suy ra.** Chỉ đọc
FE thì chẩn đoán ra ngược chiều. Một lần `GET` id thật + đối chứng id public là đủ kết luận.

## 6 · Opacity modifier no-op trên alias `var()`-based

**Triệu chứng:** `accent-amber/50` không ra alpha; ring rơi về màu mặc định (xanh) mà không ai
báo lỗi. Class hợp lệ, Tailwind sinh CSS, chỉ là alpha không áp được.

**Nguyên nhân:** alias semantic (`accent-*`) trỏ tới CSS variable; modifier `/NN` không chèn được
alpha vào giá trị `var()`.

**Luật:** cần alpha → dùng literal `tb-*` (`tb-amber/50`, `tb-red/10`, `tb-cyan/30`, `tb-green/15`).
Không cần alpha → giữ alias semantic. Bảng đầy đủ → `../tokens.md`.

## 7 · `renderWithProviders` không dùng được cho `renderHook`

**Triệu chứng:** test hook văng lỗi thiếu provider, rồi bị "sửa" bằng cách bọc thủ công sai cách.

**Nguyên nhân:** `renderWithProviders` **render một component** — nó không cung cấp được
`wrapper` cho `renderHook`.

**Luật:** component → `renderWithProviders`. Hook qua `renderHook` → tự dựng wrapper cục bộ trong
file test với `QueryClient` mới, `retry: false`. Mẫu: `src/features/product/useProducts.test.tsx`.
Chi tiết → `../testing.md`.

Cùng file test, bẫy kèm: `onUnhandledRequest: 'error'` — request không có handler **làm fail test**.
Cách sửa là thêm handler, **không** phải nới setting.

## 8 · MSW phải mirror envelope `{ data }`

`request()` bóc envelope `{ data: … }`. Handler MSW trả thẳng object (không bọc `data`) sẽ khiến
hook nhận `undefined` — trông như "API không trả gì" chứ không phải lỗi test. → `../testing.md`.

## 9 · `vite build` **không** typecheck — build xanh không có nghĩa là type sạch

**Triệu chứng:** `npm run build` xanh suốt nhiều tuần trong khi `npx tsc --noEmit` ra lỗi thật.

**Nguyên nhân:** Vite transpile bằng esbuild và **vứt toàn bộ type**. Script `"build": "vite build"`
trần không gọi `tsc` ở đâu cả (template Vite chuẩn là `"tsc -b && vite build"` — chỗ này từng bị
rơi mất). Doc thì lại ghi "`npm run build` (includes `tsc --noEmit`)" ở 4 chỗ, nên không ai chạy
typecheck riêng. Kết quả: **3 lỗi type sống trong working tree từ 2026-07-22 → 2026-08-04**
(`SOCKET_CONNECT_OPTIONS` `as const` readonly vs `transports: string[]` của socket.io ×2, và
`dto.sku` thành `string | undefined` sau đợt sku-optional nhưng `persistSimpleStock` vẫn nhận
`string`).

**Đã vá 2026-08-04:** `package.json` → `"build": "tsc --noEmit && vite build"`. Giờ câu trong
`core.md` mới đúng.

**Luật:** đừng suy ra "type sạch" từ một build xanh trừ khi đọc thấy `tsc` trong script. Cùng họ
bẫy: `npm run lint` ở đây **không** bật type-aware rule, nên nó cũng không bắt hộ.
Muốn check riêng: `npm run typecheck`.

## 10 · Socket.IO mặc định bắt tay bằng polling

**Triệu chứng:** network log ngập `socket.io/?EIO=4&transport=polling`; realtime "vẫn chạy" trên
gateway 1 instance nên không ai nghi ngờ — nhưng sẽ vỡ khi gateway chạy nhiều worker không sticky.

**Nguyên nhân:** client không ép transport, Socket.IO tự bắt tay polling trước rồi mới upgrade.

**Luật:** mọi `io()` đi qua `SOCKET_CONNECT_OPTIONS` (`src/lib/realtime/socket.ts`) —
`transports: ['websocket']` + `withCredentials`. Đừng gọi `io()` với option tự chế.

## 11 · Dev build của thư viện lọt vào bundle production

**Triệu chứng:** không có triệu chứng nhìn thấy được — chỉ là log debug per-navigation và
overhead thừa trong bundle prod.

**Nguyên nhân:** `exports` map của react-router 7.15.1 trỏ **mọi** condition vào `dist/development/*`;
bản `dist/production/*` có thật nhưng không được liệt kê.

**Luật:** đã vá bằng alias chỉ áp khi `mode === 'production'` trong `vite.config.ts:14-33` —
**đừng gỡ**, và đừng nới sang dev/test (dev warning là thứ ta muốn giữ ở dev). Cách verify duy
nhất là grep artifact sau `npm run build`, không phải đọc config.

## 12 · Đừng trộn reformat cả file vào diff chức năng (FMT-01)

Diff format-only nuốt mất thay đổi thật → review không đọc nổi, không ai duyệt được. Đã trả giá
với đợt đổi quote style trong `api/orders.ts` / `types/order.ts` / `api/users.ts`.

**Luật:** một commit làm một việc. Muốn reformat → commit riêng, và chỉ khi có lý do.
Hệ quả ngược cũng đúng: khi format sai đã nằm trong HEAD rồi, **đừng revert ngược** — làm thế
lại sinh đúng cái mega-diff mà luật này cấm.

## 13 · `setState` trong `useEffect` để reset theo prop

**Triệu chứng:** lint `set-state-in-effect` / `refs-during-render`; UI hiện một frame dữ liệu của
prop cũ trước khi reset.

**Luật:** dùng `useResetOnChange` (`src/hooks/ui/useResetOnChange.ts`) thay vì tự viết effect
reset. Nó reset **trong lúc render**, không có frame rác và không cascade re-render.

---

## 14 · Controlled editor chỉ seed lúc mount → hydrate xong vẫn trống

**Triệu chứng:** ở edit mode, ô rich-text trống trơn dù `GET` đã trả về `description` và form
field đã giữ đúng text. Seller gõ vào đó là **đè mất** nội dung cũ.

**Nguyên nhân:** `useEditor({ content })` của TipTap coi `content` là **giá trị khởi tạo**, không
phải prop controlled. Query resolve *sau* mount → editor không bao giờ nhận text.

**Luật:** với editor bọc controlled (`value`/`onChange`), phải re-seed bằng effect:

```ts
useEffect(() => {
  if (!editor) return;
  const current = editor.isEmpty ? '' : editor.getHTML();
  if (value === current) return;                                  // tránh vòng lặp
  editor.commands.setContent(value || '', { emitUpdate: false }); // KHÔNG được emit
}, [editor, value]);
```

`emitUpdate: false` là bắt buộc: nếu emit, lần hydrate bị tính là **user sửa** → dirty-diff
(`dirtyProductPatch`) sẽ gửi kèm field mà seller chưa hề đụng tới. Xem
`components/shared/RichTextEditor.tsx` + test cùng tên.

---

## 15 · `fill(uid, "")` của Chrome DevTools MCP không kích hoạt onChange của React

**Triệu chứng:** script MCP "xoá" một input rồi save, nhưng không có request nào bay đi (hoặc
patch thiếu field) — dễ kết luận nhầm là code FE hỏng.

**Nguyên nhân:** React gắn listener trên value setter của prototype; set `.value` kiểu thường
không sinh event React nghe được.

**Luật:** clear/gõ input qua MCP bằng native setter + event bubble:

```js
const d = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
d.set.call(el, '');
el.dispatchEvent(new Event('input', { bubbles: true }));
```

Trước khi kết luận "FE không gửi patch", hãy xác nhận form state **thật sự** đã đổi.

---

## Khi phát hiện bẫy mới

Thêm vào đây **chỉ khi** nó thoả 2 điều kiện ở đầu file. Trạng thái công việc → `snapshot.md`.
Lý do của một thay đổi cụ thể → `CHANGELOG.md`. Luật viết code thường ngày → `conventions.md`.
