'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Lot, CreateLotRequest, UpdateLotRequest } from '@/types/api';

export function useLots() {
  return useQuery<Lot[]>({
    queryKey: ['lots'],
    queryFn: () => api.get('/lots').then((r) => r.data),
  });
}

export function useLot(id: string | null) {
  return useQuery<Lot>({
    queryKey: ['lots', id],
    queryFn: () => api.get(`/lots/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useLotsByProcess(processId: string | null) {
  return useQuery<Lot[]>({
    queryKey: ['lots', 'process', processId],
    queryFn: () => api.get(`/lots/process/${processId}`).then((r) => r.data),
    enabled: !!processId,
  });
}

export function useCreateLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateLotRequest) =>
      api.post('/lots', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
}

export function useUpdateLot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLotRequest }) =>
      api.patch(`/lots/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lots'] });
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      queryClient.invalidateQueries({ queryKey: ['available-lots'] });
    },
  });
}
