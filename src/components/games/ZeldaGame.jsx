import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';
import GameAudio from './GameAudio';

const CANVAS_W = 800;
const CANVAS_H = 400;
const TILE = 40;
const COLS = CANVAS_W / TILE;
const ROWS = CANVAS_H / TILE;
const PLAYER_SPEED = 2.8;
const SWORD_RANGE = 52;

// 0=open, 1=wall, 2=water, 3=tree
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,0,0,1,0,2,2,0,0,1,1,0,0,3,3,0,1],
  [1,0,1,0,0,0,0,0,2,0,0,0,0,1,0,0,3,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,1,0,0,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,3,3,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

function createState() {
  return {
    player: { x: 60, y: 60, w: 24, h: 24, hp: 5, maxHp: 5, attack: false, attackAngle: 0, attackTimer: 0, iframes: 0, dir: 0, keys_held: 0 },
    enemies: [
      { x: 280, y: 80, w: 26, h: 26, hp: 2, vx: 1.2, vy: 0, alive: true, type: 'red', moveTimer: 0, frame: 0 },
      { x: 480, y: 200, w: 26, h: 26, hp: 2, vx: -1, vy: 1, alive: true, type: 'blue', moveTimer: 0, frame: 0 },
      { x: 640, y: 100, w: 26, h: 26, hp: 3, vx: 0.8, vy: 0.8, alive: true, type: 'red', moveTimer: 0, frame: 0 },
      { x: 360, y: 280, w: 26, h: 26, hp: 2, vx: -1.2, vy: 0, alive: true, type: 'blue', moveTimer: 0, frame: 0 },
      { x: 560, y: 320, w: 32, h: 32, hp: 6, vx: 0.5, vy: 0, alive: true, type: 'boss', moveTimer: 0, frame: 0 },
    ],
    rupees: [
      { x: 180, y: 130, collected: false },
      { x: 440, y: 90, collected: false },
      { x: 320, y: 230, collected: false },
      { x: 600, y: 260, collected: false },
      { x: 720, y: 180, collected: false },
    ],
    score: 0,
    rupeeCount: 0,
    gameOver: false,
    win: false,
    frameCount: 0,
  };
}

function isWall(tx, ty) {
  if (ty < 0 || ty >= ROWS || tx < 0 || tx >= COLS) return true;
  const t = MAP[ty][tx];
  return t === 1 || t === 2 || t === 3;
}

function moveWithCollision(x, y, vx, vy, w, h) {
  let nx = x + vx;
  let ny = y + vy;
  const margin = 2;

  // X axis
  const lx1 = Math.floor((nx + margin) / TILE);
  const lx2 = Math.floor((nx + w - margin) / TILE);
  const yt1 = Math.floor((y + margin) / TILE);
  const yt2 = Math.floor((y + h - margin) / TILE);
  if (isWall(lx1, yt1) || isWall(lx2, yt1) || isWall(lx1, yt2) || isWall(lx2, yt2)) nx = x;

  // Y axis
  const lt1 = Math.floor((nx + margin) / TILE);
  const lt2 = Math.floor((nx + w - margin) / TILE);
  const ry1 = Math.floor((ny + margin) / TILE);
  const ry2 = Math.floor((ny + h - margin) / TILE);
  if (isWall(lt1, ry1) || isWall(lt2, ry1) || isWall(lt1, ry2) || isWall(lt2, ry2)) ny = y;

  return { x: nx, y: ny };
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function drawTile(ctx, tx, ty) {
  const t = MAP[ty]?.[tx] ?? 1;
  const px = tx * TILE, py = ty * TILE;
  switch (t) {
    case 0:
      ctx.fillStyle = ty % 2 === 0 ? '#3a6632' : '#3d6b35';
      ctx.fillRect(px, py, TILE, TILE);
      break;
    case 1:
      ctx.fillStyle = '#5d4e3a';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#4a3e2e';
      ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = '#6b5a44';
      ctx.fillRect(px, py, TILE, 3);
      ctx.fillRect(px, py, 3, TILE);
      break;
    case 2:
      ctx.fillStyle = '#1e6eb5';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = 'rgba(100,180,255,0.3)';
      ctx.fillRect(px + 4, py + 8, TILE - 8, 4);
      break;
    case 3:
      ctx.fillStyle = '#3a6632';
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = '#1e4a18';
      ctx.beginPath(); ctx.arc(px + TILE / 2, py + TILE / 2, 14, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2a7022';
      ctx.beginPath(); ctx.arc(px + TILE / 2 - 5, py + TILE / 2 - 3, 10, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(px + TILE / 2 + 5, py + TILE / 2 - 3, 10, 0, Math.PI * 2); ctx.fill();
      break;
  }
}

export default function ZeldaGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createState());
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [ui, setUi] = useState({ hp: 5, score: 0, rupees: 0, gameOver: false, win: false });

  const resetGame = useCallback(() => {
    stateRef.current = createState();
    setUi({ hp: 5, score: 0, rupees: 0, gameOver: false, win: false });
  }, []);

  useEffect(() => {
    const down = (e) => { keysRef.current[e.code] = true; };
    const up = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', down); window.addEventListener('keyup', up);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawPlayer(p, frame) {
      const { x, y, w, h, dir, iframes } = p;
      if (iframes > 0 && Math.floor(iframes / 4) % 2 === 0) return;
      const cx = x + w / 2, cy = y + h / 2;

      // Body - Link style
      ctx.fillStyle = '#228B22';
      ctx.fillRect(x + 4, y + 10, w - 8, h - 12);
      // Hat
      ctx.fillStyle = '#1a7a1a';
      ctx.beginPath(); ctx.moveTo(x + 2, y + 10); ctx.lineTo(cx, y - 4); ctx.lineTo(x + w - 2, y + 10); ctx.fill();
      // Head
      ctx.fillStyle = '#f5c5a0';
      ctx.beginPath(); ctx.arc(cx, y + 8, 8, 0, Math.PI * 2); ctx.fill();
      // Eyes
      const ex = dir === 0 ? cx + 2 : dir === 1 ? cx - 2 : cx;
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.arc(ex, y + 7, 2, 0, Math.PI * 2); ctx.fill();
      // Legs
      const legOff = Math.sin(frame * 0.25) * 3;
      ctx.fillStyle = '#8B6914';
      ctx.fillRect(x + 4, y + h - 8, 8, 6 + legOff);
      ctx.fillRect(x + w - 12, y + h - 8, 8, 6 - legOff);

      // Sword attack
      if (p.attack) {
        const angle = p.attackAngle;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.fillStyle = '#C0C0C0';
        ctx.fillRect(0, -3, SWORD_RANGE * (p.attackTimer / 10), 6);
        ctx.fillStyle = '#FFD700';
        ctx.fillRect(-4, -5, 10, 10);
        ctx.restore();
      }
    }

    function drawEnemy(e, frame) {
      if (!e.alive) return;
      const cx = e.x + e.w / 2, cy = e.y + e.h / 2;
      const bob = Math.sin(frame * 0.15) * 2;
      if (e.type === 'boss') {
        ctx.fillStyle = '#8B0000';
        ctx.beginPath(); ctx.arc(cx, cy + bob, e.w / 2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF0000';
        ctx.beginPath(); ctx.arc(cx, cy + bob, e.w / 2 - 4, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FF6600';
        ctx.beginPath(); ctx.arc(cx - 6, cy - 4 + bob, 5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 6, cy - 4 + bob, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath(); ctx.arc(cx - 6, cy - 4 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 6, cy - 4 + bob, 2.5, 0, Math.PI * 2); ctx.fill();
        // HP bar
        const bw = 36;
        ctx.fillStyle = '#333';
        ctx.fillRect(e.x - 2, e.y - 10, bw, 5);
        ctx.fillStyle = '#e53935';
        ctx.fillRect(e.x - 2, e.y - 10, bw * (e.hp / 6), 5);
      } else {
        const color = e.type === 'red' ? '#e53935' : '#1e88e5';
        ctx.fillStyle = color;
        ctx.fillRect(e.x, e.y + bob, e.w, e.h);
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(e.x + 2, e.y + 2 + bob, e.w - 4, 4);
        ctx.fillStyle = '#fff';
        ctx.fillRect(e.x + 5, e.y + 7 + bob, 5, 6);
        ctx.fillRect(e.x + e.w - 10, e.y + 7 + bob, 5, 6);
        ctx.fillStyle = '#000';
        ctx.fillRect(e.x + 6, e.y + 8 + bob, 3, 4);
        ctx.fillRect(e.x + e.w - 9, e.y + 8 + bob, 3, 4);
      }
    }

    function drawRupee(r, frame) {
      if (r.collected) return;
      const pulse = Math.abs(Math.sin(frame * 0.07)) * 3;
      ctx.fillStyle = '#00e676';
      ctx.save();
      ctx.translate(r.x, r.y - pulse);
      ctx.beginPath();
      ctx.moveTo(0, -10); ctx.lineTo(7, 0); ctx.lineTo(0, 10); ctx.lineTo(-7, 0);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(3, -3); ctx.lineTo(0, 0); ctx.lineTo(-3, -3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    function drawHUD(s) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, CANVAS_W, 36);
      // HP hearts
      for (let i = 0; i < s.player.maxHp; i++) {
        const filled = i < s.player.hp;
        ctx.fillStyle = filled ? '#e53935' : '#555';
        ctx.font = '16px sans-serif';
        ctx.fillText('♥', 10 + i * 22, 24);
      }
      ctx.fillStyle = '#00e676';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`💎 ${s.rupeeCount}`, 180, 24);
      ctx.fillStyle = '#ffd700';
      ctx.fillText(`SCORE: ${s.score}`, 300, 24);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px monospace';
      const alive = s.enemies.filter(e => e.alive).length;
      ctx.fillText(`ENEMIES: ${alive}`, 520, 24);
    }

    function update() {
      const s = stateRef.current;
      if (s.gameOver || s.win) return;
      const keys = keysRef.current;
      const { player } = s;
      s.frameCount++;

      if (player.iframes > 0) player.iframes--;

      // Movement
      let vx = 0, vy = 0;
      if (keys['ArrowLeft'] || keys['KeyA']) { vx = -PLAYER_SPEED; player.dir = 3; }
      if (keys['ArrowRight'] || keys['KeyD']) { vx = PLAYER_SPEED; player.dir = 1; }
      if (keys['ArrowUp'] || keys['KeyW']) { vy = -PLAYER_SPEED; player.dir = 2; }
      if (keys['ArrowDown'] || keys['KeyS']) { vy = PLAYER_SPEED; player.dir = 0; }
      if (vx !== 0 && vy !== 0) { vx *= 0.707; vy *= 0.707; }

      const moved = moveWithCollision(player.x, player.y, vx, vy, player.w, player.h);
      player.x = moved.x; player.y = moved.y;

      // Sword attack
      if ((keys['KeyZ'] || keys['Space']) && !player.attack) {
        player.attack = true;
        player.attackTimer = 10;
        const angles = [Math.PI / 2, 0, -Math.PI / 2, Math.PI];
        player.attackAngle = angles[player.dir] ?? 0;
      }
      if (player.attack) {
        player.attackTimer--;
        if (player.attackTimer <= 0) { player.attack = false; }
      }

      // Enemy AI
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        e.frame++;
        e.moveTimer++;

        const dx = player.x - e.x, dy = player.y - e.y;
        const d = Math.hypot(dx, dy);

        if (e.type === 'boss') {
          if (d < 220) { e.vx = (dx / d) * 1.4; e.vy = (dy / d) * 1.4; }
          else { if (e.moveTimer % 90 === 0) { e.vx = (Math.random() - 0.5) * 2.5; e.vy = (Math.random() - 0.5) * 2.5; } }
        } else {
          if (d < 180) { e.vx = (dx / d) * 1.6; e.vy = (dy / d) * 1.6; }
          else { if (e.moveTimer % 60 === 0) { e.vx = (Math.random() - 0.5) * 2; e.vy = (Math.random() - 0.5) * 2; } }
        }

        const em = moveWithCollision(e.x, e.y, e.vx, e.vy, e.w, e.h);
        if (em.x === e.x) e.vx *= -1;
        if (em.y === e.y) e.vy *= -1;
        e.x = em.x; e.y = em.y;

        // Sword hits enemy
        if (player.attack && player.attackTimer > 0) {
          const eCx = e.x + e.w / 2, eCy = e.y + e.h / 2;
          const pCx = player.x + player.w / 2, pCy = player.y + player.h / 2;
          const tipX = pCx + Math.cos(player.attackAngle) * SWORD_RANGE;
          const tipY = pCy + Math.sin(player.attackAngle) * SWORD_RANGE;
          const dToTip = Math.hypot(eCx - tipX, eCy - tipY);
          const dToPlayer = Math.hypot(eCx - pCx, eCy - pCy);
          if (dToTip < 30 || dToPlayer < SWORD_RANGE + 5) {
            e.hp--;
            e.vx = (e.x - player.x) * 0.08;
            e.vy = (e.y - player.y) * 0.08;
            if (e.hp <= 0) { e.alive = false; s.score += e.type === 'boss' ? 500 : 100; }
          }
        }

        // Enemy hits player
        if (player.iframes === 0 && dist(player, e) < (player.w + e.w) / 2 - 2) {
          player.hp--;
          player.iframes = 80;
          if (player.hp <= 0) {
            s.gameOver = true;
            setUi({ hp: 0, score: s.score, rupees: s.rupeeCount, gameOver: true, win: false });
          }
        }
      });

      // Rupees
      s.rupees.forEach((r) => {
        if (r.collected) return;
        if (dist(player, r) < 20) { r.collected = true; s.rupeeCount++; s.score += 25; }
      });

      // Win condition
      if (s.enemies.every(e => !e.alive)) {
        s.win = true;
        setUi({ hp: s.player.hp, score: s.score, rupees: s.rupeeCount, gameOver: false, win: true });
      }

      setUi({ hp: player.hp, score: s.score, rupees: s.rupeeCount, gameOver: false, win: false });
    }

    function render() {
      const s = stateRef.current;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

      // Draw map
      for (let ty = 0; ty < ROWS; ty++) for (let tx = 0; tx < COLS; tx++) drawTile(ctx, tx, ty);

      // Rupees
      s.rupees.forEach(r => drawRupee(r, s.frameCount));
      // Enemies
      s.enemies.forEach(e => drawEnemy(e, s.frameCount));
      // Player
      drawPlayer(s.player, s.frameCount);
      // HUD
      drawHUD(s);

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#e53935'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = '#fff'; ctx.font = '18px monospace';
        ctx.fillText(`Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 18);
        ctx.textAlign = 'left';
      }
      if (s.win) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
        ctx.fillText('ENEMIES DEFEATED!', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = '#00e676'; ctx.font = '18px monospace';
        ctx.fillText(`Score: ${s.score} | Rupees: ${s.rupeeCount}`, CANVAS_W / 2, CANVAS_H / 2 + 18);
        ctx.textAlign = 'left';
      }
    }

    function loop() { update(); render(); rafRef.current = requestAnimationFrame(loop); }
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="bg-[#1a2a1a] flex flex-col items-center">
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        className="w-full max-w-full block" style={{ aspectRatio: `${CANVAS_W}/${CANVAS_H}` }} tabIndex={0} />
      <div className="w-full bg-black/70 border-t border-white/10">
        <GameMobileControls keysRef={keysRef} variant="zelda" />
      </div>
      {(ui.gameOver || ui.win) && (
        <div className="p-4">
          <button onClick={resetGame} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm hover:opacity-90">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}