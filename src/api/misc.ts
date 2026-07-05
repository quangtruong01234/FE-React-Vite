import type { HealthStatus } from '@/types';
import { request } from './client';

export const miscApi = {
  health: (): Promise<HealthStatus> =>
    request<HealthStatus>('/gateway/health'),
};
