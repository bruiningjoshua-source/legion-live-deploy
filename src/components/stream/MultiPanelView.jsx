import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MultiPanelView({ panelCreators = [], maxPanels = 12 }) {
  const gridLayouts = {
    2: 'grid-cols-1 grid-rows-2',
    3: 'grid-cols-2 grid-rows-2',
    4: 'grid-cols-2 grid-rows-2',
    5: 'grid-cols-3 grid-rows-2',
    6: 'grid-cols-3 grid-rows-2',
    7: 'grid-cols-3 grid-rows-3',
    8: 'grid-cols-3 grid-rows-3',
    9: 'grid-cols-3 grid-rows-3',
    10: 'grid-cols-4 grid-rows-3',
    11: 'grid-cols-4 grid-rows-3',
    12: 'grid-cols-4 grid-rows-3'
  };

  const panelCount = Math.min(panelCreators.length, maxPanels);
  const gridClass = gridLayouts[panelCount] || 'grid-cols-2 grid-rows-2';

  return (
    <div className={`grid ${gridClass} gap-1 w-full h-full`}>
      {panelCreators.slice(0, maxPanels).map((creator, idx) => (
        <motion.div
          key={creator.id || idx}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.1 }}
          className="relative bg-stone-900 rounded-lg overflow-hidden border border-amber-600/20"
        >
          <video
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted={idx !== 0}
            preload="auto"
          />
          
          {/* Creator Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-xs">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt="" className="w-full h-full rounded-full" />
                  ) : '👤'}
                </div>
                <span className="text-white text-xs font-semibold truncate">
                  {creator.display_name}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="outline" className="border-green-500/50 bg-green-500/20 text-white text-[10px] px-1 py-0">
                  <Mic className="w-2.5 h-2.5" />
                </Badge>
                <Badge variant="outline" className="border-blue-500/50 bg-blue-500/20 text-white text-[10px] px-1 py-0">
                  <Video className="w-2.5 h-2.5" />
                </Badge>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}