'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useQueryClient } from '@tanstack/react-query';
import { useClients } from '@/hooks/useClients';
import { useBars, useCreateBar, useBulkUploadBars, useUpdateBar } from '@/hooks/useBars';
import { api } from '@/lib/api';
import { formatNumber } from '@/lib/format';
import type { Bar, BulkUploadResult } from '@/types/api';
import {
  ChevronsUp,
  ClipboardList,
  Plus,
  Trash2,
  AlertTriangle,
  Upload,
  FileSpreadsheet,
  Search,
  ChevronDown,
  ChevronUp,
  Download,
  Check,
  Sparkles,
  Info,
  Pencil,
  Weight,
  Microscope,
  X,
  Camera,
} from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: 'INGRESADO',
  PROCESANDO: 'PROCESANDO',
  COMPLETADO: 'COMPLETADO',
  EXITED: 'EGRESADO',
};

const STATUS_STYLES: Record<string, string> = {
  IN_STOCK: 'bg-[#152B1E] text-emerald-400 border border-emerald-500/10',
  PROCESANDO: 'bg-[#2A1A0A] text-[#A65B17] border border-[#A65B17]/20',
  COMPLETADO: 'bg-[#2A2008] text-[#D5B042] border border-[#D5B042]/20',
  EXITED: 'bg-blue-900/20 text-blue-400 border border-blue-500/10',
};

