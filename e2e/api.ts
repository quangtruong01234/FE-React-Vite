import type { APIRequestContext } from '@playwright/test';

// Direct API reads for specs, through the Vite proxy with the project's cached
// session cookies. They exist so specs target real ids fetched at run time
// instead of hard-coded ones that drift as the DB changes.
//
// Public ids (`usr_`, `ord_`, `post_`, `prod_`) are opaque strings — never pass
// them through `Number()`. Numeric account ids from test-accounts.md do NOT
// work against the id-scoped endpoints any more; resolve `me` instead.

// The gateway wraps every body as `{ data: T }` — same unwrap as `request()`.
async function getData(request: APIRequestContext, path: string): Promise<unknown> {
  const res = await request.get(`/api${path}`);
  if (!res.ok()) return null;
  const json: unknown = await res.json();
  if (json !== null && typeof json === 'object' && 'data' in json && !Array.isArray(json)) {
    return (json as { data: unknown }).data;
  }
  return json;
}

// Paginated lists come back as `{ data: T[] }`; a few older ones as a bare array.
function rows(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) return payload as Record<string, unknown>[];
  if (payload !== null && typeof payload === 'object' && 'data' in payload) {
    const inner = (payload as { data: unknown }).data;
    if (Array.isArray(inner)) return inner as Record<string, unknown>[];
  }
  return [];
}

function firstId(payload: unknown): string | null {
  const id = rows(payload)[0]?.id;
  return id === undefined || id === null ? null : String(id);
}

export async function currentUserId(request: APIRequestContext): Promise<string | null> {
  const me = await getData(request, '/user/me');
  if (me === null || typeof me !== 'object' || !('id' in me)) return null;
  return String((me as { id: unknown }).id);
}

export async function firstPostId(request: APIRequestContext): Promise<string | null> {
  return firstId(await getData(request, '/social/posts?page=1&limit=1'));
}

export async function firstProductId(request: APIRequestContext): Promise<string | null> {
  return firstId(await getData(request, '/products/with-inventory/all?page=1&limit=1'));
}

// `userId` is load-bearing on `/products` — without it the list is active-only
// and not scoped to the seller (see ShopPage).
export async function ownProductId(request: APIRequestContext): Promise<string | null> {
  const me = await currentUserId(request);
  if (me === null) return null;
  return firstId(await getData(request, `/products?userId=${me}&limit=1`));
}

export interface OrderRow {
  id: string;
  status: string;
  paymentMethod: string;
}

export async function listOrders(request: APIRequestContext): Promise<OrderRow[]> {
  const me = await currentUserId(request);
  if (me === null) return [];
  return rows(await getData(request, `/order/user/${me}?page=1&limit=50`)).map((o) => ({
    id: String(o.id),
    status: String(o.status),
    paymentMethod: String(o.paymentMethod),
  }));
}

export interface SellerOrderRow extends OrderRow {
  paidAt: string | null;
}

// The shop's own orders in one status, read with the same page/limit as
// `/sell/orders` (LIMIT 10) so every row returned is on the tab's first page.
export async function listSellerOrders(
  request: APIRequestContext,
  status: string,
): Promise<SellerOrderRow[]> {
  return rows(await getData(request, `/order/seller?page=1&limit=10&status=${status}`)).map((o) => ({
    id: String(o.id),
    status: String(o.status),
    paymentMethod: String(o.paymentMethod),
    paidAt: typeof o.paidAt === 'string' ? o.paidAt : null,
  }));
}

export async function sellerOrderStatus(request: APIRequestContext, id: string): Promise<string | null> {
  const order = await getData(request, `/order/seller/${id}`);
  if (order === null || typeof order !== 'object' || !('status' in order)) return null;
  return String((order as { status: unknown }).status);
}

export async function findOrder(
  request: APIRequestContext,
  predicate: (o: OrderRow) => boolean,
): Promise<OrderRow | undefined> {
  return (await listOrders(request)).find(predicate);
}

export interface SellerVoucherRow {
  id: number;
  code: string;
  description: string | null;
  usageLimit: number | null;
  isActive: boolean;
  sellerId: string | null;
}

