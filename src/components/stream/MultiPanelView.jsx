import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Mic, Video, Plus, X, Crown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function MultiPanelView({ 
  panelCreators = [], 
  maxPanels = 9,
  hostCreatorId,
  currentUserId,
  isHost = false,
  allowFreeJoin = false,
  onRequestJoin,
  onKickUser
}) {
  const [hoveredSlot, setHoveredSlot] = React.useState(null);
  
  // Create array of all slots
  const slots = Array.from({ length: maxPanels }, (_, idx) => {
    const creator = panelCreators[idx];
    return {
      position: idx + 1,
      creator,
      isEmpty: !creator
    };
  });

  const gridClass = maxPanels <= 4 ? 'grid-cols-2 grid-rows-2' : 'grid-cols-3 grid-rows-3';

  return (
    <div className={`grid ${gridClass} gap-1 w-full h-full bg-stone-950/80`}>
      {slots.map((slot, idx) => (
        <motion.div
          key={slot.position}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: idx * 0.05 }}
          onMouseEnter={() => setHoveredSlot(idx)}
          onMouseLeave={() => setHoveredSlot(null)}
          className="relative bg-gradient-to-br from-stone-900 to-stone-950 rounded-lg overflow-hidden border border-amber-600/20"
          style={{ aspectRatio: '9/16' }}
        >
          {slot.isEmpty ? (
            // Empty Slot
            <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              <div className="text-white/20 text-6xl font-bold">{slot.position}</div>
              {(allowFreeJoin || isHost) && (
                <Button
                  onClick={() => onRequestJoin?.(slot.position)}
                  variant="ghost"
                  size="icon"
                  className="w-16 h-16 rounded-full bg-stone-800/50 hover:bg-amber-600/30 border-2 border-amber-600/30 hover:border-amber-500"
                >
                  <Plus className="w-8 h-8 text-amber-400" />
                </Button>
              )}
            </div>
          ) : (
            // Occupied Slot
            <>
              <video
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                muted={idx !== 0}
                preload="auto"
              />

              {/* Position Number Badge */}
              <div className="absolute top-2 left-2">
                <Badge className="bg-black/60 text-white border-0 text-xs">
                  {slot.position}
                </Badge>
              </div>

              {/* Host Badge */}
              {slot.creator.id === hostCreatorId && (
                <div className="absolute top-2 right-2">
                  <Badge className="bg-amber-600 text-white border-0 text-xs flex items-center gap-1">
                    <Crown className="w-3 h-3" />
                    Host
                  </Badge>
                </div>
              )}

              {/* Kick Button (Host Only) */}
              {isHost && slot.creator.id !== hostCreatorId && hoveredSlot === idx && (
                <div className="absolute top-2 right-2">
                  <Button
                    onClick={() => onKickUser?.(slot.creator.id)}
                    size="icon"
                    variant="destructive"
                    className="h-6 w-6 rounded-full bg-red-600/90 hover:bg-red-700"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {/* Creator Info Overlay */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex-shrink-0">
                      {slot.creator.avatar_url ? (
                        <img src={slot.creator.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">👤</div>
                      )}
                    </div>
                    <span className="text-white text-xs font-semibold truncate">
                      {slot.creator.display_name || 'Guest'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge variant="outline" className="border-green-500/50 bg-green-500/20 text-white text-[10px] px-1 py-0 h-5">
                      <Mic className="w-2.5 h-2.5" />
                    </Badge>
                    <Badge variant="outline" className="border-blue-500/50 bg-blue-500/20 text-white text-[10px] px-1 py-0 h-5">
                      <Video className="w-2.5 h-2.5" />
                    </Badge>
                  </div>
                </div>
              </div>
            </>
          )}
        </motion.div>
      ))}
    </div>
  );
}