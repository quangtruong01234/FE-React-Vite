import { describe, it, expect, vi, afterEach } from 'vitest';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { ADMIN_VOUCHER_BINDING, SELLER_VOUCHER_BINDING } from './voucherConsoleBinding';
import { buildCreateVoucherDto } from './voucherRules';
import { VOUCHER_FORM_DEFAULTS } from './voucherRules.schema';
import type { PaginatedResponse, Voucher } from '@/types';

const VOUCHER: Voucher = {
  id: 7,
  code: 'SHOP10',
  description: null,
  discountType: 'percent',
  discountValue: '10.00',
  minOrderAmount: '0.00',
  maxDiscountAmount: null,
  usageLimit: null,
  usedCount: 0,
  perUserLimit: null,
  startsAt: null,
  expiresAt: null,
  isActive: true,
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
};

const PAGE: PaginatedResponse<Voucher> = {
  data: [VOUCHER],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
  hasNext: false,
};

function isPrefixOf(prefix: readonly unknown[], key: readonly unknown[]): boolean {
  if (prefix.length > key.length) return false;
  return prefix.every((segment, i) => segment === key[i]);
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('voucher console query keys', () => {
  // The console invalidates `listKey` after every write, and TanStack matches by
  // prefix — a page key that does not start with it would never be refetched,
  // leaving a just-created code invisible until a reload.
  it('uses a list key that prefixes every page key', () => {
    for (const binding of [ADMIN_VOUCHER_BINDING, SELLER_VOUCHER_BINDING]) {
      expect(isPrefixOf(binding.listKey, binding.listPageKey(1, 20))).toBe(true);
      expect(isPrefixOf(binding.listKey, binding.listPageKey(4, 20))).toBe(true);
    }
  });

  it('keeps the page key varying with the page, or paging never refetches', () => {
    expect(SELLER_VOUCHER_BINDING.listPageKey(1, 20)).not.toEqual(
      SELLER_VOUCHER_BINDING.listPageKey(2, 20),
    );
  });

  it('keeps the two consoles disjoint — neither invalidation may sweep the other', () => {
    // Different accounts, different answers: an admin creating a platform code
    // must not evict a seller's cached list, and vice versa.
    expect(isPrefixOf(ADMIN_VOUCHER_BINDING.listKey, SELLER_VOUCHER_BINDING.listPageKey(1, 20))).toBe(false);
    expect(isPrefixOf(SELLER_VOUCHER_BINDING.listKey, ADMIN_VOUCHER_BINDING.listPageKey(1, 20))).toBe(false);
  });

  it('keeps the seller list out of the seller-ORDERS invalidation prefix', () => {
    // `queryKeys.orders.seller` is swept on every seller order action; vouchers
    // living under it would refetch on each one for no reason.
    expect(isPrefixOf(queryKeys.orders.seller, SELLER_VOUCHER_BINDING.listPageKey(1, 20))).toBe(false);
  });
});

describe('voucher console bindings', () => {
  it('routes the admin console at the admin endpoints', async () => {
    const list = vi.spyOn(api.orders, 'getAdminVouchers').mockResolvedValue(PAGE);
    const update = vi.spyOn(api.orders, 'updateVoucher').mockResolvedValue(VOUCHER);
    const deactivate = vi.spyOn(api.orders, 'deactivateVoucher').mockResolvedValue(VOUCHER);

    await ADMIN_VOUCHER_BINDING.fetchList(2, 20);
    await ADMIN_VOUCHER_BINDING.update(7, { isActive: true });
    await ADMIN_VOUCHER_BINDING.deactivate(7);

    expect(list).toHaveBeenCalledWith(2, 20);
    expect(update).toHaveBeenCalledWith(7, { isActive: true });
    expect(deactivate).toHaveBeenCalledWith(7);
  });

  it('routes the seller console at the shop-scoped endpoints', async () => {
    // The seller console must never reach an admin route: an ordinary shop
    // account gets a 403 there, so a mis-wired binding is a dead screen.
    const list = vi.spyOn(api.orders, 'getSellerVouchers').mockResolvedValue(PAGE);
    const update = vi.spyOn(api.orders, 'updateSellerVoucher').mockResolvedValue(VOUCHER);
    const deactivate = vi.spyOn(api.orders, 'deactivateSellerVoucher').mockResolvedValue(VOUCHER);
    const adminList = vi.spyOn(api.orders, 'getAdminVouchers').mockResolvedValue(PAGE);

    await SELLER_VOUCHER_BINDING.fetchList(2, 20);
    await SELLER_VOUCHER_BINDING.update(7, { isActive: true });
    await SELLER_VOUCHER_BINDING.deactivate(7);

    expect(list).toHaveBeenCalledWith(2, 20);
    expect(update).toHaveBeenCalledWith(7, { isActive: true });
    expect(deactivate).toHaveBeenCalledWith(7);
    expect(adminList).not.toHaveBeenCalled();
  });

  it('creates through the shop route without an ownership field', async () => {
    // `sellerId` is not merely ignored on `POST /order/vouchers` — sending the
    // key at all is a 400 SELLER_NOT_ASSIGNABLE. Ownership comes from the cookie.
    const create = vi.spyOn(api.orders, 'createSellerVoucher').mockResolvedValue(VOUCHER);
    const dto = buildCreateVoucherDto({
      ...VOUCHER_FORM_DEFAULTS,
      code: 'shop10',
      discountValue: '10',
    });

    await SELLER_VOUCHER_BINDING.create(dto);

    expect(create).toHaveBeenCalledWith(dto);
    expect(dto).not.toHaveProperty('sellerId');
  });
});

describe('voucher console copy', () => {
  it('gives the seller a 403 line that covers ownership as well as role', () => {
    // On the shop routes a 403 is either "wrong role" or "not your voucher",
    // and the backend deliberately does not say which — the copy must not
    // claim it is only about permissions to manage vouchers at all.
    expect(SELLER_VOUCHER_BINDING.copy.forbidden).not.toBe(ADMIN_VOUCHER_BINDING.copy.forbidden);
    expect(SELLER_VOUCHER_BINDING.copy.forbidden).toContain('mã của chính mình');
  });
});
