import React, { useRef, useCallback } from 'react';

/**
 * DraggableBanner — a freely positioned/resizable banner on the stream.
 * Position/size are percentages of the stream container (0-100) so they scale
 * to any display. In edit mode the host can drag to move and drag the corner to
 * resize. Renders tip/gift goal progress, links, or text.
 */
export default function DraggableBanner({ banner, editable, containerRef, onChange, onEdit }) {
  const dragState = useRef(null);

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

  const onPointerDownMove = useCallback((e) => {
    if (!editable) return;
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      mode: 'move',
      startX: e.clientX, startY: e.clientY,
      origX: banner.x, origY: banner.y,
      rectW: rect.width, rectH: rect.height,
    };
    e.target.setPointerCapture?.(e.pointerId);
  }, [editable, banner.x, banner.y, containerRef]);

  const onPointerDownResize = useCallback((e) => {
    if (!editable) return;
    e.stopPropagation();
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragState.current = {
      mode: 'resize',
      startX: e.clientX, startY: e.clientY,
      origW: banner.width, origH: banner.height,
      rectW: rect.width, rectH: rect.height,
    };
    e.target.setPointerCapture?.(e.pointerId);
  }, [editable, banner.width, banner.height, containerRef]);

  const onPointerMove = useCallback((e) => {
    const s = dragState.current;
    if (!s) return;
    const dxPct = ((e.clientX - s.startX) / s.rectW) * 100;
    const dyPct = ((e.clientY - s.startY) / s.rectH) * 100;
    if (s.mode === 'move') {
      onChange({ x: clamp(s.origX + dxPct, 0, 100 - banner.width), y: clamp(s.origY + dyPct, 0, 100 - banner.height) }, false);
    } else {
      onChange({ width: clamp(s.origW + dxPct, 12, 100 - banner.x), height: clamp(s.origH + dyPct, 6, 100 - banner.y) }, false);
    }
  }, [onChange, banner.width, banner.height, banner.x, banner.y]);

  const onPointerUp = useCallback(() => {
    if (dragState.current) {
      dragState.current = null;
      onChange({}, true); // commit (persist)
    }
  }, [onChange]);

  if (!banner.visible && !editable) return null;

  const pct = (n) => `${n}%`;
  const isGoal = banner.kind === 'tip_goal' || banner.kind === 'gift_goal';
  const progress = isGoal && banner.goal_target ? Math.min(100, ((banner.goal_current || 0) / banner.goal_target) * 100) : 0;

  return (
    <div
      className="absolute select-none"
      style={{
        left: pct(banner.x), top: pct(banner.y), width: pct(banner.width), minHeight: pct(banner.height),
        zIndex: 20 + (banner.z_index || 1),
        touchAction: editable ? 'none' : 'auto',
      }}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        onPointerDown={onPointerDownMove}
        className={`relative rounded-xl px-3 py-2 backdrop-blur-md overflow-hidden ${editable ? 'cursor-move ring-1 ring-amber-400/60' : ''}`}
        style={{ background: banner.bg_color, color: banner.text_color, border: `1px solid ${banner.accent_color}55` }}
      >
        {banner.title && (
          <div className="text-[11px] font-bold uppercase tracking-wide mb-0.5" style={{ color: banner.accent_color }}>
            {banner.title}
          </div>
        )}

        {banner.kind === 'link' ? (
          <a href={banner.link_url} target="_blank" rel="noopener noreferrer"
            onPointerDown={(e) => editable && e.preventDefault()}
            className="text-sm font-medium underline decoration-dotted break-all"
            style={{ color: banner.text_color }}>
            {banner.content || banner.link_url}
          </a>
        ) : isGoal ? (
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span>{banner.content}</span>
              <span style={{ color: banner.accent_color }}>{banner.goal_current || 0}/{banner.goal_target} 🪙</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.12)' }}>
              <div className="h-full rounded-full transition-all" style={{ width: `${progress}%`, background: banner.accent_color }} />
            </div>
          </div>
        ) : (
          <div className="text-sm">{banner.content}</div>
        )}

        {/* Edit controls */}
        {editable && (
          <>
            <button
              onPointerDown={(e) => { e.stopPropagation(); }}
              onClick={(e) => { e.stopPropagation(); onEdit?.(banner); }}
              className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/50 flex items-center justify-center text-[10px]"
              aria-label="Edit banner"
            >✎</button>
            {/* Resize handle (bottom-right corner) */}
            <div
              onPointerDown={onPointerDownResize}
              className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
              style={{ background: `linear-gradient(135deg, transparent 50%, ${banner.accent_color} 50%)` }}
              aria-label="Resize banner"
            />
          </>
        )}
      </div>
    </div>
  );
}
