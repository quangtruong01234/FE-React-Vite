import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LogIn,
  ShieldX,
  SearchX,
  GitMerge,
  ClipboardX,
  Hourglass,
  Unplug,
  Wrench,
  WifiOff,
  Lightbulb,
  ChevronRight,
  RotateCcw,
  ArrowLeft,
  Home,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/format/utils';
import { GradientButton } from '@/components/shared/GradientButton';
import { useResetOnChange } from '@/hooks/ui/useResetOnChange';
import { useT } from '@/hooks/ui/useT';
import type { MessageKey } from '@/lib/i18n/messages';
import type { ApiError } from '@/types';
import { apiErrorStateMessages } from './apiErrorState.i18n';

type ErrorKey = MessageKey<typeof apiErrorStateMessages>;

interface ErrorConfig {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  tone: 'amber' | 'red' | 'cyan';
  title: ErrorKey;
  sub: ErrorKey;
  tips: ErrorKey[];
  rateLimit?: boolean;
  primary?: { label: ErrorKey; icon: React.ComponentType<{ size?: number; className?: string }>; to: string };
}

const ERROR_MAP: Record<number, ErrorConfig> = {
  401: { icon: LogIn,       tone: 'amber', title: 'e401Title',    sub: 'e401Sub',    tips: ['e401Tip1', 'e401Tip2'], primary: { label: 'e401Action', icon: LogIn, to: '/login' } },
  403: { icon: ShieldX,     tone: 'red',   title: 'e403Title',    sub: 'e403Sub',    tips: [] },
  404: { icon: SearchX,     tone: 'cyan',  title: 'e404Title',    sub: 'e404Sub',    tips: ['e404Tip1', 'e404Tip2'] },
  409: { icon: GitMerge,    tone: 'amber', title: 'e409Title',    sub: 'e409Sub',    tips: ['e409Tip1'] },
  422: { icon: ClipboardX,  tone: 'amber', title: 'e422Title',    sub: 'e422Sub',    tips: ['e422Tip1'] },
  429: { icon: Hourglass,   tone: 'amber', title: 'e429Title',    sub: 'e429Sub',    tips: ['e429Tip1', 'e429Tip2'], rateLimit: true },
  500: { icon: AlertTriangle,tone: 'red',  title: 'e500Title',    sub: 'e500Sub',    tips: ['tipRetryLater', 'tipStillFailingComeBack'] },
  502: { icon: Unplug,      tone: 'red',   title: 'e502Title',    sub: 'e502Sub',    tips: ['tipRetryLater'] },
  503: { icon: Wrench,      tone: 'cyan',  title: 'e503Title',    sub: 'e503Sub',    tips: ['e503Tip1'] },
  0:   { icon: WifiOff,     tone: 'red',   title: 'offlineTitle', sub: 'offlineSub', tips: ['offlineTip1', 'offlineTip2'] },
};

const UNEXPECTED: ErrorConfig = {
  icon: AlertTriangle, tone: 'red',
  title: 'unexpectedTitle',
  sub: 'unexpectedSub',
  tips: ['tipRetryLater', 'tipStillFailingReload'],
};

/**
 * Always resolves to a config. Returning `undefined` for an unmapped status used
 * to render *nothing* — a blank screen at the exact moment the user needs an
 * explanation, and the reason a page delegating its error state here could go
 * empty on a plain 500. Unknown 5xx degrade to the server-error panel, anything
 * else (incl. a network `TypeError` with no `statusCode`) to a generic one.
 */
function resolveErrorConfig(status: number | undefined): ErrorConfig {
  if (status == null) return UNEXPECTED;
  return ERROR_MAP[status] ?? (status >= 500 ? ERROR_MAP[500] : UNEXPECTED);
}

const TONES = {
  amber: { ring: 'border-tb-amber/30 bg-tb-amber/[0.04]', chip: 'bg-tb-amber/10 text-accent-amber', dot: 'bg-accent-amber' },
  red:   { ring: 'border-tb-red/30 bg-tb-red/[0.04]',     chip: 'bg-tb-red/10 text-accent-red',     dot: 'bg-accent-red' },
  cyan:  { ring: 'border-tb-cyan/30 bg-tb-cyan/[0.04]',   chip: 'bg-tb-cyan/10 text-accent-cyan',   dot: 'bg-accent-cyan' },
};

function parseRetrySeconds(msg?: string): number {
  if (!msg) return 60;
  const m = String(msg).match(/(\d+)\s*(seconds?|s|giây)/i);
  return m ? Number(m[1]) : 60;
}

interface ApiErrorStateProps {
  error?: ApiError;
  onRetry?: () => void;
  embedded?: boolean;
}

