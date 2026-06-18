# /verify-ui — Runtime UI Verification (Chrome DevTools MCP)

Mở trang thật trong Chrome, screenshot + đọc computed style / box model, report các lỗi alignment / centering / layout mà scan tĩnh không bắt được. **KHÔNG auto-fix — chỉ report** (giống `/check-tailwind`).

## Yêu cầu trước khi chạy

- Chrome DevTools MCP đã cài + tool `mcp__chrome-devtools__*` load được. Nếu chưa → báo user bật MCP (xem setup trong repo). Đừng đoán bằng cách đọc class.
- Dev server đang chạy. Nếu chưa → nhắc user `npm run dev`.
- MCP nặng context (~20k token) — chỉ bật cho task UI/visual, không để thường trực.

## How to invoke

```
/verify-ui <url>                          # verify 1 trang
/verify-ui <url> "<mô tả element>"        # tập trung vào 1 element / khu vực
/verify-ui <url> --login <user> <pass>    # trang sau auth: truyền test account LÚC GỌI
```

<!--
DESIGN DECISIONS — không thay đổi:
1. Report-only — KHÔNG edit. Tìm thấy lỗi → đề xuất task fix riêng, không tự sửa.
2. KHÔNG hardcode credentials trong file này (file commit vào repo). Auth truyền qua --login lúc gọi.
3. Verify bằng bằng chứng thật: box model + getComputedStyle, không đoán từ class.
4. Output format + summary giống /check-tailwind để nhất quán.
5. Bổ trợ /check-tailwind Check 7 (heuristic tĩnh) — đây là xác nhận runtime.
-->

---

## Protocol

1. Pre-check MCP tools + dev server (mục trên). Thiếu → báo và dừng.
2. Nếu có `--login`: navigate `/login` → fill user/pass → submit → `wait_for` redirect.
3. `navigate_page` → `<url>`. `take_screenshot` full page.
4. Có mô tả element → `take_snapshot`, định vị element đó. Không có → quét các hotspot ở Checks bên dưới.
5. Với mỗi element nghi ngờ: `evaluate_script` đọc `getComputedStyle` + box model (`width`, `height`, `display`, `position`, `transform`, `borderRadius`, `scrollWidth`/`clientWidth`).
6. Đối chiếu Checks → report. KHÔNG sửa.

## Checks (runtime)

### A — Icon button tròn bị oval

`borderRadius` = 9999px (rounded-full) mà `width !== height` → 🔴 oval. Phải `size-*` (w=h).

### B — Centering thật sự

Element định "căn giữa" (`flex items-center justify-center` / `grid place-items-center` / `mx-auto`) nhưng vị trí lệch so với parent → 🔴. Kiểm: parent đã có height ở trục chéo chưa; `mx-auto` đã có width + block chưa.

### C — Absolute centering thiếu translate

`position: absolute` + top/left 50% mà thiếu 1 trong 2 `translate` → lệch đúng nửa kích thước → 🔴.

### D — Layout shift / overflow

`<img>` thiếu `width`/`height` (rủi ro CLS) → 🟡. Element tràn parent (`scrollWidth > clientWidth` ngoài ý muốn) → 🟡.

### E — Icon méo

Lucide icon trong nút bị co lệch (width ≠ height kỳ vọng) do thiếu `shrink-0` → 🟡.

> Chuẩn tham chiếu: `.ai/context/styling.md` → "Centering & Alignment".

---

## Output Format

```
[🔴 OVAL]    /profile/17 — modal close button: rounded-full, w=40 h=32 (dùng size-*)
[🔴 OFFSET]  /checkout — summary block: flex items-center nhưng parent không có height
[🔴 ABS]     /        — overlay thiếu -translate-y-1/2 → lệch dọc
[🟡 CLS]     /        — product card <img> thiếu width/height
[🟡 ICON]    /orders  — status icon thiếu shrink-0
```

Nếu sạch:

```
[✅ OK] <url> — không phát hiện lỗi alignment/layout
```

## Summary (luôn kết bằng)

```
── UI Verify Summary ───────────────────────────
  URL verified       : <url>
  Screenshots        : N
  🔴 Oval/offset/abs : a
  🟡 CLS/overflow    : b
  🟡 Icon distort    : c
  Total issues       : a+b+c
  → Có lỗi? Tạo task fix riêng (command này report-only, không sửa).
────────────────────────────────────────────────
```
