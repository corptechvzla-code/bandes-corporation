'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { MaterialExit, CreateMaterialExitRequest } from '@/types/api';

export function useMaterialExits() {
  return useQuery<MaterialExit[]>({
    queryKey: ['material-exits'],
    queryFn: () => api.get('/material-exits').then((r) => r.data),
  });
}

export function useTraceability(id: string | null) {
  return useQuery<MaterialExit>({
    queryKey: ['material-exits', id, 'traceability'],
    queryFn: () => api.get(`/material-exits/${id}/traceability`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateMaterialExit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateMaterialExitRequest) =>
      api.post('/material-exits', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['material-exits'] });
      queryClient.invalidateQueries({ queryKey: ['bars'] });
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['available-lots'] });
    },
  });
}
