import React from 'react';
import { Armchair, Palette, Sparkles, Wand2, Settings } from 'lucide-react';

const TOOLS = [
  { id: 'seats',    icon: Armchair, label: 'Seats' },
  { id: 'theme',    icon: Palette,  label: 'Theme' },
  { id: 'beauty',   icon: Sparkles, label: 'Beauty' },
  { id: 'magic',    icon: Wand2,    label: 'Magic' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function GoLiveToolbar({ activeTool, onToolSelect }) {
  return (
    <div className="flex items-center justify-around px-6">
      {TOOLS.map(tool => {
        const Icon = tool.icon;
        const active = activeTool === tool.id;
        return (
          <button
            key={tool.id}
            onClick={() => onToolSelect(active ? null : tool.id)}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          >
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
              active
                ? 'bg-purple-500/25 border border-purple-400/50'
                : 'bg-white/[0.06] border border-white/[0.08]'
            }`}>
              <Icon className={`w-5 h-5 ${active ? 'text-purple-300' : 'text-white/60'}`} />
            </div>
            <span className={`text-[10px] font-medium ${active ? 'text-purple-300' : 'text-white/50'}`}>
              {tool.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}