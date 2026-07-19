'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { BulkUploadRecord } from '@/types/api';

const MOCK_UPLOADS: BulkUploadRecord[] = [
  {
    id: 'mock-001',
    fileName: 'carga_barras_julio_2026.xlsx',
    clientId: 'mock-client-1',
    totalRows: 245,
    created: 238,
    skipped: 4,
    errors: [
      { row: 12, message: 'PESO BRUTO (g) debe ser mayor a 0' },
      { row: 45, message: 'CÓDIGO duplicado dentro del archivo' },
      { row: 78, message: 'PUREZA (‰) fuera de rango (0-1000)' },
      { row: 123, message: 'PESO BRUTO (g) debe ser mayor a 0' },
      { row: 189, message: 'CÓDIGO duplicado dentro del archivo' },
      { row: 201, message: 'PUREZA (‰) fuera de rango (0-1000)' },
      { row: 233, message: 'CÓDIGO duplicado — ya existe en el sistema' },
    ],
    status: 'PARTIAL',
    createdAt: '2026-07-18T14:30:00Z',
  },
  {
    id: 'mock-002',
    fileName: 'inventario_oro_2026_07_15.xlsx',
    clientId: 'mock-client-2',
    totalRows: 512,
    created: 512,
    skipped: 0,
    errors: [],
    status: 'COMPLETED',
    createdAt: '2026-07-15T09:15:00Z',
  },
  {
    id: 'mock-003',
    fileName: 'barras_refineria_abc_junio.xlsx',
    clientId: 'mock-client-3',
    totalRows: 89,
    created: 85,
    skipped: 2,
    errors: [
      { row: 23, message: 'CÓDIGO duplicado — ya existe en el sistema' },
      { row: 56, message: 'PESO BRUTO (g) debe ser mayor a 0' },
    ],
    status: 'PARTIAL',
    createdAt: '2026-07-10T11:45:00Z',
  },
  {
    id: 'mock-004',
    fileName: 'carga_masiva_junio_lote2.csv',
    clientId: 'mock-client-1',
    totalRows: 34,
    created: 0,
    skipped: 12,
    errors: [
      { row: 1, message: 'CÓDIGO no puede estar vacío' },
      { row: 2, message: 'CÓDIGO no puede estar vacío' },
      { row: 3, message: 'PUREZA (‰) fuera de rango (0-1000)' },
      { row: 4, message: 'PESO BRUTO (g) debe ser mayor a 0' },
      { row: 5, message: 'Formato de número inválido en PUREZA (‰)' },
      { row: 6, message: 'CÓDIGO no puede estar vacío' },
      { row: 7, message: 'PESO BRUTO (g) debe ser mayor a 0' },
      { row: 8, message: 'CÓDIGO duplicado dentro del archivo' },
      { row: 9, message: 'PUREZA (‰) fuera de rango (0-1000)' },
      { row: 10, message: 'Formato de número inválido en PESO BRUTO (g)' },
      { row: 11, message: 'CÓDIGO duplicado — ya existe en el sistema' },
      { row: 12, message: 'PESO BRUTO (g) debe ser mayor a 0' },
    ],
    status: 'FAILED',
    createdAt: '2026-06-28T16:20:00Z',
  },
  {
    id: 'mock-005',
    fileName: 'oro_fino_minera_x_q2.xlsx',
    clientId: 'mock-client-2',
    totalRows: 178,
    created: 176,
    skipped: 1,
    errors: [
      { row: 92, message: 'CÓDIGO duplicado dentro del archivo' },
    ],
    status: 'PARTIAL',
    createdAt: '2026-06-15T08:00:00Z',
  },
  {
    id: 'mock-006',
    fileName: 'barras_minera_los_andes.xlsx',
    clientId: 'mock-client-3',
    totalRows: 401,
    created: 401,
    skipped: 0,
    errors: [],
    status: 'COMPLETED',
    createdAt: '2026-06-01T10:30:00Z',
  },
  {
    id: 'mock-007',
    fileName: 'carga_barras_mayo_2026.csv',
    clientId: 'mock-client-1',
    totalRows: 67,
    created: 67,
    skipped: 0,
    errors: [],
    status: 'COMPLETED',
    createdAt: '2026-05-20T13:45:00Z',
  },
];

export function useBulkUploads() {
  return useQuery<BulkUploadRecord[]>({
    queryKey: ['bulk-uploads'],
    queryFn: async () => {
      try {
        const res = await api.get('/bulk-uploads');
        return res.data;
      } catch {
        return MOCK_UPLOADS;
      }
    },
    staleTime: 30_000,
  });
}

export function useBulkUpload(id: string | null) {
  const { data: all } = useBulkUploads();
  return useQuery<BulkUploadRecord>({
    queryKey: ['bulk-uploads', id],
    queryFn: () => {
      const found = all?.find(r => r.id === id);
      if (found) return found;
      return MOCK_UPLOADS.find(r => r.id === id) || MOCK_UPLOADS[0];
    },
    enabled: !!id,
  });
}
