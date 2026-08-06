# Context-System Backlog — việc còn lại của đợt audit `.ai/`

> Cập nhật: 2026-08-04 · Chủ đề: **bộ context cho agent** (`.ai/`, `.claude/`, `.codex/`,
> `.agents/`), KHÔNG phải backlog sản phẩm FE. Backlog sản phẩm → `snapshot.md`.
> `/sweep` **không** đọc file này (backlog source của nó chỉ là `snapshot.md` +
> `../.agent-local/frontend-handoff.md`) — muốn làm việc ở đây thì gọi tay.

> **ĐÃ ĐÓNG 2026-08-04 — không còn việc.** Giữ lại làm sử liệu: nó ghi *tại sao* bộ context có
> hình dạng hiện tại, thứ mà diff không nói được. Muốn rà lại drift thì chạy `/sync-context`,
> đừng làm tay như đợt này.

Đợt audit 2026-08-03/04 đã đóng **toàn bộ** batch: **A + B + C1 + C2 + C3 + C4 + C5 + C6 + D1 +
D2 + D3 + D4 + E**.

---

## Đã xong (để khỏi làm lại)

| Batch | Nội dung | Kết quả |
|---|---|---|
| **A** | 9 mâu thuẫn nguy hiểm trong doc (doc bảo agent phá code đúng) | Đã sửa. Lớn nhất: luật `renderHook` wrapper ở `testing.md` + `add-test.md` + `review.md` |
| **B** | Path/name drift toàn `.ai/` | 28× `frontend/src`→`src`; `hooks/queryKeys.ts`→`hooks/query/queryKeys.ts`; `hooks/useAuth.ts`→`hooks/auth/useAuth.ts`; `CartContext.tsx:22`→`AuthContext.tsx:22`; xoá 4 model footer stale |
| **C1** | Prune `snapshot.md` | 67.150 B → 9.044 B (−86,5%). Bản gốc: `git show HEAD:.ai/agent-handoff/snapshot.md` |
| **C2** | Trim `project.md` (always-loaded) | −74 dòng |
| **D1** | `.ai/context/domain.md` (2026-08-04) | Đã viết, on-demand, đã thêm dòng vào Context Map. Mọi khẳng định verify từ code — phát hiện kèm 1 drift thật (`PaymentResultPage` regex `/^\d+$/`) đã ghi vào `snapshot.md`. **Chẩn đoán lúc đó SAI CHIỀU** — ghi là "regex không khớp `ord_` → id bị rơi", thật ra BE gửi id **số**, regex **nhận**, rồi FE ship link chết. Chỉ đọc code FE thì ra kết luận ngược; đã sửa 2026-08-04 sau khi bắn request thật (CHANGELOG `payment-result-orderid`) |
| **D3** | `.ai/context/pitfalls.md` (2026-08-04) | 13 mục, on-demand, đã vào Context Map; `snapshot.md` rút còn pointer. Kéo theo 1 fix code thật: `npm run build` không typecheck → 3 lỗi TS tồn đọng, đã sửa |
| **D4** | Mục E2E trong `.ai/testing.md` (2026-08-04) | Bảng quyết định e2e-vs-unit, prerequisite, e2e **không** thuộc gate, quy ước tên spec. Trỏ sang `e2e/README.md` thay vì chép |
| **C4** | Tách `CHANGELOG.archive.md` (2026-08-04) | `CHANGELOG.md` 173.758 → 89.739 B (−48%); phần trước 2026-07-10 dời nguyên văn, pointer hai chiều |
| **E** | `/sync-context` + `/e2e` (2026-08-04) | 2 workflow canonical + 2 adapter `.claude/commands/`, đã vào bảng Slash Commands. `/sync-context` chính là 7 check của C3, viết thành lệnh lặp lại được |
| **C3** | Rà dead content bằng chính `/sync-context` (2026-08-04) | **CLEAN.** 136 path `src/`, 65 tên PascalCase, 23 tên hàm, mọi npm script, bảng 31 route, mapping command/agent ba chiều — resolve hết. 15 path chết chỉ nằm trong changelog = đúng thiết kế |
| **D2** | Mở rộng `.ai/context/backend-api.md` (2026-08-04) | Chỉ đào sâu lớp **Common Types**; bắt được drift thật: enum `OrderStatus` ghi 6 giá trị trong khi code có 9 |
| **C5+C6** | `.claude/settings.json` (2026-08-04, **user dán tay** — agent bị deny) | `Edit(.claude/context/**)` → `Edit(.ai/**)` (hết phải approve tay mỗi lần sửa doc) · +4 deny (`git checkout*`, `git clean*`, `curl *`, `Invoke-WebRequest*`) · gỡ `tsc` khỏi Stop hook vì gate `build` đã lo |

