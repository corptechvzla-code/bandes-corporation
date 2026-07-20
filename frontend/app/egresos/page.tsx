'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { jsPDF } from 'jspdf';
import { useClients } from '@/hooks/useClients';
import { useProcesses } from '@/hooks/useProcesses';
import { useCreateMaterialExit } from '@/hooks/useExits';
import { useBars } from '@/hooks/useBars';
import { formatNumber, formatWeight } from '@/lib/format';
import { useGoldTraceability } from '@/context/GoldTraceabilityContext';
import {
  ArrowLeftRight, User, Sparkles, AlertTriangle, Check, Send, Search,
  Grid, List, Coins, Download, X, RefreshCw, Plus, ChevronDown, Trash2,
  Users, UserPlus,
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
  const { data: clients = [] } = useClients({ role: 'CLIENTE' });
  const { data: bars = [] } = useBars();
  const { data: processes = [] } = useProcesses();
  const createExit = useCreateMaterialExit();
  const { weightUnit } = useGoldTraceability();

  const [activeClientIds, setActiveClientIds] = useState<string[]>([]);
  const [selectedTerminalClientId, setSelectedTerminalClientId] = useState<string>('');
  const [clientRequiredGrams, setClientRequiredGrams] = useState<Record<string, string>>({});
  const [assignedLots, setAssignedLots] = useState<Record<string, string[]>>({});
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [destination, setDestination] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');
  const [dispatchResult, setDispatchResult] = useState<DispatchResultData | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [proveedorFilter, setProveedorFilter] = useState<string>('');

  const allAvailableLots = useMemo(() => {
    return processes
      .filter(p => p.status === 'CLOSED')
      .flatMap(p => (p.lots || [])
        .filter(l => l.recovered !== null && l.recovered !== undefined && Number(l.recovered) > 0)
        .map(l => ({
          id: l.id,
          name: l.name,
          processName: p.name,
          processId: p.id,
          clientId: p.clientId,
          availableWeight: Number(l.recovered),
          barCount: bars.filter(b => b.lotId === l.id && b.status !== 'EXITED').length,
        }))
      );
  }, [processes, bars]);

  const proveedoresUnicos = useMemo(() => {
    const ids = [...new Set(allAvailableLots.map(l => l.clientId))];
    return ids.map(id => clients.find(c => c.id === id)).filter(Boolean) as typeof clients;
  }, [allAvailableLots, clients]);

  const focusedClientLots = useMemo(() => {
    if (!selectedTerminalClientId) return [];
    return allAvailableLots.filter(l => {
      const assignees = assignedLots[l.id] || [];
      return assignees.includes(selectedTerminalClientId);
    });
  }, [allAvailableLots, assignedLots, selectedTerminalClientId]);

  const unassignedLots = useMemo(() => {
    if (!selectedTerminalClientId) return [];
    return allAvailableLots.filter(l => {
      const assignees = assignedLots[l.id] || [];
      return !assignees.includes(selectedTerminalClientId);
    });
  }, [allAvailableLots, assignedLots, selectedTerminalClientId]);

  const filteredUnassignedLots = useMemo(() => {
    let lots = unassignedLots;
    if (proveedorFilter) {
      lots = lots.filter(l => l.clientId === proveedorFilter);
    }
    if (searchTerm) {
      const q = searchTerm.toUpperCase();
      lots = lots.filter(l =>
        l.name.toUpperCase().includes(q) ||
        l.processName.toUpperCase().includes(q)
      );
    }
    return lots;
  }, [unassignedLots, searchTerm, proveedorFilter]);

  const focusedClientGrams = useMemo(() => {
    return focusedClientLots.reduce((sum, l) => sum + l.availableWeight, 0);
  }, [focusedClientLots]);

  const requiredGramsVal = useMemo(() => {
    const val = clientRequiredGrams[selectedTerminalClientId];
    return val ? parseFloat(val) : 0;
  }, [clientRequiredGrams, selectedTerminalClientId]);

  const remainingNeeded = useMemo(() => {
    if (!requiredGramsVal || requiredGramsVal <= 0) return 0;
    return Math.max(0, requiredGramsVal - focusedClientGrams);
  }, [requiredGramsVal, focusedClientGrams]);

  const showNoGoldAlert = useMemo(() => {
    if (!selectedTerminalClientId || !requiredGramsVal || requiredGramsVal <= 0) return false;
    if (remainingNeeded <= 0) return false;
    const totalUnassigned = unassignedLots.reduce((sum, l) => sum + l.availableWeight, 0);
    return totalUnassigned < remainingNeeded;
  }, [selectedTerminalClientId, requiredGramsVal, remainingNeeded, unassignedLots]);

  const getClientTotals = (clientId: string) => {
    const clientLots = allAvailableLots.filter(l => {
      const assignees = assignedLots[l.id] || [];
      return assignees.includes(clientId);
    });
    const grams = clientLots.reduce((sum, l) => sum + l.availableWeight, 0);
    return { count: clientLots.length, grams };
  };

  const handleToggleClient = (clientId: string) => {
    setActiveClientIds(prev => {
      if (prev.includes(clientId)) {
        setAssignedLots(curr => {
          const updated = { ...curr };
          Object.keys(updated).forEach(lotId => {
            updated[lotId] = updated[lotId].filter(cid => cid !== clientId);
            if (updated[lotId].length === 0) delete updated[lotId];
          });
          return updated;
        });
        return prev.filter(id => id !== clientId);
      } else {
        if (prev.length === 0) setSelectedTerminalClientId(clientId);
        return [...prev, clientId];
      }
    });
  };

  const handleAssignLot = (lotId: string) => {
    if (!selectedTerminalClientId) return;
    setAssignedLots(prev => {
      const current = prev[lotId] || [];
      if (!current.includes(selectedTerminalClientId)) {
        return { ...prev, [lotId]: [...current, selectedTerminalClientId] };
      }
      return prev;
    });
  };

  const handleRemoveLot = (lotId: string) => {
    setAssignedLots(prev => {
      const updated = { ...prev };
      if (updated[lotId]) {
        updated[lotId] = updated[lotId].filter(cid => cid !== selectedTerminalClientId);
        if (updated[lotId].length === 0) delete updated[lotId];
      }
      return updated;
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
    doc.text(`PESO ASIGNADO (${weightUnit.toUpperCase()})`, margin + 100, y + 1);
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
      const lotDisplay = weightUnit === 'kg' ? `${(lot.weight / 1000).toFixed(4)} kg` : `${lot.weight.toFixed(2)} g`;
      doc.text(lotDisplay, margin + 100, y + 1);
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
    const totalDisplay = weightUnit === 'kg' ? `${(data.totalWeight / 1000).toFixed(4)} kg` : `${data.totalWeight.toFixed(2)} g`;
    doc.text(`PESO TOTAL DESPACHADO: ${totalDisplay}`, margin, y);
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
  }, [weightUnit]);

  const handleDispatch = async () => {
    if (focusedClientLots.length === 0 || !destination) return;

    setStatus('processing');
    setMessage('');

    try {
      const result = await createExit.mutateAsync({
        destination: destination.toUpperCase(),
        lotIds: focusedClientLots.map(l => l.id),
      });

      const clientName = clients.find(c => c.id === selectedTerminalClientId)?.name || 'Desconocido';

      setDispatchResult({
        clientName,
        destination: result.destination,
        reference: `DESP-${Date.now().toString(36).toUpperCase()}`,
        totalWeight: result.totalWeight,
        lotCount: focusedClientLots.length,
        lots: focusedClientLots.map(l => ({ name: l.name, weight: l.availableWeight })),
        createdAt: new Date().toISOString(),
      });

      setStatus('success');
      setMessage(`EGRESO DESPLEGADO — ${result.destination} — ${formatWeight(result.totalWeight, weightUnit)}`);

      setAssignedLots(prev => {
        const updated = { ...prev };
        focusedClientLots.forEach(l => delete updated[l.id]);
        return updated;
      });
    } catch (err: any) {
      setStatus('error');
      setMessage(err?.response?.data?.message || 'ERROR EN DESPLIEGUE');
    }
  };

  const hasActiveClients = activeClientIds.length > 0;
  const focusedClient = clients.find(c => c.id === selectedTerminalClientId);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-8 h-8 text-[#D5B042] filter drop-shadow-[0_0_8px_rgba(213,176,66,0.3)]" />
            Salida <span className="text-[#D5B042] font-semibold"> de Material</span>
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Gestione m&uacute;ltiples clientes. Asigne lotes de oro fino y ejecute las salidas.
          </p>
        </div>

        <div className="relative shrink-0 self-start sm:self-auto">
          <button type="button" onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-[#1C1C1C] hover:bg-[#252525] border border-neutral-800/80 rounded-lg text-[11px] font-mono font-bold uppercase text-[#D5B042] hover:text-white transition-all cursor-pointer shadow-md">
            <UserPlus className="w-3.5 h-3.5 text-[#D5B042]" />
            Seleccionar Clientes ({activeClientIds.length})
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSelectorOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isSelectorOpen && (
              <motion.div key="client-selector"
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-1.5 w-64 bg-[#1C1C1C] border border-neutral-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-3.5 z-40 space-y-2.5">
                <div className="flex items-center justify-between border-b border-neutral-800/40 pb-1.5">
                  <span className="text-[9px] font-mono text-[#8C8C8C] uppercase font-bold tracking-wider">Habilitar Clientes</span>
                  <button type="button" onClick={() => setActiveClientIds([])}
                    className="text-[8px] font-mono text-red-400 hover:text-red-300">Cerrar todos</button>
                </div>
                <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                  {clients.map(c => {
                    const isChecked = activeClientIds.includes(c.id);
                    const totals = getClientTotals(c.id);
                    return (
                      <label key={c.id} onClick={(e) => { e.preventDefault(); handleToggleClient(c.id); }}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-black/40 transition-colors cursor-pointer text-[11px]">
                        <div className="flex items-center gap-2">
                          <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors
                            ${isChecked ? 'bg-[#D5B042] border-[#D5B042] text-black' : 'border-neutral-700 bg-black'}`}>
                            {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                          </div>
                          <div className="truncate max-w-[150px]">
                            <span className="font-semibold block text-neutral-200 truncate">{c.name}</span>
                            <span className="text-[8px] text-[#8C8C8C] font-mono block truncate">{c.rif}</span>
                          </div>
                        </div>
                        {totals.count > 0 && (
                          <span className="text-[8px] font-mono bg-[#D5B042]/10 text-[#D5B042] px-1.5 py-0.2 rounded-full font-bold shrink-0">{formatWeight(totals.grams, weightUnit)}</span>
                        )}
                      </label>
                    );
                  })}
                </div>
                <div className="border-t border-neutral-800/40 pt-1.5 flex justify-end">
                  <button type="button" onClick={() => setIsSelectorOpen(false)}
                    className="py-0.5 px-2 bg-black hover:bg-neutral-900 border border-neutral-800/60 rounded text-[9px] font-mono font-bold uppercase transition-colors">Listo</button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {hasActiveClients && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-950/40 border border-neutral-900/60 p-2.5 rounded-xl flex flex-wrap items-center gap-2">
            <span className="text-[8px] font-mono text-[#8C8C8C] uppercase font-bold tracking-wider px-1.5 flex items-center gap-1">
              <Users className="w-3 h-3 text-[#D5B042]" />
              Clientes Abiertos:
            </span>
            <div className="flex flex-wrap gap-1">
              {activeClientIds.map(cid => {
                const client = clients.find(c => c.id === cid);
                if (!client) return null;
                const totals = getClientTotals(cid);
                const isActive = selectedTerminalClientId === cid;
                return (
                  <div key={cid}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-mono transition-all cursor-pointer
                      ${isActive ? 'bg-[#D5B042]/10 border-[#D5B042] text-white shadow-[0_2px_8px_rgba(213,176,66,0.12)] font-bold' : 'bg-[#1C1C1C] border-neutral-800/50 text-neutral-400 hover:text-white'}`}
                    onClick={() => setSelectedTerminalClientId(cid)}>
                    <span className="truncate max-w-[100px]">{client.rif.slice(0, 8)}</span>
                     <span className={`text-[9px] font-bold ${isActive ? 'text-[#D5B042]' : 'text-neutral-500'}`}>{formatWeight(totals.grams, weightUnit)}</span>
                    <button type="button" onClick={(e) => { e.stopPropagation(); handleToggleClient(cid); }}
                      className="p-0.5 rounded-full hover:bg-black/35 text-neutral-500 hover:text-red-400 transition-colors">
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedTerminalClientId && focusedClient && (
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="xl:col-span-2 bg-[#1C1C1C] rounded-2xl border border-neutral-800/40 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <div className="p-5 border-b border-neutral-800/20 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[8px] font-mono text-[#D5B042] bg-[#D5B042]/10 border border-[#D5B042]/20 px-1.5 py-0.2 rounded uppercase tracking-wider font-bold">Terminal Activa</span>
                  <h3 className="font-sans font-bold text-[#E5E5E5] text-sm mt-0.5">{focusedClient.name}</h3>
                  <p className="text-[9px] font-mono text-[#8C8C8C]">RIF: {focusedClient.rif}</p>
                </div>
                <button type="button" onClick={() => handleToggleClient(selectedTerminalClientId)}
                  className="text-[9px] font-mono text-red-400 hover:text-red-300 bg-black/50 border border-neutral-800 px-2 py-0.5 rounded-md hover:border-red-500/30 transition-all cursor-pointer">Cerrar terminal</button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="text-[8px] font-mono text-[#8C8C8C] uppercase">Oro Requerido (g) - Opcional</label>
                  <input type="number" placeholder="Ej: 500"
                    value={clientRequiredGrams[selectedTerminalClientId] || ''}
                    onChange={(e) => setClientRequiredGrams(prev => ({ ...prev, [selectedTerminalClientId]: e.target.value }))}
                    className="w-full bg-black border border-neutral-800/40 rounded-md px-2.5 py-1.5 text-[11px] font-mono text-[#E5E5E5] focus:outline-none focus:border-[#D5B042]" />
                </div>
              </div>
            </div>

            <div className="p-5 space-y-3">
              <span className="text-[8px] font-mono text-[#8C8C8C] uppercase tracking-wider block">Lotes Asignados</span>

              {showNoGoldAlert && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                  <div>
                    <span className="font-bold block uppercase text-[8px] tracking-wider mb-0.5">&iexcl;Alerta de Abastecimiento!</span>
                    No hay suficiente oro disponible. Faltan <strong className="text-white font-mono">{remainingNeeded.toFixed(1)} g</strong> por cubrir.
                  </div>
                </div>
              )}

              {focusedClientLots.length === 0 ? (
                <div className="text-center py-6 bg-black border border-dashed border-neutral-800/30 rounded-lg text-[#8C8C8C] text-[10.5px] font-mono">
                  <Coins className="w-4 h-4 text-neutral-800 mx-auto mb-1 animate-pulse" />
                  Ning&uacute;n lote asignado todav&iacute;a.
                  <div className="text-[8.5px] text-[#8C8C8C]/50 mt-0.5">Haga clic en un lote del panel derecho para asignarlo.</div>
                </div>
              ) : (
                <div className="bg-black border border-neutral-800/40 rounded-lg p-1.5 divide-y divide-neutral-800/15 max-h-48 overflow-y-auto space-y-0.5">
                  {focusedClientLots.map(lot => (
                    <div key={lot.id} className="py-1 px-1 flex justify-between items-center text-[11px] font-mono">
                      <div>
                        <span className="font-bold text-[#E5E5E5]">{lot.name}</span>
                        <div className="text-[8.5px] text-[#8C8C8C]/50">{lot.processName}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#D5B042]">{formatWeight(lot.availableWeight, weightUnit)}</span>
                        <button type="button" onClick={() => handleRemoveLot(lot.id)}
                          className="text-neutral-700 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                          title="Quitar asignaci&oacute;n">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-black p-3 rounded-lg border border-neutral-800/40 space-y-2">
                <div className="font-mono text-[11px]">
                  <span className="text-[#8C8C8C] block uppercase text-[8px]">Masa Acumulada</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-[#D5B042] font-bold text-xs">{formatWeight(focusedClientGrams, weightUnit)}</span>
                    {requiredGramsVal > 0 && (
                      <span className="text-[9px] text-[#8C8C8C] font-semibold">
                        / {formatNumber(requiredGramsVal)} g req
                      </span>
                    )}
                  </div>
                  {requiredGramsVal > 0 && (
                    <div className="w-32 bg-neutral-900 rounded-full h-1 mt-1 overflow-hidden border border-neutral-800/40">
                      <div className="bg-gradient-to-r from-[#A65B17] to-[#D5B042] h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (focusedClientGrams / requiredGramsVal) * 100)}%` }} />
                    </div>
                  )}
                </div>

                <button type="button" onClick={handleDispatch}
                  disabled={focusedClientLots.length === 0 || status === 'processing' || !destination}
                  className={`w-full py-2 rounded-lg font-mono font-bold text-[9px] uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5
                    ${focusedClientLots.length > 0 && destination
                      ? 'bg-gradient-to-r from-[#A65B17] to-[#D5B042] text-black hover:brightness-110 shadow-[0_2px_8px_rgba(166,91,23,0.12)]'
                      : 'bg-neutral-900 text-neutral-700 cursor-not-allowed border border-neutral-800/20'}`}>
                  {status === 'processing' ? (
                    <><RefreshCw className="w-3 h-3 animate-spin" /> DESPLEGANDO...</>
                  ) : (
                    <><Send className="w-3 h-3" /> Despachar {focusedClientLots.length} lote{focusedClientLots.length !== 1 ? 's' : ''}</>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="xl:col-span-3 bg-[#1C1C1C] rounded-2xl border border-neutral-800/40 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <div className="p-5 border-b border-neutral-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-[#D5B042]" />
                <span className="text-xs font-semibold text-[#E5E5E5] uppercase tracking-wider">
                  B&oacute;veda de Lotes Disponibles
                </span>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <select value={proveedorFilter} onChange={(e) => setProveedorFilter(e.target.value)}
                  className="bg-black border border-neutral-800/40 rounded-lg px-2 py-1.5 text-[10px] font-mono text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] w-28">
                  <option value="">Todos</option>
                  {proveedoresUnicos.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
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
                {filteredUnassignedLots.length > 0 && (
                  <span className="text-[10px] font-mono text-[#8C8C8C]">
                    {focusedClientLots.length} asignados de {allAvailableLots.length}
                  </span>
                )}
              </div>
            </div>

            {filteredUnassignedLots.length === 0 ? (
              <div className="p-10 text-center">
                <Sparkles className="w-8 h-8 text-[#8C8C8C]/30 mx-auto mb-3" />
                <p className="text-xs text-[#8C8C8C]">
                  {searchTerm ? 'No se encontraron lotes con ese criterio.' : 'No hay lotes disponibles.'}
                </p>
                <p className="text-[10px] text-[#8C8C8C]/50 mt-1">
                  Aseg&uacute;rese de que el cliente tenga procesos cerrados con recuperaci&oacute;n registrada.
                </p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-neutral-800/20 text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider bg-black/50">
                      <th className="py-3 pl-5 w-20 text-center">Asignar</th>
                      <th className="py-3">Proceso</th>
                      <th className="py-3">Lote</th>
                      <th className="py-3 text-right pr-5">Peso Disponible ({weightUnit.toUpperCase()})</th>
                      <th className="py-3 text-center">Barras</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/20">
                    {filteredUnassignedLots.map(lot => (
                      <tr key={lot.id} onClick={() => handleAssignLot(lot.id)}
                        className="hover:bg-[#141414]/80 transition-colors cursor-pointer">
                        <td className="py-3 pl-5 text-center">
                          <div className="w-5 h-5 rounded-full border-2 border-[#D5B042]/40 mx-auto flex items-center justify-center hover:bg-[#D5B042]/10 transition-colors">
                            <Plus className="w-3 h-3 text-[#D5B042]" />
                          </div>
                        </td>
                        <td className="py-3 font-mono text-[#E5E5E5]">{lot.processName}</td>
                        <td className="py-3 font-mono text-[#D5B042] font-bold">{lot.name}</td>
                        <td className="py-3 text-right font-mono text-[#E5E5E5] pr-5">
                          {formatWeight(lot.availableWeight, weightUnit)}
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
                {filteredUnassignedLots.map(lot => (
                  <button key={lot.id} type="button" onClick={() => handleAssignLot(lot.id)}
                    className="text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer bg-black border-neutral-800/40 hover:border-[#D5B042]/40 hover:bg-[#D5B042]/5 group">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-mono font-bold text-xs text-[#D5B042]">{lot.name}</span>
                      <div className="w-5 h-5 rounded-full border-2 border-[#D5B042]/40 flex items-center justify-center group-hover:bg-[#D5B042]/10 transition-colors">
                        <Plus className="w-3 h-3 text-[#D5B042]" />
                      </div>
                    </div>
                    <p className="text-[10px] font-mono text-[#8C8C8C]">{lot.processName}</p>
                    <div className="mt-2 flex justify-between items-center">
                      <span className="text-xs font-mono font-bold text-[#E5E5E5]">{formatWeight(lot.availableWeight, weightUnit)}</span>
                      <span className="text-[9px] font-mono text-[#8C8C8C] bg-black border border-neutral-800/20 px-1.5 py-0.5 rounded-full">
                        {lot.barCount} barras
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {!selectedTerminalClientId && hasActiveClients && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-16 bg-black/45 border border-dashed border-neutral-800/40 rounded-2xl">
          <User className="w-10 h-10 text-[#D5B042]/40 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-[#E5E5E5]">Seleccione una terminal</h4>
          <p className="text-xs text-[#8C8C8C] mt-1 max-w-md mx-auto">
            Haga clic en un cliente en la barra superior para ver sus lotes asignados y gestionar el despacho.
          </p>
        </motion.div>
      )}

      {!hasActiveClients && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-20 bg-black/45 border border-dashed border-neutral-800/40 rounded-2xl space-y-4">
          <User className="w-10 h-10 text-[#D5B042]/40 mx-auto animate-bounce" />
          <h4 className="text-sm font-semibold text-[#E5E5E5]">Mesa de despacho vac&iacute;a</h4>
          <p className="text-xs text-[#8C8C8C] max-w-sm mx-auto leading-relaxed">
            Haga clic en el bot&oacute;n superior de &quot;Administrar Clientes&quot; para habilitar las terminales de despacho.
          </p>
          <button type="button" onClick={() => setIsSelectorOpen(true)}
            className="py-2 px-4 bg-[#D5B042] text-black font-semibold text-xs rounded-xl font-mono uppercase transition-transform hover:scale-105 inline-flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Seleccionar Clientes
          </button>
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
                    <span className="text-[#E5E5E5] font-bold">{formatWeight(dispatchResult.totalWeight, weightUnit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#8C8C8C]">Lotes:</span>
                    <span className="text-[#E5E5E5]">{dispatchResult.lotCount}</span>
                  </div>
                </div>

                <div className="flex gap-3 w-full">
                  <button onClick={() => generateDispatchPDF(dispatchResult)}
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
    </motion.div>
  );
}
