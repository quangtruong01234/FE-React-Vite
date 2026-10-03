import { createContext } from 'react';
import { DEFAULT_LANG, type Lang } from '@/lib/i18n/lang';

export interface LanguageContextValue {
  lang: Lang;
  /** Saves the choice on this machine. */
  setLang: (lang: Lang) => void;
}

/**
 * Apart from `LanguageContext.tsx` for Fast Refresh — see `authContextValue.ts`.
 *
 * Unlike Theme/Auth this has a working default instead of `null`: a component rendered
 * without the provider (most unit tests) simply speaks Vietnamese, the app's default, so
 * adding copy to a shared component never forces every test that renders it to add a wrapper.
 */
export const LanguageContext = createContext<LanguageContextValue>({
  lang: DEFAULT_LANG,
  setLang: () => {},
});
