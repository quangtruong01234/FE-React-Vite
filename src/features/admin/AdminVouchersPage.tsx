import { useState, useRef, useEffect, type ReactElement, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, TicketPercent, Pencil, Power, PowerOff, X } from 'lucide-react';
import { cn, formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { GradientButton } from '@/components/shared/GradientButton';
import { IconButton } from '@/components/shared/IconButton';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageParam } from '@/hooks/ui/usePageParam';
import {
  voucherStatusMeta,
  voucherDiscountLabel,
  voucherUsageLabel,
  voucherWindowLabel,
  canDeactivateVoucher,
  canReactivateVoucher,
  voucherAdminErrorMessage,
  buildCreateVoucherDto,
  buildUpdateVoucherDto,
  voucherToFormData,
  hasVoucherEdits,
  voucherEditBlockedMessage,
  voucherLooseningConfirm,
  voucherActiveToggleCopy,
} from './voucherAdmin';
import { toVoucherNumber } from '@/lib/domain/voucherMoney';
import {
  voucherCreateSchema,
  voucherEditSchema,
  VOUCHER_FORM_DEFAULTS,
  type VoucherFormData,
} from './voucherAdmin.schema';
import type { Voucher } from '@/types';

const LIMIT = 20;

const INPUT_CLASS =
  'h-10 w-full bg-canvas-base border border-bdr rounded-tb-input px-3 text-ink-pri font-body text-sm placeholder:text-ink-muted outline-none focus:border-tb-amber/50 transition-colors';

/** Immutable-in-edit-mode fields: still readable, visibly not yours to change. */
const READONLY_CLASS = 'bg-canvas-elevated text-ink-muted cursor-not-allowed focus:border-bdr';

function FormField({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  /** Id of the control this label names — omitted only for the button group. */
  htmlFor?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}): ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={htmlFor}
        className="font-body font-medium text-[11px] leading-[1.4] text-ink-sec tracking-[0.04em] uppercase"
      >
        {label}
      </label>
      {children}
      {error ? (
        <span className="font-body text-xs text-accent-red">{error}</span>
      ) : hint ? (
        <span className="font-body text-xs text-ink-muted">{hint}</span>
      ) : null}
    </div>
  );
}

/**
 * One form for both create and edit (VOUCHER-EDIT-01). The field set is
 * identical; what changes is that `code`, `discountType` and `discountValue`
 * are immutable server-side, so in edit mode they are shown read-only and never
 * make it into the payload — `buildUpdateVoucherDto` only diffs the rest.
 */
