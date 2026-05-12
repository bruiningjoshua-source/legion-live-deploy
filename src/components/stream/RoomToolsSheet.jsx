import React from 'react';
import { motion } from 'framer-motion';
import { Link2, Share2, Video, Minimize2, MonitorUp, Eye, Settings, Flag, Ban, HeartOff, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const TOOLS = [
  { icon: Link2,      label: 'Connect',              action: 'connect' },
  { icon: Share2,     label: 'Share',                 action: 'share' },
  { icon: Video,      label: 'Recorder',              action: 'recorder' },
  { icon: Minimize2,  label: 'Minimize',              action: 'minimize' },
  { icon: MonitorUp,  label: 'Quality',               action: 'quality' },
  { icon: Eye,        label: 'Watching\nOptimization', action: 'watching' },
  { icon: Settings,   label: 'Gift\nSettings',        action: 'gift_settings' },
  { icon: Flag,       label: 'REPORT',                action: 'report', danger: true },
  { icon: Ban,        label: 'Block',                 action: 'block', danger: true },
  { icon: HeartOff,   label: 'Not\nInterested',       action: 'not_interested' },
  { icon: Sparkles,   label: 'Clean\nMode',           action: 'clean_mode' },
];

export default function RoomToolsSheet({ onClose, onAction }) {
  const handleAction = (action) => {
    if (action === 'share') {
      navigator.share?.({ title: 'Watch this stream!', url: window.location.href })
        .catch(() => navigator.clipboard?.writeText(window.location.href));
      toast.success('Shared!');
    } else if (action === 'minimize') {
      // No-op or navigate back
    } else if (action === 'report') {
      toast.info('Report submitted');
    } else if (action === 'block') {
      toast.info('User blocked');
    } else {
      onAction?.(action);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[100] bg-black/40" onClick={onClose} />

      {/* Sheet */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <h3 className="text-black font-bold text-base px-5 pb-3">Room Tools</h3>

        <div className="grid grid-cols-5 gap-y-5 gap-x-2 px-4 pb-4">
          {TOOLS.map(tool => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.action}
                onClick={() => handleAction(tool.action)}
                className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  tool.danger ? 'bg-red-50' : 'bg-gray-100'
                }`}>
                  <Icon className={`w-5 h-5 ${tool.danger ? 'text-red-500' : 'text-gray-700'}`} />
                </div>
                <span className={`text-[10px] font-medium leading-tight text-center whitespace-pre-line ${
                  tool.danger ? 'text-red-500' : 'text-gray-600'
                }`}>
                  {tool.label}
                </span>
              </button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}