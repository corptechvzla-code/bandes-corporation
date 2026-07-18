import React, { createContext, useContext, useState, useEffect } from 'react';
import { Supplier, GoldBar, CastingLot, Transaction } from '../types';

interface GoldTraceabilityContextType {
  suppliers: Supplier[];
  goldBars: GoldBar[];
  castingLots: CastingLot[];
  transactions: Transaction[];
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  addGoldBar: (bar: Omit<GoldBar, 'analytical' | 'expected' | 'analyticalAg' | 'status' | 'available' | 'processId' | 'egresadoG' | 'egresoId' | 'createdAt' | 'recovered'>) => { success: boolean; error?: string };
  addGoldBarsBulk: (bars: Omit<GoldBar, 'analytical' | 'expected' | 'analyticalAg' | 'status' | 'available' | 'processId' | 'egresadoG' | 'egresoId' | 'createdAt' | 'recovered'>[]) => { success: boolean; addedCount: number; error?: string };
  deleteGoldBar: (code: string) => void;
  createCastingLot: (barCodes: string[], moldCode: string, operator: string) => { success: boolean; lotId?: string; error?: string };
  completeCastingLot: (lotId: string, recoveredWeight: number) => { success: boolean; error?: string };
  createEgreso: (clientId: string, selectedLotIds: string[], reference: string, customWeights?: Record<string, number>) => { success: boolean; error?: string };
  resetData: () => void;
}

const GoldTraceabilityContext = createContext<GoldTraceabilityContextType | undefined>(undefined);

const INITIAL_SUPPLIERS: Supplier[] = [
  { id: 'SUP-01', name: 'Inversiones Auríferas El Callao', code: 'IAC', location: 'Bolívar, El Callao', status: 'ACTIVE' },
  { id: 'SUP-02', name: 'Minera Gold & Silver S.A.', code: 'MGS', location: 'Antioquia, Segovia', status: 'ACTIVE' },
  { id: 'SUP-03', name: 'Consorcio Metalúrgico Bolívar', code: 'CMB', location: 'Ciudad Guayana', status: 'ACTIVE' },
  { id: 'SUP-04', name: 'Metales Nobles del Sur', code: 'MNS', location: 'Arequipa, Chala', status: 'ACTIVE' },
  { id: 'SUP-05', name: 'Corporación Aurífera Caroní', code: 'CAC', location: 'Upata, Bolívar', status: 'ACTIVE' },
  { id: 'SUP-06', name: 'Centro de Fundición Andino', code: 'CFA', location: 'Mérida, Andes', status: 'ACTIVE' },
  { id: 'SUP-07', name: 'Auríferos de Yuruari', code: 'ADY', location: 'El Callao, Bolívar', status: 'ACTIVE' },
  { id: 'SUP-08', name: 'Preciosos de Guayana', code: 'PDG', location: 'Sifontes, Tumeremo', status: 'ACTIVE' },
];

