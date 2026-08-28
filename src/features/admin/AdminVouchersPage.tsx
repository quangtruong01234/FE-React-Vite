import type { ReactElement } from 'react';
import { VoucherConsole } from '@/features/voucher/VoucherConsole';
import { ADMIN_VOUCHER_BINDING } from '@/features/voucher/voucherConsoleBinding';

/**
 * Platform-wide voucher console (F3-ADMIN), on `/admin/vouchers`.
 *
 * The screen itself lives in `features/voucher` — it is shared verbatim with
 * the seller's own-vouchers page, which drives the same table and form through
 * the shop-scoped routes. Only the binding differs.
 */
export default function AdminVouchersPage(): ReactElement {
  return <VoucherConsole binding={ADMIN_VOUCHER_BINDING} />;
}
