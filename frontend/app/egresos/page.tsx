'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { useClients } from '@/hooks/useClients';
import { useAvailableLots } from '@/hooks/useProcesses';
import { useCreateMaterialExit } from '@/hooks/useExits';
import { useBars } from '@/hooks/useBars';
import { formatNumber } from '@/lib/format';
import {
  ArrowLeftRight, User, Sparkles, AlertTriangle, Check, Send, Search,
  Grid, List, Coins, Download, X, RefreshCw,
} from 'lucide-react';

interface DispatchResultData {
  clientName: string;
  destination: string;
  reference: string;
  totalWeight: number;
  lotCount: number;
  lots: { name: string; weight: number }[];
  createdAt: string;
}

export default function EgresosPage() {
  const { data: clients = [] } = useClients();
  const { data: bars = [] } = useBars();
  const createExit = useCreateMaterialExit();

  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const { data: availableLots = [] } = useAvailableLots(selectedClientId);
  const [selectedLotIds, setSelectedLotIds] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [dispatchResult, setDispatchResult] = useState<DispatchResultData | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const allLots = useMemo(() => {
    return availableLots.flatMap(p =>
      p.lots.map(lot => ({
        ...lot,
        processName: p.name,
        processId: p.id,
      })),
    );
  }, [availableLots]);

  const filteredLots = useMemo(() => {
    if (!searchTerm) return allLots;
    const q = searchTerm.toUpperCase();
    return allLots.filter(lot =>
      lot.name.toUpperCase().includes(q) ||
      lot.processName.toUpperCase().includes(q)
    );
  }, [allLots, searchTerm]);

  const totalWeight = useMemo(() => {
    return filteredLots
      .filter(lot => selectedLotIds.has(lot.id))
      .reduce((sum, lot) => sum + lot.availableWeight, 0);
  }, [filteredLots, selectedLotIds]);

  const hasActiveClient = !!selectedClientId;

  const toggleLot = (lotId: string) => {
    setSelectedLotIds(prev => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  };

  const generateDispatchPDF = useCallback((data: DispatchResultData) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let y = 15;

    doc.setFillColor(26, 26, 26);
    doc.rect(0, 0, pageWidth, 45, 'F');

    doc.setTextColor(213, 176, 66);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('BANDES CORPORATION', margin, y + 8);

    doc.setTextColor(200, 200, 200);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Trazabilidad de Oro Fine', margin, y + 15);

    doc.setTextColor(213, 176, 66);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE DESPACHO', pageWidth - margin, y + 8, { align: 'right' });

    doc.setTextColor(160, 160, 160);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Ref: ${data.reference}`, pageWidth - margin, y + 15, { align: 'right' });

    y = 55;
    doc.setDrawColor(213, 176, 66);
    doc.setLineWidth(0.5);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DATOS DEL CLIENTE', margin, y);
    y += 7;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(`Nombre: ${data.clientName}`, margin, y); y += 6;
    doc.text(`Destino: ${data.destination}`, margin, y); y += 6;
    doc.text(`Fecha de Despacho: ${new Date(data.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`, margin, y);
    y += 10;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('DETALLE DE LOTES DESPACHADOS', margin, y);
    y += 8;

    doc.setFillColor(45, 45, 45);
    doc.rect(margin, y - 4, contentWidth, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.text('LOTE', margin + 2, y + 1);
    doc.text('PESO ASIGNADO (g)', margin + 100, y + 1);
    y += 8;

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);

    data.lots.forEach((lot, index) => {
      if (y > 260) { doc.addPage(); y = 20; }
      if (index % 2 === 0) {
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, y - 4, contentWidth, 8, 'F');
      }
      doc.text(lot.name, margin + 2, y + 1);
      doc.setFont('helvetica', 'bold');
      doc.text(`${lot.weight.toFixed(2)} g`, margin + 100, y + 1);
      doc.setFont('helvetica', 'normal');
      y += 8;
    });

    y += 8;
    doc.setDrawColor(213, 176, 66);
    doc.setLineWidth(0.8);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setTextColor(40, 40, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`PESO TOTAL DESPACHADO: ${data.totalWeight.toFixed(2)} g (${(data.totalWeight / 1000).toFixed(4)} kg)`, margin, y);
    y += 8;
    doc.text(`LOTES DESPACHADOS: ${data.lotCount}`, margin, y);
    y += 16;

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    doc.setTextColor(120, 120, 120);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('_________________________', margin, y); y += 5;
    doc.text('Firma Autorizada', margin, y);
    doc.text('_________________________', pageWidth - margin - 40, y - 5);
    doc.text('Sello Receptor', pageWidth - margin - 40, y);

    doc.save(`Comprobante_Despacho_${data.reference.replace(/[/\\?%*:|"<>]/g, '_')}.pdf`);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!destination || selectedLotIds.size === 0) return;

    setStatus('processing');
    setMessage('');

    try {
      const result = await createExit.mutateAsync({
        destination: destination.toUpperCase(),
        lotIds: Array.from(selectedLotIds),
      });

      const clientName = clients.find(c => c.id === selectedClientId)?.name || 'Desconocido';

      const dispatchData: DispatchResultData = {
        clientName,
        destination: result.destination,
        reference: `DESP-${Date.now().toString(36).toUpperCase()}`,
        totalWeight: result.totalWeight,
        lotCount: selectedLotIds.size,
        lots: filteredLots
          .filter(lot => selectedLotIds.has(lot.id))
          .map(lot => ({ name: lot.name, weight: lot.availableWeight })),
        createdAt: new Date().toISOString(),
      };

      setDispatchResult(dispatchData);
      setStatus('success');
      setMessage(`EGRESO DESPLEGADO — ${result.destination} — ${formatNumber(result.totalWeight)} kg`);
      setSelectedLotIds(new Set());
      setDestination('');
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.message || 'ERROR EN DESPLIEGUE');
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-8 h-8 text-[#D5B042] filter drop-shadow-[0_0_8px_rgba(213,176,66,0.3)]" />
            Salida de Material <span className="text-[#D5B042] font-semibold">Terminal de Egresos</span>
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Seleccione un cliente, marque los lotes a despachar y ejecute la salida. Genere comprobantes PDF profesionales.
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Cliente</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-[#D5B042]/70" />
                <select value={selectedClientId} onChange={(e) => { setSelectedClientId(e.target.value); setSelectedLotIds(new Set()); }}
                  className="w-full bg-black border border-neutral-800/40 rounded-lg pl-9 pr-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors cursor-pointer appearance-none">
                  <option value="">SELECCIONAR CLIENTE...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.rif})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Destino / Entidad Receptora</label>
              <input type="text" placeholder="Ej: REFINERÍA ABC" value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())} required
                className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors uppercase placeholder:text-neutral-800" />
            </div>
          </div>
        </div>

        {hasActiveClient && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#1C1C1C] rounded-2xl border border-neutral-800/40 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">

            <div className="p-5 border-b border-neutral-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#D5B042]" />
                <span className="text-xs font-semibold text-[#E5E5E5] uppercase tracking-wider">
                  Bóveda de Lotes — {clients.find(c => c.id === selectedClientId)?.name}
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#8C8C8C]/50" />
                  <input type="text" placeholder="Buscar lote..." value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-32 bg-black border border-neutral-800/40 rounded-lg pl-8 pr-2 py-1.5 text-[10px] font-mono text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] placeholder:text-neutral-800" />
                </div>
                <div className="flex bg-black border border-neutral-800/60 p-0.5 rounded-lg text-[10px] font-mono">
                  <button type="button" onClick={() => setViewMode('list')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'list' ? 'bg-[#D5B042]/10 text-[#D5B042]' : 'text-[#8C8C8C] hover:text-[#E5E5E5]'}`}>
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button type="button" onClick={() => setViewMode('grid')}
                    className={`p-1.5 rounded-md transition-all cursor-pointer ${viewMode === 'grid' ? 'bg-[#D5B042]/10 text-[#D5B042]' : 'text-[#8C8C8C] hover:text-[#E5E5E5]'}`}>
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                </div>
                {filteredLots.length > 0 && (
                  <span className="text-[10px] font-mono text-[#8C8C8C]">
                    {selectedLotIds.size} de {filteredLots.length} seleccionados
                  </span>
                )}
              </div>
            </div>

            {filteredLots.length === 0 ? (
              <div className="p-10 text-center">
                <Sparkles className="w-8 h-8 text-[#8C8C8C]/30 mx-auto mb-3" />
                <p className="text-xs text-[#8C8C8C]">
                  {searchTerm ? 'No se encontraron lotes con ese criterio.' : 'No hay lotes disponibles para este cliente.'}
                </p>
                <p className="text-[10px] text-[#8C8C8C]/50 mt-1">
                  Asegúrese de que el cliente tenga procesos cerrados con barras en stock.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-neutral-800/20 text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider bg-black/50">
                      <th className="py-3 pl-5 w-12 text-center">Sel.</th>
                      <th className="py-3">Proceso</th>
                      <th className="py-3">Lote</th>
                      <th className="py-3 text-right pr-5">Peso Disponible (g)</th>
                      <th className="py-3 text-center">Barras</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/20">
                    {filteredLots.map(lot => (
                      <tr key={lot.id}
                        onClick={() => toggleLot(lot.id)}
                        className={`hover:bg-[#141414]/80 transition-colors cursor-pointer ${selectedLotIds.has(lot.id) ? 'bg-[#D5B042]/5' : ''}`}>
                        <td className="py-3 pl-5 text-center">
                          <div className={`w-4 h-4 rounded border-2 mx-auto flex items-center justify-center transition-colors
                            ${selectedLotIds.has(lot.id) ? 'bg-[#D5B042] border-[#D5B042]' : 'border-neutral-700'}`}>
                            {selectedLotIds.has(lot.id) && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                          </div>
                        </td>
                        <td className="py-3 font-mono text-[#E5E5E5]">{lot.processName}</td>
                        <td className="py-3 font-mono text-[#D5B042] font-bold">{lot.name}</td>
                        <td className="py-3 text-right font-mono text-[#E5E5E5] pr-5">
                          {formatNumber(lot.availableWeight)} g
                        </td>
                        <td className="py-3 text-center">
                          <span className="text-[10px] font-mono text-[#8C8C8C] bg-black border border-neutral-800/20 px-2 py-0.5 rounded-full">
                            {lot.barCount} u
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-5">
                {filteredLots.map(lot => {
                  const isSelected = selectedLotIds.has(lot.id);
                  return (
                    <button key={lot.id} type="button" onClick={() => toggleLot(lot.id)}
                      className={`text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer
                        ${isSelected
                          ? 'bg-[#D5B042]/10 border-[#D5B042]/40 shadow-[0_0_12px_rgba(213,176,66,0.08)]'
                          : 'bg-black border-neutral-800/40 hover:border-neutral-700'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono font-bold text-xs text-[#D5B042]">{lot.name}</span>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors
                          ${isSelected ? 'bg-[#D5B042] border-[#D5B042]' : 'border-neutral-700'}`}>
                          {isSelected && <Check className="w-3 h-3 text-black" strokeWidth={3} />}
                        </div>
                      </div>
                      <p className="text-[10px] font-mono text-[#8C8C8C]">{lot.processName}</p>
                      <div className="mt-2 flex justify-between items-center">
                        <span className="text-xs font-mono font-bold text-[#E5E5E5]">{formatNumber(lot.availableWeight)} g</span>
                        <span className="text-[9px] font-mono text-[#8C8C8C] bg-black border border-neutral-800/20 px-1.5 py-0.5 rounded-full">
                          {lot.barCount} barras
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {filteredLots.length > 0 && (
              <div className="p-5 border-t border-neutral-800/20 bg-black/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8C8C8C]">PESO TOTAL A RETIRAR:</span>
                  <span className="text-lg font-bold text-[#D5B042] font-mono">
                    {formatNumber(totalWeight)} g
                  </span>
                  <span className="text-[10px] text-[#8C8C8C]/50 font-mono">
                    ({selectedLotIds.size} lote{selectedLotIds.size !== 1 ? 's' : ''})
                  </span>
                </div>
                <div className="flex gap-2">
                  {filteredLots.length > 0 && (
                    <button type="button" onClick={() => {
                      if (selectedLotIds.size === filteredLots.length) setSelectedLotIds(new Set());
                      else setSelectedLotIds(new Set(filteredLots.map(l => l.id)));
                    }}
                      className="text-[10px] font-mono text-[#D5B042] hover:text-[#D5B042]/80 transition-colors cursor-pointer px-3 py-2">
                      {selectedLotIds.size === filteredLots.length ? 'DESELECCIONAR TODO' : 'SELECCIONAR TODO'}
                    </button>
                  )}
                  <button type="submit" disabled={status === 'processing' || selectedLotIds.size === 0 || !destination}
                    className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_4px_12px_rgba(180,148,30,0.15)] transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-2">
                    {status === 'processing' ? (
                      <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> DESPLEGANDO...</>
                    ) : (
                      <><Send className="w-3.5 h-3.5" /> EJECUTAR SALIDA</>
                    )}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {status === 'success' && dispatchResult && (
            <motion.div key="dispatch-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
                className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
                <div className="p-6 flex flex-col items-center space-y-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                    <Check className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
                  </motion.div>
                  <p className="text-sm font-sans font-bold text-emerald-400">Despacho Exitoso</p>
                  <p className="text-xs text-[#8C8C8C] text-center">{message}</p>

                  <div className="w-full p-4 bg-black rounded-xl border border-neutral-800/40 space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-[#8C8C8C]">Cliente:</span>
                      <span className="text-[#E5E5E5] font-bold">{dispatchResult.clientName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8C8C8C]">Destino:</span>
                      <span className="text-[#D5B042] font-bold">{dispatchResult.destination}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8C8C8C]">Peso Total:</span>
                      <span className="text-[#E5E5E5] font-bold">{formatNumber(dispatchResult.totalWeight)} g</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8C8C8C]">Lotes:</span>
                      <span className="text-[#E5E5E5]">{dispatchResult.lotCount}</span>
                    </div>
                  </div>

                  <div className="flex gap-3 w-full">
                    <button onClick={() => {
                      generateDispatchPDF(dispatchResult);
                    }}
                      className="flex-1 py-2.5 px-4 bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5">
                      <Download className="w-3.5 h-3.5" /> Descargar PDF
                    </button>
                    <button onClick={() => { setDispatchResult(null); setStatus('idle'); }}
                      className="py-2.5 px-4 bg-black border border-neutral-800/40 text-gray-300 font-semibold text-xs rounded-xl hover:bg-[#141414] transition-colors cursor-pointer">
                      Cerrar
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {status === 'error' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="p-4 rounded-xl border text-xs flex items-center gap-2 bg-red-500/10 border-red-500/30 text-red-400">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
