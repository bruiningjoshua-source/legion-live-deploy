import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';
import GameAudio from './GameAudio';

const CANVAS_W = 800;
const CANVAS_H = 400;
const GRAVITY = 0.5;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -11;
const GROUND_Y = CANVAS_H - 60;

function createInitialState() {
  return {
    player: { x: 80, y: GROUND_Y - 40, w: 32, h: 40, vx: 0, vy: 0, onGround: false, facingRight: true, frame: 0, invincible: 0 },
    camera: { x: 0 },
    score: 0,
    lives: 3,
    coins: 0,
    gameOver: false,
    win: false,
    frameCount: 0,
    platforms: [
      { x: 0, y: GROUND_Y, w: 900, h: 60 },
      { x: 300, y: GROUND_Y - 90, w: 80, h: 16 },
      { x: 450, y: GROUND_Y - 140, w: 80, h: 16 },
      { x: 600, y: GROUND_Y - 90, w: 120, h: 16 },
      { x: 800, y: GROUND_Y - 100, w: 80, h: 16 },
      { x: 950, y: GROUND_Y, w: 700, h: 60 },
      { x: 1100, y: GROUND_Y - 120, w: 100, h: 16 },
      { x: 1300, y: GROUND_Y - 80, w: 80, h: 16 },
      { x: 1500, y: GROUND_Y, w: 600, h: 60 },
      { x: 1600, y: GROUND_Y - 150, w: 100, h: 16 },
      { x: 1800, y: GROUND_Y - 60, w: 300, h: 16 },
    ],
    enemies: [
      { x: 400, y: GROUND_Y - 30, w: 30, h: 30, vx: -1.5, alive: true, type: 'goomba' },
      { x: 650, y: GROUND_Y - 30, w: 30, h: 30, vx: -1.5, alive: true, type: 'goomba' },
      { x: 1000, y: GROUND_Y - 30, w: 30, h: 30, vx: -1.2, alive: true, type: 'goomba' },
      { x: 1200, y: GROUND_Y - 30, w: 34, h: 34, vx: -2, alive: true, type: 'koopa' },
      { x: 1400, y: GROUND_Y - 30, w: 30, h: 30, vx: -1.5, alive: true, type: 'goomba' },
      { x: 1700, y: GROUND_Y - 30, w: 34, h: 34, vx: -2, alive: true, type: 'koopa' },
      { x: 1900, y: GROUND_Y - 90, w: 30, h: 30, vx: -1.5, alive: true, type: 'goomba' },
    ],
    coins_obj: [
      { x: 330, y: GROUND_Y - 130, collected: false },
      { x: 460, y: GROUND_Y - 180, collected: false },
      { x: 630, y: GROUND_Y - 130, collected: false },
      { x: 1120, y: GROUND_Y - 165, collected: false },
      { x: 1310, y: GROUND_Y - 120, collected: false },
      { x: 1620, y: GROUND_Y - 195, collected: false },
      { x: 1820, y: GROUND_Y - 100, collected: false },
      { x: 1860, y: GROUND_Y - 100, collected: false },
    ],
    flagX: 2050,
    worldW: 2200,
  };
}

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export default function MarioGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createInitialState());
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [ui, setUi] = useState({ score: 0, lives: 3, coins: 0, gameOver: false, win: false });

  const resetGame = useCallback(() => {
    stateRef.current = createInitialState();
    setUi({ score: 0, lives: 3, coins: 0, gameOver: false, win: false });
  }, []);

  useEffect(() => {
    const onKey = (e) => { keysRef.current[e.code] = e.type === 'keydown'; };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('keyup', onKey); };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function drawBackground(camX) {
      // Sky gradient - classic Nintendo blue
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      sky.addColorStop(0, '#5c94fc');
      sky.addColorStop(0.6, '#8bb8fc');
      sky.addColorStop(1, '#b8d8fc');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Clouds - Nintendo-style puffy pixel clouds
      const cloudPositions = [[180, 55], [480, 75], [820, 45], [1200, 65], [1550, 52]];
      cloudPositions.forEach(([bx, by]) => {
        const cx = ((bx - camX * 0.25) % (CANVAS_W + 300) + CANVAS_W + 300) % (CANVAS_W + 300) - 100;
        // Cloud shadow
        ctx.fillStyle = 'rgba(180,210,255,0.6)';
        ctx.fillRect(cx - 28, by + 18, 80, 12);
        // Main cloud body - pixel art chunky style
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 20, by + 8, 64, 20);
        ctx.fillRect(cx - 8, by, 42, 12);
        ctx.fillRect(cx + 4, by - 8, 24, 12);
        // Highlight
        ctx.fillStyle = '#e8f4ff';
        ctx.fillRect(cx - 16, by + 10, 20, 6);
      });

      // Hills - NES style rounded bumps with lighter top
      const hillData = [[120, 110, camX * 0.45], [480, 130, camX * 0.45], [900, 95, camX * 0.45], [1300, 120, camX * 0.45]];
      hillData.forEach(([hx, hr, offset]) => {
        const cx = ((hx - offset) % (CANVAS_W + 300) + CANVAS_W + 300) % (CANVAS_W + 300) - 100;
        const hy = GROUND_Y;
        ctx.fillStyle = '#5ea832';
        ctx.beginPath(); ctx.arc(cx, hy, hr, Math.PI, 0); ctx.fill();
        // Hill highlight
        ctx.fillStyle = '#78c844';
        ctx.beginPath(); ctx.arc(cx - hr * 0.2, hy - hr * 0.55, hr * 0.4, Math.PI, 0); ctx.fill();
        // Dots on hills (NES detail)
        ctx.fillStyle = '#4a9228';
        ctx.fillRect(cx + 10, hy - hr + 10, 6, 6);
        ctx.fillRect(cx - 20, hy - hr + 25, 6, 6);
      });

      // Distant mountains
      ctx.fillStyle = '#7ba8e0';
      [[700, camX * 0.1], [1100, camX * 0.1]].forEach(([mx, off]) => {
        const px = ((mx - off) % (CANVAS_W + 400) + CANVAS_W + 400) % (CANVAS_W + 400) - 150;
        ctx.beginPath(); ctx.moveTo(px - 60, GROUND_Y); ctx.lineTo(px, GROUND_Y - 80); ctx.lineTo(px + 60, GROUND_Y); ctx.fill();
      });
    }

    function drawPlatforms(platforms, camX) {
      platforms.forEach((p) => {
        const px = p.x - camX;
        if (px + p.w < 0 || px > CANVAS_W) return;
        if (p.h >= 50) {
          // Ground - NES style dirt + grass
          ctx.fillStyle = '#a05828';
          ctx.fillRect(px, p.y, p.w, p.h);
          // Dirt texture blocks
          ctx.fillStyle = '#8c4820';
          for (let bx = 0; bx < p.w; bx += 32) {
            for (let by = 18; by < p.h; by += 16) {
              if ((Math.floor(bx / 32) + Math.floor(by / 16)) % 2 === 0)
                ctx.fillRect(px + bx, p.y + by, 30, 14);
            }
          }
          // Grass top - chunky 3-layer
          ctx.fillStyle = '#5ea832';
          ctx.fillRect(px, p.y, p.w, 16);
          ctx.fillStyle = '#78c844';
          ctx.fillRect(px, p.y, p.w, 8);
          // Grass bumps
          ctx.fillStyle = '#5ea832';
          for (let bx = 4; bx < p.w - 4; bx += 16) {
            ctx.fillRect(px + bx, p.y - 4, 8, 6);
          }
          // Ground outline
          ctx.fillStyle = '#4a9228';
          ctx.fillRect(px, p.y + 16, p.w, 3);
        } else {
          // Brick platform - authentic SMB style
          ctx.fillStyle = '#c84c28';
          ctx.fillRect(px, p.y, p.w, p.h);
          // Top highlight
          ctx.fillStyle = '#e86030';
          ctx.fillRect(px, p.y, p.w, 4);
          // Brick mortar lines
          ctx.fillStyle = '#a03820';
          ctx.fillRect(px, p.y + p.h / 2, p.w, 2);
          for (let bx = 0; bx < p.w; bx += 16) {
            ctx.fillRect(px + bx, p.y, 2, p.h);
          }
          // Offset mortar on bottom half
          for (let bx = 8; bx < p.w; bx += 16) {
            ctx.fillRect(px + bx, p.y + p.h / 2, 2, p.h / 2);
          }
        }
      });
    }

    function drawCoins(coins, camX, frame) {
      coins.forEach((c) => {
        if (c.collected) return;
        const cx = c.x - camX;
        if (cx < -20 || cx > CANVAS_W + 20) return;
        const bob = Math.sin(frame * 0.12) * 3;
        // Spin effect - coin width oscillates
        const spinW = Math.abs(Math.cos(frame * 0.15)) * 10 + 4;
        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.beginPath(); ctx.ellipse(cx, c.y + 12, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
        // Coin body
        ctx.fillStyle = '#e8a800';
        ctx.fillRect(cx - spinW / 2, c.y - 11 + bob, spinW, 20);
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(cx - spinW / 2 + 1, c.y - 11 + bob, spinW - 2, 14);
        // Shine
        if (spinW > 8) {
          ctx.fillStyle = '#fff9c4';
          ctx.fillRect(cx - spinW / 2 + 2, c.y - 9 + bob, 3, 6);
        }
        // Star symbol on coin
        ctx.fillStyle = '#c88800';
        ctx.font = 'bold 8px monospace';
        ctx.textAlign = 'center';
        if (spinW > 7) ctx.fillText('★', cx, c.y + 3 + bob);
        ctx.textAlign = 'left';
      });
    }

    function drawEnemies(enemies, camX, frame) {
      enemies.forEach((e) => {
        if (!e.alive) return;
        const ex = e.x - camX;
        if (ex < -40 || ex > CANVAS_W + 40) return;
        const walk = Math.sin(frame * 0.22) * 2;
        if (e.type === 'goomba') {
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath(); ctx.ellipse(ex + 15, e.y + 31, 12, 4, 0, 0, Math.PI * 2); ctx.fill();
          // Feet - walk animation
          ctx.fillStyle = '#3d1a00';
          ctx.fillRect(ex + 3, e.y + 22, 11, 9 + walk);
          ctx.fillRect(ex + 16, e.y + 22, 11, 9 - walk);
          // Body
          ctx.fillStyle = '#a05000';
          ctx.fillRect(ex + 2, e.y + 12, 26, 14);
          // Belly
          ctx.fillStyle = '#c87840';
          ctx.fillRect(ex + 6, e.y + 14, 18, 9);
          // Head - NES goomba mushroom shape
          ctx.fillStyle = '#8c3800';
          ctx.fillRect(ex, e.y, 30, 14);
          ctx.fillRect(ex + 2, e.y - 4, 26, 6);
          // White eyes with angry brow
          ctx.fillStyle = 'white';
          ctx.fillRect(ex + 5, e.y + 3, 8, 7);
          ctx.fillRect(ex + 17, e.y + 3, 8, 7);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(ex + 7, e.y + 5, 4, 5);
          ctx.fillRect(ex + 19, e.y + 5, 4, 5);
          // Angry eyebrows
          ctx.fillStyle = '#3d1a00';
          ctx.fillRect(ex + 4, e.y + 1, 10, 3);
          ctx.fillRect(ex + 16, e.y + 1, 10, 3);
          // Tooth
          ctx.fillStyle = '#ffffc0';
          ctx.fillRect(ex + 8, e.y + 11, 5, 4);
          ctx.fillRect(ex + 17, e.y + 11, 5, 4);
        } else {
          // Koopa Troopa - green shell, white head
          const walk2 = Math.sin(frame * 0.2) * 3;
          // Shadow
          ctx.fillStyle = 'rgba(0,0,0,0.25)';
          ctx.beginPath(); ctx.ellipse(ex + 17, e.y + 35, 14, 4, 0, 0, Math.PI * 2); ctx.fill();
          // Feet/shoes - brown
          ctx.fillStyle = '#5a3010';
          ctx.fillRect(ex + 4, e.y + 26, 10, 10 + walk2);
          ctx.fillRect(ex + 20, e.y + 26, 10, 10 - walk2);
          // Shell body - dark green base
          ctx.fillStyle = '#1e6e1e';
          ctx.fillRect(ex + 3, e.y + 10, 28, 20);
          // Shell highlight
          ctx.fillStyle = '#2ea832';
          ctx.fillRect(ex + 5, e.y + 12, 22, 12);
          // Shell hexagon pattern
          ctx.fillStyle = '#1a5a1a';
          ctx.fillRect(ex + 11, e.y + 12, 12, 6);
          // Shell rim outline
          ctx.strokeStyle = '#0a3a0a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(ex + 3, e.y + 10, 28, 20);
          // Neck
          ctx.fillStyle = '#d8b060';
          ctx.fillRect(ex + 11, e.y + 4, 12, 8);
          // Head - round
          ctx.fillStyle = '#d8b060';
          ctx.beginPath(); ctx.arc(ex + 17, e.y + 4, 10, 0, Math.PI * 2); ctx.fill();
          // Eye
          ctx.fillStyle = '#fff';
          ctx.fillRect(ex + 20, e.y + 0, 6, 6);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(ex + 22, e.y + 1, 3, 4);
          // Beak
          ctx.fillStyle = '#e08040';
          ctx.fillRect(ex + 24, e.y + 4, 6, 3);
        }
      });
    }

    function drawPlayer(player, camX, frame) {
      const px = player.x - camX;
      const { w, h, facingRight, invincible } = player;
      if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(px + w / 2, player.y + h + 2, 14, 4, 0, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      if (!facingRight) { ctx.translate(px + w / 2, player.y + h / 2); ctx.scale(-1, 1); ctx.translate(-(px + w / 2), -(player.y + h / 2)); }

      const legOff = player.onGround ? Math.sin(frame * 0.28) * 4 : 0;
      const jump = !player.onGround;

      // Shoes - brown
      ctx.fillStyle = '#6b3010';
      ctx.fillRect(px + 2, player.y + h - 8 + legOff, 12, 8);
      ctx.fillRect(px + w - 14, player.y + h - 8 - legOff, 12, 8);

      // Legs - blue overalls
      ctx.fillStyle = '#3050cc';
      ctx.fillRect(px + 4, player.y + h - 16, 10, 10 + legOff);
      ctx.fillRect(px + w - 14, player.y + h - 16, 10, 10 - legOff);

      // Body / overalls (blue)
      ctx.fillStyle = '#3050cc';
      ctx.fillRect(px + 4, player.y + 24, w - 8, 14);

      // Shirt (red) visible at sides
      ctx.fillStyle = '#dd2020';
      ctx.fillRect(px + 2, player.y + 24, 5, 12);
      ctx.fillRect(px + w - 7, player.y + 24, 5, 12);

      // Overall straps
      ctx.fillStyle = '#3050cc';
      ctx.fillRect(px + 8, player.y + 18, 5, 8);
      ctx.fillRect(px + w - 13, player.y + 18, 5, 8);

      // Arms
      ctx.fillStyle = '#dd2020';
      ctx.fillRect(px, player.y + 24, 5, 10);
      ctx.fillRect(px + w - 5, player.y + 24, 5, 10);

      // Hands
      ctx.fillStyle = '#f5c0a0';
      ctx.fillRect(px - 2, player.y + 32, 6, 6);
      ctx.fillRect(px + w - 4, player.y + 32, 6, 6);

      // Head
      ctx.fillStyle = '#f5c0a0';
      ctx.fillRect(px + 6, player.y + 12, w - 12, 14);

      // Hair/sideburns
      ctx.fillStyle = '#7a3a10';
      ctx.fillRect(px + 6, player.y + 18, 4, 8);

      // Eye
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(px + 8, player.y + 14, 4, 4);
      // Eyebrow
      ctx.fillStyle = '#7a3a10';
      ctx.fillRect(px + 7, player.y + 12, 7, 2);

      // Nose
      ctx.fillStyle = '#e09070';
      ctx.fillRect(px + 14, player.y + 18, 5, 4);

      // Moustache
      ctx.fillStyle = '#7a3a10';
      ctx.fillRect(px + 6, player.y + 20, 18, 4);
      ctx.fillRect(px + 9, player.y + 22, 5, 3);
      ctx.fillRect(px + 16, player.y + 22, 5, 3);

      // Hat - red with brim
      ctx.fillStyle = '#dd2020';
      ctx.fillRect(px + 4, player.y + 2, w - 8, 12);
      ctx.fillRect(px - 2, player.y + 10, w + 4, 4);
      // Hat highlight
      ctx.fillStyle = '#ff4040';
      ctx.fillRect(px + 6, player.y + 3, 8, 4);
      // 'M' on hat (classic detail)
      ctx.fillStyle = '#ffffc0';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('M', px + w / 2, player.y + 10);
      ctx.textAlign = 'left';

      ctx.restore();
    }

    function drawFlag(flagX, camX) {
      const fx = flagX - camX;
      if (fx < -20 || fx > CANVAS_W + 20) return;
      // Pole
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(fx - 1, GROUND_Y - 190, 8, 192);
      ctx.fillStyle = '#888888';
      ctx.fillRect(fx + 3, GROUND_Y - 190, 4, 192);
      // Ball on top
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(fx + 3, GROUND_Y - 192, 7, 0, Math.PI * 2); ctx.fill();
      // Flag - animated wave
      ctx.fillStyle = '#22cc44';
      ctx.beginPath();
      ctx.moveTo(fx + 7, GROUND_Y - 185);
      ctx.lineTo(fx + 50, GROUND_Y - 168);
      ctx.lineTo(fx + 7, GROUND_Y - 148);
      ctx.fill();
      // Flag stripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(fx + 7, GROUND_Y - 175, 38, 6);
      // Castle at end
      ctx.fillStyle = '#aaaaaa';
      ctx.fillRect(fx + 60, GROUND_Y - 90, 70, 90);
      ctx.fillStyle = '#888';
      ctx.fillRect(fx + 58, GROUND_Y - 100, 14, 14);
      ctx.fillRect(fx + 80, GROUND_Y - 106, 14, 18);
      ctx.fillRect(fx + 100, GROUND_Y - 100, 14, 14);
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(fx + 85, GROUND_Y - 30, 20, 30);
    }

    function drawHUD(s) {
      // HUD bar
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, CANVAS_W, 38);
      ctx.strokeStyle = 'rgba(255,200,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, CANVAS_W, 38);

      ctx.fillStyle = '#ffd700';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('MARIO', 12, 14);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText(String(s.score).padStart(6, '0'), 12, 30);

      // Coins
      ctx.fillStyle = '#ffd700';
      ctx.beginPath(); ctx.arc(200, 20, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff9c4';
      ctx.beginPath(); ctx.arc(198, 18, 3, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`×${s.coins}`, 212, 24);

      // Lives
      ctx.fillStyle = '#ff3030';
      ctx.beginPath(); ctx.arc(320, 20, 7, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`×${s.lives}`, 332, 24);

      // World label
      ctx.fillStyle = '#ffd700';
      ctx.textAlign = 'center';
      ctx.font = 'bold 11px monospace';
      ctx.fillText('WORLD 1-1', CANVAS_W / 2, 15);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px monospace';
      ctx.fillText('LEGION BROS', CANVAS_W / 2, 30);
      ctx.textAlign = 'left';
    }

    function update() {
      const s = stateRef.current;
      if (s.gameOver || s.win) return;
      const keys = keysRef.current;
      const { player } = s;

      s.frameCount++;
      player.frame = s.frameCount;
      if (player.invincible > 0) player.invincible--;

      // Input
      const left = keys['ArrowLeft'] || keys['KeyA'];
      const right = keys['ArrowRight'] || keys['KeyD'];
      const jump = keys['ArrowUp'] || keys['KeyW'] || keys['Space'];

      if (left) { player.vx = -PLAYER_SPEED; player.facingRight = false; }
      else if (right) { player.vx = PLAYER_SPEED; player.facingRight = true; }
      else { player.vx *= 0.82; }

      if (jump && player.onGround) { player.vy = JUMP_FORCE; player.onGround = false; GameAudio.jump(); }

      player.vy += GRAVITY;
      player.x += player.vx;
      player.y += player.vy;

      // Clamp left
      if (player.x < 0) { player.x = 0; player.vx = 0; }
      if (player.x > s.worldW - player.w) { player.x = s.worldW - player.w; player.vx = 0; }

      // Platform collision
      player.onGround = false;
      for (const p of s.platforms) {
        if (
          player.x + player.w > p.x && player.x < p.x + p.w &&
          player.y + player.h > p.y && player.y + player.h < p.y + p.h + 12 &&
          player.vy >= 0
        ) {
          player.y = p.y - player.h;
          player.vy = 0;
          player.onGround = true;
        }
      }

      // Fell off
      if (player.y > CANVAS_H + 50) {
        s.lives--;
        if (s.lives <= 0) { s.gameOver = true; GameAudio.gameOver(); setUi({ score: s.score, lives: 0, coins: s.coins, gameOver: true, win: false }); return; }
        GameAudio.hit();
        player.x = 80; player.y = GROUND_Y - 40; player.vx = 0; player.vy = 0; s.camera.x = 0;
      }

      // Enemy collision
      s.enemies.forEach((e) => {
        if (!e.alive) return;
        e.y = GROUND_Y - e.h;
        e.x += e.vx;
        // Bounce on edges
        if (e.x < 0 || e.x + e.w > s.worldW) e.vx *= -1;
        // Bounce on platform edges
        for (const p of s.platforms) {
          if (p.h >= 50) continue;
          if (e.x + e.w > p.x && e.x < p.x + p.w && e.y + e.h >= p.y && e.y <= p.y + p.h) {
            e.y = p.y - e.h;
          }
        }

        if (rectOverlap(player, e)) {
          if (player.vy > 0 && player.y + player.h < e.y + e.h * 0.5) {
            e.alive = false; s.score += 100; player.vy = JUMP_FORCE * 0.6; GameAudio.stomp();
          } else if (player.invincible === 0) {
            player.invincible = 90; s.lives--;
            if (s.lives <= 0) { s.gameOver = true; setUi({ score: s.score, lives: 0, coins: s.coins, gameOver: true, win: false }); return; }
          }
        }
      });

      // Coin collection
      s.coins_obj.forEach((c) => {
        if (c.collected) return;
        if (Math.abs(player.x + player.w / 2 - c.x) < 20 && Math.abs(player.y + player.h / 2 - c.y) < 20) {
          c.collected = true; s.coins++; s.score += 50; GameAudio.coin();
        }
      });

      // Flag
      if (player.x + player.w >= s.flagX) {
        s.win = true; s.score += 1000; GameAudio.win();
        setUi({ score: s.score, lives: s.lives, coins: s.coins, gameOver: false, win: true });
        return;
      }

      // Camera
      const targetCamX = player.x - CANVAS_W * 0.35;
      s.camera.x += (targetCamX - s.camera.x) * 0.12;
      s.camera.x = Math.max(0, Math.min(s.camera.x, s.worldW - CANVAS_W));

      setUi({ score: s.score, lives: s.lives, coins: s.coins, gameOver: false, win: false });
    }

    function render() {
      const s = stateRef.current;
      const camX = s.camera.x;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground(camX);
      drawPlatforms(s.platforms, camX);
      drawCoins(s.coins_obj, camX, s.frameCount);
      drawFlag(s.flagX, camX);
      drawEnemies(s.enemies, camX, s.frameCount);
      drawPlayer(s.player, camX, s.frameCount);
      drawHUD(s);

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ff4444'; ctx.font = 'bold 44px monospace';
        ctx.textAlign = 'center'; ctx.fillText('GAME OVER', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = '#fff'; ctx.font = '20px monospace';
        ctx.fillText(`Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
        ctx.textAlign = 'left';
      }
      if (s.win) {
        ctx.fillStyle = 'rgba(0,0,0,0.72)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 44px monospace';
        ctx.textAlign = 'center'; ctx.fillText('YOU WIN! 🎉', CANVAS_W / 2, CANVAS_H / 2 - 20);
        ctx.fillStyle = '#fff'; ctx.font = '20px monospace';
        ctx.fillText(`Final Score: ${s.score}`, CANVAS_W / 2, CANVAS_H / 2 + 20);
        ctx.textAlign = 'left';
      }
    }

    function loop() {
      update();
      render();
      rafRef.current = requestAnimationFrame(loop);
    }

    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, []);

  return (
    <div className="bg-black flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full max-w-full block"
        style={{ imageRendering: 'pixelated', aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
        tabIndex={0}
      />
      <div className="w-full bg-black/80 border-t border-white/10">
        <GameMobileControls keysRef={keysRef} variant="platformer" />
      </div>
      {(ui.gameOver || ui.win) && (
        <div className="p-4 w-full flex justify-center">
          <button
            onClick={resetGame}
            className="px-8 py-2.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm hover:opacity-90 transition-opacity"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}