import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Heart, Mic, MicOff, Lock, LayoutGrid, Circle, Share2, Video, VideoOff } from 'lucide-react';

// Bigo's real seat presets (from reference screenshots): 4, 6, 9, 12 total
// spots INCLUDING the host.
export const SEAT_PRESETS = [4, 6, 9, 12];

// Dynamic column count based on total visible slots.
// Matches BIGO Live breakpoints.
function getGridCols(count) {
  if (count <= 1)  return 1;
  if (count <= 4)  return 2;
  if (count <= 9)  return 3;
  if (count <= 16) return 4;
  return 5;
}

function ParticipantSlot({ participant, isHost, slotIndex, isEmpty, onInvite, onKick, canKick, isLocked, onToggleLock, canRequest, onRequest, mediaStream, cameraOn, isSelf, onToggleOwnCamera }) {
  const [muted, setMuted] = useState(false);
  const videoElRef = useRef(null);

  useEffect(() => {
    if (videoElRef.current && mediaStream) {
      videoElRef.current.srcObject = mediaStream;
      videoElRef.current.play().catch(() => {});
    }
  }, [mediaStream]);

  if (isEmpty) {
    return (
      <motion.div
        whileTap={{ scale: 0.95 }}
        onClick={() => {
          if (isLocked && !canKick) return;
          if (canKick) { onInvite?.(slotIndex); }        // host: tap to invite
          else if (canRequest) { onRequest?.(slotIndex); } // viewer: request open seat
        }}
        className="relative flex flex-col items-center justify-center bg-black/20
          rounded-xl overflow-hidden border border-white/[0.06] cursor-pointer"
        style={{ aspectRatio: "9/16" }}
      >
        {/* Bigo shows a translucent seat with a heart-plus, not a lock icon —
            lock is a small host-only badge in the corner instead. */}
        <div className="w-9 h-9 rounded-full bg-white/[0.06] flex items-center justify-center mb-1">
          <Heart className={`w-4 h-4 ${isLocked ? 'text-white/15' : 'text-rose-400/70'}`} />
        </div>
        <span className="text-[9px] font-bold text-white/40">{slotIndex}</span>
        {/* Host lock/unlock toggle */}
        {canKick && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleLock?.(slotIndex, !isLocked); }}
            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center"
            aria-label={isLocked ? 'Unlock seat' : 'Lock seat'}
          >
            <Lock className={`w-2.5 h-2.5 ${isLocked ? 'text-amber-400' : 'text-white/40'}`} />
          </button>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="relative rounded-xl overflow-hidden border-2"
      style={{
        aspectRatio: "9/16",
        borderColor: isHost ? '#f5a623' : '#60a5fa',
        boxShadow: isHost ? '0 0 12px rgba(245,166,35,0.3)' : 'none',
      }}
    >
      {mediaStream && cameraOn !== false ? (
        <video ref={videoElRef} autoPlay playsInline muted={isSelf} className="w-full h-full object-cover" />
      ) : participant?.avatar_url ? (
        <img src={participant.avatar_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div
          className="w-full h-full flex items-center justify-center font-black text-white text-xl"
          style={{
            background: isHost ? 'linear-gradient(135deg,#92400e,#451a03)' : 'linear-gradient(135deg,#1e3a5f,#0c1a2e)',
          }}
        >
          {participant?.display_name?.[0] || "?"}
        </div>
      )}
      {cameraOn === false && (
        <div className="absolute top-1.5 left-1.5 bg-black/60 rounded-full p-1">
          <VideoOff className="w-3 h-3 text-white/70" />
        </div>
      )}
      {participant?.isSpeaking && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-green-400 pointer-events-none animate-pulse" />
      )}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/80 to-transparent flex items-center justify-between">
        <div className="flex items-center gap-1 min-w-0">
          {isHost && (
            <span className="shrink-0 text-[8px] font-bold bg-amber-500 text-black rounded px-1 py-0.5">HOST</span>
          )}
          <span className="text-white text-[9px] font-medium truncate">{participant?.display_name || "Guest"}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); setMuted(m => !m); }} className="shrink-0">
          {muted ? <MicOff className="w-3 h-3 text-red-400" /> : <Mic className="w-3 h-3 text-white/50" />}
        </button>
        {isSelf && (
          <button onClick={(e) => { e.stopPropagation(); onToggleOwnCamera?.(); }} className="shrink-0 ml-1">
            {cameraOn === false ? <VideoOff className="w-3 h-3 text-red-400" /> : <Video className="w-3 h-3 text-white/50" />}
          </button>
        )}
      </div>
      {canKick && !isHost && (
        <button
          onClick={() => onKick?.(participant, slotIndex)}
          className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-500/70 flex items-center justify-center text-white text-[10px] hover:bg-red-500 transition-colors"
        >
          ×
        </button>
      )}
    </motion.div>
  );
}

