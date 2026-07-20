'use client';

import React from 'react';
import { Scale } from 'lucide-react';
import { useGoldTraceability } from '../context/GoldTraceabilityContext';

export function WeightToggle() {
  const { weightUnit, toggleUnit } = useGoldTraceability();

  return (
    <button
      onClick={toggleUnit}
      title={`Cambiar a ${weightUnit === 'kg' ? 'gramos' : 'kilogramos'}`}
      className="group flex items-center gap-1.5 bg-black/60 backdrop-blur-md border border-neutral-700/50 hover:border-[#D5B042]/40 px-2 py-1 rounded-full font-mono text-[11px] text-[#8C8C8C] hover:text-[#E5E5E5] transition-all duration-300 cursor-pointer shadow-inner"
    >
      <Scale className="w-3.5 h-3.5 text-[#D5B042] group-hover:scale-110 transition-transform duration-200" />
      <span className="flex items-center gap-1 font-bold tracking-wider">
        <span
          className={`transition-all duration-300 ${
            weightUnit === 'kg'
              ? 'text-[#D5B042] drop-shadow-[0_0_4px_rgba(213,176,66,0.3)]'
              : 'text-[#8C8C8C]'
          }`}
        >
          KG
        </span>
        <span className="text-[#525151] text-[8px]">|</span>
        <span
          className={`transition-all duration-300 ${
            weightUnit === 'g'
              ? 'text-[#D5B042] drop-shadow-[0_0_4px_rgba(213,176,66,0.3)]'
              : 'text-[#8C8C8C]'
          }`}
        >
          G
        </span>
      </span>
    </button>
  );
}