const INITIAL_GOLD_BARS: GoldBar[] = [
  // AVAILABLE (INGRESADOS)
  {
    code: 'BAR-IAC-9402',
    supplierId: 'SUP-01',
    grossWeight: 3500,
    ley: 913,
    analytical: 3195.5,
    expected: 3163.55,
    recovered: null,
    leyAg: 42,
    analyticalAg: 147,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-15T14:30:00Z',
  },
  {
    code: 'BAR-IAC-1123',
    supplierId: 'SUP-01',
    grossWeight: 4200,
    ley: 880,
    analytical: 3696,
    expected: 3659.04,
    recovered: null,
    leyAg: 55,
    analyticalAg: 231,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-15T14:35:00Z',
  },
  {
    code: 'BAR-CAC-2301',
    supplierId: 'SUP-05',
    grossWeight: 25100, // triggers weight limit warning (> 24,900g)
    ley: 920,
    analytical: 23092,
    expected: 22861.08,
    recovered: null,
    leyAg: 30,
    analyticalAg: 753,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T09:12:00Z',
  },
  {
    code: 'BAR-CMB-8091',
    supplierId: 'SUP-03',
    grossWeight: 1200,
    ley: 840, // triggers purity/weight warning (< 850 ley and > 1000g)
    analytical: 1008,
    expected: 997.92,
    recovered: null,
    leyAg: 65,
    analyticalAg: 78,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T10:05:00Z',
  },
  {
    code: 'BAR-RAO-1001',
    supplierId: 'SUP-06',
    grossWeight: 5400,
    ley: 910,
    analytical: 4914.0,
    expected: 4864.86,
    recovered: null,
    leyAg: 45,
    analyticalAg: 243,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T07:15:00Z',
  },
  {
    code: 'BAR-RAO-1002',
    supplierId: 'SUP-06',
    grossWeight: 6200,
    ley: 935,
    analytical: 5797.0,
    expected: 5739.03,
    recovered: null,
    leyAg: 38,
    analyticalAg: 235.6,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T07:15:00Z',
  },
  {
    code: 'BAR-ADY-3041',
    supplierId: 'SUP-07',
    grossWeight: 9100,
    ley: 890,
    analytical: 8099.0,
    expected: 8018.01,
    recovered: null,
    leyAg: 52,
    analyticalAg: 473.2,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T08:00:00Z',
  },
  {
    code: 'BAR-ADY-3042',
    supplierId: 'SUP-07',
    grossWeight: 10400,
    ley: 902,
    analytical: 9380.8,
    expected: 9286.99,
    recovered: null,
    leyAg: 48,
    analyticalAg: 499.2,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T08:00:00Z',
  },
  {
    code: 'BAR-PDG-5511',
    supplierId: 'SUP-08',
    grossWeight: 15400,
    ley: 940,
    analytical: 14476.0,
    expected: 14331.24,
    recovered: null,
    leyAg: 30,
    analyticalAg: 462,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T09:40:00Z',
  },
  {
    code: 'BAR-PDG-5512',
    supplierId: 'SUP-08',
    grossWeight: 12100,
    ley: 928,
    analytical: 11228.8,
    expected: 11116.51,
    recovered: null,
    leyAg: 32,
    analyticalAg: 387.2,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T09:40:00Z',
  },
  {
    code: 'BAR-IAC-5501',
    supplierId: 'SUP-01',
    grossWeight: 8900,
    ley: 900,
    analytical: 8010,
    expected: 7929.9,
    recovered: null,
    leyAg: 45,
    analyticalAg: 400.5,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T10:00:00Z',
  },
  {
    code: 'BAR-MGS-9901',
    supplierId: 'SUP-02',
    grossWeight: 14200,
    ley: 915,
    analytical: 12993,
    expected: 12863.07,
    recovered: null,
    leyAg: 40,
    analyticalAg: 568,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T10:10:00Z',
  },
  {
    code: 'BAR-CAC-7701',
    supplierId: 'SUP-05',
    grossWeight: 11100,
    ley: 912,
    analytical: 10123.2,
    expected: 10021.97,
    recovered: null,
    leyAg: 35,
    analyticalAg: 388.5,
    available: true,
    status: 'INGRESADO',
    processId: null,
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-16T10:20:00Z',
  },
  // IN CASTING PROCESS (PROCESANDO) - LOT-101
  {
    code: 'BAR-MGS-7761',
    supplierId: 'SUP-02',
    grossWeight: 12500,
    ley: 925,
    analytical: 11562.5,
    expected: 11446.88,
    recovered: null,
    leyAg: 30,
    analyticalAg: 375,
    available: false,
    status: 'PROCESANDO',
    processId: 'LOT-101',
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-14T08:15:00Z',
  },
  {
    code: 'BAR-MGS-8291',
    supplierId: 'SUP-02',
    grossWeight: 11000,
    ley: 890,
    analytical: 9790,
    expected: 9692.1,
    recovered: null,
    leyAg: 40,
    analyticalAg: 440,
    available: false,
    status: 'PROCESANDO',
    processId: 'LOT-101',
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-14T08:20:00Z',
  },
  // COMPLETED PROCESS (COMPLETADOS, DISPONIBLES PARA EGRESO) - LOT-102
  {
    code: 'BAR-CMB-4829',
    supplierId: 'SUP-03',
    grossWeight: 1800,
    ley: 840,
    analytical: 1512,
    expected: 1496.88,
    recovered: 1610.2, // portion of recovered gold attributed
    leyAg: 70,
    analyticalAg: 126,
    available: false,
    status: 'COMPLETADO',
    processId: 'LOT-102',
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-14T10:00:00Z',
  },
  {
    code: 'BAR-CMB-5021',
    supplierId: 'SUP-03',
    grossWeight: 2500,
    ley: 950,
    analytical: 2375,
    expected: 2351.25,
    recovered: 2530.3, // portion of recovered gold attributed
    leyAg: 20,
    analyticalAg: 50,
    available: false,
    status: 'COMPLETADO',
    processId: 'LOT-102',
    egresadoG: 0,
    egresoId: null,
    createdAt: '2026-07-14T10:05:00Z',
  },
  // EGRESADOS - LOT-103
  {
    code: 'BAR-MNS-2091',
    supplierId: 'SUP-04',
    grossWeight: 6200,
    ley: 995,
    analytical: 6169,
    expected: 6107.31,
    recovered: 6112.2,
    leyAg: 2,
    analyticalAg: 12.4,
    available: false,
    status: 'EGRESADO',
    processId: 'LOT-103',
    egresadoG: 6112.2,
    egresoId: 'TX-401',
    createdAt: '2026-07-13T11:00:00Z',
  }
];

