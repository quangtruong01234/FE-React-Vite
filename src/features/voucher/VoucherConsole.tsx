import { useState, useRef, useEffect, type ReactElement, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Plus, TicketPercent, Pencil, Power, PowerOff, X } from 'lucide-react';
import { cn, formatVnd } from '@/lib/format/utils';
import { formatDateTime } from '@/lib/format/time';
import { Pagination } from '@/components/shared/Pagination';
import { FetchingOverlay } from '@/components/shared/FetchingOverlay';
import { ToggleSwitch } from '@/components/shared/ToggleSwitch';
import { GradientButton } from '@/components/shared/GradientButton';
import { ConfirmDialog } from '@/components/shared/ConfirmDialog';
import { IconButton } from '@/components/shared/IconButton';
import { SearchField } from '@/components/shared/SearchField';
import { Skeleton } from '@/components/ui/skeleton';
import { usePageParam } from '@/hooks/ui/usePageParam';
import { useListSearch, listSearchEmptyText } from '@/hooks/ui/useListSearch';
import { useT } from '@/hooks/ui/useT';
import { useLanguage } from '@/context/useLanguage';
import { translateIfKey } from '@/lib/i18n/messages';
import { voucherMessages, type VoucherMessageKey } from './voucher.i18n';
import {
  voucherStatusMeta,
  voucherDiscountLabel,
  voucherUsageLabel,
  voucherWindowLabel,
  canDeactivateVoucher,
  canReactivateVoucher,
  voucherConsoleErrorMessage,
  buildCreateVoucherDto,
  buildUpdateVoucherDto,
  voucherToFormData,
  hasVoucherEdits,
  voucherEditBlockedMessage,
  voucherLooseningConfirm,
  voucherActiveToggleCopy,
} from './voucherRules';
import { toVoucherNumber } from '@/lib/domain/voucherMoney';
import {
  voucherCreateSchema,
  voucherEditSchema,
  VOUCHER_FORM_DEFAULTS,
  type VoucherFormData,
} from './voucherRules.schema';
import type { VoucherConsoleBinding } from './voucherConsoleBinding';
import type { Voucher } from '@/types';

