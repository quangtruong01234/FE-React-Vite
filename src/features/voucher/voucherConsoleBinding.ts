import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { VOUCHER_FORBIDDEN_DEFAULT } from './voucherRules';
import type { VoucherMessageKey } from './voucher.i18n';
import type {
  CreateVoucherDto,
  PaginatedResponse,
  UpdateVoucherDto,
  Voucher,
} from '@/types';

/**
 * The two role flavours of the voucher console, as data.
 *
 * `/order/admin/vouchers` (admin, platform-wide) and `/order/vouchers` +
 * `/order/vouchers/mine` (shop, own vouchers) take the same DTOs, enforce the
 * same rules and return the same rows — the *screen* is genuinely one screen.
 * Everything that actually differs between them is collected here so
 * `VoucherConsole` never branches on the role: four endpoints, two query keys,
 * and the wording that has to change because the routes mean different things.
 */

/**
 * Wording that differs between the two consoles, as keys into `voucherMessages`
 * (I18N-06) so the page renders it in the current language. Rules-based copy
 * stays in the page.
 */
export interface VoucherConsoleCopy {
  title: VoucherMessageKey;
  /** One-paragraph description under the title. */
  intro: VoucherMessageKey;
  /** Subtitle of the form in create mode — the scope caveat lives here. */
  createHint: VoucherMessageKey;
  /** Empty-list line. */
  empty: VoucherMessageKey;
  /** 401/403 message — see `voucherConsoleErrorMessage`. */
  forbidden: VoucherMessageKey;
}

export interface VoucherConsoleBinding {
  /** List-level prefix, invalidated after every write: creates and status flips reorder the list. */
  listKey: readonly unknown[];
  /** Key for one page — must have `listKey` as a prefix. `q` searches the voucher code. */
  listPageKey: (page: number, limit: number, q?: string) => readonly unknown[];
  fetchList: (page: number, limit: number, q?: string) => Promise<PaginatedResponse<Voucher>>;
  create: (dto: CreateVoucherDto) => Promise<Voucher>;
  update: (id: number, dto: UpdateVoucherDto) => Promise<Voucher>;
  deactivate: (id: number) => Promise<Voucher>;
  copy: VoucherConsoleCopy;
}

export const ADMIN_VOUCHER_BINDING: VoucherConsoleBinding = {
  listKey: queryKeys.orders.adminVouchers,
  listPageKey: queryKeys.orders.adminVouchersList,
  fetchList: (page, limit, q) => api.orders.getAdminVouchers(page, limit, q),
  create: (dto) => api.orders.createVoucher(dto),
  update: (id, dto) => api.orders.updateVoucher(id, dto),
  deactivate: (id) => api.orders.deactivateVoucher(id),
  copy: {
    title: 'adminTitle',
    intro: 'adminIntro',
    createHint: 'adminCreateHint',
    empty: 'adminEmpty',
    forbidden: VOUCHER_FORBIDDEN_DEFAULT,
  },
};

export const SELLER_VOUCHER_BINDING: VoucherConsoleBinding = {
  listKey: queryKeys.orders.sellerVouchers,
  listPageKey: queryKeys.orders.sellerVouchersList,
  fetchList: (page, limit, q) => api.orders.getSellerVouchers(page, limit, q),
  // `buildCreateVoucherDto` never emits `sellerId`, which is exactly what this
  // route needs: ownership comes from the cookie and sending the key is a 400.
  create: (dto) => api.orders.createSellerVoucher(dto),
  update: (id, dto) => api.orders.updateSellerVoucher(id, dto),
  deactivate: (id) => api.orders.deactivateSellerVoucher(id),
  copy: {
    title: 'sellerTitle',
    intro: 'sellerIntro',
    createHint: 'sellerCreateHint',
    empty: 'sellerEmpty',
    // Deliberately covers both readings of a 403 on these routes — wrong role,
    // or someone else's voucher — without confirming which, since the backend
    // withholds that on purpose.
    forbidden: 'sellerForbidden',
  },
};
