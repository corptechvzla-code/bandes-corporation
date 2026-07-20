'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGoldTraceability } from '../../src/context/GoldTraceabilityContext';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  FileText,
  Download,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Flame,
  TrendingUp,
  Coins,
  Filter,
  X,
  Check
} from 'lucide-react';

const REPORT_CONFIG: Record<string, { title: string; fileName: string; filterType: 'suppliers' | 'clients'; accent: string }> = {
  'report-oro-recibido': { title: 'Oro Recibido', fileName: 'Reporte_Oro_Recibido', filterType: 'suppliers', accent: 'emerald' },
  'report-oro-refinado': { title: 'Oro Refinado', fileName: 'Reporte_Oro_Refinado', filterType: 'suppliers', accent: 'amber' },
  'report-oro-espera': { title: 'Oro en Espera', fileName: 'Reporte_Oro_Espera', filterType: 'suppliers', accent: 'blue' },
  'report-clientes': { title: 'Balance por Cliente', fileName: 'Reporte_Balance_Clientes', filterType: 'clients', accent: 'gold' },
};

export default function ReportesPage() {
  const { goldBars, castingLots, transactions, suppliers } = useGoldTraceability();
  const [exportingSection, setExportingSection] = useState<string | null>(null);

  const [filterModalFor, setFilterModalFor] = useState<string | null>(null);
  const [modalDateFrom, setModalDateFrom] = useState('');
  const [modalDateTo, setModalDateTo] = useState('');
  const [modalSelectedIds, setModalSelectedIds] = useState<string[]>([]);

  const [exportFilters, setExportFilters] = useState({
    dateFrom: '',
    dateTo: '',
    supplierIds: [] as string[],
    clientIds: [] as string[],
  });

  const filteredBars = useMemo(() => {
    return goldBars.filter(b => {
      if (exportFilters.dateFrom && b.createdAt < exportFilters.dateFrom) return false;
      if (exportFilters.dateTo && b.createdAt > exportFilters.dateTo + 'T23:59:59') return false;
      if (exportFilters.supplierIds.length > 0 && !exportFilters.supplierIds.includes(b.supplierId)) return false;
      return true;
    });
  }, [goldBars, exportFilters]);

  const oroRecibido = useMemo(() => {
    const totalBarras = filteredBars.length;
    const pesoBruto = filteredBars.reduce((sum, b) => sum + b.grossWeight, 0);
    const finoTotal = filteredBars.reduce((sum, b) => sum + b.expected, 0);
    const proveedores = new Set(filteredBars.map(b => b.supplierId)).size;
    return { totalBarras, pesoBruto, finoTotal, proveedores };
  }, [filteredBars]);

  const oroRefinado = useMemo(() => {
    const completedBars = filteredBars.filter(b => b.status === 'COMPLETADO' || b.status === 'EGRESADO');
    const lots = castingLots.filter(l => l.status === 'COMPLETADO');
    const totalRecovered = completedBars.reduce((sum, b) => sum + (b.recovered || 0), 0);
    const totalExpected = completedBars.reduce((sum, b) => sum + b.expected, 0);
    const eficiencia = totalExpected > 0 ? (totalRecovered / totalExpected) * 100 : 0;
    const enProceso = castingLots.filter(l => l.status === 'FUNDICION' || l.status === 'ENFRIANDO');
    return {
      lotsCount: lots.length,
      enProcesoCount: enProceso.length,
      barrasCount: completedBars.length,
      totalRecovered,
      totalExpected,
      eficiencia
    };
  }, [filteredBars, castingLots]);

  const oroEnEspera = useMemo(() => {
    const waiting = filteredBars.filter(b => b.status === 'CONFIRMADO' || b.status === 'POR_CONFIRMAR');
    const pesoBruto = waiting.reduce((sum, b) => sum + b.grossWeight, 0);
    const finoTotal = waiting.reduce((sum, b) => sum + b.expected, 0);
    const proveedores = new Set(waiting.map(b => b.supplierId)).size;
    return { count: waiting.length, pesoBruto, finoTotal, proveedores };
  }, [filteredBars]);

  const clientesReport = useMemo(() => {
    const filtered = transactions.filter(tx => {
      if (exportFilters.dateFrom && tx.date < exportFilters.dateFrom) return false;
      if (exportFilters.dateTo && tx.date > exportFilters.dateTo + 'T23:59:59') return false;
      if (exportFilters.clientIds.length > 0 && !exportFilters.clientIds.includes(tx.clientId)) return false;
      return true;
    });
    const map = new Map<string, { name: string; received: number; delivered: number }>();
    filtered.forEach(tx => {
      const entry = map.get(tx.clientId) || { name: tx.clientName, received: 0, delivered: 0 };
      if (tx.type === 'IN') entry.received += tx.weight;
      else entry.delivered += tx.weight;
      map.set(tx.clientId, entry);
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [transactions, exportFilters]);

  const handleExportPDF = useCallback(async (elementId: string, title: string) => {
    setExportingSection(elementId);
    try {
      const element = document.getElementById(elementId);
      if (!element) return;
      const imgData = await toPng(element, {
        backgroundColor: '#1C1C1C',
        pixelRatio: 2,
      });
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

  const openFilterModal = (reportId: string) => {
    setModalDateFrom('');
    setModalDateTo('');
    setModalSelectedIds([]);
    setFilterModalFor(reportId);
  };

  const handleExportWithFilters = () => {
    if (!filterModalFor) return;
    const config = REPORT_CONFIG[filterModalFor];
    const elementId = filterModalFor;
    const fileName = config.fileName;

    setExportFilters({
      dateFrom: modalDateFrom,
      dateTo: modalDateTo,
      supplierIds: config.filterType === 'suppliers' ? modalSelectedIds : [],
      clientIds: config.filterType === 'clients' ? modalSelectedIds : [],
    });

    setFilterModalFor(null);

    setTimeout(() => {
      handleExportPDF(elementId, fileName);
      setTimeout(() => {
        setExportFilters({ dateFrom: '', dateTo: '', supplierIds: [], clientIds: [] });
      }, 1200);
    }, 300);
  };

  const toggleItemSelection = (id: string) => {
    setModalSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const currentConfig = filterModalFor ? REPORT_CONFIG[filterModalFor] : null;
  const allSelected = currentConfig && suppliers.length > 0 && suppliers.every(s => modalSelectedIds.includes(s.id));

  const toggleAll = () => {
    setModalSelectedIds(allSelected ? [] : suppliers.map(s => s.id));
  };

  const getModalAccent = (accent: string) => {
    switch (accent) {
      case 'emerald': return { icon: 'text-emerald-400', btn: 'bg-emerald-600 hover:bg-emerald-500 text-white', hint: 'text-emerald-400/60' };
      case 'amber': return { icon: 'text-amber-400', btn: 'bg-amber-600 hover:bg-amber-500 text-white', hint: 'text-amber-400/60' };
      case 'blue': return { icon: 'text-blue-400', btn: 'bg-blue-600 hover:bg-blue-500 text-white', hint: 'text-blue-400/60' };
      case 'gold': return { icon: 'text-[#D5B042]', btn: 'bg-[#D5B042] hover:bg-[#D5B042]/80 text-black', hint: 'text-[#D5B042]/60' };
      default: return { icon: 'text-[#D5B042]', btn: 'bg-[#D5B042] hover:bg-[#D5B042]/80 text-black', hint: 'text-[#D5B042]/60' };
    }
  };

  const accent = currentConfig ? getModalAccent(currentConfig.accent) : null;

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="space-y-8"
    >

      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <h1 className="text-2xl md:text-3xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
          <FileText className="w-8 h-8 text-[#D5B042] filter drop-shadow-[0_0_8px_rgba(213,176,66,0.3)]" />
          Reportes de <span className="text-[#D5B042] font-semibold">Trazabilidad</span>
        </h1>
        <p className="text-xs text-[#8C8C8C] mt-1">
          Conciliación metalúrgica — Oro recibido, refinado, en espera y balances por cliente.
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
              onClick={() => openFilterModal('report-oro-recibido')}
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
              <span className="text-xs font-mono font-bold text-[#D5B042]">{oroRecibido.proveedores}</span>
              <span className="text-[9px] text-[#8C8C8C]/50 block">Clientes</span>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
          id="report-oro-refinado"
          className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] space-y-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] hover:border-amber-500/30"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-amber-950/30 rounded-lg border border-amber-500/15">
                <Flame className="w-4 h-4 text-amber-400" />
              </div>
              <div>
                <span className="text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider font-semibold">Oro Refinado</span>
                <p className="text-[9px] text-[#8C8C8C]/50">Fundiciones completadas</p>
              </div>
            </div>
            <button
              onClick={() => openFilterModal('report-oro-refinado')}
              disabled={exportingSection === 'report-oro-refinado'}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-950/30 hover:bg-amber-900/50 border border-amber-500/20 text-amber-300 text-[9px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {exportingSection === 'report-oro-refinado' ? (
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
              {oroRefinado.enProcesoCount} lote(s) en fundición activa
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
              onClick={() => openFilterModal('report-oro-espera')}
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
              <span className="text-xs font-mono font-bold text-[#D5B042]">{oroEnEspera.proveedores}</span>
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
            onClick={() => openFilterModal('report-clientes')}
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

      <AnimatePresence>
        {filterModalFor && currentConfig && accent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setFilterModalFor(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="bg-[#1C1C1C] rounded-2xl border border-neutral-800/40 w-full max-w-md p-5 space-y-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Filter className={`w-4 h-4 ${accent.icon}`} />
                  <span className="text-xs font-mono text-[#E5E5E5] uppercase tracking-wider font-semibold">
                    Filtros — {currentConfig.title}
                  </span>
                </div>
                <button
                  onClick={() => setFilterModalFor(null)}
                  className="p-1 hover:bg-black/40 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 text-[#8C8C8C]" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-mono text-[#8C8C8C] uppercase tracking-wider mb-1 block">Fecha Desde</label>
                  <input
                    type="date"
                    value={modalDateFrom}
                    onChange={(e) => setModalDateFrom(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-neutral-800/40 rounded-lg text-xs font-mono text-[#E5E5E5] focus:outline-none focus:border-[#D5B042]/30 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-[#8C8C8C] uppercase tracking-wider mb-1 block">Fecha Hasta</label>
                  <input
                    type="date"
                    value={modalDateTo}
                    onChange={(e) => setModalDateTo(e.target.value)}
                    className="w-full px-3 py-2 bg-black border border-neutral-800/40 rounded-lg text-xs font-mono text-[#E5E5E5] focus:outline-none focus:border-[#D5B042]/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[9px] font-mono text-[#8C8C8C] uppercase tracking-wider">
                    {currentConfig.filterType === 'suppliers' ? 'Proveedores' : 'Clientes'}
                  </label>
                  <button
                    onClick={toggleAll}
                    className={`text-[9px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer ${allSelected ? 'text-red-400 hover:text-red-300' : accent.icon + ' hover:opacity-80'}`}
                  >
                    {allSelected ? 'Deseleccionar' : 'Seleccionar'} Todos
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-0.5 pr-1 bg-black/30 rounded-xl p-2 border border-neutral-800/30">
                  {suppliers.map((s) => {
                    const isSelected = modalSelectedIds.includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg cursor-pointer hover:bg-[#1C1C1C] transition-colors"
                        onClick={() => toggleItemSelection(s.id)}
                      >
                        <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                          isSelected ? 'bg-[#D5B042] border-[#D5B042]' : 'bg-black border-neutral-700'
                        }`}>
                          {isSelected && <Check className="w-3 h-3 text-black" />}
                        </span>
                        <span className="text-[10px] font-mono font-bold text-[#D5B042]">{s.code}</span>
                        <span className="text-[10px] text-[#8C8C8C] truncate">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
                {modalSelectedIds.length === 0 && (
                  <p className={`text-[9px] font-mono mt-1.5 ${accent.hint}`}>
                    Sin selección = Todos los {currentConfig.filterType === 'suppliers' ? 'proveedores' : 'clientes'} incluidos
                  </p>
                )}
                {modalSelectedIds.length > 0 && (
                  <p className="text-[9px] font-mono text-[#8C8C8C] mt-1.5">
                    {modalSelectedIds.length} {currentConfig.filterType === 'suppliers' ? 'proveedor(es)' : 'cliente(s)'} seleccionado(s)
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-neutral-800/20">
                <button
                  onClick={() => setFilterModalFor(null)}
                  className="px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider text-[#8C8C8C] hover:text-[#E5E5E5] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleExportWithFilters}
                  className={`flex items-center gap-2 px-4 py-2 text-[10px] font-mono font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer ${accent.btn}`}
                >
                  <Download className="w-3.5 h-3.5" />
                  Generar PDF
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
