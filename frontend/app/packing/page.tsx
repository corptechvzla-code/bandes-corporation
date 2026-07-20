'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useBulkUploads } from '@/hooks/useBulkUploads';
import { useClients } from '@/hooks/useClients';
import {
  FolderUp, FileSpreadsheet, Download, Search, AlertTriangle,
  CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp,
} from 'lucide-react';

const STATUS_CONFIG: Record<string, { label: string; style: string; icon: typeof AlertCircle }> = {
  COMPLETED: { label: 'Completado', style: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20', icon: CheckCircle2 },
  PARTIAL: { label: 'Parcial', style: 'bg-amber-500/10 text-amber-400 border border-amber-500/20', icon: AlertTriangle },
  FAILED: { label: 'Fallado', style: 'bg-red-500/10 text-red-400 border border-red-500/20', icon: XCircle },
};

export default function PackingPage() {
  const { data: records = [], isLoading } = useBulkUploads();
  const { data: clients = [] } = useClients();
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const MOCK_CLIENTS: Record<string, string> = {
    'mock-client-1': 'Minera Aurífera del Sur C.A.',
    'mock-client-2': 'Refinería Oro Puro S.A.',
    'mock-client-3': 'Minera Los Andes C.A.',
  };

  const clientName = (clientId: string): string => {
    const found = clients.find(c => c.id === clientId);
    if (found) return found.name;
    return MOCK_CLIENTS[clientId] || clientId.slice(0, 8);
  };

  const filtered = useMemo(() => {
    if (!searchTerm) return records;
    const q = searchTerm.toLowerCase();
    return records.filter(r => r.fileName.toLowerCase().includes(q));
  }, [records, searchTerm]);

  const stats = useMemo(() => ({
    total: records.length,
    created: records.reduce((s, r) => s + r.created, 0),
    errors: records.reduce((s, r) => s + r.errors.length, 0),
  }), [records]);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
            <FolderUp className="w-8 h-8 text-[#D5B042] filter drop-shadow-[0_0_8px_rgba(213,176,66,0.3)]" />
            Packing <span className="text-[#D5B042] font-semibold"> — Carga Masiva</span>
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Historial de archivos Excel subidos al sistema. Descargue los originales y revise errores de validaci&oacute;n.
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Cargas Realizadas', value: stats.total, color: 'text-[#D5B042]', border: 'hover:border-[#D5B042]/30', icon: FolderUp },
          { label: 'Registros Creados', value: stats.created, color: 'text-emerald-400', border: 'hover:border-emerald-500/30', icon: CheckCircle2 },
          { label: 'Errores Totales', value: stats.errors, color: 'text-red-400', border: 'hover:border-red-500/30', icon: AlertTriangle },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className={`bg-[#1C1C1C] p-4 rounded-xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)] flex items-center gap-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(0,0,0,0.4)] ${s.border}`}>
            <s.icon className={`w-5 h-5 ${s.color}`} />
            <div>
              <p className="text-[9px] font-mono text-[#8C8C8C] uppercase tracking-wider">{s.label}</p>
              <p className={`text-lg font-bold font-mono ${s.color}`}>{s.value.toLocaleString()}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-[#1C1C1C] rounded-2xl border border-neutral-800/40 shadow-[0_4px_12px_rgba(0,0,0,0.3)]">
        <div className="p-5 border-b border-neutral-800/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-xs font-semibold text-[#E5E5E5] uppercase tracking-wider flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#D5B042]" />
            Archivos Subidos
          </span>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-[#8C8C8C]/50" />
            <input type="text" placeholder="Buscar archivo..." value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-48 bg-black border border-neutral-800/40 rounded-lg pl-8 pr-2 py-1.5 text-[10px] font-mono text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] placeholder:text-neutral-800" />
          </div>
        </div>

        {isLoading ? (
          <div className="p-16 text-center">
            <div className="w-6 h-6 border-2 border-[#D5B042]/30 border-t-[#D5B042] rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-[#8C8C8C]">Cargando historial...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <FolderUp className="w-10 h-10 text-[#8C8C8C]/30 mx-auto mb-3" />
            <p className="text-sm text-[#E5E5E5] font-semibold">
              {searchTerm ? 'Sin resultados' : 'No hay cargas masivas registradas'}
            </p>
            <p className="text-xs text-[#8C8C8C] mt-1 max-w-md mx-auto">
              {searchTerm
                ? 'Ning&uacute;n archivo coincide con el criterio de b&uacute;squeda.'
                : 'Las cargas realizadas desde Ingresos de Material aparecer&aacute;n aqu&iacute; autom&aacute;ticamente.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead>
                <tr className="border-b border-neutral-800/20 text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider">
                  <th className="py-3 bg-black/50 text-center w-10"></th>
                  <th className="py-3 bg-black/50 text-center">Archivo</th>
                  <th className="py-3 bg-black/50 text-center">Cliente</th>
                  <th className="py-3 bg-black/50 text-center">Fecha</th>
                  <th className="py-3 bg-black/50 text-center">Filas</th>
                  <th className="py-3 bg-black/50 text-center">Creados</th>
                  <th className="py-3 bg-black/50 text-center">Errores</th>
                  <th className="py-3 bg-black/50 text-center">Estado</th>
                  <th className="py-3 bg-black/50 text-center">Descargar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800/20">
                {filtered.map(record => {
                  const cfg = STATUS_CONFIG[record.status] || STATUS_CONFIG.FAILED;
                  const Icon = cfg.icon;
                  const isExpanded = expandedId === record.id;
                  const hasErrors = record.errors.length > 0;
                  return (
                    <React.Fragment key={record.id}>
                      <tr className="hover:bg-[#141414]/80 transition-colors">
                        <td className="py-3 text-center">
                          <FileSpreadsheet className="w-4 h-4 text-[#D5B042]/60 mx-auto" />
                        </td>
                        <td className="py-3 font-mono text-[#E5E5E5] text-[11px] text-center truncate max-w-[180px]" title={record.fileName}>
                          {record.fileName}
                        </td>
                        <td className="py-3 font-mono text-[#8C8C8C] text-center">{clientName(record.clientId)}</td>
                        <td className="py-3 font-mono text-[#8C8C8C] text-[10px] text-center">
                          {new Date(record.createdAt).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 text-center font-mono text-[#E5E5E5]">{record.totalRows}</td>
                        <td className="py-3 text-center font-mono text-emerald-400">{record.created}</td>
                        <td className="py-3 text-center">
                          {hasErrors ? (
                            <button type="button" onClick={() => setExpandedId(isExpanded ? null : record.id)}
                              className="font-mono text-red-400 hover:text-red-300 flex items-center justify-center gap-0.5 mx-auto cursor-pointer">
                              {record.errors.length}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                          ) : (
                            <span className="font-mono text-neutral-600">0</span>
                          )}
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold font-mono ${cfg.style}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <a href={`http://localhost:3001/bulk-uploads/${record.id}/download`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black border border-neutral-800/40 text-[#D5B042] hover:bg-[#D5B042]/10 hover:border-[#D5B042]/30 transition-all text-[9px] font-mono font-bold uppercase tracking-wider">
                            <Download className="w-3 h-3" />
                            Excel
                          </a>
                        </td>
                      </tr>
                      <AnimatePresence>
                        {isExpanded && hasErrors && (
                          <motion.tr key={`errors-${record.id}`}
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                            <td colSpan={9} className="p-0">
                              <div className="bg-black/60 border-t border-neutral-800/20 px-5 py-3 space-y-1.5">
                                <p className="text-[9px] font-mono text-red-400 uppercase tracking-wider font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Errores de validaci&oacute;n ({record.errors.length})
                                </p>
                                {record.errors.map((err, idx) => (
                                  <div key={idx} className="flex gap-3 text-[10px] font-mono">
                                    <span className="text-[#8C8C8C] shrink-0 w-12">Fila {err.row}:</span>
                                    <span className="text-red-300">{err.message}</span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
