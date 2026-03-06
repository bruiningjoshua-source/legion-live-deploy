import React from 'react';
import { Radio, Users, Swords } from 'lucide-react';

const STREAM_TYPES = [
  { value: 'solo', label: 'Solo', icon: Radio },
  { value: 'multi_panel', label: 'Multi', icon: Users },
  { value: 'pk_battle', label: 'PK', icon: Swords }
];

export default function GoLiveStreamTypeBar({ streamType, onStreamTypeChange }) {
  return (
    <div className="flex bg-black/60 backdrop-blur-xl rounded-full p-0.5 gap-0.5 border border-white/10">
      {STREAM_TYPES.map(t => {
        const Icon = t.icon;
        const active = streamType === t.value;
        return (
          <button
            key={t.value}
            onClick={() => onStreamTypeChange(t.value)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              active
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-lg shadow-amber-500/30'
                : 'text-white/50 hover:text-white/70'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}