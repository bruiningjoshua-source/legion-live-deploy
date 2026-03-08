import React, { useEffect, useRef, useState, useCallback } from 'react';

// ─── Quake-style arena FPS ────────────────────────────────────────────────────
// Full DDA raycaster with arena map, rocket launcher, quad damage, armour
const W = 640, H = 400;
const FOV = Math.PI / 2.6;
const HALF_FOV = FOV / 2;
const RAYS = W;
const MAX_D = 20;
const MOVE = 0.07;
const ROT = 0.05;

const MAP_W = 20, MAP_H = 20;
// 0=open 1=metal 2=brick 3=tech 4=blood 9=exit
const MAP = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,2,2,2,0,0,0,0,0,0,0,3,3,3,3,0,0,0,1],
  [1,0,2,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,1],
  [1,0,2,0,2,0,0,0,0,0,0,0,3,0,3,3,0,0,0,1],
  [1,0,0,0,0,0,1,1,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,1,0,4,4,4,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,4,0,4,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,1],
  [1,1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,1,0,0,0,0,0,0,0,0,0,2,2,2,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,2,0,0,1],
  [1,0,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,3,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,4,4,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
];

const WALL_BASE  = ['','#4a4a5a','#6b3020','#1a4a3a','#5a1010','#00aa55'];
const WALL_SHADE = ['','#2a2a3a','#3a1a10','#0a2a1a','#3a0808','#007733'];

function createState() {
  return {
    px: 1.5, py: 1.5,
    angle: 0,
    hp: 100, maxHp: 100,
    armour: 50, maxArmour: 100,
    rockets: 10, score: 0, kills: 0,
    shootTimer: 0, shooting: false,
    quadTimer: 0,
    damageFlash: 0,
    frameCount: 0,
    gameOver: false, win: false,
    enemies: [
      { x: 4.5, y: 3.5, hp: 3, alive: true, alert: false, shootTimer: 100, moveTimer: 0, type: 'grunt' },
      { x: 10.5, y: 2.5, hp: 3, alive: true, alert: false, shootTimer: 90, moveTimer: 0, type: 'grunt' },
      { x: 6.5, y: 7.5, hp: 5, alive: true, alert: false, shootTimer: 70, moveTimer: 0, type: 'ogre' },
      { x: 15.5, y: 4.5, hp: 3, alive: true, alert: false, shootTimer: 85, moveTimer: 0, type: 'grunt' },
      { x: 11.5, y: 9.5, hp: 3, alive: true, alert: false, shootTimer: 95, moveTimer: 0, type: 'grunt' },
      { x: 3.5, y: 13.5, hp: 5, alive: true, alert: false, shootTimer: 65, moveTimer: 0, type: 'ogre' },
      { x: 8.5, y: 15.5, hp: 3, alive: true, alert: false, shootTimer: 80, moveTimer: 0, type: 'grunt' },
      { x: 14.5, y: 11.5, hp: 8, alive: true, alert: false, shootTimer: 55, moveTimer: 0, type: 'shambler' },
      { x: 17.5, y: 16.5, hp: 3, alive: true, alert: false, shootTimer: 90, moveTimer: 0, type: 'grunt' },
      { x: 5.5, y: 17.5, hp: 12, alive: true, alert: false, shootTimer: 45, moveTimer: 0, type: 'shambler' },
    ],
    items: [
      { x: 3.5, y: 6.5, type: 'rockets', collected: false },
      { x: 9.5, y: 5.5, type: 'health', collected: false },
      { x: 7.5, y: 12.5, type: 'armour', collected: false },
      { x: 16.5, y: 8.5, type: 'rockets', collected: false },
      { x: 12.5, y: 16.5, type: 'quad', collected: false },
      { x: 2.5, y: 16.5, type: 'health', collected: false },
      { x: 17.5, y: 3.5, type: 'armour', collected: false },
    ],
    projectiles: [],
  };
}

function isWalkable(x, y) {
  const mx = Math.floor(x), my = Math.floor(y);
  if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return false;
  return MAP[my][mx] === 0 || MAP[my][mx] === 9;
}

