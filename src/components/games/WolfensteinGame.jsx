import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Raycaster constants ──────────────────────────────────────────────────────
const W = 640, H = 400;
const FOV = Math.PI / 3;
const HALF_FOV = FOV / 2;
const NUM_RAYS = W;
const MAX_DEPTH = 16;
const CELL = 64;
const MOVE_SPEED = 0.06;
const ROT_SPEED = 0.045;

// ─── Map (0=empty, 1-4=wall types, 9=exit) ───────────────────────────────────
const MAP_W = 16, MAP_H = 16;
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,1,0,0,0,0,0,0,1],
  [1,0,2,2,0,0,0,0,1,0,3,0,3,0,0,1],
  [1,0,2,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,1,1,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,4,0,0,0,1],
  [1,0,0,0,0,1,0,0,0,0,0,4,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,2,2,0,0,0,0,1,0,1],
  [1,0,0,0,0,0,0,2,0,0,0,0,0,1,0,1],
  [1,0,3,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,3,0,0,0,0,0,0,0,1,1,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,9,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

// Wall colours per type
const WALL_COLORS = ['', '#8B4513', '#5C3317', '#6B6B00', '#1a3a6b'];
const WALL_DARK   = ['', '#5c2d0a', '#3a2010', '#4a4a00', '#0f2444'];

function createState() {
  return {
    px: 1.5, py: 1.5,
    angle: 0,
    hp: 100, maxHp: 100,
    ammo: 50, score: 0,
    kills: 0,
    shooting: false, shootTimer: 0,
    reloadTimer: 0,
    enemies: [
      { x: 3.5, y: 3.5, hp: 2, alive: true, alert: false, moveTimer: 0, shootTimer: 120 },
      { x: 7.5, y: 2.5, hp: 2, alive: true, alert: false, moveTimer: 0, shootTimer: 100 },
      { x: 10.5, y: 9.5, hp: 3, alive: true, alert: false, moveTimer: 0, shootTimer: 90 },
      { x: 5.5, y: 8.5, hp: 2, alive: true, alert: false, moveTimer: 0, shootTimer: 110 },
      { x: 13.5, y: 6.5, hp: 2, alive: true, alert: false, moveTimer: 0, shootTimer: 95 },
      { x: 8.5, y: 12.5, hp: 4, alive: true, alert: false, moveTimer: 0, shootTimer: 80 },
      { x: 11.5, y: 13.5, hp: 2, alive: true, alert: false, moveTimer: 0, shootTimer: 115 },
      { x: 2.5, y: 11.5, hp: 3, alive: true, alert: false, moveTimer: 0, shootTimer: 105 },
    ],
    items: [
      { x: 3.5, y: 7.5, type: 'ammo', collected: false },
      { x: 9.5, y: 4.5, type: 'health', collected: false },
      { x: 6.5, y: 11.5, type: 'ammo', collected: false },
      { x: 12.5, y: 3.5, type: 'health', collected: false },
    ],
    gameOver: false, win: false, frameCount: 0,
    flashTimer: 0, damageFlash: 0,
  };
}

function isWalkable(x, y) {
  const mx = Math.floor(x), my = Math.floor(y);
  if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return false;
  return MAP[my][mx] === 0 || MAP[my][mx] === 9;
}

function castRay(px, py, angle) {
  const sinA = Math.sin(angle), cosA = Math.cos(angle);
  let dist = 0, wallType = 1, side = 0;

  // DDA algorithm
  const dx = cosA > 0 ? 1 : -1;
  const dy = sinA > 0 ? 1 : -1;
  let x = px, y = py;
  let stepX = (cosA > 0 ? Math.ceil(x) - x : x - Math.floor(x)) / Math.abs(cosA);
  let stepY = (sinA > 0 ? Math.ceil(y) - y : y - Math.floor(y)) / Math.abs(sinA);
  const deltaX = 1 / Math.abs(cosA);
  const deltaY = 1 / Math.abs(sinA);

  for (let depth = 0; depth < MAX_DEPTH * 2; depth++) {
    if (stepX < stepY) {
      x += dx; stepX += deltaX; side = 0;
    } else {
      y += dy; stepY += deltaY; side = 1;
    }
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) { dist = MAX_DEPTH; break; }
    const cell = MAP[my][mx];
    if (cell > 0) {
      wallType = cell === 9 ? 5 : cell;
      dist = side === 0
        ? (x - px - (dx < 0 ? 1 : 0)) / cosA
        : (y - py - (dy < 0 ? 1 : 0)) / sinA;
      if (dist < 0) dist = 0;
      break;
    }
  }
  return { dist, wallType, side };
}

