# CHANGELOG Archive — TryBuy Frontend

> Phần đuôi tách ra khỏi `CHANGELOG.md` ngày **2026-08-04** (C4) để file chính khỏi phình.
> Nội dung **không sửa gì**, chỉ dời nguyên khối từ dòng 1186 trở xuống.
>
> Phủ: các sweep đầu tháng 7 (2026-07-05 → 2026-07-09) và toàn bộ **P0 / P1 / P2 /
> P3-01** của đợt release-blocker tháng 6 (2026-06-19 → 2026-06-25), kèm log flow
> runtime-audit và dữ liệu test đã tạo. Tất cả đã DONE và đóng.
>
> Việc mới hơn → `CHANGELOG.md`. Trạng thái hiện tại → `snapshot.md`.
> **Không auto-load, không ai đọc file này trừ khi cần truy nguyên một thay đổi cũ.**


# Archive — early-July sweeps (2026-07-05 → 2026-07-09)

## Cleanup / hardening (archived)

### Best-effort Cloudinary delete — no unhandled rejection on 502/503/400/403 (2026-07-09, /sweep)

Integrates the delete-error-code half of the backend handoff "Image/video URL fields must be our
Cloudinary URLs + upload rate limits + delete error codes" (Open, 2026-07-07): backend now returns
`502` (Cloudinary auth/quota/5xx), `503` (network), or `400/403` (foreign/persisted id) from
`DELETE /upload/media`, distinct from a real `200 { result: "not found" }`.

- **Bug found:** every `deleteMedia` caller is fire-and-forget `void deleteMedia(id)` (orphan cleanup in
  `RichTextEditor`, `EditProfileModal`, `useProductForm`, `CreatePostModal`), but `request()` **throws**
  an `ApiError` on any non-2xx. So each failed cleanup (`502/503/400/403`) became an **unhandled promise
  rejection** — no `.catch()` was attached anywhere.
- **Fix:** `deleteMedia` (`lib/http/cloudinary.ts`) now catches internally and returns a typed
  `DeleteMediaOutcome` instead of rejecting — cleanup is best-effort, a failed delete just leaves an
  orphan. Return type widened `Promise<void>` → `Promise<DeleteMediaOutcome>`; all callers keep working
  (`void` ignores the value).
- **Pure helper** `lib/http/deleteMediaOutcome.ts` (test +8): `outcomeFromResult` maps the `200` body
  (`"not found"` → `not-found`, else `deleted`); `outcomeFromError` maps a thrown error by `statusCode`
  (`502/503` → `failed{transient:true}`; `400/403`/unknown → `failed{transient:false}`).
- Gates: `build` ✓ · `lint` 0 errors (23 warn) · `test:run` 55 files / **361** tests ✓.
- **Remaining (same handoff entry, low value):** `429` backoff on rapid signature requests — batch uploads
  cap at ≤10 files, well under the 60 req/60s signature limit, so not built. Runtime E2E of the delete-error
  path needs a live backend + forced Cloudinary 5xx (unreachable via normal UI — same constraint as UP-01…04).

### GHN structured address + per-user address book — FE DONE + runtime-verified (2026-07-09, /sweep)

Integrates the backend structured-address contract (handoff Open, 2026-07-01), replacing the 6 free-text
checkout address fields with GHN-code cascading dropdowns + a saved address book. Backend side was
runtime self-tested 10/10; FE build/lint/test all green (353). Layers added:

- **Types** (`types/address.ts`): `Province {id:number,name}`, `District`, `Ward {id:string (WardCode),name}`,
  `Address` (full row incl. GHN codes + names + `isDefault`), `CreateAddressDto`, `UpdateAddressDto`.
- **API**: `api/shipping.ts` (`getProvinces`/`getDistricts`/`getWards` — master-data proxy, no GHN token on
  client) wired into `api` as `api.shipping`; `api/users.ts` +5 address-book methods (`getAddresses`,
  `createAddress`, `updateAddress`, `setDefaultAddress`, `deleteAddress`) on `/user/me/addresses`.
- **Query keys**: `users.addresses` + a `shipping` tree (`provinces`, `districts(id)`, `wards(id)`).
- **Pure helpers** (`features/address/addressUtils.ts`, test +8): `pickDefaultAddress` (isDefault → first →
  null), `buildGhnShippingAddress` (compose the 6-part pipe string from the saved names, strip literal `|`),
  `formatAddressSummary`.
- **Hooks**: `useShippingLocations.ts` (`useProvinces`/`useDistricts`/`useWards`, cascading `enabled` gates,
  1h master-data staleTime); `useAddresses.ts` (list query + create/update/setDefault/delete mutations, all
  invalidate `users.addresses` since default flips ripple across siblings).
- **UI** (`features/address/`): `AddressSelect` (tb-styled native `<select>` — the app has no dropdown
  primitive and `ui/select.tsx` is edit-denied); `AddressFormModal` (Dialog: RHF+zod text fields + 3 cascading
  selects that reset children on parent change + isDefault, create/edit modes); `AddressBookPicker` (checkout
  radio cards, auto-selects the default once loaded, "＋ add" opens the modal and selects the new address);
  `AddressesPage` (`/addresses` manage page: list, default badge, set-default, edit, delete-with-confirm).
- **Wiring**: `/addresses` route (lazy) in `router.tsx`; a "Sổ địa chỉ" LeftRail link for logged-in users
  (kept out of the shared 5-item primary nav so the mobile bottom bar doesn't overflow).
- **CheckoutPage rework**: address form section → `<AddressBookPicker>`; `checkout.schema.ts` trimmed to just
  `paymentMethod`; shipping-fee preview now resets on selected-address change and composes the string via
  `buildGhnShippingAddress`; order-create `shippingAddress` uses the same (still the pipe NAME string — BE
  recomputes fee server-side). Voucher/stock/idempotency/pendingCheckout/payment logic untouched.
  `order/shippingAddress.ts` parser still works (pipe format preserved).

✅ Runtime-verified (2026-07-09, /sweep, Chrome DevTools MCP): logged in as user 17 → `/addresses` renders
(LeftRail "Sổ địa chỉ" link + existing default address); "Thêm địa chỉ" modal opens; GHN cascade loads live
(provinces → districts → wards) and resets children on parent change; created "Trần Thị B / 45 Lê Duẩn,
Phường Bến Nghé, Quận 1, Hồ Chí Minh" → new row appears immediately (create mutation + `users.addresses`
invalidation) → header "2 địa chỉ"; delete-with-confirm removes it → back to "1 địa chỉ". Test data cleaned up.

**Follow-up (2026-07-09): icon-button misalignment fix + doc rule.** AddressesPage edit/delete were raw
`<button className="size-8 ... grid place-items-center">` with no `p-0`, so UA button padding stretched the box
to ~44px and pushed the icon off-center → swapped to `<IconButton>` (now measured 32×32, padding 0). Root cause
was a misleading example in `styling.md` (its "good" icon-button sample omitted `p-0`/`IconButton`) — fixed that
example and added an always-loaded icon hard-rule to `core.md` so logic/feature tasks (which don't load
`styling.md`) still see it. This is the recurring "new icon button bị lệch" class of bug.

### F6 · Wishlist / favorites UI — FE DONE (2026-07-09, /sweep)

Integrates the backend wishlist endpoints (handoff Open, 2026-07-07): `GET /products/wishlist?page=&limit=`
(paginated envelope of `Product & {wishlistedAt}`), `POST /products/wishlist/:productId` (201, idempotent),
`DELETE /products/wishlist/:productId` (204, idempotent). Both mutations idempotent server-side → optimistic
UI is safe. Layers added:

- **Types** (`types/product.ts`): `WishlistItem extends Product { wishlistedAt }`, `WishlistToggleResult`.
- **API** (`api/products.ts`): `getWishlist` (tolerant of bare-array vs. envelope, same pattern as `getList`),
  `addWishlist`, `removeWishlist`.
- **Query keys** (`hooks/query/queryKeys.ts`): `products.wishlist` (list-level prefix), `wishlistList(page,limit)`,
  `wishlistIds`. The prefix invalidates both the page view and the membership id-set in one call.
- **Pure helpers** (`features/wishlist/wishlistCache.ts`): `wishlistIdSet` (build `Set<number>`, coerce
  bigint-string ids) + `toggleWishlistId` (immutable add/remove). Test `wishlistCache.test.ts` (+7).
