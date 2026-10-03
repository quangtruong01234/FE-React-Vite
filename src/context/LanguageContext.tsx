import { useCallback, useLayoutEffect, useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { LanguageContext, type LanguageContextValue } from '@/context/languageContextValue';
import { applyLang, readSavedLang, resolveLang, writeSavedLang, type Lang } from '@/lib/i18n/lang';

export function LanguageProvider({ children }: { children: ReactNode }): ReactElement {
  const [lang, setLangState] = useState<Lang>(() => resolveLang(readSavedLang()));

  // index.html already set <html lang> for the first paint; this keeps it in step afterwards.
  useLayoutEffect(() => {
    applyLang(lang);
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    writeSavedLang(next);
  }, []);

  const value = useMemo<LanguageContextValue>(() => ({ lang, setLang }), [lang, setLang]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