function castRay(px, py, angle) {
  const cosA = Math.cos(angle), sinA = Math.sin(angle);
  const dx = cosA > 0 ? 1 : -1, dy = sinA > 0 ? 1 : -1;
  let stepX = (cosA > 0 ? Math.ceil(px) - px : px - Math.floor(px)) / Math.abs(cosA);
  let stepY = (sinA > 0 ? Math.ceil(py) - py : py - Math.floor(py)) / Math.abs(sinA);
  const dX = 1 / Math.abs(cosA), dY = 1 / Math.abs(sinA);
  let x = px, y = py, side = 0, wallType = 1;

  for (let i = 0; i < MAX_D * 2; i++) {
    if (stepX < stepY) { x += dx; stepX += dX; side = 0; }
    else { y += dy; stepY += dY; side = 1; }
    const mx = Math.floor(x), my = Math.floor(y);
    if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) break;
    const c = MAP[my][mx];
    if (c > 0) {
      wallType = c === 9 ? 5 : c;
      const dist = side === 0
        ? (x - px - (dx < 0 ? 1 : 0)) / cosA
        : (y - py - (dy < 0 ? 1 : 0)) / sinA;
      return { dist: Math.max(0, dist), wallType, side };
    }
  }
  return { dist: MAX_D, wallType: 1, side: 0 };
}