// The shop's own vouchers, newest first — the same first page `/sell/vouchers`
// renders (LIMIT 20). Voucher ids are still numeric; `sellerId` is a `usr_` id.
export async function findSellerVoucher(
  request: APIRequestContext,
  code: string,
): Promise<SellerVoucherRow | undefined> {
  const row = rows(await getData(request, '/order/vouchers/mine?page=1&limit=20')).find(
    (v) => v.code === code,
  );
  if (!row) return undefined;
  return {
    id: Number(row.id),
    code: String(row.code),
    description: typeof row.description === 'string' ? row.description : null,
    usageLimit: typeof row.usageLimit === 'number' ? row.usageLimit : null,
    isActive: row.isActive === true,
    sellerId: typeof row.sellerId === 'string' ? row.sellerId : null,
  };
}

// Cleanup for specs that create a voucher: a test voucher left on would show
// up in real buyers' checkout suggestions for this shop.
export async function deactivateSellerVoucher(request: APIRequestContext, id: number): Promise<void> {
  await request.patch(`/api/order/vouchers/${id}/deactivate`);
}

// Platform vouchers (admin context), searched by code so the row is found
// whatever page the list puts it on.
export async function findAdminVoucher(
  request: APIRequestContext,
  code: string,
): Promise<SellerVoucherRow | undefined> {
  const row = rows(
    await getData(request, `/order/admin/vouchers?page=1&limit=20&q=${encodeURIComponent(code)}`),
  ).find((v) => v.code === code);
  if (!row) return undefined;
  return {
    id: Number(row.id),
    code: String(row.code),
    description: typeof row.description === 'string' ? row.description : null,
    usageLimit: typeof row.usageLimit === 'number' ? row.usageLimit : null,
    isActive: row.isActive === true,
    sellerId: typeof row.sellerId === 'string' ? row.sellerId : null,
  };
}

// Cleanup: a platform test code left on would be offered at every checkout.
export async function deactivateAdminVoucher(request: APIRequestContext, id: number): Promise<void> {
  await request.patch(`/api/order/admin/vouchers/${id}/deactivate`);
}

export async function orderStatus(request: APIRequestContext, id: string): Promise<string | null> {
  const order = await getData(request, `/order/${id}`);
  if (order === null || typeof order !== 'object' || !('status' in order)) return null;
  return String((order as { status: unknown }).status);
}

// The shop's order ids in one status, over more than the tab's first page —
// for picking seed data, not for asserting what a tab renders.
export async function sellerOrderIds(request: APIRequestContext, status: string): Promise<Set<string>> {
  const list = rows(await getData(request, `/order/seller?page=1&limit=50&status=${status}`));
  return new Set(list.map((o) => String(o.id)));
}

export interface ReturnRequestRow {
  id: string;
  orderId: string;
  status: string;
  reason: string;
  rejectReason: string | null;
}

function toReturnRow(r: Record<string, unknown>): ReturnRequestRow {
  return {
    id: String(r.id),
    orderId: String(r.orderId),
    status: String(r.status),
    reason: String(r.reason),
    rejectReason: typeof r.rejectReason === 'string' ? r.rejectReason : null,
  };
}

// Buyer's own requests, newest first (the list `/returns` and `/order/:id` read).
export async function listMyReturnRequests(request: APIRequestContext): Promise<ReturnRequestRow[]> {
  return rows(await getData(request, '/order/return-requests/mine?page=1&limit=50')).map(toReturnRow);
}

// Seller queue in one status — same first page `/sell/returns` renders (LIMIT 10).
export async function listReturnQueue(
  request: APIRequestContext,
  status: string,
): Promise<ReturnRequestRow[]> {
  return rows(await getData(request, `/order/return-requests?page=1&limit=10&status=${status}`)).map(
    toReturnRow,
  );
}

// Seeding (buyer context): parks the order at `return_requested`.
export async function requestReturn(
  request: APIRequestContext,
  orderId: string,
  reason: string,
): Promise<ReturnRequestRow | null> {
  const res = await request.post(`/api/order/${orderId}/return-request`, { data: { reason } });
  if (!res.ok()) return null;
  const json = (await res.json()) as { data?: Record<string, unknown> };
  return json.data ? toReturnRow(json.data) : null;
}

