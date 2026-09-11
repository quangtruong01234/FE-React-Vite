# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-09-11 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
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

**Gates (chạy lại + verify 2026-09-11):** `npm run build` ✓ · `npm run lint` 0 problem ·
`npm run test:run` **939 test / 117 file**, all pass. Không đóng item nào khi 3 lệnh này chưa xanh.

> ⚠️ `npm run build` **mới** thực sự typecheck từ 2026-08-04. Trước đó script chỉ là `vite build`
> (esbuild vứt type) trong khi doc ghi là có `tsc` → 3 lỗi type nằm im 2 tuần. Chi tiết +
> bài học → `.ai/context/pitfalls.md` mục 9, lý do → `CHANGELOG.md`. Mọi con số gate ghi trong
> CHANGELOG **trước** ngày này chỉ chứng minh bundle build được, không chứng minh type sạch.

**Production gate:** không release trước khi P0 đóng *và* có regression test cho
login → product → cart → checkout → payment/order.

## Recent closes (chi tiết → `CHANGELOG.md`)

| Ngày | Item |
|---|---|
| 2026-09-11 | **GHN-FAIL-NTF-01 · notification "giao hàng hụt một lần" có icon/màu/nhãn riêng + deep-link** (class **B** thuần FE, **CHƯA PUSH**). `/sweep` không tham số → mục cao nhất §Open của `frontend-handoff.md`; mọi mục còn lại hoặc không cần FE, hoặc chờ BE push. Entry BE ghi *"không bắt buộc phải làm gì"* và điều đó **đúng**: `type` là chuỗi tự do, `getNotificationContent` fallback render thẳng `n.message` (đã đủ nghĩa, đã tiếng Việt) ⇒ trước khi sửa dòng này **vẫn hiện đúng chữ**, chỉ mang icon `Bell` xám và **không click được**. Sửa **một** file logic: `notificationDisplay.ts` — thêm `TYPE_CONFIG.order_delivery_attempt_failed` + thêm type vào `ORDER_TYPES` (deep-link `/order/<ord_…>`); grep toàn repo xác nhận không còn call site nào khác key theo notification type, `src/types/notification.ts` không đổi. **Icon/màu cố tình khác `order_canceled`** như BE dặn: `AlertTriangle` + amber, **không** dùng glyph X — đơn giao hụt là tin xấu **nhưng chưa xong** (GHN tự giao lại ~3 lần, đơn **chưa hủy, status không đổi**), còn `XCircle` đỏ đọc là "đã kết thúc". Pin bằng test so **cả `Icon` lẫn `color`** với `order_canceled`. Giọng văn pin bằng `not.toMatch(/thất bại|hủy/)` trên **cả** title và body — comment không chặn được kiểu hồi quy "rút gọn nhãn thành *Giao hàng thất bại*", thứ sẽ nói với người mua là đơn đã hỏng trong khi đơn vẫn đang chạy. **Không** thêm CTA "đổi địa chỉ" (điểm 3 của entry): sau khi có waybill, `update_receiver` là quyền admin/`shipping_manager` ⇒ ngõ cụt. Ca `orderId: null` không cần nhánh mới — `orderBody()` trả `null` rồi fallback `n.message`, đã có test. +4 test → **939 test / 117 file**. **Verify trên local/dev, KHÔNG phải prod, và lý do mới là phần đáng nhớ:** gateway prod trả **`522`** (~19.8s) nên đường "bundle local + data prod" của BEQ-0911 vô dụng — mà con số đó chỉ đo được **từ chính origin prod**; lần đo cross-origin từ `localhost` ra `"Failed to fetch"` và **đó là CORS, không phải bằng chứng gì cả**. Đo `api/` bằng `git ls-remote` thì **code BE của entry này chưa commit**: `origin/main` = `d8b7f4e`, `notifyFirstDeliveryFailure` **0 hit**, `order_delivery_attempt_failed` chỉ 1 hit **trong doc**, `git log --all -S` rỗng, working tree hai file ` M` ⇒ tính năng chỉ sống trên máy này, **không được** claim verify prod (y hệt GHN-ETA-01 hôm qua). Verify chạy: dev server local → gateway local `:3000`, dùng **2 dòng notification BE tự phát ra thật** (`ntf_T8IhItvT6wyktApH`, `ntf_FdJuDQQmANHbWREt` — dòng sau trùng từng byte với JSON mẫu của entry) nên không phải monkeypatch `fetch`. Chuông render đúng title/body, icon container `size-9 … text-accent-amber bg-accent-amber/10`, svg 16×16, tam giác cảnh báo phân biệt được bằng mắt với dòng `Đặt hàng thành công` cũng amber. Click → `/order/ord_vzLm2EGPSgHHCpNE` đúng đơn của chính buyer (không 403), đơn vẫn **`Chờ xác nhận`** ⇒ thấy tận mắt điều BE cảnh báo: giao hụt **không** đổi status; chữ "thất bại" không xuất hiện ở đâu trên trang; 0 console error/warn. Ghi `backend-handoff.md` §Open mục **DEPLOY-0911** (không phải bug contract — contract khớp; là hai quan sát deploy: code chưa ra khỏi máy + prod `522`). |
| 2026-09-11 | **BEQ-0911 · làm nốt 4 việc BE đề xuất — BATCH-STATUS-01 + ENRICH-FAIL-01 + GHN-ETA-01 + CHG-PW-01** (class **B** thuần FE, **CHƯA PUSH**). `/sweep làm cả 4`, tiếp ngay sau ERRCODE-01 cùng ngày. **Bài học lặp lại lần thứ hai trong một ngày: dòng "chưa push" trong entry là thứ KHÔNG được tin.** BATCH-STATUS-01 tự ghi *"🚀 Committed locally, not pushed yet"* (2026-08-28) trong khi `d8275b4` **là ancestor** của `api` `origin/main` `d8b7f4e` — đo bằng `git ls-remote` + `merge-base --is-ancestor`, đúng cách đã ghi ở hàng ERRCODE-01. Nhưng phép đo đó **cắt cả hai chiều**, và đó mới là giá trị của nó: **GHN-ETA-01 (entry viết hôm nay) đo ra là CHƯA lên prod thật** — `git grep expectedDeliveryTime d8b7f4e -- apps/gateway/src/order/order.types.ts` rỗng, và migration `20260911-001-add-expected-delivery-time-to-orders.sql` không có trong tree đó ⇒ **không** claim đã verify prod cho item này. **BATCH-STATUS-01:** bỏ **cả hai** trigger của `fetchBatchTolerant`, và vì `getMultipleWithInventory` là caller duy nhất nên **xoá luôn cả helper + test** (`src/lib/http/fetchBatchTolerant.ts`) chứ không để code chết. Gateway hết đường mất batch âm thầm ⇒ `[]` giờ chỉ còn **một** nghĩa (catalog không resolve được id nào) và lỗi là lỗi thật (`502`/`408`) cho React Query retry. 3 test thay thế pin: `[]` tốn **đúng 1** request và **0** lần fan-out (trigger 2 cũ tốn N), `502` **reject** chứ không resolve `[]`, list rỗng không gửi request nào. **ENRICH-FAIL-01:** bỏ `?? 'Shop Official'`. Đọc code thì lòi ra hai call site **đọc ngược thứ tự nhau**: `ProductDetail.tsx` đọc `brand?.name ?? user?.name`, `useProducts.ts` đọc ngược lại. **Đính chính ngay trong lượt (MCP verify):** bản đầu viết "cùng một sản phẩm có thể hiện Samsung ở chi tiết nhưng TechStore ở card" — **sai nửa 'user thấy được'**, vì `enrichProductForUI` (nhánh `useProducts.ts`) grep ra **0 call site**, là code chết ⇒ mâu thuẫn có thật trong source nhưng chưa bao giờ render. Bài học: đừng suy "user thấy X" từ đọc code mà chưa đếm call site. Gộp thành `features/product/sellerName.ts`, thống nhất **user-first** vì chuỗi này nằm cạnh avatar shop (nó là tên **shop**, không phải thuộc tính catalog) ⇒ **đây là thay đổi nhìn thấy được mà BE không yêu cầu**, đã ghi rõ vào handoff. Ca rỗng đọc `Người bán không còn tồn tại` (khớp lối nói `Sản phẩm không còn tồn tại` ở giỏ), test chặn `'Shop Official'` quay lại. **GHN-ETA-01:** thêm `expectedDeliveryTime` vào type là `string | null` **và optional** — optional vì gateway cũ **vắng key**, ca thứ ba mà `string | null` của BE không phủ. Helper thuần `expectedDeliveryLabel()` + 4 test: **chỉ ngày, không giờ** (BE dặn GHN trả `16:59:59Z` = 23:59:59 giờ VN, cam kết theo ngày) — có test `not.toMatch(/\d{1,2}:\d{2}/)` để sau này không ai "cải tiến" thành `23:59`; absent/`null`/không parse được đều render **không gì cả**. Quyết định BE không nêu: ẩn nhãn khi đơn rời nhóm in-flight (`completed`/`canceled`/`return_requested`/`refunded`) — giao xong thì con số là quá khứ, mà GHN dời lịch **không** refresh field nếu admin không sync tay. **CHG-PW-01:** bỏ ánh xạ `404` → *"Tính năng đổi mật khẩu chưa sẵn sàng"*, thay test cũ bằng test pin `not.toMatch(/chưa sẵn sàng/)`. Tổng 5 entry `frontend-handoff.md` xuống Done (BATCH-FAIL-01 đóng ké vì point 1 của nó chính là trigger 2 vừa xoá). **Đã verify tầng UI (`run mcp test`, cùng ngày)** — cách vòng được "BE local không lên": chạy dev server local với `VITE_API_TARGET` trỏ vào worker prod, nên browser chạy **bundle local chưa commit** trên **data prod thật** qua proxy `/api`. Kết quả: ENRICH-FAIL-01 ✅ (detail render `shop1`, 0 lần `'Shop Official'`); BATCH-STATUS-01 ✅ (hydrate giỏ = **đúng 1** `POST /products/with-inventory/multiple`, 0 fan-out; nhánh `[]`/lỗi vẫn chỉ có unit test vì không induce được trên prod); GHN-ETA-01 ✅ 3 trạng thái, induce bằng `initScript` monkeypatch `fetch` để bơm field BE chưa deploy — vắng key + in-flight → không render gì, không crash; bơm field + in-flight → `Dự kiến giao: 13/09/2026` (**không có giờ**), icon 15×15 `centerOffset: 0`; bơm field + `completed` → ẩn ETA, vẫn hiện mã vận đơn; CHG-PW-01 + ERRCODE-01 ✅ sai mật khẩu hiện tại trên prod → `401` `errorCode: INVALID_CURRENT_PASSWORD` với `message: "Unauthorized"` chung chung, UI hiện **"Mật khẩu hiện tại không đúng."** gắn đúng field (⇒ chuỗi đến từ ánh xạ errorCode, không phải `message`), **0 chữ "chưa sẵn sàng"/"Phiên đăng nhập đã hết hạn"**, không redirect `/login`, và **không có `GET /user/me`** nào bắn kèm (xác nhận `isSessionAlive()` đã bỏ); body request đúng `{currentPassword, newPassword}`, không có `confirmPassword`. Dùng tài khoản thí `e2eprod0806`, và **mọi lần submit đều cố tình sai mật khẩu hiện tại** nên không đổi được mật khẩu ai. Phát sinh 1 gap BE mới (`user.name` batch trả `null` còn detail trả `shop1`) → đã ghi `backend-handoff.md`. +11 test −7 (xoá cùng helper) → **935 test / 117 file**. |
| 2026-09-11 | **ERRCODE-01 · CHG-PW-02 + MAIL-UI-01 — FE đọc `errorCode` thay vì đoán** (class **B** thuần FE, **CHƯA PUSH**, BE đã lên prod từ trước). `/sweep làm task BE đề xuất` — hai entry Open của `frontend-handoff.md`, làm chung **một** lần vì cùng một gốc. **Gốc đó là bug FE, không phải BE:** `request()` (`src/api/client.ts`) dựng lại error ném ra từ đúng `{statusCode, status, message}` ⇒ `errorCode` bị **parse rồi vứt** trước khi tới bất kỳ caller nào. Không sửa dòng này thì cả hai feature "xanh" ở unit test (test tự tay dựng object lỗi) mà **chết hoàn toàn trong app thật** — đây là thứ đáng nhớ nhất của lượt này. Forward có điều kiện (`typeof err.errorCode === 'string'`) để key **vắng mặt** chứ không thành `undefined`/`null`, đúng contract BE viết. **CHG-PW-02:** xoá `isSessionAlive()` ⇒ mỗi lần lỗi auth bớt một request `GET /user/me`. `UNAUTHENTICATED` → báo hết phiên ở form; `INVALID_CURRENT_PASSWORD` → lỗi ở ô mật khẩu hiện tại; **401 không tag → vẫn ở lại ô mật khẩu, không redirect** (đá văng một phiên còn sống chỉ vì đoán là cái sai tệ hơn, và đúng là bug gốc của entry này). **MAIL-UI-01:** xoá `failedResets` + `nextResetAttempts()` + `resetAttemptHint()` + banner hint amber — biến đếm client chỉ thấy một tab, reload/tab 2/gửi lại từ nơi khác là lệch; giờ nghe `RESET_CODE_EXHAUSTED`. **Không** dựng lại "còn N lần" (BE cố ý không trả số — đó là kênh dò tài khoản), có test pin `not.toMatch(/còn \d+ lần/)` và một comment chặn ở chỗ code cũ. **Verify trên prod, không phải local** (entry BE dặn đúng chỗ: local `message` vẫn là `"Current password is incorrect"` vì sanitizer chỉ chạy ở prod): chạy `fetch` từ chính trang prod đã đăng nhập. Hai `401` của `change-password` về **giống hệt nhau từng byte trừ field mới** — chưa đăng nhập → `errorCode:"UNAUTHENTICATED"`, sai mật khẩu hiện tại trên phiên sống → `errorCode:"INVALID_CURRENT_PASSWORD"`, **cả hai `message:"Unauthorized"`** ⇒ chứng minh tận mắt là `message` vô dụng và probe `GET /user/me` thật sự thừa. `reset-password`: xin mã thật cho `quang5552013@gmail.com` rồi đốt 6 lần sai — lần **1–5 không có key `errorCode`**, lần **6 có `RESET_CODE_EXHAUSTED`**, `message` **y hệt** cả 6 lần. Tài khoản prod dùng là `quang5552013` (throwaway), mật khẩu **không đổi** (`Test@12345`) vì mọi lần thử đều là mật khẩu/mã sai. **Bắt thêm từ byte thật của prod:** body lỗi có `"status":"error"` — **string** — nằm cạnh `statusCode` số; `client.ts` dựng `status` từ `res.status` nên không rò, đã thêm test regression dùng nguyên văn body prod để một lần refactor thành `{...err}` không âm thầm nhét string vào `ApiError.status`. **UX:** nhánh hết lượt **giữ user ở bước nhập mã** (nút *Gửi lại mã* sẵn đó) thay vì đá về bước email — đá về là bắt gõ lại địa chỉ đang có trong state. +3 test → **931 test / 116 file**. Ba entry `frontend-handoff.md` xuống Done: CHG-PW-02, MAIL-UI-01, và **RESET-TTL-01** (đã làm xong 2026-09-09, tồn đọng chưa drain). |
| 2026-09-10 | **CHAT-ROOM-01 · presence socket thôi join phòng — xoá `joinAll()` + `joined`** (class **A** thuần FE, **đã commit `34701cc`** — gate kết luận PUSH ĐƯỢC, user tự chạy `git push origin main`). BE union emit đã lên `main` (`git ls-remote origin main` = `4954974`, `merge-base --is-ancestor 1ea9ed6 origin/main` **YES**) ⇒ mitigation FE hết việc. **Verify trên prod trước khi xoá** (snapshot dặn đúng chỗ này — local **không** phân biệt được hai nhánh vì BE local đã có union emit): mở WebSocket thô từ chính trang prod đang đăng nhập `user1`, gửi **đúng một frame** `40/chat,` và **không join gì cả**, rồi để `shop1` (browser context riêng, `isolatedContext` để không đè cookie) gửi tin thật → socket không-join nhận `42/chat,["new_message",{"id":"msg_kbd7dPh6G8b41Vve","conversationId":"conv_D8OiOgvWNu6DZRAO",…}]` với `sent: ["40/chat,"]`. Đó đúng là tính chất mà bản dọn dựa vào. **Xoá:** `joined` (Set module-scope), `joinConversation`, `joinAll`, subscription `queryCache` re-join, và `unjoinedConversationIds` ở `chatPresence.ts`. **Giữ:** refetch danh sách hội thoại trong handler `connect` — nó **không** phải chuyện phòng mà là vá khoảng trống offline (tin gửi lúc socket chết không bao giờ được deliver; `useConversations` tự nó không hỏi lại: staleTime 60s + `refetchOnWindowFocus: false`). `useChat` vẫn `emit('join')` cho thread đang mở: thừa cho delivery nhưng vô hại, và `join` mới là chỗ chạy membership check ⇒ để nguyên. **Test:** thay 3 test socket cũ bằng 3 test mới — *không bao giờ emit join, kể cả sau reconnect* (`expect(socket.emit).not.toHaveBeenCalled()`, bắn `connect` hai lần), *cập nhật preview + badge cho hội thoại chưa từng join*, *reconnect refetch để vá khoảng trống offline*; bỏ 3 test `unjoinedConversationIds` ⇒ **928 test / 116 file** (net −3, không mất coverage nào còn ý nghĩa). Doc: `.ai/context/realtime.md` đổi mục presence socket sang *"It joins nothing"*. |
| 2026-09-10 | **RESET-TTL-01 · màn quên mật khẩu thôi khẳng định hộ BE "mã sống 10 phút"** (class **C**, **đã push + verify prod 2026-09-10**). BE rút `PASSWORD_RESET_CODE_TTL_SECONDS` 600 → **60**; chuỗi hardcode `"Mã có hiệu lực trong 10 phút."` ở `ForgotPasswordForm.tsx:135` là **điều kiện chặn duy nhất** của entry RESET-TTL-01 trong `release-gate.md` → Holding (grep `"10 phút"` toàn `src` + `.ai`: **đúng 1 hit**). User chọn phương án **bỏ hẳn con số** thay vì sửa thành `1 phút` ⇒ câu mới: *"Mã hết hiệu lực rất nhanh — hãy nhập ngay, thời hạn cụ thể ghi trong email."* Lý do: TTL là giá trị của **server** (email do BE render từ chính hằng số đó), FE không nên nhắc lại — lần sau BE đổi TTL nữa thì FE không nói sai lần nào. **Không đụng logic**, và ba thứ dễ tưởng là dính đều đã kiểm là không: cooldown 60s của nút *Gửi lại mã* (`resendCooldown`) đọc cooldown riêng chứ không đọc TTL mã, `nextResetAttempts()`/`resetAttemptHint()` của MAIL-UI-01 vẫn đúng, ánh xạ `400` → một câu chung vẫn đúng. **Test:** thêm assertion vào case *"posts the email, advances to the code step"* trong `LoginPage.test.tsx` — pin câu bước 2 `not.toMatch(/\d+\s*(phút\|giây)/)`, tức chặn đúng kiểu hồi quy "ai đó lại ghi một con số vào đây"; số test **không đổi** (**931 test / 116 file**) vì gắn vào case sẵn có chứ không thêm case rỗng nghĩa. **Gate:** ô `frontend` flip ✅ 2026-09-10, entry chuyển **Holding → Ready to release**, Holding giờ **trống**. Thứ tự push vẫn BE trước / FE ngay sau, nhưng cửa sổ giữa hai lần deploy giờ **vô hại cả hai chiều** — FE mới đúng dù TTL đang là 600s hay 60s ⇒ **đã đẩy FE trước** (`eaa8065..422bf30`), `api` theo sau (`9398e51`, đo bằng `git ls-remote`) ⇒ entry xuống **Released** cùng ngày. **Verify prod:** chunk `LoginPage-CX6p7K8F.js` → `LoginPage-DX6v12rH.js`, chạy thật luồng *Quên mật khẩu?* bằng một email không tồn tại (endpoint luôn trả `201` trung lập ⇒ không gửi mail, không để lại gì) thấy đúng câu mới. Nhân đó phát hiện guide phỏng vấn **chưa có bước nào** cho luồng quên mật khẩu ⇒ thêm Phần 1 Bước 6 + ảnh `01-auth-06-quen-mat-khau.png`, PDF rebuild **87 trang · 76 ảnh · 255 link**. **Verify prod lượt 2 bằng mail thật** (user yêu cầu): tạo tài khoản prod `quang5552013` (`usr_zQbY9pbzOU4Metbf`, mật khẩu `Test@12345`, chưa hoàn tất reset nên vẫn nguyên) rồi gửi mã — **email tới thật**, nội dung *"Mã có hiệu lực trong **1 phút**"* ⇒ hằng số TTL=60 của BE cũng đã lên prod. Việc này **lật ngược** ghi chú `../.agent-local/frontend-handoff.md:506` (*"no email will arrive on prod"*) mà tôi vừa trót chép vào guide phỏng vấn ⇒ đã sửa lại bước guide + README và rebuild PDF (số liệu không đổi), và ghi lại vào `backend-handoff.md` §Open. Cách đo khi response luôn `201` trung lập: **thời gian** — 4325 ms (có gửi mail) vs 159 ms (không gửi). |

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
> ✅ **Forgot-password success-leg đã verify trên dev 2026-09-08 (MAIL-UI-01)** — hết nợ. Công thức
> repro giữ lại vì **không cần SMTP và không cần hộp thư thật**: `user.service.ts` ghi mã vào Redis
> **trước** khi gửi mail và không rollback khi SMTP ném, nên một tài khoản dùng-một-lần trên domain
> giả (`mailui0908@example.com`) vẫn có mã đọc được bằng
> `docker exec redis redis-cli GET user:pwreset:code:<userId>` (`KEYS user:pwreset:*` để tìm id;
> `attempts:<id>` và `cooldown:<id>` là hai key còn lại). **Đừng chạy nhánh này trên prod** — prod
> không cấu hình SMTP (lời dặn của BE trong MAIL-UI-01), và đừng đổi mật khẩu của
> `user1`/`shop1`/`admin1`. Đăng nhập sau khi reset phải dùng **username**, không phải email.
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
