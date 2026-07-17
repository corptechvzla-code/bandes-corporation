'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGoldTraceability } from '../../src/context/GoldTraceabilityContext';
import { CastingLot, GoldBar } from '../../src/types';
import { 
  ArrowLeftRight, 
  User, 
  Grid, 
  List, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  Coins, 
  Bookmark,
  Check,
  X,
  Trash2,
  Briefcase,
  Send,
  Plus,
  Users,
  ChevronDown,
  UserPlus,
  CheckCircle2
} from 'lucide-react';

export default function EgresosPage() {
  const { suppliers, goldBars, castingLots, createEgreso } = useGoldTraceability();

  const [activeClientIds, setActiveClientIds] = useState<string[]>(() => {
    return suppliers.slice(0, 2).map(s => s.id);
  });

  const [selectedTerminalClientId, setSelectedTerminalClientId] = useState<string>('');
  const [isSelectorOpen, setIsSelectorOpen] = useState<boolean>(false);
  const [assignedLots, setAssignedLots] = useState<Record<string, string[]>>({});
  const [clientReferences, setClientReferences] = useState<Record<string, string>>({});
  const [clientRequiredGrams, setClientRequiredGrams] = useState<Record<string, string>>({});
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [egresoSuccess, setEgresoSuccess] = useState<string>('');
  const [egresoError, setEgresoError] = useState<string>('');
  const [confirmingClientId, setConfirmingClientId] = useState<string | null>(null);
  const [isBulkConfirmOpen, setIsBulkConfirmOpen] = useState<boolean>(false);
  const [originFilter, setOriginFilter] = useState<string>('');
  const [dispatchingState, setDispatchingState] = useState<{ message: string; status: 'dispatching' | 'success' } | null>(null);

  useEffect(() => {
    if (activeClientIds.length > 0) {
      if (!activeClientIds.includes(selectedTerminalClientId)) {
        setSelectedTerminalClientId(activeClientIds[0]);
      }
    } else {
      setSelectedTerminalClientId('');
    }
  }, [activeClientIds, selectedTerminalClientId]);

  useEffect(() => {
    const initialRefs: Record<string, string> = { ...clientReferences };
    suppliers.forEach(s => {
      if (!initialRefs[s.id]) {
        initialRefs[s.id] = `GUIA-${s.code}-${Math.floor(1000 + Math.random() * 9000)}`;
      }
    });
    setClientReferences(initialRefs);
  }, [suppliers]);

  const completedLots = useMemo(() => {
    return castingLots.filter(l => l.status === 'COMPLETADO' && l.recovered !== null);
  }, [castingLots]);

  const lotsWithAvailableGold = useMemo(() => {
    return completedLots.map(lot => {
      const barsInLot = goldBars.filter(b => b.processId === lot.id);
      const totalRecovered = barsInLot.reduce((sum, b) => sum + (b.recovered || 0), 0);
      const totalEgressed = barsInLot.reduce((sum, b) => sum + b.egresadoG, 0);
      const availableToEgress = Math.max(0, totalRecovered - totalEgressed);

      return {
        ...lot,
        totalRecovered,
        totalEgressed,
        availableToEgress: Number(availableToEgress.toFixed(2)),
        bars: barsInLot,
        originSupplierIds: [...new Set(barsInLot.map(b => b.supplierId))],
      };
    }).filter(lot => lot.availableToEgress > 1);
  }, [completedLots, goldBars]);

  const processedLots = useMemo(() => {
    return lotsWithAvailableGold.map(l => ({ ...l, isRecommended: false }));
  }, [lotsWithAvailableGold]);

  const resolvedAssignments = useMemo(() => {
    const clientAccumulated: Record<string, number> = {};
    const lotWeights: Record<string, Record<string, number>> = {};
    const lotRemainingGold: Record<string, number> = {};

    lotsWithAvailableGold.forEach(lot => {
      lotWeights[lot.id] = {};
      const clientIds = assignedLots[lot.id] || [];
      let remainingInLot = lot.availableToEgress;

      clientIds.forEach(clientId => {
        if (remainingInLot <= 0.01) return;

        const reqStr = clientRequiredGrams[clientId];
        const required = reqStr ? parseFloat(reqStr) : null;

        if (required !== null && !isNaN(required) && required > 0) {
          const currentAccum = clientAccumulated[clientId] || 0;
          const remainingNeeded = Math.max(0, required - currentAccum);
          
          if (remainingNeeded > 0) {
            const weightToAssign = Math.min(remainingInLot, remainingNeeded);
            lotWeights[lot.id][clientId] = Number(weightToAssign.toFixed(2));
            clientAccumulated[clientId] = Number((currentAccum + weightToAssign).toFixed(2));
            remainingInLot = Number((remainingInLot - weightToAssign).toFixed(2));
          }
        } else {
          const weightToAssign = remainingInLot;
          lotWeights[lot.id][clientId] = Number(weightToAssign.toFixed(2));
          clientAccumulated[clientId] = Number(((clientAccumulated[clientId] || 0) + weightToAssign).toFixed(2));
          remainingInLot = 0;
        }
      });

      lotRemainingGold[lot.id] = Number(remainingInLot.toFixed(2));
    });

    return { lotWeights, clientAccumulated, lotRemainingGold };
  }, [lotsWithAvailableGold, assignedLots, clientRequiredGrams]);

  const visibleLots = useMemo(() => {
    const activeClientId = selectedTerminalClientId;
    if (!activeClientId) return processedLots;

    return processedLots.filter(lot => {
      const assignedClients = assignedLots[lot.id] || [];
      if (assignedClients.includes(activeClientId)) return true;

      const remainingGold = resolvedAssignments.lotRemainingGold[lot.id] ?? lot.availableToEgress;
      if (remainingGold > 0.01) return true;

      return false;
    });
  }, [processedLots, selectedTerminalClientId, resolvedAssignments, assignedLots]);

  const originOptions = useMemo(() => {
    const ids = new Set<string>();
    lotsWithAvailableGold.forEach(lot => {
      lot.bars.forEach(b => ids.add(b.supplierId));
    });
    return Array.from(ids).map(id => suppliers.find(s => s.id === id)).filter(Boolean);
  }, [lotsWithAvailableGold, suppliers]);

  const originFilteredLots = useMemo(() => {
    if (!originFilter) return visibleLots;
    return visibleLots.filter(lot =>
      'originSupplierIds' in lot && (lot as any).originSupplierIds.includes(originFilter)
    );
  }, [visibleLots, originFilter]);

  const showNoGoldAlert = useMemo(() => {
    if (!selectedTerminalClientId) return false;
    const reqStr = clientRequiredGrams[selectedTerminalClientId];
    if (!reqStr) return false;
    const required = parseFloat(reqStr);
    if (isNaN(required) || required <= 0) return false;

    const assigned = resolvedAssignments.clientAccumulated[selectedTerminalClientId] || 0;
    const remainingNeeded = required - assigned;

    if (remainingNeeded <= 0.01) return false;

    const totalAvailableUnassigned = lotsWithAvailableGold
      .reduce((sum, l) => sum + (resolvedAssignments.lotRemainingGold[l.id] ?? l.availableToEgress), 0);

    return totalAvailableUnassigned < remainingNeeded;
  }, [selectedTerminalClientId, clientRequiredGrams, resolvedAssignments, lotsWithAvailableGold]);

  const handleToggleClient = (clientId: string) => {
    setActiveClientIds(prev => {
      if (prev.includes(clientId)) {
        setAssignedLots(curr => {
          const updated = { ...curr };
          Object.keys(updated).forEach(lotId => {
            if (Array.isArray(updated[lotId])) {
              updated[lotId] = updated[lotId].filter(cid => cid !== clientId);
              if (updated[lotId].length === 0) {
                delete updated[lotId];
              }
            }
          });
          return updated;
        });
        return prev.filter(id => id !== clientId);
      } else {
        if (!clientReferences[clientId]) {
          const client = suppliers.find(s => s.id === clientId);
          setClientReferences(prevRefs => ({
            ...prevRefs,
            [clientId]: `GUIA-${client?.code || 'OUT'}-${Math.floor(1000 + Math.random() * 9000)}`
          }));
        }
        return [...prev, clientId];
      }
    });
  };

  const getClientTotals = (clientId: string) => {
    const clientLots = lotsWithAvailableGold.filter(l => (assignedLots[l.id] || []).includes(clientId));
    const totalGrams = resolvedAssignments.clientAccumulated[clientId] || 0;
    return { count: clientLots.length, grams: Number(totalGrams.toFixed(2)) };
  };

  const handleAssignLot = (lotId: string) => {
    if (!selectedTerminalClientId) return;

    const remainingGold = resolvedAssignments.lotRemainingGold[lotId] ?? lotsWithAvailableGold.find(l => l.id === lotId)?.availableToEgress ?? 0;
    if (remainingGold <= 0.01) {
      alert(`Este lote ya no tiene oro disponible para asignar.`);
      return;
    }

    const reqStr = clientRequiredGrams[selectedTerminalClientId];
    if (reqStr) {
      const required = parseFloat(reqStr);
      if (!isNaN(required) && required > 0) {
        const assigned = resolvedAssignments.clientAccumulated[selectedTerminalClientId] || 0;
        if (assigned >= required - 0.01) {
          alert(`No se puede asignar más oro. El requerimiento de ${required} g para este cliente ya ha sido cubierto.`);
          return;
        }
      }
    }

    setAssignedLots(prev => {
      const current = prev[lotId] || [];
      if (!current.includes(selectedTerminalClientId)) {
        return { ...prev, [lotId]: [...current, selectedTerminalClientId] };
      }
      return prev;
    });
  };

  const executeSingleDispatch = (clientId: string) => {
    setEgresoError('');
    setEgresoSuccess('');

    const clientLotIds = Object.entries(assignedLots)
      .filter(([_, cids]) => Array.isArray(cids) && cids.includes(clientId))
      .map(([lid, _]) => lid);

    if (clientLotIds.length === 0) {
      setEgresoError('Debe asignar al menos un lote de oro para realizar el despacho.');
      return;
    }

    const ref = clientReferences[clientId]?.trim() || `GUIA-${clientId}-${Math.floor(1000 + Math.random() * 9000)}`;

    const customWeights: Record<string, number> = {};
    clientLotIds.forEach(lotId => {
      const assignedLotWeight = resolvedAssignments.lotWeights[lotId]?.[clientId];
      if (assignedLotWeight !== undefined) {
        const lotBars = goldBars.filter(b => b.processId === lotId && b.status === 'COMPLETADO');
        let remainingInLot = assignedLotWeight;
        
        lotBars.forEach(bar => {
          const remainingInBar = (bar.recovered || 0) - bar.egresadoG;
          if (remainingInBar > 0) {
            const weightToEgress = Math.min(remainingInBar, remainingInLot);
            customWeights[bar.code] = Number(weightToEgress.toFixed(2));
            remainingInLot -= weightToEgress;
          }
        });
      }
    });

    const result = createEgreso(clientId, clientLotIds, ref, customWeights);

    if (result.success) {
      const client = suppliers.find(s => s.id === clientId);
      
      setAssignedLots(prev => {
        const updated = { ...prev };
        Object.keys(updated).forEach(id => {
          if (Array.isArray(updated[id])) {
            updated[id] = updated[id].filter(cid => cid !== clientId);
            if (updated[id].length === 0) {
              delete updated[id];
            }
          }
        });
        return updated;
      });

      setClientReferences(prev => ({
        ...prev,
        [clientId]: `GUIA-${client?.code || 'OUT'}-${Math.floor(1000 + Math.random() * 9000)}`
      }));

      setClientRequiredGrams(prev => {
        const updated = { ...prev };
        delete updated[clientId];
        return updated;
      });

      setConfirmingClientId(null);
      setDispatchingState({ message: `Ref: ${ref} · ${client?.name}`, status: 'dispatching' });
      setTimeout(() => setDispatchingState(prev => prev ? { ...prev, status: 'success' } : null), 1000);
      setTimeout(() => setDispatchingState(null), 3500);
    } else {
      setEgresoError(result.error || 'Ocurrió un error en la liquidación.');
    }
  };

  const executeBulkDispatch = () => {
    setEgresoError('');
    setEgresoSuccess('');

    const clientsWithAssignments = activeClientIds.filter(cid => 
      Object.values(assignedLots).some(cids => Array.isArray(cids) && cids.includes(cid))
    );

    if (clientsWithAssignments.length === 0) {
      setEgresoError('No hay ningún lote asignado en la mesa de despacho.');
      return;
    }

    let successCount = 0;
    const successes: string[] = [];
    const failures: string[] = [];

    clientsWithAssignments.forEach(clientId => {
      const clientLotIds = Object.entries(assignedLots)
        .filter(([_, cids]) => Array.isArray(cids) && cids.includes(clientId))
        .map(([lid, _]) => lid);

      const ref = clientReferences[clientId]?.trim() || `GUIA-${clientId}-${Math.floor(1000 + Math.random() * 9000)}`;
      const client = suppliers.find(s => s.id === clientId);

      const customWeights: Record<string, number> = {};
      clientLotIds.forEach(lotId => {
        const assignedLotWeight = resolvedAssignments.lotWeights[lotId]?.[clientId];
        if (assignedLotWeight !== undefined) {
          const lotBars = goldBars.filter(b => b.processId === lotId && b.status === 'COMPLETADO');
          let remainingInLot = assignedLotWeight;
          
          lotBars.forEach(bar => {
            const remainingInBar = (bar.recovered || 0) - bar.egresadoG;
            if (remainingInBar > 0) {
              const weightToEgress = Math.min(remainingInBar, remainingInLot);
              customWeights[bar.code] = Number(weightToEgress.toFixed(2));
              remainingInLot -= weightToEgress;
            }
          });
        }
      });

      const result = createEgreso(clientId, clientLotIds, ref, customWeights);

      if (result.success) {
        successCount++;
        successes.push(`${client?.name} (${ref})`);
        
        setAssignedLots(prev => {
          const updated = { ...prev };
          Object.keys(updated).forEach(id => {
            if (Array.isArray(updated[id])) {
              updated[id] = updated[id].filter(cid => cid !== clientId);
              if (updated[id].length === 0) {
                delete updated[id];
              }
            }
          });
          return updated;
        });

        setClientReferences(prev => ({
          ...prev,
          [clientId]: `GUIA-${client?.code || 'OUT'}-${Math.floor(1000 + Math.random() * 9000)}`
        }));

        setClientRequiredGrams(prev => {
          const updated = { ...prev };
          delete updated[clientId];
          return updated;
        });
      } else {
        failures.push(`${client?.name}: ${result.error}`);
      }
    });

    if (successCount > 0) {
      setIsBulkConfirmOpen(false);
      setDispatchingState({ message: `Se liquidaron ${successCount} despachos simultáneos: ${successes.join(', ')}`, status: 'dispatching' });
      setTimeout(() => setDispatchingState(prev => prev ? { ...prev, status: 'success' } : null), 1000);
      setTimeout(() => setDispatchingState(null), 3500);
    }

    if (failures.length > 0) {
      setEgresoError(`Ocurrieron algunos errores en los despachos: ${failures.join('; ')}`);
    }
  };

  const focusedClient = useMemo(() => {
    return suppliers.find(s => s.id === selectedTerminalClientId);
  }, [suppliers, selectedTerminalClientId]);

  const focusedClientLots = useMemo(() => {
    if (!selectedTerminalClientId) return [];
    return lotsWithAvailableGold.filter(l => {
      const cids = assignedLots[l.id] || [];
      return cids.includes(selectedTerminalClientId);
    });
  }, [lotsWithAvailableGold, assignedLots, selectedTerminalClientId]);

  const focusedClientGrams = useMemo(() => {
    if (!selectedTerminalClientId) return 0;
    return focusedClientLots.reduce((sum, l) => {
      const assignedWeight = resolvedAssignments.lotWeights[l.id]?.[selectedTerminalClientId] ?? l.availableToEgress;
      return sum + assignedWeight;
    }, 0);
  }, [focusedClientLots, resolvedAssignments, selectedTerminalClientId]);

  const assignedLotsValues = Object.values(assignedLots) as string[][];
  const activeAssignmentsCount: number = assignedLotsValues.reduce((sum, cids) => sum + (cids ? cids.length : 0), 0);
  const clientAccumulatedValues = Object.values(resolvedAssignments.clientAccumulated) as number[];
  const totalAssignedGrams: number = clientAccumulatedValues.reduce((sum, g) => sum + (g || 0), 0);
  const uniqueAssignedClientsCount: number = new Set(assignedLotsValues.flat()).size;

  const unassignedLotsCount: number = lotsWithAvailableGold.filter(l => {
    const cids = assignedLots[l.id];
    return !cids || cids.length === 0;
  }).length;

  const totalUnassignedWeight: number = lotsWithAvailableGold
    .reduce((sum, l) => sum + (resolvedAssignments.lotRemainingGold[l.id] ?? l.availableToEgress), 0);

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      transition={{ duration: 0.3 }}
      className="space-y-6 text-[#E5E5E5]"
    >
      
      <motion.div 
        initial={{ opacity: 0, y: -10 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-neutral-900 pb-4"
      >
        <div>
          <h1 className="text-lg md:text-xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-[#A65B17] filter drop-shadow-[0_0_8px_rgba(166,91,23,0.3)]" />
            Mesa de Salida <span className="text-[#D5B042] font-semibold">Despacho Multi-Cliente</span>
          </h1>
          <p className="text-[11px] text-[#8C8C8C] mt-0.5 max-w-xl">
            Asigne y remita lingotes de oro fino de forma simultánea. Administre su mesa de despacho con una única tarjeta inteligente enfocada.
          </p>
        </div>

        <div className="relative shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setIsSelectorOpen(!isSelectorOpen)}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-[#1C1C1C] hover:bg-[#252525] border border-neutral-800/80 rounded-lg text-[11px] font-mono font-bold uppercase text-[#D5B042] hover:text-white transition-all cursor-pointer shadow-md"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#D5B042]" />
            Administrar Clientes ({activeClientIds.length})
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSelectorOpen ? 'rotate-180' : ''}`} />
          </button>

          <AnimatePresence>
            {isSelectorOpen && (
              <motion.div 
                key="client-selector"
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                transition={{ duration: 0.15, ease: 'easeOut' }}
                className="absolute right-0 mt-1.5 w-64 bg-[#1C1C1C] border border-neutral-800 rounded-xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-3.5 z-40 space-y-2.5"
              >
              <div className="flex items-center justify-between border-b border-neutral-800/40 pb-1.5">
                <span className="text-[9px] font-mono text-[#8C8C8C] uppercase font-bold tracking-wider">Habilitar Clientes</span>
                <button 
                  onClick={() => setActiveClientIds([])}
                  className="text-[8px] font-mono text-red-400 hover:text-red-300"
                >
                  Cerrar todos
                </button>
              </div>

              <div className="space-y-0.5 max-h-48 overflow-y-auto pr-1">
                {suppliers.map(s => {
                  const isChecked = activeClientIds.includes(s.id);
                  const totals = getClientTotals(s.id);

                  return (
                    <label
                      key={s.id}
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleClient(s.id);
                      }}
                      className="flex items-center justify-between p-1.5 rounded-lg hover:bg-black/40 transition-colors cursor-pointer text-[11px]"
                    >
                      <div className="flex items-center gap-2">
                        <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors
                          ${isChecked ? 'bg-[#D5B042] border-[#D5B042] text-black' : 'border-neutral-700 bg-black'}`}
                        >
                          {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                        </div>
                        <div className="truncate max-w-[150px]">
                          <span className="font-semibold block text-neutral-200 truncate">{s.name}</span>
                          <span className="text-[8px] text-[#8C8C8C] font-mono block truncate">{s.code} · {s.location}</span>
                        </div>
                      </div>
                      {totals.count > 0 && (
                        <span className="text-[8px] font-mono bg-[#D5B042]/10 text-[#D5B042] px-1.5 py-0.2 rounded-full font-bold shrink-0">
                          {totals.grams}g
                        </span>
                      )}
                    </label>
                  );
                })}
              </div>

              <div className="border-t border-neutral-800/40 pt-1.5 flex justify-end">
                <button
                  onClick={() => setIsSelectorOpen(false)}
                  className="py-0.5 px-2 bg-black hover:bg-neutral-900 border border-neutral-800/60 rounded text-[9px] font-mono font-bold uppercase transition-colors"
                >
                  Listo
                </button>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </motion.div>

      <AnimatePresence>
        {egresoSuccess && (
          <motion.div 
            key="egreso-success"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl shadow-md"
          >
            {egresoSuccess}
          </motion.div>
        )}
        {egresoError && (
          <motion.div 
            key="egreso-error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ duration: 0.2 }}
            className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-xl shadow-md"
          >
            {egresoError}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
      >
        <AnimatePresence>
          {activeClientIds.length > 0 && (
            <motion.div 
              key="client-badges"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.35 }}
              className="bg-neutral-950/40 border border-neutral-900/60 p-2.5 rounded-xl flex flex-wrap items-center gap-2"
            >
          <span className="text-[8px] font-mono text-[#8C8C8C] uppercase font-bold tracking-wider px-1.5 flex items-center gap-1">
            <Users className="w-3 h-3 text-[#A65B17]" />
            Clientes Abiertos:
          </span>

          <div className="flex flex-wrap gap-1">
            {activeClientIds.map(cid => {
              const client = suppliers.find(s => s.id === cid);
              if (!client) return null;

              const totals = getClientTotals(cid);
              const isActive = selectedTerminalClientId === cid;

              return (
                <div
                  key={cid}
                  className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-[10.5px] font-mono transition-all cursor-pointer
                    ${isActive 
                      ? 'bg-[#D5B042]/10 border-[#D5B042] text-white shadow-[0_2px_8px_rgba(213,176,66,0.12)] font-bold' 
                      : 'bg-[#1C1C1C] border-neutral-800/50 text-neutral-400 hover:text-white'}`}
                  onClick={() => setSelectedTerminalClientId(cid)}
                >
                  <span className="truncate max-w-[100px]">{client.code}</span>
                  <span className={`text-[9px] font-bold ${isActive ? 'text-[#D5B042]' : 'text-neutral-500'}`}>
                    {totals.grams.toLocaleString()}g
                  </span>
                  
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleClient(cid);
                    }}
                    className="p-0.5 rounded-full hover:bg-black/35 text-neutral-500 hover:text-red-400 transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              );
            })}
          </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 items-start">
        
        <motion.div 
          initial={{ opacity: 0, y: 25 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.35, duration: 0.4, ease: 'easeOut' }}
          className="lg:col-span-3 space-y-6"
        >
          {activeClientIds.length === 0 ? (
            <div className="text-center py-20 bg-black/45 border border-dashed border-neutral-800/40 rounded-2xl text-neutral-500 font-sans space-y-4">
              <User className="w-10 h-10 text-[#A65B17]/40 mx-auto animate-bounce" />
              <h4 className="text-sm font-semibold text-[#E5E5E5]">Mesa de despacho vacía</h4>
              <p className="text-xs text-[#8C8C8C] max-w-sm mx-auto leading-relaxed">
                Haga clic en el botón superior de "Administrar Clientes" para habilitar las terminales de despacho que requiere hoy.
              </p>
              <button
                onClick={() => setIsSelectorOpen(true)}
                className="py-2 px-4 bg-[#D5B042] text-black font-semibold text-xs rounded-xl font-mono uppercase transition-transform hover:scale-105 inline-flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Habilitar Clientes
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              
              <div className="bg-[#1C1C1C] p-4 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] space-y-4 relative">
                
                <div className="bg-black/40 border border-neutral-800/60 p-2.5 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="text-[10px] font-mono text-[#8C8C8C] uppercase font-bold tracking-wider">Mostrando Terminal de:</span>
                  </div>
                  
                  <select
                    value={selectedTerminalClientId}
                    onChange={(e) => setSelectedTerminalClientId(e.target.value)}
                    className="bg-black border border-neutral-800/60 rounded-md px-2.5 py-1 text-[11px] font-sans text-white focus:outline-none focus:border-[#D5B042] cursor-pointer min-w-[180px]"
                  >
                    {activeClientIds.map(cid => {
                      const client = suppliers.find(s => s.id === cid);
                      return (
                        <option key={cid} value={cid}>{client?.code} - {client?.name}</option>
                      );
                    })}
                  </select>
                </div>

                {focusedClient && (
                  <div className="pt-1.5 border-b border-neutral-800/20 pb-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <span className="text-[8px] font-mono text-[#A65B17] bg-[#A65B17]/10 border border-[#A65B17]/20 px-1.5 py-0.2 rounded uppercase tracking-wider font-bold">
                        Socio Receptor Activo
                      </span>
                      <h3 className="font-sans font-bold text-[#E5E5E5] text-sm mt-0.5">
                        {focusedClient.name}
                      </h3>
                      <p className="text-[9px] font-mono text-[#8C8C8C]">Sede: {focusedClient.location} | ID: {focusedClient.id}</p>
                    </div>

                    <button
                      onClick={() => handleToggleClient(selectedTerminalClientId)}
                      className="text-[9px] font-mono text-red-400 hover:text-red-300 bg-black/50 border border-neutral-800 px-2 py-0.5 rounded-md hover:border-red-500/30 transition-all cursor-pointer"
                    >
                      Cerrar terminal
                    </button>
                  </div>
                )}

                {showNoGoldAlert && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] rounded-lg flex items-start gap-2 animate-pulse">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                    <div>
                      <span className="font-bold block uppercase text-[8px] tracking-wider mb-0.5">¡Alerta de Abastecimiento!</span>
                      No hay suficiente oro disponible en la bóveda para surtir el requerimiento de este cliente. 
                      Faltan <strong className="text-white font-mono">{((clientRequiredGrams[selectedTerminalClientId] ? parseFloat(clientRequiredGrams[selectedTerminalClientId]) : 0) - (resolvedAssignments.clientAccumulated[selectedTerminalClientId] || 0)).toFixed(1)} g</strong> por cubrir, y el inventario libre es de solo <strong className="text-white font-mono">{lotsWithAvailableGold.reduce((sum, l) => sum + (resolvedAssignments.lotRemainingGold[l.id] ?? l.availableToEgress), 0).toFixed(1)} g</strong>.
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-0.5">
                    <label className="text-[8px] font-mono text-[#8C8C8C] uppercase">Número Guía / Acta de Salida</label>
                    <input
                      type="text"
                      placeholder="Ej: GUIA-OUT-102"
                      value={clientReferences[selectedTerminalClientId] || ''}
                      onChange={(e) => setClientReferences(prev => ({ ...prev, [selectedTerminalClientId]: e.target.value }))}
                      className="w-full bg-black border border-neutral-800/40 rounded-md px-2.5 py-1.5 text-[11px] font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] uppercase"
                    />
                  </div>

                  <div className="space-y-0.5">
                    <label className="text-[8px] font-mono text-[#8C8C8C] uppercase">Oro Requerido (g) - Opcional</label>
                    <div className="relative">
                      <input
                        type="number"
                        placeholder="Ej: 500"
                        value={clientRequiredGrams[selectedTerminalClientId] || ''}
                        onChange={(e) => setClientRequiredGrams(prev => ({ ...prev, [selectedTerminalClientId]: e.target.value }))}
                        className="w-full bg-black border border-neutral-800/40 rounded-md pl-2.5 pr-6 py-1.5 text-[11px] font-mono text-[#E5E5E5] focus:outline-none focus:border-[#D5B042]"
                      />
                      <span className="absolute right-2 top-2 text-[8px] font-mono text-[#8C8C8C]">g</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[8px] font-mono text-[#8C8C8C] uppercase tracking-wider block">Lotes de Oro Asignados</span>
                  
                  {focusedClientLots.length === 0 ? (
                    <div className="text-center py-6 bg-black border border-dashed border-neutral-800/30 rounded-lg text-[#8C8C8C] text-[10.5px] font-sans">
                      <Coins className="w-4 h-4 text-neutral-800 mx-auto mb-1 animate-pulse" />
                      Ningún lote asignado a este cliente todavía.
                      <div className="text-[8.5px] text-[#8C8C8C]/50 mt-0.5">Haga clic en un lote en el panel derecho para asignarlo aquí.</div>
                    </div>
                  ) : (
                    <div className="bg-black border border-neutral-800/40 rounded-lg p-1.5 divide-y divide-neutral-800/15 max-h-36 overflow-y-auto space-y-0.5">
                      {focusedClientLots.map(lot => {
                        const lotWeightRecord = resolvedAssignments.lotWeights[lot.id];
                        const assignedWeight = (lotWeightRecord && typeof lotWeightRecord === 'object' ? lotWeightRecord[selectedTerminalClientId] : undefined) ?? lot.availableToEgress;
                        const isPartial = assignedWeight < lot.availableToEgress;

                        return (
                          <div key={lot.id} className="py-1 px-1 flex justify-between items-center text-[11px] font-mono">
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-[#E5E5E5]">{lot.code}</span>
                                <span className="text-[8px] opacity-65 bg-neutral-900 border border-neutral-800/60 px-1 py-0.1 rounded">{lot.moldCode}</span>
                              </div>
                              <div className="text-[8.5px] text-[#8C8C8C]/50 mt-0.5">FE: {lot.expectedTotal.toFixed(0)}g | Temp: {lot.castingTemp}°C</div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <span className="font-bold text-[#D5B042]">{assignedWeight.toLocaleString()} g Au</span>
                                {isPartial && (
                                  <span className="text-[8px] text-[#8C8C8C] block">
                                    (Parcial de {lot.availableToEgress.toLocaleString()}g)
                                  </span>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignedLots(prev => {
                                    const updated = { ...prev };
                                    if (Array.isArray(updated[lot.id])) {
                                      updated[lot.id] = updated[lot.id].filter(cid => cid !== selectedTerminalClientId);
                                      if (updated[lot.id].length === 0) {
                                        delete updated[lot.id];
                                      }
                                    }
                                    return updated;
                                  });
                                }}
                                className="text-neutral-700 hover:text-red-400 p-0.5 transition-colors cursor-pointer"
                                title="Quitar asignación"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-black p-3 rounded-lg border border-neutral-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="font-mono text-[11px]">
                    <span className="text-[#8C8C8C] block uppercase text-[8px]">Masa Acumulada</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-[#D5B042] font-bold text-xs">{focusedClientGrams.toLocaleString()} g Au</span>
                      {clientRequiredGrams[selectedTerminalClientId] && (
                        <span className="text-[9px] text-[#8C8C8C] font-semibold">
                          / {parseFloat(clientRequiredGrams[selectedTerminalClientId]).toLocaleString()} g req
                        </span>
                      )}
                    </div>
                    {clientRequiredGrams[selectedTerminalClientId] && parseFloat(clientRequiredGrams[selectedTerminalClientId]) > 0 && (
                      <div className="w-32 bg-neutral-900 rounded-full h-1 mt-1 overflow-hidden border border-neutral-800/40">
                        <div 
                          className="bg-gradient-to-r from-[#A65B17] to-[#D5B042] h-full rounded-full transition-all duration-300"
                          style={{ 
                            width: `${Math.min(100, (focusedClientGrams / parseFloat(clientRequiredGrams[selectedTerminalClientId])) * 100)}%` 
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  <button
                    type="button"
                    onClick={() => setConfirmingClientId(selectedTerminalClientId)}
                    disabled={focusedClientLots.length === 0}
                    className={`py-1.5 px-3 rounded-lg font-mono font-bold text-[9px] uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center justify-center gap-1
                      ${focusedClientLots.length > 0 
                        ? 'bg-gradient-to-r from-[#A65B17] to-[#D5B042] text-black hover:brightness-110 shadow-[0_2px_8px_rgba(166,91,23,0.12)]' 
                        : 'bg-neutral-900 text-neutral-700 cursor-not-allowed border border-neutral-800/20'}`}
                  >
                    <Send className="w-3 h-3" />
                    Despachar {focusedClientLots.length} lotes
                  </button>
                </div>

              </div>
            </div>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 25 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
          className="lg:col-span-2 space-y-4"
        >
          <div className="bg-[#1C1C1C] p-4 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] space-y-4">
              <div className="border-b border-neutral-800/20 pb-2.5 space-y-2">
                <h3 className="font-sans font-semibold text-[#E5E5E5] text-sm">Bóveda de Lotes</h3>
                <p className="text-[10px] text-[#8C8C8C]">Asigne de manera libre cada lote de oro fino a cualquiera de las terminales activas.</p>

                <div className="flex items-center gap-2">
                  <select
                    value={originFilter}
                    onChange={(e) => setOriginFilter(e.target.value)}
                    className="bg-black border border-neutral-800/40 rounded-lg px-2.5 py-1.5 text-[10px] font-mono text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors cursor-pointer"
                  >
                    <option value="">Todos los orígenes</option>
                    {originOptions.map(sup => (
                      <option key={sup!.id} value={sup!.id}>{sup!.name} ({sup!.code})</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1 bg-black border border-neutral-800/40 py-1.5 px-1 rounded-lg">
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-1 rounded transition-colors cursor-pointer ${viewMode === 'list' ? 'bg-[#D5B042] text-black' : 'text-[#8C8C8C] hover:text-[#E5E5E5]'}`}
                    title="Vista Lista"
                  >
                    <List className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-1 rounded transition-colors cursor-pointer ${viewMode === 'grid' ? 'bg-[#D5B042] text-black' : 'text-[#8C8C8C] hover:text-[#E5E5E5]'}`}
                    title="Vista Gráfica"
                  >
                    <Grid className="w-3.5 h-3.5" />
                  </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center text-[9px] font-mono bg-[#141414] p-2 rounded-lg border border-neutral-800/40 text-[#8C8C8C]">
                <span>Sin Asignar: <strong>{unassignedLotsCount}</strong> de {lotsWithAvailableGold.length}</span>
                <span>Masa Disponible: <strong className="text-[#D5B042]">{totalUnassignedWeight.toLocaleString()} g</strong></span>
              </div>

            {originFilteredLots.length === 0 ? (
              <div className="text-center py-12 bg-black border border-dashed border-neutral-800/40 rounded-xl text-[#8C8C8C] text-xs font-sans space-y-2">
                <Coins className="w-8 h-8 text-[#8C8C8C]/30 mx-auto animate-pulse" />
                <p>No hay lotes con fino de oro disponible para despachar en este momento.</p>
              </div>
            ) : viewMode === 'list' ? (
              <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 text-[#E5E5E5]">
                {originFilteredLots.map(lot => {
                  const assignedClientIds = assignedLots[lot.id] || [];
                  const isChecked = assignedClientIds.includes(selectedTerminalClientId);
                  const otherAssignments = assignedClientIds.filter(cid => cid !== selectedTerminalClientId);
                  const remainingGold = resolvedAssignments.lotRemainingGold[lot.id] ?? lot.availableToEgress;
                  const hasRemainingGold = remainingGold > 0.01;

                  return (
                    <div
                      key={lot.id}
                      className={`p-2.5 rounded-lg border transition-all duration-200 flex flex-col gap-2.5
                        ${isChecked 
                          ? 'bg-black/40 border-[#D5B042]/20 opacity-90 shadow-[inset_0_1px_3px_rgba(0,0,0,0.5)]' 
                          : 'bg-black border-neutral-800/40 hover:border-neutral-800'}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-mono font-bold text-[#E5E5E5] text-[11px]">{lot.code}</span>
                            <span className="text-[8px] font-mono text-[#8C8C8C] bg-neutral-900 border border-neutral-800/60 px-1 py-0.1 rounded uppercase">
                              {lot.moldCode}
                            </span>
                          </div>
                          <div className="text-[9px] font-mono text-[#8C8C8C] mt-0.5">
                            Masa: {(lot.grossWeightTotal / 1000).toFixed(1)}kg | FE: {lot.expectedTotal.toFixed(0)}g
                          </div>
                          {lot.originSupplierIds?.length > 0 && (
                            <div className="text-[9px] font-mono text-[#8C8C8C] mt-0.5 flex items-center gap-1">
                              <span className="text-[#D5B042]">◆</span>
                              {lot.originSupplierIds.map(id => suppliers.find(sup => sup.id === id)).filter(Boolean).map(s => `${s!.name} (${s!.code})`).join(', ')}
                            </div>
                          )}
                        </div>
                        <div className="text-right font-mono">
                          <span className="text-[11px] font-bold text-[#D5B042] block">
                            {resolvedAssignments.lotWeights[lot.id]?.[selectedTerminalClientId] !== undefined 
                              ? `${resolvedAssignments.lotWeights[lot.id][selectedTerminalClientId].toLocaleString()} g` 
                              : `${remainingGold.toLocaleString()} g`}
                          </span>
                          {remainingGold < lot.availableToEgress && (
                            <span className="text-[8px] text-[#8C8C8C] block">
                              (de {lot.availableToEgress.toLocaleString()} g)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1 border-t border-neutral-800/10 pt-2">
                        <div className="flex items-center justify-between gap-1.5 text-[8px] font-mono text-[#8C8C8C] uppercase">
                          <span>Asignación Directa:</span>
                          {assignedClientIds.length > 0 && (
                            <span className="text-[7.5px] bg-neutral-900 border border-neutral-800/40 px-1 py-0.1 rounded text-[#8C8C8C]">
                              Asignado a {assignedClientIds.length} cliente(s)
                            </span>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-1.5">
                          {!selectedTerminalClientId ? (
                            <span className="text-[8.5px] font-mono text-[#8C8C8C]">Terminal cerrada</span>
                          ) : isChecked ? (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-0.5">
                                <Check className="w-2.5 h-2.5 text-emerald-400" /> Asignado ✓
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignedLots(prev => {
                                    const updated = { ...prev };
                                    if (Array.isArray(updated[lot.id])) {
                                      updated[lot.id] = updated[lot.id].filter(cid => cid !== selectedTerminalClientId);
                                      if (updated[lot.id].length === 0) {
                                        delete updated[lot.id];
                                      }
                                    }
                                    return updated;
                                  });
                                }}
                                className="py-0.5 px-1.5 bg-red-950/40 border border-red-900/30 hover:bg-red-900 hover:text-white rounded text-[8px] font-mono transition-colors cursor-pointer"
                              >
                                Quitar
                              </button>
                            </div>
                          ) : hasRemainingGold ? (
                            <div className="flex items-center justify-between w-full gap-1.5">
                              {otherAssignments.length > 0 ? (
                                <span className="text-[8px] font-mono text-[#A65B17] truncate max-w-[110px]" title={otherAssignments.map(cid => suppliers.find(s => s.id === cid)?.code).join(', ')}>
                                  Parcial por {otherAssignments.map(cid => suppliers.find(s => s.id === cid)?.code).join(', ')}
                                </span>
                              ) : (
                                <span className="text-[8.5px] font-mono text-neutral-500">Disponible</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAssignLot(lot.id)}
                                className="py-0.5 px-1.5 bg-[#D5B042]/10 hover:bg-[#D5B042] text-[#D5B042] hover:text-black border border-[#D5B042]/30 rounded text-[8.5px] font-mono font-bold uppercase transition-colors cursor-pointer"
                              >
                                Asignar ({remainingGold.toFixed(0)} g libres)
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between w-full">
                              <span className="text-[8px] font-mono text-[#A65B17] bg-[#A65B17]/10 px-1.5 py-0.2 rounded border border-[#A65B17]/20 font-semibold truncate max-w-[130px]" title={otherAssignments.map(cid => suppliers.find(s => s.id === cid)?.code).join(', ')}>
                                Totalmente Ocupado ({otherAssignments.map(cid => suppliers.find(s => s.id === cid)?.code).join(', ')})
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignedLots(prev => {
                                    const updated = { ...prev };
                                    delete updated[lot.id];
                                    return updated;
                                  });
                                }}
                                className="text-[8px] font-mono text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                              >
                                Liberar Todo
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto pr-1 text-[#E5E5E5]">
                {originFilteredLots.map(lot => {
                  const assignedClientIds = assignedLots[lot.id] || [];
                  const isChecked = assignedClientIds.includes(selectedTerminalClientId);
                  const otherAssignments = assignedClientIds.filter(cid => cid !== selectedTerminalClientId);
                  const remainingGold = resolvedAssignments.lotRemainingGold[lot.id] ?? lot.availableToEgress;
                  const hasRemainingGold = remainingGold > 0.01;

                  return (
                    <div
                      key={lot.id}
                      className={`relative p-2 rounded-lg border text-center transition-all duration-300 flex flex-col justify-between min-h-[110px]
                        ${isChecked 
                          ? 'bg-black/50 border-[#D5B042]/40 shadow-[0_0_10px_rgba(213,176,66,0.05)]' 
                          : 'bg-black border-neutral-800/40 hover:border-neutral-800'}`}
                    >
                      <div>
                        <div className="text-[8px] font-mono text-[#8C8C8C] uppercase tracking-wider">{lot.moldCode}</div>
                        <h4 className="text-[11px] font-mono font-bold text-[#E5E5E5] mt-0.5">{lot.code}</h4>
                        {lot.originSupplierIds?.length > 0 && (
                          <div className="text-[7.5px] font-mono text-[#8C8C8C] leading-tight truncate max-w-full mt-0.5">
                            {lot.originSupplierIds.map(id => suppliers.find(sup => sup.id === id)).filter(Boolean).map(s => s!.code).join(', ')}
                          </div>
                        )}
                        <div className="text-[9.5px] font-mono font-bold text-[#D5B042] mt-1">
                          {resolvedAssignments.lotWeights[lot.id]?.[selectedTerminalClientId] !== undefined 
                            ? `${resolvedAssignments.lotWeights[lot.id][selectedTerminalClientId].toLocaleString()} g` 
                            : `${remainingGold.toLocaleString()} g`}
                          {remainingGold < lot.availableToEgress && (
                            <span className="text-[7.5px] text-[#8C8C8C] block font-normal leading-tight">
                              (de {lot.availableToEgress.toLocaleString()}g)
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-2 border-t border-neutral-800/20 pt-1.5 text-[8.5px] font-sans text-center flex flex-col items-center justify-center min-h-[30px] gap-1">
                        {!selectedTerminalClientId ? (
                          <span className="text-neutral-700 font-mono">Sin terminal</span>
                        ) : isChecked ? (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[8px] font-mono text-emerald-400 font-bold">✓ Asignado</span>
                            <button
                              type="button"
                              onClick={() => {
                                  setAssignedLots(prev => {
                                    const updated = { ...prev };
                                    if (Array.isArray(updated[lot.id])) {
                                      updated[lot.id] = updated[lot.id].filter(cid => cid !== selectedTerminalClientId);
                                      if (updated[lot.id].length === 0) {
                                        delete updated[lot.id];
                                      }
                                    }
                                    return updated;
                                  });
                                }}
                              className="w-full py-0.2 bg-red-950/40 border border-red-900/30 hover:bg-red-900 hover:text-white rounded text-[7.5px] font-mono transition-colors cursor-pointer"
                            >
                              Quitar
                            </button>
                          </div>
                        ) : hasRemainingGold ? (
                          <div className="flex flex-col items-center gap-1 w-full">
                            {otherAssignments.length > 0 && (
                              <span className="text-[7.5px] font-mono text-[#A65B17] truncate max-w-full">
                                Usado por {otherAssignments.map(cid => suppliers.find(s => s.id === cid)?.code).join(', ')}
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAssignLot(lot.id)}
                              className="w-full py-0.5 px-0.5 bg-[#D5B042]/10 hover:bg-[#D5B042] text-[#D5B042] hover:text-black border border-[#D5B042]/30 rounded text-[8px] font-mono font-bold uppercase transition-colors cursor-pointer"
                            >
                              + {suppliers.find(s => s.id === selectedTerminalClientId)?.code} ({remainingGold.toFixed(0)}g)
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-1 w-full">
                            <span className="text-[7.5px] font-mono text-[#A65B17] bg-[#A65B17]/10 px-1 py-0.2 rounded border border-[#A65B17]/20 font-semibold truncate max-w-full">
                              Lleno ({otherAssignments.map(cid => suppliers.find(s => s.id === cid)?.code).join(', ')})
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                  setAssignedLots(prev => {
                                    const updated = { ...prev };
                                    delete updated[lot.id];
                                    return updated;
                                  });
                                }}
                              className="text-[7.5px] font-mono text-neutral-500 hover:text-red-400 transition-colors cursor-pointer"
                            >
                              Liberar todo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

          </div>
        </motion.div>

      </div>

      <AnimatePresence>
        {activeAssignmentsCount > 0 && (
          <motion.div 
            key="assignments-bar"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="bg-[#1C1C1C] border border-[#D5B042]/30 p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-4 shadow-[0_4px_20px_rgba(213,176,66,0.08)]"
          >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#D5B042]/10 border border-[#D5B042]/20 rounded-xl text-[#D5B042] animate-pulse">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-sans font-bold text-[#E5E5E5] text-sm">Despacho Concurrente Asignado</h4>
              <p className="text-xs text-[#8C8C8C] mt-0.5">
                Tiene <strong className="text-[#D5B042]">{activeAssignmentsCount} lotes</strong> de oro fino asignados a <strong className="text-white">{uniqueAssignedClientsCount} cliente(s)</strong>, sumando un total de <strong className="text-[#D5B042]">{totalAssignedGrams.toLocaleString()} g Au</strong>.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto shrink-0">
            <button
              onClick={() => setAssignedLots({})}
              className="flex-1 md:flex-none py-2 px-4 bg-black hover:bg-neutral-900 border border-neutral-800/60 rounded-xl text-neutral-400 hover:text-white text-xs font-mono font-bold uppercase transition-colors cursor-pointer"
            >
              Vaciar Mesa
            </button>
            <button
              onClick={() => setIsBulkConfirmOpen(true)}
              className="flex-1 md:flex-none py-2.5 px-5 bg-gradient-to-r from-[#A65B17] to-[#D5B042] text-black text-xs font-mono font-bold uppercase tracking-wider rounded-xl hover:brightness-110 transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(166,91,23,0.2)]"
            >
              Despachar Todo en Lote
            </button>
          </div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmingClientId && (
          <motion.div 
            key="confirm-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-lg overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
            >
            
            <div className="p-6 bg-gradient-to-b from-black/40 to-transparent border-b border-neutral-800/20 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono text-[#A65B17] bg-[#A65B17]/10 border border-[#A65B17]/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Settle de Transacción
                </span>
                <h3 className="text-lg font-sans font-bold text-[#E5E5E5] mt-2 tracking-wide">
                  Confirmación de Despacho
                </h3>
                <p className="text-xs text-[#8C8C8C] mt-1">Socio receptor: <strong>{suppliers.find(s => s.id === confirmingClientId)?.name}</strong></p>
              </div>
              <button
                onClick={() => setConfirmingClientId(null)}
                className="text-[#8C8C8C] hover:text-[#E5E5E5] bg-black p-1.5 rounded-lg border border-neutral-800/40 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider block">Resumen de Lotes de Oro Solidificado a Entregar:</span>
                <div className="bg-black border border-neutral-800/40 rounded-xl p-3 divide-y divide-neutral-800/20 max-h-40 overflow-y-auto space-y-1 font-mono text-xs text-[#8C8C8C]">
                  {lotsWithAvailableGold.filter(l => (assignedLots[l.id] || []).includes(confirmingClientId)).map(lot => {
                    const assignedWeight = resolvedAssignments.lotWeights[lot.id]?.[confirmingClientId] || lot.availableToEgress;
                    return (
                      <div key={lot.id} className="py-2 flex justify-between items-center">
                        <span>{lot.code} ({lot.moldCode})</span>
                        <strong className="text-[#E5E5E5]">{assignedWeight.toLocaleString()} g Au</strong>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-mono text-[#8C8C8C] uppercase">Número Guía / Acta de Entrega</label>
                <input
                  type="text"
                  value={clientReferences[confirmingClientId] || ''}
                  onChange={(e) => setClientReferences(prev => ({ ...prev, [confirmingClientId]: e.target.value }))}
                  className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] uppercase"
                />
              </div>

              <div className="p-3 bg-black border-l-4 border-[#A65B17] rounded-r-lg text-[#D5B042] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px] font-sans text-[#E5E5E5]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#A65B17] shrink-0" />
                  ACUERDO DE REVISIÓN METÁLICA (TODO O NADA)
                </div>
                <p className="text-[10px] leading-normal font-sans text-[#8C8C8C]">
                  Al confirmar la salida, se asume la entrega de la pureza seleccionada en el crisol de origen de manera irreversible.
                </p>
              </div>
            </div>

            <div className="p-6 bg-black/20 border-t border-neutral-800/20 flex gap-4">
              <button
                type="button"
                onClick={() => setConfirmingClientId(null)}
                className="flex-1 py-2.5 bg-black hover:bg-[#141414] border border-neutral-800/40 text-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => executeSingleDispatch(confirmingClientId)}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#A65B17] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider hover:brightness-110 transition-all duration-200 rounded-xl cursor-pointer shadow-[0_4px_12px_rgba(166,91,23,0.3)] flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-black" />
                Asentar Salida
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {isBulkConfirmOpen && (
          <motion.div 
            key="bulk-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-[#1C1C1C] border border-[#D5B042]/20 rounded-2xl w-full max-w-xl overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
            >
            
            <div className="p-6 bg-gradient-to-b from-black/40 to-transparent border-b border-neutral-800/20 flex justify-between items-start">
              <div>
                <span className="text-[9px] font-mono text-[#D5B042] bg-[#D5B042]/10 border border-[#D5B042]/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-bold">
                  Asignación Múltiple en Lote
                </span>
                <h3 className="text-lg font-sans font-bold text-[#E5E5E5] mt-2 tracking-wide">
                  Confirmar Despacho Múltiple Simultáneo
                </h3>
                <p className="text-xs text-[#8C8C8C] mt-1">Se asentarán y liquidarán las siguientes guías de salida simultáneamente:</p>
              </div>
              <button
                onClick={() => setIsBulkConfirmOpen(false)}
                className="text-[#8C8C8C] hover:text-[#E5E5E5] bg-black p-1.5 rounded-lg border border-neutral-800/40 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {activeClientIds.map(clientId => {
                  const client = suppliers.find(s => s.id === clientId);
                  const clientLots = lotsWithAvailableGold.filter(l => (assignedLots[l.id] || []).includes(clientId));
                  const totalGrams = resolvedAssignments.clientAccumulated[clientId] || 0;
                  
                  if (clientLots.length === 0) return null;

                  return (
                    <div key={clientId} className="bg-black/60 p-4 rounded-xl border border-neutral-800/40 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-sans font-bold text-[#E5E5E5]">{client?.name} ({client?.code})</span>
                        <span className="font-mono text-[#D5B042] font-bold">{totalGrams.toLocaleString()} g Au</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#8C8C8C] flex justify-between">
                        <span>Guía: <strong className="text-white">{clientReferences[clientId] || 'AUTOGENERADA'}</strong></span>
                        <span>{clientLots.length} lote(s)</span>
                      </div>
                      <div className="text-[9px] font-mono text-neutral-500 flex flex-wrap gap-x-2">
                        {clientLots.map(lot => {
                          const assignedWeight = resolvedAssignments.lotWeights[lot.id]?.[clientId] || lot.availableToEgress;
                          const isPartial = assignedWeight < lot.availableToEgress;
                          return `${lot.code} (${assignedWeight.toLocaleString()}g${isPartial ? ' parcial' : ''})`;
                        }).join(', ')}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 bg-black border-l-4 border-[#A65B17] rounded-r-lg text-[#D5B042] space-y-1">
                <div className="flex items-center gap-1.5 font-bold text-[11px] font-sans text-[#E5E5E5]">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#A65B17] shrink-0" />
                  ACUERDO DE REVISIÓN METÁLICA (TODO O NADA)
                </div>
                <p className="text-[10px] leading-normal font-sans text-[#8C8C8C]">
                  Al confirmar la salida múltiple, se asume la entrega del 100% de la pureza registrada en cada crisol. Esta acción actualizará los saldos de la bóveda para todos los clientes indicados simultáneamente.
                </p>
              </div>
            </div>

            <div className="p-6 bg-black/20 border-t border-neutral-800/20 flex gap-4">
              <button
                type="button"
                onClick={() => setIsBulkConfirmOpen(false)}
                className="flex-1 py-2.5 bg-black hover:bg-[#141414] border border-neutral-800/40 text-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeBulkDispatch}
                className="flex-1 py-2.5 bg-gradient-to-r from-[#A65B17] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider hover:brightness-110 transition-all duration-200 rounded-xl cursor-pointer shadow-[0_4px_12px_rgba(166,91,23,0.3)] flex items-center justify-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-black" />
                Asentar Salidas Simultáneas
              </button>
            </div>

          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <AnimatePresence>
        {dispatchingState && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
          >
            <div className="absolute inset-0 bg-black/80" />
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="relative w-[380px] bg-[#1A1A1A] rounded-2xl border border-[#B4941E]/30 p-8 shadow-[0_8px_40px_rgba(0,0,0,0.8)] flex flex-col items-center"
            >
              <div className="w-full h-14 bg-[#111] rounded-xl overflow-hidden relative mb-6 border border-neutral-800/40">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: dispatchingState.status === 'success' ? '100%' : '75%' }}
                  transition={{ duration: 1, ease: 'easeInOut' }}
                  className="absolute inset-y-0 left-0 rounded-xl bg-gradient-to-r from-[#8A6F1D] via-[#B4941E] to-[#D5B042]"
                />
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                {dispatchingState.status !== 'success' && (
                  <motion.div
                    animate={{ x: ['-50%', '150%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: 'easeInOut' }}
                    className="absolute top-0 bottom-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                  />
                )}
              </div>

              {dispatchingState.status === 'success' ? (
                <>
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-[#22C55E] to-[#16A34A] flex items-center justify-center mb-4 shadow-[0_4px_20px_rgba(34,197,94,0.4)]"
                  >
                    <CheckCircle2 className="w-8 h-8 text-white" />
                  </motion.div>
                  <h3 className="text-[#D5B042] font-bold text-base mb-1 text-center">Despacho Completado</h3>
                  <p className="text-gray-400 text-xs text-center">{dispatchingState.message}</p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-full border-2 border-[#D5B042] border-t-transparent animate-spin mb-4" />
                  <h3 className="text-[#D5B042] font-bold text-base mb-1 text-center">Despachando...</h3>
                  <p className="text-gray-400 text-xs text-center">{dispatchingState.message}</p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