const INITIAL_LOTS: CastingLot[] = [
  {
    id: 'LOT-101',
    code: 'LOTE-MGS-308',
    barCodes: ['BAR-MGS-7761', 'BAR-MGS-8291'],
    createdAt: '2026-07-15T10:00:00Z',
    status: 'FUNDICION',
    grossWeightTotal: 23500,
    analyticalTotal: 21352.5,
    expectedTotal: 21138.98,
    recovered: null,
    operator: 'Ing. Carlos Mendoza',
    castingTemp: 1085,
    moldCode: 'CRISOL-04',
  },
  {
    id: 'LOT-102',
    code: 'LOTE-CMB-309',
    barCodes: ['BAR-CMB-4829', 'BAR-CMB-5021'],
    createdAt: '2026-07-15T15:30:00Z',
    status: 'COMPLETADO',
    grossWeightTotal: 4300,
    analyticalTotal: 3887,
    expectedTotal: 3848.13,
    recovered: 4140.5, // 4,140.5g of pure gold recovered
    operator: 'Ing. Sofía Vergara',
    castingTemp: 1072,
    moldCode: 'CRISOL-07',
  },
  {
    id: 'LOT-103',
    code: 'LOTE-MNS-310',
    barCodes: ['BAR-MNS-2091'],
    createdAt: '2026-07-14T09:40:00Z',
    status: 'COMPLETADO',
    grossWeightTotal: 6200,
    analyticalTotal: 6169,
    expectedTotal: 6107.31,
    recovered: 6112.2,
    operator: 'Ing. Carlos Mendoza',
    castingTemp: 1090,
    moldCode: 'CRISOL-01',
  }
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-301',
    type: 'IN',
    clientName: 'Inversiones Auríferas El Callao',
    clientId: 'SUP-01',
    weight: 7700,
    barsCount: 2,
    barCodes: ['BAR-IAC-9402', 'BAR-IAC-1123'],
    date: '2026-07-15T14:35:00Z',
    reference: 'REF-IN-940',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-302',
    type: 'IN',
    clientName: 'Minera Gold & Silver S.A.',
    clientId: 'SUP-02',
    weight: 23500,
    barsCount: 2,
    barCodes: ['BAR-MGS-7761', 'BAR-MGS-8291'],
    date: '2026-07-14T08:20:00Z',
    reference: 'REF-IN-512',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-303',
    type: 'IN',
    clientName: 'Consorcio Metalúrgico Bolívar',
    clientId: 'SUP-03',
    weight: 4300,
    barsCount: 2,
    barCodes: ['BAR-CMB-4829', 'BAR-CMB-5021'],
    date: '2026-07-14T10:05:00Z',
    reference: 'REF-IN-109',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-304',
    type: 'IN',
    clientName: 'Centro de Fundición Andino',
    clientId: 'SUP-06',
    weight: 11600,
    barsCount: 2,
    barCodes: ['BAR-RAO-1001', 'BAR-RAO-1002'],
    date: '2026-07-16T07:15:00Z',
    reference: 'REF-IN-702',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-305',
    type: 'IN',
    clientName: 'Auríferos de Yuruari',
    clientId: 'SUP-07',
    weight: 19500,
    barsCount: 2,
    barCodes: ['BAR-ADY-3041', 'BAR-ADY-3042'],
    date: '2026-07-16T08:00:00Z',
    reference: 'REF-IN-703',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-306',
    type: 'IN',
    clientName: 'Preciosos de Guayana',
    clientId: 'SUP-08',
    weight: 27500,
    barsCount: 2,
    barCodes: ['BAR-PDG-5511', 'BAR-PDG-5512'],
    date: '2026-07-16T09:40:00Z',
    reference: 'REF-IN-704',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-401',
    type: 'OUT',
    clientName: 'Metales Nobles del Sur',
    clientId: 'SUP-04',
    weight: 6112.2,
    barsCount: 1,
    barCodes: ['BAR-MNS-2091'],
    lotIds: ['LOT-103'],
    date: '2026-07-16T08:30:00Z',
    reference: 'REF-OUT-401',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-402',
    type: 'OUT',
    clientName: 'Inversiones Auríferas El Callao',
    clientId: 'SUP-01',
    weight: 8500.0,
    barsCount: 1,
    barCodes: ['BAR-IAC-5501'],
    lotIds: [],
    date: '2026-07-16T09:00:00Z',
    reference: 'REF-OUT-402',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-403',
    type: 'OUT',
    clientName: 'Minera Gold & Silver S.A.',
    clientId: 'SUP-02',
    weight: 12000.0,
    barsCount: 0,
    barCodes: [],
    lotIds: [],
    date: '2026-07-16T09:15:00Z',
    reference: 'REF-OUT-403',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-404',
    type: 'OUT',
    clientName: 'Corporación Aurífera Caroní',
    clientId: 'SUP-05',
    weight: 15000.0,
    barsCount: 0,
    barCodes: [],
    lotIds: [],
    date: '2026-07-16T09:45:00Z',
    reference: 'REF-OUT-404',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-405',
    type: 'OUT',
    clientName: 'Centro de Fundición Andino',
    clientId: 'SUP-06',
    weight: 6000.0,
    barsCount: 0,
    barCodes: [],
    lotIds: [],
    date: '2026-07-16T10:10:00Z',
    reference: 'REF-OUT-405',
    status: 'CONFIRMADO',
  },
  {
    id: 'TX-406',
    type: 'OUT',
    clientName: 'Auríferos de Yuruari',
    clientId: 'SUP-07',
    weight: 9000.0,
    barsCount: 0,
    barCodes: [],
    lotIds: [],
    date: '2026-07-16T10:20:00Z',
    reference: 'REF-OUT-406',
    status: 'CONFIRMADO',
  }
];

