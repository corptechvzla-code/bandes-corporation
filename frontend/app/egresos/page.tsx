'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useClients } from '@/hooks/useClients';
import { useAvailableLots } from '@/hooks/useProcesses';
import { useCreateMaterialExit } from '@/hooks/useExits';
import { formatNumber } from '@/lib/format';
import {
  ArrowLeftRight, User, Sparkles, AlertTriangle, Check, Send, Search,
} from 'lucide-react';

export default function EgresosPage() {
  const { data: clients = [] } = useClients();
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const { data: availableLots = [] } = useAvailableLots(selectedClientId);
  const createExit = useCreateMaterialExit();

  const [selectedLotIds, setSelectedLotIds] = useState<Set<string>>(new Set());
  const [destination, setDestination] = useState<string>('');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState<string>('');

  const allLots = useMemo(() => {
    return availableLots.flatMap(p =>
      p.lots.map(lot => ({
        ...lot,
        processName: p.name,
        processId: p.id,
      })),
    );
  }, [availableLots]);

  const totalWeight = useMemo(() => {
    return allLots
      .filter(lot => selectedLotIds.has(lot.id))
      .reduce((sum, lot) => sum + lot.availableWeight, 0);
  }, [allLots, selectedLotIds]);

  const toggleLot = (lotId: string) => {
    setSelectedLotIds(prev => {
      const next = new Set(prev);
      if (next.has(lotId)) next.delete(lotId);
      else next.add(lotId);
      return next;
    });
  };

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
            Salida de Material <span className="text-[#D5B042] font-semibold">Egreso por Lotes</span>
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Seleccione un cliente, marque los lotes a despachar y ejecute la salida.
          </p>
        </div>
      </motion.div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Cliente</label>
              <select value={selectedClientId} onChange={(e) => { setSelectedClientId(e.target.value); setSelectedLotIds(new Set()); }}
                className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors cursor-pointer">
                <option value="">SELECCIONAR CLIENTE...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Destino</label>
              <input type="text" placeholder="Nombre del destino / entidad receptora" value={destination}
                onChange={(e) => setDestination(e.target.value.toUpperCase())} required
                className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors uppercase placeholder:text-neutral-800" />
            </div>
          </div>
        </div>

        {selectedClientId && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-[#1C1C1C] rounded-2xl border border-neutral-800/40 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">

            <div className="p-5 border-b border-neutral-800/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-[#D5B042]" />
                <span className="text-xs font-semibold text-[#E5E5E5] uppercase tracking-wider">
                  Lotes Disponibles para Egreso
                </span>
              </div>
              <div className="flex items-center gap-3">
                {allLots.length > 0 && (
                  <>
                    <span className="text-[10px] font-mono text-[#8C8C8C]">
                      {selectedLotIds.size} de {allLots.length} seleccionados
                    </span>
                    <button type="button" onClick={() => {
                      if (selectedLotIds.size === allLots.length) setSelectedLotIds(new Set());
                      else setSelectedLotIds(new Set(allLots.map(l => l.id)));
                    }}
                      className="text-[10px] font-mono text-[#D5B042] hover:text-[#D5B042]/80 transition-colors cursor-pointer">
                      {selectedLotIds.size === allLots.length ? 'DESELECCIONAR TODO' : 'SELECCIONAR TODO'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {allLots.length === 0 ? (
              <div className="p-10 text-center">
                <Sparkles className="w-8 h-8 text-[#8C8C8C]/30 mx-auto mb-3" />
                <p className="text-xs text-[#8C8C8C]">No hay lotes disponibles para este cliente.</p>
                <p className="text-[10px] text-[#8C8C8C]/50 mt-1">
                  Asegúrese de que el cliente tenga procesos cerrados con barras en stock.
                </p>
              </div>
            ) : (
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
                    {allLots.map(lot => (
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
            )}

            {allLots.length > 0 && (
              <div className="p-5 border-t border-neutral-800/20 bg-black/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#8C8C8C]">PESO TOTAL A RETIRAR:</span>
                  <span className="text-lg font-bold text-[#D5B042] font-mono">
                    {formatNumber(totalWeight)} g
                  </span>
                  <span className="text-[10px] text-[#8C8C8C]/50 font-mono">
                    ({selectedLotIds.size} lote{selectedLotIds.size !== 1 ? 's' : ''})
                  </span>
                </div>
                <button type="submit" disabled={status === 'processing' || selectedLotIds.size === 0 || !destination}
                  className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-bold text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_4px_12px_rgba(180,148,30,0.15)] transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-2">
                  {status === 'processing' ? (
                    'DESPLEGANDO...'
                  ) : (
                    <><Send className="w-3.5 h-3.5" /> EJECUTAR SALIDA</>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        )}

        <AnimatePresence>
          {(status === 'success' || status === 'error') && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className={`p-4 rounded-xl border text-xs flex items-center gap-2
                ${status === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'}`}>
              {status === 'success' ? <Check className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              {message}
            </motion.div>
          )}
        </AnimatePresence>
      </form>
    </motion.div>
  );
}
