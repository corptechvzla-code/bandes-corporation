export interface Supplier {
  id: string;
  name: string;
  code: string;
  location?: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface GoldBar {
  code: string;
  supplierId: string;
  grossWeight: number; // in grams
  ley: number; // gold purity (out of 1000, e.g., 913 means 913/1000)
  analytical: number; // FA = grossWeight * (ley / 1000)
  expected: number; // FE = FA * 0.99
  recovered: number | null; // filled during casting process
  leyAg: number; // silver purity (out of 1000)
  analyticalAg: number; // Fino Ag = grossWeight * (leyAg / 1000)
  available: boolean; // true = ready to assign to batch, false = in process/completed
  status: 'POR_CONFIRMAR' | 'CONFIRMADO' | 'PROCESANDO' | 'COMPLETADO' | 'EGRESADO';
  verificationStatus: 'POR_VERIFICAR' | 'VERIFICADO';
  processId: string | null; // linked lot ID
  egresadoG: number; // amount of recovered gold that has been egressed (or full if all-or-nothing)
  egresoId: string | null; // reference to outgoing transaction
  createdAt: string;
}

export interface CastingLot {
  id: string;
  code: string;
  barCodes: string[]; // codes of the associated bars
  createdAt: string;
  status: 'FUNDICION' | 'ENFRIANDO' | 'COMPLETADO';
  grossWeightTotal: number;
  analyticalTotal: number;
  expectedTotal: number;
  recovered: number | null; // actual recovered pure gold (g)
  recoveredLey: number | null; // gold purity measured after casting (‰)
  recoveredLeyAg: number | null; // silver purity measured after casting (‰)
  operator: string;
  castingTemp: number; // in Celsius, e.g. 1064
  moldCode: string; // Mold ID, e.g., "MOLD-ALPHA"
}

export interface Transaction {
  id: string;
  type: 'IN' | 'OUT';
  clientName: string;
  clientId: string;
  weight: number; // total gross/recovered weight
  barsCount: number;
  barCodes: string[];
  lotIds?: string[];
  date: string;
  reference: string;
  status: 'CONFIRMADO';
}