function VoucherForm({
  voucher,
  onCancel,
  onSaved,
}: {
  /** Row being edited, or null/undefined to create a new code. */
  voucher?: Voucher | null;
  onCancel: () => void;
  onSaved: (voucher: Voucher, mode: 'create' | 'update') => void;
}): ReactElement {
  const queryClient = useQueryClient();
  const isEdit = voucher != null;
  const {
    register,
    handleSubmit,
    control,
    setValue,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<VoucherFormData>({
    // Edit mode drops the fixed-vs-minimum guard: `discountValue` is read-only
    // there and the backend only re-checks the rule on patches that carry a
    // minimum, so a legacy bad row must stay editable. `buildUpdateVoucherDto`
    // + `voucherEditBlockedMessage` catch the patches that do carry one.
    resolver: zodResolver(isEdit ? voucherEditSchema : voucherCreateSchema),
    defaultValues: voucher ? voucherToFormData(voucher) : VOUCHER_FORM_DEFAULTS,
  });

  // `useWatch` rather than `watch()` — the latter returns a fresh function every
  // render, which opts the whole component out of React Compiler memoization.
  const discountType = useWatch({ control, name: 'discountType' });
  const isActive = useWatch({ control, name: 'isActive' });
  const toggleCopy = voucherActiveToggleCopy(isEdit, isActive);

  const saveVoucher = useMutation({
    mutationFn: (form: VoucherFormData) =>
      voucher
        ? api.orders.updateVoucher(voucher.id, buildUpdateVoucherDto(form, voucher))
        : api.orders.createVoucher(buildCreateVoucherDto(form)),
  });

  async function onSubmit(form: VoucherFormData): Promise<void> {
    if (voucher) {
      const dto = buildUpdateVoucherDto(form, voucher);
      if (!hasVoucherEdits(dto)) {
        setError('root', { message: 'Chưa có thay đổi nào để lưu.' });
        return;
      }
      // Mirror the backend's own refusals before spending the request…
      const blocked = voucherEditBlockedMessage(dto, voucher);
      if (blocked) {
        setError('root', { message: blocked });
        return;
      }
      // …and make the one-way edits an explicit decision.
      const confirmation = voucherLooseningConfirm(dto, voucher);
      if (confirmation && !window.confirm(confirmation)) return;
    }

    try {
      const saved = await saveVoucher.mutateAsync(form);
      // A new code lands at the top of the newest-first list, so every cached
      // page shifts — invalidate the whole prefix rather than one page.
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.adminVouchers });
      if (!isEdit) reset(VOUCHER_FORM_DEFAULTS);
      onSaved(saved, isEdit ? 'update' : 'create');
    } catch (error: unknown) {
      setError('root', { message: voucherAdminErrorMessage(error, isEdit ? 'update' : 'create') });
    }
  }

  return (
    <form
      onSubmit={(e) => { void handleSubmit(onSubmit)(e); }}
      className="bg-canvas-surface border border-bdr rounded-tb-card p-5 space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display font-semibold text-base text-ink-pri">
            {isEdit ? `Sửa mã ${voucher.code}` : 'Tạo mã giảm giá'}
          </h2>
          <p className="font-body text-xs text-ink-muted mt-1 m-0">
            {isEdit
              ? 'Mã, loại giảm và mức giảm không đổi được. Mã đã có lượt dùng chỉ nới lỏng được điều kiện, và nới rồi thì không siết lại được.'
              : 'Mã chỉ áp dụng cho đơn từ một người bán. Sau khi tạo vẫn sửa được điều kiện, nhưng mã và mức giảm thì không.'}
          </p>
        </div>
        <IconButton
          aria-label={isEdit ? 'Đóng biểu mẫu sửa mã' : 'Đóng biểu mẫu tạo mã'}
          onClick={onCancel}
          className="size-8 shrink-0 rounded-tb-input text-ink-muted hover:text-ink-pri hover:bg-canvas-elevated transition-colors"
        >
          <X size={16} className="shrink-0" />
        </IconButton>
      </div>

      {errors.root && (
        <div className="bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-tb-input px-3 py-2 font-body text-sm">
          {errors.root.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label="Mã"
          htmlFor="voucher-code"
          error={errors.code?.message}
          hint={isEdit ? 'Không sửa được sau khi tạo.' : 'Tự động viết hoa khi gửi lên.'}
        >
          <input
            id="voucher-code"
            {...register('code')}
            readOnly={isEdit}
            placeholder="SALE10"
            autoComplete="off"
            className={cn(
              INPUT_CLASS,
              'font-mono uppercase placeholder:normal-case placeholder:font-body',
              isEdit && READONLY_CLASS,
            )}
          />
        </FormField>

        <FormField label="Mô tả" htmlFor="voucher-description" error={errors.description?.message}>
          <input
            id="voucher-description"
            {...register('description')}
            placeholder="Giảm 10% cho đơn đầu tiên"
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField label="Loại giảm giá" error={errors.discountType?.message}>
          {/* A two-button choice, so the label names the group rather than one control. */}
          <div role="group" aria-label="Loại giảm giá" className="flex gap-2">
            {(['percent', 'fixed'] as const).map((type) => (
              <button
                key={type}
                type="button"
                aria-pressed={discountType === type}
                disabled={isEdit}
                onClick={() => setValue('discountType', type, { shouldValidate: true })}
                className={cn(
                  'flex-1 h-10 rounded-tb-input border font-body font-semibold text-[13px] transition-colors enabled:cursor-pointer disabled:cursor-not-allowed',
                  discountType === type
                    ? 'bg-tb-gradient border-transparent text-white'
                    : 'bg-canvas-elevated border-bdr text-ink-sec enabled:hover:text-ink-pri',
                  isEdit && discountType !== type && 'opacity-40',
                )}
              >
                {type === 'percent' ? 'Theo phần trăm' : 'Số tiền cố định'}
              </button>
            ))}
          </div>
        </FormField>

        <FormField
          label={discountType === 'percent' ? 'Phần trăm giảm (%)' : 'Số tiền giảm (VND)'}
          htmlFor="voucher-discount-value"
          hint={isEdit ? 'Không sửa được sau khi tạo.' : undefined}
          error={errors.discountValue?.message}
        >
          <input
            id="voucher-discount-value"
            {...register('discountValue')}
            readOnly={isEdit}
            inputMode="decimal"
            placeholder={discountType === 'percent' ? '10' : '50000'}
            className={cn(INPUT_CLASS, 'font-mono', isEdit && READONLY_CLASS)}
          />
        </FormField>

        <FormField
          label="Đơn tối thiểu (VND)"
          htmlFor="voucher-min-order"
          hint={
            // A fixed voucher with no minimum is compared against 0 server-side
            // and always rejected, so "leave blank" is only true for percent.
            discountType === 'fixed'
              ? 'Bắt buộc, phải lớn hơn số tiền giảm.'
              : 'Bỏ trống = không yêu cầu.'
          }
          error={errors.minOrderAmount?.message}
        >
          <input
            id="voucher-min-order"
            {...register('minOrderAmount')}
            inputMode="decimal"
            placeholder="0"
            className={cn(INPUT_CLASS, 'font-mono')}
          />
        </FormField>

        {/* A cap only means something for a percentage discount. */}
        {discountType === 'percent' && (
          <FormField
            label="Giảm tối đa (VND)"
            htmlFor="voucher-max-discount"
            hint="Bỏ trống = không giới hạn."
            error={errors.maxDiscountAmount?.message}
          >
            <input
              id="voucher-max-discount"
              {...register('maxDiscountAmount')}
              inputMode="decimal"
              placeholder="50000"
              className={cn(INPUT_CLASS, 'font-mono')}
            />
          </FormField>
        )}

        <FormField
          label="Tổng lượt dùng"
          htmlFor="voucher-usage-limit"
          hint="Bỏ trống = không giới hạn."
          error={errors.usageLimit?.message}
        >
          <input
            id="voucher-usage-limit"
            {...register('usageLimit')}
            inputMode="numeric"
            placeholder="100"
            className={cn(INPUT_CLASS, 'font-mono')}
          />
        </FormField>

        <FormField
          label="Lượt dùng mỗi người"
          htmlFor="voucher-per-user-limit"
          hint="Bỏ trống = không giới hạn."
          error={errors.perUserLimit?.message}
        >
          <input
            id="voucher-per-user-limit"
            {...register('perUserLimit')}
            inputMode="numeric"
            placeholder="1"
            className={cn(INPUT_CLASS, 'font-mono')}
          />
        </FormField>

        <FormField
          label="Bắt đầu"
          htmlFor="voucher-starts-at"
          hint="Giờ địa phương. Bỏ trống = hiệu lực ngay."
          error={errors.startsAt?.message}
        >
          <input
            id="voucher-starts-at"
            type="datetime-local"
            {...register('startsAt')}
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField
          label="Kết thúc"
          htmlFor="voucher-expires-at"
          hint="Bỏ trống = không hết hạn."
          error={errors.expiresAt?.message}
        >
          <input
            id="voucher-expires-at"
            type="datetime-local"
            {...register('expiresAt')}
            className={INPUT_CLASS}
          />
        </FormField>
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap pt-1">
        <div className="flex items-center gap-2.5">
          <ToggleSwitch
            checked={isActive}
            onChange={(next) => setValue('isActive', next)}
            label={toggleCopy.label}
            size="sm"
          />
          <span className="font-body text-sm text-ink-sec">{toggleCopy.state}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="h-10 px-4 rounded-tb-input border border-bdr bg-canvas-elevated text-ink-sec font-body font-semibold text-[13px] cursor-pointer hover:text-ink-pri transition-colors"
          >
            Hủy
          </button>
          <GradientButton type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit ? 'Đang lưu…' : 'Đang tạo…'
              : isEdit ? 'Lưu thay đổi' : 'Tạo mã'}
          </GradientButton>
        </div>
      </div>
    </form>
  );
}

/** Row actions share one look; only the accent colour separates on from off. */
const ROW_ACTION_CLASS =
  'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold bg-canvas-elevated border border-bdr transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';

function VoucherRow({
  voucher,
  isLast,
  deactivatePending,
  reactivatePending,
  onEdit,
  onDeactivate,
  onReactivate,
}: {
  voucher: Voucher;
  isLast: boolean;
  deactivatePending: boolean;
  reactivatePending: boolean;
  onEdit: (voucher: Voucher) => void;
  onDeactivate: (voucher: Voucher) => void;
  onReactivate: (voucher: Voucher) => void;
}): ReactElement {
  const status = voucherStatusMeta(voucher);
  const minOrder = toVoucherNumber(voucher.minOrderAmount);

  return (
    <tr className={cn('transition-colors hover:bg-canvas-elevated', !isLast && 'border-b border-bdr')}>
      <td className="px-4 py-3 align-top">
        <div className="font-mono font-semibold text-sm text-accent-amber">{voucher.code}</div>
        {voucher.description && (
          <div className="font-body text-xs text-ink-muted mt-0.5 max-w-[22ch] truncate">
            {voucher.description}
          </div>
        )}
      </td>
      <td className="px-4 py-3 align-top font-body text-sm text-ink-pri">
        {voucherDiscountLabel(voucher, formatVnd)}
      </td>
      <td className="px-4 py-3 align-top font-body text-sm text-ink-sec">
        {minOrder > 0 ? formatVnd(minOrder) : '—'}
      </td>
      <td className="px-4 py-3 align-top font-mono text-sm text-ink-sec">
        {voucherUsageLabel(voucher)}
      </td>
      <td className="px-4 py-3 align-top font-body text-xs text-ink-sec">
        {voucherWindowLabel(voucher, formatDateTime)}
      </td>
      <td className="px-4 py-3 align-top">
        <span
          className={cn(
            'inline-flex items-center px-2.5 py-1 text-xs font-body font-semibold rounded-tb-pill border whitespace-nowrap',
            status.className,
          )}
        >
          {status.label}
        </span>
      </td>
      <td className="px-4 py-3 align-top">
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => onEdit(voucher)}
            className={cn(ROW_ACTION_CLASS, 'text-ink-sec hover:border-accent-amber/50 hover:text-ink-pri')}
          >
            <Pencil size={14} className="shrink-0" />
            Sửa
          </button>
          {canDeactivateVoucher(voucher) && (
            <button
              type="button"
              disabled={deactivatePending}
              onClick={() => onDeactivate(voucher)}
              className={cn(ROW_ACTION_CLASS, 'text-accent-red hover:border-accent-red/50')}
            >
              <PowerOff size={14} className="shrink-0" />
              {deactivatePending ? 'Đang tắt…' : 'Tắt mã'}
            </button>
          )}
          {canReactivateVoucher(voucher) && (
            <button
              type="button"
              disabled={reactivatePending}
              onClick={() => onReactivate(voucher)}
              className={cn(ROW_ACTION_CLASS, 'text-accent-green hover:border-accent-green/50')}
            >
              <Power size={14} className="shrink-0" />
              {reactivatePending ? 'Đang bật…' : 'Bật lại'}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

const COLUMNS = ['Mã', 'Giảm', 'Đơn tối thiểu', 'Lượt dùng', 'Hiệu lực', 'Trạng thái', ''];

export default function AdminVouchersPage(): ReactElement {
  const queryClient = useQueryClient();
  const [page, setPage] = usePageParam();
  const [isFormOpen, setIsFormOpen] = useState(false);
  // The row being edited. Held as the row object (not just an id) so the form
  // can diff against the exact values the admin was looking at.
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: queryKeys.orders.adminVouchersList(page, LIMIT),
    queryFn: () => api.orders.getAdminVouchers(page, LIMIT),
    placeholderData: keepPreviousData,
  });

  // One timer, replaced on every toast: without this a second toast (create →
  // deactivate) inherits the first one's countdown and vanishes early.
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
  }, []);

  function showToast(message: string): void {
    if (toastTimer.current !== null) clearTimeout(toastTimer.current);
    setToast(message);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }

  const deactivate = useMutation({
    mutationFn: (voucher: Voucher) => api.orders.deactivateVoucher(voucher.id),
    onSuccess: (_result, voucher) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.adminVouchers });
      showToast(`Đã tắt mã ${voucher.code}.`);
    },
  });

  // VOUCHER-EDIT-01 made deactivation reversible: `{ isActive: true }` on the
  // update route is the way back on, so this is no longer a one-way door.
  const reactivate = useMutation({
    mutationFn: (voucher: Voucher) => api.orders.updateVoucher(voucher.id, { isActive: true }),
    onSuccess: (_result, voucher) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.orders.adminVouchers });
      showToast(`Đã bật lại mã ${voucher.code}.`);
    },
  });

  function handleDeactivate(voucher: Voucher): void {
    if (!window.confirm(`Tắt mã ${voucher.code}? Người mua sẽ không dùng được cho tới khi bật lại.`)) {
      return;
    }
    deactivate.mutate(voucher);
  }

  function handleEdit(voucher: Voucher): void {
    setIsFormOpen(false);
    setEditing(voucher);
  }

  const vouchers = data?.data ?? [];
  const listErrorMsg = error ? voucherAdminErrorMessage(error, 'list') : null;
  const deactivateErrorMsg = deactivate.isError
    ? voucherAdminErrorMessage(deactivate.error, 'deactivate')
    : null;
  const reactivateErrorMsg = reactivate.isError
    ? voucherAdminErrorMessage(reactivate.error, 'update')
    : null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-pri">Mã giảm giá</h1>
          <p className="font-body text-sm text-ink-sec mt-1 m-0">
            Tạo, sửa và theo dõi mã giảm giá toàn sàn. Người mua chọn hoặc nhập mã ở bước
            thanh toán — mã chỉ áp dụng cho đơn từ một người bán.
          </p>
        </div>
        {!isFormOpen && !editing && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold bg-canvas-elevated border border-bdr text-ink-sec hover:border-accent-amber/50 hover:text-ink-pri transition-colors cursor-pointer shrink-0"
          >
            <Plus size={14} className="shrink-0" />
            Tạo mã mới
          </button>
        )}
      </div>

      {toast && (
        <div className="bg-accent-green/15 text-accent-green border border-accent-green/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {toast}
        </div>
      )}
      {listErrorMsg && (
        <div className="bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {listErrorMsg}
        </div>
      )}
      {deactivateErrorMsg && (
        <div className="bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {deactivate.variables ? (
            <span className="font-mono font-bold">{deactivate.variables.code}</span>
          ) : null}{' '}
          · {deactivateErrorMsg}
        </div>
      )}
      {reactivateErrorMsg && (
        <div className="bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {reactivate.variables ? (
            <span className="font-mono font-bold">{reactivate.variables.code}</span>
          ) : null}{' '}
          · {reactivateErrorMsg}
        </div>
      )}

      {(isFormOpen || editing) && (
        <VoucherForm
          // Remount on a different row so the form re-seeds its defaults.
          key={editing?.id ?? 'create'}
          voucher={editing}
          onCancel={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSaved={(voucher, mode) => {
            setIsFormOpen(false);
            setEditing(null);
            showToast(
              mode === 'create' ? `Đã tạo mã ${voucher.code}.` : `Đã lưu mã ${voucher.code}.`,
            );
          }}
        />
      )}

      {isLoading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 bg-canvas-elevated rounded-tb-card" />
          ))}
        </div>
      )}

      {!isLoading && !listErrorMsg && vouchers.length === 0 && (
        <div className="bg-canvas-surface border border-bdr rounded-tb-card py-14 px-6 text-center">
          <span className="flex flex-col items-center gap-2 font-body text-sm text-ink-muted">
            <TicketPercent size={32} className="shrink-0 opacity-40" />
            Chưa có mã giảm giá nào.
          </span>
        </div>
      )}

      {!isLoading && vouchers.length > 0 && (
        <FetchingOverlay fetching={isFetching && !isLoading}>
          <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-x-auto">
            <table className="w-full text-sm min-w-[52rem]">
              <thead>
                <tr className="border-b border-bdr">
                  {COLUMNS.map((header, idx) => (
                    <th
                      key={header || `col-${idx}`}
                      className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vouchers.map((voucher, idx) => (
                  <VoucherRow
                    key={voucher.id}
                    voucher={voucher}
                    isLast={idx === vouchers.length - 1}
                    deactivatePending={deactivate.isPending && deactivate.variables?.id === voucher.id}
                    reactivatePending={reactivate.isPending && reactivate.variables?.id === voucher.id}
                    onEdit={handleEdit}
                    onDeactivate={handleDeactivate}
                    onReactivate={(row) => reactivate.mutate(row)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </FetchingOverlay>
      )}

      {!isLoading && (
        <Pagination
          page={page}
          totalPages={data?.totalPages ?? 1}
          hasNext={data?.hasNext}
          onPageChange={setPage}
        />
      )}
    </div>
  );
}