// Cleanup (seller context): rejecting restores the order's previous status, and
// the buyer may request again — the one review action that leaves data reusable.
// Never approve from a spec: approval is a one-way refund.
export async function rejectReturnRequest(
  request: APIRequestContext,
  id: string,
  reason: string,
): Promise<void> {
  await request.post(`/api/order/return-requests/${id}/reject`, { data: { reason } });
}

export interface CartLineRow {
  // Cart-row ids stay numeric (not a public id); `productId` is a `prod_` id.
  id: number;
  productId: string;
  quantity: number;
}

export async function cartLines(request: APIRequestContext): Promise<CartLineRow[]> {
  const cart = await getData(request, '/cart');
  if (cart === null || typeof cart !== 'object' || !('items' in cart)) return [];
  const items = (cart as { items: unknown }).items;
  if (!Array.isArray(items)) return [];
  return (items as Record<string, unknown>[]).map((i) => ({
    id: Number(i.id),
    productId: String(i.productId),
    quantity: Number(i.quantity),
  }));
}

// Cleanup for specs that add to the cart: put a line back to what it was, or
// drop a line the spec created. Other specs need the buyer's cart as seeded.
export async function setCartLineQuantity(
  request: APIRequestContext,
  id: number,
  quantity: number,
): Promise<void> {
  await request.patch(`/api/cart/items/${id}`, { data: { quantity } });
}

export async function removeCartLine(request: APIRequestContext, id: number): Promise<void> {
  await request.delete(`/api/cart/items/${id}`);
}

export interface BuyableProduct {
  id: string;
  name: string;
  stock: number;
  sellerId: string;
}

// A product the caller can actually buy: someone else's, a single SKU (no tier
// picker to drive), and at least two units in stock so a quantity bump fits.
export async function buyableProduct(request: APIRequestContext): Promise<BuyableProduct | null> {
  const me = await currentUserId(request);
  const list = rows(await getData(request, '/products/with-inventory/all?page=1&limit=30'));
  for (const p of list) {
    const inventory = p.inventory as { availableStock?: unknown } | null | undefined;
    const stock = typeof inventory?.availableStock === 'number' ? inventory.availableStock : 0;
    const variants = Array.isArray(p.variations) ? p.variations.length : 0;
    if (p.userId === me || variants > 0 || stock < 2 || typeof p.name !== 'string') continue;
    return { id: String(p.id), name: p.name, stock, sellerId: String(p.userId) };
  }
  return null;
}

// Every wishlisted product id (the same walk `useWishlistIds` does).
export async function wishlistIds(request: APIRequestContext): Promise<Set<string>> {
  return new Set(
    rows(await getData(request, '/products/wishlist?page=1&limit=100')).map((p) => String(p.id)),
  );
}

// Both are idempotent server-side, so cleanup can call them blind.
export async function addToWishlist(request: APIRequestContext, productId: string): Promise<void> {
  await request.post(`/api/products/wishlist/${productId}`);
}

export async function removeFromWishlist(request: APIRequestContext, productId: string): Promise<void> {
  await request.delete(`/api/products/wishlist/${productId}`);
}

export interface AddressRow {
  id: string;
  recipientName: string;
  phone: string;
  addressLine: string;
  isDefault: boolean;
}

export async function listAddresses(request: APIRequestContext): Promise<AddressRow[]> {
  return rows(await getData(request, '/user/me/addresses')).map((a) => ({
    id: String(a.id),
    recipientName: String(a.recipientName),
    phone: String(a.phone),
    addressLine: String(a.addressLine),
    isDefault: a.isDefault === true,
  }));
}

