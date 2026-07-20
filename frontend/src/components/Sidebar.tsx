'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Flame,
  ArrowLeftRight,
  FileText,
  Menu,
  Coins,
  LogOut,
  FolderUp,
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const activeTab = pathname.split('/')[1] || 'dashboard';
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard },
    { id: 'clientes', name: 'Clientes', icon: Users },
    { id: 'packing', name: 'Packing', icon: FolderUp },
    { id: 'ingresos', name: 'Ingresos de Material', icon: ClipboardList },
    { id: 'procesos', name: 'Procesos de Fundición', icon: Flame },
    { id: 'egresos', name: 'Egresos de Material', icon: ArrowLeftRight },
    { id: 'reportes', name: 'Reportes', icon: FileText },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile menu toggle */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-[#1C1C1C] hover:bg-[#222] border border-neutral-800/40 text-[#D5B042] shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-all active:scale-95 cursor-pointer"
        title="Abrir menú"
      >
        <Menu className="w-6 h-6" />
      </button>

      {/* Slim Sidebar */}
      <aside
        role="navigation"
        aria-label="Menú principal"
        className="fixed inset-y-0 left-0 z-50 flex flex-col
          transition-all duration-300 ease-in-out
          w-16 lg:hover:w-64
          group
          bg-[#1A1D21]/80 backdrop-blur-md
          border-r border-[#2F353E]
          text-[#F1F5F9]
          hidden lg:flex
          overflow-hidden"
      >
        {/* Logo */}
        <div className="flex items-center h-16 shrink-0 border-b border-[#2F353E] px-3">
          <div className="flex items-center gap-2.5">
            <Coins className="w-5 h-5 text-[#D5B042] shrink-0" />
            <span className="font-sans font-extrabold text-sm tracking-widest text-[#F1F5F9] whitespace-nowrap opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
              CONTROL MINING
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={`/${item.id === 'dashboard' ? '' : item.id}`}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200 cursor-pointer whitespace-nowrap
                  ${isActive
                    ? 'bg-[#2D323A] text-[#D5B042] border border-[#D5B042]/10 shadow-[inset_0_1px_6px_rgba(213,176,66,0.03)]'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#2D323A]/50'
                  }`}
                title={item.name}
              >
                <IconComponent className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold tracking-wide truncate opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
                  {item.name}
                </span>
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-[#D5B042] rounded-r-md opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 py-3 border-t border-[#2F353E] shrink-0">
          <button
            className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer whitespace-nowrap"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-xs font-semibold tracking-wide truncate opacity-0 lg:group-hover:opacity-100 transition-opacity duration-200">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Mobile sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex flex-col w-72 bg-[#1A1D21] border-r border-[#2F353E] text-[#F1F5F9]
          transition-all duration-300 ease-in-out lg:hidden
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#2F353E] shrink-0">
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-[#D5B042]" />
            <span className="font-sans font-extrabold text-sm tracking-widest text-[#F1F5F9]">BANDES</span>
          </div>
          <button
            onClick={() => setIsMobileOpen(false)}
            className="text-[#94A3B8] hover:text-[#F1F5F9] p-1 rounded-lg hover:bg-[#2D323A] transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 flex flex-col gap-1 px-3 py-4 overflow-y-auto">
          {menuItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = activeTab === item.id;
            return (
              <Link
                key={item.id}
                href={`/${item.id === 'dashboard' ? '' : item.id}`}
                onClick={() => setIsMobileOpen(false)}
                className={`flex items-center gap-3 px-2.5 py-2.5 rounded-lg transition-all duration-200 cursor-pointer
                  ${isActive
                    ? 'bg-[#2D323A] text-[#D5B042] border border-[#D5B042]/10'
                    : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#2D323A]/50'
                  }`}
              >
                <IconComponent className="w-5 h-5 shrink-0" />
                <span className="text-xs font-semibold tracking-wide truncate">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-[#2F353E] shrink-0">
          <button className="flex items-center gap-3 w-full px-2.5 py-2.5 rounded-lg text-[#94A3B8] hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer">
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="text-xs font-semibold tracking-wide truncate">Cerrar Sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
};
