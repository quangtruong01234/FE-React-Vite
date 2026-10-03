import { useCallback, useState } from 'react';
import { defineMessages, translate } from '@/lib/i18n/messages';
import type { Lang } from '@/lib/i18n/lang';
import { useDebouncedValue } from './useDebouncedValue';

const searchMessages = defineMessages({
  vi: { searching: 'Đang tìm…', noMatch: 'Không tìm thấy {noun} nào khớp “{term}”' },
  en: { searching: 'Searching…', noMatch: 'No {noun} match “{term}”' },
});

export interface ListSearch {
  /** What the box shows. */
  input: string;
  setInput: (value: string) => void;
  /** Trimmed + debounced — what the query sends (and keys on). */
  term: string;
  /** The user typed something the query has not caught up with yet. */
  pending: boolean;
}

/**
 * State for a server-side list search box (LIST-SEARCH-01). The term is
 * debounced so typing costs one request, not one per key.
 *
 * `onInput` runs from the change handler — pass the page reset there
 * (`() => { if (page !== 1) setPage(1); }`): a new term restarts pagination,
 * and resetting from an event handler avoids a render-phase URL update. Guard
 * it with the current page so each keystroke does not push a history entry.
 */
export function useListSearch(onInput?: () => void, delay = 400): ListSearch {
  const [input, setRawInput] = useState('');
  const term = useDebouncedValue(input.trim(), delay);

  const setInput = useCallback(
    (value: string) => {
      setRawInput(value);
      onInput?.();
    },
    [onInput],
  );

  return { input, setInput, term, pending: input.trim() !== term };
}

/**
 * Empty-state line for a searched list, or `null` when no search is active
 * (the caller then shows its normal "nothing here yet" copy).
 */
export function listSearchEmptyText(
  search: Pick<ListSearch, 'term' | 'pending'>,
  noun: string,
  lang: Lang = 'vi',
): string | null {
  if (search.pending) return translate(searchMessages, lang, 'searching');
  if (search.term) return translate(searchMessages, lang, 'noMatch', { noun, term: search.term });
  return null;
}