**Always-loaded hiện tại: 12.627 B ≈ 3,5k token/session** (đo lại cuối đợt 2026-08-04)
(`.claude/CLAUDE.md` 539 + `.ai/project.md` 5.929 + `.ai/context/core.md` 6.159).
Tăng 388 B so với đầu đợt — toàn bộ nằm ở `project.md`: 1 dòng Context Map (`pitfalls.md`)
+ 2 dòng Slash Commands (`/sync-context`, `/e2e`). Ngưỡng cảnh báo trong `/sync-context` check 7
là ~15 kB; baseline ghi ở đó là 12.239, **cập nhật thành 12.627**.
`domain.md` (12.165 B), `pitfalls.md` (9.414 B), `backend-api.md` (35.862 B) đều **on-demand**,
không cộng vào con số này.

---

## D1 · `.ai/context/domain.md` — ✅ XONG 2026-08-04

File đã tồn tại, on-demand, đã có dòng trong Context Map. Phủ: order state machine (9 status,
ai đẩy transition nào) · return/refund `rr_` · voucher F3 · payment/cart-consumption/idempotency
· shipping fee GHN · stock check · role × màn hình + field private · admin moderation
(post reports + product risk).

**Nợ của D1 — trả một nửa, còn một nửa (không chặn):** D2 đã đối chiếu **tập status** với backend
contract (`backend-api.md` giờ ghi đủ 9, khớp `src/types/order.ts` + `ORDER_STATUS_META`). Cái
**chưa** làm được: ma trận transition nào backend thực sự cho phép. FE chỉ quan sát được những
transition nó gọi ra, không thấy guard phía server; muốn chốt phải đọc source order-service
hoặc thử từng transition trên backend sống. Để nguyên trạng — `domain.md` đang mô tả **FE view**
và đã nói rõ như vậy.

---

## D2 · Mở rộng `.ai/context/backend-api.md` — ✅ XONG 2026-08-04

**Chốt phạm vi (câu hỏi "mở rộng tới đâu thì dừng"):** đào sâu **chỉ lớp `Common Types`** — thứ
áp cho cả ~60 endpoint. **Không** thêm chi tiết per-endpoint: đó đúng là cái làm file phình, và
agent muốn biết cách gọi thì đọc `.ai/api-reference.md`, muốn biết luật nghiệp vụ thì đọc
`domain.md`. Luật này đã viết thành block "Scope rule" ngay đầu `backend-api.md` để session sau
không phá.

Đã thêm 4 mục sau `### Error Response`, mọi khẳng định verify từ `src/api/client.ts`,
`src/types/common.ts`, `src/components/shared/ApiErrorState.tsx`:

- **FE thực sự nhận `ApiError`, không phải body trên wire** — `client.ts:33-36` bọc lại; `status`
  là **number** ở FE nhưng là chuỗi `"error"` trên wire; `message` khai kiểu `string` nhưng NestJS
  trả `string[]` khi validate lỗi (3 call site đã phòng thủ sẵn: `postModeration.ts:74`,
  `productRisk.ts:69`, `AddressFormModal.tsx:250`).
- **Bảng status taxonomy** 0/401/403/404/409/422/429/502/503 theo `ApiErrorState.tsx:34-44` —
  kèm cảnh báo `400` **không** được map, nó hiện trần.
