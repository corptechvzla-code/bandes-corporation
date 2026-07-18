'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  useClients,
  useCreateClient,
  useUpdateClient,
  useDeleteClient,
} from '@/hooks/useClients';
import {
  Users,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Check,
  Search,
  Building2,
  Phone,
  Hash,
} from 'lucide-react';
import type { Client } from '@/types/api';

export default function ClientesPage() {
  const { data: clients = [], isLoading, isError, error } = useClients();
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const deleteClient = useDeleteClient();

  const [showForm, setShowForm] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [rif, setRif] = useState('');
  const [name, setName] = useState('');
  const [contactInfo, setContactInfo] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deleteState, setDeleteState] = useState<{ id: string; status: 'deleting' | 'success' } | null>(null);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.rif.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const openCreateForm = () => {
    setEditingClient(null);
    setRif('');
    setName('');
    setContactInfo('');
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  const openEditForm = (client: Client) => {
    setEditingClient(client);
    setRif(client.rif);
    setName(client.name);
    setContactInfo(client.contactInfo || '');
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingClient(null);
    setRif('');
    setName('');
    setContactInfo('');
    setFormError('');
    setFormSuccess('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!rif.trim() || !name.trim()) {
      setFormError('RIF y NOMBRE son obligatorios.');
      return;
    }

    try {
      if (editingClient) {
        await updateClient.mutateAsync({
          id: editingClient.id,
          data: { rif: rif.trim(), name: name.trim(), contactInfo: contactInfo.trim() || undefined },
        });
        setFormSuccess('Cliente actualizado correctamente.');
      } else {
        await createClient.mutateAsync({
          rif: rif.trim(),
          name: name.trim(),
          contactInfo: contactInfo.trim() || undefined,
        });
        setFormSuccess('Cliente creado correctamente.');
        setRif('');
        setName('');
        setContactInfo('');
      }
      setTimeout(() => setFormSuccess(''), 3000);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Error al guardar el cliente.');
    }
  };

  const handleDelete = async (id: string) => {
    setConfirmDeleteId(null);
    setDeleteState({ id, status: 'deleting' });
    try {
      await deleteClient.mutateAsync(id);
      setDeleteState({ id, status: 'success' });
    } catch {
      setDeleteState(null);
    }
    setTimeout(() => setDeleteState(null), 3000);
  };

  const formatRif = (raw: string) => {
    if (raw.length !== 10) return raw;
    return `${raw[0]}-${raw.slice(1, 9)}-${raw[9]}`;
  };

  const isLoadingMutation = createClient.isPending || updateClient.isPending;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-sans font-medium text-[#E5E5E5] tracking-tight flex items-center gap-2">
            <Building2 className="w-8 h-8 text-[#D5B042] filter drop-shadow-[0_0_8px_rgba(213,176,66,0.3)]" />
            Clientes <span className="text-[#D5B042] font-semibold">Proveedores</span>
          </h1>
          <p className="text-xs text-[#8C8C8C] mt-1">
            Registro y administración de clientes proveedores de material.
          </p>
        </div>
        <button
          onClick={showForm && !editingClient ? closeForm : openCreateForm}
          className={`px-4 py-2.5 rounded-xl font-mono text-xs uppercase tracking-wider font-bold border transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 shrink-0 self-start sm:self-center ${
            showForm && !editingClient
              ? 'bg-[#1C1C1C] text-[#8C8C8C] border-neutral-800/40 hover:text-[#E5E5E5]'
              : 'bg-[#A65B17]/20 text-[#D5B042] border-[#A65B17]/30 hover:bg-[#A65B17]/30 shadow-[0_4px_12px_rgba(166,91,23,0.1)]'
          }`}
        >
          <Plus className={`w-4 h-4 transition-transform duration-200 ${showForm && !editingClient ? 'rotate-45 text-[#8C8C8C]' : 'text-[#D5B042]'}`} />
          {showForm && !editingClient ? 'Cerrar Formulario' : 'Nuevo Cliente'}
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
                  {editingClient ? (
                    <Pencil className="w-4 h-4 text-[#D5B042]" />
                  ) : (
                    <Plus className="w-4 h-4 text-[#D5B042]" />
                  )}
                  {editingClient ? 'Editar Cliente' : 'Nuevo Cliente'}
                </h3>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#8C8C8C] uppercase flex items-center gap-1">
                      <Hash className="w-3 h-3" /> RIF <span className="text-[#D5B042] font-bold">J-</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs font-mono text-[#D5B042] font-bold select-none pointer-events-none">J-</span>
                      <input
                        type="text"
                        maxLength={9}
                        placeholder="123456789"
                        value={rif}
                        onChange={(e) => setRif(e.target.value.replace(/\D/g, '').slice(0, 9))}
                        className="w-full bg-black border border-neutral-800/40 rounded-lg pl-8 pr-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors placeholder:text-neutral-800"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#8C8C8C] uppercase flex items-center gap-1">
                      <Building2 className="w-3 h-3" /> Nombre
                    </label>
                    <input
                      type="text"
                      placeholder="Nombre del cliente"
                      value={name}
                      onChange={(e) => setName(e.target.value.toUpperCase())}
                      className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors uppercase placeholder:text-neutral-800"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-[#8C8C8C] uppercase flex items-center gap-1">
                      <Phone className="w-3 h-3" /> Contacto <span className="text-[#8C8C8C]/50">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Teléfono, email o persona de contacto"
                      value={contactInfo}
                      onChange={(e) => setContactInfo(e.target.value)}
                      className="w-full bg-black border border-neutral-800/40 rounded-lg px-3 py-2.5 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] transition-colors placeholder:text-neutral-800"
                    />
                  </div>

                  {formError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-xs rounded-lg">{formError}</div>
                  )}
                  {formSuccess && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs rounded-lg flex items-center gap-1.5">
                      <Check className="w-4 h-4 shrink-0" />{formSuccess}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoadingMutation}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#B4941E] to-[#D5B042] text-black font-semibold text-xs uppercase tracking-wider hover:brightness-110 shadow-[0_4px_12px_rgba(180,148,30,0.15)] hover:shadow-[0_4px_16px_rgba(213,176,66,0.3)] transition-all duration-200 cursor-pointer disabled:opacity-50"
                  >
                    {isLoadingMutation
                      ? 'GUARDANDO...'
                      : editingClient
                        ? 'Actualizar Cliente'
                        : 'Registrar Cliente'}
                  </button>
                </form>
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
                <h3 className="font-sans font-semibold text-[#E5E5E5] text-base">Listado de Clientes</h3>
                <p className="text-xs text-[#8C8C8C]">
                  {clients.length} cliente{clients.length !== 1 ? 's' : ''} registrado{clients.length !== 1 ? 's' : ''}.
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-[#8C8C8C]/50" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o RIF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full md:w-56 bg-black border border-neutral-800/40 rounded-lg pl-9 pr-3 py-2 text-xs font-sans text-[#E5E5E5] focus:outline-none focus:border-[#D5B042] placeholder:text-neutral-800"
                />
              </div>
            </div>

            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#8C8C8C]">
                <div className="w-8 h-8 border-2 border-[#D5B042] border-t-transparent rounded-full animate-spin mb-3" />
                <span className="text-sm font-sans">Cargando clientes...</span>
              </div>
            ) : isError ? (
              <div className="flex flex-col items-center justify-center py-16 text-red-400">
                <AlertTriangle className="w-8 h-8 mb-3" />
                <span className="text-sm font-sans">Error al cargar clientes</span>
                <span className="text-xs text-[#8C8C8C] mt-1">{(error as any)?.message || 'Error de conexión'}</span>
              </div>
            ) : filteredClients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#8C8C8C] border border-dashed border-neutral-800/40 rounded-lg">
                <Users className="w-8 h-8 text-[#D5B042]/30 mb-2 animate-pulse" />
                <span className="text-sm font-sans">
                  {searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
                </span>
                {!searchQuery && (
                  <button
                    onClick={openCreateForm}
                    className="mt-3 px-4 py-2 rounded-lg bg-[#A65B17]/20 text-[#D5B042] border border-[#A65B17]/30 hover:bg-[#A65B17]/30 text-xs font-mono uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3 inline mr-1" /> Registrar Primer Cliente
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-sans">
                  <thead>
                    <tr className="border-b border-neutral-800/20 text-[10px] font-mono text-[#8C8C8C] uppercase tracking-wider">
                      <th className="pb-3 pl-2">RIF</th>
                      <th className="pb-3">Nombre</th>
                      <th className="pb-3 hidden sm:table-cell">Contacto</th>
                      <th className="pb-3 hidden md:table-cell">Creado</th>
                      <th className="pb-3 text-right pr-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/20 text-[#E5E5E5]/90">
                    {filteredClients.map((client) => (
                      <tr key={client.id} className="hover:bg-[#141414]/85 transition-colors">
                        <td className="py-3.5 pl-2 font-mono text-[#D5B042] font-bold text-[11px] tracking-wider">
                          {formatRif(client.rif)}
                        </td>
                        <td className="py-3.5 font-semibold">{client.name}</td>
                        <td className="py-3.5 text-[#8C8C8C] hidden sm:table-cell">
                          {client.contactInfo || <span className="text-[#8C8C8C]/40">—</span>}
                        </td>
                        <td className="py-3.5 text-[#8C8C8C] font-mono text-[10px] hidden md:table-cell">
                          {new Date(client.createdAt).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="py-3.5 text-right pr-2">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditForm(client)}
                              className="p-1.5 rounded hover:bg-[#D5B042]/10 text-[#8C8C8C] hover:text-[#D5B042] transition-colors cursor-pointer"
                              title="Editar cliente"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(client.id)}
                              className="p-1.5 rounded hover:bg-red-500/10 text-[#8C8C8C] hover:text-red-400 transition-colors cursor-pointer"
                              title="Eliminar cliente"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {confirmDeleteId && (
          <motion.div
            key="confirm-delete"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-md overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-950/30 rounded-lg border border-red-500/20">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <span className="text-[9px] font-mono text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">
                      Eliminar Cliente
                    </span>
                    <h3 className="text-sm font-sans font-bold text-[#E5E5E5] mt-1">Confirmar Eliminación</h3>
                  </div>
                </div>
                <p className="text-xs text-[#8C8C8C] leading-relaxed">
                  ¿Está seguro que desea eliminar este cliente del registro?
                </p>
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-[10px] font-mono">
                  Esta acción no se puede deshacer. Solo se eliminará si no tiene barras en el historial.
                </div>
              </div>
              <div className="p-6 bg-black/20 border-t border-neutral-800/20 flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="py-2.5 px-4 bg-black hover:bg-[#141414] border border-neutral-800/40 text-gray-300 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDelete(confirmDeleteId)}
                  className="py-2.5 px-4 bg-red-600 hover:bg-red-500 text-white font-semibold text-xs uppercase tracking-wider rounded-xl transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Eliminar Cliente
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteState && (
          <motion.div
            key="deleting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="bg-[#1C1C1C] border border-neutral-800/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-[0_10px_35px_rgba(0,0,0,0.8)]"
            >
              <div className="p-8 flex flex-col items-center space-y-5">
                {deleteState.status === 'deleting' ? (
                  <>
                    <div className="w-12 h-12 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs font-sans font-semibold text-[#E5E5E5]">Eliminando Cliente...</p>
                  </>
                ) : (
                  <>
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-16 h-16 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center"
                    >
                      <Check className="w-8 h-8 text-emerald-400" strokeWidth={2.5} />
                    </motion.div>
                    <p className="text-sm font-sans font-bold text-emerald-400">Cliente Eliminado</p>
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
