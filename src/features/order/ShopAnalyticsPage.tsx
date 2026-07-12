import { type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { AnalyticsDashboard } from './analytics/AnalyticsDashboard';
import { useAnalyticsFilters } from './analytics/useAnalyticsFilters';

export default function ShopAnalyticsPage(): ReactElement {
  const [filters, setFilters] = useAnalyticsFilters();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.orders.sellerAnalytics(filters),
    queryFn: () => api.orders.getSellerAnalytics(filters),
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <h1 className="font-display font-bold text-2xl text-ink-pri">Thống kê bán hàng</h1>
      <AnalyticsDashboard data={data} isLoading={isLoading} filters={filters} onFiltersChange={setFilters} />
    </div>
  );
}
