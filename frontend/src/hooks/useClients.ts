'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Client, BalanceResponse, CreateClientRequest } from '@/types/api';

export function useClients() {
  return useQuery<Client[]>({
    queryKey: ['clients'],
    queryFn: () => api.get('/clients').then((r) => r.data),
  });
}

export function useClient(id: string | null) {
  return useQuery<Client>({
    queryKey: ['clients', id],
    queryFn: () => api.get(`/clients/${id}`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useClientBalance(id: string | null) {
  return useQuery<BalanceResponse>({
    queryKey: ['clients', id, 'balance'],
    queryFn: () => api.get(`/clients/${id}/balance`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateClientRequest) =>
      api.post('/clients', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useDeleteClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/clients/${id}`).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}

export function useUpdateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateClientRequest> }) =>
      api.patch(`/clients/${id}`, data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
    },
  });
}
