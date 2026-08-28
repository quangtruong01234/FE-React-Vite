import type { ReactElement } from 'react';
import { VoucherConsole } from '@/features/voucher/VoucherConsole';
import { SELLER_VOUCHER_BINDING } from '@/features/voucher/voucherConsoleBinding';

/**
 * A shop's own voucher console, on `/sell/vouchers` (`shop` role).
 *
 * Same screen as the admin one — the backend enforces identical rules on the
 * shop-scoped routes — but every call is ownership-gated by the cookie, so the
 * list only ever shows this shop's codes and a create never carries a
 * `sellerId`. See `SELLER_VOUCHER_BINDING`.
 */
export default function SellerVouchersPage(): ReactElement {
  return <VoucherConsole binding={SELLER_VOUCHER_BINDING} />;
}
