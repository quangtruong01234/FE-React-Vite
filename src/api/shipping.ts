import type { Province, District, Ward } from '@/types';
import { request, toQuery } from './client';

// GHN master-data proxy (handoff 2026-07-01). No GHN token on the client; the
// gateway forwards these and returns the exact GHN codes the fee preview +
// waybill consume. Backed by a 24h server-side cache.
export const shippingApi = {
  getProvinces: (): Promise<Province[]> =>
    request<Province[]>('/shipping/provinces'),

  getDistricts: (provinceId: number): Promise<District[]> => {
    const qs = toQuery({ provinceId });
    return request<District[]>(`/shipping/districts${qs}`);
  },

  getWards: (districtId: number): Promise<Ward[]> => {
    const qs = toQuery({ districtId });
    return request<Ward[]>(`/shipping/wards${qs}`);
  },
};
