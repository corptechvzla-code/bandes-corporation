'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, apiUpload } from '@/lib/api';
import type { Bar, CreateBarRequest, UpdateBarRequest, BulkUploadResult } from '@/types/api';

export function useBars(filters?: { status?: string; clientId?: string; lotId?: string }) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.clientId) params.set('clientId', filters.clientId);
  if (filters?.lotId) params.set('lotId', filters.lotId);
  const qs = params.toString();

  return useQuery<Bar[]>({
    queryKey: ['bars', filters],
    queryFn: () => api.get(`/bars${qs ? `?${qs}` : ''}`).then((r) => r.data),
  });
}

export function useBar(id: string | null) {
  return useQuery<Bar>({
    queryKey: ['bars', id],
    queryFn: () => api.get(`/bars/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateBarRequest) =>
      api.post('/bars', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateBar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateBarRequest }) =>
      api.patch(`/bars/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
    },
  });
}

export function useBulkUploadBars() {
  const queryClient = useQueryClient();
  return useMutation<BulkUploadResult, Error, FormData>({
    mutationFn: (formData) =>
      apiUpload<BulkUploadResult>('/bars/bulk-upload', formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bars'] });
    },
  });
}
