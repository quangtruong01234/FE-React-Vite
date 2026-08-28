import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { VOUCHER_FORBIDDEN_DEFAULT } from './voucherRules';
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

/** Wording that differs between the two consoles. Rules-based copy stays in the page. */
export interface VoucherConsoleCopy {
  title: string;
  /** One-paragraph description under the title. */
  intro: string;
  /** Subtitle of the form in create mode — the scope caveat lives here. */
  createHint: string;
  /** Empty-list line. */
  empty: string;
  /** 401/403 message — see `voucherConsoleErrorMessage`. */
  forbidden: string;
}

export interface VoucherConsoleBinding {
  /** List-level prefix, invalidated after every write: creates and status flips reorder the list. */
  listKey: readonly unknown[];
  /** Key for one page — must have `listKey` as a prefix. */
  listPageKey: (page: number, limit: number) => readonly unknown[];
  fetchList: (page: number, limit: number) => Promise<PaginatedResponse<Voucher>>;
  create: (dto: CreateVoucherDto) => Promise<Voucher>;
  update: (id: number, dto: UpdateVoucherDto) => Promise<Voucher>;
  deactivate: (id: number) => Promise<Voucher>;
  copy: VoucherConsoleCopy;
}

export const ADMIN_VOUCHER_BINDING: VoucherConsoleBinding = {
  listKey: queryKeys.orders.adminVouchers,
  listPageKey: queryKeys.orders.adminVouchersList,
  fetchList: (page, limit) => api.orders.getAdminVouchers(page, limit),
  create: (dto) => api.orders.createVoucher(dto),
  update: (id, dto) => api.orders.updateVoucher(id, dto),
  deactivate: (id) => api.orders.deactivateVoucher(id),
  copy: {
    title: 'Mã giảm giá',
    intro:
      'Tạo, sửa và theo dõi mã giảm giá toàn sàn. Người mua chọn hoặc nhập mã ở bước thanh toán — mã chỉ áp dụng cho đơn từ một người bán.',
    createHint:
      'Mã chỉ áp dụng cho đơn từ một người bán. Sau khi tạo vẫn sửa được điều kiện, nhưng mã và mức giảm thì không.',
    empty: 'Chưa có mã giảm giá nào.',
    forbidden: VOUCHER_FORBIDDEN_DEFAULT,
  },
};

export const SELLER_VOUCHER_BINDING: VoucherConsoleBinding = {
  listKey: queryKeys.orders.sellerVouchers,
  listPageKey: queryKeys.orders.sellerVouchersList,
  fetchList: (page, limit) => api.orders.getSellerVouchers(page, limit),
  // `buildCreateVoucherDto` never emits `sellerId`, which is exactly what this
  // route needs: ownership comes from the cookie and sending the key is a 400.
  create: (dto) => api.orders.createSellerVoucher(dto),
  update: (id, dto) => api.orders.updateSellerVoucher(id, dto),
  deactivate: (id) => api.orders.deactivateSellerVoucher(id),
  copy: {
    title: 'Mã giảm giá của shop',
    intro:
      'Tạo, sửa và theo dõi mã giảm giá của riêng shop bạn. Người mua thấy mã trong danh sách gợi ý ở bước thanh toán khi giỏ có sản phẩm của bạn.',
    createHint:
      'Mã thuộc về shop của bạn và chỉ áp dụng cho đơn từ shop bạn. Sau khi tạo vẫn sửa được điều kiện, nhưng mã và mức giảm thì không.',
    empty: 'Shop bạn chưa có mã giảm giá nào.',
    // Deliberately covers both readings of a 403 on these routes — wrong role,
    // or someone else's voucher — without confirming which, since the backend
    // withholds that on purpose.
    forbidden: 'Bạn không quản lý được mã này. Shop chỉ sửa được mã của chính mình.',
  },
};