/**
 * The voucher console, minus the question of *whose* vouchers.
 *
 * The admin screen and the seller screen are the same table, the same form and
 * the same rules — `code`/`discountType`/`discountValue` immutable, redeemed
 * codes only loosenable, loosening one-way — because the backend enforces those
 * identically on both route families. Only the endpoints, the query keys and a
 * few lines of copy differ, and those arrive as a `binding`.
 */

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
  binding,
  voucher,
  onCancel,
  onSaved,
}: {
  binding: VoucherConsoleBinding;
  /** Row being edited, or null/undefined to create a new code. */
  voucher?: Voucher | null;
  onCancel: () => void;
  onSaved: (voucher: Voucher, mode: 'create' | 'update') => void;
}): ReactElement {
  const queryClient = useQueryClient();
  const t = useT(voucherMessages);
  const { lang } = useLanguage();
  /** Field errors hold a zod key (or raw server text) — render it in the current language. */
  const fieldError = (message: string | undefined): string | undefined =>
    translateIfKey(voucherMessages, lang, message);
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
  const toggleCopy = voucherActiveToggleCopy(isEdit, isActive, lang);

  /** The one-way edit waiting on its confirm modal, plus the form it will save. */
  const [loosening, setLoosening] = useState<
    { message: string; form: VoucherFormData } | null
  >(null);

  const saveVoucher = useMutation({
    mutationFn: (form: VoucherFormData) =>
      voucher
        ? binding.update(voucher.id, buildUpdateVoucherDto(form, voucher))
        : binding.create(buildCreateVoucherDto(form)),
  });

  async function onSubmit(form: VoucherFormData): Promise<void> {
    if (voucher) {
      const dto = buildUpdateVoucherDto(form, voucher);
      if (!hasVoucherEdits(dto)) {
        setError('root', { message: t('noChanges') });
        return;
      }
      // Mirror the backend's own refusals before spending the request…
      const blocked = voucherEditBlockedMessage(dto, voucher, lang);
      if (blocked) {
        setError('root', { message: blocked });
        return;
      }
      // …and make the one-way edits an explicit decision. The answer comes back
      // from the modal, which resumes the save through `persist`.
      const confirmation = voucherLooseningConfirm(dto, voucher, lang);
      if (confirmation) {
        setLoosening({ message: confirmation, form });
        return;
      }
    }

    await persist(form);
  }

  async function persist(form: VoucherFormData): Promise<void> {
    try {
      const saved = await saveVoucher.mutateAsync(form);
      // A new code lands at the top of the newest-first list, so every cached
      // page shifts — invalidate the whole prefix rather than one page.
      void queryClient.invalidateQueries({ queryKey: binding.listKey });
      if (!isEdit) reset(VOUCHER_FORM_DEFAULTS);
      onSaved(saved, isEdit ? 'update' : 'create');
    } catch (error: unknown) {
      setError('root', {
        message: voucherConsoleErrorMessage(
          error,
          isEdit ? 'update' : 'create',
          binding.copy.forbidden,
          lang,
        ),
      });
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
            {isEdit ? t('formEditTitle', { code: voucher.code }) : t('formCreateTitle')}
          </h2>
          <p className="font-body text-xs text-ink-muted mt-1 m-0">
            {isEdit
              ? t('formEditHint')
              : t(binding.copy.createHint)}
          </p>
        </div>
        <IconButton
          aria-label={isEdit ? t('closeEditForm') : t('closeCreateForm')}
          onClick={onCancel}
          className="size-8 shrink-0 rounded-tb-input text-ink-muted hover:text-ink-pri hover:bg-canvas-elevated transition-colors"
        >
          <X size={16} className="shrink-0" />
        </IconButton>
      </div>

      {errors.root && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-input px-3 py-2 font-body text-sm">
          {errors.root.message}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          label={t('labelCode')}
          htmlFor="voucher-code"
          error={fieldError(errors.code?.message)}
          hint={isEdit ? t('hintImmutable') : t('hintUppercase')}
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

        <FormField
          label={t('labelDescription')}
          htmlFor="voucher-description"
          error={fieldError(errors.description?.message)}
        >
          <input
            id="voucher-description"
            {...register('description')}
            placeholder={t('descriptionPlaceholder')}
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField label={t('labelDiscountType')} error={fieldError(errors.discountType?.message)}>
          {/* A two-button choice, so the label names the group rather than one control. */}
          <div role="group" aria-label={t('labelDiscountType')} className="flex gap-2">
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
                    ? 'bg-tb-gradient border-transparent text-ink-on-accent'
                    : 'bg-canvas-elevated border-bdr text-ink-sec enabled:hover:text-ink-pri',
                  isEdit && discountType !== type && 'opacity-40',
                )}
              >
                {type === 'percent' ? t('typePercent') : t('typeFixed')}
              </button>
            ))}
          </div>
        </FormField>

        <FormField
          label={discountType === 'percent' ? t('labelPercentValue') : t('labelFixedValue')}
          htmlFor="voucher-discount-value"
          hint={isEdit ? t('hintImmutable') : undefined}
          error={fieldError(errors.discountValue?.message)}
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
          label={t('labelMinOrder')}
          htmlFor="voucher-min-order"
          hint={
            // A fixed voucher with no minimum is compared against 0 server-side
            // and always rejected, so "leave blank" is only true for percent.
            discountType === 'fixed'
              ? t('hintMinOrderFixed')
              : t('hintMinOrderPercent')
          }
          error={fieldError(errors.minOrderAmount?.message)}
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
            label={t('labelMaxDiscount')}
            htmlFor="voucher-max-discount"
            hint={t('hintUnlimited')}
            error={fieldError(errors.maxDiscountAmount?.message)}
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
          label={t('labelUsageLimit')}
          htmlFor="voucher-usage-limit"
          hint={t('hintUnlimited')}
          error={fieldError(errors.usageLimit?.message)}
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
          label={t('labelPerUserLimit')}
          htmlFor="voucher-per-user-limit"
          hint={t('hintUnlimited')}
          error={fieldError(errors.perUserLimit?.message)}
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
          label={t('labelStartsAt')}
          htmlFor="voucher-starts-at"
          hint={t('hintStartsAt')}
          error={fieldError(errors.startsAt?.message)}
        >
          <input
            id="voucher-starts-at"
            type="datetime-local"
            {...register('startsAt')}
            className={INPUT_CLASS}
          />
        </FormField>

        <FormField
          label={t('labelExpiresAt')}
          htmlFor="voucher-expires-at"
          hint={t('hintExpiresAt')}
          error={fieldError(errors.expiresAt?.message)}
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
            {t('cancel')}
          </button>
          <GradientButton type="submit" size="sm" disabled={isSubmitting}>
            {isSubmitting
              ? isEdit ? t('saving') : t('creating')
              : isEdit ? t('saveChanges') : t('createCode')}
          </GradientButton>
        </div>
      </div>

      <ConfirmDialog
        open={loosening !== null}
        title={t('looseningTitle')}
        description={loosening?.message ?? ''}
        confirmLabel={t('continue')}
        isPending={saveVoucher.isPending}
        onConfirm={() => {
          const pending = loosening;
          setLoosening(null);
          if (pending) void persist(pending.form);
        }}
        onCancel={() => { setLoosening(null); }}
      />
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
  const t = useT(voucherMessages);
  const { lang } = useLanguage();
  // `now` stays the helper's default — `Date.now()` in render trips react-hooks/purity.
  const status = voucherStatusMeta(voucher, undefined, lang);
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
        {voucherDiscountLabel(voucher, (n) => formatVnd(n, lang), lang)}
      </td>
      <td className="px-4 py-3 align-top font-body text-sm text-ink-sec">
        {minOrder > 0 ? formatVnd(minOrder, lang) : '—'}
      </td>
      <td className="px-4 py-3 align-top font-mono text-sm text-ink-sec">
        {voucherUsageLabel(voucher)}
      </td>
      <td className="px-4 py-3 align-top font-body text-xs text-ink-sec">
        {voucherWindowLabel(voucher, (iso) => formatDateTime(iso, lang), lang)}
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
            className={cn(ROW_ACTION_CLASS, 'text-ink-sec hover:border-tb-amber/50 hover:text-ink-pri')}
          >
            <Pencil size={14} className="shrink-0" />
            {t('edit')}
          </button>
          {canDeactivateVoucher(voucher) && (
            <button
              type="button"
              disabled={deactivatePending}
              onClick={() => onDeactivate(voucher)}
              className={cn(ROW_ACTION_CLASS, 'text-accent-red hover:border-tb-red/50')}
            >
              <PowerOff size={14} className="shrink-0" />
              {deactivatePending ? t('deactivating') : t('deactivate')}
            </button>
          )}
          {canReactivateVoucher(voucher) && (
            <button
              type="button"
              disabled={reactivatePending}
              onClick={() => onReactivate(voucher)}
              className={cn(ROW_ACTION_CLASS, 'text-accent-green hover:border-tb-green/50')}
            >
              <Power size={14} className="shrink-0" />
              {reactivatePending ? t('reactivating') : t('reactivate')}
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/** Header keys; the action column has no heading. */
const COLUMNS: readonly (VoucherMessageKey | null)[] = [
  'colCode',
  'colDiscount',
  'colMinOrder',
  'colUsage',
  'colWindow',
  'colStatus',
  null,
];

export function VoucherConsole({ binding }: { binding: VoucherConsoleBinding }): ReactElement {
  const queryClient = useQueryClient();
  const t = useT(voucherMessages);
  const { lang } = useLanguage();
  const [page, setPage] = usePageParam();
  const [isFormOpen, setIsFormOpen] = useState(false);
  // The row being edited. Held as the row object (not just an id) so the form
  // can diff against the exact values the user was looking at.
  const [editing, setEditing] = useState<Voucher | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  /** The row waiting on the deactivate confirm modal. */
  const [pendingDeactivate, setPendingDeactivate] = useState<Voucher | null>(null);
  const search = useListSearch(() => { if (page !== 1) setPage(1); });

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: binding.listPageKey(page, LIMIT, search.term),
    queryFn: () => binding.fetchList(page, LIMIT, search.term),
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
    mutationFn: (voucher: Voucher) => binding.deactivate(voucher.id),
    onSuccess: (_result, voucher) => {
      void queryClient.invalidateQueries({ queryKey: binding.listKey });
      showToast(t('toastDeactivated', { code: voucher.code }));
    },
  });

  // VOUCHER-EDIT-01 made deactivation reversible: `{ isActive: true }` on the
  // update route is the way back on, so this is no longer a one-way door.
  const reactivate = useMutation({
    mutationFn: (voucher: Voucher) => binding.update(voucher.id, { isActive: true }),
    onSuccess: (_result, voucher) => {
      void queryClient.invalidateQueries({ queryKey: binding.listKey });
      showToast(t('toastReactivated', { code: voucher.code }));
    },
  });

  function confirmDeactivate(): void {
    if (!pendingDeactivate) return;
    deactivate.mutate(pendingDeactivate, {
      onSettled: () => { setPendingDeactivate(null); },
    });
  }

  function handleEdit(voucher: Voucher): void {
    setIsFormOpen(false);
    setEditing(voucher);
  }

  const { forbidden } = binding.copy;
  const vouchers = data?.data ?? [];
  const listErrorMsg = error ? voucherConsoleErrorMessage(error, 'list', forbidden, lang) : null;
  const deactivateErrorMsg = deactivate.isError
    ? voucherConsoleErrorMessage(deactivate.error, 'deactivate', forbidden, lang)
    : null;
  const reactivateErrorMsg = reactivate.isError
    ? voucherConsoleErrorMessage(reactivate.error, 'update', forbidden, lang)
    : null;

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-2xl text-ink-pri">{t(binding.copy.title)}</h1>
          <p className="font-body text-sm text-ink-sec mt-1 m-0">{t(binding.copy.intro)}</p>
        </div>
        {!isFormOpen && !editing && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-tb-input text-xs font-body font-semibold bg-canvas-elevated border border-bdr text-ink-sec hover:border-tb-amber/50 hover:text-ink-pri transition-colors cursor-pointer shrink-0"
          >
            <Plus size={14} className="shrink-0" />
            {t('newCode')}
          </button>
        )}
      </div>

      {toast && (
        <div className="bg-tb-green/15 text-accent-green border border-tb-green/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {toast}
        </div>
      )}
      {listErrorMsg && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {listErrorMsg}
        </div>
      )}
      {deactivateErrorMsg && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
          {deactivate.variables ? (
            <span className="font-mono font-bold">{deactivate.variables.code}</span>
          ) : null}{' '}
          · {deactivateErrorMsg}
        </div>
      )}
      {reactivateErrorMsg && (
        <div className="bg-tb-red/10 text-accent-red border border-tb-red/30 rounded-tb-card px-4 py-3 font-body text-sm">
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
          binding={binding}
          voucher={editing}
          onCancel={() => {
            setIsFormOpen(false);
            setEditing(null);
          }}
          onSaved={(voucher, mode) => {
            setIsFormOpen(false);
            setEditing(null);
            showToast(
              t(mode === 'create' ? 'toastCreated' : 'toastSaved', { code: voucher.code }),
            );
          }}
        />
      )}

      <SearchField
        value={search.input}
        onChange={search.setInput}
        placeholder={t('searchPlaceholder')}
        className="max-w-sm"
      />

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
            {listSearchEmptyText(search, t('searchNoun'), lang) ?? t(binding.copy.empty)}
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
                      key={header ?? `col-${idx}`}
                      className="text-left px-4 py-3 font-body font-semibold text-ink-muted text-xs uppercase tracking-wide"
                    >
                      {header ? t(header) : ''}
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
                    onDeactivate={setPendingDeactivate}
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

      <ConfirmDialog
        open={pendingDeactivate !== null}
        tone="danger"
        title={pendingDeactivate ? t('deactivateTitle', { code: pendingDeactivate.code }) : ''}
        description={t('deactivateBody')}
        confirmLabel={t('deactivate')}
        isPending={deactivate.isPending}
        onConfirm={confirmDeactivate}
        onCancel={() => { setPendingDeactivate(null); }}
      />
    </div>
  );
}
