import { type ReactElement } from 'react';
import { cn } from '@/lib/format/utils';
import { useLanguage } from '@/context/useLanguage';
import { useT } from '@/hooks/ui/useT';
import { LANGS, type Lang } from '@/lib/i18n/lang';
import { sharedMessages } from './shared.i18n';

/** Each language is named in itself, so a reader who cannot read the current one still finds theirs. */
const OPTIONS: Record<Lang, { short: string; name: string }> = {
  vi: { short: 'VI', name: 'Tiếng Việt' },
  en: { short: 'EN', name: 'English' },
};

const SIZES = {
  sm: { group: 'h-7', option: 'px-2 text-xs' },
  md: { group: 'h-9', option: 'px-2.5 text-xs' },
};

interface LanguageSwitchProps {
  size?: 'sm' | 'md';
  className?: string;
}

/** I18N-01 — the VI | EN segmented switch; ProfileMenu and `/login` both render it. */
export function LanguageSwitch({ size = 'md', className }: LanguageSwitchProps): ReactElement {
  const { lang, setLang } = useLanguage();
  const t = useT(sharedMessages);
  const s = SIZES[size];

  return (
    <div
      role="radiogroup"
      aria-label={t('language')}
      className={cn('inline-flex items-stretch gap-0.5 p-0.5 rounded-full bg-canvas-surface border border-bdr shrink-0', s.group, className)}
    >
      {LANGS.map((code) => {
        const active = code === lang;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={OPTIONS[code].name}
            lang={code}
            onClick={() => setLang(code)}
            className={cn(
              'rounded-full border-0 cursor-pointer font-body font-semibold leading-none transition-colors',
              s.option,
              active ? 'bg-tb-gradient text-ink-on-accent' : 'bg-transparent text-ink-sec hover:text-ink-pri',
            )}
          >
            {OPTIONS[code].short}
          </button>
        );
      })}
    </div>
  );
}
