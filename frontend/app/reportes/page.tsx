'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'motion/react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  FileText, Download, ArrowDownLeft, ArrowUpRight,
  Sparkles, Scale, CheckCircle2, Clock, RefreshCw, Info,
  Flame, TrendingUp, Coins,
} from 'lucide-react';
import { useBars } from '@/hooks/useBars';
import { useClients } from '@/hooks/useClients';
import { useProcesses } from '@/hooks/useProcesses';
import { useLots } from '@/hooks/useLots';
import { useMaterialExits } from '@/hooks/useExits';
import { formatNumber } from '@/lib/format';

export default function ReportesPage() {
  const { data: bars = [] } = useBars();
  const { data: clients = [] } = useClients();
  const { data: processes = [] } = useProcesses();
  const { data: lots = [] } = useLots();
  const { data: exits = [] } = useMaterialExits();
  const [exportingSection, setExportingSection] = useState<string | null>(null);

  const oroRecibido = useMemo(() => {
    const totalBarras = bars.length;
    const pesoBruto = bars.reduce((sum, b) => sum + b.grossWeight, 0);
    const finoTotal = bars.reduce((sum, b) => sum + b.fineWeight, 0);
    const clientes = new Set(bars.map(b => b.clientId)).size;
    return { totalBarras, pesoBruto, finoTotal, clientes };
  }, [bars]);

  const oroRefinado = useMemo(() => {
    const closedLots = lots.filter(l => l.recovered != null);
    const completedBars = bars.filter(b => b.status === 'COMPLETADO' || b.status === 'EXITED');
    const totalRecovered = closedLots.reduce((sum, l) => sum + (l.recovered || 0), 0);
    const completedLotIds = new Set(closedLots.map(l => l.id));
    const completedLotsBars = bars.filter(b => b.lotId && completedLotIds.has(b.lotId));
    const totalExpected = completedLotsBars.reduce((sum, b) => sum + b.fineWeight, 0);
    const eficiencia = totalExpected > 0 ? (totalRecovered / totalExpected) * 100 : 0;
    const enProceso = processes.filter(p => p.status === 'OPEN');
    return {
      lotsCount: closedLots.length,
      enProcesoCount: enProceso.length,
      barrasCount: completedBars.length,
      totalRecovered,
      totalExpected,
      eficiencia,
    };
  }, [lots, bars, processes]);

  const oroEnEspera = useMemo(() => {
    const waiting = bars.filter(b => b.status === 'IN_STOCK');
    const pesoBruto = waiting.reduce((sum, b) => sum + b.grossWeight, 0);
    const finoTotal = waiting.reduce((sum, b) => sum + b.fineWeight, 0);
    const clientes = new Set(waiting.map(b => b.clientId)).size;
    return { count: waiting.length, pesoBruto, finoTotal, clientes };
  }, [bars]);

  const clientesReport = useMemo(() => {
    const map = new Map<string, { name: string; received: number; delivered: number }>();
    bars.forEach(b => {
      const clientName = clients.find(c => c.id === b.clientId)?.name || 'Desconocido';
      const entry = map.get(b.clientId) || { name: clientName, received: 0, delivered: 0 };
      entry.received += b.fineWeight;
      if (b.status === 'EXITED') entry.delivered += b.fineWeight;
      map.set(b.clientId, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [bars, clients]);

  const handleExportPDF = useCallback(async (elementId: string, title: string) => {
    setExportingSection(elementId);
    try {
      const element = document.getElementById(elementId);
      if (!element) return;
      const imgData = await toPng(element, { backgroundColor: '#1C1C1C', pixelRatio: 2 });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = 190;
      const img = new Image();
      img.src = imgData;
      await img.decode();
      const pdfHeight = (img.naturalHeight * pdfWidth) / img.naturalWidth;
      let heightLeft = pdfHeight;
      let position = 10;
      pdf.addImage(imgData, 'PNG', 10, position, pdfWidth, pdfHeight);
      while (heightLeft > 270) {
        position = heightLeft - 270;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 10, -position + 10, pdfWidth, pdfHeight);
        heightLeft -= 270;
      }
      pdf.save(`${title.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error('Error al generar PDF:', err);
    } finally {
      setExportingSection(null);
    }
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}>
        <h1 className="text-2xl md:text-3xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
          <FileText className="w-8 h-8 text-[#D5B042] filter drop-shadow-[0_0_8px_rgba(213,176,66,0.3)]" />
          Reportes de <span className="text-[#D5B042] font-semibold">Fundición</span>
        </h1>
        <p className="text-xs text-[#8C8C8C] mt-1">
          Conciliación metalúrgica — Oro recibido, fundido, en espera y balances por cliente.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
          id="report-oro-recibido"
          className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] space-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-emerald-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-emerald-950/30 rounded-lg border border-emerald-500/15">
                <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider font-semibold">Oro Recibido</span>
                <p className="text-[9px] text-[#8C8C8C]/50">Total histórico ingresado</p>
              </div>
            </div>
            <button
              onClick={() => handleExportPDF('report-oro-recibido', 'Reporte_Oro_Recibido')}
              disabled={exportingSection === 'report-oro-recibido'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-emerald-950/30 hover:bg-emerald-900/50 border border-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {exportingSection === 'report-oro-recibido' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              PDF
            </button>
          </div>

          <div className="space-y-0.5">
            <strong className="text-3xl font-mono font-bold text-[#E5E5E5]">
              {(oroRecibido.pesoBruto / 1000).toFixed(3)}
            </strong>
            <span className="text-[11px] font-mono text-[#8C8C8C] block">kg Peso Bruto Total</span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-neutral-800/20">
            <div>
              <span className="text-xs font-mono font-bold text-[#D5B042]">{oroRecibido.totalBarras}</span>
              <span className="text-[9px] text-[#8C8C8C]/50 block">Barras</span>
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-[#D5B042]">{oroRecibido.clientes}</span>
              <span className="text-[9px] text-[#8C8C8C]/50 block">Clientes</span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-mono text-[#8C8C8C]">
                Fino total:{' '}
                <strong className="text-[#E5E5E5]">{(oroRecibido.finoTotal / 1000).toFixed(3)} kg Au</strong>
              </span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
          id="report-oro-fundido"
          className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] space-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-amber-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-950/30 rounded-lg border border-amber-500/15">
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider font-semibold">            Oro Fundido</span>
                <p className="text-[9px] text-[#8C8C8C]/50">Fundiciones completadas</p>
              </div>
            </div>
            <button
              onClick={() => handleExportPDF('report-oro-fundido', 'Reporte_Oro_Fundido')}
              disabled={exportingSection === 'report-oro-fundido'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-500/20 text-amber-300 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {exportingSection === 'report-oro-fundido' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              PDF
            </button>
          </div>

          <div className="space-y-0.5">
            <strong className="text-3xl font-mono font-bold text-[#E5E5E5]">
              {(oroRefinado.totalRecovered / 1000).toFixed(3)}
            </strong>
            <span className="text-[11px] font-mono text-[#8C8C8C] block">kg Au Recuperado</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-800/20">
            <div>
              <span className="text-xs font-mono font-bold text-[#D5B042]">{oroRefinado.lotsCount}</span>
              <span className="text-[9px] text-[#8C8C8C]/50 block">Lotes</span>
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-[#D5B042]">{oroRefinado.barrasCount}</span>
              <span className="text-[9px] text-[#8C8C8C]/50 block">Barras</span>
            </div>
            <div>
              <span className={`text-xs font-mono font-bold ${oroRefinado.eficiencia >= 99 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {oroRefinado.eficiencia.toFixed(1)}%
              </span>
              <span className="text-[9px] text-[#8C8C8C]/50 block">Eficiencia</span>
            </div>
          </div>

          {oroRefinado.enProcesoCount > 0 && (
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-amber-500 bg-amber-950/20 px-2.5 py-1 rounded-lg border border-amber-500/10">
              <RefreshCw className="w-3 h-3 animate-spin" />
              {oroRefinado.enProcesoCount} proceso(s) en fundición activa
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
          id="report-oro-espera"
          className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] space-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-blue-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-950/30 rounded-lg border border-blue-500/15">
                <Clock className="w-4 h-4 text-blue-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider font-semibold">Oro en Espera</span>
                <p className="text-[9px] text-[#8C8C8C]/50">Pendiente por procesar</p>
              </div>
            </div>
            <button
              onClick={() => handleExportPDF('report-oro-espera', 'Reporte_Oro_Espera')}
              disabled={exportingSection === 'report-oro-espera'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-950/30 hover:bg-blue-900/50 border border-blue-500/20 text-blue-300 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {exportingSection === 'report-oro-espera' ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <Download className="w-3 h-3" />
              )}
              PDF
            </button>
          </div>

          <div className="space-y-0.5">
            <strong className="text-3xl font-mono font-bold text-[#E5E5E5]">
              {(oroEnEspera.pesoBruto / 1000).toFixed(3)}
            </strong>
            <span className="text-[11px] font-mono text-[#8C8C8C] block">kg Peso Bruto en Bóveda</span>
          </div>

          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-neutral-800/20">
            <div>
              <span className="text-xs font-mono font-bold text-[#D5B042]">{oroEnEspera.count}</span>
              <span className="text-[9px] text-[#8C8C8C]/50 block">Barras</span>
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-[#D5B042]">{oroEnEspera.clientes}</span>
              <span className="text-[9px] text-[#8C8C8C]/50 block">Clientes</span>
            </div>
            <div>
              <span className="text-xs font-mono font-bold text-[#E5E5E5]">
                {(oroEnEspera.finoTotal / 1000).toFixed(2)}
              </span>
              <span className="text-[9px] text-[#8C8C8C]/50 block">kg Au Fino</span>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65, duration: 0.4, ease: 'easeOut' }}
        id="report-clientes"
        className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] space-y-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-[#D5B042]/30"
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-neutral-800/20 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#D5B042]/10 rounded-lg border border-[#D5B042]/20">
              <TrendingUp className="w-5 h-5 text-[#D5B042]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#E5E5E5] uppercase tracking-wider">Oro Recibido por Cliente y Oro Entregado</h3>
              <p className="text-[10px] text-[#8C8C8C] font-mono mt-0.5">Balance de masa por socio comercial</p>
            </div>
          </div>
          <button
            onClick={() => handleExportPDF('report-clientes', 'Reporte_Balance_Clientes')}
            disabled={exportingSection === 'report-clientes'}
            className="flex items-center gap-2 px-4 py-2 bg-[#D5B042]/10 hover:bg-[#D5B042]/20 border border-[#D5B042]/30 text-[#D5B042] text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {exportingSection === 'report-clientes' ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            Descargar PDF
          </button>
        </div>

        {clientesReport.length === 0 ? (
          <div className="text-center py-10 text-[#8C8C8C] text-xs font-sans">
            No hay transacciones registradas para mostrar balance por cliente.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-neutral-800/40 text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider">
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-right">Recibido (kg Au)</th>
                  <th className="py-3 px-4 text-right">Entregado (kg Au)</th>
                  <th className="py-3 px-4 text-right">Balance (kg Au)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/20 text-xs font-sans text-[#E5E5E5]">
                {clientesReport.map((cliente) => {
                  const balance = cliente.received - cliente.delivered;
                  return (
                    <tr key={cliente.name} className="hover:bg-black/40 transition-colors">
                      <td className="py-3.5 px-4 font-medium text-[#E5E5E5] flex items-center gap-2">
                        <Coins className="w-3.5 h-3.5 text-[#D5B042]" />
                        {cliente.name}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                        {(cliente.received / 1000).toFixed(3)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400">
                        {(cliente.delivered / 1000).toFixed(3)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className={`inline-flex items-center gap-1 font-mono font-bold text-sm ${balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                          <ArrowUpRight className={`w-3 h-3 ${balance >= 0 ? '' : 'rotate-180'}`} />
                          {balance >= 0 ? '+' : ''}{(balance / 1000).toFixed(3)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
