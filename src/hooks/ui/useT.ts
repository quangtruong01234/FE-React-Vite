import { useMemo } from 'react';
import { useLanguage } from '@/context/useLanguage';
import { bindTranslator, type MessageBook, type Translator } from '@/lib/i18n/messages';

/** `const t = useT(fooMessages); t('title')` — re-renders in the new language on a switch. */
export function useT<K extends string>(book: MessageBook<K>): Translator<K> {
  const { lang } = useLanguage();
  return useMemo(() => bindTranslator(book, lang), [book, lang]);
}
