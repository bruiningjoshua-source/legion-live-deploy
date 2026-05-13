import React from 'react';

const MODES = [
  { id: 'multi_panel', label: 'Multi-guest LIVE' },
  { id: 'solo',        label: 'LIVE' },
  { id: 'pk_battle',   label: 'Audio LIVE' },
];

export default function GoLiveStreamModeSelector({ streamType, onStreamTypeChange }) {
  return (
    <div className="flex items-center justify-center gap-6 py-2">
      {MODES.map(mode => {
        const active = streamType === mode.id;
        return (
          <button
            key={mode.id}
            onClick={() => onStreamTypeChange(mode.id)}
            className="relative flex flex-col items-center"
          >
            <span className={`text-sm font-semibold transition-colors ${
              active ? 'text-white' : 'text-white/35'
            }`}>
              {mode.label}
            </span>
            {active && (
              <div className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-white" />
            )}
          </button>
        );
      })}
    </div>
  );
}