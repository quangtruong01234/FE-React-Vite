import { type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';
import { AnalyticsDashboard } from '@/features/order/analytics/AnalyticsDashboard';
import { useAnalyticsFilters } from '@/features/order/analytics/useAnalyticsFilters';
import { OrderExportPanel } from '@/features/order/OrderExportPanel';
import { useT } from '@/hooks/ui/useT';
import { adminMessages } from './admin.i18n';

export default function AdminAnalyticsPage(): ReactElement {
  const t = useT(adminMessages);
  const [filters, setFilters] = useAnalyticsFilters();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: queryKeys.orders.adminAnalytics(filters),
    queryFn: () => api.orders.getAdminAnalytics(filters),
  });

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 space-y-6">
      <h1 className="font-display font-bold text-2xl text-ink-pri">{t('analyticsTitle')}</h1>
      <AnalyticsDashboard
        data={data}
        isLoading={isLoading}
        error={error}
        onRetry={() => { void refetch(); }}
        filters={filters}
        onFiltersChange={setFilters}
      />
      {/* EXPORT-CSV-01 T4: there is no admin order list, so the whole-platform export lives here. */}
      <section aria-labelledby="admin-export-heading">
        <h2
          id="admin-export-heading"
          className="font-display font-semibold text-lg text-ink-pri mb-3"
        >
          {t('exportTitle')}
        </h2>
        <OrderExportPanel scope="admin" />
      </section>
    </div>
  );
}
