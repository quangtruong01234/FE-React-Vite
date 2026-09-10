# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-09-10 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
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

**Gates (chạy lại + verify 2026-09-10):** `npm run build` ✓ · `npm run lint` 0 problem ·
`npm run test:run` **931 test / 116 file**, all pass. Không đóng item nào khi 3 lệnh này chưa xanh.

> ⚠️ `npm run build` **mới** thực sự typecheck từ 2026-08-04. Trước đó script chỉ là `vite build`
> (esbuild vứt type) trong khi doc ghi là có `tsc` → 3 lỗi type nằm im 2 tuần. Chi tiết +
> bài học → `.ai/context/pitfalls.md` mục 9, lý do → `CHANGELOG.md`. Mọi con số gate ghi trong
> CHANGELOG **trước** ngày này chỉ chứng minh bundle build được, không chứng minh type sạch.

**Production gate:** không release trước khi P0 đóng *và* có regression test cho
login → product → cart → checkout → payment/order.

## Recent closes (chi tiết → `CHANGELOG.md`)

| Ngày | Item |
|---|---|
| 2026-09-10 | **RESET-TTL-01 · màn quên mật khẩu thôi khẳng định hộ BE "mã sống 10 phút"** (class **C**, **đã push + verify prod 2026-09-10**). BE rút `PASSWORD_RESET_CODE_TTL_SECONDS` 600 → **60**; chuỗi hardcode `"Mã có hiệu lực trong 10 phút."` ở `ForgotPasswordForm.tsx:135` là **điều kiện chặn duy nhất** của entry RESET-TTL-01 trong `release-gate.md` → Holding (grep `"10 phút"` toàn `src` + `.ai`: **đúng 1 hit**). User chọn phương án **bỏ hẳn con số** thay vì sửa thành `1 phút` ⇒ câu mới: *"Mã hết hiệu lực rất nhanh — hãy nhập ngay, thời hạn cụ thể ghi trong email."* Lý do: TTL là giá trị của **server** (email do BE render từ chính hằng số đó), FE không nên nhắc lại — lần sau BE đổi TTL nữa thì FE không nói sai lần nào. **Không đụng logic**, và ba thứ dễ tưởng là dính đều đã kiểm là không: cooldown 60s của nút *Gửi lại mã* (`resendCooldown`) đọc cooldown riêng chứ không đọc TTL mã, `nextResetAttempts()`/`resetAttemptHint()` của MAIL-UI-01 vẫn đúng, ánh xạ `400` → một câu chung vẫn đúng. **Test:** thêm assertion vào case *"posts the email, advances to the code step"* trong `LoginPage.test.tsx` — pin câu bước 2 `not.toMatch(/\d+\s*(phút\|giây)/)`, tức chặn đúng kiểu hồi quy "ai đó lại ghi một con số vào đây"; số test **không đổi** (**931 test / 116 file**) vì gắn vào case sẵn có chứ không thêm case rỗng nghĩa. **Gate:** ô `frontend` flip ✅ 2026-09-10, entry chuyển **Holding → Ready to release**, Holding giờ **trống**. Thứ tự push vẫn BE trước / FE ngay sau, nhưng cửa sổ giữa hai lần deploy giờ **vô hại cả hai chiều** — FE mới đúng dù TTL đang là 600s hay 60s ⇒ **đã đẩy FE trước** (`eaa8065..422bf30`), `api` theo sau (`9398e51`, đo bằng `git ls-remote`) ⇒ entry xuống **Released** cùng ngày. **Verify prod:** chunk `LoginPage-CX6p7K8F.js` → `LoginPage-DX6v12rH.js`, chạy thật luồng *Quên mật khẩu?* bằng một email không tồn tại (endpoint luôn trả `201` trung lập ⇒ không gửi mail, không để lại gì) thấy đúng câu mới. Nhân đó phát hiện guide phỏng vấn **chưa có bước nào** cho luồng quên mật khẩu ⇒ thêm Phần 1 Bước 6 + ảnh `01-auth-06-quen-mat-khau.png`, PDF rebuild **87 trang · 76 ảnh · 255 link**. **Verify prod lượt 2 bằng mail thật** (user yêu cầu): tạo tài khoản prod `quang5552013` (`usr_zQbY9pbzOU4Metbf`, mật khẩu `Test@12345`, chưa hoàn tất reset nên vẫn nguyên) rồi gửi mã — **email tới thật**, nội dung *"Mã có hiệu lực trong **1 phút**"* ⇒ hằng số TTL=60 của BE cũng đã lên prod. Việc này **lật ngược** ghi chú `../.agent-local/frontend-handoff.md:506` (*"no email will arrive on prod"*) mà tôi vừa trót chép vào guide phỏng vấn ⇒ đã sửa lại bước guide + README và rebuild PDF (số liệu không đổi), và ghi lại vào `backend-handoff.md` §Open. Cách đo khi response luôn `201` trung lập: **thời gian** — 4325 ms (có gửi mail) vs 159 ms (không gửi). |
| 2026-09-09 | **SWEEP-0909 · CHAT-REJOIN-01 — presence socket không bao giờ vào lại phòng sau reconnect** (class **A** thuần FE, **ĐÃ PUSH 2026-09-10** — user tự chạy `git push origin main`, `7d5cdda..fa26d79`, CD Cloudflare Workers chạy xong, bundle entry đổi `index-D3m4-E1f.js` → `index-DzpnwmNm.js`; **đã verify runtime trên prod cùng ngày**, xem cuối hàng; không đụng contract nào). `/sweep` phạm vi *"task về chat room"*. Item trong backlog là CHAT-ROOM-01 và nó **vẫn bị chặn**: đo bằng `git ls-remote` → `api` `origin/main` = `d08244c`, `git merge-base --is-ancestor 1ea9ed6 d08244c` **NO**, `git grep chatMessageRooms d08244c` không hit ⇒ mitigation `joinAll()` phải ở lại (xem §Active Tasks). Nhưng chính lúc đọc mitigation đó thì lộ một bug **FE thuần, không chờ ai**: `joined` (`chatPresenceSocket.ts:22`) là Set ở **module scope**, chỉ xoá trong `onDestroy`; trong khi **phòng sống trên socket phía server** và reconnect cấp một socket server **mới, không phòng nào** (gateway không đặt `connectionStateRecovery`). Sau reconnect mọi id vẫn "đã joined" ⇒ `joinAll` lọc sạch ⇒ socket **ngồi ngoài mọi phòng** cho tới khi user F5: mất tiếng chuông + mất preview/badge cho mọi hội thoại không mở, **im lặng, không lỗi nào in ra**. Sửa đúng một dòng: `joined.clear()` ngay đầu handler `connect` (client instance được socket.io tái dùng, `connect` bắn lại mỗi lần reconnect). `useChat.ts` **không dính** — nó `emit('join')` vô điều kiện trong `on('connect')`. **Verify runtime** (FE `localhost:5174` + BE local, MCP, `chgpw_test` ↔ `quang5552013`, `conv_GcOODSkmePJCuY72`, danh sách hội thoại **không mở thread nào** để preview/badge chỉ đến từ presence socket): PING-1 → preview + badge "1" hiện live; PING-2 sau reconnect → preview + badge "2". **Bẫy đo đạc:** máy local **không tái hiện được** bug này — BE local đã có union emit của CHAT-ROOM-01 nên vẫn bắn vào phòng `user:{id}` mà server tự join lúc connect; đây là bug **chỉ prod mới lộ**. Bằng chứng vì thế lấy ở tầng WebSocket: patch `window.WebSocket` qua `initScript`, log frame thô (socket.io ship bản browser **đã tước debug** nên `localStorage.debug` vô dụng, và các namespace **ghép chung một** engine.io ws `:3000/socket.io/?EIO=4` nên lọc theo `/chat/` trong URL sẽ ra rỗng). `emulate networkConditions: Offline` 7s **không** đủ đứt (ping 25s + timeout 20s) ⇒ ép đứt bằng `ws.close()` thật. Có fix: `close conn2` → `new/open conn3` → `40/chat,` → `42/chat,["join",{...}]`. Bỏ `joined.clear()` (negative control): conn3 mở, `40/chat,` có, **không có frame `join` nào**. Test regression bắn `connect` hai lần trên cùng FakeSocket — không fix thì assert ra `[]`. +3 test / +1 file → **931 test / 116 file**. **✅ Verify trên prod 2026-09-10** (bundle `index-DzpnwmNm.js`, `user1`, `conv_D8OiOgvWNu6DZRAO`, cùng recorder `window.WebSocket`): `wss://…/socket.io/` conn1 → `40/chat,` → `join`; ép `close` → conn2 mở → `40/chat,` → **`42/chat,["join",{"conversationId":"conv_D8OiOgvWNu6DZRAO"}]` gửi lại**. Đây là nơi bug thật sự cắn (prod chưa có union emit) ⇒ nhánh fix đã chạy thật, không chỉ ở local. Không ghi gì vào DB prod: chỉ login → join room → logout. **Lượt 2 (cùng ngày, theo yêu cầu user):** chạy nốt tới hành vi người dùng thấy — sau reconnect, peer `shop1` gửi tin thật → `conn2` nhận `new_message`, preview đổi + badge `1` + *Vừa xong*, không F5; hành vi này thành **Phần 8 Bước 4** của guide phỏng vấn (`../.agent-local/interview/`, ảnh `08-rt-07-reconnect-new-message.png`, PDF build lại 85 trang / 75 ảnh). Dữ liệu để lại trên prod: `msg_sHsg6UpGSqnbzmQC` trong `conv_D8OiOgvWNu6DZRAO`, cố ý **để chưa đọc** vì ảnh cần badge. |
| 2026-09-08 | **SWEEP-0908 · MAIL-UI-01 + MAIL-UI-02** (class **A** thuần FE, **ĐÃ PUSH 2026-09-10** cùng chuyến với SWEEP-0909 — `7d5cdda..fa26d79`). `/sweep` phạm vi *"task về forget Password và MAIL-UI-02"*. **MAIL-UI-01:** ba việc BE nhờ, việc đầu (throttle 60s + đếm ngược) **đã có sẵn từ 2026-07-11** — đọc code trước nên không viết lại. Hai việc còn lại cùng một gốc: `POST /user/reset-password` trả **một** câu `400` cho mọi nguyên nhân, kể cả ca tệ nhất — sau **5** lần sai server **xoá mã trong Redis mà không đổi lời**, từ đó gõ gì cũng sai. Response sẽ không bao giờ mang tin này ⇒ client tự đếm: `nextResetAttempts()` **chỉ tính `400`** (`429`/lỗi mạng chưa tới bước verify, đếm chúng là đẩy user đi xin mã mới trong khi mã cũ vẫn tốt), `resetAttemptHint()` im dưới 3 → cảnh báo từ 3 → *"mã này không còn dùng được"* từ 5, **cố ý mơ hồ về số lần còn lại** vì biến đếm chỉ thấy tab này và một lần gửi lại (từ bất kỳ đâu) reset biến đếm server — có test pin `not.toMatch(/còn \d+ lần/)`. Biến đếm reset ở đúng ba chỗ server reset nó. Banner gửi-lại nói thẳng *"Hãy dùng mã trong email mới nhất — mã cũ không còn dùng được"*; hint là banner `tb-amber` dưới banner lỗi đỏ, chỉ ở bước 2. **Verify runtime trên dev** bằng tài khoản dùng-một-lần `mailui0908` (domain giả): 201 gửi mã → nút `Gửi lại mã (59s)` đếm lùi thật → sai lần 1, 2 **không** hint → lần 3 hint hiện → gửi lại 201, banner xanh + **hint biến mất** đúng lúc `user:pwreset:attempts:31` bị xoá khỏi Redis (client/server reset khớp) → nhập mã thật 201 → đăng nhập mật khẩu mới 201. Đọc được mã **không cần SMTP** vì `user.service.ts` ghi Redis **trước** khi gửi mail và không rollback khi SMTP ném (công thức để ở §Runtime verification) ⇒ không đụng hộp thư thật BE đưa; **đừng chạy nhánh này trên prod** (prod không có SMTP). Bẫy: form đăng nhập nhận **username**, không nhận email. **MAIL-UI-02:** entry ghi *"FE action needed: không có"* — việc thật là xác minh (cả 3 route CTA có trong `router.tsx`, `/sell/orders` bọc `requiredRole="shop"`) rồi **đóng băng** ràng buộc vào §Guard cố ý giữ: mail đã gửi thì không sửa lại được, đổi tên/bỏ route là làm chết link trong hộp thư, redirect FE cũng không cứu vì BE đọc chính path đó để dựng URL cho mail sau. **KHÔNG làm:** route `/reset-password?email=...` BE đề nghị — thêm route công khai là quyết định của user, đã nêu để user quyết. +7 test → **928 test / 115 file**. |
| 2026-08-29 | **CHG-PW-02 · hai loại `401` của đổi mật khẩu giống hệt nhau trên prod** (class **A** thuần FE, **đã commit, chưa push** — báo user theo mẫu gate rồi chờ). Verify CHG-PW-01 **trên prod** bằng tài khoản dùng-một-lần `e2eprod0806` lộ bug **chỉ prod mới có**: sai mật khẩu hiện tại → form in *"Phiên đăng nhập đã hết hạn"*, trong khi phiên vẫn sống. Nguyên nhân: exception filter của gateway **dẹp `message` xuống đúng tên HTTP error**, nên `401` sai-mật-khẩu và `401` của guard về **byte-identical** (`{"error":"Unauthorized","message":"Unauthorized", …}`) — đo bằng cách so lần submit sai thật (reqid=314, cookie sống) với probe `credentials: 'omit'`. `isExpiredSession()` match theo `message` vì thế trúng nhánh sai ở **case phổ biến nhất**. Sửa: **bỏ hẳn việc đoán** — `isExpiredSession()`/`messageOf()` xoá, thay bằng `isAuthFailure()` (chỉ đọc status `401`/`403`) + `isSessionAlive()` (gọi `GET /user/me`; `200` ⇒ phiên sống ⇒ là sai mật khẩu). Lỗi mạng trong probe ⇒ trả `true`, **thiên về giữ user ở lại**: đá một phiên sống ra `/login` vì rớt mạng tệ hơn in nhầm câu lỗi. `changePasswordError(error, sessionAlive = true)` nhận thêm tham số thay vì tự đọc chữ; form chỉ trả giá một request phụ **trên nhánh 401/403**, đường thành công và `429`/`400`/`404` không đụng tới. Đây là **contract gap của BE** — đã ghi `../.agent-local/backend-handoff.md` → `CHG-PW-02` (giữ `message` gốc / thêm `errorCode` / trả `400`-`422` cho sai mật khẩu; có một trong ba là FE bỏ được probe). +5 test → **921 test / 115 file**. |
| 2026-08-29 | **CHG-PW-01 · đổi mật khẩu khi đang đăng nhập — tab "Bảo mật"** (class **C**, **ĐÃ PUSH 2026-08-29** — user tự chạy `git push origin main`, `f809197..ce02013`, CD Cloudflare Workers tự chạy; bundle live đổi `index-1xHrNHZu.js` → `index-Dil8MQJp.js`. **Verify prod cùng ngày** với `e2eprod0806`: đường thành công đúng hết — `201`, form clear, phiên còn sống, đăng nhập lại bằng mật khẩu mới OK; nhưng nhánh **sai mật khẩu hiện tại in nhầm câu hết phiên** ⇒ đẻ ra CHG-PW-02 ở hàng trên. Mật khẩu của tài khoản đã trả về `Test@1234` để `test-accounts.md` còn đúng). User: *"test change password chưa?"* → *"BE đã done CHG-PW-01 tiep tuc"*. Form có sẵn từ lượt trước nhưng endpoint chưa tồn tại nên **mọi lần submit ra `404`** ⇒ chưa từng test thật; lượt này BE code xong ở local nên chạy verify thật + bịt hai chỗ contract chỉ chạy thật mới lộ. `EditProfileModal` thêm tab **"Hồ sơ" / "Bảo mật"**, hai `<form>` render **luân phiên** (lồng form là HTML không hợp lệ). **(1) Body đúng hai field** `currentPassword` + `newPassword` — `confirmPassword` là của form, gateway validate `forbidNonWhitelisted` nên để nó lọt xuống dây là **biến một lần đổi hợp lệ thành 400**; `changePasswordPayload()` thu ba xuống hai, test chốt `not.toContain('confirmPassword')`. **(2) Hai loại `401` cùng về một call**, chỉ `message` phân biệt: sai mật khẩu hiện tại (cookie **còn sống**) vs. `JwtAuthGuard` chặn (*"Access token is required"* / *"Unauthorized"*). Call đặt `skipUnauthorizedRedirect` để loại thứ nhất không bị đá về `/login`; `isExpiredSession()` match **chiều hẹp** — chỉ câu chữ của guard mới tính là hết phiên, để BE đổi lời văn câu sai-mật-khẩu thì case phổ biến vẫn rơi đúng ô. Còn lại: `429` (rate limit 5/60s) → câu ở form, `400` → ô mật khẩu mới, `404` → *"Tính năng chưa sẵn sàng"* (nói thẳng thay vì rơi vào nhánh lỗi mạng — chính nó đã che mất sự thật ở lượt trước). `PasswordField` dời `features/auth/` → `components/shared/` (2 feature folder dùng, đúng ngưỡng DRY) + prop `autoComplete`. **Verify runtime** (FE `localhost:5174` + BE local, MCP, tài khoản dùng-một-lần `chgpw_test` trên **dev DB**, không đụng prod): submit rỗng → 3 lỗi field; nhập lại lệch → lỗi ô confirm; mới trùng cũ → chặn **client-side**, không có request; sai mật khẩu hiện tại → **401** hiện dưới đúng ô, vẫn ở nguyên trang, `GET /user/me` sau đó **200**; đổi hợp lệ → **201**, form clear, phiên sống; đăng nhập lại: mật khẩu cũ **401**, mật khẩu mới **201**. +16 test / +1 file. |

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
- **CHAT-ROOM-01 — 🔓 BE ĐÃ LÊN `main` 2026-09-10; mitigation FE giờ dọn được (chưa dọn).**
  Đo lại 2026-09-10: `git ls-remote origin main` = **`9398e51`**,
  `merge-base --is-ancestor 1ea9ed6 9398e51` → **YES**, `git grep chatMessageRooms 9398e51` hit ở
  `apps/gateway/src/chat/chat.ws-gateway.ts` + `chat.types.ts`. Tức union emit **đã merge và đã
  auto-deploy**. Việc còn lại là dọn `joinAll()` + `joined` bên FE (đọc kỹ *Lưu ý khi dọn* bên
  dưới, và **verify trên prod** trước khi xoá — local không phân biệt được hai nhánh).
  _Trạng thái cũ, giữ làm lịch sử:_ đo 2026-09-09 `origin/main` = `d08244c`,
  `merge-base --is-ancestor 1ea9ed6 d08244c` **NO** ⇒ lúc đó `joinAll()` (`chatPresenceSocket.ts`) + re-join theo
  query cache vẫn là **thứ duy nhất** làm presence socket nhận được `new_message`; bỏ bây giờ là
  mất tiếng chuông và mất cập nhật preview cho **mọi** hội thoại không mở, cho tới khi BE merge.
  Bỏ ngay sau khi BE push (FE đổi một mình được, không cần entry Holding — `emit('join')` vẫn sống
  nên hai chiều đều đúng).
  **Lưu ý khi dọn (2026-09-09, CHAT-REJOIN-01):** `joined.clear()` ở đầu handler `connect` là
  **fix riêng**, không phải một phần mitigation — reconnect cấp socket server mới không phòng nào,
  không clear thì `joinAll` lọc sạch và socket ngồi ngoài mọi phòng cho tới khi F5. Khi union emit
  lên prod thì hành vi này **tự lành** (server tự join `user:{id}` lúc connect) ⇒ xoá cả `joined`
  lẫn `joinAll` là đúng; đừng chỉ xoá `joinAll` mà để `joined` lại.
  **Bẫy đo:** BE **local** đã có union emit ⇒ máy local **không tái hiện** được nhóm bug này; muốn
  chứng minh phải đo ở tầng WebSocket frame (công thức ở CHANGELOG SWEEP-0909) hoặc đo trên prod.
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
