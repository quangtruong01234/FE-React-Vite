import { useRef, useState, type FormEvent, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { Info, Sparkles } from 'lucide-react';
import { buildLoginRedirect } from '@/api/unauthorized';
import { DemoModeGate } from '@/components/shared/DemoModeGate';
import { GradientButton } from '@/components/shared/GradientButton';
import { Skeleton } from '@/components/ui/skeleton';
import { useT } from '@/hooks/ui/useT';
import type { ProductAnswer } from '@/types';
import { productMessages } from './product.i18n';
import {
  QUESTION_MAX_LENGTH,
  abstainMessageKey,
  askErrorKey,
  isAskableQuestion,
  normalizeQuestion,
  sourceLabelKey,
  splitAnswer,
} from './productQuestion';
import { useAskProductQuestion } from './useAskProductQuestion';

interface ProductQuestionBoxProps {
  productId: string;
  signedIn: boolean;
}

/**
 * PRODUCT-QA-01 — "ask about this product". Answers are grounded in the listing
 * and its reviews; the route is signed-in only, so a guest gets a login link.
 * Mount with `key={productId}` so a product change drops the previous answer.
 */
export function ProductQuestionBox({ productId, signedIn }: ProductQuestionBoxProps): ReactElement {
  const t = useT(productMessages);

  return (
    <section className="mt-12 pt-8 border-t border-bdr">
      <h2 className="font-display font-black text-2xl tracking-[-0.01em] text-ink-pri m-0 mb-2">
        {t('qaTitle')}
      </h2>
      <p className="font-body text-sm text-ink-sec m-0 mb-5">{t('qaHint')}</p>
      {signedIn ? (
        <QuestionForm productId={productId} />
      ) : (
        <p className="font-body text-sm text-ink-sec m-0">
          {t('qaLoginPrompt')}{' '}
          <Link
            to={buildLoginRedirect(`/product/${productId}`)}
            className="font-semibold text-accent-amber hover:underline"
          >
            {t('qaLogin')}
          </Link>
        </p>
      )}
    </section>
  );
}

function QuestionForm({ productId }: { productId: string }): ReactElement {
  const t = useT(productMessages);
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const ask = useAskProductQuestion(productId);
  const canSubmit = isAskableQuestion(draft) && !ask.isPending;

  // The submit button disables while pending, which drops keyboard focus to
  // <body>; hand it back to the textarea once the ask settles.
  const handleSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!canSubmit) return;
    ask.mutate(draft, {
      onSuccess: () => setDraft(''),
      onSettled: () => inputRef.current?.focus(),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor="product-question" className="font-body text-xs font-semibold text-ink-sec">
          {t('qaLabel')}
        </label>
        <textarea
          ref={inputRef}
          id="product-question"
          rows={3}
          maxLength={QUESTION_MAX_LENGTH}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t('qaPlaceholder')}
          readOnly={ask.isPending}
          className="w-full resize-none rounded-tb-input border border-bdr bg-canvas-base text-ink-pri font-body text-sm px-3 py-2 placeholder:text-ink-muted focus:outline-none focus:border-accent-amber transition-colors read-only:opacity-60"
        />
        <div className="flex items-center justify-between gap-3">
          <span className="font-mono text-xs text-ink-muted">
            {normalizeQuestion(draft).length}/{QUESTION_MAX_LENGTH}
          </span>
          <DemoModeGate>
            <GradientButton type="submit" size="sm" disabled={!canSubmit}>
              {ask.isPending ? t('qaAsking') : t('qaSubmit')}
            </GradientButton>
          </DemoModeGate>
        </div>
      </form>

      {/* Always mounted so screen readers announce the pending → answer swap;
          a live region that appears already filled is often skipped. */}
      <div aria-live="polite" className="empty:hidden">
        {ask.isPending && (
          <div className="p-4 bg-canvas-surface border border-bdr rounded-tb-card flex flex-col gap-2">
            <p className="font-body text-sm text-ink-sec m-0">{t('qaPending')}</p>
            <Skeleton className="h-3 w-full bg-canvas-elevated" />
            <Skeleton className="h-3 w-4/5 bg-canvas-elevated" />
          </div>
        )}

        {ask.isError && (
          <p role="alert" className="font-body text-sm text-accent-red m-0">
            {t(askErrorKey(ask.error))}
          </p>
        )}

        {ask.isSuccess && <AnswerCard question={ask.variables} result={ask.data} />}
      </div>
    </div>
  );
}

function AnswerCard({ question, result }: { question: string; result: ProductAnswer }): ReactElement {
  const t = useT(productMessages);

  return (
    <div className="p-4 bg-canvas-surface border border-bdr rounded-tb-card flex flex-col gap-3">
      <p className="font-body text-xs text-ink-muted m-0">
        <span className="font-semibold">{t('qaYouAsked')}</span> {normalizeQuestion(question)}
      </p>

      {result.abstained || result.answer === null ? (
        <p className="flex items-start gap-2 font-body text-sm text-ink-sec m-0">
          <Info size={16} className="shrink-0 mt-0.5 text-ink-muted" aria-hidden="true" />
          <span>{t(abstainMessageKey(result.abstainReason))}</span>
        </p>
      ) : (
        <>
          <p className="font-body text-sm text-ink-pri leading-relaxed whitespace-pre-line m-0">
            {splitAnswer(result.answer, result.citations).map((part, i) =>
              part.kind === 'text' ? (
                <span key={i}>{part.text}</span>
              ) : (
                <sup key={i} className="font-mono text-[10px] font-semibold text-accent-amber">
                  [{part.index}]
                </sup>
              ),
            )}
          </p>

          {result.citations.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="font-display font-bold text-xs uppercase tracking-widest text-ink-muted m-0">
                {t('qaSources')}
              </h3>
              <ol className="flex flex-col gap-2 m-0 p-0 list-none">
                {result.citations.map((citation) => (
                  <li key={citation.index} className="flex items-start gap-2 font-body text-xs text-ink-sec">
                    <span className="font-mono font-semibold text-accent-amber shrink-0">[{citation.index}]</span>
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-accent-cyan/10 text-accent-cyan border border-accent-cyan/20 text-[10px] font-semibold">
                      {t(sourceLabelKey(citation.source))}
                    </span>
                    <span className="min-w-0 break-words">{citation.snippet}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <p className="flex items-center gap-1.5 font-body text-[11px] text-ink-muted m-0">
            <Sparkles size={12} className="shrink-0" aria-hidden="true" />
            {t('qaDisclaimer')}
          </p>
        </>
      )}
    </div>
  );
}
