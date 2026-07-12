import { useQuery } from '@tanstack/react-query';
import { api } from '@/api';
import { queryKeys } from '@/hooks/query/queryKeys';

// Master-data barely changes and is cached 24h server-side, so keep it fresh
// for the whole session to avoid refetching the province list on every mount.
const MASTER_DATA_STALE = 1000 * 60 * 60;

export function useProvinces() {
  return useQuery({
    queryKey: queryKeys.shipping.provinces,
    queryFn: () => api.shipping.getProvinces(),
    staleTime: MASTER_DATA_STALE,
  });
}

export function useDistricts(provinceId: number) {
  return useQuery({
    queryKey: queryKeys.shipping.districts(provinceId),
    queryFn: () => api.shipping.getDistricts(provinceId),
    enabled: provinceId > 0,
    staleTime: MASTER_DATA_STALE,
  });
}

export function useWards(districtId: number) {
  return useQuery({
    queryKey: queryKeys.shipping.wards(districtId),
    queryFn: () => api.shipping.getWards(districtId),
    enabled: districtId > 0,
    staleTime: MASTER_DATA_STALE,
  });
}
