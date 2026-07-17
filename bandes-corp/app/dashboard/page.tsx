'use client';

import React, { useState, useMemo } from 'react';
import { useGoldTraceability } from '../../src/context/GoldTraceabilityContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Flame, 
  ClipboardList, 
  CheckCircle2, 
  TrendingUp, 
  Scale, 
  Clock, 
  ArrowUpRight, 
  Sparkles,
  RefreshCw,
  Coins,
  ArrowLeftRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface TreemapRect {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  value: number;
  item: any;
}

function computeTreemap(
  items: any[],
  x: number,
  y: number,
  w: number,
  h: number
): TreemapRect[] {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ id: items[0].id, x, y, w, h, value: items[0].value, item: items[0] }];
  }

  const total = items.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return [];

  let runningSum = 0;
  let splitIdx = 1;
  for (let i = 0; i < items.length - 1; i++) {
    runningSum += items[i].value;
    if (runningSum >= total / 2) {
      splitIdx = i + 1;
      break;
    }
  }

  const groupA = items.slice(0, splitIdx);
  const groupB = items.slice(splitIdx);

  const valA = groupA.reduce((sum, item) => sum + item.value, 0);
  const rects: TreemapRect[] = [];

  if (w >= h) {
    const wA = total > 0 ? (valA / total) * w : 0;
    rects.push(...computeTreemap(groupA, x, y, wA, h));
    rects.push(...computeTreemap(groupB, x + wA, y, w - wA, h));
  } else {
    const hA = total > 0 ? (valA / total) * h : 0;
    rects.push(...computeTreemap(groupA, x, y, w, hA));
    rects.push(...computeTreemap(groupB, x, y + hA, w, h - hA));
  }

  return rects;
}

function generateBarsLayout(
  items: any[],
  w: number,
  h: number
): TreemapRect[] {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  let currentX = 0;
  return items.map((item) => {
    const blockWidth = total > 0 ? (item.value / total) * w : 0;
    const x = currentX;
    currentX += blockWidth;
    return {
      id: item.id,
      x,
      y: 0,
      w: blockWidth,
      h,
      value: item.value,
      item,
    };
  });
}