- **Phân trang + hard cap** — 1-indexed; `limit` cap 100 → trả `400` chứ không clamp; batch id cap
  50; tin `totalPages`/`hasNext`; `toQuery()` bỏ `undefined`/`null`/`''`; status-counts không
  scope theo trang.
- **"optional" trong file này nghĩa là gì** — 2 bảng: request DTO (vắng / `null` / key lạ bị
  `whitelist` nuốt) và response (`T|null` / thiếu hẳn / DECIMAL về dạng chuỗi).

**Drift bắt được:** enum `OrderStatus` trong file ghi **6** giá trị, code có **9** (thiếu
`confirmed`, `return_requested`, `refunded`). Agent tin bảng cũ sẽ viết `switch` không exhaustive.
Đã sửa + trỏ sang `src/lib/domain/orderStatus.ts` làm nguồn FE.

## D3 · `.ai/context/pitfalls.md` — ✅ XONG 2026-08-04

**Quyết định đã chốt: file riêng** (không nhét vào `conventions.md`). Lý do: `conventions.md`
trả lời "viết đúng thế nào", pitfall trả lời "cái gì nói dối bạn trong im lặng" — hai câu hỏi
khác nhau; và danh sách này sẽ dài ra sau mỗi sweep, nhét vào `conventions.md` sẽ phình một file
vốn được load cho mọi task form/component.

13 mục, on-demand, đã có dòng trong Context Map. Ngoài 4 hạt giống ban đầu còn thêm: batch
product id cap 50 · tiền về dạng chuỗi decimal · public id vs guard `/^\d+$/` · `renderHook`
wrapper · envelope `{ data }` của MSW · `vite build` không typecheck · socket.io bắt tay polling
· dev build react-router lọt bundle prod · `useResetOnChange`.
Mục "Pitfall đã trả giá" trong `snapshot.md` đã rút còn một dòng trỏ sang.

**Phát sinh trong lúc làm (đã fix, không còn nợ):** chạy `npx tsc --noEmit` để lấy bằng chứng
cho mục 9 thì lòi ra `npm run build` **không hề** typecheck — 3 lỗi type thật đã nằm im từ
2026-07-22. Đã sửa script + 3 lỗi, gates xanh lại. → `CHANGELOG.md` entry `build-typecheck`.
Đây đúng là loại lỗi batch A nhắm tới (doc khẳng định một điều về khâu verify mà code không làm),
và là lý do nguyên tắc "verify từ code thật" phải áp cả cho **lệnh**, không chỉ cho path/API.

## D4 · Hướng dẫn e2e — ✅ XONG 2026-08-04

`.ai/testing.md` có mục "E2E (Playwright)": bảng quyết định e2e-vs-unit, lệnh chạy, 2 prerequisite
mà agent **không tự sửa được** (`npx playwright install chromium` cần user; backend phải sống ở
:3000) + khẳng định rõ **e2e không nằm trong gate**, quy ước đặt tên `*.buyer/*.shop.spec.ts` để
ăn storageState, `workers: 1` là cố ý, và 2 thứ trông như fail mà không phải (spec đỏ đúng ý đồ ·
`test.skip` = thiếu data).

Chi tiết vận hành **không** chép lại — trỏ sang `e2e/README.md` (đã tốt sẵn, chỉ thiếu người dẫn
tới). Ghi thêm một constraint chưa ai viết: `e2e/` ngoài `tsconfig.include` ⇒ code e2e **không**
được typecheck bởi gate.

## E · Command mới — ✅ XONG 2026-08-04

Cả hai theo đúng khuôn cũ: body canonical ở `.ai/workflows/`, adapter mỏng ở `.claude/commands/`
(chỉ `@`-import), một dòng trong bảng Slash Commands của `project.md`.

