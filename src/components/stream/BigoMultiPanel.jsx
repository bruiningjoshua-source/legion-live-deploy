import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Crown, Mic, MicOff, X, UserPlus } from 'lucide-react';

// BIGO Live-style multi-host panel
// Layout options: 1+3 grid (default), 1+8 circle arrangement
// Host slot is highlighted with a colored border + "Host" badge
// Empty slots show lock icon + slot number

const SLOT_COLORS = {
  host: 'border-pink-500',
  active: 'border-blue-400',
  empty: 'border-transparent',
};

function HostSlot({ participant, isHost, slotNumber, isEmpty, onInvite }) {
  const [isMuted, setIsMuted] = useState(false);

  if (isEmpty) {
    return (
      <motion.div
        className="relative flex flex-col items-center justify-center bg-black/20 rounded-lg overflow-hidden cursor-pointer"
        onClick={onInvite}
        whileTap={{ scale: 0.95 }}
      >
        {/* Slot number */}
        <span className="absolute top-1.5 left-2 text-white/40 text-[10px] font-bold">{slotNumber}</span>
        {/* Lock icon */}
        <div className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full bg-white/[0.08] flex items-center justify-center">
            <Lock className="w-5 h-5 text-white/25" />
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`relative rounded-lg overflow-hidden border-2 ${isHost ? SLOT_COLORS.host : SLOT_COLORS.active}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Avatar / video placeholder */}
      {participant?.avatar_url ? (
        <img src={participant.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
          <span className="text-white text-xl font-bold">
            {participant?.display_name?.[0] || '?'}
          </span>
        </div>
      )}

      {/* Speaking ring */}
      {participant?.isSpeaking && (
        <div className="absolute inset-0 rounded-lg ring-2 ring-green-400 ring-offset-0 pointer-events-none" />
      )}

      {/* Bottom name bar */}
      <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between px-1.5 py-1 bg-gradient-to-t from-black/70 to-transparent">
        <div className="flex items-center gap-1 min-w-0">
          {isHost && (
            <span className="text-[9px] font-bold bg-pink-500 text-white rounded px-1 py-0.5 shrink-0">Host</span>
          )}
          <span className="text-white text-[10px] font-medium truncate">{participant?.display_name || 'Guest'}</span>
        </div>
        {isMuted && <MicOff className="w-3 h-3 text-red-400 shrink-0" />}
      </div>

      {/* Coins / score display */}
      {participant?.score !== undefined && (
        <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 bg-black/50 rounded-full px-1.5 py-0.5">
          <span className="text-yellow-400 text-[9px]">🪙</span>
          <span className="text-white text-[9px] font-bold">{participant.score}</span>
        </div>
      )}
    </motion.div>
  );
}

// 1+3 Grid Layout (BIGO default for video rooms)
function GridLayout({ hostCreator, participants, maxSlots, onInvite, isHost }) {
  const slots = Array(maxSlots).fill(null).map((_, i) => participants[i] || null);

  // 2x2 grid: top-left is host (larger), rest are equal
  return (
    <div className="w-full h-full grid grid-cols-2 gap-0.5" style={{ gridTemplateRows: '1fr 1fr' }}>
      {/* Host slot — top left, labeled 0 but visually "Host" */}
      <div className="relative">
        <HostSlot
          participant={hostCreator}
          isHost={true}
          slotNumber={0}
          isEmpty={!hostCreator}
          onInvite={() => {}}
        />
      </div>
      {/* Slot 1 */}
      <div className="relative">
        <HostSlot
          participant={slots[0]}
          isHost={false}
          slotNumber={1}
          isEmpty={!slots[0]}
          onInvite={() => onInvite?.(1)}
        />
      </div>
      {/* Slot 2 */}
      <div className="relative">
        <HostSlot
          participant={slots[1]}
          isHost={false}
          slotNumber={2}
          isEmpty={!slots[1]}
          onInvite={() => onInvite?.(2)}
        />
      </div>
      {/* Slot 3 */}
      <div className="relative">
        <HostSlot
          participant={slots[2]}
          isHost={false}
          slotNumber={3}
          isEmpty={!slots[2]}
          onInvite={() => onInvite?.(3)}
        />
      </div>
    </div>
  );
}

// Circle arrangement — host in center, 8 slots around
function CircleLayout({ hostCreator, participants, maxSlots, onInvite }) {
  const slots = Array(8).fill(null).map((_, i) => participants[i] || null);
  // Positions around a circle
  const positions = [
    { top: '5%',   left: '35%'  }, // 1 top center
    { top: '20%',  right: '5%'  }, // 2 top right
    { top: '50%',  right: '2%'  }, // 3 right
    { bottom: '15%', right: '5%' }, // 4 bottom right
    { bottom: '5%',  left: '35%' }, // 5 bottom center
    { bottom: '15%', left: '5%' }, // 6 bottom left
    { top: '50%',  left: '2%'   }, // 7 left
    { top: '20%',  left: '5%'   }, // 8 top left
  ];

  return (
    <div className="relative w-full h-full">
      {/* Center host */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 z-10">
        <div className="relative w-full h-full rounded-full overflow-hidden border-[3px] border-pink-500 shadow-lg shadow-pink-500/30">
          {hostCreator?.avatar_url ? (
            <img src={hostCreator.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-amber-500 to-orange-700 flex items-center justify-center">
              <span className="text-white text-2xl font-black">{hostCreator?.display_name?.[0] || '?'}</span>
            </div>
          )}
        </div>
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-pink-500 text-white text-[9px] font-bold rounded px-1.5 py-0.5 whitespace-nowrap">
          Host · {hostCreator?.display_name?.slice(0,10) || '?'}
        </div>
        {/* Decorative coins */}
        <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-0.5">
          <span className="text-yellow-400 text-xs">🪙</span>
          <span className="text-white/70 text-[10px]">0</span>
        </div>
      </div>

      {/* Connector lines (decorative arrows) */}
      {positions.map((pos, i) => (
        <div
          key={`arrow-${i}`}
          className="absolute w-3 h-3 text-white/20 flex items-center justify-center"
          style={{ ...computeArrowPos(pos) }}
        >
          ✦
        </div>
      ))}

      {/* 8 slots around */}
      {positions.map((pos, i) => (
        <div
          key={i}
          className="absolute"
          style={{ ...pos, width: 64, height: 64, transform: 'translate(-50%, -50%)' }}
        >
          {slots[i] ? (
            <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-blue-400">
              {slots[i].avatar_url ? (
                <img src={slots[i].avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                  <span className="text-white font-bold">{slots[i].display_name?.[0]}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[9px] text-white py-0.5 truncate px-1">
                {slots[i].display_name}
              </div>
            </div>
          ) : (
            <motion.div
              className="w-16 h-16 rounded-full bg-white/[0.07] border border-white/[0.1] flex flex-col items-center justify-center cursor-pointer"
              whileTap={{ scale: 0.9 }}
              onClick={() => onInvite?.(i + 1)}
            >
              <Lock className="w-5 h-5 text-white/25 mb-0.5" />
              <span className="text-white/30 text-[9px] font-bold">{i + 1}</span>
            </motion.div>
          )}
        </div>
      ))}
    </div>
  );
}

function computeArrowPos(pos) {
  // Simplified: just pass through, arrows rendered near slots
  return pos;
}

export default function BigoMultiPanel({
  hostStream,
  hostCreator,
  currentUser,
  panelParticipants = [],
  onInviteToPanel,
  onLeaveCall,
  isHost = false,
  layout = 'grid', // 'grid' | 'circle'
  maxParticipants = 4,
}) {
  const [currentLayout, setCurrentLayout] = useState(layout);

  return (
    <div className="w-full h-full flex flex-col">
      {/* Panel area — takes up top ~55% of screen */}
      <div className="flex-1 relative overflow-hidden">
        {currentLayout === 'circle' ? (
          <CircleLayout
            hostCreator={hostCreator}
            participants={panelParticipants}
            maxSlots={8}
            onInvite={onInviteToPanel}
          />
        ) : (
          <GridLayout
            hostCreator={hostCreator}
            participants={panelParticipants}
            maxSlots={maxParticipants}
            onInvite={onInviteToPanel}
            isHost={isHost}
          />
        )}

        {/* Layout toggle button */}
        <button
          onClick={() => setCurrentLayout(l => l === 'grid' ? 'circle' : 'grid')}
          className="absolute top-2 right-2 z-20 w-7 h-7 rounded-full bg-black/50 border border-white/15 flex items-center justify-center text-white/60 text-xs"
        >
          {currentLayout === 'grid' ? '◎' : '⊞'}
        </button>
      </div>
    </div>
  );
}