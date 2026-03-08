import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';
import GameAudio from './GameAudio';

const CANVAS_W = 800;
const CANVAS_H = 400;
const GRAVITY = 0.45;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -10;
const GROUND_Y = CANVAS_H - 60;
const BULLET_SPEED = 10;
const WORLD_W = 3000;

function createState() {
  return {
    player: {
      x: 60, y: GROUND_Y - 36, w: 28, h: 36,
      vx: 0, vy: 0, onGround: false, facing: 1,
      hp: 5, maxHp: 5, shootCooldown: 0, iframes: 0, frame: 0,
    },
    camera: { x: 0 },
    bullets: [],
    enemyBullets: [],
    enemies: [
      { x: 300, y: GROUND_Y - 32, w: 30, h: 32, hp: 2, alive: true, shootTimer: 90, facing: -1, type: 'soldier' },
      { x: 550, y: GROUND_Y - 32, w: 30, h: 32, hp: 2, alive: true, shootTimer: 110, facing: -1, type: 'soldier' },
      { x: 800, y: GROUND_Y - 32, w: 30, h: 32, hp: 2, alive: true, shootTimer: 70, facing: -1, type: 'soldier' },
      { x: 1050, y: GROUND_Y - 44, w: 44, h: 44, hp: 6, alive: true, shootTimer: 55, facing: -1, type: 'tank' },
      { x: 1350, y: GROUND_Y - 32, w: 30, h: 32, hp: 2, alive: true, shootTimer: 80, facing: -1, type: 'soldier' },
      { x: 1600, y: GROUND_Y - 32, w: 30, h: 32, hp: 2, alive: true, shootTimer: 60, facing: -1, type: 'soldier' },
      { x: 1800, y: GROUND_Y - 44, w: 44, h: 44, hp: 8, alive: true, shootTimer: 45, facing: -1, type: 'tank' },
      { x: 2100, y: GROUND_Y - 32, w: 30, h: 32, hp: 2, alive: true, shootTimer: 70, facing: -1, type: 'soldier' },
      { x: 2400, y: GROUND_Y - 60, w: 70, h: 60, hp: 20, alive: true, shootTimer: 35, facing: -1, type: 'boss' },
    ],
    platforms: [
      { x: 0, y: GROUND_Y, w: WORLD_W, h: 60 },
      { x: 400, y: GROUND_Y - 90, w: 100, h: 14 },
      { x: 700, y: GROUND_Y - 120, w: 80, h: 14 },
      { x: 1200, y: GROUND_Y - 80, w: 120, h: 14 },
      { x: 1500, y: GROUND_Y - 110, w: 90, h: 14 },
      { x: 1900, y: GROUND_Y - 90, w: 140, h: 14 },
      { x: 2200, y: GROUND_Y - 130, w: 100, h: 14 },
    ],
    score: 0,
    gameOver: false,
    win: false,
    frameCount: 0,
  };
}

