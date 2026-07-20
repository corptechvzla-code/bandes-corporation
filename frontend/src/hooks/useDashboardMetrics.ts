'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { DashboardMetrics } from '@/types/api';

export function useDashboardMetrics() {
  return useQuery<DashboardMetrics>({
    queryKey: ['dashboard', 'metrics'],
    queryFn: () => api.get('/dashboard/metrics').then((r) => r.data),
    refetchInterval: 30_000,
  });
}
