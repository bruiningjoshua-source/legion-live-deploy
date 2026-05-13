import React from 'react';
import { Lightbulb, CalendarDays, Image, Share2, Settings } from 'lucide-react';
import { toast } from 'sonner';

const TOOLS = [
  { id: 'tutorial', icon: Lightbulb, label: 'Tutorial' },
  { id: 'events',   icon: CalendarDays, label: 'Events' },
  { id: 'creator',  icon: Image, label: 'Creator\nCenter' },
  { id: 'share',    icon: Share2, label: 'Share' },
  { id: 'settings', icon: Settings, label: 'Settings' },
];

export default function GameLiveToolbar({ onSelectGame }) {
  const handleTool = (id) => {
    if (id === 'share') {
      if (navigator.share) {
        navigator.share({ title: 'Watch my stream!', text: 'Join my live stream on Legion Live!' }).catch(() => {});
      } else {
        toast.success('Link copied!');
      }
    } else {
      toast.info('Coming soon');
    }
  };

  return (
    <div className="flex items-center justify-around px-6">
      {TOOLS.map(tool => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.id}
            onClick={() => handleTool(tool.id)}
            className="flex flex-col items-center gap-1 active:scale-90 transition-transform"
          >
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center bg-white/[0.06] border border-white/[0.08]">
              <Icon className="w-5 h-5 text-white/60" />
            </div>
            <span className="text-[10px] font-medium text-white/50 text-center whitespace-pre-line leading-tight">
              {tool.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}