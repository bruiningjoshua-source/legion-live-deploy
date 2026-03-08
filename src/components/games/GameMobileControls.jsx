/**
 * GameMobileControls — touch D-pad + action buttons
 * Injects keys into a shared keysRef so games need zero logic changes.
 *
 * Props:
 *   keysRef        — the game's existing keysRef
 *   variant        — 'platformer' | 'shooter' | 'fighter' | 'zelda' | 'tetris'
 *   onReset        — optional reset callback
 *   gameOver/win   — shows Play Again when true
 */
import React, { useCallback } from 'react';

const BTN = "select-none active:scale-90 transition-transform flex items-center justify-center rounded-full font-bold text-white shadow-lg";

function press(keysRef, code, down) {
  keysRef.current[code] = down;
}

function DPad({ keysRef, hideUp = false, hideDown = false }) {
  const bind = (code) => ({
    onPointerDown: (e) => { e.preventDefault(); press(keysRef, code, true); },
    onPointerUp:   (e) => { e.preventDefault(); press(keysRef, code, false); },
    onPointerLeave:(e) => { e.preventDefault(); press(keysRef, code, false); },
  });

  return (
    <div className="relative w-[108px] h-[108px]">
      {/* Left */}
      <button
        {...bind('ArrowLeft')}
        className={`${BTN} absolute left-0 top-[38px] w-[34px] h-[34px] bg-white/15 border border-white/20 text-lg`}
        style={{ touchAction: 'none' }}
      >‹</button>
      {/* Right */}
      <button
        {...bind('ArrowRight')}
        className={`${BTN} absolute right-0 top-[38px] w-[34px] h-[34px] bg-white/15 border border-white/20 text-lg`}
        style={{ touchAction: 'none' }}
      >›</button>
      {/* Up */}
      {!hideUp && (
        <button
          {...bind('ArrowUp')}
          className={`${BTN} absolute left-[38px] top-0 w-[34px] h-[34px] bg-white/15 border border-white/20 text-lg`}
          style={{ touchAction: 'none' }}
        >‸</button>
      )}
      {/* Down */}
      {!hideDown && (
        <button
          {...bind('ArrowDown')}
          className={`${BTN} absolute left-[38px] bottom-0 w-[34px] h-[34px] bg-white/15 border border-white/20 text-lg`}
          style={{ touchAction: 'none' }}
        >⌄</button>
      )}
      {/* Center dot */}
      <div className="absolute left-[42px] top-[42px] w-[26px] h-[26px] rounded-full bg-white/[0.06] border border-white/10" />
    </div>
  );
}

export default function GameMobileControls({ keysRef, variant = 'platformer', onReset, gameOver, win }) {
  const bind = useCallback((code) => ({
    onPointerDown: (e) => { e.preventDefault(); press(keysRef, code, true); },
    onPointerUp:   (e) => { e.preventDefault(); press(keysRef, code, false); },
    onPointerLeave:(e) => { e.preventDefault(); press(keysRef, code, false); },
  }), [keysRef]);

  const ActionBtn = ({ code, label, color = 'bg-amber-500/80' }) => (
    <button
      {...bind(code)}
      className={`${BTN} w-14 h-14 ${color} border border-white/20 text-sm`}
      style={{ touchAction: 'none' }}
    >
      {label}
    </button>
  );

  // Tetris: rotate + hard drop + left/right
  if (variant === 'tetris') {
    return (
      <div className="flex items-end justify-between w-full px-4 pb-2 pt-1">
        <DPad keysRef={keysRef} hideUp />
        <div className="flex flex-col items-center gap-2">
          <ActionBtn code="ArrowUp" label="↺" color="bg-purple-500/80" />
          <ActionBtn code="Space" label="↓↓" color="bg-violet-600/80" />
        </div>
      </div>
    );
  }

  // Zelda: 4-dir movement + sword attack
  if (variant === 'zelda') {
    return (
      <div className="flex items-end justify-between w-full px-4 pb-2 pt-1">
        <DPad keysRef={keysRef} />
        <div className="flex flex-col items-center gap-2">
          <ActionBtn code="Space" label="⚔" color="bg-emerald-500/80" />
        </div>
      </div>
    );
  }

  // Shooter (MetalSlug): left/right/jump + shoot
  if (variant === 'shooter') {
    return (
      <div className="flex items-end justify-between w-full px-4 pb-2 pt-1">
        <DPad keysRef={keysRef} hideDown />
        <div className="flex flex-col items-center gap-2">
          <ActionBtn code="Space" label="↑" color="bg-amber-500/80" />
          <ActionBtn code="KeyZ" label="🔫" color="bg-red-500/80" />
        </div>
      </div>
    );
  }

  // Fighter (DoubleDragon): 4-dir + punch + kick
  if (variant === 'fighter') {
    return (
      <div className="flex items-end justify-between w-full px-4 pb-2 pt-1">
        <DPad keysRef={keysRef} />
        <div className="flex flex-col items-center gap-2">
          <ActionBtn code="KeyZ" label="👊" color="bg-blue-500/80" />
          <ActionBtn code="KeyX" label="🦵" color="bg-cyan-500/80" />
        </div>
      </div>
    );
  }

  // Default platformer (Mario): left/right/jump
  return (
    <div className="flex items-end justify-between w-full px-4 pb-2 pt-1">
      <DPad keysRef={keysRef} hideDown />
      <div className="flex items-center">
        <ActionBtn code="Space" label="Jump" color="bg-red-500/80" />
      </div>
    </div>
  );
}