- **`/sync-context`** (`.ai/workflows/sync-context.md`) — 7 check: dead path · dead symbol (kèm
  ghi chú "sẽ có false positive, phải triage tay") · route table vs `router.tsx` **hai chiều** +
  `requiredRole` · command/agent ba chiều · **lệnh mà doc bảo chạy** · ví dụ stale · ngân sách
  always-loaded (baseline 12.239 B). Scope loại trừ `CHANGELOG*.md` — đó là **sử liệu**, path
  đúng-hồi-tháng-6 mà nay mất là đúng, không phải stale.
  Check 5 là check bắt được bug lớn nhất đợt này, nên nó ghi rõ phải verify **hai** thứ: script có
  tồn tại **và** doc mô tả đúng thân script.
  Kết luận file có một dòng cố ý: **"Fix the code instead" là lựa chọn thật** — doc đúng ý đồ mà
  code trôi thì sửa code, như vụ `build`-typecheck.
- **`/e2e`** (`.ai/workflows/e2e.md`) — thủ tục thôi: quyết định để ở `testing.md`, vận hành để ở
  `e2e/README.md`. Bảng kết quả **ba** outcome (Pass / Fail / **Skipped ≠ pass**), checklist 6 điểm
  khi viết spec mới, và nhắc `e2e/` không được gate typecheck.

---

## C4 · Archive `CHANGELOG.md` — ✅ XONG 2026-08-04

**Đề nghị ban đầu sai tiền đề:** "cắt phần trước 2026-06" sẽ cắt được **0 dòng** — entry cũ nhất
trong file là 2026-06-19, không có gì trước tháng 6.

Ranh giới thật đã dùng: file vốn **tự có sẵn** marker `# Archive — early-July sweeps` ở dòng 1186.
Cắt từ đó xuống hết.

- `CHANGELOG.md`: 173.758 B / 1.950 dòng → **89.739 B / 1.192 dòng** (−48%).
- `CHANGELOG.archive.md` (mới): 85.118 B / 777 dòng — sweep 2026-07-05 → 07-09 + toàn bộ
  P0/P1/P2/P3-01 tháng 6 + log runtime-audit + dữ liệu test. **Dời nguyên văn, không sửa chữ nào.**
- Pointer hai chiều: cuối `CHANGELOG.md` trỏ xuống archive, header archive trỏ ngược lại; header
  `CHANGELOG.md` và `.ai/README.md` ghi mốc "trước 2026-07-10".
- `/sweep` không ảnh hưởng (chỉ đọc ~10 entry đầu, đều nằm lại ở file chính).

## C5 + C6 · `.claude/settings.json` — ✅ XONG 2026-08-04 (user dán tay)

Agent không sửa được file này (`Edit(.claude/settings.json)` nằm trong chính deny list của nó),
nên patch được soạn sẵn và **user dán đè**. Đã verify bằng cách đọc lại file: cả 3 thay đổi có mặt.

### C5 — Stop hook chạy `tsc` sau mọi turn → **đã gỡ**

`hooks.Stop[0].hooks[0]` cũ: `npx tsc --noEmit 2>&1 | tail -20`, timeout 30s, chạy kể cả turn chỉ
sửa markdown (như nguyên đợt audit này).

Gỡ vì hook này sinh ra để **bù** cho việc `npm run build` không typecheck — mà D3 đã vá đúng chỗ
đó (`"build": "tsc --noEmit && vite build"`). Giữ lại thì mỗi turn markdown vẫn trả 30s cho một
check đã có gate lo. Command notify PowerShell giữ nguyên; `_comment` sửa lại cho khớp thực tế.

### C6 — Khoảng trống permission → **đã vá** (đọc file xác nhận 2026-08-04)

- **Allow-list trỏ vào layout đã chết.** Có `Edit(.claude/context/**)` nhưng thư mục đó **không
  còn** (`.claude/` giờ chỉ có `CLAUDE.md`, `agents/`, `commands/`, `settings*.json`). Guidance
  dời sang `.ai/` mà **không ai thêm `Edit(.ai/**)`** ⇒ mọi lần sửa doc đều phải approve tay.
  Gap thật, gây ma sát suốt đợt này.