export default function DashboardPage() {
  const { goldBars, castingLots, transactions, suppliers } = useGoldTraceability();
  const [hoveredSupplier, setHoveredSupplier] = useState<any | null>(null);
  const [hoveredClient, setHoveredClient] = useState<any | null>(null);
  const [supplierLayout, setSupplierLayout] = useState<'grid' | 'bars'>('grid');
  const [clientLayout, setClientLayout] = useState<'grid' | 'bars'>('grid');

  const activeLots = castingLots.filter(l => l.status === 'FUNDICION' || l.status === 'ENFRIANDO');
  const totalCastingLotsCount = activeLots.length;
  const currentMoltenWeight = activeLots.reduce((sum, l) => sum + l.grossWeightTotal, 0);

  const todayBars = goldBars.filter(b => b.status === 'INGRESADO');
  const todayBarsCount = todayBars.length;
  const todayBarsWeight = todayBars.reduce((sum, b) => sum + b.grossWeight, 0);

  const readyLots = castingLots.filter(l => l.status === 'COMPLETADO' && l.recovered !== null);
  const readyLotsAvailable = readyLots.filter(l => {
    const barsInLot = goldBars.filter(b => b.processId === l.id);
    const totalRecovered = barsInLot.reduce((sum, b) => sum + (b.recovered || 0), 0);
    const totalEgressed = barsInLot.reduce((sum, b) => sum + b.egresadoG, 0);
    return totalRecovered - totalEgressed > 1;
  });

  const readyEgressCount = readyLotsAvailable.length;
  const readyEgressWeight = readyLotsAvailable.reduce((sum, l) => {
    const barsInLot = goldBars.filter(b => b.processId === l.id);
    const totalRecovered = barsInLot.reduce((sum, b) => sum + (b.recovered || 0), 0);
    const totalEgressed = barsInLot.reduce((sum, b) => sum + b.egresadoG, 0);
    return sum + (totalRecovered - totalEgressed);
  }, 0);

  const supplierData = suppliers.map(sup => {
    const bars = goldBars.filter(b => b.supplierId === sup.id);
    const totalWeight = bars.reduce((sum, b) => sum + b.grossWeight, 0);
    const barsCount = bars.length;
    const avgLey = barsCount > 0 ? Math.round(bars.reduce((sum, b) => sum + b.ley, 0) / barsCount) : 0;
    return {
      id: sup.id,
      name: sup.name,
      code: sup.code,
      value: totalWeight,
      count: barsCount,
      avgLey
    };
  }).filter(s => s.value > 0).sort((a, b) => b.value - a.value);

  const clientData = suppliers.map(sup => {
    const txs = transactions.filter(t => t.type === 'OUT' && t.clientId === sup.id);
    const totalWeight = txs.reduce((sum, t) => sum + t.weight, 0);
    const shipCount = txs.length;
    return {
      id: sup.id,
      name: sup.name,
      code: sup.code,
      value: totalWeight,
      count: shipCount
    };
  }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

  const flowData = useMemo(() => {
    const days: Record<string, { date: string; dateShort: string; in: number; out: number }> = {};
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      const key = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      const day = d.toLocaleDateString();
      if (!days[day]) days[day] = { date: day, dateShort: key, in: 0, out: 0 };
      if (tx.type === 'IN') days[day].in += tx.weight;
      else days[day].out += tx.weight;
    });
    return Object.values(days)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-7);
  }, [transactions]);

  const renderSupplierTreemap = () => {
    if (supplierData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-52 text-[#8C8C8C] border border-dashed border-neutral-800/40 rounded-lg">
          <Coins className="w-8 h-8 text-[#D5B042]/30 mb-2 animate-pulse" />
          <span className="text-sm font-sans">No hay datos de ingresos registrados</span>
        </div>
      );
    }

    const width = 500;
    const height = 240;
    const totalValue = supplierData.reduce((sum, s) => sum + s.value, 0);

    const rects = supplierLayout === 'grid'
      ? computeTreemap(supplierData, 0, 0, width, height)
      : generateBarsLayout(supplierData, width, height);

    return (
      <div className="relative w-full h-[240px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full rounded-lg overflow-hidden">
          {rects.map((rect, idx) => {
            const item = rect.item;
            const isHovered = hoveredSupplier?.id === item.id;
            const colorGradId = `supplierGrad-${item.id}`;

            const colors = [
              { stop1: '#B4941E', stop2: '#7E6611' },
              { stop1: '#A65B17', stop2: '#733D0D' },
              { stop1: '#D4AF37', stop2: '#996515' },
              { stop1: '#AA7C11', stop2: '#5F4B11' },
              { stop1: '#B38B2D', stop2: '#73571A' },
              { stop1: '#C5A02B', stop2: '#7D6211' },
              { stop1: '#A17D23', stop2: '#674F11' },
              { stop1: '#8A6F1D', stop2: '#554211' }
            ];

            const colorSet = colors[idx % colors.length];

            const hasLey = rect.h > 65 && rect.w > 80;
            const hasGrams = rect.h > 45 && rect.w > 65;
            const hasCode = rect.h > 25 && rect.w > 35;

            const textX = rect.x + rect.w / 2;
            const textY = rect.y + rect.h / 2;

            return (
              <g 
                key={item.id}
                onMouseEnter={() => setHoveredSupplier(item)}
                onMouseLeave={() => setHoveredSupplier(null)}
                className="cursor-pointer transition-all duration-300"
              >
                <defs>
                  <linearGradient id={colorGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={colorSet.stop1} stopOpacity={isHovered ? 1.0 : 0.85} />
                    <stop offset="100%" stopColor={colorSet.stop2} stopOpacity={isHovered ? 0.95 : 0.7} />
                  </linearGradient>
                </defs>
                <rect
                  x={rect.x + 1.5}
                  y={rect.y + 1.5}
                  width={Math.max(rect.w - 3, 2)}
                  height={Math.max(rect.h - 3, 2)}
                  rx={6}
                  fill={`url(#${colorGradId})`}
                  stroke={isHovered ? '#D5B042' : 'transparent'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered ? 'drop-shadow(0 0 8px rgba(213,176,66,0.3))' : 'none'
                  }}
                />
                {hasCode && (
                  <text
                    x={textX}
                    y={hasGrams ? (hasLey ? textY - 12 : textY - 5) : textY + 4}
                    textAnchor="middle"
                    fill="#E5E5E5"
                    className="font-sans font-bold text-xs uppercase tracking-wider fill-current select-none pointer-events-none"
                  >
                    {item.code}
                  </text>
                )}
                {hasGrams && (
                  <text
                    x={textX}
                    y={hasLey ? textY + 6 : textY + 10}
                    textAnchor="middle"
                    fill="#D5B042"
                    className="font-mono text-[10px] font-bold select-none pointer-events-none"
                  >
                    {Math.round(item.value).toLocaleString()} g
                  </text>
                )}
                {hasLey && (
                  <text
                    x={textX}
                    y={textY + 22}
                    textAnchor="middle"
                    fill="#E5E5E5"
                    fillOpacity={0.8}
                    className="font-mono text-[9px] select-none pointer-events-none"
                  >
                    Ley {item.avgLey}‰
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {hoveredSupplier && (
            <motion.div
              key="supplier-tooltip"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className="absolute top-2 left-2 z-20 bg-[#1C1C1C] border-l-4 border-[#D5B042] border-y border-r border-neutral-800/40 p-3 rounded shadow-[0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-xs max-w-xs"
            >
              <h4 className="text-xs font-bold text-[#E5E5E5] tracking-wide uppercase">{hoveredSupplier.name}</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] font-mono">
                <span className="text-[#8C8C8C]">Total Ingresado:</span>
                <span className="text-[#D5B042] font-bold text-right">{(hoveredSupplier.value).toLocaleString()} g</span>
                <span className="text-[#8C8C8C]">Barras registradas:</span>
                <span className="text-[#E5E5E5] text-right">{hoveredSupplier.count} u</span>
                <span className="text-[#8C8C8C]">Ley Promedio:</span>
                <span className="text-[#B4941E] text-right">{hoveredSupplier.avgLey} Au‰</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderClientTreemap = () => {
    if (clientData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-52 text-[#8C8C8C] border border-dashed border-neutral-800/40 rounded-lg">
          <ArrowLeftRight className="w-8 h-8 text-[#A65B17]/30 mb-2 animate-pulse" />
          <span className="text-sm font-sans">No hay transacciones de egreso hoy</span>
        </div>
      );
    }

    const width = 500;
    const height = 240;
    const totalValue = clientData.reduce((sum, c) => sum + c.value, 0);

    const rects = clientLayout === 'grid'
      ? computeTreemap(clientData, 0, 0, width, height)
      : generateBarsLayout(clientData, width, height);

    return (
      <div className="relative w-full h-[240px]">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full rounded-lg overflow-hidden">
          {rects.map((rect, idx) => {
            const item = rect.item;
            const isHovered = hoveredClient?.id === item.id;
            const colorGradId = `clientGrad-${item.id}`;

            const colors = [
              { stop1: '#A65B17', stop2: '#733D0D' },
              { stop1: '#B36B15', stop2: '#804400' },
              { stop1: '#B57C1E', stop2: '#7A4F11' },
              { stop1: '#915312', stop2: '#5C3105' },
              { stop1: '#AC681C', stop2: '#6E3C09' },
              { stop1: '#C18536', stop2: '#7F521E' },
              { stop1: '#BD7623', stop2: '#78440E' }
            ];

            const colorSet = colors[idx % colors.length];

            const hasGrams = rect.h > 45 && rect.w > 65;
            const hasCode = rect.h > 25 && rect.w > 35;

            const textX = rect.x + rect.w / 2;
            const textY = rect.y + rect.h / 2;

            return (
              <g 
                key={item.id}
                onMouseEnter={() => setHoveredClient(item)}
                onMouseLeave={() => setHoveredClient(null)}
                className="cursor-pointer transition-all duration-300"
              >
                <defs>
                  <linearGradient id={colorGradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={colorSet.stop1} stopOpacity={isHovered ? 1.0 : 0.85} />
                    <stop offset="100%" stopColor={colorSet.stop2} stopOpacity={isHovered ? 0.95 : 0.7} />
                  </linearGradient>
                </defs>
                <rect
                  x={rect.x + 1.5}
                  y={rect.y + 1.5}
                  width={Math.max(rect.w - 3, 2)}
                  height={Math.max(rect.h - 3, 2)}
                  rx={6}
                  fill={`url(#${colorGradId})`}
                  stroke={isHovered ? '#A65B17' : 'transparent'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-300"
                  style={{
                    filter: isHovered ? 'drop-shadow(0 0 8px rgba(166,91,23,0.3))' : 'none'
                  }}
                />
                {hasCode && (
                  <text
                    x={textX}
                    y={hasGrams ? textY - 5 : textY + 4}
                    textAnchor="middle"
                    fill="#E5E5E5"
                    className="font-sans font-bold text-xs uppercase tracking-wider fill-current select-none pointer-events-none"
                  >
                    {item.code}
                  </text>
                )}
                {hasGrams && (
                  <text
                    x={textX}
                    y={textY + 10}
                    textAnchor="middle"
                    fill="#D5B042"
                    className="font-mono text-[10px] font-bold select-none pointer-events-none"
                  >
                    {Math.round(item.value).toLocaleString()} g
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        <AnimatePresence>
          {hoveredClient && (
            <motion.div
              key="client-tooltip"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.18 }}
              className="absolute top-2 left-2 z-20 bg-[#1C1C1C] border-l-4 border-[#A65B17] border-y border-r border-neutral-800/40 p-3 rounded shadow-[0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-xs max-w-xs"
            >
              <h4 className="text-xs font-bold text-[#E5E5E5] tracking-wide uppercase">{hoveredClient.name}</h4>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] font-mono">
                <span className="text-[#8C8C8C]">Total Despachado:</span>
                <span className="text-[#A65B17] font-bold text-right">{(hoveredClient.value).toLocaleString()} g</span>
                <span className="text-[#8C8C8C]">Operaciones:</span>
                <span className="text-[#E5E5E5] text-right">{hoveredClient.count} envíos</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="space-y-8"
    >
    
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <motion.div
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative group bg-[#1C1C1C] p-4.5 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#D5B042]/30"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#D5B042]/5 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-center mb-3">
            <div className="p-2 bg-black rounded-lg border border-[#D5B042]/20">
              <ClipboardList className="w-5 h-5 text-[#D5B042]" />
            </div>
            <span className="text-[9px] text-[#D5B042] font-mono tracking-wider flex items-center gap-1 bg-black px-1.5 py-0.5 rounded border border-[#D5B042]/20">
              <TrendingUp className="w-2.5 h-2.5" />
              REGISTRO
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10.5px] text-[#8C8C8C] block font-sans">Lotes/Barras Ingresadas Hoy</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-[#E5E5E5] tracking-tight">{todayBarsCount}</span>
              <span className="text-[10.5px] text-[#8C8C8C]">Unidades</span>
            </div>
            <p className="text-[10px] text-[#8C8C8C] font-mono flex items-center gap-1 pt-1.5 border-t border-neutral-800/20">
              <Scale className="w-3 h-3 text-[#D5B042]" />
              Peso Total Bruto: <strong className="text-[#E5E5E5]">{(todayBarsWeight / 1000).toFixed(2)} kg</strong>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative group bg-[#1C1C1C] p-4.5 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#A65B17]/30"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#A65B17]/5 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-center mb-3">
            <div className="p-2 bg-black rounded-lg border border-[#A65B17]/20">
              <Flame className="w-5 h-5 text-[#A65B17] animate-pulse" />
            </div>
            <span className="text-[9px] text-[#A65B17] font-mono tracking-wider flex items-center gap-1 bg-black px-1.5 py-0.5 rounded border border-[#A65B17]/20">
              <Clock className="w-2.5 h-2.5 animate-spin" style={{ animationDuration: '6s' }} />
              INCANDESCENCIA
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10.5px] text-[#8C8C8C] block font-sans">Lotes en Fundición / Moldes</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-[#E5E5E5] tracking-tight">{totalCastingLotsCount}</span>
              <span className="text-[10.5px] text-[#8C8C8C]">Procesos</span>
            </div>
            <p className="text-[10px] text-[#8C8C8C] font-mono flex items-center gap-1 pt-1.5 border-t border-neutral-800/20">
              <Sparkles className="w-3 h-3 text-[#A65B17]" />
              Masa en Crisol: <strong className="text-[#E5E5E5]">{(currentMoltenWeight / 1000).toFixed(2)} kg</strong>
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -80 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.28, duration: 0.55, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="relative group bg-[#1C1C1C] p-4.5 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-emerald-500/30"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-center mb-3">
            <div className="p-2 bg-black rounded-lg border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            </div>
            <span className="text-[9px] text-emerald-400 font-mono tracking-wider flex items-center gap-1 bg-black px-1.5 py-0.5 rounded border border-emerald-500/10">
              ✓ BOVEDA
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10.5px] text-[#8C8C8C] block font-sans">Fino Recuperado Disponible</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-[#E5E5E5] tracking-tight">{(readyEgressWeight / 1000).toFixed(3)}</span>
              <span className="text-[10.5px] text-[#8C8C8C]">kg Au</span>
            </div>
            <p className="text-[10px] text-[#8C8C8C] font-mono flex items-center gap-1 pt-1.5 border-t border-neutral-800/20">
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              Lotes Disponibles: <strong className="text-[#E5E5E5]">{readyEgressCount} lotes</strong>
            </p>
          </div>
        </motion.div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#D5B042]/30"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-sans font-semibold text-[#E5E5E5] text-base">Ingresos de Clientes (Proporción de Masa)</h3>
              <p className="text-[11px] text-[#8C8C8C] font-sans mt-0.5">Distribución de gramos brutos aportados por cada socio aurífero.</p>
            </div>
            <div className="flex bg-black border border-neutral-800/60 p-0.5 rounded-lg text-[10px] font-mono self-start md:self-auto">
              <button
                type="button"
                onClick={() => setSupplierLayout('grid')}
                className={`px-3 py-1 rounded-md transition-all duration-200 uppercase font-bold tracking-wider cursor-pointer
                  ${supplierLayout === 'grid' 
                    ? 'bg-[#D5B042]/10 text-[#D5B042] border border-[#D5B042]/20' 
                    : 'text-[#8C8C8C] hover:text-[#E5E5E5] border border-transparent'}`}
              >
                Cuadrícula
              </button>
              <button
                type="button"
                onClick={() => setSupplierLayout('bars')}
                className={`px-3 py-1 rounded-md transition-all duration-200 uppercase font-bold tracking-wider cursor-pointer
                  ${supplierLayout === 'bars' 
                    ? 'bg-[#D5B042]/10 text-[#D5B042] border border-[#D5B042]/20' 
                    : 'text-[#8C8C8C] hover:text-[#E5E5E5] border border-transparent'}`}
              >
                Barras
              </button>
            </div>
          </div>
          
          <div className="bg-black p-4 rounded-xl border border-neutral-800/40 flex items-center justify-center min-h-[250px]">
            {renderSupplierTreemap()}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
            {supplierData.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-1.5 text-[10px] font-mono text-[#8C8C8C]">
                <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: s.code === 'CAC' ? '#B4941E' : s.code === 'MGS' ? '#A65B17' : (idx === 0 ? '#B4941E' : '#A65B17') }}></span>
                <span>{s.code}: {Math.round(s.value / 1000)}kg ({Math.round(s.value / (supplierData.reduce((sum, x) => sum + x.value, 0) || 1) * 100)}%)</span>
              </div>
            ))}
          </div>
        </motion.div>
 
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#A65B17]/30"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-sans font-semibold text-[#E5E5E5] text-base">Egresos de Clientes (Pureza Recuperada)</h3>
              <p className="text-[11px] text-[#8C8C8C] font-sans mt-0.5">Distribución proporcional de material de salida despachado por cliente.</p>
            </div>
            <div className="flex bg-black border border-neutral-800/60 p-0.5 rounded-lg text-[10px] font-mono self-start md:self-auto">
              <button
                type="button"
                onClick={() => setClientLayout('grid')}
                className={`px-3 py-1 rounded-md transition-all duration-200 uppercase font-bold tracking-wider cursor-pointer
                  ${clientLayout === 'grid' 
                    ? 'bg-[#A65B17]/10 text-[#A65B17] border border-[#A65B17]/20' 
                    : 'text-[#8C8C8C] hover:text-[#E5E5E5] border border-transparent'}`}
              >
                Cuadrícula
              </button>
              <button
                type="button"
                onClick={() => setClientLayout('bars')}
                className={`px-3 py-1 rounded-md transition-all duration-200 uppercase font-bold tracking-wider cursor-pointer
                  ${clientLayout === 'bars' 
                    ? 'bg-[#A65B17]/10 text-[#A65B17] border border-[#A65B17]/20' 
                    : 'text-[#8C8C8C] hover:text-[#E5E5E5] border border-transparent'}`}
              >
                Barras
              </button>
            </div>
          </div>
 
          <div className="bg-black p-4 rounded-xl border border-neutral-800/40 flex items-center justify-center min-h-[250px]">
            {renderClientTreemap()}
          </div>
 
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
            {clientData.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-1.5 text-[10px] font-mono text-[#8C8C8C]">
                <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: c.code === 'CAC' ? '#B4941E' : c.code === 'MGS' ? '#A65B17' : (idx === 1 ? '#B4941E' : '#A65B17') }}></span>
                <span>{c.code}: {Math.round(c.value / 1000)}kg ({Math.round(c.value / (clientData.reduce((sum, x) => sum + x.value, 0) || 1) * 100)}%)</span>
              </div>
            ))}
          </div>
        </motion.div>

      </div>

      <motion.div
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#D5B042]/30"
      >
        <div className="flex items-center justify-between mb-4 border-b border-neutral-800/20 pb-3">
          <div>
            <h3 className="font-sans font-semibold text-[#E5E5E5] text-base">Últimos Flujos de Trazabilidad</h3>
            <p className="text-xs text-[#8C8C8C]">Ledger de operaciones recientes en el sistema.</p>
          </div>
          <span className="text-xs font-mono text-[#D5B042] px-2.5 py-1 bg-black rounded border border-neutral-800/40 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Tiempo Real
          </span>
        </div>

        <div className="overflow-x-auto">
          {flowData.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#8C8C8C] border border-dashed border-neutral-800/40 rounded-lg">
              <Coins className="w-8 h-8 text-[#D5B042]/30 mb-2 animate-pulse" />
              <span className="text-sm font-sans">No hay transacciones registradas</span>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={flowData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" vertical={false} />
                <XAxis
                  dataKey="dateShort"
                  stroke="#8C8C8C"
                  tick={{ fontSize: 10, fill: '#8C8C8C' }}
                  axisLine={{ stroke: '#2A2A2A' }}
                  tickLine={false}
                />
                <YAxis
                  stroke="#8C8C8C"
                  tick={{ fontSize: 10, fill: '#8C8C8C' }}
                  axisLine={{ stroke: '#2A2A2A' }}
                  tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}kg` : `${v}g`}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(180, 148, 30, 0.06)' }}
                  contentStyle={{
                    backgroundColor: '#1A1A1A',
                    border: '1px solid #B4941E',
                    borderRadius: 12,
                    boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                    padding: '10px 14px',
                  }}
                  labelStyle={{ color: '#D5B042', fontWeight: 700, fontSize: 12, marginBottom: 4 }}
                  itemStyle={{ fontSize: 11, color: '#E5E5E5' }}
                  formatter={(value: number, name: string) => [
                    `${value.toLocaleString(undefined, { minimumFractionDigits: 1 })} g`,
                    name === 'in' ? 'Ingresos (IN)' : 'Egresos (OUT)',
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: '#8C8C8C', paddingTop: 8 }}
                  formatter={(value: string) => value === 'in' ? 'Ingresos (IN)' : 'Egresos (OUT)'}
                />
                <Bar
                  dataKey="in"
                  name="in"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  maxBarSize={40}
                >
                  {flowData.map((_, idx) => (
                    <Cell key={`in-${idx}`} fill={`url(#greenGrad-${idx})`} />
                  ))}
                </Bar>
                <Bar
                  dataKey="out"
                  name="out"
                  radius={[4, 4, 0, 0]}
                  animationDuration={1000}
                  animationEasing="ease-out"
                  animationBegin={200}
                  maxBarSize={40}
                >
                  {flowData.map((_, idx) => (
                    <Cell key={`out-${idx}`} fill={`url(#bronzeGrad-${idx})`} />
                  ))}
                </Bar>
                <defs>
                  {flowData.map((_, idx) => (
                    <React.Fragment key={`grads-${idx}`}>
                      <linearGradient id={`greenGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#166534" stopOpacity={0.7} />
                      </linearGradient>
                      <linearGradient id={`bronzeGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D5B042" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#A65B17" stopOpacity={0.7} />
                      </linearGradient>
                    </React.Fragment>
                  ))}
                </defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>

    </motion.div>
  );
}
