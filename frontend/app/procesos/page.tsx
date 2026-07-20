'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Flame, Thermometer, User, Clock, Plus, CheckCircle2, Play,
  ChevronRight, Sparkles, Layers, Lock, AlertTriangle, Info,
  Weight, Microscope,
} from 'lucide-react';
import { useClients } from '@/hooks/useClients';
import { useBars, useUpdateBar } from '@/hooks/useBars';
import { useProcesses, useCreateProcess, useUpdateProcess } from '@/hooks/useProcesses';
import { useLots, useCreateLot, useUpdateLot } from '@/hooks/useLots';
import { formatNumber, formatWeight } from '@/lib/format';
import { useGoldTraceability } from '@/context/GoldTraceabilityContext';
import type { Process, Lot, Bar } from '@/types/api';

export default function ProcesosPage() {
  const { data: bars = [] } = useBars();
  const { data: clients = [] } = useClients();
  const { weightUnit } = useGoldTraceability();
  const { data: processes = [] } = useProcesses();
  const { data: lots = [] } = useLots();

  const createProcess = useCreateProcess();
  const createLot = useCreateLot();
  const updateBar = useUpdateBar();
  const updateLot = useUpdateLot();
  const updateProcess = useUpdateProcess();

  const [showForm, setShowForm] = useState(false);
  const [selectedBarIds, setSelectedBarIds] = useState<string[]>([]);
  const [moldCode, setMoldCode] = useState('');
  const [operator, setOperator] = useState('');
  const [castingTemp, setCastingTemp] = useState('1064');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [batchError, setBatchError] = useState('');
  const [batchSuccess, setBatchSuccess] = useState('');
  const [activeLotEl, setActiveLotEl] = useState<Lot | null>(null);
  const [recoveredWeight, setRecoveredWeight] = useState('');
  const [recoveredLey, setRecoveredLey] = useState('');
  const [recoveredLeyAg, setRecoveredLeyAg] = useState('');
  const [modalError, setModalError] = useState('');
  const [creating, setCreating] = useState(false);

  const availableBars = useMemo(() => bars.filter(b => b.status === 'IN_STOCK' && !b.lotId), [bars]);

  const activeProcesses = useMemo(() => processes.filter(p => p.status === 'OPEN'), [processes]);

  const groupedProcesses = useMemo(() => {
    const groups: Record<string, Process[]> = {};
    activeProcesses.forEach(p => {
      if (!groups[p.clientId]) groups[p.clientId] = [];
      groups[p.clientId].push(p);
    });
    return groups;
  }, [activeProcesses]);

  const selectedMetrics = useMemo(() => {
    const sel = bars.filter(b => selectedBarIds.includes(b.id));
    const weight = sel.reduce((s, b) => s + Number(b.grossWeight), 0);
    const fino = sel.reduce((s, b) => s + Number(b.fineWeight), 0);
    return { weight, fino, count: sel.length };
  }, [bars, selectedBarIds]);

  const clientFilteredBars = useMemo(() => {
    if (!selectedClientId) return availableBars;
    return availableBars.filter(b => b.clientId === selectedClientId);
  }, [availableBars, selectedClientId]);

  const handleBarToggle = (id: string) => {
    setSelectedBarIds(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const handleClientChange = (cId: string) => {
    setSelectedClientId(cId);
    setSelectedBarIds([]);
  };

  const handleSelectAllBars = () => {
    if (selectedBarIds.length === clientFilteredBars.length) {
      setSelectedBarIds([]);
    } else {
      setSelectedBarIds(clientFilteredBars.map(b => b.id));
    }
  };

  const handleStartSmelting = async (e: React.FormEvent) => {
    e.preventDefault();
    setBatchError('');
    setBatchSuccess('');

    if (selectedBarIds.length === 0) {
      setBatchError('Debe seleccionar al menos una barra disponible en la bóveda.');
      return;
    }
    if (!moldCode.trim()) {
      setBatchError('Por favor asigne un código de crisol/molde.');
      return;
    }
    if (!operator.trim()) {
      setBatchError('Debe registrar el nombre del operador metalúrgico.');
      return;
    }

    const selectedBars = bars.filter(b => selectedBarIds.includes(b.id));
    const uniqueClients = [...new Set(selectedBars.map(b => b.clientId))];
    if (uniqueClients.length > 1) {
      setBatchError('No se pueden fundir juntos oros de distintos clientes. Seleccione barras de un solo cliente.');
      return;
    }

    setCreating(true);
    try {
      const clientId = uniqueClients[0];
      const processName = `P-${new Date().toISOString().slice(0, 10)}-${clientId.slice(0, 6)}`;

      const process = await createProcess.mutateAsync({ name: processName, clientId });
      const lot = await createLot.mutateAsync({
        name: `LOTE-${moldCode}`,
        processId: process.id,
        operator,
        castingTemp: parseInt(castingTemp) || 1064,
        moldCode,
      });

      for (const barId of selectedBarIds) {
        await updateBar.mutateAsync({ id: barId, data: { lotId: lot.id, status: 'PROCESANDO' } });
      }

      setBatchSuccess(`¡Proceso de fundición para ${selectedBarIds.length} barra(s) iniciado con éxito!`);
      setSelectedBarIds([]);
      setMoldCode('');
      setOperator('');
      setCastingTemp('1064');
      setCreating(false);
    } catch (err: any) {
      setBatchError(err?.message || 'Error al iniciar la fundición.');
      setCreating(false);
    }
  };

  const handleOpenRecoveryModal = (lot: Lot) => {
    const lotBars = bars.filter(b => b.lotId === lot.id);
    const expectedTotal = lotBars.reduce((s, b) => s + Number(b.fineWeight), 0);
    setActiveLotEl(lot);
    setRecoveredWeight(expectedTotal.toFixed(2));
    setRecoveredLey('');
    setRecoveredLeyAg('');
    setModalError('');
  };

  const handleCompleteCasting = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!activeLotEl) return;

    const recWeight = parseFloat(recoveredWeight);
    if (isNaN(recWeight) || recWeight <= 0) {
      setModalError('Por favor ingrese un peso recuperado válido.');
      return;
    }

    const lotBars = bars.filter(b => b.lotId === activeLotEl.id);
    const expectedTotal = lotBars.reduce((s, b) => s + Number(b.fineWeight), 0);
    const discrepancy = expectedTotal > 0 ? Math.abs(recWeight - expectedTotal) / expectedTotal : 0;

    if (discrepancy > 0.1) {
      if (!window.confirm(`Discrepancia del ${(discrepancy * 100).toFixed(1)}% detectada. ¿Desea proceder con esta calibración?`)) {
        return;
      }
    }

    try {
      await updateLot.mutateAsync({
        id: activeLotEl.id,
        data: { recovered: recWeight, recoveryAt: new Date().toISOString() },
      });
      await updateProcess.mutateAsync({
        id: activeLotEl.processId,
        data: { status: 'CLOSED' },
      });
      for (const bar of lotBars) {
        await updateBar.mutateAsync({ id: bar.id, data: { status: 'IN_STOCK' } });
      }
      setActiveLotEl(null);
      setRecoveredWeight('');
    } catch (err: any) {
      setModalError(err?.message || 'Error al completar la fundición.');
    }
  };

  const lotBarsMap = useMemo(() => {
    const map: Record<string, Bar[]> = {};
    bars.forEach(b => {
      if (b.lotId) {
        if (!map[b.lotId]) map[b.lotId] = [];
        map[b.lotId].push(b);
      }
    });
    return map;
  }, [bars]);

  const processLotsMap = useMemo(() => {
    const map: Record<string, Lot[]> = {};
    lots.forEach(l => {
      if (!map[l.processId]) map[l.processId] = [];
      map[l.processId].push(l);
    });
    return map;
  }, [lots]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
            <Flame className="w-8 h-8 text-[#A65B17] filter drop-shadow-[0_0_8px_rgba(166,91,23,0.3)] animate-pulse" />
            Monitoreo  <span className="text-[#D5B042] font-semibold">de Procesos</span>
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Agrupe barras y registre la masa recuperada para la entrega.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold border transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-center
            ${showForm
              ? 'bg-[#1C1C1C] text-[#8C8C8C] border-neutral-800/40 hover:text-[#E5E5E5]'
              : 'bg-[#A65B17]/20 text-[#D5B042] border-[#A65B17]/30 hover:bg-[#A65B17]/30 shadow-[0_4px_12px_rgba(166,91,23,0.1)]'}`}
        >
          <Plus className={`w-4 h-4 transition-transform duration-200 ${showForm ? 'rotate-45 text-[#8C8C8C]' : 'text-[#D5B042]'}`} />
          {showForm ? 'Cerrar Formulario' : 'Nueva Fundición'}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">

        <AnimatePresence>
        {showForm && (
          <motion.div
            key="form-panel"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            transition={{ duration: 0.3 }}
            className="bg-[#1C1C1C] p-6 rounded-2xl border border-[#A65B17]/30 shadow-[0_8px_24px_rgba(0,0,0,0.4)] space-y-4"
          >
            <div className="border-b border-neutral-800/20 pb-3 flex justify-between items-center">
              <h3 className="text-sm font-semibold text-[#E5E5E5] uppercase tracking-wider flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#A65B17]" />
                Configurar Nueva Fundición
              </h3>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="text-[#8C8C8C] hover:text-[#E5E5E5] transition-colors p-1 rounded hover:bg-neutral-800/40 font-mono text-xs"
                title="Cerrar Formulario"
              >
                ✕
              </button>
            </div>

          {availableBars.length === 0 ? (
            <div className="text-center py-8 px-4 bg-black rounded-xl border border-dashed border-neutral-800/40 space-y-3">
              <Lock className="w-8 h-8 text-[#8C8C8C]/30 mx-auto" />
              <p className="text-xs text-[#8C8C8C]">No hay barras disponibles en la bóveda.</p>
              <p className="text-[10px] text-[#8C8C8C]/50">Registre nuevas barras en la sección de <strong className="text-[#D5B042]">Ingresos</strong> para habilitar moldes.</p>
            </div>
          ) : (
            <form onSubmit={handleStartSmelting} className="space-y-4">

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#8C8C8C] uppercase">Operador Metalúrgico</label>
                <input
                  type="text"
                  placeholder="Ej: Ing. Carlos Mendoza"
                  value={operator}
                  onChange={(e) => setOperator(e.target.value)}
                  className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#8C8C8C] uppercase">Molde / Crisol</label>
                  <input
                    type="text"
                    placeholder="Ej: CRISOL-B12"
                    value={moldCode}
                    onChange={(e) => setMoldCode(e.target.value)}
                    className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors uppercase"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-[#8C8C8C] uppercase">Temp. °C</label>
                  <input
                    type="number"
                    placeholder="1064"
                    value={castingTemp}
                    onChange={(e) => setCastingTemp(e.target.value)}
                    className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#8C8C8C] uppercase">Cliente</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientChange(e.target.value)}
                  className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors"
                >
                  <option value="">Todos los clientes</option>
                  {clients.filter(c => availableBars.some(b => b.clientId === c.id)).map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.rif.slice(0, 5)})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8C8C8C]">
                  <span className="uppercase">Selección de Barras en Bóveda</span>
                  <button
                    type="button"
                    onClick={handleSelectAllBars}
                    className="text-[#D5B042] hover:underline font-semibold"
                  >
                    {selectedBarIds.length === clientFilteredBars.length && clientFilteredBars.length > 0 ? 'Deseleccionar todo' : 'Seleccionar todo'}
                  </button>
                </div>

                <div className="bg-black border border-neutral-800/40 rounded-xl max-h-52 overflow-y-auto divide-y divide-neutral-800/20 p-2 space-y-1">
                  {clientFilteredBars.map(bar => {
                    const c = clients.find(cl => cl.id === bar.clientId);
                    const isChecked = selectedBarIds.includes(bar.id);
                    return (
                      <label
                        key={bar.id}
                        className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors text-xs font-mono
                          ${isChecked ? 'bg-[#1C1C1C] border border-[#A65B17]/40 text-[#D5B042]' : 'hover:bg-[#141414] border border-transparent text-[#8C8C8C]'}`}
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleBarToggle(bar.id)}
                            className="rounded border-neutral-800/40 bg-black text-[#D5B042] focus:ring-[#D5B042]/30"
                          />
                          <div>
                            <span className="font-bold text-[#E5E5E5] block">{bar.barNumber}</span>
                            <span className="text-[9px] text-[#8C8C8C]/50">{c?.rif.slice(0, 5)} • Ley {bar.purity}‰</span>
                          </div>
                        </div>
                        <span className="text-[#D5B042] font-semibold">{formatWeight(bar.grossWeight, weightUnit)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              {selectedMetrics.count > 0 && (
                <div className="bg-black border border-[#A65B17]/40 p-3 rounded-xl space-y-1.5 font-mono text-xs">
                  <div className="text-[#A65B17] text-[10px] uppercase flex justify-between">
                    <span>Masa de Fundición:</span>
                    <span>{selectedMetrics.count} barras</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-neutral-800/20">
                    <div>
                      <span className="text-[9px] text-[#8C8C8C]/50 uppercase block">Peso Bruto</span>
                      <strong className="text-[#E5E5E5] text-sm">{formatWeight(selectedMetrics.weight, weightUnit)}</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#8C8C8C]/50 uppercase block">Fino Au</span>
                      <strong className="text-[#D5B042] text-sm">{formatWeight(selectedMetrics.fino, weightUnit)}</strong>
                    </div>
                  </div>
                </div>
              )}

              {batchError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                  {batchError}
                </div>
              )}
              {batchSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg">
                  {batchSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#A65B17] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider hover:brightness-110 transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(166,91,23,0.15)] flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Play className="w-4 h-4 text-black fill-current" />
                {creating ? 'Creando...' : 'Iniciar Fundido de Lote'}
              </button>

            </form>
          )}
          </motion.div>
        )}
        </AnimatePresence>

        <div className={`${showForm ? 'xl:col-span-2' : 'xl:col-span-3'} space-y-6 transition-all duration-300`}>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, duration: 0.4 }}
              className="flex items-center gap-4 text-xs font-mono"
            >
              <span className="flex items-center gap-1.5 text-[#D5B042] bg-black border border-[#D5B042]/20 px-2.5 py-1 rounded">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping"></span>
                {activeProcesses.length} proceso(s) activo(s)
              </span>
            </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 80, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ delay: 0.45, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="relative bg-[#111111] border border-neutral-800/40 rounded-t-[100px] rounded-b-3xl shadow-[0_12px_40px_rgba(0,0,0,0.8)] overflow-hidden p-6 md:p-8 pt-16 flex flex-col items-center"
          >

            <div className="absolute inset-x-0 top-0 h-1 text-center font-mono text-[9px] text-neutral-800 tracking-widest pointer-events-none select-none uppercase">
              • INDUCTION HEATING MATRIX •
            </div>

            <div className="absolute top-0 w-44 h-44 bg-gradient-to-b from-amber-600/10 to-transparent rounded-full blur-2xl pointer-events-none"></div>

            <div className="absolute left-3 inset-y-12 w-1 flex flex-col justify-between opacity-20 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="w-full h-1 bg-amber-500 rounded"></span>
              ))}
            </div>
            <div className="absolute right-3 inset-y-12 w-1 flex flex-col justify-between opacity-20 pointer-events-none">
              {Array.from({ length: 24 }).map((_, i) => (
                <span key={i} className="w-full h-1 bg-amber-500 rounded"></span>
              ))}
            </div>

            <div className="text-center mb-8 space-y-1.5 z-10">
              <span className="text-[9px] font-mono bg-[#A65B17]/20 text-[#D5B042] px-3 py-1 rounded-full border border-[#A65B17]/30 uppercase tracking-widest font-bold">
                Reactor de Fundido Activo
              </span>
              <p className="text-[10px] text-[#8C8C8C] font-mono">ESTACIÓN TÉRMICA DE ALTA PRECISIÓN</p>
            </div>

            {activeProcesses.length === 0 ? (
              <div className="text-center py-20 px-6 space-y-4 z-10 w-full max-w-sm">
                <div className="w-16 h-16 rounded-full bg-neutral-900 border border-neutral-800 flex items-center justify-center mx-auto text-neutral-700 animate-pulse">
                  <Flame className="w-8 h-8 opacity-20 text-[#A65B17]" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Cámara Vacía</h4>
                  <p className="text-[11px] text-[#8C8C8C]/80 mt-1.5 leading-normal">
                    Todos los crisoles han sido solidificados. Seleccione barras disponibles haciendo clic en el botón <strong className="text-[#D5B042]">Nueva Fundición</strong> para configurar una nueva colada de fundido.
                  </p>
                  {!showForm && (
                    <button
                      type="button"
                      onClick={() => setShowForm(true)}
                      className="mt-5 px-4 py-2 bg-[#A65B17]/20 hover:bg-[#A65B17]/30 border border-[#A65B17]/30 text-[#D5B042] font-mono text-[10px] uppercase tracking-wider font-bold rounded-xl transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(166,91,23,0.1)]"
                    >
                      Configurar Fundición
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.5, ease: 'easeOut' }}
                className="w-full space-y-8 z-10"
              >

                {Object.keys(groupedProcesses).map((clientId, groupIdx) => {
                  const client = clients.find(c => c.id === clientId);
                  const clientProcesses = groupedProcesses[clientId];

                  return (
                    <motion.div
                      key={clientId}
                      initial={{ opacity: 0, y: 25 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 + groupIdx * 0.15, duration: 0.5, ease: 'easeOut' }}
                      className="border border-neutral-800/40 bg-black/40 rounded-2xl p-5 space-y-4 shadow-inner relative"
                    >
                      <div className="flex items-center justify-between border-b border-neutral-900 pb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></div>
                          <span className="text-xs font-bold text-[#E5E5E5] uppercase tracking-wider">
                            Proceso Padre: {client ? client.name : 'Desconocido'}
                          </span>
                        </div>
                        <span className="text-[9px] font-mono text-[#D5B042] bg-[#D5B042]/10 border border-[#D5B042]/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                          {clientProcesses.reduce((s, p) => s + (processLotsMap[p.id]?.length || 0), 0)} Sub-Lotes
                        </span>
                      </div>

                      <p className="text-[10px] text-[#8C8C8C] leading-normal italic">
                        *Procesos activos del cliente para fundido simultáneo e independiente.
                      </p>

                      {clientProcesses.map((process, procIdx) => {
                        const processLots = processLotsMap[process.id] || [];
                        return (
                          <div key={process.id} className="space-y-3">
                            <div className="text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider font-bold border-l-2 border-[#A65B17] pl-2">
                              {process.name}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {processLots.map((lot, lotIdx) => {
                                const lotBars = lotBarsMap[lot.id] || [];
                                const grossTotal = lotBars.reduce((s, b) => s + Number(b.grossWeight), 0);
                                const finoTotal = lotBars.reduce((s, b) => s + Number(b.fineWeight), 0);

                                return (
                                  <motion.div
                                    key={lot.id}
                                    initial={{ opacity: 0, y: 15, scale: 0.97 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    transition={{ delay: 1.25 + groupIdx * 0.15 + procIdx * 0.1 + lotIdx * 0.08, duration: 0.45, ease: 'easeOut' }}
                                    onClick={() => handleOpenRecoveryModal(lot)}
                                    className="bg-[#141414] border border-[#A65B17]/30 hover:border-[#D5B042] p-4 rounded-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer relative overflow-hidden flex flex-col justify-between shadow-lg group"
                                  >
                                    <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-gradient-to-tr from-[#A65B17]/10 to-transparent rounded-full pointer-events-none blur-xl animate-pulse"></div>

                                    <div className="space-y-3">

                                      <div className="flex justify-between items-start">
                                        <div>
                                          <span className="text-[8px] font-mono text-[#D5B042] bg-neutral-900 border border-[#A65B17]/30 px-1.5 py-0.5 rounded uppercase font-bold">
                                            {lot.moldCode || 'N/A'}
                                          </span>
                                          <h4 className="text-xs font-mono font-bold text-[#E5E5E5] mt-1">{lot.name}</h4>
                                        </div>
                                        <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-semibold uppercase bg-black text-[#A65B17] border border-[#A65B17]/30 animate-pulse">
                                          {lot.castingTemp || 1064}°C
                                        </span>
                                      </div>

                                      <div className="flex items-center justify-between text-[10px] font-mono text-[#8C8C8C]">
                                        <span className="truncate max-w-[120px]">{lot.operator || 'N/A'}</span>
                                        <span>{formatWeight(grossTotal, weightUnit)} Bruto</span>
                                      </div>

                                      <div className="space-y-1.5 bg-neutral-950 p-2.5 rounded-lg border border-neutral-900">
                                        <span className="text-[8px] text-[#8C8C8C]/50 uppercase font-mono block tracking-wider">
                                          Matriz de Lingotes Fundiéndose (Asientos):
                                        </span>

                                        {lotBars.length > 0 && (
                                          <div className="grid grid-cols-2 gap-1.5 pt-1">
                                            {lotBars.map((b) => (
                                              <div
                                                key={b.id}
                                                className="relative p-1.5 rounded bg-gradient-to-br from-[#1C1C1C] to-black border border-[#A65B17]/30 text-center flex flex-col justify-center items-center overflow-hidden hover:border-[#D5B042] transition-colors"
                                                title={`${b.barNumber} (${b.grossWeight}g)`}
                                              >
                                                <div className="absolute inset-x-0 bottom-0 h-0.5 bg-gradient-to-r from-[#A65B17] via-[#B4941E] to-[#D5B042] animate-pulse"></div>

                                                <span className="text-[9px] font-mono font-extrabold text-[#D5B042] tracking-wider block">
                                                  {b.barNumber.split('-').pop() || b.barNumber}
                                                </span>
                                                <span className="text-[8px] font-mono text-neutral-400">
                                                  {formatWeight(b.grossWeight, weightUnit)} | {b.purity}‰
                                                </span>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>

                                    </div>

                                    <div className="mt-3 pt-2 border-t border-neutral-900 flex justify-between items-center text-[9px] font-mono text-[#8C8C8C]">
                                      <span>TEMP: {lot.castingTemp || 1064}°C</span>
                                      <span className="text-[#D5B042] font-semibold group-hover:underline flex items-center gap-0.5">
                                        Calibrar Colada <ChevronRight className="w-3 h-3" />
                                      </span>
                                    </div>

                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                    </motion.div>
                  );
                })}

              </motion.div>
            )}

            <div className="w-2/3 h-2 bg-neutral-900 rounded-full mt-8 border border-neutral-800/40 relative overflow-hidden">
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-[#A65B17]/30 to-transparent animate-shine"></span>
            </div>

          </motion.div>

        </div>

      </div>

      {activeLotEl && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)] animate-scale-in">

            <div className="p-5 bg-gradient-to-b from-black/40 to-transparent border-b border-neutral-800/20 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono text-[#A65B17] bg-[#A65B17]/10 border border-[#A65B17]/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Cierre de Proceso Metalúrgico
                </span>
                <h3 className="text-lg font-sans font-bold text-[#E5E5E5] mt-2 tracking-wide">
                  Recuperación de Oro: <span className="text-[#D5B042]">{activeLotEl.name}</span>
                </h3>
                <p className="text-xs text-[#8C8C8C] mt-1">Registrar colada y calado de pureza química.</p>
              </div>
              <button
                onClick={() => setActiveLotEl(null)}
                className="text-[#8C8C8C] hover:text-[#E5E5E5] bg-black p-1.5 rounded-lg border border-neutral-800/40 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCompleteCasting} className="p-5 space-y-4">

              {(() => {
                const lotBars = bars.filter(b => b.lotId === activeLotEl.id);
                const grossTotal = lotBars.reduce((s, b) => s + Number(b.grossWeight), 0);
                const finoTotal = lotBars.reduce((s, b) => s + Number(b.fineWeight), 0);
                return (
                  <div className="bg-black p-3 rounded-xl border border-neutral-800/40 space-y-1 text-xs font-mono">
                    <div className="flex justify-between text-[#8C8C8C]">
                      <span>Masa Cargada Bruta:</span>
                      <span className="text-[#E5E5E5] font-bold">{formatWeight(grossTotal, weightUnit)}</span>
                    </div>
                    <div className="flex justify-between text-[#8C8C8C]">
                      <span>Fino Analítico (FA) Teórico:</span>
                      <span className="text-[#E5E5E5] font-bold">{formatWeight(finoTotal, weightUnit)}</span>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={recoveredWeight}
                    onChange={(e) => setRecoveredWeight(e.target.value)}
                    className="w-full bg-black border border-neutral-800/40 rounded-lg pl-4 pr-12 py-2 text-sm font-sans font-bold text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors"
                    required
                  />
                  <span className="absolute right-4 top-2.5 text-xs font-mono text-[#8C8C8C]">{weightUnit}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-[#8C8C8C] uppercase">Ley de Oro Recuperada</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="1000"
                      placeholder="Ej: 995"
                      value={recoveredLey}
                      onChange={(e) => setRecoveredLey(e.target.value)}
                      className="w-full bg-black border border-neutral-800/40 rounded-lg pl-4 pr-12 py-2 text-sm font-sans font-bold text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors"
                    />
                    <span className="absolute right-4 top-2.5 text-xs font-mono text-[#8C8C8C]">‰ Au</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-[#8C8C8C] uppercase">Ley de Plata Recuperada</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="0"
                      max="1000"
                      placeholder="Ej: 5"
                      value={recoveredLeyAg}
                      onChange={(e) => setRecoveredLeyAg(e.target.value)}
                      className="w-full bg-black border border-neutral-800/40 rounded-lg pl-4 pr-12 py-2 text-sm font-sans font-bold text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors"
                    />
                    <span className="absolute right-4 top-2.5 text-xs font-mono text-[#8C8C8C]">‰ Ag</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-800/20 pt-2 space-y-1">
                <span className="text-[9px] font-mono text-[#8C8C8C] uppercase tracking-wider block">Herramientas de Carga</span>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => alert('Conexión con báscula externa — Próximamente')}
                    className="flex flex-col items-center gap-1 py-2 bg-black border border-neutral-800/40 rounded-lg hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer">
                    <Weight className="w-4 h-4 text-emerald-400" />
                    <span className="text-[8px] font-mono text-[#8C8C8C] uppercase">Báscula</span>
                  </button>
                  <button type="button" onClick={() => alert('Conexión con espectrómetro — Próximamente')}
                    className="flex flex-col items-center gap-1 py-2 bg-black border border-neutral-800/40 rounded-lg hover:border-blue-500/30 hover:bg-blue-500/5 transition-all cursor-pointer">
                    <Microscope className="w-4 h-4 text-blue-400" />
                    <span className="text-[8px] font-mono text-[#8C8C8C] uppercase">Escaner</span>
                  </button>
                </div>
              </div>

              {modalError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                  {modalError}
                </div>
              )}

              <div className="flex gap-4 pt-3 border-t border-neutral-800/20">
                <button
                  type="button"
                  onClick={() => setActiveLotEl(null)}
                  className="flex-1 py-2.5 bg-black hover:bg-[#141414] border border-neutral-800/40 text-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar colada
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-gradient-to-r from-[#A65B17] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider hover:brightness-110 transition-all duration-200 rounded-xl cursor-pointer shadow-[0_4px_12px_rgba(166,91,23,0.3)] flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-black" />
                  Confirmar colada
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </motion.div>
  );
}