export default function IngresosPage() {
  const queryClient = useQueryClient();
  const { data: clients = [] } = useClients();
  const { data: bars = [] } = useBars();
  const createBar = useCreateBar();

  const [showForm, setShowForm] = useState<boolean>(false);
  const [clientId, setClientId] = useState<string>('');
  const [barNumber, setBarNumber] = useState<string>('');
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [purity, setPurity] = useState<string>('');
  const [leyAg, setLeyAg] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [isBulkOpen, setIsBulkOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bulkClientId, setBulkClientId] = useState<string>('');
  const [bulkFile, setBulkFile] = useState<File | null>(null);
  const [bulkError, setBulkError] = useState<string>('');
  const [bulkResult, setBulkResult] = useState<BulkUploadResult | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [selectedBar, setSelectedBar] = useState<Bar | null>(null);
  const [verifiedBars, setVerifiedBars] = useState<Set<string>>(new Set());
  const [deletingState, setDeletingState] = useState<{ id: string; status: 'deleting' | 'success' } | null>(null);
  const [ingestingState, setIngestingState] = useState<{ barNumber: string; status: 'ingesting' | 'success' } | null>(null);
  const [formPhoto, setFormPhoto] = useState<string | null>(null);
  const [editPhoto, setEditPhoto] = useState<string | null>(null);
  const [confirmSaveChanges, setConfirmSaveChanges] = useState<boolean>(false);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({});
  const updateBar = useUpdateBar();
  const [editingBar, setEditingBar] = useState<Bar | null>(null);
  const [editGrossWeight, setEditGrossWeight] = useState<string>('');
  const [editPurity, setEditPurity] = useState<string>('');
  const [editLeyAg, setEditLeyAg] = useState<string>('');

  useEffect(() => {
    if (clients.length > 0) {
      if (!clientId) setClientId(clients[0].id);
      const acc: Record<string, boolean> = {};
      clients.forEach(c => { acc[c.id] = true; });
      setOpenAccordions(prev => {
        const hasAll = clients.every(c => prev[c.id] !== undefined);
        return hasAll ? prev : { ...prev, ...acc };
      });
    }
  }, [clients]);

  const liveFA = useMemo(() => {
    const w = parseFloat(grossWeight);
    const l = parseFloat(purity);
    if (isNaN(w) || isNaN(l)) return 0;
    return w * (l / 1000);
  }, [grossWeight, purity]);


  const liveAnalyticalAg = useMemo(() => {
    const w = parseFloat(grossWeight);
    const lAg = parseFloat(leyAg);
    if (isNaN(w) || isNaN(lAg)) return 0;
    return w * (lAg / 1000);
  }, [grossWeight, leyAg]);

  const weightWarning = useMemo(() => {
    const w = parseFloat(grossWeight);
    return !isNaN(w) && w > 24900;
  }, [grossWeight]);

  const purityWarning = useMemo(() => {
    const w = parseFloat(grossWeight);
    const l = parseFloat(purity);
    return !isNaN(w) && !isNaN(l) && l < 850 && w > 1000;
  }, [grossWeight, purity]);

  const handleSubmitBar = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!barNumber || !grossWeight || !purity || !clientId) {
      setFormError('Por favor complete todos los campos obligatorios.');
      return;
    }

    const w = parseFloat(grossWeight);
    const p = parseFloat(purity);
    const ag = parseFloat(leyAg) || 0;

    if (isNaN(w) || w <= 0) {
      setFormError('El peso bruto debe ser un número positivo.');
      return;
    }
    if (isNaN(p) || p < 0 || p > 1000) {
      setFormError('La pureza Au debe estar entre 0 y 1000‰.');
      return;
    }
    if (ag < 0 || ag > 1000) {
      setFormError('La ley Ag debe estar entre 0 y 1000‰.');
      return;
    }

    const upperCode = barNumber.toUpperCase().trim();

    try {
      await createBar.mutateAsync({
        barNumber: upperCode,
        grossWeight: w,
        purity: p,
        clientId,
        leyAg: ag || undefined,
      });

      setBarNumber('');
      setGrossWeight('');
      setPurity('');
      setLeyAg('');
      setIngestingState({ barNumber: upperCode, status: 'ingesting' });
      setTimeout(() => {
        setIngestingState({ barNumber: upperCode, status: 'success' });
      }, 1000);
      setTimeout(() => setIngestingState(null), 3000);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Error al registrar la barra.');
    }
  };

  const bulkUploadMutation = useBulkUploadBars();

  const handleBulkUpload = async () => {
    if (!bulkClientId || !bulkFile) return;
    setBulkError('');
    setBulkResult(null);

    if (bulkFile.size > 10 * 1024 * 1024) {
      setBulkError('El archivo excede el tamaño máximo de 10 MB');
      return;
    }

    const formData = new FormData();
    formData.append('file', bulkFile);
    formData.append('clientId', bulkClientId);

    try {
      const result = await bulkUploadMutation.mutateAsync(formData);
      setBulkResult(result);
      setBulkFile(null);
      const fileInput = document.getElementById('bulk-file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Error al procesar la carga masiva';
      setBulkError(msg);
    }
  };

  const downloadTemplate = async () => {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Plantilla Carga Masiva');

    sheet.columns = [
      { header: 'CÓDIGO', key: 'code', width: 22 },
      { header: 'PESO BRUTO (g)', key: 'grossWeight', width: 18 },
      { header: 'PUREZA (‰)', key: 'purity', width: 15 },
      { header: 'LEY Ag (‰)', key: 'leyAg', width: 15 },
      { header: 'LOTE N°', key: 'lot', width: 18 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1C1C1C' } };
    headerRow.alignment = { horizontal: 'center' };

    sheet.addRow(['', '', '', '', '']);
    const noteRow = sheet.getRow(2);
    noteRow.getCell(1).value = '* CÓDIGO, PESO BRUTO y PUREZA son obligatorios';
    noteRow.getCell(1).font = { italic: true, color: { argb: 'FF8C8C8C' }, size: 9 };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla-carga-masiva.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenEdit = (bar: Bar) => {
    setEditingBar(bar);
    setEditGrossWeight(bar.grossWeight.toString());
    setEditPurity(bar.purity.toString());
    setEditLeyAg((bar.leyAg || 0).toString());
  };

  const handleSaveEdit = () => {
    if (!editingBar) return;
    const gw = parseFloat(editGrossWeight);
    const p = parseFloat(editPurity);
    const la = parseFloat(editLeyAg);
    if (isNaN(gw) || gw <= 0 || isNaN(p) || p < 0 || p > 1000 || isNaN(la) || la < 0 || la > 1000) return;

    const origGw = Number(editingBar.grossWeight);
    const origP = Number(editingBar.purity);
    const origLa = Number(editingBar.leyAg || 0);
    const hasChanges = gw !== origGw || p !== origP || la !== origLa;

    if (!hasChanges) {
      setEditingBar(null);
      return;
    }
    setConfirmSaveChanges(true);
  };

  const confirmSaveEdit = async () => {
    if (!editingBar) return;
    const gw = parseFloat(editGrossWeight);
    const p = parseFloat(editPurity);
    const la = parseFloat(editLeyAg);
    try {
      await updateBar.mutateAsync({
        id: editingBar.id,
        data: { grossWeight: gw, purity: p, leyAg: la || undefined },
      });
      setVerifiedBars(prev => new Set(prev).add(editingBar.id));
      setConfirmSaveChanges(false);
      setEditingBar(null);
    } catch (err: any) {
      console.error('Error al editar barra:', err);
    }
  };

  const handleDeleteBar = async (id: string) => {
    setConfirmDeleteId(null);
    setDeletingState({ id, status: 'deleting' });
    try {
      await api.delete(`/bars/${id}`);
      setDeletingState({ id, status: 'success' });
      queryClient.invalidateQueries({ queryKey: ['bars'] });
    } catch {
      setDeletingState(null);
    }
    setTimeout(() => setDeletingState(null), 3000);
  };

  const toggleAccordion = (id: string) => {
    setOpenAccordions(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const closeAllAccordions = () => setOpenAccordions({});

  const filteredBars = useMemo(() => {
    if (!searchQuery) return bars;
    return bars.filter(b =>
      b.barNumber.toUpperCase().includes(searchQuery.toUpperCase()),
    );
  }, [bars, searchQuery]);

  const barsByClient = useMemo(() => {
    const groups: Record<string, Bar[]> = {};
    clients.forEach(c => { groups[c.id] = []; });
    filteredBars.forEach(b => {
      if (groups[b.clientId]) groups[b.clientId].push(b);
    });
    return groups;
  }, [filteredBars, clients]);

  const totalBars = bars.length;
  const totalGrossWeight = bars.reduce((s, b) => s + Number(b.grossWeight), 0);
  const totalFineWeight = bars.reduce((s, b) => s + Number(b.fineWeight), 0);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-[#D5B042] filter drop-shadow-[0_0_8px_rgba(213,176,66,0.3)]" />
            Ingreso  <span className="text-[#D5B042] font-semibold">de Material</span>
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Registro físico de barras de oro crudo. Calcule leyes analíticas al instante y agrupe stocks por cliente.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold border transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-center
            ${showForm ? 'bg-[#1C1C1C] text-[#8C8C8C] border-neutral-800/40 hover:text-[#E5E5E5]' : 'bg-[#A65B17]/20 text-[#D5B042] border-[#A65B17]/30 hover:bg-[#A65B17]/30 shadow-[0_4px_12px_rgba(166,91,23,0.1)]'}`}>
          <Plus className={`w-4 h-4 transition-transform duration-200 ${showForm ? 'rotate-45 text-[#8C8C8C]' : 'text-[#D5B042]'}`} />
          {showForm ? 'Cerrar Formulario' : 'Nueva Barra'}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        <AnimatePresence>
          {showForm && (
            <motion.div key="form-panel" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }} className="lg:col-span-2 space-y-6">

              <div className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                <h3 className="text-sm font-semibold text-[#E5E5E5] uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-neutral-800/20 pb-3">
                  <Plus className="w-4 h-4 text-[#D5B042]" />
                  Nueva Barra (Individual)
                </h3>

                <form onSubmit={handleSubmitBar} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Proveedor</label>
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)}
                      className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors cursor-pointer">
                      <option value="">SELECCIONAR...</option>
                      {clients.map(c => (
                        <option key={c.id} value={c.id}>{c.name} ({c.rif})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Código de Barra Único</label>
                    <input type="text" placeholder="Ej: BAR-IAC-9428" value={barNumber} onChange={(e) => setBarNumber(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors uppercase placeholder:text-neutral-800" required />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Peso Bruto (g)</label>
                      <div className="relative">
                        <input type="number" step="0.01" placeholder="0.00" value={grossWeight} onChange={(e) => setGrossWeight(e.target.value)}
                          className={`w-full bg-black border rounded-lg pl-3 pr-8 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none transition-colors
                            ${weightWarning || purityWarning ? 'border-[#A65B17] focus:border-[#A65B17]' : 'border-neutral-800/40 focus:border-[#D5B042]'}`} required />
                        <span className="absolute right-3 top-2.5 text-[10px] font-mono text-[#8C8C8C]">g</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Pureza Au (‰)</label>
                      <div className="relative">
                        <input type="number" step="1" placeholder="Ej: 900" value={purity} onChange={(e) => setPurity(e.target.value)}
                          className={`w-full bg-black border rounded-lg pl-3 pr-10 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none transition-colors
                            ${purityWarning ? 'border-[#A65B17] focus:border-[#A65B17]' : 'border-neutral-800/40 focus:border-[#D5B042]'}`} required />
                        <span className="absolute right-3 top-2.5 text-[10px] font-mono text-[#8C8C8C]">Au‰</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Ley Ag Plata (‰) <span className="text-[#8C8C8C]/50">(Opcional)</span></label>
                    <div className="relative">
                      <input type="number" step="1" placeholder="Ej: 40" value={leyAg} onChange={(e) => setLeyAg(e.target.value)}
                        className="w-full bg-black border border-neutral-800/40 rounded-lg pl-3 pr-10 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors" />
                      <span className="absolute right-3 top-2.5 text-[10px] font-mono text-[#8C8C8C]">Ag‰</span>
                    </div>
                  </div>

                  {weightWarning && (
                    <div className="p-3 bg-black border border-[#A65B17]/30 rounded-xl text-[#A65B17] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] font-sans">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        ADVERTENCIA DE PESO CRÍTICO
                      </div>
                      <p className="text-[10px] leading-relaxed">El peso bruto excede los 24,900 g.</p>
                    </div>
                  )}

                  {purityWarning && (
                    <div className="p-3 bg-black border border-[#A65B17]/30 rounded-xl text-[#A65B17] space-y-1">
                      <div className="flex items-center gap-1.5 font-bold text-[11px] font-sans">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        RESTRICCIÓN DE PUREZA Y PESO
                      </div>
                      <p className="text-[10px] leading-relaxed">Ley inferior a 850‰ no puede pesar más de 1,000 gramos.</p>
                    </div>
                  )}

                  <div className="border-t border-neutral-800/20 pt-4 space-y-2">
                    <span className="text-[9px] font-mono text-[#8C8C8C] uppercase tracking-wider block">Herramientas</span>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex flex-col items-center gap-1 py-2 bg-black border border-neutral-800/40 rounded-lg hover:border-[#D5B042]/30 hover:bg-[#D5B042]/5 transition-all cursor-pointer">
                        <Camera className="w-4 h-4 text-[#D5B042]" />
                        <span className="text-[8px] font-mono text-[#8C8C8C] uppercase">Foto</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setFormPhoto(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button type="button" onClick={() => alert('Función de obtención de peso desde báscula externa — Próximamente')}
                        className="flex flex-col items-center gap-1 py-2 bg-black border border-neutral-800/40 rounded-lg hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer">
                        <Weight className="w-4 h-4 text-emerald-400" />
                        <span className="text-[8px] font-mono text-[#8C8C8C] uppercase">Peso</span>
                      </button>
                      <button type="button" onClick={() => alert('Función de obtención de leyes desde espectrómetro — Próximamente')}
                        className="flex flex-col items-center gap-1 py-2 bg-black border border-neutral-800/40 rounded-lg hover:border-blue-500/30 hover:bg-blue-500/5 transition-all cursor-pointer">
                        <Microscope className="w-4 h-4 text-blue-400" />
                        <span className="text-[8px] font-mono text-[#8C8C8C] uppercase">Leyes</span>
                      </button>
                    </div>
                    {formPhoto && (
                      <div className="relative mt-1">
                        <img src={formPhoto} alt="Foto de barra" className="w-full h-24 object-cover rounded-lg border border-neutral-800/40" />
                        <button type="button" onClick={() => setFormPhoto(null)}
                          className="absolute top-1.5 right-1.5 bg-black/80 p-1 rounded-full text-red-400 hover:text-red-300 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="bg-black p-4 rounded-xl border border-neutral-800/40 space-y-2.5">
                    <div className="flex justify-between items-center text-[10px] font-mono text-[#8C8C8C]">
                      <span>Fórmulas de Trazabilidad:</span>
                      <span className="text-[#D5B042] font-semibold">Auto-cálculo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-neutral-800/20 pt-2">
                      <div className="space-y-1">
                        <span className="text-[10px] text-[#8C8C8C]/60 uppercase block">Fino Analítico (FA)</span>
                        <strong className="text-[#E5E5E5] text-[13px]">{formatNumber(liveFA)} g</strong>
                      </div>
                    </div>
                    {liveAnalyticalAg > 0 && (
                      <div className="text-[10px] font-mono text-emerald-400 pt-1.5 flex justify-between items-center border-t border-neutral-800/20">
                        <span>Fino Analítico Ag (Plata):</span>
                        <strong>{formatNumber(liveAnalyticalAg)} g Ag</strong>
                      </div>
                    )}
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">{formError}</div>
                  )}
                  {formSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-1.5">
                      <Check className="w-4 h-4 shrink-0" />{formSuccess}
                    </div>
                  )}

                  <button type="submit" disabled={createBar.isPending}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_4px_12px_rgba(180,148,30,0.15)] hover:shadow-[0_4px_16px_rgba(213,176,66,0.3)] transition-all duration-200 cursor-pointer disabled:opacity-50">
                    {createBar.isPending ? 'REGISTRANDO...' : 'Registrar Ingesta (IN)'}
                  </button>
                </form>
              </div>

              <div className="bg-[#1C1C1C] rounded-2xl border border-neutral-800/40 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
                <button onClick={() => setIsBulkOpen(!isBulkOpen)}
                  className="w-full p-5 flex items-center justify-between text-left focus:outline-none hover:bg-[#141414] transition-colors">
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                    <div>
                      <h4 className="text-xs font-bold text-[#E5E5E5] uppercase tracking-wider">Carga Masiva (Excel)</h4>
                      <p className="text-[10px] text-[#8C8C8C] font-sans mt-0.5">Sube listados de barras mediante archivo XLSX/CSV.</p>
                    </div>
                  </div>
                  {isBulkOpen ? <ChevronUp className="w-4 h-4 text-[#8C8C8C]" /> : <ChevronDown className="w-4 h-4 text-[#8C8C8C]" />}
                </button>
                {isBulkOpen && (
                  <div className="p-5 border-t border-neutral-800/20 bg-black space-y-4">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Cliente</label>
                      <select value={bulkClientId} onChange={(e) => setBulkClientId(e.target.value)}
                        className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors cursor-pointer">
                        <option value="">SELECCIONAR...</option>
                        {clients.map(c => (
                          <option key={c.id} value={c.id}>{c.name} ({c.rif})</option>
                        ))}
                      </select>
                    </div>

                    <div className="border-2 border-dashed border-neutral-800/40 rounded-xl p-6 text-center hover:border-[#D5B042]/40 transition-colors">
                      <Upload className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                      <label className="flex flex-col items-center gap-1 cursor-pointer">
                        <span className="text-xs text-[#E5E5E5] font-semibold">
                          {bulkFile ? bulkFile.name : 'Seleccionar archivo Excel'}
                        </span>
                        <span className="text-[10px] text-[#8C8C8C] font-mono">
                          {bulkFile ? `${(bulkFile.size / 1024).toFixed(1)} KB` : '.xlsx, .xls o .csv — máx 10 MB'}
                        </span>
                        <input
                          id="bulk-file-input"
                          type="file"
                          accept=".xlsx,.xls,.csv"
                          onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {bulkError && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                        {bulkError}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={handleBulkUpload}
                        disabled={!bulkClientId || !bulkFile || bulkUploadMutation.isPending}
                        className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_4px_12px_rgba(180,148,30,0.15)] transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                        {bulkUploadMutation.isPending ? (
                          <>PROCESANDO...</>
                        ) : (
                          <><Upload className="w-4 h-4" /> Subir Archivo</>
                        )}
                      </button>
                      <button onClick={downloadTemplate}
                        className="py-3 px-4 rounded-xl bg-black border border-neutral-800/40 text-[#8C8C8C] hover:text-[#E5E5E5] hover:border-neutral-700 font-semibold text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer flex items-center gap-2 shrink-0">
                        <Download className="w-4 h-4" /> Plantilla
                      </button>
                    </div>

                    <div className="p-3 bg-black border border-neutral-800/20 rounded-lg text-[10px] text-[#8C8C8C] leading-relaxed space-y-1">
                      <p className="font-semibold text-[#E5E5E5] uppercase text-[9px] tracking-wider">Formato esperado:</p>
                      <p>Columnas: <span className="text-[#D5B042] font-mono">CÓDIGO</span> · <span className="text-[#D5B042] font-mono">PESO BRUTO (g)</span> · <span className="text-[#D5B042] font-mono">PUREZA (‰)</span> · <span className="text-[#8C8C8C]/60">LEY Ag (‰)</span> · <span className="text-[#8C8C8C]/60">LOTE N°</span></p>
                      <p>Usa el botón <span className="text-emerald-400 font-mono">Plantilla</span> para descargar un archivo de ejemplo.</p>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div initial={{ opacity: 0, y: 25 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
          className={`${showForm ? 'lg:col-span-3' : 'lg:col-span-5'} space-y-6`}>

          <div className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-sans font-semibold text-[#E5E5E5] text-base">Barras Registradas en Bóveda</h3>
                <p className="text-xs text-[#8C8C8C]">Administre el inventario crudo e identifique códigos listos para ser procesados.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={closeAllAccordions}
                  className="flex items-center gap-1.5 px-3 py-2 bg-black border border-neutral-800/40 rounded-lg text-[10px] font-mono text-[#8C8C8C] hover:text-[#E5E5E5] hover:border-neutral-700 transition-colors cursor-pointer">
                  <ChevronsUp className="w-3.5 h-3.5" />Cerrar Todas
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8C8C8C]/50" />
                  <input type="text" placeholder="Buscar código de barra..." value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-56 bg-black border border-neutral-800/40 rounded-lg pl-9 pr-3 py-2 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] placeholder:text-neutral-800" />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {clients.map(client => {
                const groupBars = barsByClient[client.id] || [];
                const isExpanded = openAccordions[client.id];
                const totalW = groupBars.reduce((sum, b) => sum + Number(b.grossWeight), 0);
                const totalFA = groupBars.reduce((sum, b) => sum + Number(b.fineWeight), 0);

                return (
                  <div key={client.id} className="bg-[#1C1C1C] rounded-xl border border-neutral-800/40 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                    <button onClick={() => toggleAccordion(client.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#141414] transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-black border border-[#D5B042]/20 flex items-center justify-center font-bold text-xs text-[#D5B042]">
                          {client.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#E5E5E5] uppercase tracking-wider">{client.name}</h4>
                          <span className="text-[10px] text-[#8C8C8C] font-sans">{client.rif}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                          <span className="text-[10px] text-[#8C8C8C]/50 block uppercase font-mono">Total Crudo / Fino</span>
                          <span className="text-xs font-mono font-bold text-[#D5B042]">
                            {(totalW / 1000).toFixed(2)} kg / {(totalFA / 1000).toFixed(2)} kg Au
                          </span>
                        </div>
                        <div className="text-right font-mono text-[10px] text-[#D5B042] bg-black border border-neutral-800/20 px-2.5 py-1 rounded-full">
                          {groupBars.length} barra{groupBars.length !== 1 ? 's' : ''}
                        </div>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8C8C8C]" /> : <ChevronDown className="w-4 h-4 text-[#8C8C8C]" />}
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="border-t border-neutral-800/20 bg-black p-4 overflow-x-auto">
                        {groupBars.length === 0 ? (
                          <div className="text-center py-6 text-[11px] text-[#8C8C8C] font-sans">No hay barras registradas para este cliente.</div>
                        ) : (
                          <table className="w-full text-left text-xs font-sans">
                            <thead>
                              <tr className="border-b border-neutral-800/20 text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider">
                                <th className="py-3 text-center sticky left-0 bg-black/50 z-10">Código</th>
                                <th className="py-3 text-center bg-black/50">BRUTO</th>
                                <th className="py-3 text-center bg-black/50">FA</th>
                                <th className="py-3 text-center bg-black/50">R</th>
                                <th className="py-3 text-center bg-black/50">STATUS</th>
                                <th className="py-3 text-center bg-black/50">Estado</th>
                                <th className="py-3 text-center bg-black/50 w-20">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/20 text-[#E5E5E5]/90">
                              {groupBars.map(bar => (
                                <tr key={bar.id} onClick={() => setSelectedBar(bar)} className="hover:bg-[#141414]/85 transition-colors cursor-pointer">
                                  <td className="py-3 text-center font-mono font-bold text-[#D5B042] sticky left-0 bg-black z-10">{bar.barNumber}</td>
                                  <td className="py-3 text-center font-mono">{formatNumber(Number(bar.grossWeight))} g</td>
                                  <td className="py-3 text-center  font-mono text-[#8C8C8C]">{formatNumber(Number(bar.fineWeight))} g</td>
                                  <td className="py-3 text-center font-mono text-[#8C8C8C]">--</td>
                                  <td className="py-3 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-mono font-semibold ${verifiedBars.has(bar.id) ? 'bg-[#152B1E] text-emerald-400 border border-emerald-500/10' : 'bg-[#2A1A0A] text-[#A65B17] border border-[#A65B17]/20'}`}>
                                      {verifiedBars.has(bar.id) ? 'VERIFICADO' : 'POR VERIFICAR'}
                                    </span>
                                  </td>
                                  <td className="py-3 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-mono font-semibold ${STATUS_STYLES[bar.status] || ''}`}>
                                      {STATUS_LABELS[bar.status] || bar.status}
                                    </span>
                                  </td>
                                  <td className="py-3 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button onClick={(e) => { e.stopPropagation(); handleOpenEdit(bar); }}
                                        disabled={bar.status !== 'IN_STOCK'}
                                        className={`p-1 rounded hover:bg-[#D5B042]/10 text-[#8C8C8C] hover:text-[#D5B042] transition-colors cursor-pointer
                                          ${bar.status !== 'IN_STOCK' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        title={bar.status !== 'IN_STOCK' ? 'No se puede editar un material en proceso.' : 'Editar barra'}>
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(bar.id); }}
                                        disabled={bar.status !== 'IN_STOCK'}
                                        className={`p-1 rounded hover:bg-red-500/10 text-[#8C8C8C] hover:text-red-400 transition-colors cursor-pointer
                                          ${bar.status !== 'IN_STOCK' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                        title={bar.status !== 'IN_STOCK' ? 'No se puede eliminar un material en proceso.' : 'Eliminar barra'}>
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-4 bg-black border border-dashed border-neutral-800/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
              <span className="text-[#8C8C8C] flex items-center gap-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#D5B042] animate-pulse" />
                Resumen Global de Inventario Crudo
              </span>
              <div className="flex gap-6 text-right">
                <div>
                  <span className="text-[10px] text-[#8C8C8C]/50 block">BARRAS TOTALES</span>
                  <strong className="text-[#E5E5E5] text-base font-bold">{totalBars} u</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C8C8C]/50 block">MASA BRUTA</span>
                  <strong className="text-[#E5E5E5] text-base font-bold">{(totalGrossWeight / 1000).toFixed(3)} kg</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C8C8C]/50 block">TOTAL FINO AU ESPERADO</span>
                  <strong className="text-[#D5B042] text-base font-bold">{(totalFineWeight / 1000).toFixed(3)} kg Au</strong>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div key="confirm-delete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-950/30 rounded-lg border border-red-500/20">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      Eliminar Material
                    </span>
                    <h3 className="text-sm font-sans font-bold text-[#E5E5E5] mt-1">Confirmar Eliminación</h3>
                  </div>
                </div>
                <p className="text-xs text-[#8C8C8C] leading-relaxed">
                  ¿Está seguro que desea eliminar esta barra del registro?
                </p>
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[10px] font-mono">
                  Esta acción no se puede deshacer.
                </div>
              </div>
              <div className="p-6 bg-black/20 border-t border-neutral-800/20 flex gap-3 justify-end">
                <button onClick={() => setConfirmDeleteId(null)}
                  className="py-2.5 px-4 bg-black hover:bg-[#141414] border border-neutral-800/40 text-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button onClick={() => handleDeleteBar(confirmDeleteId)}
                  className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                  <Trash2 className="w-3.5 h-3.5" />Eliminar Barra
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ingestingState && (
          <motion.div key="ingesting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              <div className="p-8 flex flex-col items-center space-y-5">
                {ingestingState.status === 'ingesting' ? (
                  <>
                    <div className="w-full max-w-[200px] h-14 bg-[#141414] rounded-lg border border-neutral-700/60 overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] relative">
                      <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }}
                        transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute inset-0 bg-gradient-to-r from-[#8A6F1D] via-[#B4941E] to-[#D5B042] rounded-lg" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-mono font-bold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">
                          {ingestingState.barNumber}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#7E6611] to-[#D5B042]">
                        <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }}
                          transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="h-full bg-gradient-to-r from-[#F5E6A3] to-white/60 rounded-full" />
                      </div>
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-xs font-sans font-semibold text-[#E5E5E5]">Registrando Barra...</p>
                      <p className="text-[10px] font-mono text-[#8C8C8C]">
                        Ingresando <strong className="text-[#D5B042]">{ingestingState.barNumber}</strong> al sistema de trazabilidad
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#8C8C8C]/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D5B042] animate-pulse" />
                      Procesando ingesta
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                      className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                      <Check className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
                    </motion.div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-sans font-bold text-emerald-400">Barra Registrada</p>
                      <p className="text-[10px] font-mono text-[#8C8C8C]">
                        <strong className="text-[#E5E5E5]">{ingestingState.barNumber}</strong> ingresada al sistema con trazabilidad IN
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deletingState && (
          <motion.div key="deleting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              <div className="p-8 flex flex-col items-center space-y-5">
                {deletingState.status === 'deleting' ? (
                  <>
                    <div className="w-full max-w-[200px] h-14 bg-[#141414] rounded-lg border border-neutral-700/60 overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] relative">
                      <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }}
                        transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute inset-0 bg-gradient-to-r from-[#8A6F1D] via-[#B4941E] to-[#D5B042] rounded-lg" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-mono font-bold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">
                          {deletingState.id}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#7E6611] to-[#D5B042]">
                        <motion.div initial={{ width: '0%' }} animate={{ width: '100%' }}
                          transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="h-full bg-gradient-to-r from-[#F5E6A3] to-white/60 rounded-full" />
                      </div>
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-xs font-sans font-semibold text-[#E5E5E5]">Eliminando Barra...</p>
                      <p className="text-[10px] font-mono text-[#8C8C8C]">
                        Retirando <strong className="text-[#D5B042]">{deletingState.id}</strong> del registro
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#8C8C8C]/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D5B042] animate-pulse" />
                      Procesando trazabilidad
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div initial={{ scale: 0, rotate: -180 }} animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                      className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center">
                      <Check className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
                    </motion.div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-sans font-bold text-emerald-400">Barra Eliminada</p>
                      <p className="text-[10px] font-mono text-[#8C8C8C]">
                        <strong className="text-[#E5E5E5]">{deletingState.id}</strong> fue retirada del sistema de trazabilidad
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingBar && (
          <motion.div key="edit-bar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[#D5B042]/10 rounded-lg border border-[#D5B042]/20">
                      <Pencil className="w-5 h-5 text-[#D5B042]" />
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-[#D5B042] bg-[#D5B042]/10 border border-[#D5B042]/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                        Editar Barra
                      </span>
                      <h3 className="text-sm font-sans font-bold text-[#E5E5E5] mt-1">{editingBar.barNumber}</h3>
                    </div>
                  </div>
                  <button onClick={() => setEditingBar(null)}
                    className="p-1 hover:bg-neutral-800 rounded-lg transition-colors cursor-pointer">
                    <X className="w-4 h-4 text-[#8C8C8C]" />
                  </button>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#8C8C8C] uppercase flex items-center gap-1">
                      <Weight className="w-3 h-3" /> Peso Bruto (g)
                    </label>
                    <input type="number" step="0.01" value={editGrossWeight}
                      onChange={(e) => setEditGrossWeight(e.target.value)}
                      className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[#8C8C8C] uppercase flex items-center gap-1">
                        <Microscope className="w-3 h-3" /> Pureza Au (‰)
                      </label>
                      <input type="number" step="1" value={editPurity}
                        onChange={(e) => setEditPurity(e.target.value)}
                        className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Ley Ag Plata (‰)</label>
                      <input type="number" step="1" value={editLeyAg}
                        onChange={(e) => setEditLeyAg(e.target.value)}
                        className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors" />
                    </div>
                  </div>
                  <div className="bg-black p-3 rounded-xl border border-neutral-800/40 space-y-1">
                    <span className="text-[9px] font-mono text-[#8C8C8C] uppercase">FA Recalculado</span>
                    <div className="text-xs font-mono">
                      <span className="text-[#E5E5E5]">
                        FA: <strong className="text-[#D5B042]">{formatNumber(parseFloat(editGrossWeight || '0') * (parseFloat(editPurity || '0') / 1000))} g</strong>
                      </span>
                    </div>
                  </div>

                  <div className="border-t border-neutral-800/20 pt-3 space-y-2">
                    <span className="text-[9px] font-mono text-[#8C8C8C] uppercase tracking-wider block">Cargar</span>
                    <div className="grid grid-cols-3 gap-2">
                      <label className="flex flex-col items-center gap-1 py-2 bg-black border border-neutral-800/40 rounded-lg hover:border-[#D5B042]/30 hover:bg-[#D5B042]/5 transition-all cursor-pointer">
                        <Camera className="w-4 h-4 text-[#D5B042]" />
                        <span className="text-[8px] font-mono text-[#8C8C8C] uppercase">Foto</span>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onload = (ev) => setEditPhoto(ev.target?.result as string);
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                      </label>
                      <button type="button" onClick={() => alert('Función de obtención de peso desde báscula externa — Próximamente')}
                        className="flex flex-col items-center gap-1 py-2 bg-black border border-neutral-800/40 rounded-lg hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer">
                        <Weight className="w-4 h-4 text-emerald-400" />
                        <span className="text-[8px] font-mono text-[#8C8C8C] uppercase">Peso</span>
                      </button>
                      <button type="button" onClick={() => alert('Función de obtención de leyes desde espectrómetro — Próximamente')}
                        className="flex flex-col items-center gap-1 py-2 bg-black border border-neutral-800/40 rounded-lg hover:border-blue-500/30 hover:bg-blue-500/5 transition-all cursor-pointer">
                        <Microscope className="w-4 h-4 text-blue-400" />
                        <span className="text-[8px] font-mono text-[#8C8C8C] uppercase">Leyes</span>
                      </button>
                    </div>
                    {editPhoto && (
                      <div className="relative mt-1">
                        <img src={editPhoto} alt="Foto de barra" className="w-full h-24 object-cover rounded-lg border border-neutral-800/40" />
                        <button type="button" onClick={() => setEditPhoto(null)}
                          className="absolute top-1.5 right-1.5 bg-black/80 p-1 rounded-full text-red-400 hover:text-red-300 cursor-pointer">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-6 bg-black/20 border-t border-neutral-800/20 flex gap-3 justify-end">
                <button onClick={() => setEditingBar(null)}
                  className="py-2.5 px-4 bg-black hover:bg-[#141414] border border-neutral-800/40 text-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button onClick={handleSaveEdit}
                  className="py-2.5 px-4 bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all duration-200 cursor-pointer flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />Guardar Cambios
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmSaveChanges && (
          <motion.div key="confirm-edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#A65B17]/20 rounded-lg border border-[#A65B17]/30">
                    <AlertTriangle className="w-5 h-5 text-[#A65B17]" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-[#A65B17] bg-[#A65B17]/10 border border-[#A65B17]/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      Confirmar Cambios
                    </span>
                    <h3 className="text-sm font-sans font-bold text-[#E5E5E5] mt-1">¿Guardar modificaciones?</h3>
                  </div>
                </div>
                <p className="text-xs text-[#8C8C8C] leading-relaxed">
                  Se actualizarán los datos de la barra <strong className="text-[#E5E5E5] font-mono">{editingBar?.barNumber}</strong> en el sistema de trazabilidad.
                </p>
              </div>
              <div className="p-6 bg-black/20 border-t border-neutral-800/20 flex gap-3 justify-end">
                <button onClick={() => setConfirmSaveChanges(false)}
                  className="py-2.5 px-4 bg-black hover:bg-[#141414] border border-neutral-800/40 text-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer">
                  Cancelar
                </button>
                <button onClick={confirmSaveEdit} disabled={updateBar.isPending}
                  className="py-2.5 px-4 bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all duration-200 cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5" />{updateBar.isPending ? 'GUARDANDO...' : 'Sí, Guardar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {bulkResult && (
          <motion.div key="bulk-result" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.92 }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg border ${bulkResult.errors.length > 0 ? 'bg-amber-950/30 border-amber-500/20' : 'bg-emerald-950/30 border-emerald-500/20'}`}>
                    {bulkResult.errors.length > 0
                      ? <AlertTriangle className="w-5 h-5 text-amber-400" />
                      : <Check className="w-5 h-5 text-emerald-400" />
                    }
                  </div>
                  <div>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${bulkResult.errors.length > 0 ? 'text-amber-400 bg-amber-500/10 border border-amber-500/20' : 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'}`}>
                      {bulkResult.errors.length > 0 ? 'Carga Parcial' : 'Carga Exitosa'}
                    </span>
                    <h3 className="text-sm font-sans font-bold text-[#E5E5E5] mt-1">Resultado de Carga Masiva</h3>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black p-3 rounded-lg border border-neutral-800/40 text-center">
                    <span className="text-[10px] text-[#8C8C8C] font-mono uppercase block">Creadas</span>
                    <strong className="text-lg font-bold text-emerald-400">{bulkResult.created}</strong>
                  </div>
                  <div className="bg-black p-3 rounded-lg border border-neutral-800/40 text-center">
                    <span className="text-[10px] text-[#8C8C8C] font-mono uppercase block">Con Errores</span>
                    <strong className="text-lg font-bold text-amber-400">{bulkResult.errors.length}</strong>
                  </div>
                </div>

                {bulkResult.errors.length > 0 && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    <p className="text-[10px] font-semibold text-[#8C8C8C] uppercase tracking-wider">
                      Detalle de errores ({bulkResult.errors.length})
                    </p>
                    {bulkResult.errors.map((err, i) => (
                      <div key={i} className="p-2 bg-red-500/5 border border-red-500/20 rounded text-[10px] text-red-400 font-mono">
                        Fila {err.row}: {err.message}
                      </div>
                    ))}
                  </div>
                )}

                {bulkResult.created > 0 && (
                  <p className="text-[11px] text-[#8C8C8C] font-sans bg-black p-3 rounded-lg border border-neutral-800/40">
                    {bulkResult.created} barra{bulkResult.created !== 1 ? 's' : ''} registrada{bulkResult.created !== 1 ? 's' : ''} exitosamente en el inventario del cliente.
                  </p>
                )}
              </div>
              <div className="p-4 bg-black/20 border-t border-neutral-800/20 flex justify-end">
                <button onClick={() => setBulkResult(null)}
                  className="py-2.5 px-6 bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all duration-200 cursor-pointer">
                  Aceptar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedBar && (
          <motion.div key="bar-detail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]">
              <div className="px-5 py-4 bg-gradient-to-b from-black/40 to-transparent border-b border-neutral-800/20 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-black border border-[#D5B042]/20 flex items-center justify-center font-bold text-xs text-[#D5B042]">
                    {selectedBar.barNumber.charAt(0)}
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-[#D5B042] bg-[#D5B042]/10 border border-[#D5B042]/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      Detalle de Barra
                    </span>
                    <h3 className="text-sm font-sans font-bold text-[#E5E5E5] mt-1">{selectedBar.barNumber}</h3>
                  </div>
                </div>
                <button onClick={() => setSelectedBar(null)}
                  className="text-[#8C8C8C] hover:text-[#E5E5E5] bg-black p-1.5 rounded-lg border border-neutral-800/40 transition-colors cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="bg-black rounded-xl border border-neutral-800/40 overflow-hidden">
                  <img
                    src={'https://placehold.co/600x340/1C1C1C/D5B042?text=' + encodeURIComponent(selectedBar.barNumber)}
                    alt={selectedBar.barNumber}
                    className="w-full h-44 object-cover"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-black p-3 rounded-lg border border-neutral-800/40">
                    <span className="text-[9px] font-mono text-[#8C8C8C] uppercase block">Peso Bruto</span>
                    <strong className="text-sm font-mono text-[#E5E5E5]">{formatNumber(Number(selectedBar.grossWeight))} g</strong>
                  </div>
                  <div className="bg-black p-3 rounded-lg border border-neutral-800/40">
                    <span className="text-[9px] font-mono text-[#8C8C8C] uppercase block">Pureza Au</span>
                    <strong className="text-sm font-mono text-[#E5E5E5]">{selectedBar.purity}‰</strong>
                  </div>
                  <div className="bg-black p-3 rounded-lg border border-neutral-800/40">
                    <span className="text-[9px] font-mono text-[#8C8C8C] uppercase block">Fino Analítico</span>
                    <strong className="text-sm font-mono text-[#D5B042]">{formatNumber(Number(selectedBar.fineWeight))} g</strong>
                  </div>
                  <div className="bg-black p-3 rounded-lg border border-neutral-800/40">
                    <span className="text-[9px] font-mono text-[#8C8C8C] uppercase block">Estado</span>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded text-[9px] font-mono font-semibold ${STATUS_STYLES[selectedBar.status] || ''}`}>
                      {STATUS_LABELS[selectedBar.status] || selectedBar.status}
                    </span>
                  </div>
                </div>

                {selectedBar.leyAg ? (
                  <div className="bg-black p-3 rounded-lg border border-neutral-800/40 flex justify-between items-center">
                    <span className="text-[10px] font-mono text-[#8C8C8C]">Ley Ag (Plata)</span>
                    <strong className="text-sm font-mono text-emerald-400">{selectedBar.leyAg}‰</strong>
                  </div>
                ) : null}
              </div>

              <div className="p-4 bg-black/20 border-t border-neutral-800/20 flex justify-end">
                <button onClick={() => setSelectedBar(null)}
                  className="py-2.5 px-6 bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all duration-200 cursor-pointer">
                  Cerrar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
