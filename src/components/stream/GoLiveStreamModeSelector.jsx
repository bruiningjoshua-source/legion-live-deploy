import React from 'react';

const MODES = [
  { id: 'solo',        label: 'LIVE' },
  { id: 'audio_live',  label: 'Audio' },
  { id: 'multi_guest', label: 'Multi' },
  { id: 'pk_battle',   label: 'PK' },
  { id: 'game_live',   label: 'Game' },
];

export default function GoLiveStreamModeSelector({ streamType, onStreamTypeChange }) {
  return (
    <div className="flex items-center justify-center gap-5 py-2">
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