export default function MetalSlugGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createState());
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [ui, setUi] = useState({ hp: 5, score: 0, gameOver: false, win: false });

  const resetGame = useCallback(() => {
    stateRef.current = createState();
    setUi({ hp: 5, score: 0, gameOver: false, win: false });
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
      // Metal Slug style - desert/war zone sunset
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.7);
      sky.addColorStop(0, '#1a2040');
      sky.addColorStop(0.4, '#8a3a10');
      sky.addColorStop(1, '#d06020');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H * 0.7);

      // Sun/Moon glow
      const sunGrad = ctx.createRadialGradient(CANVAS_W * 0.8, 70, 10, CANVAS_W * 0.8, 70, 80);
      sunGrad.addColorStop(0, 'rgba(255,220,80,0.9)');
      sunGrad.addColorStop(0.4, 'rgba(255,140,20,0.5)');
      sunGrad.addColorStop(1, 'rgba(255,80,20,0)');
      ctx.fillStyle = sunGrad;
      ctx.fillRect(0, 0, CANVAS_W, 200);
      ctx.fillStyle = '#ffd040';
      ctx.beginPath(); ctx.arc(CANVAS_W * 0.8, 70, 28, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffe870';
      ctx.beginPath(); ctx.arc(CANVAS_W * 0.8, 70, 20, 0, Math.PI * 2); ctx.fill();

      // Distant mountains - silhouette
      ctx.fillStyle = '#2a1808';
      [[0, 200, camX * 0.05], [300, 160, camX * 0.05], [600, 190, camX * 0.05], [900, 150, camX * 0.05]].forEach(([mx, mh, off]) => {
        const px = ((mx - off) % (CANVAS_W + 400) + CANVAS_W + 400) % (CANVAS_W + 400) - 100;
        ctx.beginPath(); ctx.moveTo(px, CANVAS_H * 0.65); ctx.lineTo(px + 120, mh); ctx.lineTo(px + 240, CANVAS_H * 0.65); ctx.fill();
      });

      // Destroyed buildings - war zone
      ctx.fillStyle = '#3a2010';
      [[50, 160, 55, 180, camX * 0.2], [200, 140, 70, 200, camX * 0.2], [450, 170, 45, 170, camX * 0.2], [700, 150, 60, 190, camX * 0.2]].forEach(([bx, by, bw, bh, off]) => {
        const rx = ((bx - off) % (CANVAS_W + 300) + CANVAS_W + 300) % (CANVAS_W + 300) - 120;
        // Jagged destroyed top
        ctx.fillRect(rx, by, bw, bh);
        // Rubble/damage
        ctx.fillStyle = '#2a1408';
        ctx.fillRect(rx + bw * 0.6, by - 15, bw * 0.4, 20);
        ctx.fillRect(rx, by - 8, bw * 0.3, 12);
        // Windows - some dark, some lit
        for (let wy = by + 15; wy < by + bh - 15; wy += 24) {
          for (let wx = rx + 8; wx < rx + bw - 8; wx += 18) {
            const lit = (Math.floor(wx / 18) + Math.floor(wy / 24)) % 3 !== 0;
            ctx.fillStyle = lit ? 'rgba(255,180,50,0.6)' : '#1a0a04';
            ctx.fillRect(wx, wy, 10, 14);
          }
        }
        ctx.fillStyle = '#3a2010';
      });

      // Mid-ground - sand dunes
      ctx.fillStyle = '#a07040';
      ctx.fillRect(0, CANVAS_H * 0.65, CANVAS_W, CANVAS_H * 0.35);
      ctx.fillStyle = '#c09060';
      ctx.fillRect(0, CANVAS_H * 0.65, CANVAS_W, 8);

      // Ground surface - NES-style dirt/asphalt
      ctx.fillStyle = '#785030';
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);
      // Ground line
      ctx.fillStyle = '#c8a060';
      ctx.fillRect(0, GROUND_Y, CANVAS_W, 6);
      // Cracks/rubble on ground
      ctx.fillStyle = '#604020';
      for (let cx2 = -camX % 60; cx2 < CANVAS_W; cx2 += 60) {
        ctx.fillRect(cx2, GROUND_Y + 8, 25, 3);
        ctx.fillRect(cx2 + 30, GROUND_Y + 15, 15, 2);
      }

      // Debris/rocks on ground
      ctx.fillStyle = '#8a6040';
      for (let rx2 = -camX % 180; rx2 < CANVAS_W + 40; rx2 += 180) {
        ctx.fillRect(rx2, GROUND_Y - 4, 12, 8);
        ctx.fillRect(rx2 + 80, GROUND_Y - 3, 8, 6);
      }
    }

    function drawPlatforms(platforms, camX) {
      platforms.forEach((p) => {
        const px = p.x - camX;
        if (px + p.w < 0 || px > CANVAS_W) return;
        if (p.h >= 50) {
          // Ground handled in drawBg, skip
          return;
        }
        // Steel/concrete platform - Metal Slug style
        ctx.fillStyle = '#5a5040';
        ctx.fillRect(px, p.y, p.w, p.h);
        // Concrete texture
        ctx.fillStyle = '#6a6050';
        ctx.fillRect(px + 2, p.y + 2, p.w - 4, p.h - 4);
        // Top edge - metal highlight
        ctx.fillStyle = '#b0a080';
        ctx.fillRect(px, p.y, p.w, 3);
        // Rivet details
        ctx.fillStyle = '#888070';
        for (let rx2 = px + 8; rx2 < px + p.w - 4; rx2 += 20) {
          ctx.beginPath(); ctx.arc(rx2, p.y + p.h / 2, 3, 0, Math.PI * 2); ctx.fill();
        }
        // Bottom shadow
        ctx.fillStyle = '#2a2010';
        ctx.fillRect(px, p.y + p.h - 2, p.w, 2);
      });
    }

    function drawPlayer(p, camX, frame) {
      const px = p.x - camX;
      if (p.iframes > 0 && Math.floor(p.iframes / 4) % 2 === 0) return;
      const legOff = p.onGround ? Math.sin(frame * 0.28) * 4 : 0;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(px + p.w / 2, p.y + p.h + 2, 12, 4, 0, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      if (p.facing < 0) { ctx.translate(px + p.w, p.y + p.h / 2); ctx.scale(-1, 1); ctx.translate(-(px + p.w), -(p.y + p.h / 2)); }

      // Boots
      ctx.fillStyle = '#2a2010';
      ctx.fillRect(px + 1, p.y + p.h - 8 + legOff, 12, 8);
      ctx.fillRect(px + p.w - 13, p.y + p.h - 8 - legOff, 12, 8);

      // Legs - camo pants
      ctx.fillStyle = '#4a5a30';
      ctx.fillRect(px + 3, p.y + 24, 10, 12 + legOff);
      ctx.fillRect(px + p.w - 13, p.y + 24, 10, 12 - legOff);
      // Camo spots
      ctx.fillStyle = '#3a4820';
      ctx.fillRect(px + 5, p.y + 26, 4, 3);
      ctx.fillRect(px + p.w - 10, p.y + 28, 3, 3);

      // Body/jacket - army green
      ctx.fillStyle = '#4a6838';
      ctx.fillRect(px + 2, p.y + 16, p.w - 4, 12);
      // Jacket highlight
      ctx.fillStyle = '#5a7848';
      ctx.fillRect(px + 3, p.y + 17, 5, 9);
      // Chest strap
      ctx.fillStyle = '#8a7050';
      ctx.fillRect(px + 8, p.y + 18, 2, 10);

      // Gun arm
      ctx.fillStyle = '#4a6838';
      ctx.fillRect(px + p.w - 1, p.y + 16, 5, 8);
      // Gun - detailed Sega style
      ctx.fillStyle = '#2a2a2a';
      ctx.fillRect(px + p.w + 2, p.y + 14, 14, 7);
      ctx.fillStyle = '#404040';
      ctx.fillRect(px + p.w + 3, p.y + 15, 10, 4);
      // Barrel
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(px + p.w + 12, p.y + 16, 6, 3);
      // Muzzle flash (if shooting indicated by cooldown)
      if (p.shootCooldown > 8) {
        ctx.fillStyle = '#ffcc00';
        ctx.beginPath(); ctx.arc(px + p.w + 20, p.y + 17, 5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6600';
        ctx.beginPath(); ctx.arc(px + p.w + 20, p.y + 17, 3, 0, Math.PI * 2); ctx.fill();
      }

      // Other arm
      ctx.fillStyle = '#4a6838';
      ctx.fillRect(px - 3, p.y + 18, 6, 8);

      // Head - helmet
      ctx.fillStyle = '#2a4a20';
      ctx.fillRect(px + 4, p.y + 2, p.w - 8, 12);
      ctx.fillRect(px + 3, p.y + 8, p.w - 6, 6);
      // Helmet rim
      ctx.fillStyle = '#1a3010';
      ctx.fillRect(px + 2, p.y + 12, p.w - 4, 3);
      // Visor/goggles
      ctx.fillStyle = '#20304a';
      ctx.fillRect(px + 5, p.y + 4, p.w - 10, 6);
      ctx.fillStyle = '#304050';
      ctx.fillRect(px + 6, p.y + 5, 6, 3);
      // Face
      ctx.fillStyle = '#d8b070';
      ctx.fillRect(px + 5, p.y + 14, p.w - 10, 6);
      // Eye (visible below visor)
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(px + 10, p.y + 15, 4, 4);

      ctx.restore();
    }

    function drawEnemy(e, camX, frame) {
      if (!e.alive) return;
      const ex = e.x - camX;
      if (ex + e.w < -20 || ex > CANVAS_W + 20) return;
      const legOff = Math.sin(frame * 0.22) * 2;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(ex + e.w / 2, e.y + e.h + 2, e.w / 2 - 2, 3, 0, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      if (e.facing > 0) { ctx.translate(ex + e.w, e.y + e.h / 2); ctx.scale(-1, 1); ctx.translate(-(ex + e.w), -(e.y + e.h / 2)); }

      if (e.type === 'tank') {
        // Metal Slug tank - chunky pixel art
        // Treads
        ctx.fillStyle = '#2a2010';
        ctx.fillRect(ex - 2, e.y + e.h - 14, e.w + 4, 14);
        // Tread detail
        ctx.fillStyle = '#4a3820';
        for (let tx2 = ex; tx2 < ex + e.w; tx2 += 10) ctx.fillRect(tx2, e.y + e.h - 12, 8, 10);
        // Tread highlight
        ctx.fillStyle = '#6a5830';
        ctx.fillRect(ex - 2, e.y + e.h - 14, e.w + 4, 3);

        // Hull body
        ctx.fillStyle = '#7a6830';
        ctx.fillRect(ex + 2, e.y + 14, e.w - 4, e.h - 24);
        // Hull highlight
        ctx.fillStyle = '#9a8848';
        ctx.fillRect(ex + 4, e.y + 16, e.w - 12, 8);

        // Turret
        ctx.fillStyle = '#8a7838';
        ctx.beginPath(); ctx.arc(ex + e.w / 2, e.y + 16, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#a09050';
        ctx.beginPath(); ctx.arc(ex + e.w / 2 - 2, e.y + 14, 14, Math.PI, 0); ctx.fill();

        // Barrel
        ctx.fillStyle = '#4a4030';
        ctx.fillRect(ex + e.w - 4, e.y + 10, 24, 8);
        ctx.fillStyle = '#2a2010';
        ctx.fillRect(ex + e.w + 14, e.y + 12, 8, 4);

        // Hatch
        ctx.fillStyle = '#5a5030';
        ctx.beginPath(); ctx.arc(ex + e.w / 2, e.y + 8, 6, 0, Math.PI * 2); ctx.fill();

        // HP bar
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(ex, e.y - 12, e.w, 8);
        ctx.fillStyle = '#cc4400'; ctx.fillRect(ex + 1, e.y - 11, (e.w - 2) * (e.hp / 6), 6);
        ctx.fillStyle = '#ff6600'; ctx.fillRect(ex + 1, e.y - 11, (e.w - 2) * (e.hp / 6) * 0.5, 3);

      } else if (e.type === 'boss') {
        // Giant mech boss - Metal Slug boss style
        // Legs/base
        ctx.fillStyle = '#4a2010';
        ctx.fillRect(ex + 5, e.y + e.h - 20, 18, 20);
        ctx.fillRect(ex + e.w - 23, e.y + e.h - 20, 18, 20);
        // Leg details
        ctx.fillStyle = '#6a3010';
        ctx.fillRect(ex + 6, e.y + e.h - 18, 14, 4);
        ctx.fillRect(ex + e.w - 22, e.y + e.h - 18, 14, 4);

        // Main body
        ctx.fillStyle = '#8B2000';
        ctx.fillRect(ex + 2, e.y + 15, e.w - 4, e.h - 30);
        ctx.fillStyle = '#aa3010';
        ctx.fillRect(ex + 4, e.y + 17, e.w - 12, e.h - 38);

        // Shoulder cannons
        ctx.fillStyle = '#3a3a3a';
        ctx.fillRect(ex - 12, e.y + 18, 16, 30);
        ctx.fillRect(ex + e.w - 4, e.y + 18, 16, 30);
        ctx.fillStyle = '#222'; ctx.fillRect(ex - 14, e.y + 26, 4, 14);
        ctx.fillStyle = '#222'; ctx.fillRect(ex + e.w + 10, e.y + 26, 4, 14);

        // Head
        ctx.fillStyle = '#5a1000';
        ctx.fillRect(ex + 12, e.y, e.w - 24, 18);
        // Visor
        ctx.fillStyle = '#ff2200';
        ctx.fillRect(ex + 14, e.y + 4, e.w - 28, 8);
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(ex + 14, e.y + 4, (e.w - 28) * 0.5, 4);
        // Eye slots
        ctx.fillStyle = '#ff0000';
        for (let i = 0; i < 3; i++) {
          ctx.beginPath(); ctx.arc(ex + 20 + i * 10, e.y + 8, 3, 0, Math.PI * 2); ctx.fill();
        }

        // HP bar
        ctx.fillStyle = '#1a1a1a'; ctx.fillRect(ex - 2, e.y - 14, e.w + 4, 10);
        ctx.fillStyle = '#dd0000'; ctx.fillRect(ex, e.y - 13, (e.w) * (e.hp / 20), 8);
        ctx.fillStyle = '#ff3300'; ctx.fillRect(ex, e.y - 13, (e.w) * (e.hp / 20) * 0.4, 4);

      } else {
        // Enemy soldier - detailed pixel art
        // Boots
        ctx.fillStyle = '#1a1408';
        ctx.fillRect(ex + 2, e.y + e.h - 8 + legOff, 11, 8);
        ctx.fillRect(ex + e.w - 13, e.y + e.h - 8 - legOff, 11, 8);
        // Legs
        ctx.fillStyle = '#4a3020';
        ctx.fillRect(ex + 3, e.y + 22, 10, 12 + legOff);
        ctx.fillRect(ex + e.w - 13, e.y + 22, 10, 12 - legOff);
        // Body - enemy uniform (dark red)
        ctx.fillStyle = '#6a1810';
        ctx.fillRect(ex + 3, e.y + 13, e.w - 6, 12);
        ctx.fillStyle = '#4a1008';
        ctx.fillRect(ex + 4, e.y + 14, 5, 9);
        // Gun
        ctx.fillStyle = '#2a2a2a';
        ctx.fillRect(ex + e.w - 2, e.y + 17, 16, 5);
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(ex + e.w + 10, e.y + 18, 5, 3);
        // Arm
        ctx.fillStyle = '#6a1810';
        ctx.fillRect(ex + e.w - 2, e.y + 15, 5, 8);
        // Helmet - enemy style
        ctx.fillStyle = '#4a2808';
        ctx.fillRect(ex + 4, e.y + 2, e.w - 8, 10);
        ctx.fillRect(ex + 3, e.y + 8, e.w - 6, 5);
        ctx.fillStyle = '#3a1a04';
        ctx.fillRect(ex + 2, e.y + 11, e.w - 4, 3);
        // Face
        ctx.fillStyle = '#c89060';
        ctx.fillRect(ex + 5, e.y + 12, e.w - 10, 8);
        // Eye
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(ex + 8, e.y + 14, 4, 4);
      }
      ctx.restore();
    }

    function drawBullets(bullets, enemyBullets, camX) {
      // Player bullets - golden shell casings
      bullets.forEach((b) => {
        const bx = b.x - camX;
        if (bx < -10 || bx > CANVAS_W + 10) return;
        // Bullet trail
        ctx.fillStyle = 'rgba(255,150,0,0.4)';
        ctx.beginPath(); ctx.ellipse(bx - b.vx * 1.5, b.y, 10, 3, 0, 0, Math.PI * 2); ctx.fill();
        // Main bullet
        ctx.fillStyle = '#ffee00';
        ctx.beginPath(); ctx.ellipse(bx, b.y, 9, 4, 0, 0, Math.PI * 2); ctx.fill();
        // Highlight
        ctx.fillStyle = '#ffffc0';
        ctx.beginPath(); ctx.ellipse(bx - 2, b.y - 1, 5, 2, 0, 0, Math.PI * 2); ctx.fill();
      });
      // Enemy bullets - red
      enemyBullets.forEach((b) => {
        const bx = b.x - camX;
        if (bx < -10 || bx > CANVAS_W + 10) return;
        // Trail
        ctx.fillStyle = 'rgba(255,40,0,0.35)';
        ctx.beginPath(); ctx.ellipse(bx - b.vx * 1.2, b.y, 8, 3, 0, 0, Math.PI * 2); ctx.fill();
        // Bullet
        ctx.fillStyle = '#ff4040';
        ctx.beginPath(); ctx.ellipse(bx, b.y, 8, 4, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff9090';
        ctx.beginPath(); ctx.ellipse(bx - 1, b.y - 1, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      });
    }

    function drawHUD(s) {
      ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(0, 0, CANVAS_W, 36);
      for (let i = 0; i < s.player.maxHp; i++) {
        ctx.fillStyle = i < s.player.hp ? '#e53935' : '#555';
        ctx.font = '16px sans-serif';
        ctx.fillText('♥', 10 + i * 22, 24);
      }
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 13px monospace';
      ctx.fillText(`SCORE: ${s.score}`, 200, 24);
      ctx.fillStyle = '#fff';
      const alive = s.enemies.filter(e => e.alive).length;
      ctx.fillText(`ENEMIES: ${alive}`, 480, 24);
    }

    function update() {
      const s = stateRef.current;
      if (s.gameOver || s.win) return;
      const keys = keysRef.current;
      const { player } = s;
      s.frameCount++;

      if (player.iframes > 0) player.iframes--;
      if (player.shootCooldown > 0) player.shootCooldown--;
      player.frame = s.frameCount;

      const left = keys['ArrowLeft'] || keys['KeyA'];
      const right = keys['ArrowRight'] || keys['KeyD'];
      const jump = keys['ArrowUp'] || keys['KeyW'] || keys['Space'];
      const shoot = keys['KeyZ'] || keys['KeyX'];

      if (left) { player.vx = -PLAYER_SPEED; player.facing = -1; }
      else if (right) { player.vx = PLAYER_SPEED; player.facing = 1; }
      else { player.vx *= 0.8; }

      if (jump && player.onGround) { player.vy = JUMP_FORCE; player.onGround = false; GameAudio.jump(); }
      if (shoot && player.shootCooldown === 0) {
        player.shootCooldown = 12;
        GameAudio.shoot();
        s.bullets.push({ x: player.x + player.w / 2, y: player.y + 18, vx: BULLET_SPEED * player.facing, age: 0 });
      }

      player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;
      if (player.x < 0) { player.x = 0; player.vx = 0; }

      player.onGround = false;
      for (const p of s.platforms) {
        if (player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h > p.y && player.y + player.h < p.y + p.h + 12 && player.vy >= 0) {
          player.y = p.y - player.h; player.vy = 0; player.onGround = true;
        }
      }

      if (player.y > CANVAS_H + 50) {
        s.gameOver = true;
        setUi({ hp: 0, score: s.score, gameOver: true, win: false });
        return;
      }

      // Bullets
      s.bullets = s.bullets.filter(b => {
        b.x += b.vx; b.age++;
        if (b.age > 70) return false;
        let hit = false;
        s.enemies.forEach((e) => {
          if (!e.alive || hit) return;
          if (b.x > e.x && b.x < e.x + e.w && b.y > e.y && b.y < e.y + e.h) {
            e.hp--; hit = true;
            if (e.hp <= 0) { e.alive = false; s.score += e.type === 'boss' ? 1000 : e.type === 'tank' ? 300 : 100; GameAudio.stomp(); }
          }
        });
        return !hit;
      });

      // Enemy AI and shooting
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        const dx = player.x - e.x;
        e.facing = dx > 0 ? 1 : -1;
        e.shootTimer--;
        if (e.shootTimer <= 0) {
          e.shootTimer = e.type === 'boss' ? 35 : e.type === 'tank' ? 50 : 75;
          const bvx = e.facing * (e.type === 'boss' ? 7 : 6);
          s.enemyBullets.push({ x: e.x + e.w / 2, y: e.y + e.h * 0.4, vx: bvx, age: 0 });
          if (e.type === 'boss') s.enemyBullets.push({ x: e.x + e.w / 2, y: e.y + e.h * 0.6, vx: bvx, age: 0 });
        }
      });

      s.enemyBullets = s.enemyBullets.filter(b => {
        b.x += b.vx; b.age++;
        if (b.age > 80) return false;
        if (player.iframes === 0 && b.x > player.x && b.x < player.x + player.w && b.y > player.y && b.y < player.y + player.h) {
          player.hp--; player.iframes = 80; GameAudio.hit();
          if (player.hp <= 0) { s.gameOver = true; GameAudio.gameOver(); setUi({ hp: 0, score: s.score, gameOver: true, win: false }); }
          return false;
        }
        return true;
      });

      // Camera
      const targetCamX = player.x - CANVAS_W * 0.35;
      s.camera.x += (targetCamX - s.camera.x) * 0.1;
      s.camera.x = Math.max(0, Math.min(s.camera.x, WORLD_W - CANVAS_W));

      if (s.enemies.every(e => !e.alive)) {
        s.win = true; GameAudio.win(); setUi({ hp: player.hp, score: s.score, gameOver: false, win: true }); return;
      }
      setUi({ hp: player.hp, score: s.score, gameOver: false, win: false });
    }

    function render() {
      const s = stateRef.current;
      const camX = s.camera.x;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBg(camX);
      drawPlatforms(s.platforms, camX);
      drawBullets(s.bullets, s.enemyBullets, camX);
      s.enemies.forEach(e => drawEnemy(e, camX, s.frameCount));
      drawPlayer(s.player, camX, s.frameCount);
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
        ctx.fillText('MISSION COMPLETE!', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = '#fff'; ctx.font = '18px monospace';
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
        <GameMobileControls keysRef={keysRef} variant="shooter" />
      </div>
      {(ui.gameOver || ui.win) && (
        <div className="p-4">
          <button onClick={resetGame} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-yellow-600 to-amber-500 text-white font-bold text-sm hover:opacity-90">
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}