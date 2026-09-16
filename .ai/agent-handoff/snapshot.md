# Snapshot — TryBuy Frontend Current State

> Cập nhật: 2026-09-16 · Phạm vi: frontend social + e-commerce (ưu tiên e-commerce).
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

**Gates (chạy lại + verify 2026-09-16):** `npm run build` ✓ · `npm run lint` 0 problem ·
`npm run test:run` **1083 test / 132 file**, all pass. Không đóng item nào khi 3 lệnh này chưa xanh.

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
| 2026-09-16 | **CONFIRM-PAD-01 + DOC-STALE-0916 · title `ConfirmDialog` chui dưới nút X, và dọn "CHƯA push" đã cũ** (class **A** thuần FE). Bắt được trên prod bằng Chrome DevTools MCP ở luồng admin đổi vai trò: title dài wrap xuống rồi chạy dưới chữ X. **Đo ra số chứ không cảm tính:** `DialogContent` `p-6` (24px) + nút đóng neo `right-4 top-4` với icon 16px ⇒ mép trái X cách mép phải 32px, khung title dừng ở 24px ⇒ **chồng 8px**; title ngắn thì không lộ nên lỗi sống qua cả 8 consumer. Vá bằng `pr-6` trên `DialogTitle` **ở phía consumer** — `src/components/ui/` write-blocked, và title là prop do caller truyền nên primitive không tự chừa góc được; có comment ghi lại phép đo tại chỗ. Test pin `keeps the title clear of the close button` dựng đúng title đã thấy trên prod. Phần doc: 8 dòng "CHƯA push"/"HOLD class C" đã sai từ lúc `2c65b1d` + `api` `87fc2f8` lên sóng — **chính mấy dòng đó làm tôi loại nhầm 3 tính năng khỏi tài liệu dùng thử chiều nay**, nên sửa hàng ở đây, thêm banner ✅ RELEASED đầu `CHANGELOG.md` (giữ nguyên văn các câu cũ — chúng là ảnh chụp lúc viết), và trim bảng này về 5 hàng như convention. +1 test → **1083 test / 132 file**. |
| 2026-09-16 | **ALIAS-ALPHA-01 · 265 class `/NN` trên alias `var()` đang chết im, swap sang token hex literal** (class **A** thuần FE, chỉ đổi tên class trong `className`; **đã push + released 2026-09-16**). Tailwind v3 cần `<alpha-value>` mới chèn được alpha; `canvas-*`/`ink-*`/`bdr`/`accent-{pri,sec,cyan,green,red,amber}` map ra `var(--…)` trần nên gặp `/NN` là nó **bỏ luôn cả class** — border/tint biến mất mà build, lint, test, TS đều xanh. **Chứng minh trước khi sửa, không suy luận:** build baseline rồi `grep -oF` trong `dist/assets/*.css` — `accent-amber\/50` **0** hit, `canvas-surface\/85` **0**, `ink-pri\/70` **0**, trong khi `tb-amber\/50` 4 và `white\/70` 1. **Né bẫy 92-file của 2026-08-14:** script viết ra **file** (không `node -e` qua bash), regex có biên hai đầu (`(?<=-)alias(?=/\d)` ⇒ alias trần như `text-accent-amber` không bị đụng), 11 case self-test **gate việc ghi** (gồm idempotence `bg-tb-amber/50` và miễn trừ hex literal `bg-accent-violet/20`), chạy dry-run trước `--write`; sau đó đối chiếu `git diff --stat` = 56 file / 196 dòng đổi và lọc mọi dòng `+` không nằm trong class string ⇒ rỗng. **`ink-pri` (#FFFFFF) không có token `tb-*`** — bảng map của Check 8 thiếu hẳn ô này; chọn `white/NN` (đã có sẵn 5 site: `LoginPage.tsx:51`, 4 ở `PostCard.tsx`) thay vì đẻ token `tb-white` mới: diff tối thiểu, không đụng config lẫn doc. Luật "`text-white` không được dùng" trong `tokens.md` nói về ca **đặc** (ở đó `text-ink-pri` chạy tốt), không áp được cho ca alpha vì ở đó **không alias nào** chạy. **Test không phải unit suông:** `src/test/aliasAlpha.ts` (detector thuần) + `aliasAlpha.test.ts` quét **cả `src/`** bằng `import.meta.glob('../**/*.{ts,tsx}', {query:'?raw', eager:true})` — chọn glob thay `node:fs` vì `src/` không có `@types/node` (đã thử, `tsc` gãy TS2591) và vì `import.meta.url` **không phải** file: URL dưới jsdom; đã tự chứng minh guard **fail đúng** bằng cách thả một file mồi vào `src/` rồi xoá. **Verify runtime (Chrome DevTools MCP, dev server):** ô username focus render `rgba(245, 158, 11, 0.5)` — đúng #F59E0B@50%, trước đây class này không sinh khai báo nào nên nó giữ `rgb(39,39,42)`; đọc thẳng `document.styleSheets` thấy 44 rule alpha hợp lệ trên riêng route `/login`. CSS bundle 52 971 → 55 250 byte (+2 279 byte khai báo trước đây không tồn tại). +7 test / +1 file → **1082 test / 132 file**. |
| 2026-09-16 | **ROLE-ADMIN-01 (tokenRole) · guard FE bám JWT thay vì hàng DB, + banner cho đúng người bị đổi vai trò** (class **B** thuần FE — old FE vẫn chạy được, chỉ là vẫn lỏng; **đã push + released 2026-09-16**). Đóng đúng món nợ mở từ 2026-09-15: `ProtectedRoute`/`useRole` đọc `/user/me` (DB-fresh) trong khi guard BE enforce `role` **nướng trong JWT** ⇒ người vừa được nâng cấp mà chưa re-login vào được `/sell` rồi 403 lúc submit. BE trả thêm `tokenRole` + `isRoleStale`. **Quyết định gate đi qua đúng một hàm:** `sessionRole(me) = me.tokenRole ?? me.role.name` + `hasStaleRole(me)` ở `lib/auth/roleAccess.ts`, `ProtectedRoute` và `useRole` cùng gọi ⇒ `useRole().roleName` **giờ là vai trò của phiên**, nên rail/menu/nút bán hàng đổi theo mà không phải sửa từng chỗ. **`?? role.name` không phải phòng thủ thừa — bỏ nó là gãy seller ngay sau khi đăng nhập:** `useAuth.loginSuccess` seed cache `auth.me` bằng **response của `/login`**, mà route đó **cố ý không** có `tokenRole` (token vừa mint, không thể lệch) ⇒ gate cứng theo `tokenRole` cho ra `undefined` và đá shop khỏi `/sell` tới lần refetch đầu; fallback cũng lo gateway cũ hơn đợt rollout, cả hai ca đều có test pin. **Banner `components/layout/RoleStaleBanner.tsx`** đặt trong `AppShell` (**cả hai** nhánh `fixedHeight` + thường) nên hiện ở mọi trang đã đăng nhập; `role="status"`, **không cho tắt** — mismatch là **trạng thái** kéo dài tới khi đăng nhập lại chứ không phải sự kiện thoáng qua — và tự biến mất sau re-login; câu chữ gọi tên **cả hai** vai trò qua `roleStaleNotice()` (test cấm chữ "đã có hiệu lực"/"đã cấp quyền"). **Cố ý KHÔNG làm mục 4 của entry BE** (ép logout khi `isRoleStale`): banner có nút "Đăng xuất" (gọi `logout` của AuthContext → clear cache + broadcast sang tab khác), người dùng tự quyết thay vì bị văng giữa lúc điền form. **DRY:** `ROLE_LABELS`/`roleLabel()` dời `features/admin/userRole.ts` → `lib/auth/roleLabels.ts` (layout không được import từ feature folder), `AdminPage` chỉ đổi đường import — banner admin **giữ nguyên** đúng như entry dặn. **Né sẵn bẫy `/NN` trên alias:** banner dùng `tb-amber/10|30|40|70` chứ không `accent-amber`, và chứng minh bằng `grep -o -F` trong `dist/assets/*.css` sau build (2/2/2/1 hit) chứ không tin mắt. **Verify runtime (Chrome DevTools MCP, full stack local, `roleprobe0915` + `testadmin`, đã trả role về `user` và logout):** `user`/`user` ⇒ không banner · nâng lên `shop` trên cookie cũ ⇒ `tokenRole:"user"` + `isRoleStale:true`, banner hiện đúng chữ, **`/sell` redirect về `/`** và rail không còn link seller · re-login ⇒ `tokenRole:"shop"`, banner mất, `/sell` mở được · hạ về `user` trên cookie `shop` ⇒ banner hiện lại nhưng `/sell` **vẫn vào được** (đúng — token mới là thứ API honour). Console sạch (chỉ 401 `/user/me` sau logout). **Hai thứ harness đáng nhớ:** (1) gotcha `window.confirm` của ROLE-ADMIN-01 **hết hiệu lực** — CONFIRM-UI-01 đã thay bằng `ConfirmDialog`, MCP lái `fill_form` → click "ĐỔI VAI TRÒ" bình thường, không cần Playwright; (2) MCP giữ được **2 phiên song song** bằng isolated context (`isolatedContext=probe`), nhờ vậy mới dựng được cảnh "admin đổi role **trong khi** phiên của nạn nhân đang sống" — một context thì cookie đè nhau. +19 test / +2 file → **1075 test / 131 file**. |
| 2026-09-16 | **CONFIRM-UI-01 · modal xác nhận thay `window.confirm` ở cả 7 chỗ + luật cấm dialog của trình duyệt** (lớp **A** thuần FE; **đã push + released 2026-09-16**). User xin modal xác nhận cho luồng đổi vai trò, rồi xin luôn **luật** cấm "UI dạng alert" kèm ảnh chụp hộp `localhost:5173 says` ⇒ làm hết: sau lượt này `src/` có **0** lần gọi `window.confirm`/`alert`/`prompt`. **Lý do là kỹ thuật, và repo đã trả giá đúng một lần:** ROLE-ADMIN-01 không verify được qua Chrome DevTools MCP vì `window.confirm` bị auto-suppress ⇒ luôn `false`, phải đổi sang Playwright; cộng thêm hộp thoại native không ăn token nào, block main thread, và **không thể** hiện pending/error. **Lookup order chạy đúng trước khi tạo file:** `ui/dialog.tsx` có nhưng write-blocked, `shared/` không có confirm, `AddressesPage.tsx` thì **đã tự chế sẵn một cái** ⇒ DRY–UI bắt đẩy lên `components/shared/ConfirmDialog.tsx`, và migrate `AddressesPage` là **phần của việc** chứ không phải scope creep. Hai quyết định đáng giữ trong component: `isPending` khoá **cả Esc + overlay** (không thì Esc lúc request đang bay làm dialog biến mất trong khi mutation vẫn ghi), và `error` render **trong** dialog + **không đóng** khi confirm thất bại. **Bẫy lớn nhất của đợt migrate:** 2 chỗ `confirm` nằm **giữa một `await`** (`CreateProductPage.onSubmit`, `VoucherConsole.VoucherForm.onSubmit`) — modal không await được ⇒ tách handler làm hai nửa, nửa đầu `setPending…` rồi `return`, nửa sau là hàm riêng (`submitProduct(draftMode)` / `persist(form)`) do `onConfirm` gọi, và pending state **mang theo** dữ liệu nửa sau cần (đọc lại `form.getValues()` lúc confirm là mời một race). **Đóng dialog ở `onSettled` hay `onSuccess` là quyết định theo từng chỗ:** `AdminPage` đóng ở `onSettled` (lời từ chối của BE đã có banner trên bảng, giữ dialog là in hai lần), còn `AddressesPage`/`ShopPage`/`VoucherConsole` đóng ở `onSuccess` và **giữ** dialog khi lỗi vì trang không có chỗ khác để nói — `ShopPage` nhân đó bỏ hẳn `alert()` trong `onError`. Copy tách hai khe: `roleChangeConfirmText()` → `roleChangeConfirmTitle()` + `ROLE_CHANGE_CONFIRM_BODY`; câu re-login vẫn nói **hai lần** (description + banner). Luật ghi 3 chỗ, mỗi chỗ một vai: `core.md` (hard rule + thứ tự `ConfirmDialog` → reuse → dựng mới), `.ai/workflows/review.md` §10 (2 checklist, 1 dòng 🔴, có `> Rule source:`), `.ai/context/styling.md` §Modal / confirm (bảng quyết định + khung chuẩn + cảnh báo `tb-*` chứ không `accent-*` cho nút danger). Test: `ConfirmDialog.test.tsx` 7 test; `AdminPage.userRole.test.tsx` bỏ `confirmSpy`, pin được thứ hồi native **không** kiểm được — modal hiện đúng câu hỏi + hệ quả **trước khi có request nào** (`bodies` rỗng), Hủy thì `<select>` về role cũ — và thêm test "nâng lên `admin` cũng phải hỏi". +9 test / +1 file → **1056 test / 129 file**. **Chưa verify runtime lượt này**, nhưng nợ đó nay rẻ: modal là DOM thật, MCP click được bình thường. |
| 2026-09-16 | **ROLE-ADMIN-01 (dư nợ FE) · 3 dòng: 2 class chết + 1 ô trống, và một guard tĩnh cho phần còn lại** (class **A** thuần FE; **đã push + released 2026-09-16**). `/sweep ROLE-ADMIN-01` dọn đúng những gì item đó tự ghi là nợ. **Đo trước khi sửa, không tin trí nhớ:** `npm run build` rồi `grep -o -F` trong `dist/assets/*.css` — `accent-amber\/50` **0** hit, `accent-amber\/15` **0** hit, `accent-red\/15` **0** hit; đối chứng `accent-violet\/20` (hex literal) 1 hit, `tb-red\/10` 3 hit, `accent-amber{` (không modifier) 4 hit ⇒ chứng minh alias `var()` + `/NN` = **class bị bỏ hẳn**, không phải "nhạt màu". (1) `SelectField.tsx` `focus:border-accent-amber/50` → `focus:border-tb-amber/50`; (2) badge role read-only ở `AdminPage.tsx` `bg-accent-red/15` → `bg-tb-red/15`, `bg-accent-amber/15` → `bg-tb-amber/15`; (3) cột USERNAME `{user.username}` → `{nonBlank(user.username) ?? '—'}`. **Không** làm theo gợi ý đã ghi sẵn trong snapshot (`userDisplayName(user)`): helper đó ưu tiên `name` ⇒ cột **nhãn là USERNAME** sẽ in "Bob Tran" cho hàng `usr_bob` — admin đọc cột này để **định danh tài khoản**, thay field khác vào là in sai thứ; test pin luôn cả hai chiều (`usr_blank` ra `—`, và `queryByText('Bob Tran')` **không** tồn tại). **CSS build ra không đổi một byte** (`index-C3vgEJGO.css` giữ nguyên hash) và đó là **bằng chứng**, không phải build hỏng: 3 class mới đã có sẵn consumer khác (`TextField`, `PaymentResultPage`, `CheckoutPage`, `AnalyticsDashboard`), còn 3 class cũ vốn **không sinh ra gì**. **Verify runtime** (full stack local `:5173` → gateway `:3000`, đăng nhập `testadmin` vì `admin1` là seed **prod-only**, local 401): bảng 19 hàng — `usr_p4wMRyPlPJkXY17b` in `—` chứ **không** in `name` của nó ("NAME-TRIM-01 probe account"), 18 hàng còn lại vẫn in username của chính mình; badge `testadmin` nền `rgba(239, 68, 68, 0.15)`; 2 hàng GHN read-only nền `rgb(28,28,30)`; viền focus select `rgba(245, 158, 11, 0.5)` + tìm được rule `.border-tb-amber\/50{border-color:rgba(245,158,11,.5)}`; `tableOverflows:false`, `bodyOverflows:false`; console chỉ còn đúng dòng autofill 17-field đã phân loại là non-bug. **Bẫy đo phải nhớ:** `getComputedStyle` ngay sau `.focus()` trả **màu frame 0** vì control có `transition-colors` — lần đầu đọc ra `rgb(39,39,42)` (viền `bdr` cũ) trông y như fix trượt; chờ ~400ms mới ra màu thật. **Phần lớn hơn cố ý KHÔNG làm trong lượt này:** cùng lỗi còn **249 site / 50 file / 34 class** khắp `src/` — diff tối thiểu không cho phép, và repo đã có tiền lệ một lần regex mass-convert làm hỏng 92 file ⇒ ghi thành item riêng ở §Còn lại phía FE, và đặt guard tĩnh ở nơi repo giữ luật class-level: `.ai/workflows/check-tailwind.md` **Check 8** (🔴, kèm pattern scan, bảng ánh xạ token, ghi chú `accent-violet`/`accent-blue` là hex literal nên **không** phải violation, và lệnh tự kiểm chứng `npm run build` + `grep -o -F`). **Không** viết test class-level: repo có **0** tiền lệ `toHaveClass`, luật kiểu này thuộc scan tĩnh chứ không thuộc unit test. Sửa ké doc drift cùng file: bảng Check 4 ghi `#06b6d4`/`#10b981` "no `tb-*`" trong khi `tb-cyan`/`tb-green` có thật (`tailwind.config.js:33,35`). Ghi nhận thêm: nhánh `shop` của badge read-only **không tới được lúc chạy** (`roleEditability()` chỉ khoá hàng của chính mình + role GHN) ⇒ sửa đúng token nhưng không demo được — xem §Còn lại phía FE. +1 test → **1047 test / 128 file**. |

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