export default function WolfensteinGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createState());
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [ui, setUi] = useState({ hp: 100, ammo: 50, score: 0, kills: 0, gameOver: false, win: false });

  const resetGame = useCallback(() => {
    stateRef.current = createState();
    setUi({ hp: 100, ammo: 50, score: 0, kills: 0, gameOver: false, win: false });
  }, []);

  useEffect(() => {
    const d = (e) => { keysRef.current[e.code] = true; e.preventDefault(); };
    const u = (e) => { keysRef.current[e.code] = false; };
    window.addEventListener('keydown', d);
    window.addEventListener('keyup', u);
    return () => { window.removeEventListener('keydown', d); window.removeEventListener('keyup', u); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawScene(s) {
      // Ceiling
      const ceilGrad = ctx.createLinearGradient(0, 0, 0, H / 2);
      ceilGrad.addColorStop(0, '#111');
      ceilGrad.addColorStop(1, '#1a1a2e');
      ctx.fillStyle = ceilGrad;
      ctx.fillRect(0, 0, W, H / 2);

      // Floor
      const floorGrad = ctx.createLinearGradient(0, H / 2, 0, H);
      floorGrad.addColorStop(0, '#2a1a0a');
      floorGrad.addColorStop(1, '#1a0a00');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, H / 2, W, H / 2);

      // Rays
      const zBuffer = new Float32Array(W);
      for (let col = 0; col < NUM_RAYS; col++) {
        const rayAngle = s.angle - HALF_FOV + (col / NUM_RAYS) * FOV;
        const { dist, wallType, side } = castRay(s.px, s.py, rayAngle);
        zBuffer[col] = dist;

        const corrected = dist * Math.cos(rayAngle - s.angle);
        const wallH = Math.min(H, H / (corrected || 0.001));
        const top = (H - wallH) / 2;

        const baseColor = WALL_COLORS[Math.min(wallType, WALL_COLORS.length - 1)] || '#888';
        const darkColor = WALL_DARK[Math.min(wallType, WALL_DARK.length - 1)] || '#444';
        const fog = Math.max(0, 1 - dist / MAX_DEPTH);

        ctx.fillStyle = side === 1 ? darkColor : baseColor;
        ctx.globalAlpha = Math.max(0.15, fog);
        ctx.fillRect(col, top, 1, wallH);
        ctx.globalAlpha = 1;
      }

      // Sprites (enemies + items)
      const sprites = [
        ...s.enemies.filter(e => e.alive).map(e => ({ ...e, spriteType: 'enemy' })),
        ...s.items.filter(i => !i.collected).map(i => ({ ...i, spriteType: 'item' })),
      ];

      sprites.sort((a, b) => {
        const da = Math.hypot(a.x - s.px, a.y - s.py);
        const db = Math.hypot(b.x - s.px, b.y - s.py);
        return db - da;
      });

      sprites.forEach((sp) => {
        const dx = sp.x - s.px, dy = sp.y - s.py;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.3) return;

        const spriteAngle = Math.atan2(dy, dx);
        let relAngle = spriteAngle - s.angle;
        while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
        while (relAngle < -Math.PI) relAngle += 2 * Math.PI;
        if (Math.abs(relAngle) > HALF_FOV + 0.1) return;

        const screenX = (W / 2) + (relAngle / HALF_FOV) * (W / 2);
        const spriteH = Math.min(H * 1.2, H / (dist * 0.9 || 0.1));
        const spriteW = spriteH;
        const spriteTop = H / 2 - spriteH / 2;
        const startCol = Math.floor(screenX - spriteW / 2);
        const endCol = Math.floor(screenX + spriteW / 2);

        for (let col = startCol; col < endCol; col++) {
          if (col < 0 || col >= W) continue;
          if (zBuffer[col] && dist >= zBuffer[col]) continue;

          const tx = (col - startCol) / (endCol - startCol);
          const fog = Math.max(0, 1 - dist / MAX_DEPTH);

          if (sp.spriteType === 'enemy') {
            // Draw enemy column
            const shade = sp.alert ? '#cc2200' : '#884400';
            const mid = (tx > 0.2 && tx < 0.8) ? shade : '#553300';
            ctx.globalAlpha = Math.max(0.2, fog);
            ctx.fillStyle = mid;
            ctx.fillRect(col, spriteTop + spriteH * 0.05, 1, spriteH * 0.75);
            // Head
            if (tx > 0.3 && tx < 0.7) {
              ctx.fillStyle = '#e8c880';
              ctx.fillRect(col, spriteTop, 1, spriteH * 0.25);
            }
            ctx.globalAlpha = 1;
          } else {
            // Item sprite
            const color = sp.type === 'health' ? '#00cc44' : '#ffaa00';
            if (tx > 0.2 && tx < 0.8) {
              ctx.globalAlpha = Math.max(0.3, fog) * (0.7 + Math.abs(Math.sin(s.frameCount * 0.1)) * 0.3);
              ctx.fillStyle = color;
              ctx.fillRect(col, H / 2 - spriteH * 0.25, 1, spriteH * 0.5);
              ctx.globalAlpha = 1;
            }
          }
        }
      });

      // Gun
      const gunX = W / 2 - 40;
      const gunBob = s.frameCount % 30 < 15 ? 0 : 2;
      const gunY = H - 120 + gunBob;
      if (s.shooting && s.shootTimer > 5) {
        // Muzzle flash
        ctx.fillStyle = 'rgba(255,200,50,0.8)';
        ctx.beginPath(); ctx.arc(W / 2, gunY - 20, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,200,0.9)';
        ctx.beginPath(); ctx.arc(W / 2, gunY - 20, 8, 0, Math.PI * 2); ctx.fill();
      }
      // Gun body
      ctx.fillStyle = '#555';
      ctx.fillRect(gunX + 20, gunY + 20, 40, 80);
      ctx.fillStyle = '#333';
      ctx.fillRect(gunX + 24, gunY + 15, 32, 20);
      ctx.fillStyle = '#666';
      ctx.fillRect(gunX + 26, gunY, 28, 20);
      ctx.fillStyle = '#888';
      ctx.fillRect(gunX + 36, gunY - 10, 8, 12);

      // Hands
      ctx.fillStyle = '#c8a060';
      ctx.fillRect(gunX + 10, gunY + 60, 25, 40);
      ctx.fillRect(gunX + 45, gunY + 60, 25, 40);

      // Damage flash
      if (s.damageFlash > 0) {
        ctx.fillStyle = `rgba(220,20,20,${s.damageFlash * 0.4})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    function drawHUD(s) {
      // Bottom bar
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, H - 44, W, 44);
      ctx.fillStyle = '#e53935';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`❤ ${s.hp}`, 12, H - 18);
      // HP bar
      ctx.fillStyle = '#333';
      ctx.fillRect(12, H - 12, 80, 6);
      ctx.fillStyle = s.hp > 50 ? '#00cc44' : s.hp > 25 ? '#ffaa00' : '#cc2200';
      ctx.fillRect(12, H - 12, 80 * (s.hp / 100), 6);

      ctx.fillStyle = '#ffaa00';
      ctx.fillText(`🔫 ${s.ammo}`, W / 2 - 30, H - 18);

      ctx.fillStyle = '#ffd700';
      ctx.fillText(`SCORE: ${s.score}`, W - 140, H - 24);
      ctx.fillStyle = '#fff';
      ctx.font = '11px monospace';
      ctx.fillText(`KILLS: ${s.kills}`, W - 140, H - 10);

      // Crosshair
      const cx = W / 2, cy = H / 2;
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(cx - 10, cy); ctx.lineTo(cx - 4, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + 4, cy); ctx.lineTo(cx + 10, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - 10); ctx.lineTo(cx, cy - 4); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + 4); ctx.lineTo(cx, cy + 10); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2); ctx.stroke();

      // Minimap
      const mmX = W - 100, mmY = 8, mmS = 5;
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(mmX - 2, mmY - 2, MAP_W * mmS + 4, MAP_H * mmS + 4);
      for (let my = 0; my < MAP_H; my++) {
        for (let mx = 0; mx < MAP_W; mx++) {
          ctx.fillStyle = MAP[my][mx] > 0 ? (MAP[my][mx] === 9 ? '#00ff88' : '#666') : '#1a1a1a';
          ctx.fillRect(mmX + mx * mmS, mmY + my * mmS, mmS - 1, mmS - 1);
        }
      }
      // Player on minimap
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(mmX + s.px * mmS - 2, mmY + s.py * mmS - 2, 4, 4);
      // Direction indicator
      ctx.strokeStyle = '#ffd700';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mmX + s.px * mmS, mmY + s.py * mmS);
      ctx.lineTo(mmX + (s.px + Math.cos(s.angle) * 1.5) * mmS, mmY + (s.py + Math.sin(s.angle) * 1.5) * mmS);
      ctx.stroke();
      // Enemies on minimap
      s.enemies.forEach(e => {
        if (!e.alive) return;
        ctx.fillStyle = '#e53935';
        ctx.fillRect(mmX + e.x * mmS - 2, mmY + e.y * mmS - 2, 4, 4);
      });
    }

    function update() {
      const s = stateRef.current;
      if (s.gameOver || s.win) return;
      const keys = keysRef.current;
      s.frameCount++;

      if (s.shootTimer > 0) s.shootTimer--;
      if (s.damageFlash > 0) s.damageFlash -= 0.05;
      else s.damageFlash = 0;

      // Movement
      const moveSpeed = MOVE_SPEED * (keys['ShiftLeft'] ? 1.6 : 1);
      if (keys['ArrowUp'] || keys['KeyW']) {
        const nx = s.px + Math.cos(s.angle) * moveSpeed;
        const ny = s.py + Math.sin(s.angle) * moveSpeed;
        if (isWalkable(nx, s.py)) s.px = nx;
        if (isWalkable(s.px, ny)) s.py = ny;
      }
      if (keys['ArrowDown'] || keys['KeyS']) {
        const nx = s.px - Math.cos(s.angle) * moveSpeed;
        const ny = s.py - Math.sin(s.angle) * moveSpeed;
        if (isWalkable(nx, s.py)) s.px = nx;
        if (isWalkable(s.px, ny)) s.py = ny;
      }
      if (keys['ArrowLeft'] || keys['KeyA']) s.angle -= ROT_SPEED;
      if (keys['ArrowRight'] || keys['KeyD']) s.angle += ROT_SPEED;

      // Strafe
      if (keys['KeyQ']) {
        const nx = s.px - Math.sin(s.angle) * moveSpeed;
        const ny = s.py + Math.cos(s.angle) * moveSpeed;
        if (isWalkable(nx, s.py)) s.px = nx;
        if (isWalkable(s.px, ny)) s.py = ny;
      }
      if (keys['KeyE']) {
        const nx = s.px + Math.sin(s.angle) * moveSpeed;
        const ny = s.py - Math.cos(s.angle) * moveSpeed;
        if (isWalkable(nx, s.py)) s.px = nx;
        if (isWalkable(s.px, ny)) s.py = ny;
      }

      // Shoot
      s.shooting = false;
      if ((keys['Space'] || keys['KeyZ']) && s.shootTimer === 0 && s.ammo > 0) {
        s.shooting = true; s.shootTimer = 15; s.ammo--;
        // Hitscan — find nearest enemy in crosshair
        let bestDist = 99, bestEnemy = null;
        s.enemies.forEach((e) => {
          if (!e.alive) return;
          const dx = e.x - s.px, dy = e.y - s.py;
          const dist = Math.hypot(dx, dy);
          if (dist > 10) return;
          const angleToEnemy = Math.atan2(dy, dx);
          let relAngle = angleToEnemy - s.angle;
          while (relAngle > Math.PI) relAngle -= 2 * Math.PI;
          while (relAngle < -Math.PI) relAngle += 2 * Math.PI;
          if (Math.abs(relAngle) < 0.18 && dist < bestDist) {
            bestDist = dist; bestEnemy = e;
          }
        });
        if (bestEnemy) {
          bestEnemy.hp--; bestEnemy.alert = true;
          if (bestEnemy.hp <= 0) {
            bestEnemy.alive = false; s.kills++; s.score += 100 * Math.ceil(bestDist / 2 + 1);
          }
        }
      }

      // Enemy AI
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        const dx = s.px - e.x, dy = s.py - e.y;
        const dist = Math.hypot(dx, dy);

        if (dist < 8) e.alert = true;
        if (!e.alert) return;

        e.moveTimer++;
        if (dist > 0.5 && e.moveTimer % 2 === 0) {
          const spd = 0.025;
          const nx = e.x + (dx / dist) * spd;
          const ny = e.y + (dy / dist) * spd;
          if (isWalkable(nx, e.y)) e.x = nx;
          if (isWalkable(e.x, ny)) e.y = ny;
        }

        // Enemy shooting
        e.shootTimer--;
        if (e.shootTimer <= 0 && dist < 6) {
          e.shootTimer = 80 + Math.random() * 40;
          if (s.hp > 0) {
            const dmg = 8 + Math.floor(Math.random() * 8);
            s.hp -= dmg; s.damageFlash = 1;
            if (s.hp <= 0) {
              s.hp = 0; s.gameOver = true;
              setUi({ hp: 0, ammo: s.ammo, score: s.score, kills: s.kills, gameOver: true, win: false });
            }
          }
        }
      });

      // Item pickup
      s.items.forEach((item) => {
        if (item.collected) return;
        if (Math.hypot(item.x - s.px, item.y - s.py) < 0.8) {
          item.collected = true;
          if (item.type === 'health') s.hp = Math.min(100, s.hp + 30);
          else s.ammo = Math.min(99, s.ammo + 15);
        }
      });

      // Win condition — reached exit tile
      if (MAP[Math.floor(s.py)][Math.floor(s.px)] === 9) {
        s.win = true;
        setUi({ hp: s.hp, ammo: s.ammo, score: s.score, kills: s.kills, gameOver: false, win: true });
        return;
      }

      setUi({ hp: s.hp, ammo: s.ammo, score: s.score, kills: s.kills, gameOver: false, win: false });
    }

    function render() {
      const s = stateRef.current;
      drawScene(s);
      drawHUD(s);

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#cc0000'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center';
        ctx.fillText('YOU DIED', W / 2, H / 2 - 24);
        ctx.fillStyle = '#fff'; ctx.font = '18px monospace';
        ctx.fillText(`Score: ${s.score}  Kills: ${s.kills}`, W / 2, H / 2 + 16);
        ctx.textAlign = 'left';
      }
      if (s.win) {
        ctx.fillStyle = 'rgba(0,0,0,0.82)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center';
        ctx.fillText('FLOOR CLEARED!', W / 2, H / 2 - 24);
        ctx.fillStyle = '#00cc44'; ctx.font = '18px monospace';
        ctx.fillText(`Score: ${s.score}  Kills: ${s.kills}`, W / 2, H / 2 + 16);
        ctx.textAlign = 'left';
      }
    }

    function loop() { update(); render(); rafRef.current = requestAnimationFrame(loop); }
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="bg-black flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="w-full max-w-full block"
        style={{ aspectRatio: `${W}/${H}`, imageRendering: 'pixelated' }}
        tabIndex={0}
      />
      <div className="px-4 py-2 text-white/30 text-xs text-center">
        WASD / Arrows = Move &amp; Turn &nbsp;|&nbsp; Q/E = Strafe &nbsp;|&nbsp; Space/Z = Shoot &nbsp;|&nbsp; Shift = Run &nbsp;|&nbsp; Reach the <span className="text-green-400">green exit</span>
      </div>
      {(ui.gameOver || ui.win) && (
        <div className="pb-4">
          <button onClick={resetGame} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-red-700 to-orange-600 text-white font-bold text-sm hover:opacity-90">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}