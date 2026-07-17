'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useGoldTraceability } from '../../src/context/GoldTraceabilityContext';
import { GoldBar } from '../../src/types';
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
  Scale, 
  Sparkles,
  Info
} from 'lucide-react';

export default function IngresosPage() {
  const { suppliers, goldBars, addGoldBar, addGoldBarsBulk, deleteGoldBar } = useGoldTraceability();

  const [showForm, setShowForm] = useState<boolean>(false);
  const [supplierId, setSupplierId] = useState<string>(suppliers[0]?.id || '');
  const [code, setCode] = useState<string>('');
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [ley, setLey] = useState<string>('');
  const [leyAg, setLeyAg] = useState<string>('');
  const [formError, setFormError] = useState<string>('');
  const [formSuccess, setFormSuccess] = useState<string>('');
  const [isBulkOpen, setIsBulkOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [parsedBulkBars, setParsedBulkBars] = useState<any[] | null>(null);
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [confirmDeleteCode, setConfirmDeleteCode] = useState<string | null>(null);
  const [deletingState, setDeletingState] = useState<{ code: string; status: 'deleting' | 'success' } | null>(null);
  const [ingestingState, setIngestingState] = useState<{ code: string; status: 'ingesting' | 'success' } | null>(null);
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    'SUP-01': true,
    'SUP-02': true,
    'SUP-03': true,
  });

  const liveFA = useMemo(() => {
    const w = parseFloat(grossWeight);
    const l = parseFloat(ley);
    if (isNaN(w) || isNaN(l)) return 0;
    return w * (l / 1000);
  }, [grossWeight, ley]);

  const liveFE = useMemo(() => {
    return liveFA * 0.99;
  }, [liveFA]);

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
    const l = parseFloat(ley);
    return !isNaN(w) && !isNaN(l) && l < 850 && w > 1000;
  }, [grossWeight, ley]);

  const handleSubmitBar = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!code || !grossWeight || !ley) {
      setFormError('Por favor complete todos los campos obligatorios.');
      return;
    }

    const w = parseFloat(grossWeight);
    const l = parseFloat(ley);
    const lAg = parseFloat(leyAg) || 0;

    if (isNaN(w) || w <= 0) {
      setFormError('El peso bruto debe ser un número positivo.');
      return;
    }
    if (isNaN(l) || l < 0 || l > 1000) {
      setFormError('La ley Au debe estar entre 0 y 1000‰ (milésimas de pureza).');
      return;
    }
    if (isNaN(lAg) || lAg < 0 || lAg > 1000) {
      setFormError('La ley Ag debe estar entre 0 y 1000‰.');
      return;
    }

    const upperCode = code.toUpperCase().trim();

    const result = addGoldBar({
      code: upperCode,
      supplierId,
      grossWeight: w,
      ley: l,
      leyAg: lAg,
    });

    if (result.success) {
      setCode('');
      setGrossWeight('');
      setLey('');
      setLeyAg('');
      setIngestingState({ code: upperCode, status: 'ingesting' });
      setTimeout(() => {
        setIngestingState({ code: upperCode, status: 'success' });
      }, 1000);
      setTimeout(() => {
        setIngestingState(null);
      }, 3000);
    } else {
      setFormError(result.error || 'Ocurrió un error al registrar la barra.');
    }
  };

  const toggleAccordion = (supId: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [supId]: !prev[supId],
    }));
  };

  const closeAllAccordions = () => {
    setOpenAccordions({});
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    triggerMockExcelParse();
  };

  const triggerMockExcelParse = () => {
    const mockExcelRows = [
      { code: 'BAR-MGS-5012', supplierId: 'SUP-02', grossWeight: 4500, ley: 915, leyAg: 40 },
      { code: 'BAR-IAC-1192', supplierId: 'SUP-01', grossWeight: 3100, ley: 890, leyAg: 52 },
      { code: 'BAR-CMB-8224', supplierId: 'SUP-03', grossWeight: 1400, ley: 845, leyAg: 75 },
    ];
    setParsedBulkBars(mockExcelRows);
    setBulkSuccessMsg('');
  };

  const handleConfirmBulkUpload = () => {
    if (!parsedBulkBars) return;

    const result = addGoldBarsBulk(parsedBulkBars);
    if (result.success) {
      setBulkSuccessMsg(`Se importaron con éxito ${result.addedCount} barras al sistema de trazabilidad.`);
      if (result.error) {
        setBulkSuccessMsg(prev => prev + ' ' + result.error);
      }
      setParsedBulkBars(null);
    } else {
      setFormError(result.error || 'Fallo de importación masiva.');
    }
  };

  const downloadExcelTemplate = () => {
    alert('Simulación de Descarga: El archivo "Bandes_Carga_Masiva_Template.xlsx" ha sido generado con las columnas (CÓDIGO, PESO BRUTO, LEY Au, LEY Ag, LOTE Nº) y descargado con éxito.');
  };

  const filteredBars = useMemo(() => {
    return goldBars.filter(bar => 
      bar.code.toUpperCase().includes(searchQuery.toUpperCase())
    );
  }, [goldBars, searchQuery]);

  const barsBySupplier = useMemo(() => {
    const groups: Record<string, GoldBar[]> = {};
    suppliers.forEach(s => {
      groups[s.id] = [];
    });

    filteredBars.forEach(b => {
      if (!groups[b.supplierId]) {
        groups[b.supplierId] = [];
      }
      groups[b.supplierId].push(b);
    });

    return groups;
  }, [filteredBars, suppliers]);

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
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
            <ClipboardList className="w-8 h-8 text-[#D5B042] filter drop-shadow-[0_0_8px_rgba(213,176,66,0.3)]" />
            Ingreso de Material <span className="text-[#D5B042] font-semibold">Gold Ingestion</span>
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Registro físico de barras de oro crudo. Calcule leyes analíticas al instante, realice cargas de plantilla masivas y agrupe stocks por cliente.
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
          {showForm ? 'Cerrar Formulario' : 'Nueva Barra'}
        </button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
        
        <AnimatePresence>
          {showForm && (
            <motion.div 
              key="form-panel"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="lg:col-span-2 space-y-6"
            >
          
          <div className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <h3 className="text-sm font-semibold text-[#E5E5E5] uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-neutral-800/20 pb-3">
              <Plus className="w-4 h-4 text-[#D5B042]" />
              Nueva Barra (Individual)
            </h3>

            <form onSubmit={handleSubmitBar} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Cliente / Socio</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors cursor-pointer"
                >
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.code})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Código de Barra Único</label>
                <input
                  type="text"
                  placeholder="Ej: BAR-IAC-9428"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors uppercase placeholder:text-neutral-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Peso Bruto (g)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={grossWeight}
                      onChange={(e) => setGrossWeight(e.target.value)}
                      className={`w-full bg-black border rounded-lg pl-3 pr-8 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none transition-colors
                        ${weightWarning || purityWarning ? 'border-[#A65B17] focus:border-[#A65B17]' : 'border-neutral-800/40 focus:border-[#D5B042]'}`}
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-mono text-[#8C8C8C]">g</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Ley Au (‰)</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      placeholder="Ej: 900"
                      value={ley}
                      onChange={(e) => setLey(e.target.value)}
                      className={`w-full bg-black border rounded-lg pl-3 pr-10 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none transition-colors
                        ${purityWarning ? 'border-[#A65B17] focus:border-[#A65B17]' : 'border-neutral-800/40 focus:border-[#D5B042]'}`}
                      required
                    />
                    <span className="absolute right-3 top-2.5 text-[10px] font-mono text-[#8C8C8C]">Au‰</span>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-[#8C8C8C] uppercase">Ley Ag Plata (‰) <span className="text-[#8C8C8C]/50">(Opcional)</span></label>
                <div className="relative">
                  <input
                    type="number"
                    step="1"
                    placeholder="Ej: 40"
                    value={leyAg}
                    onChange={(e) => setLeyAg(e.target.value)}
                    className="w-full bg-black border border-neutral-800/40 rounded-lg pl-3 pr-10 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors"
                  />
                  <span className="absolute right-3 top-2.5 text-[10px] font-mono text-[#8C8C8C]">Ag‰</span>
                </div>
              </div>

              {weightWarning && (
                <div className="p-3 bg-black border border-[#A65B17]/30 rounded-xl text-[#A65B17] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] font-sans">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    ADVERTENCIA DE PESO CRÍTICO
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    El peso bruto excede los 24,900 g. Asegúrese de que el crisol soporte esta capacidad.
                  </p>
                </div>
              )}

              {purityWarning && (
                <div className="p-3 bg-black border border-[#A65B17]/30 rounded-xl text-[#A65B17] space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-[11px] font-sans">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    RESTRICCIÓN DE PUREZA Y PESO
                  </div>
                  <p className="text-[10px] leading-relaxed">
                    Ley inferior a 850‰ no puede pesar más de 1,000 gramos para fundiciones de alta gama.
                  </p>
                </div>
              )}

              <div className="bg-black p-4 rounded-xl border border-neutral-800/40 space-y-2.5">
                <div className="flex justify-between items-center text-[10px] font-mono text-[#8C8C8C]">
                  <span>Fórmulas de Trazabilidad:</span>
                  <span className="text-[#D5B042] font-semibold">Auto-cálculo</span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-xs font-mono border-t border-neutral-800/20 pt-2">
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#8C8C8C]/60 uppercase block">Fino Analítico (FA)</span>
                    <strong className="text-[#E5E5E5] text-[13px]">{liveFA.toFixed(2)} g</strong>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-[#8C8C8C]/60 uppercase block">Fino Esperado (FE)</span>
                    <strong className="text-[#E5E5E5] text-[13px]">{liveFE.toFixed(2)} g</strong>
                  </div>
                </div>

                {liveAnalyticalAg > 0 && (
                  <div className="text-[10px] font-mono text-emerald-400 pt-1.5 flex justify-between items-center border-t border-neutral-800/20">
                    <span>Fino Analítico Ag (Plata):</span>
                    <strong>{liveAnalyticalAg.toFixed(2)} g Ag</strong>
                  </div>
                )}
              </div>

              {formError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-1.5">
                  <Check className="w-4 h-4 shrink-0" />
                  {formSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_4px_12px_rgba(180,148,30,0.15)] hover:shadow-[0_4px_16px_rgba(213,176,66,0.3)] transition-all duration-200 cursor-pointer"
              >
                Registrar Ingesta (IN)
              </button>
            </form>
          </div>

          <div className="bg-[#1C1C1C] rounded-2xl border border-neutral-800/40 overflow-hidden shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            <button
              onClick={() => setIsBulkOpen(!isBulkOpen)}
              className="w-full p-5 flex items-center justify-between text-left focus:outline-none hover:bg-[#141414] transition-colors"
            >
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
                
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={triggerMockExcelParse}
                  className={`border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer flex flex-col items-center justify-center space-y-2
                    ${isDragging 
                      ? 'border-[#D5B042] bg-[#241D0E]/20 text-[#D5B042]' 
                      : 'border-neutral-800/40 hover:border-[#D5B042]/40 text-[#8C8C8C] hover:text-[#E5E5E5]'}`}
                >
                  <Upload className="w-8 h-8 text-emerald-500 animate-bounce" />
                  <span className="text-xs font-semibold">Arrastre el archivo Excel o haga clic aquí</span>
                  <span className="text-[10px] text-[#8C8C8C]/50 font-mono">Soporta: .xlsx, .xls, .csv (Máx. 10MB)</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-[#141414] rounded-lg border border-neutral-800/40 text-[11px] font-sans text-[#8C8C8C]">
                  <span className="flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-emerald-500" />
                    ¿No tiene la plantilla estándar?
                  </span>
                  <button
                    onClick={downloadExcelTemplate}
                    className="flex items-center gap-1 text-emerald-400 font-semibold hover:underline"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar xlsx
                  </button>
                </div>

                {parsedBulkBars && (
                  <div className="bg-[#141414] border border-emerald-500/20 rounded-lg p-3 space-y-3">
                    <div className="flex justify-between items-center text-[10px] font-mono text-emerald-400">
                      <span>✓ Datos de Excel analizados:</span>
                      <span>3 barras encontradas</span>
                    </div>

                    <div className="space-y-1.5 text-[10px] font-mono text-[#8C8C8C] max-h-28 overflow-y-auto">
                      {parsedBulkBars.map((b, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-black p-2 rounded border border-neutral-800/40">
                          <span>{b.code} ({suppliers.find(s => s.id === b.supplierId)?.code})</span>
                          <span>{b.grossWeight}g | Au:{b.ley}‰</span>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={handleConfirmBulkUpload}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Confirmar Carga e Importar
                    </button>
                  </div>
                )}

                {bulkSuccessMsg && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-lg">
                    {bulkSuccessMsg}
                  </div>
                )}
              </div>
            )}
          </div>

        </motion.div>
          )}
        </AnimatePresence>

        <motion.div 
          initial={{ opacity: 0, y: 25 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.5, duration: 0.4, ease: 'easeOut' }}
          className={`${showForm ? 'lg:col-span-3' : 'lg:col-span-5'} space-y-6`}
        >
          
          <div className="bg-[#1C1C1C] p-6 rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h3 className="font-sans font-semibold text-[#E5E5E5] text-base">Barras Registradas en Bóveda</h3>
                <p className="text-xs text-[#8C8C8C]">Administre el inventario crudo e identifique códigos listos para ser procesados.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={closeAllAccordions}
                  className="flex items-center gap-1.5 px-3 py-2 bg-black border border-neutral-800/40 rounded-lg text-[10px] font-mono text-[#8C8C8C] hover:text-[#E5E5E5] hover:border-neutral-700 transition-colors cursor-pointer"
                  title="Cerrar todos los acordeones"
                >
                  <ChevronsUp className="w-3.5 h-3.5" />
                  Cerrar Todas
                </button>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8C8C8C]/50" />
                  <input
                    type="text"
                    placeholder="Buscar código de barra..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full md:w-56 bg-black border border-neutral-800/40 rounded-lg pl-9 pr-3 py-2 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] placeholder:text-neutral-800"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-4">
              {suppliers.map(sup => {
                const groupBars = barsBySupplier[sup.id] || [];
                const isExpanded = openAccordions[sup.id];
                
                const totalWeight = groupBars.reduce((sum, b) => sum + b.grossWeight, 0);
                const totalFA = groupBars.reduce((sum, b) => sum + b.analytical, 0);
                
                return (
                  <div key={sup.id} className="bg-[#1C1C1C] rounded-xl border border-neutral-800/40 overflow-hidden shadow-[0_2px_8px_rgba(0,0,0,0.15)]">
                    
                    <button
                      onClick={() => toggleAccordion(sup.id)}
                      className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-[#141414] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-black border border-[#D5B042]/20 flex items-center justify-center font-bold text-xs text-[#D5B042]">
                          {sup.code}
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-[#E5E5E5] uppercase tracking-wider">{sup.name}</h4>
                          <span className="text-[10px] text-[#8C8C8C] font-sans">{sup.location}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right hidden md:block">
                          <span className="text-[10px] text-[#8C8C8C]/50 block uppercase font-mono">Total Crudo / Fino</span>
                          <span className="text-xs font-mono font-bold text-[#D5B042]">
                            {(totalWeight / 1000).toFixed(2)} kg / {(totalFA / 1000).toFixed(2)} kg Au
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
                          <div className="text-center py-6 text-[11px] text-[#8C8C8C] font-sans">
                            No hay barras activas registradas para este cliente.
                          </div>
                        ) : (
                          <table className="w-full text-left text-xs font-sans">
                            <thead>
                              <tr className="border-b border-neutral-800/20 text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider">
                                <th className="pb-2">Código</th>
                                <th className="pb-2 text-right">Peso Bruto (g)</th>
                                <th className="pb-2 text-center">Ley Au / Ag</th>
                                <th className="pb-2 text-right">FA (Fino Au)</th>
                                <th className="pb-2 text-right">FE (Au 99%)</th>
                                <th className="pb-2 text-center">Estado</th>
                                <th className="pb-2 text-right">Acciones</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-800/20 text-[#E5E5E5]/90">
                              {groupBars.map(bar => (
                                <tr key={bar.code} className="hover:bg-[#141414]/85 transition-colors">
                                  <td className="py-3 font-mono font-bold text-[#D5B042]">{bar.code}</td>
                                  <td className="py-3 text-right font-mono">{bar.grossWeight.toLocaleString()} g</td>
                                  <td className="py-3 text-center font-mono">
                                    <span className="text-[#E5E5E5]">{bar.ley}</span>
                                    <span className="text-[#8C8C8C]/50"> / {bar.leyAg || 0}‰</span>
                                  </td>
                                  <td className="py-3 text-right font-mono text-[#8C8C8C]">{bar.analytical.toLocaleString()} g</td>
                                  <td className="py-3 text-right font-mono text-[#8C8C8C]">{bar.expected.toLocaleString()} g</td>
                                  <td className="py-3 text-center">
                                    <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-mono font-semibold
                                      ${bar.status === 'INGRESADO' ? 'bg-[#152B1E] text-emerald-400 border border-emerald-500/10' :
                                        bar.status === 'PROCESANDO' ? 'bg-black text-[#A65B17] border border-[#A65B17]/20' :
                                        bar.status === 'COMPLETADO' ? 'bg-black text-[#D5B042] border border-[#D5B042]/20' :
                                        'bg-blue-900/20 text-blue-400'}`}
                                    >
                                      {bar.status}
                                    </span>
                                  </td>
                                  <td className="py-3 text-right">
                                    <button
                                      onClick={() => setConfirmDeleteCode(bar.code)}
                                      disabled={bar.status !== 'INGRESADO'}
                                      className={`p-1.5 rounded hover:bg-red-500/10 text-[#8C8C8C] hover:text-red-400 transition-colors cursor-pointer
                                        ${bar.status !== 'INGRESADO' ? 'opacity-30 cursor-not-allowed' : ''}`}
                                      title={bar.status !== 'INGRESADO' ? 'No se puede eliminar un material que ya se encuentra en fundición.' : 'Eliminar barra'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
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
                  <strong className="text-[#E5E5E5] text-base font-bold">{goldBars.length} u</strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C8C8C]/50 block">MASA BRUTA</span>
                  <strong className="text-[#E5E5E5] text-base font-bold">
                    {(goldBars.reduce((sum, b) => sum + b.grossWeight, 0) / 1000).toFixed(3)} kg
                  </strong>
                </div>
                <div>
                  <span className="text-[10px] text-[#8C8C8C]/50 block">TOTAL FINO AU ESPERADO</span>
                  <strong className="text-[#D5B042] text-base font-bold">
                    {(goldBars.reduce((sum, b) => sum + b.expected, 0) / 1000).toFixed(3)} kg Au
                  </strong>
                </div>
              </div>
            </div>

          </div>

        </motion.div>

      </div>

      <AnimatePresence>
        {confirmDeleteCode && (
          <motion.div
            key="confirm-delete-backdrop"
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
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
            >
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
                  ¿Está seguro que desea eliminar la barra <strong className="text-[#E5E5E5] font-mono">{confirmDeleteCode}</strong> del registro?
                </p>
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[10px] font-mono">
                  Esta acción no se puede deshacer. Se eliminará permanentemente del sistema de trazabilidad.
                </div>
              </div>
              <div className="p-6 bg-black/20 border-t border-neutral-800/20 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteCode(null)}
                  className="py-2.5 px-4 bg-black hover:bg-[#141414] border border-neutral-800/40 text-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const code = confirmDeleteCode;
                    setConfirmDeleteCode(null);
                    setDeletingState({ code, status: 'deleting' });
                    setTimeout(() => {
                      deleteGoldBar(code);
                      setDeletingState({ code, status: 'success' });
                    }, 1000);
                    setTimeout(() => {
                      setDeletingState(null);
                    }, 3000);
                  }}
                  className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Eliminar Barra
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {ingestingState && (
          <motion.div
            key="ingesting-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
            >
              <div className="p-8 flex flex-col items-center space-y-5">
                {ingestingState.status === 'ingesting' ? (
                  <>
                    <div className="w-full max-w-[200px] h-14 bg-[#141414] rounded-lg border border-neutral-700/60 overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] relative">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute inset-0 bg-gradient-to-r from-[#8A6F1D] via-[#B4941E] to-[#D5B042] rounded-lg"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-mono font-bold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">
                          {ingestingState.code}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#7E6611] to-[#D5B042]">
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="h-full bg-gradient-to-r from-[#F5E6A3] to-white/60 rounded-full"
                        />
                      </div>
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-xs font-sans font-semibold text-[#E5E5E5]">Registrando Barra...</p>
                      <p className="text-[10px] font-mono text-[#8C8C8C]">
                        Ingresando <strong className="text-[#D5B042]">{ingestingState.code}</strong> al sistema de trazabilidad
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#8C8C8C]/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D5B042] animate-pulse" />
                      Procesando ingesta
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                      className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center"
                    >
                      <Check className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
                    </motion.div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-sans font-bold text-emerald-400">Barra Registrada</p>
                      <p className="text-[10px] font-mono text-[#8C8C8C]">
                        <strong className="text-[#E5E5E5]">{ingestingState.code}</strong> ingresada al sistema con trazabilidad IN
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
          <motion.div
            key="deleting-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
            >
              <div className="p-8 flex flex-col items-center space-y-5">
                {deletingState.status === 'deleting' ? (
                  <>
                    <div className="w-full max-w-[200px] h-14 bg-[#141414] rounded-lg border border-neutral-700/60 overflow-hidden shadow-[inset_0_2px_6px_rgba(0,0,0,0.6)] relative">
                      <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: '100%' }}
                        transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                        className="absolute inset-0 bg-gradient-to-r from-[#8A6F1D] via-[#B4941E] to-[#D5B042] rounded-lg"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[11px] font-mono font-bold text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] tracking-wider">
                          {deletingState.code}
                        </span>
                      </div>
                      <div className="absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r from-[#7E6611] to-[#D5B042]">
                        <motion.div
                          initial={{ width: '0%' }}
                          animate={{ width: '100%' }}
                          transition={{ duration: 1.0, ease: [0.25, 0.46, 0.45, 0.94] }}
                          className="h-full bg-gradient-to-r from-[#F5E6A3] to-white/60 rounded-full"
                        />
                      </div>
                    </div>
                    <div className="text-center space-y-1.5">
                      <p className="text-xs font-sans font-semibold text-[#E5E5E5]">Eliminando Barra...</p>
                      <p className="text-[10px] font-mono text-[#8C8C8C]">
                        Retirando <strong className="text-[#D5B042]">{deletingState.code}</strong> del registro
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[9px] font-mono text-[#8C8C8C]/50">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D5B042] animate-pulse" />
                      Procesando trazabilidad
                    </div>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 200, damping: 12 }}
                      className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center"
                    >
                      <Check className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
                    </motion.div>
                    <div className="text-center space-y-1.5">
                      <p className="text-sm font-sans font-bold text-emerald-400">Barra Eliminada</p>
                      <p className="text-[10px] font-mono text-[#8C8C8C]">
                        <strong className="text-[#E5E5E5]">{deletingState.code}</strong> fue retirada del sistema de trazabilidad
                      </p>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </motion.div>
  );
}
