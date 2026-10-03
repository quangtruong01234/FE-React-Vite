import { useState, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X } from 'lucide-react';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { useDebouncedValue } from '@/hooks/ui/useDebouncedValue';
import { IconButton } from '@/components/shared/IconButton';
import { TextField } from '@/components/shared/TextField';
import { useT } from '@/hooks/ui/useT';
import type { UserSearchResult } from '@/types';
import { orderExportMessages } from './orderExport.i18n';

/** Same floor as the header search — one letter matches half the platform. */
const SELLER_SEARCH_MIN_LENGTH = 2;
const SELLER_SEARCH_LIMIT = 6;

interface ExportSellerPickerProps {
  value: UserSearchResult | null;
  onChange: (seller: UserSearchResult | null) => void;
}

/**
 * EXPORT-CSV-01 T4 — the admin export's optional seller filter. Searches users
 * by name (`GET /user/search`); that endpoint does not return a role, so a
 * buyer can be picked too — the export then simply comes back empty.
 */
export function ExportSellerPicker({ value, onChange }: ExportSellerPickerProps): ReactElement {
  const [query, setQuery] = useState('');
  const t = useT(orderExportMessages);
  const debounced = useDebouncedValue(query.trim(), 300);
  const enabled = value === null && debounced.length >= SELLER_SEARCH_MIN_LENGTH;

  const results = useQuery({
    queryKey: queryKeys.search.users(debounced, SELLER_SEARCH_LIMIT),
    queryFn: () => api.users.searchUsers(debounced, SELLER_SEARCH_LIMIT),
    enabled,
  });

  if (value) {
    return (
      <div className="flex flex-col gap-1.5 w-56">
        <span className="font-body font-medium text-[11px] leading-[1.4] text-ink-sec tracking-[0.04em] uppercase">
          {t('seller')}
        </span>
        <div className="flex items-center justify-between gap-2 h-11 px-3.5 bg-canvas-elevated border border-bdr rounded-tb-input">
          <span className="font-body text-sm text-ink-pri truncate">@{value.username}</span>
          <IconButton
            aria-label={t('clearSeller')}
            onClick={() => onChange(null)}
            className="size-6 rounded-full text-ink-muted hover:text-ink-pri cursor-pointer"
          >
            <X size={14} className="shrink-0" />
          </IconButton>
        </div>
      </div>
    );
  }

  const options = enabled ? (results.data ?? []) : [];

  return (
    <div className="relative w-56">
      <TextField
        id="export-seller"
        label={t('sellerOptional')}
        placeholder={t('allSellers')}
        value={query}
        onChange={e => setQuery(e.target.value)}
        leftIcon={<Search size={14} className="shrink-0" />}
        autoComplete="off"
      />
      {enabled && !results.isLoading && (
        <ul
          aria-label={t('sellerResults')}
          className="absolute z-20 left-0 right-0 top-full mt-1 m-0 p-1 list-none bg-canvas-surface border border-bdr rounded-tb-input shadow-lg"
        >
          {options.length === 0 ? (
            <li className="px-2.5 py-2 font-body text-xs text-ink-muted">
              {results.isError ? t('sellerSearchFailed') : t('noResults')}
            </li>
          ) : (
            options.map(user => (
              <li key={user.id}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(user);
                    setQuery('');
                  }}
                  className="w-full flex flex-col items-start px-2.5 py-1.5 rounded-tb-input bg-transparent border-none text-left cursor-pointer hover:bg-canvas-elevated"
                >
                  <span className="font-body text-sm text-ink-pri">@{user.username}</span>
                  {user.name && (
                    <span className="font-body text-xs text-ink-muted">{user.name}</span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
