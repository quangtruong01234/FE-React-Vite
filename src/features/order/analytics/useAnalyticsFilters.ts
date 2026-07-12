import { useState } from 'react';

export interface AnalyticsFilters {
  from?: string;
  to?: string;
  interval: 'day' | 'month';
}

/** Shared filter state for the seller/admin analytics pages (default: daily, last 30 days server-side). */
export function useAnalyticsFilters(): [AnalyticsFilters, (f: AnalyticsFilters) => void] {
  return useState<AnalyticsFilters>({ interval: 'day' });
}
