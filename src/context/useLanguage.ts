import { useContext } from 'react';
import { LanguageContext, type LanguageContextValue } from '@/context/languageContextValue';

export function useLanguage(): LanguageContextValue {
  return useContext(LanguageContext);
}
