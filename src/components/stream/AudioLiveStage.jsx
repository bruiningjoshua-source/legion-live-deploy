import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Lock } from 'lucide-react';

/**
 * AudioLiveStage — the visual for an audio-only stream (stream_type ===
 * 'audio_live'). No video element anywhere: a decorative center avatar for the
 * host with seat chairs radiating around it, matching Bigo's Audio LIVE layout.
 *
 * Guests without a raised/active mic show as an empty heart-plus seat; active
 * speakers get a pulsing ring so the room reads as "who's talking" at a glance.
 */
export default function AudioLiveStage({
  hostCreator,
  isHost,
  seatParticipants = [],   // [{ email, display_name, avatar_url, isSpeaking }]
  seatStates = {},
  seatCount = 8,
  onRequestSeat,
  onInviteToPanel,
  background,              // optional decorative backdrop image/gradient
}) {
  const guestSlots = Math.max(0, seatCount - 1);

  return (
    <div
      className="absolute inset-0 flex items-center justify-center overflow-hidden"
      style={{ background: background || 'radial-gradient(circle at 50% 40%, #2a1810 0%, #0c0704 70%)' }}
    >
      {/* Center host avatar — decorative badge ring, no camera feed */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="relative w-28 h-28">
          <div
            className="absolute inset-0 rounded-full"
            style={{ background: 'conic-gradient(from 0deg, #f5a623, #92400e, #f5a623)', padding: 3 }}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-black border-2 border-black">
              {hostCreator?.avatar_url ? (
                <img src={hostCreator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-700 to-orange-900">
                  <span className="text-white text-3xl font-black">{hostCreator?.display_name?.[0] || '?'}</span>
                </div>
              )}
            </div>
          </div>
          {hostCreator?.isSpeaking && (
            <motion.div
              className="absolute -inset-2 rounded-full border-2 border-green-400"
              animate={{ scale: [1, 1.08, 1], opacity: [0.7, 0.3, 0.7] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          )}
        </div>
        <div className="mt-2 bg-amber-500 text-black text-[10px] font-black rounded-full px-3 py-0.5">
          HOST
        </div>
        <span className="mt-1 text-white/70 text-xs font-medium">{hostCreator?.display_name || 'Host'}</span>
      </div>

      {/* Seat chairs radiating around the host, matching the reference spacing */}
      {Array.from({ length: guestSlots }).map((_, i) => {
        const angle = (i / guestSlots) * 2 * Math.PI - Math.PI / 2;
        const radius = 40; // % of container
        const x = 50 + radius * Math.cos(angle);
        const y = 50 + radius * Math.sin(angle) * 0.85; // slight vertical compression, matches reference
        const seatIdx = i + 1;
        const occupant = seatParticipants[i] || null;
        const locked = !!seatStates[seatIdx]?.is_locked;

        return (
          <div
            key={i}
            className="absolute z-10"
            style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%,-50%)' }}
          >
            {occupant ? (
              <div className="relative flex flex-col items-center">
                <div className="w-14 h-14 rounded-full overflow-hidden border-2"
                  style={{ borderColor: occupant.isSpeaking ? '#4ade80' : 'rgba(255,255,255,0.2)' }}>
                  {occupant.avatar_url ? (
                    <img src={occupant.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-slate-700 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{occupant.display_name?.[0] || '?'}</span>
                    </div>
                  )}
                </div>
                <span className="mt-0.5 text-white/60 text-[9px] max-w-[56px] truncate">{occupant.display_name}</span>
              </div>
            ) : (
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => {
                  if (locked && !isHost) return;
                  isHost ? onInviteToPanel?.(seatIdx) : onRequestSeat?.(seatIdx);
                }}
                className="w-14 h-14 rounded-full bg-white/[0.06] border border-white/10 flex flex-col items-center justify-center"
              >
                {locked ? (
                  <Lock className="w-3.5 h-3.5 text-white/20" />
                ) : (
                  <Heart className="w-3.5 h-3.5 text-rose-400/70" />
                )}
              </motion.button>
            )}
          </div>
        );
      })}
    </div>
  );
}
