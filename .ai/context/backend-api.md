# TryBuy Backend API Reference

> **Frontend dev**: use `.ai/api-reference.md` for the FE `api` object contract. This file documents raw backend endpoints, query params, and shapes — read it when you need the full endpoint detail that isn't exposed via the `api` object yet.

> **Scope rule (2026-08-04, D2) — read before adding to this file.** Depth goes into
> **[Common Types](#common-types)**, which pays off across all ~60 endpoints. Per-endpoint sections
> stay at the level they are: path, params, shape, notable status codes. Do **not** add prose,
> rationale, or FE usage examples per endpoint — that is what makes this file unreadable, and it
> belongs in `.ai/api-reference.md` (FE `api` contract) or `.ai/context/domain.md` (business rules).
> If you are about to paste the same caveat under three endpoints, it is a Common Types entry.

> **PUBID override (2026-07-17):** numeric ID examples below are historical for converted domains. User, product, order, address, notification, return-request, post, comment/reply, conversation, and message IDs—and their converted-domain foreign keys—are opaque prefixed strings (`usr_`, `prod_`, `ord_`, `addr_`, `ntf_`, `rr_`, `post_`, `cmt_`, `conv_`, `msg_`). Converted routes/DTOs reject numeric forms. Catalog, SKU, cart-row, inventory-row, and GHN IDs remain numeric.

## Contents

- [Base](#base) · [Common Types](#common-types) (envelope · `PaginatedResponse<T>` · **errors + status taxonomy** · **pagination caps** · **what "optional" means** · enums)
- [1. Auth & User](#1-auth--user) — register · login · logout · `/user/me` · `/user/:id` · PATCH · `/user/all`
- [2. Product](#2-product) — CRUD · search · brands · categories · SKU · with-inventory · stock-check
- [3. Order](#3-order) — create · admin list · by id · by user · status-counts · cancel · invoice · payment-url
- [4. Payment](#4-payment) — options · payment-result · GHN webhook
- [5. Inventory](#5-inventory) — CRUD · low-stock · by product/SKU · check/reserve/release-stock
- [6. Social](#6-social) — posts · likes · comments · replies
- [7. Notification](#7-notification) — list · mark read
- [8. Chat (HTTP)](#8-chat-http) — conversations · messages
- [9. Upload](#9-upload) — Cloudinary signature
- [10. Misc](#10-misc) — health
- [WebSocket](#websocket) — Notification WS · Chat WS
- [Notes for Frontend](#notes-for-frontend)

## Base

- **Base URL**: `http://localhost:3000`
- **Auth**: HttpOnly cookie (`access_token`) — all authenticated requests must include `credentials: 'include'`
- **Public routes**: marked `[PUBLIC]`
- **Swagger UI**: `http://localhost:3000/doc`

---

## Common Types

### Success Response Envelope

Every response (except PDFs/binary) goes through `ResponseInterceptor` at the gateway:

```ts
// Raw HTTP body for all successful responses
{
  statusCode: number;
  status: "success";
  message: string;   // "Request Success"
  timestamp: string; // ISO 8601
  data: T;           // actual payload — frontend request() unwraps this automatically
}
```

> The endpoint shapes documented below describe the `data` field content only, not the full HTTP body.

### PaginatedResponse\<T\>

```ts
{
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number; // Math.ceil(total / limit) || 1
  hasNext: boolean;   // page < totalPages
}
```

For paginated endpoints, the `ResponseInterceptor` envelope wraps the entire `PaginatedResponse<T>` object as its `data` field. Frontend `request()` unwraps the outer envelope to `PaginatedResponse<T>` — all pagination metadata is preserved.

### Error Response

```ts
{
  statusCode: number;
  status: "error";
  error: string;       // e.g. "Not Found"
  message: string;
  data: null;
  timestamp: string;
  path: string;
  method: string;
}
```

#### What FE actually receives — `ApiError`, not the body above

`request()` (`src/api/client.ts:33-36`) does **not** hand you that body. It builds:

```ts
{ statusCode: res.status, status: res.status, message: err.message ?? res.statusText }
```

Two traps follow, both real:

- **`status` is a `number` in FE, a `string` in the wire body.** `ApiError.status` is `res.status`
  (e.g. `404`); the raw body's `status` is the literal `"error"`. Never write
  `if (err.status === 'error')`.
- **`message` is typed `string` but is not always one.** NestJS `ValidationPipe` returns
  `message: string[]` for validation failures, and `request()` assigns it through unchecked.
  Callers already defend against this by hand — `postModeration.ts:74` and `productRisk.ts:69`
  both guard `typeof err?.message === 'string'`, `AddressFormModal.tsx:250` wraps in `String(...)`.
  **Do the same in new code**; rendering the raw value puts `[object Object]` or a comma-joined
  blob in front of the user.

Everything else in the wire body (`error`, `path`, `method`, `timestamp`) is **discarded** — if you
need it, you must change `request()`, not read it off the thrown error.

#### Status taxonomy as this app uses it

`ApiErrorState` (`src/components/shared/ApiErrorState.tsx:34-44`) maps these and only these:

| Status | Meaning here | FE behaviour |
|---|---|---|
| `0` | Network failure / server unreachable | Offline state — not a server response |
| `401` | Session expired | `request()` auto-redirects to `/login` unless `skipUnauthorizedRedirect` |
| `403` | Authenticated but wrong role | No redirect — role gates are route-level |
| `404` | Missing or deleted | — |
| `409` | Conflict / duplicate | Idempotent checkout, duplicate brand/category proposals |
| `422` | Validation failed | The `message: string[]` case above |
| `429` | Rate limited | Countdown parsed **out of the message text** (`parseRetrySeconds`), not a header |
| `502` | Gateway → upstream service failed | e.g. Cloudinary auth/quota on `DELETE /upload/media` |
| `503` | Load-shed (SCALE-05) | `request()` **auto-retries once** after `Retry-After` (capped 5s, default 2s) |

A status outside this table renders the generic error card with no tips. `400` in particular is
**not** mapped — it is the most common failure here (`limit > 100`, oversized batch, malformed
DTO) and it surfaces bare, so prefer preventing it client-side.

### Pagination — conventions and hard caps

Every paginated endpoint returns `PaginatedResponse<T>` (above). Beyond the shape:

- **`page` is 1-indexed.** There is no page 0.
- **`limit` is capped at 100.** `limit=200` returns **`400`**, it does not silently clamp — this
  burned the wishlist membership fetch once. Need more than 100 rows? Loop pages; see
  `src/features/wishlist/wishlistCache.ts` (`WISHLIST_ID_PAGE_SIZE = 100`).
- **Batch-by-id endpoints cap at 50 ids** (`POST /products/with-inventory/multiple`), also `400`
  over the limit. `src/api/products.ts` dedupes + `chunk()`s at `MAX_BATCH_PRODUCT_IDS = 50`.
- **Trust `totalPages` / `hasNext`**, don't recompute from `total` — the backend already applies
  the `|| 1` floor for empty result sets.
- **Empty params are dropped, not sent.** `toQuery()` (`src/api/client.ts:47-51`) filters out
  `undefined`, `null` **and `''`**. Clearing a filter therefore works by design; sending an
  intentional empty-string value is impossible.
- **Status counts are not page-scoped.** `GET /order/user/:id/status-counts` counts full history,
  so it will not agree with the length of the current page. That is correct **for the badge** —
  but it is a trap for the list next to it: `GET /order/user/:id` takes **no `status` param**
  (unlike the seller list), so any per-status filtering happens client-side over the loaded pages
  only. Badge says "(1)", list says "không có đơn nào". Either hold the full history before
  filtering (`src/features/order/orderHistoryPaging.ts`) or don't show a count you can't back up.

### Reading "optional" in this file

Three different things get written as optional; they are not interchangeable:

| In a **request** DTO | Meaning |
|---|---|
| Field absent | Backend applies its default — e.g. omitting `sku` on product/inventory create provisions `PROD-<productId>` |
| Field `null` | Explicit clear (where the column is nullable) |
| Unknown field | **Silently stripped.** The gateway runs `ValidationPipe({ whitelist: true })`, so a typo'd param vanishes and the call still returns `200` with an unfiltered result. Verify new params against a network log, never against the UI |

| In a **response** | Meaning |
|---|---|
| `T \| null` | Field exists, value genuinely absent (`ghnOrderCode`, `codAmount`, `productId` on a deleted product) |
| Field missing entirely | Older record or an endpoint variant — narrow before use, `strict` will not save you because the type claims it is there |
| `DECIMAL` columns | May arrive as **strings** (`"50000.00"`). `Number()` them at the boundary before any arithmetic or comparison |

### Enums

**OrderStatus** — 9 values (verified against `src/types/order.ts:20-29`, 2026-08-04)
```
pending | confirmed | processing | shipped | delivering | completed | canceled
| return_requested | refunded
```

> ⚠️ This list previously showed only 6 — `confirmed`, `return_requested` and `refunded` were
> missing, so any agent trusting it would have written a non-exhaustive `switch`. Per-status
> labels/badges/grouping live in **`src/lib/domain/orderStatus.ts`** (`ORDER_STATUS_META`) — that
> file is the FE source of truth; **don't hardcode a status list anywhere else.**
> Who may drive each transition → `.ai/context/domain.md`.

**PaymentMethod**
```
zalopay | vnpay | cod
```

---

## 1. Auth & User

### POST /api/user/register

Auth: [PUBLIC]
Description: Register a new user account.

Request Body:
- `username` (string) [required]
- `email` (string, email) [required]
- `password` (string) [required]

Response 201:
```json
{ "id": 1, "username": "john_doe", "email": "john@example.com", "role": "user" }
```

Errors:
- 400 — validation failure

---

### POST /api/user/login

Auth: [PUBLIC]
Description: Log in. Sets HttpOnly `access_token` cookie (5 h TTL). Returns user object (password stripped).

> **WS auth resolved**: Both WS gateways now read the `access_token` HttpOnly cookie automatically via `withCredentials: true`. No manual token passing required. `handshake.auth.token` / `handshake.query.token` still work as fallbacks for dev/testing.

Request Body:
- `username` (string) [required]
- `password` (string) [required]

Response 200:
```json
{ "id": 1, "username": "john_doe", "email": "john@example.com", "role": "user" }
```

Errors:
- 401 — invalid credentials

---

### POST /api/user/logout

Auth: [PUBLIC]
Description: Clear the `access_token` cookie.

Response 200:
```json
{ "message": "Logged out successfully" }
```

---

### GET /api/user/me

Auth: Cookie
Description: Get the currently authenticated user's profile.

Response 200:
```json
{ "id": 1, "username": "john_doe", "email": "john@example.com", "name": "John", "avatar": null, "role": "user", "isActive": true }
```

Errors:
- 401 — missing or invalid cookie

---

### GET /api/user/:id

Auth: Cookie
Description: Get public profile of any user by ID.

Params:
- `id` (number) [required]

Response 200: User object (same shape as `/me`)

Errors:
- 404 — user not found

---

### PATCH /api/user/:id

Auth: Cookie (own account only)
Description: Update user profile. Can only update own account.

Params:
- `id` (number) [required]

Request Body (all optional):
- `name` (string, min 1) [optional]
- `email` (string, email) [optional]
- `avatar` (string, URL) [optional]

Response 200: Updated user object

Errors:
- 403 — not own account
- 404 — user not found

---

### GET /api/user/all

Auth: Cookie + Role: admin
Description: Get all users.

Response 200: Array of user objects

---

## 2. Product

### POST /api/products

Auth: Cookie + Permission: `product:create:own`
Description: Create a new product.

Request Body:
- `name` (string) [required]
- `price` (number, ≥0) [required]
- `sku` (string) [required]
- `categoryIds` (number[], min 1 item) [required]
- `description` (string) [optional]
- `stockQuantity` (number, ≥0, default 0) [optional]
- `brandId` (number) [optional]
- `userId` (number) [optional]
- `isActive` (boolean, default true) [optional]
- `isFeatured` (boolean, default false) [optional]
- `isTrending` (boolean, default false) [optional]
- `condition` (string: `new` | `used` | `refurbished`, default `new`) [optional]
- `sellerNotes` (string) [optional]
- `rating` (number, 0–5, default 0) [optional]
- `ratingCount` (number, ≥0, default 0) [optional]
- `likesCount` (number, ≥0, default 0) [optional]
- `commentsCount` (number, ≥0, default 0) [optional]
- `sharesCount` (number, ≥0, default 0) [optional]
- `viewCount` (number, ≥0, default 0) [optional]

Response 201: Product object

Errors:
- 400 — validation failure
- 409 — SKU already exists

---

### GET /api/products

Auth: [PUBLIC]
Description: Get all products with filtering and pagination. Returns `PaginatedResponse<Product>`.

Query (all optional):
- `page` (number, default 1)
- `limit` (number, default 10)
- `search` (string) — keyword search
- `categoryId` (number, repeatable — e.g. `?categoryId=1&categoryId=2` for multi-select)
- `brandId` (number, repeatable — e.g. `?brandId=1&brandId=2` for multi-select)
- `minPrice` (number)
- `maxPrice` (number)
- `isActive` (boolean)
- `isFeatured` (boolean)
- `isTrending` (boolean)
- `condition` (`new` | `used` | `refurbished`)
- `minRating` (number, 0–5)
- `maxRating` (number, 0–5)
- `sortBy` (string, default `createdAt`)
- `sortOrder` (`ASC` | `DESC`, default `DESC`)

Response 200: `PaginatedResponse<Product>`

---

### GET /api/products/search

Auth: Cookie
Description: Search products by keyword (same query params as GET /api/products). Returns `PaginatedResponse<Product>`.

---

### GET /api/products/brands

Auth: Cookie
Description: Get all brands.

Response 200: Array of brand objects `{ id, name, description, isActive }`

---

### POST /api/products/brands

Auth: Cookie
Description: Create a new brand.

Request Body:
- `name` (string) [required]
- `description` (string) [optional]
- `isActive` (boolean, default true) [optional]

Response 201: Brand object

---

### GET /api/products/brands/:id

Auth: Cookie
Description: Get a brand by ID.

Response 200: Brand object
Errors: 404

---

### GET /api/products/categories

Auth: Cookie
Description: Get all categories.

Response 200: Array of category objects `{ id, name, description, isActive }`

---

### POST /api/products/categories

Auth: Cookie
Description: Create a new category.

Request Body:
- `name` (string) [required]
- `description` (string) [optional]
- `isActive` (boolean, default true) [optional]

Response 201: Category object

---

### GET /api/products/categories/:id

Auth: Cookie
Description: Get a category by ID.

Response 200: Category object
Errors: 404

---

### GET /api/products/category/:categoryId

Auth: Cookie
Description: Get products filtered by category. Returns `PaginatedResponse<Product>`.

Params: `categoryId` (number) [required]
Query: same pagination/filter params as GET /api/products

---

### GET /api/products/brand/:brandId

Auth: Cookie
Description: Get products filtered by brand. Returns `PaginatedResponse<Product>`.

Params: `brandId` (number) [required]
Query: same pagination/filter params as GET /api/products

---

### GET /api/products/sku/:sku

Auth: Cookie
Description: Get a product by SKU.

Params: `sku` (string) [required]

Response 200: Product object
Errors: 404

---

### GET /api/products/:id

Auth: Cookie
Description: Get a product by ID.

Params: `id` (number) [required]

Response 200: Product object
Errors: 404

---

### PATCH /api/products/:id

Auth: Cookie
Description: Update a product. All fields optional.

Params: `id` (number) [required]

Request Body: Same fields as `CreateProductDto` but all optional (see POST /api/products)

Response 200: Updated product object
Errors: 400, 404, 409 (SKU conflict)

---

### DELETE /api/products/:id

Auth: Cookie
Description: Delete a product.

Params: `id` (number) [required]

Response 204: (no body)
Errors: 404

---

### GET /api/products/with-inventory/all

Auth: Cookie
Description: Get all products with their inventory info. Returns `PaginatedResponse<ProductWithInventory>`.

Query: same as GET /api/products

---

### GET /api/products/:id/with-inventory

Auth: Cookie
Description: Get a product with its inventory by product ID.

Params: `id` (number) [required]

Response 200: Product + inventory object
Errors: 404

---

### POST /api/products/with-inventory/multiple

Auth: Cookie
Description: Batch fetch products with inventory.

Request Body:
- `productIds` (number[]) [required]

Response 200: Array of product+inventory objects

---

### GET /api/products/:id/stock-check

Auth: Cookie
Description: Check stock availability for a product.

Params: `id` (number) [required]
Query:
- `quantity` (number) [required] — requested quantity

Response 200:
```json
{ "available": true, "availableStock": 50 }
```
Errors: 404

---

## 3. Order

### POST /api/order

Auth: Cookie
Description: Place a new order. Reserves stock and initiates payment flow.

Request Body:
- `payment_method` (enum: `zalopay` | `vnpay` | `cod`) [required]
- `shipping_address` (string, max 500 chars) [required]
- `items` (array) [required]:
  - `product_id` (number) [required]
  - `product_name` (string) [required]
  - `quantity` (number, ≥1) [required]
  - `price` (number, ≥0) [required]

Response 201:
```json
{
  "id": 62,
  "user_id": 1,
  "status": "pending",
  "total": "198000.00",
  "payment_method": "zalopay",
  "shipping_address": "123 Nguyen Hue, District 1, HCM",
  "cod_amount": null,
  "ghn_order_code": null,
  "created_at": "2026-06-01T00:00:00.000Z",
  "items": [...]
}
```

Errors:
- 400 — insufficient stock or invalid payload
- 401 — not authenticated

---

### GET /api/order/admin/orders

Auth: Cookie + Permission: `order:read:any` (admin)
Description: List all orders with buyer info (paginated). Returns `PaginatedResponse<OrderWithBuyer>`.

Query:
- `page` (number, default 1) [optional]
- `limit` (number, 1–100, default 20) [optional]

Response 200: `PaginatedResponse<{ ...order, buyer: { id, username, email, name } }>`

Errors:
- 401 — unauthenticated
- 403 — not admin

---

### GET /api/order/:id

Auth: Cookie (owner or admin)
Description: Get a single order with items.

Params: `id` (string/number) [required]

Response 200: Order object with `items[]`

Errors:
- 401, 403, 404

---

### GET /api/order/user/:id

Auth: Cookie
Description: Get paginated orders for a given user. Returns `PaginatedResponse<Order>`.
Each order item is server-enriched with `skuId`, `skuLabel` (e.g. `"Màu sắc: Đỏ, Size: M"`, or `null` when the product has no variations) and `image` (first product image realtime, or `null`). The whole page is batch-enriched. Product **name** is NOT included — hydrate via `useProductsByIds` when needed.

Params: `id` (string, user ID) [required]
Query:
- `page` (number, default 1) [optional]
- `limit` (number, 1–100, default 10) [optional]
- **Không có `status`.** `GetOrdersByUserQueryDto` chỉ khai báo 2 param trên; gửi `status=` sẽ bị
  `ValidationPipe({ whitelist: true })` nuốt im lặng và vẫn trả 200 với list **chưa lọc**. Danh
  sách seller (`GET /order/seller/orders`) thì có — đừng suy từ bên kia sang. Đã ghi vào
  `backend-handoff.md` (Open 2026-08-04).

Response 200: `PaginatedResponse<Order>`

> The same `skuId` / `skuLabel` / `image` enrichment applies to `GET /api/order/:id`.

---

### GET /api/order/user/:id/status-counts

Auth: Cookie
Description: Full-history order count per status for a user (not page-scoped) — drives the buyer filter-tab badges. Returns `OrderStatusCounts`.

Params: `id` (string, user ID) [required]

Response 200:
```json
{ "all": 21, "pending": 3, "confirmed": 4, "processing": 5, "shipped": 2, "delivering": 1, "completed": 5, "canceled": 1 }
```

---

### PATCH /api/order/:id/cancel

Auth: Cookie (owner or admin)
Description: Cancel an order. Only `pending` or `processing` orders can be canceled.

Params: `id` (string/number) [required]

Response 200: Updated order object

Errors:
- 400 — invalid status transition
- 401, 403, 404

---

### GET /api/order/:id/invoice

Auth: Cookie (owner only)
Description: Download PDF invoice for an order.

Params: `id` (string/number) [required]

Response 200: Binary PDF (`Content-Type: application/pdf`, `Content-Disposition: attachment; filename="invoice-{id}.pdf"`)

Errors:
- 403, 404

---

### GET /api/order/:id/payment-url

Auth: Cookie
Description: Get ZaloPay payment URL for a pending order.

Params: `id` (string/number) [required]

Response 200:
```json
{ "order_url": "https://zalopay.vn/...", "status": "pending" }
```

---

## 4. Payment

### GET /api/payment/options

Auth: [PUBLIC]
Description: Get available payment methods (driven by `is_active` column in DB).

Response 200:
```json
{
  "options": [
    { "id": "zalopay", "name": "ZaloPay", "description": "..." },
    { "id": "vnpay",   "name": "VNPay",   "description": "..." },
    { "id": "cod",     "name": "COD",      "description": "..." }
  ]
}
```

---

### GET /api/gateway/payment-result

Auth: [PUBLIC]
Description: Payment redirect landing page. ZaloPay and VNPay redirect here after payment.

Query (ZaloPay): `apptransid`, `status` (1=success), `amount`
Query (VNPay): `vnp_TxnRef`, `vnp_ResponseCode` (00=success), `vnp_Amount`

Response 200:
```json
{ "gateway": "zalopay", "status": "success", "transId": "...", "amount": "99000" }
```

Errors:
- 400 — missing transaction reference

---

### POST /ghn/webhook

Auth: [PUBLIC] — called by GHN shipping service
Description: GHN shipping status webhook. Maps GHN statuses to internal `OrderStatus`.

Request Body:
- `order_code` (string) [required]
- `status` (string) [required] — GHN status code

Status mapping:
- `picking` / `picked` → `shipped`
- `delivering` → `delivering`
- `delivered` → `completed` (also emits `payment_completed` for COD orders)

Response 200: `{ "success": true }`

---

## 5. Inventory

### POST /api/inventory

Auth: Cookie
Description: Create an inventory record for a product.

Request Body:
- `productId` (number) [required]
- `sku` (string) [required]
- `availableStock` (number, ≥0) [required]
- `minimumStock` (number, ≥0) [optional]
- `location` (string) [optional]

Response 201: Inventory object
Errors: 400, 409 (product already has inventory)

---

### GET /api/inventory

Auth: Cookie
Description: Get all inventory items.

Response 200: Array of inventory objects

---

### GET /api/inventory/low-stock

Auth: Cookie
Description: Get items below minimum stock threshold.

Response 200: Array of inventory objects

---

### GET /api/inventory/product/:productId

Auth: Cookie
Description: Get inventory record by product ID.

Params: `productId` (number) [required]

Response 200: Inventory object
Errors: 404

---

### GET /api/inventory/sku/:sku

Auth: Cookie
Description: Get inventory record by SKU.

Params: `sku` (string) [required]

Response 200: Inventory object
Errors: 404

---

### GET /api/inventory/:id

Auth: Cookie
Description: Get inventory record by inventory ID.

Params: `id` (number) [required]

Response 200: Inventory object
Errors: 404

---

### PUT /api/inventory/:id

Auth: Cookie
Description: Update an inventory record.

Params: `id` (number) [required]

Request Body: Same optional fields as CreateInventoryDto (all optional)

Response 200: Updated inventory object

---

### DELETE /api/inventory/:id

Auth: Cookie
Description: Delete an inventory record.

Params: `id` (number) [required]

Response 200: Deletion result

---

### POST /api/inventory/check-stock

Auth: Cookie
Description: Check if requested quantity is available.

Request Body:
- `productId` (number) [required]
- `quantity` (number, ≥1) [required]

Response 200: `{ "available": boolean, "availableStock": number }`

---

### POST /api/inventory/reserve-stock

Auth: Cookie
Description: Reserve stock atomically (prevents oversell).

Request Body:
- `productId` (number) [required]
- `quantity` (number, ≥1) [required]

Response 200: Updated inventory object
Errors: 400 (insufficient stock), 404

---

### POST /api/inventory/release-stock

Auth: Cookie
Description: Release previously reserved stock.

Request Body:
- `productId` (number) [required]
- `quantity` (number, ≥1) [required]

Response 200: Updated inventory object
Errors: 400, 404

---

## 6. Social

### POST /api/social/posts

Auth: Cookie
Description: Create a new social post.

Request Body:
- `content` (string, max 5000) [required]
- `imageUrls` (string[], each a valid URL) [optional]
- `videoUrl` (string, URL) [optional]

Response 201: Post object

---

### GET /api/social/posts

Auth: [PUBLIC]
Description: Get paginated posts feed. Returns `PaginatedResponse<Post>`.

Query:
- `page` (number, default 1) [optional]
- `limit` (number, 1–100, default 20) [optional]

Response 200: `PaginatedResponse<Post>` — each post includes `likeCount` (from Redis cache)

---

### GET /api/social/posts/user/:userId

Auth: [PUBLIC]
Description: Get posts by a specific user. Returns `PaginatedResponse<Post>`.

Params: `userId` (number) [required]
Query: same as GET /api/social/posts

---

### GET /api/social/posts/:id

Auth: [PUBLIC]
Description: Get a single post by ID.

Params: `id` (number) [required]

Response 200: Post object with `likeCount`
Errors: 404

---

### POST /api/social/posts/:id/like

Auth: Cookie
Description: Like a post.

Params: `id` (number) [required]

Response 201: `{ "likeCount": number }`

Errors:
- 404 — post not found
- 409 — already liked

---

### DELETE /api/social/posts/:id/like

Auth: Cookie
Description: Unlike a post.

Params: `id` (number) [required]

Response 200: `{ "likeCount": number }`

Errors:
- 404 — like not found

---

### DELETE /api/social/posts/:id

Auth: Cookie (owner only)
Description: Delete a post.

Params: `id` (number) [required]

Response 200: Deletion result

Errors:
- 403 — not the post owner
- 404

---

### POST /api/social/posts/:id/comments

Auth: Cookie
Description: Create a top-level comment on a post.

Params: `id` (number, post ID) [required]

Request Body:
- `content` (string, max 1000) [required]

Response 201: Comment object

Errors:
- 401, 404 (post not found)

---

### GET /api/social/posts/:id/comments

Auth: [PUBLIC]
Description: Get paginated top-level comments for a post. Returns `PaginatedResponse<Comment>` with `reply_count` per comment.

Params: `id` (number, post ID) [required]
Query:
- `page` (number, default 1) [optional]
- `limit` (number, 1–100, default 20) [optional]

Response 200: `PaginatedResponse<Comment>`

---

### DELETE /api/social/comments/:id

Auth: Cookie (owner only)
Description: Delete a comment.

Params: `id` (number, comment ID) [required]

Response 200: Deletion result

Errors:
- 403, 404

---

### POST /api/social/comments/:id/replies

Auth: Cookie
Description: Reply to a comment (infinite nesting via materialized path).

Params: `id` (number, parent comment ID) [required]

Request Body:
- `content` (string, max 1000) [required]
- `postId` (number, ≥1) [required]

Response 201: Reply (comment) object

Errors:
- 401, 404 (parent comment not found)

---

### GET /api/social/comments/:id/replies

Auth: [PUBLIC]
Description: Get the reply tree for a comment (descendant tree, max depth 5).

Params: `id` (number, comment ID) [required]
Query:
- `depth` (number, 1–10) [optional]

Response 200: Nested comment tree

Errors: 404

---

## 7. Notification

### GET /api/notifications

Auth: Cookie
Description: Get paginated notifications for the current user. Returns `PaginatedResponse<Notification>`.

Query:
- `page` (number, default 1) [optional]
- `limit` (number, 1–100, default 20) [optional]

Response 200: `PaginatedResponse<Notification>`

```ts
// Notification shape
{
  id: number;
  user_id: number;
  type: string;       // e.g. "payment_completed", "order_canceled", "comment", "reply"
  order_id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}
```

Errors: 401

---

### PATCH /api/notifications/:id/read

Auth: Cookie
Description: Mark a notification as read.

Params: `id` (number) [required]

Response 200: `{ "success": true }`

Errors: 401

---

## 8. Chat (HTTP)

### POST /api/chat/conversations

Auth: Cookie
Description: Create a new 1-1 conversation or return an existing one between the current user and another.

Request Body:
- `otherUserId` (number, ≥1) [required]

Response 200/201:
```json
{ "id": 1, "user1Id": 3, "user2Id": 7, "createdAt": "2026-06-01T00:00:00.000Z" }
```

Note: `user1Id` is always `min(callerId, otherUserId)`, `user2Id` is `max(...)`. No `participants[]` array.

---

### GET /api/chat/conversations

Auth: Cookie
Description: Get all conversations for the current user (sorted by `created_at DESC`).

> **Not implemented**: no last-message preview. Returns bare `Conversation[]` — frontend must fetch messages separately to build a preview.

Response 200:
```json
[{ "id": 1, "user1Id": 3, "user2Id": 7, "createdAt": "2026-06-01T00:00:00.000Z" }]
```

---

### GET /api/chat/conversations/:id/messages

Auth: Cookie
Description: Get paginated messages in a conversation. Returns `PaginatedResponse<Message>`.

Params: `id` (number, conversation ID) [required]
Query:
- `page` (number, default 1) [optional]
- `limit` (number, 1–100, default 50) [optional]

Response 200: `PaginatedResponse<Message>`

```ts
// Message shape
{
  id: number;
  conversationId: number;
  senderId: number;
  content: string;
  parentMessageId: number | null;
  createdAt: string;
}
```

---

## 9. Upload

### POST /api/upload/signature

Auth: Cookie
Description: Generate a Cloudinary signed upload signature. Client uses this to upload directly to Cloudinary.

Query:
- `folder` (string) [required] — e.g. `trybuy/products` or `trybuy/posts`

Response 200:
```json
{
  "signature": "abc123...",
  "timestamp": 1717200000,
  "cloudName": "your-cloud",
  "apiKey": "123456789",
  "folder": "trybuy/products"
}
```

Errors: 401

---

## 10. Misc

### GET /api/gateway/health

Auth: [PUBLIC]
Description: Health check endpoint (rate limited: 10 req/60s).

Response 200:
```json
{
  "status": "UP",
  "timestamp": "2026-06-01T00:00:00.000Z",
  "uptime": 3600,
  "memory": { "used": 100, "total": 512 },
  "services": { "orders": "UP", "inventory": "UP", "user": "UP", "product": "UP" }
}
```

Errors: 429 — rate limit exceeded

---

## WebSocket

### Notification WS

| Property  | Value                                    |
|-----------|------------------------------------------|
| Port      | 3010                                     |
| Namespace | `/` (default, no namespace path)         |
| CORS      | `*`                                      |
| URL       | `ws://localhost:3010` (or via nginx `/socket.io/`) |

**Authentication** (on connect):
Cookie `access_token` is sent automatically when `withCredentials: true` — no manual token required.
Fallback: pass JWT via `handshake.auth.token` or `handshake.query.token` (dev/testing only).
Server reads `payload.userId`, joins room `user:{userId}`.
Invalid/missing token → immediate disconnect.

**Events received from server:**

| Event          | Payload                  | Description                              |
|----------------|--------------------------|------------------------------------------|
| `notification` | Notification object (see Notification shape above) | Fired after any notification is saved to DB |

**No client-to-server events** — server-push only.

**Example (socket.io-client):**
```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:3010', {
  withCredentials: true, // sends access_token cookie automatically
});
socket.on('notification', (data) => console.log(data));
```

---

### Chat WS

| Property  | Value                                           |
|-----------|-------------------------------------------------|
| Port      | 3000                                            |
| Namespace | `/chat`                                         |
| CORS      | `FRONTEND_URL` env (default `http://localhost:5173`) |
| URL       | `ws://localhost:3000/chat` (or via nginx `/chat/`) |

**Authentication** (on connect):
Cookie `access_token` is sent automatically when `withCredentials: true` — no manual token required.
Fallback: pass JWT via `handshake.auth.token` or `handshake.query.token` (dev/testing only).
Server reads `payload.userId`, stores in `socket.data.userId`, joins room `user:{userId}`.
Invalid/missing token → immediate disconnect.

**Events sent by client:**

| Event          | Payload                                                                        | Description                                  |
|----------------|--------------------------------------------------------------------------------|----------------------------------------------|
| `join`         | `{ conversationId: number }`                                                   | Join a conversation room (membership checked) |
| `send_message` | `{ conversationId: number, content: string, parentMessageId?: number }` | Send a message (or reply if `parentMessageId` set) |

**Events received from server:**

| Event         | Payload                       | Description                              |
|---------------|-------------------------------|------------------------------------------|
| `new_message` | Message object (see shape above) | Broadcast to all members of `conv:{id}` |
| `error`       | `string`                      | Auth failure or send failure             |

**Example (socket.io-client):**
```js
import { io } from 'socket.io-client';
const socket = io('http://localhost:3000/chat', {
  withCredentials: true, // sends access_token cookie automatically
});
socket.emit('join', { conversationId: 1 });
socket.emit('send_message', { conversationId: 1, content: 'Hello!' });
socket.on('new_message', (msg) => console.log(msg));
```

---

## Notes for Frontend

- **Cookie auth**: use `fetch` with `credentials: 'include'`; do NOT use `Authorization` header
- **JWT**: never stored in localStorage — HttpOnly cookie only
- **Pagination**: every paginated endpoint returns `PaginatedResponse<T>` with `totalPages` + `hasNext`
- **Upload flow**: `POST /api/upload/signature` → upload directly to Cloudinary (not through server)
- **WS auth**: both WS gateways (notification port 3010, chat port 3000/chat) read the `access_token` HttpOnly cookie automatically — connect with `withCredentials: true`, no manual token handling needed. `handshake.auth.token` / `handshake.query.token` still work as dev fallbacks.
- **WS JWT claim**: both gateways read `payload.userId` — matches how the JWT is signed.
- **`total` field on orders**: TypeORM returns `DECIMAL` as string — parse with `Number()` before arithmetic
- **GHN webhook**: excluded from `/api/` prefix — route is `/ghn/webhook`
- **5-day chat retention**: messages older than 5 days are automatically cleaned up by a cron job
