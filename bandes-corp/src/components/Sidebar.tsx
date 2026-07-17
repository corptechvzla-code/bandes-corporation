'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList, 
  Flame, 
  ArrowLeftRight, 
  FileText, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Coins
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const activeTab = pathname.replace('/', '') || 'dashboard';
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);

  const menuItems = [
    { id: 'dashboard', name: 'Dashboard', icon: LayoutDashboard, description: 'Resumen y KPIs' },
    { id: 'ingresos', name: 'Ingresos de Oro', icon: ClipboardList, description: 'Registro de Barras' },
    { id: 'procesos', name: 'Procesos de Fundición', icon: Flame, description: 'Mesa de Fundición' },
    { id: 'egresos', name: 'Egresos / Despachos', icon: ArrowLeftRight, description: 'Salida de Fino' },
    { id: 'reportes', name: 'Reportes y Balances', icon: FileText, description: 'Balances e Historial' },
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

      {/* Mobile menu toggle button (visible when sidebar is hidden) */}
      <button
        onClick={() => setIsMobileOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 p-3.5 rounded-full bg-[#1C1C1C] hover:bg-[#222] border border-neutral-800/40 text-[#D5B042] shadow-[0_4px_16px_rgba(0,0,0,0.5)] transition-all active:scale-95 cursor-pointer"
        title="Abrir menú"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-menu"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      </button>

      {/* Dual Panel Sidebar Navigation */}
      <aside
        id="sidebar"
        className={`fixed inset-y-0 left-0 z-50 flex bg-[#1A1D21] border-r border-[#2F353E] text-[#F1F5F9] transition-all duration-300 ease-in-out
          ${isCollapsed ? 'w-20' : 'w-80'}
          ${isMobileOpen ? 'translate-x-0 w-80' : '-translate-x-full lg:translate-x-0'}
          lg:static lg:h-screen`}
      >
        
        {/* PANEL 1 (LEFT): NARROW ICONS RAIL */}
        <div className="w-20 bg-[#121519] border-r border-[#2F353E] flex flex-col items-center py-5 justify-between shrink-0 h-full">
          
          <div className="flex flex-col items-center gap-6 w-full">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-11 h-11 rounded-xl bg-[#1A1D21] border border-[#2F353E] flex items-center justify-center text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#2D323A]/50 transition-all cursor-pointer shadow-sm mt-1"
              title={isCollapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-5 h-5 text-[#D5B042]" />
              ) : (
                <ChevronLeft className="w-5 h-5" />
              )}
            </button>
          
            <div className="w-8 h-[1px] bg-[#2F353E]"></div>

            <div className="flex flex-col gap-3 w-full items-center px-2">
              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <Link
                    key={item.id}
                    href={`/${item.id === 'dashboard' ? '' : item.id}`}
                    onClick={() => setIsMobileOpen(false)}
                    className={`p-3 rounded-xl transition-all duration-300 relative group cursor-pointer
                      ${isActive 
                        ? 'bg-[#2D323A] text-[#D5B042] border border-[#D5B042]/20 shadow-[inset_0_1px_8px_rgba(213,176,66,0.05)]' 
                        : 'text-[#94A3B8] hover:text-[#F1F5F9] hover:bg-[#1A1D21]/50'
                      }`}
                    title={item.name}
                  >
                    <IconComponent className={`w-5 h-5 ${isActive ? 'scale-105' : ''}`} />
                    
                    {isActive && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-4 bg-[#D5B042] rounded-r-md"></span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

        </div>

        {/* PANEL 2 (RIGHT): DETAILED TEXT & CONTROLS PANEL */}
        <div className={`flex-1 flex flex-col justify-between h-full py-5 px-4.5 bg-[#1A1D21] overflow-y-auto transition-opacity duration-300
          ${isCollapsed ? 'hidden' : 'flex'}`}>
          
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-sans font-extrabold text-[15px] tracking-widest text-[#F1F5F9] flex items-center gap-1.5">
                  <Coins className="w-4.5 h-4.5 text-[#D5B042]" />
                  BANDES
                </span>
                <span className="text-[9px] font-mono font-bold bg-[#D5B042]/10 text-[#D5B042] px-1.5 py-0.2 rounded border border-[#D5B042]/20">
                  CORP
                </span>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsCollapsed(true)}
                  className="hidden lg:flex items-center justify-center w-7 h-7 rounded-lg hover:bg-[#2D323A] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
                  title="Collapse Sidebar"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <button
                  onClick={() => setIsMobileOpen(false)}
                  className="flex lg:hidden items-center justify-center w-7 h-7 rounded-lg hover:bg-[#2D323A] text-[#94A3B8] hover:text-[#F1F5F9] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="border-t border-[#2F353E]"></div>

            <div className="space-y-1">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#94A3B8]/60 px-2 block mb-2">
                Menu Principal
              </span>

              {menuItems.map((item) => {
                const IconComponent = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <Link
                    key={item.id}
                    href={`/${item.id === 'dashboard' ? '' : item.id}`}
                    onClick={() => setIsMobileOpen(false)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 cursor-pointer
                      ${isActive 
                        ? 'bg-[#2D323A] text-[#D5B042] border border-[#D5B042]/10 shadow-[inset_0_1px_6px_rgba(213,176,66,0.03)]' 
                        : 'hover:bg-[#121519]/50 text-[#94A3B8] hover:text-[#F1F5F9]'
                      }`}
                  >
                    <span className="flex items-center gap-2.5 truncate">
                      <IconComponent className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#D5B042]' : 'text-[#94A3B8]'}`} />
                      <span className="truncate">{item.name}</span>
                    </span>
                    
                    {isActive && (
                      <span className="w-1.5 h-1.5 bg-[#D5B042] rounded-full"></span>
                    )}
                  </Link>
                );
              })}
            </div>

          </div>

        </div>

      </aside>
    </>
  );
};
