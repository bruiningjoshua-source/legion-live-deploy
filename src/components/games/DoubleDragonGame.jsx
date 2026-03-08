import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';

const CANVAS_W = 800;
const CANVAS_H = 400;
const GROUND_Y = CANVAS_H - 60;
const PLAYER_SPEED = 3.5;
const PUNCH_RANGE = 60;
const KICK_RANGE = 80;
const WORLD_W = 2400;

function createState() {
  return {
    player: {
      x: 80, y: GROUND_Y - 44, w: 30, h: 44,
      hp: 6, maxHp: 6, facing: 1,
      attackTimer: 0, attackType: null,
      kickTimer: 0,
      iframes: 0, frame: 0,
    },
    camera: { x: 0 },
    enemies: [
      { x: 320, y: GROUND_Y - 44, w: 30, h: 44, hp: 3, alive: true, state: 'idle', stateTimer: 60, facing: -1, frame: 0, type: 'grunt' },
      { x: 520, y: GROUND_Y - 44, w: 30, h: 44, hp: 3, alive: true, state: 'idle', stateTimer: 80, facing: -1, frame: 0, type: 'grunt' },
      { x: 750, y: GROUND_Y - 44, w: 36, h: 50, hp: 6, alive: true, state: 'idle', stateTimer: 40, facing: -1, frame: 0, type: 'heavy' },
      { x: 1000, y: GROUND_Y - 44, w: 30, h: 44, hp: 3, alive: true, state: 'idle', stateTimer: 50, facing: -1, frame: 0, type: 'grunt' },
      { x: 1200, y: GROUND_Y - 44, w: 30, h: 44, hp: 3, alive: true, state: 'idle', stateTimer: 70, facing: -1, frame: 0, type: 'grunt' },
      { x: 1450, y: GROUND_Y - 44, w: 36, h: 50, hp: 6, alive: true, state: 'idle', stateTimer: 35, facing: -1, frame: 0, type: 'heavy' },
      { x: 1700, y: GROUND_Y - 44, w: 30, h: 44, hp: 3, alive: true, state: 'idle', stateTimer: 45, facing: -1, frame: 0, type: 'grunt' },
      { x: 1900, y: GROUND_Y - 55, w: 55, h: 55, hp: 20, alive: true, state: 'idle', stateTimer: 30, facing: -1, frame: 0, type: 'boss' },
    ],
    score: 0,
    gameOver: false,
    win: false,
    frameCount: 0,
  };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export default function DoubleDragonGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createState());
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [ui, setUi] = useState({ hp: 6, score: 0, gameOver: false, win: false });

  const resetGame = useCallback(() => {
    stateRef.current = createState();
    setUi({ hp: 6, score: 0, gameOver: false, win: false });
  }, []);

  useEffect(() => {
    const d = (e) => { keysRef.current[e.code] = true; };
    const u = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', d); window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawBg(camX) {
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.6);
      sky.addColorStop(0, '#1a1a2e'); sky.addColorStop(1, '#2d1b4e');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H * 0.6);
      // Neon signs
      [[100, 40, '#ff0080', 'DANGER'], [350, 60, '#00ffcc', 'NO EXIT'], [600, 30, '#ffaa00', 'FIGHT!']].forEach(([bx, by, col, text]) => {
        const rx = ((bx - camX * 0.2) % (CANVAS_W + 300) + CANVAS_W + 300) % (CANVAS_W + 300) - 150;
        ctx.fillStyle = col + '22'; ctx.fillRect(rx - 10, by - 6, text.length * 12 + 20, 28);
        ctx.strokeStyle = col; ctx.lineWidth = 1.5;
        ctx.strokeRect(rx - 10, by - 6, text.length * 12 + 20, 28);
        ctx.fillStyle = col; ctx.font = 'bold 14px monospace';
        ctx.fillText(text, rx, by + 14);
      });
      // Alley walls
      ctx.fillStyle = '#1e1e2e'; ctx.fillRect(0, CANVAS_H * 0.6, CANVAS_W, CANVAS_H * 0.4);
      // Ground
      ctx.fillStyle = '#2a2a3a'; ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
      ctx.fillStyle = '#3a3a4a'; ctx.fillRect(0, GROUND_Y, CANVAS_W, 4);
      for (let lx = -camX % 80; lx < CANVAS_W; lx += 80) {
        ctx.fillStyle = '#4a4a5a'; ctx.fillRect(lx, GROUND_Y + 10, 40, 3);
      }
      // Background buildings
      ctx.fillStyle = 'rgba(30,20,50,0.8)';
      [[0, 200, 60, 200, camX*0.35], [120, 180, 80, 220, camX*0.35], [280, 160, 60, 240, camX*0.35],
       [500, 190, 70, 210, camX*0.35], [700, 170, 90, 230, camX*0.35]].forEach(([bx, by, bw, bh, off]) => {
        const rx = ((bx - off) % (CANVAS_W + 200) + CANVAS_W + 200) % (CANVAS_W + 200) - 100;
        ctx.fillRect(rx, by, bw, bh);
        ctx.fillStyle = 'rgba(255,200,50,0.3)';
        for (let wy = by + 15; wy < by + bh - 10; wy += 22) {
          for (let wx = rx + 8; wx < rx + bw - 8; wx += 18) ctx.fillRect(wx, wy, 8, 12);
        }
        ctx.fillStyle = 'rgba(30,20,50,0.8)';
      });
    }

    function drawCharacter(ctx, x, y, w, h, facing, options = {}) {
      const { color = '#e8a030', shirtColor = '#cc2020', hitFlash = false, type = 'grunt', isPlayer = false, frame = 0, attackType = null, attackTimer = 0 } = options;
      ctx.save();
      if (facing < 0) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(-1, 1); ctx.translate(-(x + w / 2), -(y + h / 2)); }

      const legOff = Math.sin(frame * 0.22) * 5;
      const bob = Math.abs(Math.sin(frame * 0.22)) * 2;

      if (hitFlash) { ctx.globalAlpha = 0.6 + Math.sin(frame * 0.8) * 0.3; }

      const scale = type === 'boss' ? 1.2 : type === 'heavy' ? 1.1 : 1;
      const ow = w / scale, oh = h / scale;
      const ox = x + (w - ow) / 2, oy = y + h - oh;

      // Legs
      ctx.fillStyle = '#333'; ctx.fillRect(ox + 2, oy + oh * 0.65, ow * 0.3, oh * 0.35 + legOff);
      ctx.fillRect(ox + ow * 0.4, oy + oh * 0.65, ow * 0.3, oh * 0.35 - legOff);
      // Boots
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ox + 1, oy + oh - 8 + legOff, ow * 0.32 + 2, 8);
      ctx.fillRect(ox + ow * 0.38, oy + oh - 8 - legOff, ow * 0.32 + 2, 8);
      // Body
      ctx.fillStyle = shirtColor;
      ctx.fillRect(ox + 3, oy + oh * 0.3 - bob, ow - 6, oh * 0.35 + bob);
      // Belt
      ctx.fillStyle = '#222'; ctx.fillRect(ox + 2, oy + oh * 0.62, ow - 4, 5);
      ctx.fillStyle = '#888'; ctx.fillRect(ox + ow / 2 - 4, oy + oh * 0.62, 8, 5);
      // Arms
      const punchX = attackType === 'punch' ? (ow * 0.4 + (10 - attackTimer) * 2.5) : ow * 0.4;
      const kickX = attackType === 'kick' ? ow * 0.1 + (10 - (options.kickTimer || 0)) * 4 : ow * 0.1;
      if (type === 'boss') {
        ctx.fillStyle = '#cc4400'; ctx.fillRect(ox - 4, oy + oh * 0.3, 10, oh * 0.3);
        ctx.fillRect(ox + ow - 6, oy + oh * 0.3, 10, oh * 0.3);
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(ox - 4, oy + oh * 0.3 - bob, 10, oh * 0.28);
        ctx.fillRect(ox + ow - 6, oy + oh * 0.3 - bob, 10, oh * 0.28);
        // Punch arm extend
        if (attackType === 'punch') ctx.fillRect(ox + punchX, oy + oh * 0.32 - bob, ow * 0.45, 10);
        if (attackType === 'kick') ctx.fillRect(ox + kickX, oy + oh * 0.65, ow * 0.5, 10);
      }
      // Fists
      ctx.fillStyle = color;
      if (attackType === 'punch') {
        ctx.beginPath(); ctx.arc(ox + punchX + ow * 0.45, oy + oh * 0.37 - bob, 7, 0, Math.PI * 2); ctx.fill();
      }
      // Head
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(ox + ow / 2, oy + oh * 0.14 - bob, ow * 0.28, 0, Math.PI * 2); ctx.fill();
      // Eyes
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ox + ow / 2 + 3, oy + oh * 0.1 - bob, 5, 5);
      if (type === 'boss') {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(ox + ow / 2 + 4, oy + oh * 0.11 - bob, 3, 3);
      }
      // Hair / head band
      ctx.fillStyle = isPlayer ? '#1a1a2e' : '#8B0000';
      ctx.fillRect(ox + ow / 2 - ow * 0.28, oy + oh * 0.04 - bob, ow * 0.56, ow * 0.12);

      ctx.restore();
    }

    function drawHUD(s) {
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, CANVAS_W, 36);
      for (let i = 0; i < s.player.maxHp; i++) {
        ctx.fillStyle = i < s.player.hp ? '#e53935' : '#333';
        ctx.font = '15px sans-serif'; ctx.fillText('♥', 10 + i * 22, 24);
      }
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 13px monospace';
      ctx.fillText(`SCORE: ${s.score}`, 200, 24);
      const alive = s.enemies.filter(e => e.alive).length;
      ctx.fillStyle = '#ff8080'; ctx.fillText(`THUGS: ${alive}`, 500, 24);
    }

    function update() {
      const s = stateRef.current;
      if (s.gameOver || s.win) return;
      const keys = keysRef.current;
      const { player } = s;
      s.frameCount++;
      player.frame = s.frameCount;

      if (player.iframes > 0) player.iframes--;
      if (player.attackTimer > 0) player.attackTimer--;
      else { player.attackType = null; }
      if (player.kickTimer > 0) player.kickTimer--;

      let vx = 0, vy = 0;
      if (keys['ArrowLeft'] || keys['KeyA']) { vx = -PLAYER_SPEED; player.facing = -1; }
      if (keys['ArrowRight'] || keys['KeyD']) { vx = PLAYER_SPEED; player.facing = 1; }
      if (keys['ArrowUp'] || keys['KeyW']) vy = -PLAYER_SPEED * 0.6;
      if (keys['ArrowDown'] || keys['KeyS']) vy = PLAYER_SPEED * 0.6;

      if (keys['KeyZ'] && player.attackTimer === 0) { player.attackType = 'punch'; player.attackTimer = 12; }
      if (keys['KeyX'] && player.kickTimer === 0) { player.attackType = 'kick'; player.kickTimer = 14; player.attackTimer = 14; }

      player.x = clamp(player.x + vx, 0, WORLD_W - player.w);
      player.y = clamp(player.y + vy, GROUND_Y - 80, GROUND_Y - player.h);

      // Attack hitbox
      if (player.attackType === 'punch' && player.attackTimer > 8) {
        s.enemies.forEach((e) => {
          if (!e.alive) return;
          const range = PUNCH_RANGE;
          const eDist = Math.abs(e.x + e.w / 2 - (player.x + player.w / 2));
          const yDist = Math.abs(e.y - player.y);
          if (eDist < range && yDist < 40) {
            e.hp--; e.stateTimer = 30; e.state = 'stagger';
            if (e.hp <= 0) { e.alive = false; s.score += e.type === 'boss' ? 1000 : e.type === 'heavy' ? 300 : 100; }
          }
        });
      }
      if (player.attackType === 'kick' && player.kickTimer > 10) {
        s.enemies.forEach((e) => {
          if (!e.alive) return;
          const range = KICK_RANGE;
          const eDist = Math.abs(e.x + e.w / 2 - (player.x + player.w / 2));
          const yDist = Math.abs(e.y - player.y);
          if (eDist < range && yDist < 50) {
            e.hp -= 2; e.stateTimer = 40; e.state = 'stagger';
            e.x += player.facing * 30;
            if (e.hp <= 0) { e.alive = false; s.score += e.type === 'boss' ? 1500 : e.type === 'heavy' ? 400 : 150; }
          }
        });
      }

      // Enemy AI
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        e.frame++;
        e.stateTimer--;
        if (e.stateTimer <= 0) {
          if (e.state === 'stagger') { e.state = 'chase'; e.stateTimer = 40; }
          else if (e.state === 'attack') { e.state = 'chase'; e.stateTimer = 50; }
          else { e.state = 'chase'; e.stateTimer = 30 + Math.random() * 40; }
        }

        const dx = player.x - e.x, dy = player.y - e.y;
        const d = Math.hypot(dx, dy);
        e.facing = dx > 0 ? 1 : -1;

        if (e.state === 'chase') {
          const spd = e.type === 'boss' ? 2.2 : e.type === 'heavy' ? 1.4 : 1.8;
          if (d > 20) { e.x += (dx / d) * spd; e.y += (dy / d) * spd * 0.4; }
          else { e.state = 'attack'; e.stateTimer = 20; }
        }

        if (e.state === 'attack') {
          const hitRange = e.type === 'boss' ? 55 : e.type === 'heavy' ? 45 : 38;
          const yRange = 40;
          if (d < hitRange && Math.abs(dy) < yRange && player.iframes === 0) {
            const dmg = e.type === 'boss' ? 2 : 1;
            player.hp -= dmg; player.iframes = 70;
            if (player.hp <= 0) { s.gameOver = true; setUi({ hp: 0, score: s.score, gameOver: true, win: false }); return; }
          }
        }

        e.x = clamp(e.x, 0, WORLD_W - e.w);
        e.y = clamp(e.y, GROUND_Y - 80, GROUND_Y - e.h);
      });

      // Camera
      const targetCamX = player.x - CANVAS_W * 0.35;
      s.camera.x += (targetCamX - s.camera.x) * 0.1;
      s.camera.x = Math.max(0, Math.min(s.camera.x, WORLD_W - CANVAS_W));

      if (s.enemies.every(e => !e.alive)) {
        s.win = true; setUi({ hp: player.hp, score: s.score, gameOver: false, win: true }); return;
      }
      setUi({ hp: player.hp, score: s.score, gameOver: false, win: false });
    }

    function render() {
      const s = stateRef.current;
      const camX = s.camera.x;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBg(camX);

      // Draw enemies (behind player)
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        const ex = e.x - camX;
        if (ex < -60 || ex > CANVAS_W + 60) return;
        const hitFlash = e.state === 'stagger';
        drawCharacter(ctx, ex, e.y, e.w, e.h, e.facing, {
          color: e.type === 'boss' ? '#cc4400' : e.type === 'heavy' ? '#cc8800' : '#e8a030',
          shirtColor: e.type === 'boss' ? '#8B0000' : e.type === 'heavy' ? '#333' : '#1a1a7a',
          hitFlash, type: e.type, frame: e.frame,
        });
        // HP bar for heavy/boss
        if (e.type !== 'grunt') {
          const bw = e.w + 10;
          const maxHp = e.type === 'boss' ? 20 : 6;
          ctx.fillStyle = '#333'; ctx.fillRect(ex - 5, e.y - 10, bw, 5);
          ctx.fillStyle = '#e53935'; ctx.fillRect(ex - 5, e.y - 10, bw * (e.hp / maxHp), 5);
        }
      });

      // Player
      const px = s.player.x - camX;
      const hitFlash = s.player.iframes > 0;
      drawCharacter(ctx, px, s.player.y, s.player.w, s.player.h, s.player.facing, {
        color: '#f5c5a0', shirtColor: '#1a4a8a', hitFlash, isPlayer: true,
        frame: s.player.frame, attackType: s.player.attackType, attackTimer: s.player.attackTimer, kickTimer: s.player.kickTimer,
      });

      drawHUD(s);

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#e53935'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
        ctx.fillText('K.O.!', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = '#fff'; ctx.font = '18px monospace';
        ctx.fillText(`Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 18);
        ctx.textAlign = 'left';
      }
      if (s.win) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
        ctx.fillText('STREET CLEARED!', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = '#00e676'; ctx.font = '18px monospace';
        ctx.fillText(`Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 18);
        ctx.textAlign = 'left';
      }
    }

    function loop() { update(); render(); rafRef.current = requestAnimationFrame(loop); }
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="bg-black flex flex-col items-center">
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        className="w-full max-w-full block" style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }} tabIndex={0} />
      <div className="w-full bg-black/80 border-t border-white/10">
        <GameMobileControls keysRef={keysRef} variant="fighter" />
      </div>
      {(ui.gameOver || ui.win) && (
        <div className="p-4">
          <button onClick={resetGame} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-sm hover:opacity-90">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}