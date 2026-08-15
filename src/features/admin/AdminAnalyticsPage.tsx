import { type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { AnalyticsDashboard } from '@/features/order/analytics/AnalyticsDashboard';
import { useAnalyticsFilters } from '@/features/order/analytics/useAnalyticsFilters';

export default function AdminAnalyticsPage(): ReactElement {
  const [filters, setFilters] = useAnalyticsFilters();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.orders.adminAnalytics(filters),
    queryFn: () => api.orders.getAdminAnalytics(filters),
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <h1 className="font-display font-bold text-2xl text-ink-pri">Thống kê toàn sàn</h1>
      <AnalyticsDashboard
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => { void refetch(); }}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </div>
  );
}