export async function deleteAddress(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/user/me/addresses/${id}`);
}

export async function setDefaultAddress(request: APIRequestContext, id: string): Promise<void> {
  await request.patch(`/api/user/me/addresses/${id}/default`);
}

export async function currentUserName(request: APIRequestContext): Promise<string | null> {
  const me = await getData(request, '/user/me');
  if (me === null || typeof me !== 'object' || !('name' in me)) return null;
  const name = (me as { name: unknown }).name;
  return typeof name === 'string' ? name : null;
}

export async function currentUserEmail(request: APIRequestContext): Promise<string | null> {
  const me = await getData(request, '/user/me');
  if (me === null || typeof me !== 'object' || !('email' in me)) return null;
  const email = (me as { email: unknown }).email;
  return typeof email === 'string' ? email : null;
}

// Cleanup for the profile spec: put the display name back.
export async function setUserName(request: APIRequestContext, id: string, name: string): Promise<void> {
  await request.patch(`/api/user/${id}`, { data: { name } });
}

// Admin-only: the role an account holds, looked up by exact username through
// the paginated `/user?q=` search that the `/admin` users table reads.
export async function userRoleByUsername(request: APIRequestContext, username: string): Promise<string | null> {
  const list = rows(await getData(request, `/user?page=1&limit=20&q=${encodeURIComponent(username)}`));
  const role = list.find((u) => u.username === username)?.role;
  if (role === null || typeof role !== 'object' || !('name' in role)) return null;
  const name = (role as { name: unknown }).name;
  return typeof name === 'string' ? name : null;
}

// Full-history per-status counts — what the `/orders` filter badges show.
export async function orderStatusCounts(request: APIRequestContext): Promise<Record<string, number>> {
  const me = await currentUserId(request);
  if (me === null) return {};
  const counts = await getData(request, `/order/user/${me}/status-counts`);
  if (counts === null || typeof counts !== 'object') return {};
  return counts as Record<string, number>;
}

// Seeding for moderation specs: a throwaway post (author context) and a report
// on it (any OTHER account — the backend refuses self-reports).
export async function createPost(request: APIRequestContext, content: string): Promise<string | null> {
  const res = await request.post('/api/social/posts', { data: { content } });
  if (!res.ok()) return null;
  const json = (await res.json()) as { data?: { id?: unknown } };
  return json.data?.id === undefined || json.data.id === null ? null : String(json.data.id);
}

export async function reportPost(request: APIRequestContext, id: string, reason: string): Promise<boolean> {
  return (await request.post(`/api/social/posts/${id}/report`, { data: { reason } })).ok();
}

export async function deletePost(request: APIRequestContext, id: string): Promise<void> {
  await request.delete(`/api/social/posts/${id}`);
}

// The id of the feed post whose content is exactly `content` (server-side
// search, SEARCH-01), or null — how a spec finds a post it made through the UI.
export async function postIdByContent(request: APIRequestContext, content: string): Promise<string | null> {
  const list = rows(await getData(request, `/social/posts?page=1&limit=10&search=${encodeURIComponent(content)}`));
  const hit = list.find((p) => p.content === content);
  return hit === undefined ? null : String(hit.id);
}

export interface PostState {
  isLiked: boolean;
  likeCount: number;
  commentCount: number;
}

// What the server holds for one post as the caller sees it; null once it is gone.
export async function postState(request: APIRequestContext, id: string): Promise<PostState | null> {
  const p = await getData(request, `/social/posts/${id}`);
  if (p === null || typeof p !== 'object') return null;
  const post = p as Record<string, unknown>;
  return {
    isLiked: post.isLiked === true,
    likeCount: Number(post.likeCount ?? 0),
    commentCount: Number(post.commentCount ?? 0),
  };
}

export async function likePost(request: APIRequestContext, id: string): Promise<boolean> {
  return (await request.post(`/api/social/posts/${id}/like`)).ok();
}

// The caller's notification ids of one type pointing at one post (newest first).
export async function postNotificationIds(
  request: APIRequestContext,
  postId: string,
  type: string,
): Promise<string[]> {
  return rows(await getData(request, '/notifications?page=1&limit=20'))
    .filter((n) => n.type === type && n.postId === postId)
    .map((n) => String(n.id));
}

export async function markNotificationRead(request: APIRequestContext, id: string): Promise<void> {
  await request.patch(`/api/notifications/${id}/read`);
}

export interface OwnProduct {
  id: string;
  name: string;
}

// The shop's first product with its name — risk specs search the admin queue by it.
export async function ownProduct(request: APIRequestContext): Promise<OwnProduct | null> {
  const me = await currentUserId(request);
  if (me === null) return null;
  const row = rows(await getData(request, `/products?userId=${me}&limit=1`))[0];
  if (!row || row.id === undefined || typeof row.name !== 'string') return null;
  return { id: String(row.id), name: row.name };
}

export interface ShopProductRow {
  id: string;
  name: string;
  sku: string;
  isActive: boolean;
  approvalBlocked: boolean;
  variations: number;
}

// The shop's own catalogue, every state included — the same `userId`-scoped
// read the `/shop` table makes (without `userId` the list is active-only).
export async function shopProducts(request: APIRequestContext): Promise<ShopProductRow[]> {
  const me = await currentUserId(request);
  if (me === null) return [];
  return rows(await getData(request, `/products?userId=${me}&limit=50`)).flatMap((p) =>
    typeof p.name === 'string' && typeof p.sku === 'string'
      ? [
          {
            id: String(p.id),
            name: p.name,
            sku: p.sku,
            isActive: p.isActive !== false,
            approvalBlocked: p.approvalBlocked === true,
            variations: Array.isArray(p.variations) ? p.variations.length : 0,
          },
        ]
      : [],
  );
}

// Cleanup for the shop specs: put a field the spec changed back.
export async function patchProduct(
  request: APIRequestContext,
  id: string,
  patch: { name?: string; isActive?: boolean },
): Promise<void> {
  await request.patch(`/api/products/${id}`, { data: patch });
}

// Catalog review (`/admin/brands/pending`, `/admin/categories/pending`). Brand and
// category ids stay numeric. Any signed-in account may submit; the row starts
// `pending`. There is no delete endpoint, so specs clean up by rejecting: a
// rejected row is hidden from every list and does not reserve its name.
export type CatalogKind = 'brands' | 'categories';

export interface CatalogItemRow {
  id: number;
  status: string;
  reviewNote: string | null;
}

export async function submitCatalogItem(
  request: APIRequestContext,
  kind: CatalogKind,
  name: string,
): Promise<number | null> {
  const res = await request.post(`/api/products/${kind}`, { data: { name, description: '[E2E] seeded' } });
  if (!res.ok()) return null;
  const json = (await res.json()) as { data?: { id?: unknown } };
  return json.data?.id === undefined || json.data.id === null ? null : Number(json.data.id);
}

export async function catalogItem(
  request: APIRequestContext,
  kind: CatalogKind,
  id: number,
): Promise<CatalogItemRow | null> {
  const item = await getData(request, `/products/${kind}/${id}`);
  if (item === null || typeof item !== 'object') return null;
  const row = item as Record<string, unknown>;
  return {
    id: Number(row.id),
    status: String(row.status),
    reviewNote: typeof row.reviewNote === 'string' ? row.reviewNote : null,
  };
}

// Cleanup (admin context): approve → reject is allowed, so an approved test row
// can be taken back out of the public catalog.
export async function rejectCatalogItem(
  request: APIRequestContext,
  kind: CatalogKind,
  id: number,
): Promise<void> {
  await request.patch(`/api/products/${kind}/${id}/review`, {
    data: { action: 'reject', note: '[E2E] cleanup' },
  });
}

// --- Chat (`/messages`) ---

// The conversation between the caller and `otherUserId`, or null when they have
// never talked. Conversation and message ids are opaque `conv_` / `msg_` strings.
export async function conversationWith(
  request: APIRequestContext,
  otherUserId: string,
): Promise<string | null> {
  const row = rows(await getData(request, '/chat/conversations')).find(
    (c) => c.user1Id === otherUserId || c.user2Id === otherUserId,
  );
  return row?.id === undefined || row.id === null ? null : String(row.id);
}

// Newest page of a thread, filtered to the one message a spec sent (by its
// unique tagged content). Null when it is not (or no longer) there.
export async function chatMessageIdByContent(
  request: APIRequestContext,
  conversationId: string,
  content: string,
): Promise<string | null> {
  const row = rows(
    await getData(request, `/chat/conversations/${conversationId}/messages?page=1&limit=50`),
  ).find((m) => m.content === content);
  return row?.id === undefined || row.id === null ? null : String(row.id);
}

// Cleanup (sender's context — the other member gets a 403): CHAT-E2E-CLEANUP-01
// hard-deletes the row. `204` has no body; `404` means it is already gone, which
// is just as clean, so a double cleanup is not an error.
export async function deleteChatMessage(request: APIRequestContext, id: string): Promise<boolean> {
  const res = await request.delete(`/api/chat/messages/${id}`);
  return res.status() === 204 || res.status() === 404;
}
