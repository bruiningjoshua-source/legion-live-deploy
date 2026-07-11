/**
 * FloatingMiniPlayer — a small draggable window that keeps a live stream
 * playing while the user browses the rest of the app. Tap to return to the
 * full stream; X to close.
 */
import React, { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Maximize2 } from 'lucide-react';
import { useMiniPlayer } from './MiniPlayerContext';
import { createPageUrl } from '@/utils';

export default function FloatingMiniPlayer() {
  const { miniStream, close } = useMiniPlayer();
  const videoRef = useRef(null);
  const navigate = useNavigate();
  const [pos, setPos] = useState({ x: window.innerWidth - 176, y: window.innerHeight - 280 });
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (miniStream?.mediaStream && videoRef.current) {
      videoRef.current.srcObject = miniStream.mediaStream;
      videoRef.current.play().catch(() => {});
    }
  }, [miniStream]);

  if (!miniStream) return null;

  const onDown = (e) => {
    dragging.current = true;
    const p = e.touches ? e.touches[0] : e;
    offset.current = { x: p.clientX - pos.x, y: p.clientY - pos.y };
  };
  const onMove = (e) => {
    if (!dragging.current) return;
    const p = e.touches ? e.touches[0] : e;
    const x = Math.max(8, Math.min(window.innerWidth - 168, p.clientX - offset.current.x));
    const y = Math.max(60, Math.min(window.innerHeight - 160, p.clientY - offset.current.y));
    setPos({ x, y });
  };
  const onUp = () => { dragging.current = false; };

  const expand = () => {
    navigate(createPageUrl('WatchStream') + `?id=${miniStream.streamId}`);
    close();
  };

  return (
    <div
      className="fixed z-[100] w-40 rounded-2xl overflow-hidden shadow-2xl select-none"
      style={{ left: pos.x, top: pos.y, border: '1px solid rgba(200,135,26,0.4)', background: '#000' }}
      onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
      onTouchMove={onMove} onTouchEnd={onUp}
    >
      {/* Drag handle / header */}
      <div
        className="flex items-center justify-between px-2 py-1.5 cursor-move"
        style={{ background: 'linear-gradient(180deg, rgba(200,135,26,0.25), rgba(10,8,4,0.9))' }}
        onMouseDown={onDown} onTouchStart={onDown}
      >
        <span className="text-white text-[10px] font-semibold truncate max-w-[90px]">
          {miniStream.creatorName || 'Live'}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={expand} className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
            <Maximize2 className="w-3 h-3 text-white" />
          </button>
          <button onClick={close} className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      </div>
      {/* Video — tap to expand */}
      <div className="relative aspect-[9/16] max-h-52 bg-black" onClick={expand}>
        <video ref={videoRef} autoPlay playsInline muted={false}
          className="w-full h-full object-cover" />
        <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-red-600 text-white text-[8px] font-bold">LIVE</span>
      </div>
    </div>
  );
}
