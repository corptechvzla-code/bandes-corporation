'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  Process,
  AvailableLotsResponse,
  CreateProcessRequest,
  UpdateProcessRequest,
} from '@/types/api';

export function useProcesses() {
  return useQuery<Process[]>({
    queryKey: ['processes'],
    queryFn: () => api.get('/processes').then((r) => r.data),
  });
}

export function useProcess(id: string | null) {
  return useQuery<Process>({
    queryKey: ['processes', id],
    queryFn: () => api.get(`/processes/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useProcessesByClient(clientId: string | null) {
  return useQuery<Process[]>({
    queryKey: ['processes', 'client', clientId],
    queryFn: () => api.get(`/processes/client/${clientId}`).then((r) => r.data),
    enabled: !!clientId,
  });
}

export function useAvailableLots(clientId: string | null) {
  return useQuery<AvailableLotsResponse[]>({
    queryKey: ['available-lots', clientId],
    queryFn: () => api.get(`/processes/available-lots/${clientId}`).then((r) => r.data),
    enabled: !!clientId,
  });
}

export function useCreateProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateProcessRequest) =>
      api.post('/processes', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
    },
  });
}

export function useUpdateProcess() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProcessRequest }) =>
      api.patch(`/processes/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['processes'] });
      queryClient.invalidateQueries({ queryKey: ['available-lots'] });
    },
  });
}
