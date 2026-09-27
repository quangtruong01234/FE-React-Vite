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
