import React from 'react';
import { motion } from 'framer-motion';
import {
  Sparkles, Wand2, Sun, SlidersHorizontal, Music,
  AudioLines, ListVideo, ScreenShare, Youtube, Mic,
  MessageCircle, ZoomIn,
  Users, MessageSquare, LayoutDashboard, Headphones, Video,
  UserPlus, Database, Clock, X
} from 'lucide-react';
import { toast } from 'sonner';

const ROOM_TOOLS = [
  { icon: Sparkles,          label: 'Beauty',       action: 'beauty' },
  { icon: Wand2,             label: 'Magic',        action: 'magic' },
  { icon: Sun,               label: 'Fill Light',   action: 'fill_light' },
  { icon: SlidersHorizontal, label: 'Mixer',        action: 'mixer' },
  { icon: Music,             label: 'Music',        action: 'music' },
  { icon: AudioLines,        label: 'Sounds',       action: 'sounds' },
  { icon: ListVideo,         label: 'Program list', action: 'program' },
  { icon: ScreenShare,       label: 'Share screen', action: 'screen_share' },
  { icon: Youtube,           label: 'YouTube',      action: 'youtube' },
  { icon: Mic,               label: 'Singing',      action: 'singing' },
  { icon: MessageCircle,     label: 'Topic',        action: 'topic' },
  { icon: ZoomIn,            label: 'Zoom in',      action: 'zoom' },
];

const OTHER_TOOLS = [
  { icon: Users,             label: 'Users',           action: 'users' },
  { icon: MessageSquare,     label: 'Comment',         action: 'comment' },
  { icon: LayoutDashboard,   label: 'Management',      action: 'management' },
  { icon: Headphones,        label: 'Live Assistance',  action: 'assistance' },
  { icon: Video,             label: 'Recorder',        action: 'recorder' },
  { icon: UserPlus,          label: 'Newcomers',       action: 'newcomers' },
  { icon: Database,          label: 'Data Center',     action: 'data_center' },
  { icon: Clock,             label: 'Live time',       action: 'live_time' },
];

export default function RoomToolsSheet({ onClose, onAction }) {
  const handleAction = (action) => {
    switch (action) {
      case 'screen_share':
        toast.info('Screen sharing initiated');
        break;
      case 'recorder':
        toast.info('Screen recording started', { icon: '🔴' });
        break;
      case 'fill_light':
        toast.success('Fill light adjusted');
        break;
      case 'zoom':
        toast.info('Zoom mode enabled');
        break;
      case 'newcomers':
        toast.info('Newcomer welcome enabled');
        break;
      case 'data_center':
        toast.info('Opening data center');
        break;
      case 'live_time':
        toast.info('Stream duration display toggled');
        break;
      default:
        onAction?.(action);
        onClose();
        break;
    }
  };

  const renderToolGrid = (tools) => (
    <div className="grid grid-cols-5 gap-y-5 gap-x-2">
      {tools.map(tool => {
        const Icon = tool.icon;
        return (
          <button
            key={tool.action}
            onClick={() => handleAction(tool.action)}
            className="flex flex-col items-center gap-1.5 active:scale-95 transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
              <Icon className="w-5 h-5 text-gray-700" />
            </div>
            <span className="text-[10px] font-medium text-gray-600 leading-tight text-center">
              {tool.label}
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 z-[100] bg-black/40" onClick={onClose} />

      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 400 }}
        className="fixed bottom-0 left-0 right-0 z-[101] bg-white rounded-t-3xl max-h-[65vh] flex flex-col"
        style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {/* Room Tools section */}
          <h3 className="text-black font-bold text-base px-1 pb-3">Room Tools</h3>
          {renderToolGrid(ROOM_TOOLS)}

          {/* Other Tools section */}
          <h3 className="text-black font-bold text-base px-1 pt-5 pb-3">Other Tools</h3>
          {renderToolGrid(OTHER_TOOLS)}
        </div>
      </motion.div>
    </>
  );
}