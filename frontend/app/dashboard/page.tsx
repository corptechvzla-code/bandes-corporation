'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBars } from '@/hooks/useBars';
import { useMaterialExits } from '@/hooks/useExits';
import { useClients } from '@/hooks/useClients';
import { useLots } from '@/hooks/useLots';
import {
  Flame, ClipboardList, Clock, Scale, Coins, Sparkles, TrendingDown,
  ChevronDown, ChevronUp, Table2, ArrowUpRight
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface TreemapRect {
  id: string; x: number; y: number; w: number; h: number;
  value: number; item: any;
}

function computeTreemap(items: any[], x: number, y: number, w: number, h: number): TreemapRect[] {
  if (items.length <= 1) {
    return items.length === 1 ? [{ id: items[0].id, x, y, w, h, value: items[0].value, item: items[0] }] : [];
  }
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return [];
  let rs = 0, si = 1;
  for (let i = 0; i < items.length - 1; i++) { rs += items[i].value; if (rs >= total / 2) { si = i + 1; break; } }
  const a = items.slice(0, si), b = items.slice(si);
  const va = a.reduce((s, i) => s + i.value, 0);
  if (w >= h) {
    const wA = (va / total) * w;
    return [...computeTreemap(a, x, y, wA, h), ...computeTreemap(b, x + wA, y, w - wA, h)];
  } else {
    const hA = (va / total) * h;
    return [...computeTreemap(a, x, y, w, hA), ...computeTreemap(b, x, y + hA, w, h - hA)];
  }
}

function generateBarsLayout(items: any[], w: number, h: number): TreemapRect[] {
  const total = items.reduce((s, i) => s + i.value, 0);
  let cx = 0;
  return items.map(i => {
    const bw = (i.value / total) * w;
    const x = cx; cx += bw;
    return { id: i.id, x, y: 0, w: bw, h, value: i.value, item: i };
  });
}

export default function DashboardPage() {
  const { data: bars = [] } = useBars();
  const { data: clients = [] } = useClients();
  const { data: exits = [] } = useMaterialExits();
  const { data: lots = [] } = useLots();
  const [hoveredSupplier, setHoveredSupplier] = useState<any | null>(null);
  const [hoveredClient, setHoveredClient] = useState<any | null>(null);
  const [supplierLayout, setSupplierLayout] = useState<'grid' | 'bars'>('grid');
  const [clientLayout, setClientLayout] = useState<'grid' | 'bars'>('grid');
  const [showSupplierTable, setShowSupplierTable] = useState<boolean>(false);
  const [showClientTable, setShowClientTable] = useState<boolean>(false);

  // --- CÁLCULOS PARA LOS CONTADORES NUEVOS ---

  // 1. Oro Recibido (Todas las barras registradas)
  const totalReceivedWeight = bars.reduce((s, b) => s + Number(b.grossWeight), 0);
  const totalReceivedCount = bars.length;

  // 2. Oro Refundido (Suma recuperada de procesos con fundición)
  const totalRecovered = lots.filter(l => l.recovered != null).reduce((s, l) => s + Number(l.recovered), 0);
  const processedLotsCount = lots.filter(l => l.recovered != null).length;

  // 3. Oro en Espera por Proceso (Barras IN_STOCK en bóveda)
  const inStockBars = bars.filter(b => b.status === 'IN_STOCK');
  const inStockCount = inStockBars.length;
  const inStockWeight = inStockBars.reduce((s, b) => s + Number(b.grossWeight), 0);

  // 4. Merma
  const totalFA = bars.reduce((s, b) => s + Number(b.fineWeight), 0);
  const mermaG = Math.max(0, totalFA - totalRecovered);
  const mermaPct = totalFA > 0 ? (mermaG / totalFA) * 100 : 0;

  // Excedente de egresos (para mantener compatibilidad si se usa abajo)
  const exitedWeight = bars.filter(b => b.status === 'EXITED').reduce((s, b) => s + Number(b.fineWeight), 0);

  // --- FIN DE NUEVOS CÁLCULOS ---

  const supplierData = clients.map(c => {
    const cBars = bars.filter(b => b.clientId === c.id);
    const w = cBars.reduce((s, b) => s + Number(b.grossWeight), 0);
    const cnt = cBars.length;
    const avgP = cnt > 0 ? Math.round(cBars.reduce((s, b) => s + Number(b.purity), 0) / cnt) : 0;
    return { id: c.id, name: c.name, code: c.rif.slice(0, 5), value: w, count: cnt, avgPurity: avgP };
  }).filter(s => s.value > 0).sort((a, b) => b.value - a.value);

  const clientData = clients.map(c => {
    const cExits = exits.filter(e => e.exitDetails.some(d => d.lot?.process?.client?.id === c.id));
    const totalW = cExits.reduce((s, e) => s + Number(e.totalWeight), 0);
    return { id: c.id, name: c.name, code: c.rif.slice(0, 5), value: totalW, count: cExits.length };
  }).filter(c => c.value > 0).sort((a, b) => b.value - a.value);

  const flowData = useMemo(() => {
    const days: Record<string, { date: string; dateShort: string; in: number; out: number }> = {};
    bars.forEach(b => {
      const d = new Date(b.createdAt);
      const key = d.toISOString().split('T')[0];
      const short = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      if (!days[key]) days[key] = { date: key, dateShort: short, in: 0, out: 0 };
      days[key].in += Number(b.fineWeight);
    });
    exits.forEach(e => {
      const d = new Date(e.createdAt);
      const key = d.toISOString().split('T')[0];
      const short = d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
      if (!days[key]) days[key] = { date: key, dateShort: short, in: 0, out: 0 };
      days[key].out += Number(e.totalWeight);
    });
    return Object.values(days).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(-7);
  }, [bars, exits]);

  const colors = [
    { s1: '#B4941E', s2: '#7E6611' }, { s1: '#A65B17', s2: '#733D0D' },
    { s1: '#D4AF37', s2: '#996515' }, { s1: '#AA7C11', s2: '#5F4B11' },
    { s1: '#B38B2D', s2: '#73571A' }, { s1: '#C5A02B', s2: '#7D6211' },
    { s1: '#A17D23', s2: '#674F11' }, { s1: '#8A6F1D', s2: '#554211' },
  ];

  const renderTreemap = (data: any[], hovered: any, setHovered: any, colorsOffset: number) => {
    if (data.length === 0) return (
      <div className="flex flex-col items-center justify-center h-52 text-[#8C8C8C] border border-dashed border-neutral-800/40 rounded-lg">
        <Coins className="w-8 h-8 text-[#D5B042]/30 mb-2 animate-pulse" />
        <span className="text-sm font-sans">Sin datos</span>
      </div>
    );
    const w = 500, h = 240;
    const rects = (colorsOffset === 0 ? supplierLayout : clientLayout) === 'grid'
      ? computeTreemap(data, 0, 0, w, h) : generateBarsLayout(data, w, h);
    const isSupplier = colorsOffset === 0;
    return (
      <div className="relative w-full h-[240px]">
        <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full rounded-lg overflow-hidden">
          {rects.map((rect, idx) => {
            const item = rect.item;
            const isHov = hovered?.id === item.id;
            const cs = colors[(idx + colorsOffset) % colors.length];
            const gradId = `g-${item.id}`;
            const hasLey = rect.h > 65 && rect.w > 80;
            const hasGrams = rect.h > 45 && rect.w > 65;
            const hasCode = rect.h > 25 && rect.w > 35;
            const tx = rect.x + rect.w / 2, ty = rect.y + rect.h / 2;
            return (
              <g key={item.id} onMouseEnter={() => setHovered(item)} onMouseLeave={() => setHovered(null)}
                className="cursor-pointer transition-all duration-300">
                <defs>
                  <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={cs.s1} stopOpacity={isHov ? 1 : 0.85} />
                    <stop offset="100%" stopColor={cs.s2} stopOpacity={isHov ? 0.95 : 0.7} />
                  </linearGradient>
                </defs>
                <rect x={rect.x + 1.5} y={rect.y + 1.5} width={Math.max(rect.w - 3, 2)} height={Math.max(rect.h - 3, 2)}
                  rx={6} fill={`url(#${gradId})`} stroke={isHov ? (isSupplier ? '#D5B042' : '#A65B17') : 'transparent'}
                  strokeWidth={isHov ? 2 : 1} className="transition-all duration-300"
                  style={{ filter: isHov ? 'drop-shadow(0 0 8px rgba(213,176,66,0.3))' : 'none' }} />
                {hasCode && <text x={tx} y={hasGrams ? (hasLey ? ty - 12 : ty - 5) : ty + 4}
                  textAnchor="middle" fill="#E5E5E5"
                  className="font-sans font-bold text-xs uppercase tracking-wider fill-current select-none pointer-events-none">{item.code}</text>}
                {hasGrams && <text x={tx} y={hasLey ? ty + 6 : ty + 10} textAnchor="middle" fill="#D5B042"
                  className="font-mono text-[10px] font-bold select-none pointer-events-none">{Math.round(item.value).toLocaleString()} g</text>}
                {hasLey && isSupplier && <text x={tx} y={ty + 22} textAnchor="middle" fill="#E5E5E5" fillOpacity={0.8}
                  className="font-mono text-[9px] select-none pointer-events-none">Pureza {item.avgPurity}‰</text>}
              </g>
            );
          })}
        </svg>
        <AnimatePresence>{hovered && (
          <motion.div key="tip" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
            className={`absolute top-2 left-2 z-20 bg-[#161619] border-l-4 ${isSupplier ? 'border-[#D5B042]' : 'border-[#A65B17]'} border-y border-r border-neutral-800/40 p-3 rounded shadow-[0_4px_12px_rgba(0,0,0,0.6)] backdrop-blur-xs max-w-xs`}>
            <h4 className="text-xs font-bold text-[#E5E5E5] tracking-wide uppercase">{hovered.name}</h4>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2 text-[11px] font-mono">
              <span className="text-[#8C8C8C]">{isSupplier ? 'Total Ingresado:' : 'Total Despachado:'}</span>
              <span className="text-[#D5B042] font-bold text-right">{Math.round(hovered.value).toLocaleString()} g</span>
              <span className="text-[#8C8C8C]">{isSupplier ? 'Barras:' : 'Operaciones:'}</span>
              <span className="text-[#E5E5E5] text-right">{hovered.count} {isSupplier ? 'u' : 'envíos'}</span>
            </div>
          </motion.div>
        )}</AnimatePresence>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }} className="space-y-8">
      
      {/* SECCIÓN DE CONTADORES ACTUALIZADOS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Tarjeta 1: Oro recibido */}
        <motion.div initial={{ opacity: 0, y: -80 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08, duration: 0.55 }}
          className="relative group bg-[#161619] p-4.5 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#D5B042]/30">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#D5B042]/5 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-center mb-3">
            <div className="p-2 bg-black rounded-lg border border-[#D5B042]/20"><ClipboardList className="w-5 h-5 text-[#D5B042]" /></div>
            <span className="text-[9px] text-[#D5B042] font-mono tracking-wider flex items-center gap-1 bg-black px-1.5 py-0.5 rounded border border-[#D5B042]/20">REGISTRO</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10.5px] text-[#8C8C8C] block font-sans">Oro recibido</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-[#E5E5E5] tracking-tight">{(totalReceivedWeight / 1000).toFixed(3)}</span>
              <span className="text-[10.5px] text-[#8C8C8C]">kg</span>
            </div>
            <p className="text-[10px] text-[#8C8C8C] font-mono flex items-center gap-1 pt-1.5 border-t border-neutral-800/20">
              <Scale className="w-3 h-3 text-[#D5B042]" />Barras totales: <strong className="text-[#E5E5E5]">{totalReceivedCount} u</strong>
            </p>
          </div>
        </motion.div>

        {/* Tarjeta 2: Oro refundido */}
        <motion.div initial={{ opacity: 0, y: -80 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18, duration: 0.55 }}
          className="relative group bg-[#161619] p-4.5 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#A65B17]/30">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#A65B17]/5 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-center mb-3">
            <div className="p-2 bg-black rounded-lg border border-[#A65B17]/20"><Flame className="w-5 h-5 text-[#A65B17] animate-pulse" /></div>
            <span className="text-[9px] text-[#A65B17] font-mono tracking-wider flex items-center gap-1 bg-black px-1.5 py-0.5 rounded border border-[#A65B17]/20">FUNDICIÓN</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10.5px] text-[#8C8C8C] block font-sans">Oro refundido</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-[#E5E5E5] tracking-tight">{(totalRecovered / 1000).toFixed(3)}</span>
              <span className="text-[10.5px] text-[#8C8C8C]">kg Au</span>
            </div>
            <p className="text-[10px] text-[#8C8C8C] font-mono flex items-center gap-1 pt-1.5 border-t border-neutral-800/20">
              <Sparkles className="w-3 h-3 text-[#A65B17]" />Lotes procesados: <strong className="text-[#E5E5E5]">{processedLotsCount} u</strong>
            </p>
          </div>
        </motion.div>

        {/* Tarjeta 3: Oro en espera por proceso */}
        <motion.div initial={{ opacity: 0, y: -80 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.55 }}
          className="relative group bg-[#161619] p-4.5 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-emerald-500/30">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-center mb-3">
            <div className="p-2 bg-black rounded-lg border border-emerald-500/20"><Clock className="w-5 h-5 text-emerald-500" /></div>
            <span className="text-[9px] text-emerald-400 font-mono tracking-wider flex items-center gap-1 bg-black px-1.5 py-0.5 rounded border border-emerald-500/10">BÓVEDA</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10.5px] text-[#8C8C8C] block font-sans">Oro en espera por proceso</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-[#E5E5E5] tracking-tight">{(inStockWeight / 1000).toFixed(3)}</span>
              <span className="text-[10.5px] text-[#8C8C8C]">kg</span>
            </div>
            <p className="text-[10px] text-[#8C8C8C] font-mono flex items-center gap-1 pt-1.5 border-t border-neutral-800/20">
              <ArrowUpRight className="w-3 h-3 text-emerald-400" />Barras en stock: <strong className="text-[#E5E5E5]">{inStockCount} u</strong>
            </p>
          </div>
        </motion.div>

        {/* Tarjeta 4: Merma */}
        <motion.div initial={{ opacity: 0, y: -80 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.38, duration: 0.55 }}
          className="relative group bg-[#161619] p-4.5 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-red-500/30">
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-red-500/5 to-transparent rounded-bl-full pointer-events-none"></div>
          <div className="flex justify-between items-center mb-3">
            <div className="p-2 bg-black rounded-lg border border-red-500/20"><TrendingDown className="w-5 h-5 text-red-400" /></div>
            <span className="text-[9px] text-red-400 font-mono tracking-wider flex items-center gap-1 bg-black px-1.5 py-0.5 rounded border border-red-500/10">MERMA</span>
          </div>
          <div className="space-y-0.5">
            <span className="text-[10.5px] text-[#8C8C8C] block font-sans">Merma</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-mono font-bold text-[#E5E5E5] tracking-tight">{mermaPct.toFixed(1)}<span className="text-lg">%</span></span>
              <span className="text-[10.5px] text-[#8C8C8C]">Merma</span>
            </div>
            <p className="text-[10px] text-[#8C8C8C] font-mono flex items-center gap-1 pt-1.5 border-t border-neutral-800/20">
              <Scale className="w-3 h-3 text-red-400" />Pérdida Total: <strong className="text-[#E5E5E5]">{(mermaG / 1000).toFixed(3)} kg Au</strong>
            </p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45, duration: 0.5 }}
          className="bg-[#161619] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#D5B042]/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-sans font-semibold text-[#E5E5E5] text-base">Ingresos de Clientes (Proporción de Masa)</h3>
              <p className="text-[11px] text-[#8C8C8C] font-sans mt-0.5">Distribución de gramos brutos por cliente.</p>
            </div>
            <div className="flex bg-black border border-neutral-800/60 p-0.5 rounded-lg text-[10px] font-mono self-start md:self-auto">
              <button onClick={() => setSupplierLayout('grid')}
                className={`px-3 py-1 rounded-md transition-all uppercase font-bold tracking-wider cursor-pointer ${supplierLayout === 'grid' ? 'bg-[#D5B042]/10 text-[#D5B042] border border-[#D5B042]/20' : 'text-[#8C8C8C] hover:text-[#E5E5E5]'}`}>Cuadrícula</button>
              <button onClick={() => setSupplierLayout('bars')}
                className={`px-3 py-1 rounded-md transition-all uppercase font-bold tracking-wider cursor-pointer ${supplierLayout === 'bars' ? 'bg-[#D5B042]/10 text-[#D5B042] border border-[#D5B042]/20' : 'text-[#8C8C8C] hover:text-[#E5E5E5]'}`}>Barras</button>
            </div>
          </div>
          <div className="bg-black p-4 rounded-xl border border-neutral-800/40 flex items-center justify-center min-h-[250px]">
            {renderTreemap(supplierData, hoveredSupplier, setHoveredSupplier, 0)}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
            {supplierData.map((s, idx) => (
              <div key={s.id} className="flex items-center gap-1.5 text-[10px] font-mono text-[#8C8C8C]">
                <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: colors[idx % colors.length].s1 }}></span>
                <span>{s.code}: {Math.round(s.value / 1000)}kg ({Math.round((s.value / (supplierData.reduce((x, y) => x + y.value, 0) || 1)) * 100)}%)</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowSupplierTable(!showSupplierTable)}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-black/50 hover:bg-black border border-neutral-800/40 rounded-lg text-[10px] font-mono text-[#8C8C8C] hover:text-[#E5E5E5] transition-colors cursor-pointer">
            <Table2 className="w-3.5 h-3.5" />
            {showSupplierTable ? 'Ocultar' : 'Ver'} Detalle por Cliente
            {showSupplierTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showSupplierTable && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-neutral-800/40 text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider">
                    <th className="py-2">Cliente</th>
                    <th className="py-2 text-right">Bruto (kg)</th>
                    <th className="py-2 text-right">FA (g)</th>
                    <th className="py-2 text-right">Barras</th>
                    <th className="py-2 text-right">Pureza</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/20">
                  {supplierData.map(s => (
                    <tr key={s.id} className="hover:bg-black/40 transition-colors">
                      <td className="py-2 font-medium text-[#E5E5E5]">{s.name}</td>
                      <td className="py-2 text-right font-mono text-[#8C8C8C]">{(s.value / 1000).toFixed(3)}</td>
                      <td className="py-2 text-right font-mono text-[#D5B042]">{Math.round(s.value).toLocaleString()}</td>
                      <td className="py-2 text-right font-mono text-[#8C8C8C]">{s.count} u</td>
                      <td className="py-2 text-right font-mono text-[#8C8C8C]">{s.avgPurity}‰</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.52, duration: 0.5 }}
          className="bg-[#161619] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#A65B17]/30">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-6">
            <div>
              <h3 className="font-sans font-semibold text-[#E5E5E5] text-base">Egresos por Cliente</h3>
              <p className="text-[11px] text-[#8C8C8C] font-sans mt-0.5">Distribución proporcional de salidas por cliente.</p>
            </div>
            <div className="flex bg-black border border-neutral-800/60 p-0.5 rounded-lg text-[10px] font-mono self-start md:self-auto">
              <button onClick={() => setClientLayout('grid')}
                className={`px-3 py-1 rounded-md transition-all uppercase font-bold tracking-wider cursor-pointer ${clientLayout === 'grid' ? 'bg-[#A65B17]/10 text-[#A65B17] border border-[#A65B17]/20' : 'text-[#8C8C8C] hover:text-[#E5E5E5]'}`}>Cuadrícula</button>
              <button onClick={() => setClientLayout('bars')}
                className={`px-3 py-1 rounded-md transition-all uppercase font-bold tracking-wider cursor-pointer ${clientLayout === 'bars' ? 'bg-[#A65B17]/10 text-[#A65B17] border border-[#A65B17]/20' : 'text-[#8C8C8C] hover:text-[#E5E5E5]'}`}>Barras</button>
            </div>
          </div>
          <div className="bg-black p-4 rounded-xl border border-neutral-800/40 flex items-center justify-center min-h-[250px]">
            {renderTreemap(clientData, hoveredClient, setHoveredClient, 3)}
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 justify-center">
            {clientData.map((c, idx) => (
              <div key={c.id} className="flex items-center gap-1.5 text-[10px] font-mono text-[#8C8C8C]">
                <span className="w-2.5 h-2.5 rounded" style={{ backgroundColor: colors[(idx + 3) % colors.length].s1 }}></span>
                <span>{c.code}: {Math.round(c.value / 1000)}kg ({Math.round((c.value / (clientData.reduce((x, y) => x + y.value, 0) || 1)) * 100)}%)</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowClientTable(!showClientTable)}
            className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 bg-black/50 hover:bg-black border border-neutral-800/40 rounded-lg text-[10px] font-mono text-[#8C8C8C] hover:text-[#E5E5E5] transition-colors cursor-pointer">
            <Table2 className="w-3.5 h-3.5" />
            {showClientTable ? 'Ocultar' : 'Ver'} Detalle por Cliente
            {showClientTable ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
          {showClientTable && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-xs font-sans">
                <thead>
                  <tr className="border-b border-neutral-800/40 text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider">
                    <th className="py-2">Cliente</th>
                    <th className="py-2 text-right">Despachado (kg)</th>
                    <th className="py-2 text-right">Envíos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/20">
                  {clientData.map(c => (
                    <tr key={c.id} className="hover:bg-black/40 transition-colors">
                      <td className="py-2 font-medium text-[#E5E5E5]">{c.name}</td>
                      <td className="py-2 text-right font-mono text-[#D5B042]">{(c.value / 1000).toFixed(3)}</td>
                      <td className="py-2 text-right font-mono text-[#8C8C8C]">{c.count} envíos</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
        </motion.div>
      </div>

      <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.5 }}
        className="bg-[#161619] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] transition-all hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#D5B042]/30">
        <div className="flex items-center justify-between mb-4 border-b border-neutral-800/20 pb-3">
          <div>
            <h3 className="font-sans font-semibold text-[#E5E5E5] text-base">Flujo de Trazabilidad</h3>
            <p className="text-xs text-[#8C8C8C]">Ingresos vs Egresos (últimos 7 días).</p>
          </div>
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
                <XAxis dataKey="dateShort" stroke="#8C8C8C" tick={{ fontSize: 10, fill: '#8C8C8C' }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false} />
                <YAxis stroke="#8C8C8C" tick={{ fontSize: 10, fill: '#8C8C8C' }} axisLine={{ stroke: '#2A2A2A' }} tickLine={false}
                  tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}kg` : `${v}g`} />
                <Tooltip cursor={{ fill: 'rgba(180, 148, 30, 0.06)' }}
                  contentStyle={{ backgroundColor: '#1A1A1A', border: '1px solid #B4941E', borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.6)', padding: '10px 14px' }}
                  labelStyle={{ color: '#D5B042', fontWeight: 700, fontSize: 12, marginBottom: 4 }}
                  formatter={(value: number, name: string) => [`${value.toLocaleString(undefined, { minimumFractionDigits: 1 })} g`, name === 'in' ? 'Ingresos (IN)' : 'Egresos (OUT)']} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#8C8C8C', paddingTop: 8 }}
                  formatter={(value: string) => value === 'in' ? 'Ingresos (IN)' : 'Egresos (OUT)'} />
                <Bar dataKey="in" name="in" radius={[4, 4, 0, 0]} animationDuration={1000} animationEasing="ease-out" maxBarSize={40}>
                  {flowData.map((_, idx) => (<Cell key={`in-${idx}`} fill={`url(#greenGrad-${idx})`} />))}
                </Bar>
                <Bar dataKey="out" name="out" radius={[4, 4, 0, 0]} animationDuration={1000} animationEasing="ease-out" animationBegin={200} maxBarSize={40}>
                  {flowData.map((_, idx) => (<Cell key={`out-${idx}`} fill={`url(#bronzeGrad-${idx})`} />))}
                </Bar>
                <defs>{flowData.map((_, idx) => (
                  <React.Fragment key={`grads-${idx}`}>
                    <linearGradient id={`greenGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22C55E" stopOpacity={0.9} /><stop offset="100%" stopColor="#166534" stopOpacity={0.7} />
                    </linearGradient>
                    <linearGradient id={`bronzeGrad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#D5B042" stopOpacity={0.9} /><stop offset="100%" stopColor="#A65B17" stopOpacity={0.7} />
                    </linearGradient>
                  </React.Fragment>
                ))}</defs>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}