export function ApiErrorState({ error = {} as ApiError, onRetry, embedded = false }: ApiErrorStateProps) {
  const navigate = useNavigate();
  const t = useT(apiErrorStateMessages);
  const cfg = resolveErrorConfig(error.statusCode);

  const seconds = cfg.rateLimit ? parseRetrySeconds(error.message) : 0;
  const [left, setLeft] = useState(seconds);

  useResetOnChange(seconds, () => setLeft(seconds));

  useEffect(() => {
    if (!cfg.rateLimit || left <= 0) return;
    const timer = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(timer);
  }, [cfg.rateLimit, left]);

  const tone = TONES[cfg.tone];
  const canRetry = !cfg.rateLimit || left <= 0;
  const pct = seconds ? ((seconds - left) / seconds) * 100 : 100;

  const IconComp = cfg.icon;
  const PrimaryIcon = cfg.primary?.icon;

  const body = (
    <div className={cn('relative w-full max-w-lg mx-auto bg-canvas-surface border rounded-tb-sheet overflow-hidden', tone.ring)}>
      <div className="relative p-7 flex flex-col items-center text-center gap-4">
        {/* icon */}
        <div className={cn('size-16 rounded-2xl grid place-items-center', tone.chip)}>
          <IconComp size={30} className="shrink-0" />
        </div>

        <div>
          <h1 className="font-display font-black text-2xl uppercase tracking-tight text-ink-pri m-0">{t(cfg.title)}</h1>
          <p className="font-body text-sm text-ink-sec mt-2 mb-0 leading-relaxed">{t(cfg.sub)}</p>
        </div>

        {/* server message */}
        {error.message && (
          <div className="w-full bg-canvas-base border border-bdr rounded-tb-cta px-3.5 py-2.5 text-left">
            <div className="text-[10px] uppercase tracking-wider text-ink-muted font-semibold mb-1">{t('serverMessage')}</div>
            <div className="font-mono text-[13px] text-ink-pri leading-snug">{error.message}</div>
          </div>
        )}

        {/* rate-limit countdown */}
        {cfg.rateLimit && (
          <div className="w-full">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-ink-sec">{left > 0 ? t('canRetryIn') : t('canRetryNow')}</span>
              <span className="font-mono font-bold text-accent-amber">{left > 0 ? `${left}s` : '0s'}</span>
            </div>
            <div className="h-2 rounded-full bg-canvas-elevated overflow-hidden">
              <div
                className="h-full bg-tb-gradient rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )}

        {/* tips — only when non-empty */}
        {cfg.tips.length > 0 && (
          <div className="w-full bg-tb-elevated/50 border border-bdr rounded-tb-cta p-4 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-pri uppercase tracking-wide mb-2">
              <Lightbulb size={13} className="text-accent-amber shrink-0" /> {t('tips')}
            </div>
            <ul className="m-0 pl-0 list-none flex flex-col gap-1.5">
              {cfg.tips.map((tip) => (
                <li key={tip} className="flex items-start gap-2 text-sm text-ink-sec">
                  <ChevronRight size={14} className="text-accent-amber shrink-0 mt-0.5" />
                  <span>{t(tip)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* actions */}
        <div className="w-full flex flex-col gap-2.5">
          {cfg.primary && PrimaryIcon ? (
            <GradientButton className="w-full" onClick={() => { void navigate(cfg.primary!.to); }}>
              <PrimaryIcon size={16} className="shrink-0" /> {t(cfg.primary.label)}
            </GradientButton>
          ) : (
            <GradientButton className="w-full" disabled={!canRetry} onClick={() => { if (canRetry && onRetry) onRetry(); }}>
              <RotateCcw size={16} className="shrink-0" />
              {cfg.rateLimit && left > 0 ? t('retryIn', { seconds: left }) : t('retry')}
            </GradientButton>
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => { void (window.history.length > 1 ? navigate(-1) : navigate('/')); }}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-tb-cta border border-bdr bg-canvas-elevated text-ink-sec text-sm font-display font-black uppercase tracking-widest hover:border-ink-muted transition-colors"
            >
              <ArrowLeft size={15} className="shrink-0" /> {t('back')}
            </button>
            <button
              type="button"
              onClick={() => { void navigate('/'); }}
              className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 rounded-tb-cta border border-bdr bg-canvas-elevated text-ink-sec text-sm font-display font-black uppercase tracking-widest hover:border-ink-muted transition-colors"
            >
              <Home size={15} className="shrink-0" /> {t('home')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (embedded) return body;
  return <div className="min-h-[60vh] flex items-center justify-center py-10">{body}</div>;
}