export const GoldTraceabilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    if (typeof window === 'undefined') return INITIAL_SUPPLIERS;
    const version = localStorage.getItem('bandes_version_v4');
    if (version !== 'v4') {
      localStorage.setItem('bandes_version_v4', 'v4');
      localStorage.setItem('bandes_suppliers', JSON.stringify(INITIAL_SUPPLIERS));
      localStorage.setItem('bandes_gold_bars', JSON.stringify(INITIAL_GOLD_BARS));
      localStorage.setItem('bandes_casting_lots', JSON.stringify(INITIAL_LOTS));
      localStorage.setItem('bandes_transactions', JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_SUPPLIERS;
    }
    const saved = localStorage.getItem('bandes_suppliers');
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  const [goldBars, setGoldBars] = useState<GoldBar[]>(() => {
    if (typeof window === 'undefined') return INITIAL_GOLD_BARS;
    const saved = localStorage.getItem('bandes_gold_bars');
    return saved ? JSON.parse(saved) : INITIAL_GOLD_BARS;
  });

  const [castingLots, setCastingLots] = useState<CastingLot[]>(() => {
    if (typeof window === 'undefined') return INITIAL_LOTS;
    const saved = localStorage.getItem('bandes_casting_lots');
    return saved ? JSON.parse(saved) : INITIAL_LOTS;
  });

  const [transactions, setTransactions] = useState<Transaction[]>(() => {
    if (typeof window === 'undefined') return INITIAL_TRANSACTIONS;
    const saved = localStorage.getItem('bandes_transactions');
    return saved ? JSON.parse(saved) : INITIAL_TRANSACTIONS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('bandes_suppliers', JSON.stringify(suppliers));
  }, [suppliers]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('bandes_gold_bars', JSON.stringify(goldBars));
  }, [goldBars]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('bandes_casting_lots', JSON.stringify(castingLots));
  }, [castingLots]);

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('bandes_transactions', JSON.stringify(transactions));
  }, [transactions]);

  const addSupplier = (supplierData: Omit<Supplier, 'id'>) => {
    const newId = `SUP-${String(suppliers.length + 1).padStart(2, '0')}`;
    const newSupplier: Supplier = {
      ...supplierData,
      id: newId,
    };
    setSuppliers((prev) => [...prev, newSupplier]);
  };

  const addGoldBar = (barData: Omit<GoldBar, 'analytical' | 'expected' | 'analyticalAg' | 'status' | 'available' | 'processId' | 'egresadoG' | 'egresoId' | 'createdAt' | 'recovered'>) => {
    // Check if code is unique (case insensitive)
    const upperCode = barData.code.toUpperCase();
    if (goldBars.some((b) => b.code.toUpperCase() === upperCode)) {
      return { success: false, error: `El código de barra "${upperCode}" ya existe.` };
    }

    const FA = barData.grossWeight * (barData.ley / 1000);
    const FE = FA * 0.99;
    const FinoAg = barData.grossWeight * ((barData.leyAg || 0) / 1000);

    const newBar: GoldBar = {
      ...barData,
      code: upperCode,
      analytical: Number(FA.toFixed(2)),
      expected: Number(FE.toFixed(2)),
      analyticalAg: Number(FinoAg.toFixed(2)),
      recovered: null,
      available: true,
      status: 'INGRESADO',
      processId: null,
      egresadoG: 0,
      egresoId: null,
      createdAt: new Date().toISOString(),
    };

    setGoldBars((prev) => [newBar, ...prev]);

    // Automatically record an IN transaction for this ingot
    const supplier = suppliers.find((s) => s.id === barData.supplierId);
    const newTx: Transaction = {
      id: `TX-${Date.now()}`,
      type: 'IN',
      clientName: supplier ? supplier.name : 'Client Desconocido',
      clientId: barData.supplierId,
      weight: barData.grossWeight,
      barsCount: 1,
      barCodes: [upperCode],
      date: new Date().toISOString(),
      reference: `AUT-IN-${upperCode.split('-').pop() || 'TX'}`,
      status: 'CONFIRMADO',
    };

    setTransactions((prev) => [newTx, ...prev]);

    return { success: true };
  };

  const addGoldBarsBulk = (barsData: Omit<GoldBar, 'analytical' | 'expected' | 'analyticalAg' | 'status' | 'available' | 'processId' | 'egresadoG' | 'egresoId' | 'createdAt' | 'recovered'>[]) => {
    const added: GoldBar[] = [];
    const duplicates: string[] = [];

    // Filter duplicates first
    barsData.forEach((barData) => {
      const upperCode = barData.code.toUpperCase();
      if (
        goldBars.some((b) => b.code.toUpperCase() === upperCode) ||
        added.some((b) => b.code === upperCode)
      ) {
        duplicates.push(upperCode);
      } else {
        const FA = barData.grossWeight * (barData.ley / 1000);
        const FE = FA * 0.99;
        const FinoAg = barData.grossWeight * ((barData.leyAg || 0) / 1000);

        added.push({
          ...barData,
          code: upperCode,
          analytical: Number(FA.toFixed(2)),
          expected: Number(FE.toFixed(2)),
          analyticalAg: Number(FinoAg.toFixed(2)),
          recovered: null,
          available: true,
          status: 'INGRESADO',
          processId: null,
          egresadoG: 0,
          egresoId: null,
          createdAt: new Date().toISOString(),
        });
      }
    });

    if (added.length === 0) {
      return { success: false, addedCount: 0, error: 'Todos los códigos de barra del lote ya existen o están duplicados.' };
    }

    setGoldBars((prev) => [...added, ...prev]);

    // Create a aggregated IN transaction for this bulk load grouped by supplier
    const supplierId = added[0].supplierId;
    const supplier = suppliers.find((s) => s.id === supplierId);
    const totalWeight = added.reduce((sum, b) => sum + b.grossWeight, 0);

    const bulkTx: Transaction = {
      id: `TX-${Date.now()}`,
      type: 'IN',
      clientName: supplier ? supplier.name : 'Cliente Desconocido',
      clientId: supplierId,
      weight: Number(totalWeight.toFixed(2)),
      barsCount: added.length,
      barCodes: added.map((b) => b.code),
      date: new Date().toISOString(),
      reference: `BULK-IN-${added.length}`,
      status: 'CONFIRMADO',
    };

    setTransactions((prev) => [bulkTx, ...prev]);

    return {
      success: true,
      addedCount: added.length,
      error: duplicates.length > 0 ? `Se saltaron ${duplicates.length} códigos duplicados: ${duplicates.join(', ')}` : undefined,
    };
  };

  const deleteGoldBar = (code: string) => {
    setGoldBars((prev) => prev.filter((b) => b.code !== code));
    // Also remove any references in casting lots
    setCastingLots((prev) =>
      prev.map((lot) => {
        if (lot.barCodes.includes(code)) {
          const updatedBars = lot.barCodes.filter((c) => c !== code);
          // Recalculate totals
          const remainingBarsData = goldBars.filter((b) => updatedBars.includes(b.code));
          const grossWeightTotal = remainingBarsData.reduce((sum, b) => sum + b.grossWeight, 0);
          const analyticalTotal = remainingBarsData.reduce((sum, b) => sum + b.analytical, 0);
          const expectedTotal = remainingBarsData.reduce((sum, b) => sum + b.expected, 0);
          return {
            ...lot,
            barCodes: updatedBars,
            grossWeightTotal,
            analyticalTotal,
            expectedTotal,
          };
        }
        return lot;
      })
    );
  };

  const createCastingLot = (barCodes: string[], moldCode: string, operator: string) => {
    if (barCodes.length === 0) {
      return { success: false, error: 'Debe seleccionar al menos una barra de oro.' };
    }

    // Check if all selected bars are available
    const selectedBars = goldBars.filter((b) => barCodes.includes(b.code));
    const unavailableBars = selectedBars.filter((b) => !b.available);
    if (unavailableBars.length > 0) {
      return {
        success: false,
        error: `Las siguientes barras ya no están disponibles: ${unavailableBars.map((b) => b.code).join(', ')}`,
      };
    }

    const lotId = `LOT-${Date.now()}`;
    const lotCode = `LOTE-${moldCode.toUpperCase()}-${String(castingLots.length + 101)}`;

    const grossWeightTotal = selectedBars.reduce((sum, b) => sum + b.grossWeight, 0);
    const analyticalTotal = selectedBars.reduce((sum, b) => sum + b.analytical, 0);
    const expectedTotal = selectedBars.reduce((sum, b) => sum + b.expected, 0);

    const newLot: CastingLot = {
      id: lotId,
      code: lotCode,
      barCodes,
      createdAt: new Date().toISOString(),
      status: 'FUNDICION',
      grossWeightTotal: Number(grossWeightTotal.toFixed(2)),
      analyticalTotal: Number(analyticalTotal.toFixed(2)),
      expectedTotal: Number(expectedTotal.toFixed(2)),
      recovered: null,
      operator,
      castingTemp: 1064 + Math.floor(Math.random() * 40), // around melting point of gold 1064 Celsius
      moldCode: moldCode.toUpperCase(),
    };

    // Update gold bars status to 'PROCESANDO' and set available = false, processId = lotId
    setGoldBars((prev) =>
      prev.map((b) => {
        if (barCodes.includes(b.code)) {
          return {
            ...b,
            available: false,
            status: 'PROCESANDO',
            processId: lotId,
          };
        }
        return b;
      })
    );

    setCastingLots((prev) => [newLot, ...prev]);

    return { success: true, lotId };
  };

  const completeCastingLot = (lotId: string, recoveredWeight: number) => {
    const lot = castingLots.find((l) => l.id === lotId);
    if (!lot) {
      return { success: false, error: 'No se encontró el lote de fundición.' };
    }

    // Update lot status and recovered weight
    setCastingLots((prev) =>
      prev.map((l) => {
        if (l.id === lotId) {
          return {
            ...l,
            status: 'COMPLETADO',
            recovered: recoveredWeight,
          };
        }
        return l;
      })
    );

    // Distribute the recovered weight proportionally to each bar of this lot (for traceability reports)
    // Formula: bar's proportion of FA * recoveredWeight
    const barsInLot = goldBars.filter((b) => lot.barCodes.includes(b.code));
    const totalAnalytical = lot.analyticalTotal || 1;

    setGoldBars((prev) =>
      prev.map((b) => {
        if (lot.barCodes.includes(b.code)) {
          const proportion = b.analytical / totalAnalytical;
          const barRecovered = proportion * recoveredWeight;

          return {
            ...b,
            status: 'COMPLETADO',
            recovered: Number(barRecovered.toFixed(2)),
          };
        }
        return b;
      })
    );

    return { success: true };
  };

  const createEgreso = (clientId: string, selectedLotIds: string[], reference: string, customWeights?: Record<string, number>) => {
    if (selectedLotIds.length === 0) {
      return { success: false, error: 'Debe seleccionar al menos un lote para egresar.' };
    }

    const client = suppliers.find((s) => s.id === clientId);
    if (!client) {
      return { success: false, error: 'Cliente no válido.' };
    }

    // Generate a unique egreso ID for this transaction session to avoid collisions
    const uniqueTxId = `TX-OUT-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

    // Find all bars linked to these completed lots that are ready for egress (recovered != null, and egresadoG < recovered)
    const lotsToEgress = castingLots.filter((l) => selectedLotIds.includes(l.id));
    const lotCodes = lotsToEgress.map((l) => l.code);

    let totalEgressedWeight = 0;
    const affectedBarCodes: string[] = [];

    // Update gold bars: set status to 'EGRESADO', update egresadoG and egresoId
    setGoldBars((prev) =>
      prev.map((b) => {
        if (b.processId && selectedLotIds.includes(b.processId) && b.status === 'COMPLETADO') {
          const recoveredVal = b.recovered || 0;
          const remainingToEgress = recoveredVal - b.egresadoG;

          // If customWeight is passed for this specific bar or we default to the entire remaining recovered weight
          // (Since egreso is usually "todo o nada", but we support custom weights)
          const weightToEgress = customWeights && customWeights[b.code] !== undefined
            ? Math.min(customWeights[b.code], remainingToEgress)
            : remainingToEgress;

          if (weightToEgress > 0) {
            totalEgressedWeight += weightToEgress;
            affectedBarCodes.push(b.code);

            const newEgresadoG = b.egresadoG + weightToEgress;
            const isFullyEgressed = Math.abs(newEgresadoG - recoveredVal) < 0.1 || newEgresadoG >= recoveredVal;

            return {
              ...b,
              egresadoG: Number(newEgresadoG.toFixed(2)),
              status: isFullyEgressed ? 'EGRESADO' : 'COMPLETADO',
              egresoId: uniqueTxId,
            } as GoldBar;
          }
        }
        return b;
      })
    );

    // Create a new OUT transaction
    const newTx: Transaction = {
      id: uniqueTxId,
      type: 'OUT',
      clientName: client.name,
      clientId: client.id,
      weight: Number(totalEgressedWeight.toFixed(2)),
      barsCount: affectedBarCodes.length,
      barCodes: affectedBarCodes,
      lotIds: selectedLotIds,
      date: new Date().toISOString(),
      reference,
      status: 'CONFIRMADO',
    };

    setTransactions((prev) => [newTx, ...prev]);

    return { success: true };
  };

  const resetData = () => {
    setSuppliers(INITIAL_SUPPLIERS);
    setGoldBars(INITIAL_GOLD_BARS);
    setCastingLots(INITIAL_LOTS);
    setTransactions(INITIAL_TRANSACTIONS);
    localStorage.removeItem('bandes_suppliers');
    localStorage.removeItem('bandes_gold_bars');
    localStorage.removeItem('bandes_casting_lots');
    localStorage.removeItem('bandes_transactions');
  };

  return (
    <GoldTraceabilityContext.Provider
      value={{
        suppliers,
        goldBars,
        castingLots,
        transactions,
        addSupplier,
        addGoldBar,
        addGoldBarsBulk,
        deleteGoldBar,
        createCastingLot,
        completeCastingLot,
        createEgreso,
        resetData,
      }}
    >
      {children}
    </GoldTraceabilityContext.Provider>
  );
};

export const useGoldTraceability = () => {
  const context = useContext(GoldTraceabilityContext);
  if (!context) {
    throw new Error('useGoldTraceability must be used within a GoldTraceabilityProvider');
  }
  return context;
};