- **Hooks** (`hooks/data/useWishlist.ts`): `useWishlistPage` (paginated page query), `useWishlistIds` (membership
  `Set<number>`, fetched once at `limit=200` — drives every heart's filled/empty state), `useToggleWishlist`
  (optimistic flip of the id-set cache with rollback onError, invalidate whole wishlist tree onSettled — mirrors
  the `useCart` optimistic pattern).
- **Shared button** (`components/shared/WishlistButton.tsx`): `IconButton` + Heart, reads `useWishlistIds` for
  state, fires `useToggleWishlist`. `preventDefault()`+`stopPropagation()` so it's safe nested inside a `<Link>`.
  `aria-pressed` + Vietnamese `aria-label`, Heart gets `fill-current` when wishlisted.
- **Page** (`features/wishlist/WishlistPage.tsx`, route `/wishlist` in `router.tsx`, lazy): paginated grid of a
  dedicated wishlist card (image/name/price + remove heart — no stock/add-to-cart because `WishlistItem` has no
  `inventory`, unlike `ProductWithInventory`), skeleton/empty (`HeartOff` + link to marketplace)/error states,
  `<Pagination>`.
- **Wiring**: `Header.tsx` gets a Heart `/wishlist` nav link (before Cart); `ProductCard.tsx` gets a heart overlay
  top-right of the image (placed AFTER the out-of-stock overlay so it stays clickable, `z-10`); `ProductDetail.tsx`
  replaces its dead placeholder Heart button with `<WishlistButton>` (removed now-unused `Heart` import).

Membership caveat documented in `useWishlist.ts`: the id-set fetches one 200-item page; a wishlist larger than that
would leave hearts on overflow items un-filled until the page view loads them. Acceptable for current scale.
Gates: `build` ✓ · `lint` 0 errors (23 warnings, all pre-existing) · `test:run` 53 files / 345 tests ✓.
**Runtime E2E còn nợ** — Chrome DevTools MCP không connect trong session này; backend + FE dev server đều live
(`GET /api/products/wishlist` → 401 auth-gated đúng như contract), cần login 1 tài khoản walk add/remove flow.

### Low-stock seller dashboard list — FE DONE + runtime-verified (2026-07-09, /sweep)

Integrates the backend low-stock entry (handoff Open, 2026-07-06); the endpoint
(`GET /inventory/low-stock`, role-scoped shop/admin, seller-auto-scoped, `availableStock`-ASC,
max 100) was already live with `inventoryApi.getLowStock` + `queryKeys.inventory.lowStock`
wired but nothing consumed it. Added a low-stock panel to `ShopPage.tsx`: a `useQuery` on
`queryKeys.inventory.lowStock` feeds a red-bordered card ("Sản phẩm sắp hết hàng") that renders
only when rows exist, each row linking to `/product/:id`, showing name, SKU, "Còn {availableStock}"
/ "Tối thiểu {minimumStock}", and an edit `IconButton`. Because `InventoryRecord` carries only
`sku` + `productId` (no product name) and its `id`/`productId` arrive as stringified bigints,
extracted the pure helper `buildLowStockRows(records, products)` (`src/features/shop/lowStock.ts`):
it `Number()`-coerces the ids, joins each record to the shop's product list by id for a display
name, **falls back to the SKU when the product isn't on the current page**, and defaults
`minimumStock` to 0. Tests: `lowStock.test.ts` (+5: name enrich, SKU fallback, bigint-string
coercion, minimumStock default, ASC-order preservation). Also stabilized `ShopPage`'s `products`
fallback with `useMemo(() => data?.data ?? [], [data])` — this both fed the new `lowStockRows`
memo a stable input and closed the pre-existing `react-hooks/exhaustive-deps` warning tracked in
snapshot ("ShopPage: stabilize `products` fallback"), dropping lint 24 → 23 warnings.
Runtime-verified via Chrome DevTools MCP: as `techstore_demo` (0 low-stock) the panel correctly
stays hidden and `GET /api/inventory/low-stock` returns `200 {data:[]}`; as `test1` (1 low-stock)
the panel renders row `SSSS_3663` "Còn 0 / Tối thiểu 0" with the SKU-fallback name (product off
current page) — confirming both states and the fallback path live, console clean. Gates: `build`
✓ · `lint` 0 errors (23 warnings) · `test:run` 52 files / 338 tests ✓.

### STY-addendum · Social icon props to convention — DONE + runtime-verified (2026-07-09, /sweep)

Closes the 🟢 STY-addendum sweep-audit finding (2026-07-07). Several social components used
string `size="18"` on Lucide icons (project rule requires numeric `size={n}`), were missing the
mandatory `shrink-0`, hardcoded `color="#fff"`, or used an inline `style` transform. Fixed across:
`PostCard.tsx` (Globe/Heart×2/MessageCircle/Share2 → numeric size + `shrink-0`; stats heart
container `w-5 h-5 inline-flex items-center justify-center` → `size-5 grid place-items-center`;
`color="#fff"` → `text-white`), `FeedPage.tsx` (end-of-feed PenLine container → `size-10 grid
place-items-center` + numeric size), `CreatePostModal.tsx` (Loader2×2/ImagePlus/Video → numeric
size + `shrink-0`), and `FollowListModal.tsx` (dropped inline `style={{transform:'translate(-50%,
-50%)'}}` for `-translate-x-1/2 -translate-y-1/2`, matching the shadcn dialog convention).
className/prop-only changes (no extractable logic → no unit test). Runtime-verified via Chrome
DevTools MCP: feed renders with all post icons (privacy Globe, verified checks, Thích/Bình luận/
Chia sẻ actions); the only console error is a pre-existing image 404 (broken Cloudinary data, not
a regression). Gates: `build` ✓ · `lint` 0 errors · `test:run` 52 files / 338 tests ✓.

### AN-01(a) · Analytics range-preset date logic extracted + tested — DONE + runtime-verified (2026-07-09, /sweep)

Closes part (a) of the 🟢 AN-01 sweep-audit finding (2026-07-07): the F4 `AnalyticsDashboard`'s
`applyRangePreset`/`toIsoDate` date math was inline and untested (violating the every-logic-ships-
a-test rule). Extracted `toIsoDate(date)` and `rangePresetDates(days, now = new Date())` into a
pure module `src/features/order/analytics/analyticsRange.ts` (`now` injectable for determinism);
`rangePresetDates` returns an inclusive `{from, to}` where `to` is today and `from` is `N-1` days
earlier, so a 7-day preset spans 7 calendar days. `AnalyticsDashboard.applyRangePreset` now calls
`onFiltersChange({ ...filters, ...rangePresetDates(days) })`. Tests: `analyticsRange.test.ts` (+5:
UTC slice, 7d/30d/90d spans, 1-day both-bounds-equal). Runtime-verified via Chrome DevTools MCP
(`/shop/analytics` as `test1`): clicking the 90-day preset fires `GET /api/order/seller/analytics
?interval=day&from=2026-04-10&to=2026-07-08` and the chart refetches — confirming the preset applies
`from`/`to` and the query key picks them up. Parts (b) `useAnalyticsFilters` export-from-component
and (c) recharts hex→`chartTheme.ts` remain open (lower priority). Gates: `build` ✓ · `lint` 0
errors · `test:run` 52 files / 338 tests ✓.

### Product image count capped at 10 in the UI — DONE (2026-07-09, /sweep)

Integrates the backend media entry "Media URLs … capped at 10 images" (handoff Open,
2026-07-07). The backend now `400`s when `imageUrls[]` on a product exceeds 10 entries, but
`useProductForm.addImages` had no client-side cap — a seller picking 11+ images would upload
them all and then hit a server error on save. Added pure helper `capFilesToLimit(currentCount,
files, max)` + constant `MAX_PRODUCT_IMAGES = 10` in `src/lib/http/uploadValidation.ts`, and
wired it into `addImages` (using the freshest count from `imagesRef`): a batch that would exceed
10 is truncated to what fits, the rest are dropped with a message (`"Tối đa 10 ảnh, đã bỏ qua N
ảnh"`), and an add when already at 10 is rejected outright (`"Tối đa 10 ảnh"`). `CreatePostModal`
already caps post images at `MAX_IMAGES = 4` (≤ 10), so no change there. Ownership `403` is a
no-op on the normal flow (FE only ever submits its own freshly-uploaded `secure_url`s); the
product-image cleanup caveat is already satisfied — persisted images carry `publicId === ''` and
`removeImage`/`clearImages` never `deleteMedia` them, so editing a product never destroys a
Cloudinary asset a past order's P2-02 snapshot may reference. Tests: `uploadValidation.test.ts`
(+5 for `capFilesToLimit`: fits-under, partial-drop, at-limit, over-limit clamp, `MAX_PRODUCT_IMAGES`
= 10). Runtime E2E (picking 11+ images) pending live backend. Gates: `build` ✓ · `lint` 0 errors ·
`test:run` 50 files / 328 tests ✓.

### Dead inventory/user API declarations removed — DONE (2026-07-09, /sweep)

Integrates the backend "Unused-API sweep" (handoff Open, 2026-07-06) which deleted a set of
unbounded/duplicate routes. Removed the now-dead FE client methods (none had a UI consumer,
verified by grep): `inventoryApi.getAll` (`GET /inventory`), `getBySku`, `getById`, `delete`,
`checkStock`, `reserveStock`, `releaseStock`, and `usersApi.getAll` (`GET /user/all`). Kept the
three live inventory routes (`create`, `getByProduct`, `update`) plus the now-hardened role-scoped
`getLowStock`; kept `usersApi.getPaginated` (admin list) and `getFeaturedSellers` (feed right-rail).
Stock checks already route through `productsApi.checkStock` (`GET /products/:id/stock-check`).
Dropped the now-unused `StockCheckResponse` import. No standalone `/products/:id/skus` mutation
methods existed FE-side (the canonical `PATCH /products/:id` with `skuList` is what's used), so
nothing to remove there. Pure deletion of dead code — no test needed. Gates: `build` ✓ · `lint`
0 errors · `test:run` 50 files / 328 tests ✓.

### CLS · post images reserve their slot before load — DONE + runtime-verified (2026-07-09, /sweep)

Closes the perf-scan TOP FIX (🟡, 2026-07-02). The single-image post in `PostCard.tsx` used
`max-h-[520px] object-contain` with no reserved height, so the feed shifted layout when the image
finished loading (hot-path CLS). Gave the container a fixed `aspect-[4/3]` (still capped by
`max-h-[520px]`; the feed column is narrow enough that aspect governs and the cap never triggers),
image switched to `max-h-full`. Also fixed the `CreatePostModal` preview image (`max-h-60` → `w-full
aspect-video object-contain`) to match the video sibling and reserve its slot. className-only
changes (no extractable logic → no unit test). Runtime-verified via Chrome DevTools MCP (feed as
`techstore_demo`): the single-image post renders a fixed-height reserved slot even when the image
URL 404s (pre-existing broken Cloudinary data, not a regression) — proving the slot reserves before
load. Composer preview confirmed (post images cap 4). Gates: `build` ✓ · `lint` 0 errors ·
`test:run` 50 files / 328 tests ✓.

### QK-01 · Social invalidation via factory (no inline query keys) — DONE (2026-07-09, /sweep)

Closes the 🟡 sweep-audit finding (2026-07-07). `useFeed.ts` (`useUpdatePost` +
`useDeletePost` `onSuccess`) invalidated other social surfaces with raw inline arrays
`['social', 'following-feed']` and `['social', 'user']` instead of the `queryKeys.social.*`
factory. Because TanStack Query's `invalidateQueries` matches by prefix, if a factory key
shape ever changed without the inline array following, the invalidation would silently stop
matching — a stale for-you edit/delete leaving the following-feed and profile-post lists
un-refreshed, with no error.

Fix: added two list-level prefix keys to `hooks/query/queryKeys.ts` —
`social.followingFeedAll` (`['social','following-feed']`, prefix of every `followingFeed(userId)`)
and `social.userScopeAll` (`['social','user']`, the shared prefix of `postsByUser`, `followers`,
and `following`). `useFeed.ts` now invalidates through these. Named `userScopeAll` (not
`userPostsAll`) because `['social','user']` also covers followers/following — the invalidation
behavior is byte-identical to the previous inline array, just sourced from the factory.

Tests: `queryKeys.test.ts` (3) — asserts each list-level key is a true prefix of the
item-level keys it must match (the exact property prefix-based invalidation relies on), plus a
negative case that `followingFeedAll` does not match the for-you `feed`. This is the drift
guard: change a social key shape without updating its list-level prefix and the test fails.
Behavior is a pure refactor (identical resolved keys), so no runtime/full-stack E2E needed.
Gates: `build` ✓ · `lint` 0 errors (24 pre-existing warnings) · `test:run` 50 files / 323 tests ✓.

### VariationBuilder · stable group id keys — DONE (2026-07-09, /sweep)

Closes the 🟡 perf-scan correctness gap (2026-07-02). `VariationBuilder` keyed each variation
`GroupRow` by array index. `GroupRow` holds local `draft` state (the "thêm option" input), so
removing an earlier group made React reuse the key=N instance for a *different* group — its draft
could leak onto the sibling row. (In practice the input's `onBlur={commit}` flushes the draft on
most removals, but any local state was fragile to add/remove reordering.)

Fix: `VarGroup` gains a stable `id`, minted by a new `makeVarGroup(partial?)` factory
(`useProductForm.ts`, module-level incrementing counter). All three construction sites use it —
`DEFAULT_FIELDS`, `addGroup`, and `CreateProductPage`'s edit-mode hydration — and
`VariationBuilder` now keys by `group.id`. `buildPayload` already projects variations to
`{ name, options }`, so the `id` never leaks into the create/update DTO.

Tests: `VariationBuilder.test.tsx` (3) — `makeVarGroup` id uniqueness, an add-option happy path,
and a regression that types an uncommitted draft into the first group and removes it via
`fireEvent` (bypassing the onBlur-commit that would otherwise mask instance reuse); it fails with
index keys (draft leaks to the surviving row) and passes with `group.id` keys. Gates: `build` ✓ ·
`lint` 0 errors (24 pre-existing warnings) · `test:run` 49 files / 320 tests ✓.

### UP-04 · Client-side upload file validation — DONE (2026-07-09, /sweep)

Closes the 🟡 UP-04 upload-audit finding (2026-07-07). `accept="image/*"`/`accept="video/*"` on
the file pickers is only a hint — a user could still choose a 500 MB file or a non-media file,
which failed only *after* the whole upload had spent the bandwidth, and the backend rejects SVG
outright (script-vector, per the 2026-07-07 Cloudinary-URL-validation handoff).

Fix: new pure helper `src/lib/http/uploadValidation.ts` — `validateUploadFile(file, { kind, maxBytes })`
returns a Vietnamese error message (or `null`) after checking, in order: SVG images (blocked by
MIME `image/svg+xml` or `.svg` extension), type mismatch (MIME prefix `image/`|`video/`, falling
back to a file-extension allow-list mirroring the backend when the browser leaves `type` empty on
paste/drag), and oversize (`MAX_IMAGE_BYTES` 10 MB / `MAX_VIDEO_BYTES` 100 MB). `firstUploadError`
runs it over a batch and returns the first failure. Wired into all four upload consumers before
the upload fires: `CreatePostModal` (image batch → whole selection rejected at the first bad file,
+ single video), `useProductForm.addImages`, `EditProfileModal` avatar, `RichTextEditor`. Each
surfaces the message through its existing upload-error state and resets the file input. This also
closes the "do not upload SVG as an image" FE action from the Cloudinary-URL-validation handoff.

Tests: `uploadValidation.test.ts` (14 — image/video accept, SVG by MIME + by extension, wrong
MIME, cross-kind, oversize, empty-MIME extension fallback, unknown format, batch first-error).
Gates: `build` ✓ · `lint` 0 errors (24 pre-existing warnings) · `test:run` 48 files / 317 tests ✓.
Runtime E2E pending — an oversize/wrong-MIME file can't be forced through a normal `accept`-filtered
picker (same constraint as UP-01/UP-02/UP-03); logic is fully unit-covered.

### UP-03 · RichTextEditor upload error handling + orphan cleanup — DONE (2026-07-08, /sweep)

Closes the 🟡 UP-03 upload-audit finding (2026-07-07). `RichTextEditor`
(`src/components/shared/RichTextEditor.tsx`, the product-description editor) had two gaps:
(1) `handleImageFile` `await`ed `onUploadImage` with no try/catch — a rejected upload became an
unhandled promise rejection and the user saw nothing (the other 3 upload consumers all surface
an inline error); (2) an image inserted into the editor and then deleted from the text orphaned
its Cloudinary asset forever, because the component discarded the `publicId` and never tracked
what it had inserted.

Fix: (a) wrap the upload in try/catch with `uploading` + `uploadError` state — an inline
`text-accent-red` message and a dimmed image button while in flight, matching the
`CreatePostModal` / `useProductForm` pattern. (b) Track every session-uploaded image as
`{ url, publicId }` in `trackedRef`; on each `onUpdate`, diff the tracked list against the
editor HTML via a new pure helper `partitionEditorImages`
(`src/components/shared/richTextImages.ts`) and `deleteMedia` any tracked image whose URL is no
longer present. Only session uploads are tracked, so pre-existing images embedded in the `value`
prop (editing a saved product) are never destroyed — same "only delete what this session owns"
invariant as `useProductForm.removeImage`. The `onUploadImage` prop return type was widened from
`{ url }` to `{ url, publicId }` (already satisfied by `uploadProductImage`'s `UploadResult`).

Tests: `richTextImages.test.ts` (4 cases: all kept; one removed → flagged; empty editor → all
removed; nothing tracked → no-op). `build` / `lint` (0 err, 24 advisory) / `test:run` (47 files,
303 tests) green.

**Still open:** (i) cancelling/unmounting the whole product form still orphans description images
— they live inside the (possibly-saved) HTML, so a blanket unmount-cleanup would destroy the
images of a successful save; this is the same server-side-cleanup gap already tracked in
`backend-handoff.md` (Open, 2026-07-07 — orphan cleanup for replaced/removed persisted media).
(ii) Runtime E2E pending — the upload-error and orphan-delete paths can't be triggered through
the normal picker UI.

### UP-02 · EditProfileModal avatar orphan cleanup (FE part) — DONE (2026-07-08, /sweep)

Closes the FE-fixable part of the 🔴 UP-02 upload-audit finding (2026-07-07). The avatar is
uploaded to Cloudinary the instant a file is chosen (`handleAvatarSelect`), but the component
only kept the returned `url` and threw away the `publicId` — so it could never delete the
asset. Consequences: (a) cancelling/closing the modal left the just-uploaded avatar orphaned;
(b) choosing a different avatar before saving orphaned the previous upload. Fix: track a
`pendingAvatar: { url, publicId } | null` and drive the orphan decisions through a new pure
helper `src/features/user/avatarUpload.ts` — `replacePendingAvatar(prev, incoming)` returns
the prior upload's publicId as the orphan on re-select, and `discardedAvatarOrphan(pending)`
returns the publicId to delete on cancel/close. On a *successful* save the mutation's
`onSuccess` clears the tracking WITHOUT deleting (the pending upload is now the persisted
avatar) and closes without the cancel-cleanup path, so it never deletes the avatar it just
saved. `displayAvatar` now derives from `pendingAvatar?.url ?? user.avatar` (dropped the
redundant `avatarPreview` state). Tests: `avatarUpload.test.ts` (4 cases: first upload → no
orphan; replace → prior orphaned; cancel → pending deleted; nothing uploaded → null).
`build` / `lint` (0 err, 24 advisory) / `test:run` (46 files, 299 tests) green.

**Part (c) still needs backend:** deleting the OLD *persisted* avatar when a new one is saved
can't be done client-side — the FE never has the previous avatar's Cloudinary publicId (only
its URL). Already tracked in `backend-handoff.md` (Open, 2026-07-07 — server-side orphan
cleanup for replaced/removed persisted media, incl. avatar replace). Runtime E2E (cancel /
re-select / save avatar against a live backend) recommended.

### UP-01 · Batch image upload commits per-file (no stranded Cloudinary orphans) — DONE (2026-07-08, /sweep)

Closes the 🔴 UP-01 upload-audit finding (2026-07-07). Both batch-image paths —
`CreatePostModal.uploadImageFiles` (`src/features/social/CreatePostModal.tsx`) and
`useProductForm.addImages` (`src/features/product/product-form/useProductForm.ts`) —
accumulated upload results in a **local** `uploaded[]` array and only wrote them to
component state after *every* file finished. A mid-batch failure (file N throws) discarded
files 0…N-1: they never entered state, so `handleClose`/`removeMedia`/`removeImage`/
`clearImages` could never `deleteMedia` them → the user lost the images **and** Cloudinary
orphans piled up un-cleanably. Fix: new pure helper `uploadFilesSequential<T>`
(`src/lib/http/uploadSequential.ts`) uploads one file at a time and commits each result via
an `onItem` callback the moment it resolves (rethrowing on failure so the caller's `catch`
still surfaces the error). Both call sites now delegate to it — the post modal appends each
`MediaItem`, the product form appends each `ImageItem` and keeps `imagesRef` in sync — so a
later failure leaves earlier successes visible in state and fully cleanable. This also
resolves the DRY convention note (same batch-upload orchestration duplicated across two
feature folders); a full `useMediaUpload` hook was intentionally *not* extracted because the
two sites keep different state shapes (`MediaItem[]` with image/video type vs. `ImageItem[]`)
— only the sequential-commit + aggregate-progress orchestration is shared. Tests:
`uploadSequential.test.ts` (4 cases, incl. the key mid-batch-failure case asserting the two
successful uploads stay committed while the batch rejects). `build` / `lint` (0 err, 24
advisory warnings) / `test:run` (45 files, 295 tests) green. Runtime E2E pending — forcing a
mid-batch Cloudinary failure isn't reproducible through the normal UI.

### SEC-01 · Gitignore repo-root credential files + fix malformed `public` entry — DONE (2026-07-08, /sweep)

Closes the 🔴 SEC-01 audit finding (2026-07-07): `login.json` (test-account login response
with role/grants) and `user.cookies` (a real JWT `access_token`, curl cookie-jar format) sat
untracked at `frontend/` and were **not** ignored — a single `git add .` would have committed
live credentials. A prior in-progress edit had added the entries but fused the pre-existing
`public` ignore entry into the comment header (`public# Local session/credential artifacts`);
since `#` only opens a comment at line-start, `public` became a literal pattern `public# …`,
so `public/` stopped being ignored and the four throwaway test images (`imag1.png`,
`image2.png`, `image_screen_1.png`, `screen_2.png` — used for Chrome DevTools MCP product
uploads) leaked into the untracked set. Fix: split the malformed line so `public` is its own
entry again, followed by a proper `# Local session/credential artifacts` comment and
`login.json` + `*.cookies`. `public` was confirmed an intentional committed entry (added in
`05d940c` e2e-tooling commit). Config-only change (no code logic → verified via `git
check-ignore` rather than a unit test): credentials + all four test images ignored,
`public/vite.svg` still tracked, `git status` porcelain clean of anything sensitive.
`build` / `lint` (0 err, 24 advisory warnings) / `test:run` (44 files, 291 tests) green.

### Public profile email/role privacy (handoff integration) — DONE (2026-07-07, /sweep)

Integrates the backend handoff "Public user/profile enrichment no longer includes email"
(2026-07-07): `GET /user/:id` now returns `{ id, username, name, avatar, isActive }` only —
no `email`, no `role`. This was a **live crash**: `ProfilePage` fetches via
`api.users.getById` and the About tab read `user.role.rol_name` (→ `Cannot read properties of
undefined` when `role` is absent) and `user.email` (→ blank). Fix: new `PublicUser` type
(`src/types/user.ts`, `User extends PublicUser` adds `email`/`role`/`createdAt`); typed
`usersApi.getById` → `PublicUser` (and the two consumers `MessagesPage` map + `ChatThread`
`otherUser` prop, which only ever use id/name/username/avatar). ProfilePage now sources the
private contact block (email + role) from `useAuthContext().currentUser` (backed by
`/user/me`) via new pure helper `profileContactInfo(isMe, currentUser)` — shown only on your
own profile, `null` for others (no leak, no crash); the public status row stays. Same reason,
`EditProfileModal` now receives `currentUser` instead of the public `user` (it needs `email`
to prefill). Tests: `profileAbout.test.ts` (3 cases: own → email+role; others → null; no auth
→ null). `build` / `lint` (0 err) / `test:run` (44 files, 291 tests) green. Runtime E2E
(view own vs. another user's profile About tab) recommended once backend is live.

### Cart item owner-bound 404 → resync (handoff integration) — DONE (2026-07-07, /sweep)

Integrates the backend handoff "Cart item PATCH/DELETE now owner-bound" (2026-07-07):
`PATCH`/`DELETE /api/cart/items/:id` now return `404` (row unchanged) for a stale item id
or one owned by another user, instead of mutating a globally-guessable row. FE previously
had no `onError` on `useUpdateCartItem`/`useRemoveCartItem`, so such a 404 left the phantom
item in the cart UI with no resync. Added pure predicate `isStaleCartItemError(error)`
(`src/features/cart/cartItemErrors.ts`, narrows `ApiError.statusCode === 404`) + colocated
`cartItemErrors.test.ts` (7 cases: 404 true; 400/409/500 false; null/undefined/string/Error/`{}`
false). Wired `onError` on both mutations in `src/hooks/data/useCart.ts` to
`invalidateQueries(cart.all)` when the error is a stale-item 404, dropping the phantom row
and forcing a server refetch; TanStack mutations don't retry by default, so no same-id retry.
`build` / `lint` (0 err) / `test:run` (43 files, 288 tests) green. Runtime E2E pending: the
404 path needs a live backend + forged stale/foreign item id (unreachable via normal UI —
handoff notes "no normal cart UI change expected").

### Comment/reply notification deep-link + preview (handoff integration) — DONE + runtime-verified (2026-07-06, /sweep)

Integrates the backend handoff "Comment/reply notifications now carry postId + actorId +
preview" (2026-07-06). `Notification` type (`src/types/notification.ts`) gains
`postId`/`actorId`/`preview` (`number|null`/`number|null`/`string|null`) and `orderId`
widens to `number | string | null` (bigint column → backend serializes as string, e.g.
`"107"`). `notificationDisplay.ts`: comment/reply body now appends the comment text when
`preview` is present (`Có người vừa bình luận về bài viết của bạn: “…”`), falling back to
the old generic Vietnamese line for legacy rows; `getNotificationHref` deep-links
`comment`/`reply` → `/post/${postId}` (legacy rows without `postId` stay unlinked — the
old `orderId` held a commentId, never linkable). Both `NotificationsPage` and
`NotificationBell` pick this up via the shared helpers, no component changes. 8 new tests
in `notificationDisplay.test.ts` (preview body ×2, string-orderId body+href, postId href ×2,
legacy null-postId ×2). Runtime-verified live (user 18 commented on user 17's post #12):
notification rendered with preview, click navigated to `/post/12`, console clean.
**Backend gap found:** `preview` arrives truncated to 20 chars mid-word (contract says
≤255) → recorded in `backend-handoff.md` (Open). `actorId` rendering ("<tên> đã bình
luận…") left for a follow-up — needs a user-lookup enrichment, optional per handoff.
`build` / `lint` (0 err) / `test:run` (42 files, 285 tests) green.

### Memoize Context value objects (AuthContext + ApiErrorContext) — DONE (2026-07-06, /sweep)

Closes the #1 perf-scan flag "Context value không memoize (2 chỗ)". `useAuth` returned a
fresh object plus new `loginSuccess`/`logout` function identities every render, so the
app-wide `AuthProvider` handed every consumer a new value object on each render (violating
performance.md "memoize Context value objects"). Fixed: wrapped `loginSuccess`/`logout` in
`useCallback` (deps `queryClient` / `logoutMutate`) and the returned object in `useMemo`
(`src/hooks/useAuth.ts`). Same fix on `ApiErrorProvider` — `useMemo` the `{ globalError,
setGlobalError }` value keyed on `globalError` (`setGlobalError` from `useState` is already
identity-stable) (`src/context/ApiErrorContext.tsx`). Added a stable-identity regression
test to `src/hooks/useAuth.test.tsx` (a no-op re-render returns the same object + same
`loginSuccess`/`logout` references). Behavior unchanged — pure render-stability fix, no
runtime UI verification needed. `build` / `lint` (0 err) / `test:run` (42 files, 281 tests)
green.

### Money helpers coerce decimal strings — DONE (2026-07-05, /sweep)

Closes the "Price formatting / API contract mismatch" known issue and the "product money
numbers cleanup" backlog item. Backend now serializes money fields as JSON numbers, but
`formatPrice`/`formatVnd` (`src/lib/utils.ts`) still took a bare `number`, so any residual
decimal-string value (`"2000.00"`) would render raw as `2000.00 đ`. Widened both to
`number | string` and route through a shared `toMoneyNumber` helper (coerces strings via
`Number`, guards non-finite → `—`). Backward-compatible: existing `Number(...)` wraps at
call sites are now redundant but harmless (left in place for minimal diff). Regression
tests added in `src/lib/utils.test.ts` (decimal-string input for both helpers, incl.
millions abbreviation and non-numeric → `—`). `build` / `lint` (0 err) / `test:run` green.


---

# Archive — Release Sprint (2026-06)

## P0 — release blockers

### P0-01 — Hợp nhất cart thành server cart — DONE (2026-06-24)

- Server cart là source of truth duy nhất. `src/context/CartContext.tsx` và `CartSidebar.tsx` đã xóa; không còn import `CartContext` nào trong `src/` (đã grep xác nhận).
- Quick-add `ProductCard.tsx` và social `ProductChip.tsx` đều dùng `useAddToCart()` từ `src/hooks/useCart.ts`. Header badge, `CartPage`, `CartDrawer`, `CheckoutPage` đọc cùng query key `queryKeys.cart.all`; mutation invalidate đúng cart query.

**Acceptance đã đạt:** add từ marketplace + product detail + product chip cho cùng kết quả; quantity/remove/clear đồng bộ qua refresh/tab mới; không còn component commerce nào import `CartContext`.

### P0-02 — Variation → SKU matching — DONE (FE) (2026-06-25)

- Logic match SKU tập trung tại `src/lib/sku.ts` (có test `sku.test.ts`): `isValidSku`/`getValidSkus` loại SKU dị dạng (số tier ≠ số variation); `findMatchingSku` chỉ trả SKU khi chọn đủ tier và match exact; `getOptionStock` trả `null` cho tổ hợp không tồn tại → option bị `disabled` trước khi click.
- `ProductDetail.tsx` dùng chung các helper này cho availability, price, max quantity và payload add-cart (cùng một luật). Product dị dạng (không có valid SKU) hiện banner "Phân loại sản phẩm đang được cập nhật", không cho add.
- **Verify create-path (2026-06-25, seller `test1`, qua API):** tạo product 1 variation (2 options) → SKU `tierIdx` ra `[0]`/`[1]` (len 1 = số variation); tạo product 2 variation → `[0,0] [0,1] [1,0] [1,1]` (len 2). Cả `POST /api/products` lẫn `GET /api/products/:id/with-inventory` trả về đúng contract. → **Luồng tạo mới KHÔNG sinh dữ liệu hỏng**; FE (`buildCombosInternal` dựng tierIdx theo tích Descartes) + backend đều chuẩn. 2 product test đã xóa (`DELETE` 204).

> Còn chờ backend (xem `snapshot.md`): migration/cleanup dữ liệu legacy (product cũ `tierIdx` len ≠ số variation); quét toàn catalog chưa hoàn tất (rate limit 20 req/60s).

### P0-03 — Tạo product tạo/cập nhật inventory nguyên tử — DONE (FE mitigation) (2026-06-23)

- `CreateProductPage.tsx` không còn nuốt `409`. Helper `persistSimpleStock()` xử lý seed tồn kho cho simple product: `POST /inventory`, nếu `409` thì `GET /inventory/product/:id` rồi `PUT /inventory/:id` để reconcile SKU + `availableStock` về đúng product mới (xử lý stale/orphan row do reuse ID).
- Stock-persist fail (ngoài 409 do trùng SKU lúc create product) sẽ reject mutation → hiển thị error banner ở action bar, không còn báo "Đã đăng!" giả. `onSuccess` invalidate thêm `inventory.all` + `inventory.byProduct(id)`.

> Còn chờ backend (xem `snapshot.md`): transaction atomic create product+inventory và cleanup orphan inventory khi xóa product (FE recovery chỉ là mitigation phía client).

### P0-04 — Không xóa cart trước payment success — DONE (2026-06-25)

- Online payment KHÔNG còn clear cart trước khi redirect gateway. `CheckoutPage` lưu `pendingCheckout` (orderIds + cartItemIds + `clearAll`) vào `sessionStorage` (`src/features/cart/pendingCheckout.ts`) rồi mới redirect.
- `PaymentResultPage` chỉ consume cart khi gateway xác nhận success: `clearCart` (full) hoặc remove đúng các `cartItemIds` (selected subset), sau đó xóa pending state. Cancel/fail không vào page success nên cart được giữ nguyên.
- Khi lấy payment URL fail sau khi order đã tạo: điều hướng người dùng tới order detail (`/order/:id`) — nơi có nút "Thanh toán ngay" (`useOrderPaymentUrl`) để retry trên cùng order — thay vì để họ submit lại tạo order trùng. Multi-seller → `/orders`.
- Backend đã thêm `Idempotency-Key` header cho `POST /api/order` (single-flight Redis: 409 khi đang in-flight, replay response khi retry sau hoàn tất). FE giờ sinh và gửi key này: `api.orders.create(dto, idempotencyKey?)` set header `Idempotency-Key`.
- `CheckoutPage` giữ key ổn định theo "checkout intent" qua `idemKeyRef`: helper thuần `src/features/cart/idempotency.ts` (`buildCheckoutSignature` = chữ ký productId/skuId/quantity không phụ thuộc thứ tự; `resolveIdempotencyKey` tái dùng key khi chữ ký không đổi, sinh key mới khi giỏ đổi). Double-submit / retry mạng → cùng key → backend replay thay vì tạo đơn trùng; đổi giỏ → key mới. Key sinh bằng `crypto.randomUUID()`.
- **Test:** `idempotency.test.ts` (6 cases) — chạy pass (config node thuần, P3-01). `npm run build` pass.

### P0-05 — Edit variation product (hydrate đầy đủ) — DONE (FE) (2026-06-23)

- `useProductForm(initial?, initialImages?)` nhận seed. `CreateProductPage` hydrate đầy đủ ở edit mode qua `useMemo`:
  - `initialFields`: name/description/sku/brand/condition/isActive/categoryIds/sellerNotes/hasVariations + `groups` (từ `existingProduct.variations`) + `rows` (map `JSON.stringify(sku.tierIdx)` → price/stock) + singlePrice/singleStock.
  - `initialImages`: map `imageUrls`/`imageUrl` → `{ url, publicId: '' }`. `publicId: ''` đánh dấu ảnh đã-persist: `removeImage`/`clearImages` KHÔNG gọi `deleteMedia` cho ảnh này (chỉ xóa khỏi list), tránh phá ảnh khi user cancel.
- Variation builder + SKU matrix render ở CẢ create lẫn edit (đã bỏ block "Chỉnh sửa phân loại chưa được hỗ trợ").
- Guard phá hủy SKU: `originalTierIdx` (Set các `tierIdx` gốc); `handleSubmit` `window.confirm` khi edit mà có `tierIdx` gốc biến mất khỏi `form.combos`.
- `onSuccess` invalidate thêm `products.detail(id)` + `products.withInventory(id)`. `buildPayload()` tự dựng `variations` + `skuList` + `imageUrls` từ state hydrate nên save-không-đổi bảo toàn dữ liệu.

**Đã verify runtime (Chrome DevTools, 2026-06-23, seller `test1`):**

- Product #2 (1 variation `Màu sắc` [Đỏ,Xanh], SKU `[0]`/`[1]`): mở edit nạp đủ name/SKU/danh mục/variation + ma trận SKU đúng giá/kho (Đỏ 199000/30, Xanh 249000/20). Save-không-đổi gửi `PATCH /api/products/2` với đầy đủ `variations` + `skuList`; response giữ nguyên → bảo toàn dữ liệu xác nhận.
- Guard phá hủy SKU: xóa option `Xanh` rồi Save → `window.confirm`; Cancel → KHÔNG gửi PATCH, SKU `[1]` vẫn còn. ✓
- **2 bug phát hiện & sửa khi test:** (1) `categoryIds`/`brandId` backend trả **string** (`["2"]`) → checkbox không tick khi edit; fix coerce `.map(Number)`/`Number()`. (2) Danh sách danh mục/brand **render trùng đôi** ở edit mode (effect so `prev` id string với `propIds` id number); fix normalize `prev` id → number trước filter (`BasicInfoSection.tsx`).

> Còn chờ backend (xem `snapshot.md`): diff create/update/delete SKU ở tầng API và bảo vệ SKU đã có order/cart reference (FE mới confirm phía client).

## P1

### P1-02 — Order item enrichment (FE) — DONE + runtime-verified (2026-06-25)

- Backend (DONE 2026-06-25) enrich mỗi order item trên cả 3 endpoint (`GET /order/:id`, `GET /order/user/:id` batch cả trang, `GET /order/seller/:id`): thêm `productName`, `skuId`, `skuLabel` (vd `"Màu sắc: Đỏ, Size: M"`, hoặc `null` khi không có variation) và `image` (ảnh đầu realtime, hoặc `null`). **Runtime self-test (Chrome DevTools MCP, user 17) xác nhận cả 3 field + `productName` có mặt trên cả list lẫn detail.**
- **Bỏ hẳn `useProductsByIds` ở cả 2 trang buyer order** — đọc thẳng `item.productName`/`item.image`/`item.skuLabel`. Đây cũng là **bug fix**: `POST /products/with-inventory/multiple` trả `404 "Product not found"` khi BẤT KỲ product nào trong batch đã bị xóa → trước đây giết toàn bộ tên sản phẩm (rơi về "N sản phẩm"). Verify: 404 đó đã biến mất, tên thật render đúng.
- **Types:** `OrderItem` thêm `productName?`/`skuId?`/`skuLabel?`/`image?` (optional, `null`-able); `SellerOrderItemDetail` bỏ `productName`/`skuId` trùng (kế thừa từ base, vẫn narrow image/skuLabel về required). Thêm `OrderStatusCounts` (`types/order.ts`).
- **Helpers (`orderSummary.ts`):** `orderItemsSummary(items)` + `orderCoverImage(items)` giờ chỉ nhận `items` (đọc `item.productName`/`item.image`), bỏ tham số `productMap`.
- **Buyer detail (`OrderDetailPage`):** thumbnail = `item.image`; tên = `item.productName`; render `item.skuLabel` dưới tên. Bỏ dòng seller-name (chỉ có khi hydrate product — vốn đã chết do 404).
- **Buyer list (`OrderHistoryPage`):** filter-tab badges chuyển sang server count toàn lịch sử qua `GET /order/user/:id/status-counts` (`api.orders.getStatusCounts` + `useOrderStatusCounts` + queryKey `orders.statusCounts(userId)` nested dưới `byUser` → `useCancelOrder` invalidate `byUser` đã cover badge refresh). Helper thuần `orderFilterCounts()` map per-status → 4 tab (pending tab gộp pending+confirmed+processing+shipped+delivering). **Verify live: badges 42/11/6/25 khớp đúng map `{all:42,pending:9,confirmed:0,processing:1,shipped:1,delivering:0,completed:6,canceled:25}`.**
- **Test:** `orderFilterCounts.test.ts` (3 cases) + `orderSummary.test.ts` viết lại theo signature mới (item-based). Full suite **18 files / 103 tests pass**; `build`/`lint` (0 errors) xanh.
- Còn nợ: order snapshot tại thời điểm mua (P2-02) — `image`/`skuLabel`/`productName` hiện realtime nên order cũ sẽ lệch nếu product đổi/xóa. (Lưu ý ngoài scope: cart pages vẫn dùng `useProductsByIds` → cùng endpoint 404 nếu cart chứa product đã xóa.)

### P1-01 — Seller order lifecycle — DONE (2026-06-25)

- State machine seller tập trung tại `src/features/order/sellerOrderActions.ts` (`getSellerOrderAction(status)`): `pending → confirm`, `confirmed → ready-to-ship`, `processing → ship` ("Đã bàn giao vận chuyển"), `shipped → deliver` ("Bắt đầu giao hàng"), `delivering → complete` ("Hoàn tất đơn hàng"); chỉ `completed`/`canceled` terminal. Label khớp transition thực, chỉ render action hợp lệ.
- Backend đã expose: (a) `GET /api/order/seller/:id` — detail riêng cho seller, mỗi item enrich `image` (`imageUrls[0]`) + `skuLabel` (build từ `variations` + `skuTierIdx`) + `productName`; (b) `PATCH /api/order/:id/ship|deliver|complete` — transition single-step sau `processing`, race-safe với GHN webhook.
- **API + hooks:** `api.orders.getSellerOrderDetail/ship/deliver/complete`; `useAdvanceOrder()` (1 hook dispatch ship/deliver/complete, invalidate `orders.seller` + `orders.detail(id)` + `orders.sellerDetail(id)`); `SellerOrdersPage.handleAction`/`pendingKindFor` xử lý cả 5 kind. `confirm`/`ready-to-ship` giữ hook cũ.
- **Detail accordion enrich item:** `useSellerOrderDetail(id, enabled)` lazy-fetch khi mở accordion (enabled theo `expanded` → list view nhẹ); item render `<ProductThumb>` (ảnh, fallback Package), tên thật, `skuLabel`. Fallback item rỗng khi detail chưa load; skeleton trong lúc fetch. Buyer/địa chỉ/payment/GHN lấy từ `OrderWithBuyer` của list (detail endpoint không trả buyer; list không refetch `GET /order/:id` để tránh 403).
- `PAYMENT_LABEL` tách `src/features/order/orderConstants.ts` dùng chung buyer (`OrderDetailPage`) + seller (DRY). Types: `SellerOrderItemDetail` + `SellerOrderDetail` (`types/order.ts`). queryKey `orders.sellerDetail(id)` (prefix `['orders','seller']`).
- **Test:** `sellerOrderActions.test.ts` (6 cases) pass. `npm run build` pass.

### P1-02 — Buyer orders — DONE (FE) (2026-06-24)

- `useOrdersByUser` chuyển sang `useInfiniteQuery` (page size 10, dừng theo `hasNext`); giữ key `orders.byUser` nên `useCancelOrder` invalidate vẫn refresh. `OrderHistoryPage` flatten `pages` + nút "Tải thêm đơn hàng" (chỉ tab "Tất cả").
- Enrich item bằng hook dùng chung `src/hooks/useProductsByIds.ts` (`POST /products/with-inventory/multiple`, share cache `products.cartItems`): `OrderHistoryPage` hiện ảnh + tên sản phẩm đầu ("… +N sản phẩm khác"); `OrderDetailPage` hiện ảnh/tên/seller (brand→user.name) + link product, fallback Package khi thiếu ảnh.
- Invoice download, retry payment (`useOrderPaymentUrl`), cancel policy theo state (`pending|confirmed|processing`) đã có sẵn ở `OrderDetailPage` — verify đạt.
- Logic tóm tắt order row tách pure helper `src/features/order/orderSummary.ts` (`orderItemsSummary`/`orderCoverImage`) + test `orderSummary.test.ts` (7 cases pass).

> Còn chờ backend (xem `snapshot.md`): SKU label per item + order snapshot (P2-02); per-status count chính xác cần server-side filter.

### P1-03 — Kết nối social với commerce — DONE (phần không phụ thuộc backend) (2026-06-24)

- **Global create-post:** `CreatePostModal` tách khỏi `FeedPage` lên app scope qua `src/features/social/GlobalCreatePost.tsx`, mount trong `AppShell` (cả 2 branch). Listen event `tb:createpost` (Header dispatch) → CTA mở từ mọi route. Modal lazy-load (`React.lazy`) → không kéo code upload Cloudinary vào main bundle (index 585kB → 448kB). `FeedPage` đã bỏ state/listener/render modal.
- **Post action menu:** nút `MoreHorizontal` (trước là dead button) thay bằng `src/features/social/PostActionMenu.tsx` (dropdown click-outside theo pattern `ProfileMenu`, dùng `<IconButton>`): "Sao chép liên kết" (mọi người) + "Xóa bài viết" (chỉ chủ bài, `window.confirm`, `useDeletePost` → `DELETE /social/posts/:id`). Dùng ở cả `PostCard` và `PostDetailPage` (DRY). `useDeletePost` xóa post khỏi cache feed + invalidate following-feed/user posts + remove post detail query.
- **Share:** nút "Chia sẻ" (trước no-op) nối `src/lib/sharePost.ts` (`sharePost` = Web Share API, fallback clipboard; `copyPostLink`; `postShareUrl` + test `sharePost.test.ts`). Toast qua hook `useSharePost` + component `ShareToast` (local-state, không thêm dep).
- **Follow seller:** đã có sẵn trong `PostCard` — verify đạt.

#### Backend integration — DONE (2026-06-26)

- **Gắn sản phẩm vào post (`productId`):** types thêm `Post.productId: number | null`, `CreatePostDto.productId?`, `UpdatePostDto`, `ReportPostDto` (`src/types/social.ts`). `api.social.updatePost` (PATCH partial) + `reportPost` (POST) thêm vào `src/api/index.ts`.
- **Product picker (composer):** `src/features/social/ProductPicker.tsx` — debounce search (`useDebouncedValue` 350ms) qua `useProducts({ search, limit: 6 }, { enabled })`, chọn/bỏ chip. Tích hợp vào `CreatePostModal` (`attachedProduct` state, hydrate khi edit qua `useProductsByIds`).
- **Render `ProductChip` trong feed/detail:** `src/features/social/AttachedProduct.tsx` tự hydrate qua `useProductsByIds([productId])` (dùng chung cache `products.cartItems`, dedupe theo id) → render `ProductChip`. Gắn vào `PostCard` + `PostDetailPage` (`{post.productId != null && …}`) — phủ mọi consumer (Feed/Profile/Detail) không cần prop-drill.
- **Edit post (PATCH):** `useUpdatePost` (`src/features/social/useFeed.ts`) cập nhật cache feed + post detail + invalidate following/user feed. Tái dùng global composer cho edit qua `src/features/social/composerEvents.ts` (`openEditPost(post)` dispatch `tb:editpost` mang `Post`); `GlobalCreatePost` listen cả create+edit, unmount khi đóng để reset prefill. `PostActionMenu` thêm item "Chỉnh sửa bài viết" (owner). Media đã-persist đánh dấu `publicId === ''` → không xóa khi remove/cancel.
- **Report post:** `src/features/social/ReportPostDialog.tsx` (reason ≤500) + item "Báo cáo bài viết" (`!isOwner && canReport`). Lỗi map qua pure helper `reportPostError.ts` (`409`→đã báo cáo, `400`→tự báo cáo, `429`→rate-limit; test `reportPostError.test.ts` 5 case).
- **Verify:** `npm run build` + `npm run lint` (0 errors) + `npm run test:run` (115 pass) xanh.

### P1-04 — Hoàn thiện Profile / Shop — DONE (FE) (2026-06-24)

- Tab "Sản phẩm" ở `ProfilePage` không còn empty-state hardcode. Dùng chung hook `useProducts({ userId, limit: 50, isActive: true })` (thêm option `{ enabled }` lazy-load khi mở tab, backward-compatible với `ShopPage`). Render grid bằng `ProductCard` có sẵn; skeleton/empty-state; label tab hiện count `(n)`. Comment cũ sai ("getList does not support userId filter") đã xóa.
- `ShopPage` đã dùng `userId: currentUser?.id` filter từ trước — verify đạt.

#### Multi-category integration — DONE (2026-06-26)

- Backend giờ trả CẢ `categories[]` (object đầy đủ) LẪN `categoryIds: number[]` trên mọi product read. Type `Product` thêm `categories?: Category[]` (`src/types/product.ts`).
- Shop table hiển thị nhiều danh mục: pure helper `src/features/product/productCategories.ts` (`productCategoryNames` — ưu tiên `categories[]`, fallback `category`; test 3 case). `ShopPage` ProductRow render pill multi-category (flex-wrap) thay cho single `category?.name`.
- Editor multi-select prefill: `CreateProductPage` đã prefill `categoryIds` từ `existingProduct.categoryIds` (`BasicInfoSection` multi-checkbox) — verify đạt.
- **Verify:** `npm run build` + `npm run lint` (0 errors) + `npm run test:run` (115 pass) xanh.

> Còn chờ backend (xem `snapshot.md`): pagination Shop (stats + search server-side, P2-05).

### P1-05 — Notification socket ownership — DONE (2026-06-24)

- **Root cause:** `useNotifications()` gọi ở CẢ `NotificationBell` (Header, luôn mounted) lẫn `NotificationsPage`; mỗi lần gọi `useEffect` tự `io()` socket riêng → ở `/notifications` có 2 socket cùng prepend → notification nhân đôi + tốn 2 kết nối.
- **Fix — single socket owner:** tách `src/features/notifications/notificationSocket.ts` — singleton socket ref-count (`acquireNotificationSocket()`): mở ở consumer đầu, đóng khi consumer cuối unmount → luôn chỉ 1 socket. `NotificationBell` luôn mounted → socket hiệu quả app scope, không cần Provider. `useNotifications` chỉ `useEffect(() => acquireNotificationSocket(), [])`.
- **Dedupe theo ID:** pure helper `src/features/notifications/notificationCache.ts` (`prependNotification`) — bỏ qua nếu `id` đã tồn tại. Header + page đọc chung cache qua query key `notifications.list(1)`; mark-read/unread badge derive từ cache đó → đồng bộ 2 nơi.
- **Reconnect:** socket.io tự reconnect; dedupe đảm bảo replay không tạo bản trùng.
- **Test:** `notificationCache.test.ts` (4 cases). `npm run build` pass.

### P1-06 — Chat reliability — DONE (phần không phụ thuộc backend) (2026-06-24)

- **Nối CTA Chat product detail:** nút "Chat" ở seller card (`ProductDetail.tsx`) trước là dead button. Giờ điều hướng `/messages` kèm `state: { otherUserId: detail.userId }` (chưa login → `/login`). Dùng lại luồng deep-link đã có (`MessagesPage` consume `initOtherUserId` → `createConversation`) — DRY.
- **Connection states:** `useChat` expose `connectionStatus: 'connecting' | 'connected' | 'reconnecting' | 'disconnected'` (track qua `connect`/`disconnect` + Manager `socket.io.on('reconnect_attempt'|'error')`). `ChatThread` render banner trạng thái (helper thuần `chatConnection.ts` → text/tone, `null` khi connected).
- **Cleanup listeners:** cleanup effect giờ `socket.io.removeAllListeners()` + `socket.removeAllListeners()` trước `disconnect()`. `currentUserId` đọc qua `useRef` (không còn trong deps) → đổi account không re-subscribe (stale closure fix).
- **Dọn dead code:** xóa `src/features/product/ChatRoom.tsx` — mock chat cũ (dữ liệu giả, hardcoded hex, vi phạm styling).
- **Test:** `chatConnection.test.ts` (5 cases). `npm run build` pass. `ChatDialog.tsx` (popup inline) đã có nhưng chưa wire — để dành.

#### P1-06 follow-up — Chat metadata (lastMessage + unreadCount) tích hợp — DONE (2026-06-26)

Backend giao (handoff P1-06, 2026-06-26): `GET /chat/conversations` giờ trả mỗi conversation kèm `lastMessage` + `unreadCount` + `user1/2LastReadAt`, đã sort active-first; thêm `POST /chat/conversations/:id/read` reset unread của viewer.

- **Types** (`types/chat.ts`): `Conversation` thêm `user1LastReadAt`/`user2LastReadAt`/`lastMessage: ConversationLastMessage | null`/`unreadCount`. Type mới `ConversationLastMessage`.
- **API**: `api.chat.markConversationRead(id)` → `POST /chat/conversations/:id/read`.
- **Bỏ hack localStorage**: `useConversations` xóa hẳn activity-map (`tb:chat:activity`, `STALE_KEY`/`STALE_MS`, `readActivityMap`/`markActivity`) + sort/staleness client-side — server đã sort active-first + trả metadata thật. Giờ chỉ `return data ?? []`.
- **Helper thuần + test** (`chatConversations.ts` + `.test.ts`, 11 case): `conversationActivityTime`/`sortByActivity` (active-first), `applyIncomingMessage` (cập nhật `lastMessage`, bump `unreadCount` cho inbound ở thread không active, giữ 0 cho thread đang mở, không bump outbound, re-sort), `markConversationReadInList` (zero badge optimistic).
- **Socket** (`useChat`): `new_message` dùng `applyIncomingMessage` thay vì set field `updatedAt` không tồn tại; bỏ `markActivity`.
- **`useMarkConversationRead`** (mutation, optimistic zero badge qua `markConversationReadInList`).
- **`MessagesPage`**: preview render `lastMessage.content` (prefix "Bạn: " khi tự gửi, fallback "Bắt đầu cuộc trò chuyện") thay vì `@username`; badge `unreadCount` (pattern `bg-tb-gradient` như `NotificationBell`); tên + preview in đậm khi có unread; thời gian theo `lastMessage.createdAt ?? createdAt`; click thread → `markConversationRead(id)`.
- **Test:** full suite **126 unit tests pass** (22 files); `build` + `lint` (0 errors) xanh.
- Còn nợ runtime: E2E 2 tài khoản (open → send → receive → unread badge → mark read → reconnect).

#### ready-to-ship now gates on a real GHN waybill — failure surfaced to seller — DONE (2026-06-29)

Backend giao (handoff NEW, 2026-06-28): `PATCH /api/order/:id/ready-to-ship` giờ resolve free-text shipping address → GHN IDs và **tạo waybill trước** khi advance. Thành công → `200`, order `processing` với `ghnOrderCode` non-null thật. Address không resolve được → `400`, order **giữ `confirmed`**. GHN unreachable → `500`, giữ `confirmed`.

- **FE action #1 (render `ghnOrderCode`)**: đã sẵn — `SellerOrdersPage` render mã GHN ở cả card row + detail block (`order.ghnOrderCode`), không cần đổi code, chỉ bỏ giả định field luôn null.
- **FE action #2 (surface failure)**: ready-to-ship/confirm không còn nuốt lỗi vào `console.error`. Helper thuần `sellerOrderActionError.ts` (`sellerOrderActionErrorMessage(error, kind)`) map status → message tiếng Việt: ready-to-ship `400` → "địa chỉ giao hàng không hợp lệ…", `500` → "không kết nối được GHN, đơn vẫn ở trạng thái đã xác nhận…"; fallback dùng server message rồi generic theo `kind`. `SellerOrdersPage` derive `actionError` từ mutation nào đang `isError` (kèm `variables` = order id) và render banner `#id · message` dưới banner lỗi list.
- **Test:** `sellerOrderActionError.test.ts` (7 case, ready-to-ship 400/500/fallback/server-message + confirm không áp mapping 400). `build` (tsc + vite) xanh.
- Còn nợ runtime: full-stack E2E (seller bấm "Sẵn sàng giao" với address xấu → 400 + banner; address tốt → `ghnOrderCode` hiện).

#### F2 — Buyer-initiated return/refund tích hợp — DONE (2026-07-03)

Backend giao (handoff NEW F2, 2026-06-30): buyer request return trên đơn `delivering`/`completed`; seller/admin approve (order → `refunded`, refund simulated) hoặc reject (order về `previousOrderStatus`). Order statuses mới `return_requested`/`refunded`.

- **Types** (`types/order.ts`): `OrderStatus` thêm `return_requested`/`refunded`; `OrderStatusCounts` thêm 2 key optional; types mới `ReturnRequest`/`ReturnRequestStatus` (`pending_review|approved|rejected`)/`RefundStatus` (`refunded|manual_pending`). `userId`/`reviewedBy` model `number | string` (bigint có thể trả string).
- **API** (`api/orders.ts`): `requestReturn(orderId, reason)`, `getMyReturnRequests(page, limit)`, `getReturnRequests(page, limit, status?)`, `approveReturnRequest(id)`, `rejectReturnRequest(id, reason)`. Query keys: `orders.returnRequests`/`returnMine`/`returnQueue` (`hooks/queryKeys.ts`).
- **Helpers thuần** (`features/order/returnRequest.ts`): `canRequestReturn` (chỉ delivering/completed), `hasReturnActivity`, `findReturnRequestForOrder` (list newest-first, lấy match đầu — không có endpoint per-order nên OrderDetail tìm trong page 1 limit 50 của `/mine`), `returnStatusMeta` (label + tb-token class), `refundStatusLabel` ('Đã hoàn tiền · <method>' / 'Chờ hoàn tiền thủ công · <method>'), `returnRequestErrorMessage` (400 → message "không đủ điều kiện" thân thiện).
- **Hooks** (`useReturnRequests.ts`): `useMyReturnRequests` (có `enabled` gate), `useReturnRequestQueue`, `useRequestReturn` (invalidate order detail + byUser + returnRequests), `useReviewReturnRequest` (approve/reject union variables; invalidate cả prefix `orders.all` vì order status đổi).
- **Buyer UI:** `OrderDetailPage` — nút "Yêu cầu trả hàng" (chỉ khi eligible và không có request `pending_review`) mở form reason inline (maxLength 1000); panel trả hàng/hoàn tiền render request status pill + reason + rejectReason + dòng refund (`formatVnd`); timeline ẩn khi order ở return state. `OrderHistoryPage` — tab "Trả hàng/Hoàn tiền" (`orderFilterCounts` gộp 2 status, count optional `?? 0`) + link `/returns`. Trang mới `/returns` (`ReturnRequestsPage`) list request của mình, phân trang 10/trang.
- **Seller UI:** trang mới `/sell/returns` (`SellerReturnRequestsPage`, ProtectedRoute shop) — queue với filter tab all/pending_review(mặc định)/approved/rejected, hành động "Duyệt & hoàn tiền" / "Từ chối" (reject cần reason inline), error banner `#id · message`. `SellerOrdersPage` thêm link `/sell/returns` + 2 filter status mới. `StatusBadge` thêm `return_requested` (amber) / `refunded` (violet).
- **Test:** `returnRequest.test.ts` (eligibility matrix, find newest match, refund labels, error mapping) + `orderFilterCounts.test.ts` cập nhật (gộp return statuses, missing keys = 0). Full suite **187 tests / 30 files pass**; `npm run build` xanh.
- **Open question BE:** `GET /order/user/:id/status-counts` có trả key `return_requested`/`refunded` không? FE coi là optional nên tab count degrade về 0 nếu thiếu — ghi vào `backend-handoff.md`.
- Còn nợ runtime: E2E 2 tài khoản (buyer request → seller approve/reject → order status + notification).

#### F3 — Voucher/discount codes tại checkout — DONE (2026-07-03)

Backend giao (handoff NEW F3, 2026-06-30): `POST /order/voucher/validate` preview mã theo basket (không redeem); `POST /order` nhận `voucherCode` optional (chỉ đơn single-seller, multi-seller + code → 400; code case-insensitive; per-user redemption trùng → 400). Order trả kèm `voucherCode` + `discountAmount`, `total`/`codAmount` đã net discount.

- **Types** (`types/order.ts`): `VoucherValidateDto`/`VoucherValidation`/`VoucherDiscountType`; `CreateOrderDto.voucherCode?`; `Order.voucherCode?` + `discountAmount?` (model `number | string | null` — decimal column có thể trả string ở response cũ).
- **API** (`api/orders.ts`): `validateVoucher(dto)` → `POST /order/voucher/validate` (mutation, không cần query key).
- **Helpers thuần** (`features/cart/voucher.ts`): `normalizeVoucherCode` (trim+uppercase), `distinctSellerCount` (bỏ qua product chưa load — không flip guard giữa chừng), `discountedGrandTotal` (clamp goods total ≥ 0 rồi + ship), `voucherErrorMessage` (404 → mã không tồn tại/vô hiệu; 400 map keyword expired/not-started/min/per-user/usage-limit/multi-seller → tiếng Việt, fallback server message).
- **CheckoutPage:** input mã + nút "Áp dụng" trong summary card (Enter trong input → apply, không submit form); khi applied hiện dòng giảm giá (code chip amber + số tiền xanh + `IconButton` × để bỏ); grand total = `discountedGrandTotal(totalPrice, discount, shippingFee)`. **Stale guard:** effect reset voucher preview khi `buildCheckoutSignature(items)` đổi (đổi số lượng/SKU → phải validate lại, không redeem giá cũ). **Single-seller guard:** basket >1 seller (`product.userId` qua `productMap`) → thay input bằng note "Không áp dụng cho đơn nhiều người bán", không gửi code. `onSubmit` refactor dùng chung `buildOrderItems()` và thêm `voucherCode` vào dto khi có preview hợp lệ.
- **OrderDetailPage:** dòng "Giảm giá (CODE) −xxx đ" trên dòng Tổng cộng khi `discountAmount > 0` (coerce `Number()`).
- **Test:** `voucher.test.ts` (normalize, seller count, grand total clamp, error mapping matrix). Full suite **195 tests / 31 files pass**; `npm run build` xanh.
- **Không làm (optional theo entry):** admin voucher CRUD UI (`/order/admin/vouchers` create/list/deactivate) — endpoints đã ghi trong handoff Done nếu cần sau.
- Còn nợ runtime: E2E với voucher thật (BE self-test 10/10 nhưng FE chưa chạy live); cần admin tạo voucher trước.

#### F5 — Admin post moderation queue tích hợp — DONE + runtime-verified (2026-07-03)

Backend giao (handoff NEW F5, 2026-07-02): `GET /social/admin/reports?status=&page=&limit=` (PaginatedResponse group theo post, order most-recently-reported first) + 4 action `POST .../posts/:id/hide|unhide|dismiss` và `DELETE .../posts/:id` (admin role; hide flips pending→resolved, unhide KHÔNG re-open, dismiss giữ post visible, delete xóa vĩnh viễn post + reports). Hidden post bị loại khỏi 3 feed reads và `GET /social/posts/:id` → 404.

- **Types** (`types/social.ts`): `PostReportStatus` (`pending|resolved|dismissed`), `PostReport`, `ReportedPost` (`Post` + `isHidden`/`hiddenAt`), `ReportedPostGroup` (post + reportCount/pendingCount/latestReportedAt/reports), `ModeratePostResult`, `DismissReportsResult`.
- **API** (`api/social.ts`): `getReportedPosts(status='pending', page=1, limit=20)` + `hidePost`/`unhidePost`/`dismissReports`/`adminDeletePost`. Query keys: `social.adminReports` / `adminReportsList(status, page)`.
- **Helpers thuần** (`features/admin/postModeration.ts`): `moderationActionsFor` (hide↔unhide theo `post.isHidden`; dismiss chỉ khi `pendingCount > 0`; delete luôn có), `reportStatusMeta` (label VN + tb-token class: pending amber / resolved green / dismissed muted), `moderationSuccessMessage`, `moderationErrorMessage` (404 → "Bài viết không còn tồn tại…", 403 → không có quyền, fallback server message rồi generic theo action).
- **UI:** trang mới `/admin/reports` (`ReportedPostsPage`, lazy + `ProtectedRoute requiredRole="admin"`), link LeftRail "Kiểm duyệt bài viết" (icon `Flag`, đúng pattern admin links). 3 filter tab pending/resolved/dismissed (đổi tab reset page 1); card mỗi post: Avatar + link profile author, content preview (link `/post/:id` CHỈ khi post không hidden — hidden 404), badge đỏ "Đang ẩn khỏi feed", pill amber "n chờ xử lý", danh sách lý do report kèm status badge từng report; action row từ `moderationActionsFor`; **delete = confirm 2 bước inline** ("Hành động này không thể hoàn tác" + Xác nhận xoá/Huỷ); mỗi action `onSuccess` invalidate `social.adminReports` (refetch queue) + toast 3s; per-row pending qua `moderate.variables?.id`; Skeleton loading, empty state ShieldCheck, `<Pagination>` dùng `hasNext`.
- **Test:** `postModeration.test.ts` (11 case: action matrix 4 tổ hợp isHidden×pendingCount, status meta + fallback, success/error messages 404/403/passthrough/generic). Full suite **206 tests / 32 files pass**; `npm run build` + `lint` xanh (0 errors).
- **Runtime-verified (Chrome DevTools MCP, 2026-07-03, admin `testadmin`):** seed 2 pending reports lên post #8 (2 user khác nhau qua API); queue render đúng group (2 báo cáo · 2 chờ xử lý); Hide → `POST /hide` 201, refetch, post sang tab "Đã xử lý" với badge ẩn + actions thành Hiện lại/Xoá; Unhide → badge hết, reports GIỮ resolved (đúng contract không re-open); Dismiss đúng là biến mất khi pendingCount=0; delete confirm/cancel flow hoạt động (không xóa thật để giữ data test). End state: post #8 visible, 2 reports `resolved`. Lưu ý MCP tooling: `click` tool không trigger React handler trên page này — phải dispatch `button.click()` qua `evaluate_script` (quirk của tool, không phải bug app).
- Không có backend gap — toàn bộ contract khớp runtime, không ghi `backend-handoff.md`.

#### Featured sellers endpoint cho feed right-rail — DONE + runtime-verified (2026-07-04)

Backend giao (handoff NEW, 2026-07-03): endpoint `GET /api/user/featured-sellers?limit=<1..20>` (JwtAuthGuard, mọi role đăng nhập, default 5) trả `data: [{ id, username, name, avatar }]` — shop account active, newest-first, chỉ field profile công khai. Thay cho `GET /user/all` admin-only (403 ×2 mỗi lần load feed → console error + card empty cho user thường).

- **Types** (`types/user.ts`): type mới `FeaturedSeller` (`id`/`username`/`name: string|null`/`avatar: string|null`) — không có `role`/`email`/`grants`.
- **API** (`api/users.ts`): `getFeaturedSellers(limit = 5)` → `GET /user/featured-sellers?limit=`. Query key `users.featuredSellers(limit)`.
- **RightRail** (`components/layout/RightRail.tsx`): bỏ `getAll()` + filter role client-side (`u.role.rol_name === 'shop'|'admin'`) + `.slice(0,5)` — endpoint đã trả đúng shop newest-first. Sub-label đổi từ `role.rol_name` sang `@username`. `User` import bỏ (không còn dùng).
- **Test:** `api/users.test.ts` (MSW, 2 case: default limit=5 gọi đúng `/user/featured-sellers` không đụng `/user/all`; custom limit forward). Full suite **214 tests / 34 files pass**; `build` + `lint` (0 errors) xanh.
- **Runtime-verified (Chrome DevTools MCP, 2026-07-04, user 17, feed `/`):** card "Seller nổi bật" render techstore_demo (@techstore_demo, profile/23) + test1 (@test1, profile/20); network `GET /api/user/featured-sellers?limit=5 [200]`, KHÔNG còn `/api/user/all` 403 nào trên happy path → hết console error mỗi lần load feed.
- Không có backend gap mới — BE đã giao endpoint; đây là integration thuần. Handoff entry move sang Done.

#### Marketplace category/brand filter params — DONE + runtime-verified (2026-07-04)

Backend phát hiện (handoff NEW, 2026-07-03): FE gửi `categoryId`/`brandId` (số ít) nhưng gateway DTO chỉ nhận `categoryIds`/`brandIds`; `ValidationPipe({ whitelist:true })` strip key lạ **im lặng** → filter danh mục/thương hiệu ở marketplace là NO-OP từ đầu (200 với kết quả không lọc).

- **Fix** (`api/products.ts`): tách phần dựng query của `getList` thành helper thuần export `buildProductListQuery(params)` — append key số nhiều `categoryIds`/`brandIds`, lặp key theo từng value (`?categoryIds=16&categoryIds=18`, syntax gateway hỗ trợ; KHÔNG bao giờ dùng bracket `[]` — cũng bị whitelist strip). Scalar params + skip empty giữ nguyên hành vi.
- **Test:** `api/products.test.ts` mới (6 case: repeated plural keys, không phát key số ít, không bracket syntax, scalar giữ kèm filter, empty string bị skip, params rỗng → chuỗi rỗng). Full suite **212 tests / 33 files pass**; `build` + `lint` (0 errors) xanh.
- **Runtime-verified (Chrome DevTools MCP, 2026-07-04, user 17, gateway live):** marketplace 28 SP không lọc → chọn danh mục Audio → request `...&categoryIds=17` → **6 SP** đều audio → thêm brand Sony → `...&categoryIds=17&brandIds=23` → **đúng 2 SP** (Sony WF-1000XM5, WH-1000XM5). Filter lần đầu tiên thật sự narrow kết quả.
- Không có backend gap — backend đã fix phía họ (PERF-10 + scalar→array transform); đây là bug FE-side thuần. Handoff entry đã move sang Done.

## P2

### P2-06 — Batch product endpoint resilience (FE mitigation) — DONE (2026-06-25)

- **Vấn đề:** `POST /products/with-inventory/multiple` trả `404 "Product not found"` nếu BẤT KỲ id nào trong batch đã bị xóa → giết cả response, blank toàn bộ hydrate. Order pages đã thoát phụ thuộc (P1-02); cart pages (`CartDrawer`/`CartPage`/`CheckoutPage`) vẫn hydrate qua `useProductsByIds` → 1 product đã xóa trong giỏ làm hỏng toàn bộ.
- **Fix tại API layer (DRY, cover hết 5 consumer):** `src/lib/fetchBatchTolerant.ts` — happy path vẫn 1 request batch; chỉ khi batch ném `404` mới fan-out per-id (`Promise.allSettled`) và giữ lại các id resolve được, drop id thiếu. Lỗi non-404 vẫn propagate để React Query surface/retry. `api.products.getMultipleWithInventory` bọc qua helper này (inject `fetchBatch` + `fetchOne` để test).
- **Test:** `fetchBatchTolerant.test.ts` (4 cases: happy-path không fan-out, empty ids → `[]`, 404 → fan-out drop id thiếu, non-404 rethrow). Full suite **19 files / 107 tests pass**; `build`/`lint` (0 errors) xanh.
- Còn nợ phía backend: endpoint nên skip id thiếu trả mảng partial thay vì 404 (khi đó FE fan-out thành no-op, vẫn an toàn).

### P2-01 — Responsive baseline — DONE (2026-06-24)

- **Checkout** (`CheckoutPage.tsx`): grid `grid-cols-[1fr_380px]` → `grid-cols-1 lg:grid-cols-[1fr_380px]`; summary chỉ `lg:sticky`; padding `px-4 sm:px-6`. Product row `flex-wrap` + info `min-w-[120px]` + controls `ml-auto` (đã verify hết overflow ở 360px: `scrollWidth === clientWidth`).
- **Login** (`LoginPage.tsx`): `grid-cols-[1.1fr_1fr]` → `grid-cols-1 md:grid-cols-[1.1fr_1fr]`; form padding `px-6 py-12 md:px-[64px] md:py-[60px]`.
- **Header** (`Header.tsx`): search `w-[520px] hidden sm:block` → `hidden md:block flex-1 max-w-[520px]`; nút "Tạo bài viết" thu gọn còn icon `<` sm.
- **Mobile navigation:** thêm `src/components/layout/MobileNav.tsx` — bottom tab bar `md:hidden fixed bottom-0` (Bảng tin/Chợ/Thông báo/Đơn hàng/Cá nhân), mount trong `AppShell`. DRY: tách nav list ra `src/components/layout/navItems.ts` (`getPrimaryNavItems`); `LeftRail` dùng chung.
- **Verify runtime (Chrome DevTools, seller `test1`):** 360×800 + 768×1024 đạt. `npm run build` pass.

### P2-02 — Cart/order image fallback — DONE (FE) (2026-06-24)

- **Root cause:** `CartPage`/`CartDrawer` render `<img src={imageUrl}>` không guard, `imageUrl` fallback `''` → `<img src="">` (request rác + vỡ layout). Các nơi khác tự chế fallback khác icon (🛍️/`ShoppingCart`/`Package`/`Package2`) → vi phạm DRY.
- **Fix — shared component:** thêm `src/components/shared/ProductThumb.tsx` (+ test, 4 cases): không bao giờ `<img src="">`; có `src` → `<img object-cover>`, không có → icon `Package` trong `grid place-items-center`. Optional prop `to` → render `<Link>`.
- **Migrate 7 call site:** `CartPage`, `CartDrawer`, `CheckoutPage`, `ProductChip`, `ShopPage`, `OrderHistoryPage`, `OrderDetailPage`. `ProductCard` giữ inline (badge overlay tuyệt đối). `npm run build` pass.

#### P2-02 follow-up — backend order snapshot tích hợp — DONE (2026-06-26)

Backend persist snapshot purchase-time của product image + SKU label cho order item (handoff P2-02, 2026-06-26); response shape không đổi — `item.image`/`item.skuLabel` giờ backed bởi snapshot thay vì live lookup, order cũ render đúng dù product bị sửa/xóa.

- **FE không cần đổi hành vi:** order pages đã đọc decorated `item.image`/`item.skuLabel`/`item.productName` từ P1-02; `useProductsByIds` đã gỡ khỏi mọi order page (chỉ social attachment còn dùng).
- Chỉ refresh 2 comment type trong `src/types/order.ts` (`OrderItem.image`, `SellerOrderItemDetail.image`) từ "realtime" → "purchase-time snapshot" cho đúng semantics. Đóng note "còn nợ backend" của P2-02 dưới P1-02.

### P2-03 — Auth completeness — DONE (2026-06-25)

- **Quyết định: disable + "sắp ra mắt"** (không implement). Backend chỉ có `login/register/logout/me`.
- **`LoginPage` gỡ control chết:** remember-me checkbox (state set nhưng không gửi → xoá state), "Quên mật khẩu?", 2 nút OAuth Google/Facebook đều `disabled` + `aria-disabled` + `title="Tính năng sắp ra mắt"` + style mờ; thêm nhãn "(sắp ra mắt)" + caption. Hằng `COMING_SOON_TITLE` dùng chung.
- **401 redirect — extract + test:** logic trong `request()` tách `src/api/unauthorized.ts` (`shouldRedirectToLogin`/`buildLoginRedirect`, pure) + test `unauthorized.test.ts` (10 cases).
- **Role boundary tests:** `src/lib/roleAccess.test.ts` (P2-04) phủ logic guard.
- **Register E2E:** cần RTL (chưa cài — P3-01); flow register→auto-login để lại cho khi test infra có.
- `npm run build` pass; 25/25 test pass (unauthorized 10 + roleAccess 15) qua node-env config tạm.

### P2-04 — Admin completion — DONE (2026-06-25)

- **Backend đã hoàn tất** approval flow Phase 1/2/2b/2c (pending list, review+note, notification tới seller, product lock/unlock). FE approve/reject UI (`PendingBrandsPage`/`PendingCategoriesPage`) đã wire `api.products.reviewBrand|reviewCategory(id, {action, note})` + invalidate + toast — khớp contract.
- **Fix nav gating:** admin trước đây thấy seller nav vì 3 nơi OR nhầm `isSeller || isAdmin`. Seller capability = role `shop`, admin KHÔNG phải seller → gate seller nav/route bằng `isSeller`.
- **DRY + testable:** extract `src/lib/roleAccess.ts` (`canSell`/`canAdminister`/`roleSatisfies`) single source of truth + test `roleAccess.test.ts` (15 cases). `useRole` + `ProtectedRoute` dùng helper; `LeftRail`/`ProfileMenu` gate seller block bằng `isSeller`. LeftRail admin block thêm divider.
- `npm run build` pass; 15/15 test pass.
- **Đề xuất DRY (chưa làm, cần xác nhận):** `PendingBrandsPage` + `PendingCategoriesPage` gần trùng 100% → nên extract `PendingReviewTable` (shared) nhận `items`/`reviewFn`/labels.

### P2-05 — Pagination 10/page nhất quán — DONE (phần API đã hỗ trợ) (2026-06-25)

> Mục tiêu: mọi list page phân trang 10 item/trang, NGOẠI TRỪ `/marketplace` (12/trang theo grid). Component chung `src/components/shared/Pagination.tsx`; helper `getPageItems` ở `src/lib/pagination.ts` + test.

- **`SellerOrdersPage`** (`/sell/orders`): `LIMIT` 20 → 10; `<Pagination>` thay block prev/next inline.
- **`ProfilePage`** tab Bài viết + Sản phẩm: page state (reset khi đổi `userId`), `getPostsByUser(userId, page, 10)` + `useProducts({ userId, page, limit: 10 })`; label tab đếm theo `total` server; `<Pagination>`. `queryKeys.social.postsByUser` thêm `page`.
- **`NotificationsPage`** (`/notifications`): `useNotifications(page)` parameterize, limit 50 → 10; `markRead` optimistic target đúng cache trang hiện tại; `<Pagination>`.
- **`MarketplacePage`**: migrate sang `<Pagination>` dùng chung, GIỮ `limit: 12` (ngoại lệ).

#### P2-05 follow-up — backend pagination/stat endpoints tích hợp — DONE (2026-06-26)

Backend giao 3 endpoint additive (handoff P2-05, 2026-06-26). FE đã chuyển khỏi các fallback `limit` cao / tính client-side:

- **Admin Users → `GET /user?page=&limit=`** (`api.users.getPaginated`, `PaginatedResponse<User>`). `AdminPage` đổi từ `users.getAll()` (`/user/all`) sang paginated (20/trang): query key `[...users.all, page, limit]`, state `usersPage`, card "Tổng người dùng" đọc `total` server (không còn `users.length` của 1 trang), thêm prev/next + "Trang x / y". `getAll()` giữ lại cho consumer khác.
- **Shop stats → `GET /products/shop/stats`** (`api.products.getShopStats` → `{ productCount, totalStock, lowStockCount }`, query key `products.shopStats`). `ShopPage` 3 stat card đọc số toàn shop từ endpoint, fallback về aggregation client-side (`products.length`/reduce/filter) khi đang load → số đúng cả khi danh sách phân trang, không chỉ trang hiện tại.
- **Notifications badge → `GET /notifications/unread-count`** (`api.notifications.getUnreadCount` → `{ unreadCount }`, query key `notifications.unreadCount`). `useNotifications` badge đọc count toàn cục thay vì đếm `!isRead` trên trang đã load. `markRead` optimistic decrement count cache (chỉ khi item đang unread) + rollback on error; socket realtime increment count khi insert thật (dedup qua `didInsert`).
- **Test:** `didInsert` helper (pure, `notificationCache.ts`) + 3 case trong `notificationCache.test.ts`. Full suite **118 unit tests pass**; `build` + `lint` (0 errors) xanh.

#### P2-06 follow-up — backend tolerant batch endpoint — DONE (2026-06-26)

Backend fix `POST /products/with-inventory/multiple`: skip id thiếu trả mảng partial (+ `inventory: null` khi inventory service down) thay vì 404 toàn batch. FE giữ `fetchBatchTolerant` làm safety net (fan-out giờ no-op trên happy path); cập nhật comment ở `api.products.getMultipleWithInventory`.

### P3-01 — Quality gates (phần đã làm) (2026-06-25)

- `npm run build` pass.
- `globalIgnores` thêm `design_handoff_trybuy_ui` → `npm run lint` sạch (exit 0, từ 370 lỗi → 0). Scripts `typecheck`/`lint`/`test:run` đã có trong `package.json`. Gate lint dùng được ngay (hiện chỉ phủ js/jsx).
- Test infra files đã có (`vite.config.ts` test block, `src/test/setup.ts`, `src/test/msw/`, `renderWithProviders`) + test colocate (`sku.test.ts`, `orderSummary.test.ts`, `sellerOrderActions.test.ts`, `utils.test.ts`, `ProductCard.test.tsx`).

> Còn lại (xem `snapshot.md`): `typescript-eslint` dep (lint TS/TSX) + cài dev deps test (vitest/jsdom/RTL/msw) — cả hai chặn bởi `npm install`.

## Flows đã chạy pass trong runtime audit

- Login/logout bằng user, shop và admin. Role routes `/sell`, `/sell/orders`, `/admin`.
- Marketplace load products/categories/brands. Server cart page + checkout selection.
- COD: shipping fee → create order → clear cart → order history. Buyer order detail + cancel.
- Cloudinary upload + create product. Social create post tại feed.
- Seller order list/filter/confirm mutation. Admin dashboard + pending brand/category pages.
- Chat/notification WebSocket handshake khi FE dùng origin `http://localhost:5173`. Production build.

> Pass ở đây chỉ xác nhận happy-path đã chạy; không xóa backlog về consistency/retry/responsive/UX.

## Dữ liệu test đã tạo/thay đổi (audit 2026-06-19)

- Product `#16 — E2E Bottle 20260619`, bị stock `0` do inventory conflict.
- Post `E2E social smoke test 20260619`.
- Order `#97`, đã cancel sau xác nhận flow.
- Seller order `#4`, đã chuyển qua confirm + ready-to-ship, trạng thái cuối quan sát `processing`.
