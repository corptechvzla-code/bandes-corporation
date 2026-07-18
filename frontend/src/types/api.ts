export interface Client {
  id: string;
  rif: string;
  name: string;
  contactInfo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Process {
  id: string;
  name: string;
  clientId: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  client?: Client;
  lots?: Lot[];
}

export interface Lot {
  id: string;
  name: string;
  processId: string;
  operator?: string;
  castingTemp?: number;
  moldCode?: string;
  recovered?: number | null;
  recoveryAt?: string | null;
  createdAt: string;
  updatedAt: string;
  process?: Process;
  bars?: Bar[];
  availableWeight?: number;
  barCount?: number;
}

export interface Bar {
  id: string;
  barNumber: string;
  grossWeight: number;
  purity: number;
  fineWeight: number;
  leyAg?: number | null;
  fineWeightAg?: number | null;
  status: 'IN_STOCK' | 'PROCESANDO' | 'COMPLETADO' | 'EXITED';
  createdAt: string;
  updatedAt: string;
  clientId: string;
  exitDetailId?: string | null;
  lotId?: string | null;
  client?: { id: string; name: string };
}

export interface MaterialExit {
  id: string;
  destination: string;
  totalWeight: number;
  createdAt: string;
  exitDetails: ExitDetail[];
}

export interface ExitDetail {
  id: string;
  weightAported: number;
  exitId: string;
  lotId: string;
  lot?: Lot & { process: Process & { client: Client } };
  bars?: { id: string; barNumber: string; fineWeight?: number }[];
}

export interface BalanceResponse {
  clientId: string;
  clientName: string;
  totalReceived: number;
  totalExited: number;
  inStock: number;
  currentBalance: number;
}

export interface AvailableLot {
  id: string;
  name: string;
  availableWeight: number;
  barCount: number;
}

export interface AvailableLotsResponse {
  id: string;
  name: string;
  status: 'CLOSED';
  clientId: string;
  lots: AvailableLot[];
}

export interface CreateMaterialExitRequest {
  destination: string;
  lotIds: string[];
}

export interface CreateBarRequest {
  barNumber: string;
  grossWeight: number;
  purity: number;
  clientId: string;
  leyAg?: number;
}

export interface UpdateBarRequest {
  lotId?: string | null;
  status?: 'IN_STOCK' | 'PROCESANDO' | 'COMPLETADO' | 'EXITED';
}

export interface CreateProcessRequest {
  name: string;
  clientId: string;
}

export interface UpdateProcessRequest {
  name?: string;
  status?: 'OPEN' | 'CLOSED';
}

export interface CreateLotRequest {
  name: string;
  processId: string;
  operator?: string;
  castingTemp?: number;
  moldCode?: string;
}

export interface UpdateLotRequest {
  name?: string;
  operator?: string;
  castingTemp?: number;
  moldCode?: string;
  recovered?: number | null;
  recoveryAt?: string | null;
}

export interface CreateClientRequest {
  rif: string;
  name: string;
  contactInfo?: string;
}

export interface BulkUploadResult {
  created: number;
  skipped: number;
  errors: { row: number; message: string }[];
}
