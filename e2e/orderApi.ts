import type { APIRequestContext } from '@playwright/test';

export interface OrderRow {
  id: number;
  status: string;
  paymentMethod: string;
  total: string;
}

// Reads the buyer's orders through the proxied API using the test's browser
// cookies. Used so specs target a real order id by status instead of a
// hard-coded id that drifts as the DB changes.
export async function listOrders(request: APIRequestContext, userId: number): Promise<OrderRow[]> {
  const res = await request.get(`/api/order/user/${userId}?page=1&limit=50`);
  if (!res.ok()) return [];
  const json = await res.json();
  const items = json?.data?.data ?? [];
  return items.map((o: Record<string, unknown>) => ({
    id: Number(o.id),
    status: String(o.status),
    paymentMethod: String(o.paymentMethod),
    total: String(o.total),
  }));
}

export async function findOrder(
  request: APIRequestContext,
  userId: number,
  predicate: (o: OrderRow) => boolean,
): Promise<OrderRow | undefined> {
  return (await listOrders(request, userId)).find(predicate);
}