export default function BigoMultiPanel({
  streamId,
  hostCreator,
  currentUser,
  panelParticipants = [],
  onInviteToPanel,
  onKickParticipant,
  onToggleSeatLock,
  onRequestSeat,
  onShare,
  seatStates = {},
  isHost = false,
  layout = "grid",
  seatCount,                 // 4 | 6 | 9 | 12, host-selected
  onChangeSeatCount,
  hostMediaStream,           // host's own local/remote MediaStream
  hostCameraOn = true,
  guestMediaStreams = {},    // { [seatIndex]: MediaStream }
  guestCameraStates = {},    // { [seatIndex]: boolean }
  selfEmail,                 // current user's email, to know which seat is "self"
  onToggleOwnCamera,
}) {
  const [currentLayout, setCurrentLayout] = useState(layout);
  const total = SEAT_PRESETS.includes(seatCount) ? seatCount : 6;
  const guestSlots = total - 1;
  const cols = getGridCols(total);

  return (
    <div className="w-full h-full flex flex-col bg-black">
      <div className="flex items-center justify-between px-2 pt-2 pb-1">
        <div className="flex gap-1">
          {[{ id: "grid", Icon: LayoutGrid }, { id: "circle", Icon: Circle }].map(({ id, Icon }) => (
            <button
              key={id}
              onClick={() => setCurrentLayout(id)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs transition-all"
              style={{ background: currentLayout === id ? "#f5a623" : "rgba(255,255,255,0.06)", color: currentLayout === id ? "#000" : "rgba(255,255,255,0.4)" }}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          {/* Seat count — host only, 4/6/9/12 presets matching Bigo's reference. */}
          {isHost && (
            <div className="flex gap-0.5 mr-1">
              {SEAT_PRESETS.map(n => (
                <button key={n} onClick={() => onChangeSeatCount?.(n)}
                  className="w-6 h-6 rounded text-[10px] font-bold"
                  style={{ background: total === n ? '#f5a623' : 'rgba(255,255,255,0.06)', color: total === n ? '#000' : 'rgba(255,255,255,0.5)' }}>
                  {n}
                </button>
              ))}
            </div>
          )}
          <button onClick={onShare} className="w-7 h-7 rounded-lg flex items-center justify-center bg-white/[0.06]" aria-label="Share">
            <Share2 className="w-3.5 h-3.5 text-white/60" />
          </button>
        </div>
      </div>

      {currentLayout === "grid" && (
        <div
          className="flex-1 p-1"
          style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "3px" }}
        >
          <ParticipantSlot
            participant={hostCreator}
            isHost={true}
            slotIndex={0}
            isEmpty={!hostCreator}
            canKick={false}
            mediaStream={hostMediaStream}
            cameraOn={hostCameraOn}
            isSelf={isHost && selfEmail && hostCreator?.email === selfEmail}
            onToggleOwnCamera={onToggleOwnCamera}
          />
          {Array.from({ length: guestSlots }).map((_, i) => {
            const guest = panelParticipants[i] || null;
            const seatIdx = i + 1;
            const isSelfSeat = !!guest && !!selfEmail && guest.email === selfEmail;
            return (
              <ParticipantSlot
                key={i}
                participant={guest}
                isHost={false}
                slotIndex={seatIdx}
                isEmpty={!guest}
                canKick={isHost}
                isLocked={!!seatStates[seatIdx]?.is_locked}
                onToggleLock={onToggleSeatLock}
                canRequest={!isHost}
                onRequest={onRequestSeat}
                onInvite={onInviteToPanel}
                onKick={onKickParticipant}
                mediaStream={guestMediaStreams[seatIdx]}
                cameraOn={guestCameraStates[seatIdx] !== false}
                isSelf={isSelfSeat}
                onToggleOwnCamera={onToggleOwnCamera}
              />
            );
          })}
        </div>
      )}

      {currentLayout === "circle" && (
        <div className="flex-1 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 z-10">
            <div
              className="w-full h-full rounded-full overflow-hidden border-[3px]"
              style={{ borderColor: '#f5a623', boxShadow: '0 0 20px rgba(245,166,35,0.4)' }}
            >
              {hostCreator?.avatar_url ? (
                <img src={hostCreator.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-amber-700 to-orange-900 flex items-center justify-center">
                  <span className="text-white text-2xl font-black">{hostCreator?.display_name?.[0] || "?"}</span>
                </div>
              )}
            </div>
            <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-amber-500 text-black text-[9px] font-black rounded px-2 py-0.5 whitespace-nowrap">HOST</div>
          </div>
          {Array.from({ length: guestSlots }).map((_, i) => {
            const angle = (i / guestSlots) * 2 * Math.PI - Math.PI / 2;
            const x = 50 + 38 * Math.cos(angle);
            const y = 50 + 38 * Math.sin(angle);
            const guest = panelParticipants[i] || null;
            const seatIdx = i + 1;
            const locked = !!seatStates[seatIdx]?.is_locked;
            return (
              <div key={i} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: "translate(-50%,-50%)", width: 64, height: 64 }}>
                {guest ? (
                  <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-blue-400">
                    {guest.avatar_url
                      ? <img src={guest.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <div className="w-full h-full bg-slate-700 flex items-center justify-center"><span className="text-white font-bold">{guest.display_name?.[0]}</span></div>
                    }
                  </div>
                ) : (
                  <motion.div
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      if (locked && !isHost) return;
                      isHost ? onInviteToPanel?.(seatIdx) : onRequestSeat?.(seatIdx);
                    }}
                    className="w-16 h-16 rounded-full bg-white/[0.06] border border-white/10 flex flex-col items-center justify-center cursor-pointer"
                  >
                    <Heart className={`w-4 h-4 ${locked ? 'text-white/15' : 'text-rose-400/70'}`} />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}