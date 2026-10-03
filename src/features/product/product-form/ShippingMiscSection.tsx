import { type ReactElement } from 'react';
import { cn } from '@/lib/format/utils';
import type { FormErrors } from './useProductForm';
import { useT } from '@/hooks/ui/useT';
import { productFormMessages } from './productForm.i18n';

const inputCls = (hasError?: boolean) =>
  cn(
    'w-full bg-canvas-elevated border border-bdr rounded-tb-input',
    'px-3.5 py-2.5 text-ink-pri font-body text-sm placeholder:text-ink-muted',
    'outline-none transition-colors',
    'focus:border-tb-amber/50 focus:ring-2 focus:ring-tb-amber/20',
    hasError && 'border-accent-red focus:border-accent-red focus:ring-tb-red/20',
  );

interface Props {
  weight: string;
  sellerNotes: string;
  errors: FormErrors;
  onWeightChange: (v: string) => void;
  onSellerNotesChange: (v: string) => void;
}

export function ShippingMiscSection({
  weight,
  sellerNotes,
  errors,
  onWeightChange,
  onSellerNotesChange,
}: Props): ReactElement {
  const t = useT(productFormMessages);
  return (
    <div className="bg-canvas-surface border border-bdr rounded-tb-card overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-bdr">
        <span className="size-7 rounded-full bg-tb-amber/10 grid place-items-center shrink-0">
          <span className="font-display font-bold text-xs text-accent-amber">04</span>
        </span>
        <h2 className="font-display font-semibold text-sm uppercase tracking-wider text-ink-pri">
          {t('sectionShipping')}
        </h2>
      </div>

      <div className="p-6 flex flex-col gap-5">
        {/* Weight */}
        <div className="flex flex-col gap-1.5">
          <label className="text-ink-pri font-body text-sm">
            {t('weight')}
            {!weight && (
              <span className="ml-2 text-xs text-accent-amber font-body">
                {t('weightHint')}
              </span>
            )}
          </label>
          <input
            type="number"
            min="0"
            placeholder={t('eg', { value: 500 })}
            value={weight}
            onChange={e => onWeightChange(e.target.value)}
            className={inputCls(!!errors.weight)}
          />
          {errors.weight && (
            <p className="text-xs text-accent-red font-body">{errors.weight}</p>
          )}
        </div>

        {/* Seller notes */}
        <div className="flex flex-col gap-1.5">
          <label className="text-ink-pri font-body text-sm">{t('sellerNotes')}</label>
          <textarea
            value={sellerNotes}
            onChange={e => onSellerNotesChange(e.target.value)}
            placeholder={t('sellerNotesPlaceholder')}
            rows={3}
            className={cn(inputCls(), 'resize-y min-h-[72px]')}
          />
        </div>

      </div>
    </div>
  );
}