- Deny thiếu 2 lệnh phá working tree: `Bash(git checkout*)`, `Bash(git clean*)` — đều xoá được
  công việc chưa commit mà không hỏi lại.
- Deny thiếu đường exfil: `Bash(curl *)`, `Bash(Invoke-WebRequest*)`.

### Kết quả — 3 thay đổi, đã áp dụng

`Edit(.claude/context/**)` → **`Edit(.ai/**)`** · thêm 4 dòng deny (`git checkout*`, `git clean*`,
`curl *`, `Invoke-WebRequest*`) · gỡ command `tsc` khỏi Stop hook.

Toàn văn file sau khi vá: đọc thẳng `.claude/settings.json` — không chép lại vào đây, chép là tạo
thêm một nguồn nữa để trôi (đúng loại lỗi batch B).

## C3 · Dead content — ✅ XONG 2026-08-04 · **CLEAN**

Rà bằng chính `/sync-context` vừa viết ở E (chạy tay từng check, đúng thứ tự trong file đó).

| Check | Đối tượng | Kết quả |
|---|---|---|
| 1 | 136 path `` `src/...` `` được doc trích dẫn | resolve hết |
| 2 | 65 tên PascalCase + 23 tên hàm | tồn tại hết (sau khi loại false positive: prose, mã lỗi TS, khái niệm phía backend) |
| 3 | 31 route vs `src/router.tsx` | khớp hai chiều, `requiredRole` đúng |
| 4 | Slash command / agent: `project.md` ↔ `.ai/workflows|roles/` ↔ `.claude/commands|agents/` | ba bên khớp |
| 5 | Mọi `npm run *` doc nhắc tới | tồn tại — sau khi D3 đã vá `build` |
| 7 | Ngân sách always-loaded | 12.627 B (đo lại cuối đợt), chưa vượt ngưỡng 15 kB |

15 path chết duy nhất tìm được **chỉ nằm trong `CHANGELOG*.md`** — đúng theo thiết kế, `/sync-context`
loại changelog khỏi scope. `ApiErrorContext` (lo ngại ban đầu của C3) là một trong số đó: đã bị gỡ
khỏi mọi doc guidance từ batch B, chỉ còn dấu vết trong sử liệu.

---

## Ghi chú cho session mới

- **Hết việc.** File này giờ là sử liệu, không phải backlog. Đừng mở nó ra tìm việc — mở
  `snapshot.md` (backlog sản phẩm) hoặc chạy `/sync-context` (rà drift).
- Thay đổi đợt này gần như toàn bộ là **markdown dưới `.ai/`**, chưa commit
  (`git diff --stat -- .ai/`). Ngoại lệ duy nhất chạm `src/`+`package.json`: fix `build-typecheck`
  ở D3 (4 file — `package.json`, `src/lib/realtime/socket.ts`, `src/types/inventory.ts`,
  `src/features/product/CreateProductPage.tsx`).
- Nguyên tắc đã dùng và nên giữ: **mọi khẳng định trong doc phải verify từ code thật trước khi
  viết**. Batch A sinh ra chính vì doc từng chép lại giả định thay vì đọc file. D3 mở rộng thêm:
  khẳng định về **lệnh** (`npm run X` làm gì) cũng phải mở `package.json` ra đọc, đừng tin doc —
  đó chính là cách bắt được `build` không typecheck. Nguyên tắc này giờ đã đóng gói thành
  `/sync-context` check 5 — chạy lệnh đó thay vì làm lại bằng tay.
- **Chạy `/sync-context` sau mỗi đợt refactor lớn.** Toàn bộ batch A+B là hệ quả của việc không có
  ai rà drift trong nhiều tháng. Lần rà kế tiếp tốn vài phút chứ không tốn hai session.
- Handoff files (`frontend-handoff.md`, `backend-handoff.md`, `test-accounts.md`) nằm ở
  `MCR/` workspace root, ngoài repo — không bao giờ commit.