export default function QuakeGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createState());
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [ui, setUi] = useState({ hp: 100, armour: 50, rockets: 10, score: 0, kills: 0, quad: 0, gameOver: false, win: false });

  const resetGame = useCallback(() => {
    stateRef.current = createState();
    setUi({ hp: 100, armour: 50, rockets: 10, score: 0, kills: 0, quad: 0, gameOver: false, win: false });
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
      const cg = ctx.createLinearGradient(0, 0, 0, H / 2);
      cg.addColorStop(0, '#0a0a12');
      cg.addColorStop(1, '#1a1a2a');
      ctx.fillStyle = cg;
      ctx.fillRect(0, 0, W, H / 2);

      // Floor
      const fg = ctx.createLinearGradient(0, H / 2, 0, H);
      fg.addColorStop(0, '#1a1008');
      fg.addColorStop(1, '#0a0800');
      ctx.fillStyle = fg;
      ctx.fillRect(0, H / 2, W, H / 2);

      const zBuf = new Float32Array(W);
      for (let col = 0; col < RAYS; col++) {
        const ray = s.angle - HALF_FOV + (col / RAYS) * FOV;
        const { dist, wallType, side } = castRay(s.px, s.py, ray);
        zBuf[col] = dist;
        const corr = dist * Math.cos(ray - s.angle);
        const wh = Math.min(H, H / (corr || 0.001));
        const top = (H - wh) / 2;
        const fog = Math.max(0, 1 - dist / MAX_D);
        const base = WALL_BASE[Math.min(wallType, WALL_BASE.length - 1)];
        const dark = WALL_SHADE[Math.min(wallType, WALL_SHADE.length - 1)];
        ctx.globalAlpha = Math.max(0.1, fog);
        ctx.fillStyle = side === 1 ? dark : base;
        ctx.fillRect(col, top, 1, wh);
        ctx.globalAlpha = 1;
      }

      // Sprites
      const sprites = [
        ...s.enemies.filter(e => e.alive).map(e => ({ ...e, sType: 'enemy' })),
        ...s.items.filter(i => !i.collected).map(i => ({ ...i, sType: 'item' })),
        ...s.projectiles.map(p => ({ ...p, sType: 'rocket' })),
      ].sort((a, b) => Math.hypot(b.x - s.px, b.y - s.py) - Math.hypot(a.x - s.px, a.y - s.py));

      sprites.forEach((sp) => {
        const dx = sp.x - s.px, dy = sp.y - s.py;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.3) return;
        let relA = Math.atan2(dy, dx) - s.angle;
        while (relA > Math.PI) relA -= 2 * Math.PI;
        while (relA < -Math.PI) relA += 2 * Math.PI;
        if (Math.abs(relA) > HALF_FOV + 0.15) return;

        const sx = (W / 2) + (relA / HALF_FOV) * (W / 2);
        const sh = Math.min(H * 1.3, H / (dist * 0.85 || 0.1));
        const sw = sh;
        const st = H / 2 - sh / 2;
        const s0 = Math.floor(sx - sw / 2);
        const s1 = Math.floor(sx + sw / 2);
        const fog = Math.max(0, 1 - dist / MAX_D);

        for (let col = s0; col <= s1; col++) {
          if (col < 0 || col >= W || zBuf[col] <= dist) continue;
          const tx = (col - s0) / (s1 - s0 + 1);
          ctx.globalAlpha = Math.max(0.15, fog);
          if (sp.sType === 'rocket') {
            ctx.fillStyle = '#ff8800';
            if (tx > 0.3 && tx < 0.7) ctx.fillRect(col, H / 2 - sh * 0.08, 1, sh * 0.16);
            ctx.fillStyle = '#ffff00';
            if (tx > 0.45 && tx < 0.55) ctx.fillRect(col, H / 2 - sh * 0.04, 1, sh * 0.08);
          } else if (sp.sType === 'item') {
            const iColor = sp.type === 'health' ? '#00ff44'
              : sp.type === 'armour' ? '#4488ff'
              : sp.type === 'rockets' ? '#ffaa00'
              : '#ff00ff'; // quad
            if (tx > 0.15 && tx < 0.85) {
              ctx.globalAlpha = (Math.max(0.3, fog)) * (0.6 + Math.abs(Math.sin(s.frameCount * 0.12)) * 0.4);
              ctx.fillStyle = iColor;
              ctx.fillRect(col, H / 2 - sh * 0.3, 1, sh * 0.6);
            }
          } else {
            // Enemy
            const ec = sp.type === 'shambler' ? '#880000' : sp.type === 'ogre' ? '#664400' : '#446600';
            const hc = sp.type === 'shambler' ? '#cc0000' : '#e8c870';
            if (tx > 0.1 && tx < 0.9) {
              ctx.fillStyle = ec; ctx.fillRect(col, st + sh * 0.25, 1, sh * 0.6);
            }
            if (tx > 0.28 && tx < 0.72) {
              ctx.fillStyle = hc; ctx.fillRect(col, st, 1, sh * 0.28);
            }
            if (tx > 0.35 && tx < 0.55) {
              ctx.fillStyle = '#000'; ctx.fillRect(col, st + sh * 0.06, 1, sh * 0.1);
            }
          }
          ctx.globalAlpha = 1;
        }
      });

      // Weapon — rocket launcher
      const qPulse = s.quadTimer > 0 ? Math.sin(s.frameCount * 0.3) * 3 : 0;
      const gx = W / 2 - 45, gy = H - 130 + qPulse;
      const wColor = s.quadTimer > 0 ? '#aa44ff' : '#555';
      ctx.fillStyle = wColor; ctx.fillRect(gx + 10, gy + 10, 60, 90);
      ctx.fillStyle = s.quadTimer > 0 ? '#cc66ff' : '#777'; ctx.fillRect(gx + 15, gy, 50, 20);
      ctx.fillStyle = '#333'; ctx.fillRect(gx + 28, gy - 20, 24, 24);
      ctx.fillStyle = '#222'; ctx.fillRect(gx + 32, gy - 30, 16, 14);
      // Rocket in barrel
      ctx.fillStyle = '#ff8800'; ctx.fillRect(gx + 36, gy - 22, 8, 8);
      ctx.fillStyle = '#c8a060'; ctx.fillRect(gx + 5, gy + 55, 28, 50); ctx.fillRect(gx + 47, gy + 55, 28, 50);

      if (s.shooting && s.shootTimer > 8) {
        ctx.fillStyle = 'rgba(255,120,0,0.9)';
        ctx.beginPath(); ctx.arc(W / 2, gy - 24, 22, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,220,100,0.9)';
        ctx.beginPath(); ctx.arc(W / 2, gy - 24, 10, 0, Math.PI * 2); ctx.fill();
      }

      // Quad aura
      if (s.quadTimer > 0) {
        ctx.fillStyle = `rgba(180,80,255,${0.07 + Math.abs(Math.sin(s.frameCount * 0.1)) * 0.06})`;
        ctx.fillRect(0, 0, W, H);
      }
      if (s.damageFlash > 0) {
        ctx.fillStyle = `rgba(220,20,20,${s.damageFlash * 0.45})`;
        ctx.fillRect(0, 0, W, H);
      }
    }

    function drawHUD(s) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(0, H - 48, W, 48);

      // HP
      ctx.fillStyle = '#00cc44'; ctx.font = 'bold 13px monospace';
      ctx.fillText(`❤ ${s.hp}`, 12, H - 28);
      ctx.fillStyle = '#333'; ctx.fillRect(12, H - 22, 90, 6);
      ctx.fillStyle = s.hp > 50 ? '#00cc44' : s.hp > 25 ? '#ffaa00' : '#cc2200';
      ctx.fillRect(12, H - 22, 90 * (s.hp / 100), 6);
      // Armour
      ctx.fillStyle = '#4488ff'; ctx.fillText(`🛡 ${s.armour}`, 12, H - 10);
      ctx.fillStyle = '#333'; ctx.fillRect(12, H - 6, 90, 4);
      ctx.fillStyle = '#4488ff';
      ctx.fillRect(12, H - 6, 90 * (s.armour / 100), 4);

      // Rockets
      ctx.fillStyle = '#ffaa00'; ctx.font = 'bold 15px monospace';
      ctx.fillText(`🚀 ${s.rockets}`, W / 2 - 30, H - 18);

      if (s.quadTimer > 0) {
        ctx.fillStyle = '#cc66ff';
        ctx.fillText(`QUAD ${Math.ceil(s.quadTimer / 60)}s`, W / 2 - 30, H - 4);
      }

      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 13px monospace';
      ctx.fillText(`${s.score}`, W - 110, H - 28);
      ctx.fillStyle = '#fff'; ctx.font = '11px monospace';
      ctx.fillText(`KILLS: ${s.kills}`, W - 110, H - 12);

      // Crosshair
      const cx = W / 2, cy = H / 2;
      ctx.strokeStyle = s.quadTimer > 0 ? 'rgba(200,100,255,0.9)' : 'rgba(255,100,0,0.85)';
      ctx.lineWidth = 1.5;
      [[cx - 12, cy, cx - 5, cy], [cx + 5, cy, cx + 12, cy], [cx, cy - 12, cx, cy - 5], [cx, cy + 5, cx, cy + 12]].forEach(([x1, y1, x2, y2]) => {
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      });

      // Minimap
      const mmX = W - 105, mmY = 8, mmS = 5;
      ctx.fillStyle = 'rgba(0,0,0,0.75)';
      ctx.fillRect(mmX - 2, mmY - 2, MAP_W * mmS + 4, MAP_H * mmS + 4);
      for (let my = 0; my < MAP_H; my++) {
        for (let mx = 0; mx < MAP_W; mx++) {
          ctx.fillStyle = MAP[my][mx] > 0 ? (MAP[my][mx] === 9 ? '#00ff88' : '#555') : '#1a1a2e';
          ctx.fillRect(mmX + mx * mmS, mmY + my * mmS, mmS - 1, mmS - 1);
        }
      }
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(mmX + s.px * mmS - 2, mmY + s.py * mmS - 2, 4, 4);
      ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(mmX + s.px * mmS, mmY + s.py * mmS);
      ctx.lineTo(mmX + (s.px + Math.cos(s.angle) * 1.8) * mmS, mmY + (s.py + Math.sin(s.angle) * 1.8) * mmS);
      ctx.stroke();
      s.enemies.forEach(e => {
        if (!e.alive) return;
        ctx.fillStyle = e.type === 'shambler' ? '#ff0000' : '#cc4400';
        ctx.fillRect(mmX + e.x * mmS - 2, mmY + e.y * mmS - 2, 4, 4);
      });
    }

    function update() {
      const s = stateRef.current;
      if (s.gameOver || s.win) return;
      const keys = keysRef.current;
      s.frameCount++;

      if (s.shootTimer > 0) s.shootTimer--;
      if (s.damageFlash > 0) s.damageFlash = Math.max(0, s.damageFlash - 0.05);
      if (s.quadTimer > 0) s.quadTimer--;

      const spd = MOVE * (keys['ShiftLeft'] ? 1.7 : 1);
      if (keys['ArrowUp'] || keys['KeyW']) {
        const nx = s.px + Math.cos(s.angle) * spd, ny = s.py + Math.sin(s.angle) * spd;
        if (isWalkable(nx, s.py)) s.px = nx;
        if (isWalkable(s.px, ny)) s.py = ny;
      }
      if (keys['ArrowDown'] || keys['KeyS']) {
        const nx = s.px - Math.cos(s.angle) * spd, ny = s.py - Math.sin(s.angle) * spd;
        if (isWalkable(nx, s.py)) s.px = nx;
        if (isWalkable(s.px, ny)) s.py = ny;
      }
      if (keys['ArrowLeft'] || keys['KeyA']) s.angle -= ROT;
      if (keys['ArrowRight'] || keys['KeyD']) s.angle += ROT;
      if (keys['KeyQ']) {
        const nx = s.px - Math.sin(s.angle) * spd, ny = s.py + Math.cos(s.angle) * spd;
        if (isWalkable(nx, s.py)) s.px = nx; if (isWalkable(s.px, ny)) s.py = ny;
      }
      if (keys['KeyE']) {
        const nx = s.px + Math.sin(s.angle) * spd, ny = s.py - Math.cos(s.angle) * spd;
        if (isWalkable(nx, s.py)) s.px = nx; if (isWalkable(s.px, ny)) s.py = ny;
      }

      // Shoot
      s.shooting = false;
      if ((keys['Space'] || keys['KeyZ']) && s.shootTimer === 0 && s.rockets > 0) {
        s.shooting = true; s.shootTimer = 20; s.rockets--;
        const dmgMult = s.quadTimer > 0 ? 4 : 1;
        // Rocket projectile
        s.projectiles.push({ x: s.px, y: s.py, vx: Math.cos(s.angle) * 0.2, vy: Math.sin(s.angle) * 0.2, ttl: 80, dmg: 3 * dmgMult });
      }

      // Update projectiles
      s.projectiles = s.projectiles.filter((p) => {
        p.x += p.vx; p.y += p.vy; p.ttl--;
        if (p.ttl <= 0 || !isWalkable(p.x, p.y)) return false;
        // Splash damage
        let hit = false;
        s.enemies.forEach((e) => {
          if (!e.alive) return;
          if (Math.hypot(e.x - p.x, e.y - p.y) < 0.9) {
            e.hp -= p.dmg; e.alert = true;
            if (e.hp <= 0) { e.alive = false; s.kills++; s.score += e.type === 'shambler' ? 500 : e.type === 'ogre' ? 250 : 100; }
            hit = true;
          }
        });
        return !hit;
      });

      // Enemy AI
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        const dx = s.px - e.x, dy = s.py - e.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 10) e.alert = true;
        if (!e.alert) return;

        e.moveTimer++;
        if (dist > 0.5 && e.moveTimer % 2 === 0) {
          const spd = e.type === 'shambler' ? 0.03 : 0.022;
          const nx = e.x + (dx / dist) * spd;
          const ny = e.y + (dy / dist) * spd;
          if (isWalkable(nx, e.y)) e.x = nx;
          if (isWalkable(e.x, ny)) e.y = ny;
        }

        e.shootTimer--;
        if (e.shootTimer <= 0 && dist < 8) {
          const base = e.type === 'shambler' ? 55 : e.type === 'ogre' ? 70 : 90;
          e.shootTimer = base + Math.random() * 30;
          const dmg = e.type === 'shambler' ? 15 : e.type === 'ogre' ? 10 : 6;
          let d = dmg;
          if (s.armour > 0) {
            const ab = Math.min(s.armour, Math.floor(d * 0.6));
            s.armour -= ab; d -= ab;
          }
          s.hp -= d; s.damageFlash = 1;
          if (s.hp <= 0) {
            s.hp = 0; s.gameOver = true;
            setUi({ hp: 0, armour: s.armour, rockets: s.rockets, score: s.score, kills: s.kills, quad: 0, gameOver: true, win: false });
          }
        }
      });

      // Items
      s.items.forEach((item) => {
        if (item.collected || Math.hypot(item.x - s.px, item.y - s.py) >= 0.9) return;
        item.collected = true;
        if (item.type === 'health') s.hp = Math.min(100, s.hp + 35);
        else if (item.type === 'armour') s.armour = Math.min(100, s.armour + 40);
        else if (item.type === 'rockets') s.rockets = Math.min(25, s.rockets + 8);
        else if (item.type === 'quad') { s.quadTimer = 600; s.score += 50; }
      });

      // Win
      if (MAP[Math.floor(s.py)][Math.floor(s.px)] === 9) {
        s.win = true;
        setUi({ hp: s.hp, armour: s.armour, rockets: s.rockets, score: s.score, kills: s.kills, quad: s.quadTimer, gameOver: false, win: true });
        return;
      }

      setUi({ hp: s.hp, armour: s.armour, rockets: s.rockets, score: s.score, kills: s.kills, quad: s.quadTimer, gameOver: false, win: false });
    }

    function render() {
      const s = stateRef.current;
      drawScene(s);
      drawHUD(s);

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#cc0000'; ctx.font = 'bold 46px monospace'; ctx.textAlign = 'center';
        ctx.fillText('FRAGGED', W / 2, H / 2 - 24);
        ctx.fillStyle = '#ff8800'; ctx.font = '18px monospace';
        ctx.fillText(`Score: ${s.score}  Kills: ${s.kills}`, W / 2, H / 2 + 16);
        ctx.textAlign = 'left';
      }
      if (s.win) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)'; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = '#ff8800'; ctx.font = 'bold 36px monospace'; ctx.textAlign = 'center';
        ctx.fillText('LEVEL COMPLETE!', W / 2, H / 2 - 24);
        ctx.fillStyle = '#ffd700'; ctx.font = '18px monospace';
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
        WASD / Arrows = Move &amp; Turn &nbsp;|&nbsp; Q/E = Strafe &nbsp;|&nbsp; Space/Z = Rocket &nbsp;|&nbsp; Shift = Run &nbsp;|&nbsp; 💜 = Quad Damage &nbsp;|&nbsp; Reach <span className="text-green-400">green exit</span>
      </div>
      {(ui.gameOver || ui.win) && (
        <div className="pb-4">
          <button onClick={resetGame} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-orange-700 to-red-600 text-white font-bold text-sm hover:opacity-90">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}