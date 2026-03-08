import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';

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
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      sky.addColorStop(0, '#b05a28'); sky.addColorStop(1, '#e8a060');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
      // Sun
      ctx.fillStyle = '#ffdd44';
      ctx.beginPath(); ctx.arc(CANVAS_W - 60, 60, 30, 0, Math.PI * 2); ctx.fill();
      // Buildings in bg
      ctx.fillStyle = 'rgba(80,40,20,0.5)';
      [[80, 180, 60, 140, camX*0.2], [200, 160, 80, 120, camX*0.2], [400, 200, 50, 100, camX*0.2]].forEach(([bx, by, bw, bh, off]) => {
        const rx = ((bx - off) % (CANVAS_W + 200) + CANVAS_W + 200) % (CANVAS_W + 200) - 100;
        ctx.fillRect(rx, by, bw, bh);
        // Windows
        ctx.fillStyle = 'rgba(255,220,100,0.4)';
        for (let wy = by + 10; wy < by + bh - 10; wy += 20) {
          for (let wx = rx + 8; wx < rx + bw - 8; wx += 16) ctx.fillRect(wx, wy, 8, 10);
        }
        ctx.fillStyle = 'rgba(80,40,20,0.5)';
      });
    }

    function drawPlatforms(platforms, camX) {
      platforms.forEach((p) => {
        const px = p.x - camX;
        if (px + p.w < 0 || px > CANVAS_W) return;
        if (p.h >= 50) {
          ctx.fillStyle = '#7a5c3a'; ctx.fillRect(px, p.y, p.w, p.h);
          ctx.fillStyle = '#c8a86e'; ctx.fillRect(px, p.y, p.w, 8);
          ctx.fillStyle = '#a08050';
          for (let bx = 0; bx < p.w; bx += 50) ctx.fillRect(px + bx, p.y + 8, 48, p.h - 8);
        } else {
          ctx.fillStyle = '#8B7355'; ctx.fillRect(px, p.y, p.w, p.h);
          ctx.fillStyle = '#c8a86e'; ctx.fillRect(px, p.y, p.w, 4);
        }
      });
    }

    function drawPlayer(p, camX, frame) {
      const px = p.x - camX;
      if (p.iframes > 0 && Math.floor(p.iframes / 4) % 2 === 0) return;
      ctx.save();
      if (p.facing < 0) { ctx.translate(px + p.w, p.y + p.h / 2); ctx.scale(-1, 1); ctx.translate(-(px + p.w), -(p.y + p.h / 2)); }

      // Helmet
      ctx.fillStyle = '#3d6b3d'; ctx.fillRect(px + 2, p.y, p.w - 4, 12);
      ctx.fillStyle = '#c0c0c0'; ctx.fillRect(px + 5, p.y + 3, p.w - 10, 7);
      // Face
      ctx.fillStyle = '#e8c880'; ctx.fillRect(px + 4, p.y + 12, p.w - 8, 10);
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(px + 8, p.y + 14, 5, 5);
      // Body
      ctx.fillStyle = '#3d6b3d'; ctx.fillRect(px + 3, p.y + 22, p.w - 6, 10);
      // Gun
      ctx.fillStyle = '#555'; ctx.fillRect(px + p.w - 2, p.y + 18, 12, 6);
      // Legs
      const legOff = p.onGround ? Math.sin(frame * 0.28) * 3 : 0;
      ctx.fillStyle = '#4a5a4a';
      ctx.fillRect(px + 3, p.y + 32, 10, 4 + legOff);
      ctx.fillRect(px + p.w - 13, p.y + 32, 10, 4 - legOff);
      ctx.restore();
    }

    function drawEnemy(e, camX, frame) {
      if (!e.alive) return;
      const ex = e.x - camX;
      if (ex + e.w < -20 || ex > CANVAS_W + 20) return;
      ctx.save();
      if (e.facing > 0) { ctx.translate(ex + e.w, e.y + e.h / 2); ctx.scale(-1, 1); ctx.translate(-(ex + e.w), -(e.y + e.h / 2)); }

      if (e.type === 'tank') {
        ctx.fillStyle = '#6b5a2a'; ctx.fillRect(ex, e.y + 10, e.w, e.h - 10);
        ctx.fillStyle = '#8a7540'; ctx.beginPath(); ctx.arc(ex + e.w / 2, e.y + 14, 18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#555'; ctx.fillRect(ex + e.w - 10, e.y + 8, 20, 6);
        ctx.fillStyle = '#a0a020';
        for (let wx = 0; wx < e.w; wx += 10) ctx.fillRect(ex + wx, e.y + e.h - 10, 8, 10);
        // HP bar
        ctx.fillStyle = '#333'; ctx.fillRect(ex, e.y - 8, e.w, 5);
        ctx.fillStyle = '#e53935'; ctx.fillRect(ex, e.y - 8, e.w * (e.hp / (e.type === 'tank' ? 6 : 8)), 5);
      } else if (e.type === 'boss') {
        ctx.fillStyle = '#8B0000'; ctx.fillRect(ex, e.y, e.w, e.h);
        ctx.fillStyle = '#FF0000'; ctx.fillRect(ex + 5, e.y + 5, e.w - 10, e.h - 10);
        ctx.fillStyle = '#555'; ctx.fillRect(ex + e.w - 15, e.y + 15, 30, 10);
        ctx.fillStyle = '#555'; ctx.fillRect(ex - 15, e.y + 15, 30, 10);
        ctx.fillStyle = '#fff';
        ctx.fillRect(ex + 10, e.y + 12, 12, 12); ctx.fillRect(ex + e.w - 22, e.y + 12, 12, 12);
        ctx.fillStyle = '#f00';
        ctx.fillRect(ex + 13, e.y + 15, 6, 6); ctx.fillRect(ex + e.w - 19, e.y + 15, 6, 6);
        // HP bar
        ctx.fillStyle = '#333'; ctx.fillRect(ex, e.y - 10, e.w, 6);
        ctx.fillStyle = '#e53935'; ctx.fillRect(ex, e.y - 10, e.w * (e.hp / 20), 6);
      } else {
        ctx.fillStyle = '#8B0000'; ctx.fillRect(ex + 3, e.y, e.w - 6, 12);
        ctx.fillStyle = '#e8a080'; ctx.fillRect(ex + 4, e.y + 12, e.w - 8, 10);
        ctx.fillStyle = '#1a1a2e'; ctx.fillRect(ex + 8, e.y + 14, 5, 5);
        ctx.fillStyle = '#8B0000'; ctx.fillRect(ex + 3, e.y + 22, e.w - 6, 10);
        ctx.fillStyle = '#555'; ctx.fillRect(ex + e.w - 2, e.y + 20, 12, 5);
        ctx.fillStyle = '#6b3333';
        const le = p.onGround ? Math.sin(frame * 0.25) * 2 : 0;
        ctx.fillRect(ex + 3, e.y + 32, 10, 4 + le);
        ctx.fillRect(ex + e.w - 13, e.y + 32, 10, 4 - le);
      }
      ctx.restore();
    }

    const p = stateRef.current.player;

    function drawBullets(bullets, enemyBullets, camX) {
      ctx.fillStyle = '#ffee00';
      bullets.forEach((b) => {
        const bx = b.x - camX;
        if (bx < -10 || bx > CANVAS_W + 10) return;
        ctx.fillStyle = '#ffee00';
        ctx.beginPath(); ctx.ellipse(bx, b.y, 8, 4, b.vx > 0 ? 0 : Math.PI, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff8800';
        ctx.beginPath(); ctx.ellipse(bx - b.vx * 0.6, b.y, 4, 2, 0, 0, Math.PI * 2); ctx.fill();
      });
      ctx.fillStyle = '#ff4444';
      enemyBullets.forEach((b) => {
        const bx = b.x - camX;
        if (bx < -10 || bx > CANVAS_W + 10) return;
        ctx.fillStyle = '#ff4444';
        ctx.beginPath(); ctx.ellipse(bx, b.y, 7, 3, 0, 0, Math.PI * 2); ctx.fill();
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

      if (jump && player.onGround) { player.vy = JUMP_FORCE; player.onGround = false; }
      if (shoot && player.shootCooldown === 0) {
        player.shootCooldown = 12;
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
            if (e.hp <= 0) { e.alive = false; s.score += e.type === 'boss' ? 1000 : e.type === 'tank' ? 300 : 100; }
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
          player.hp--; player.iframes = 80;
          if (player.hp <= 0) { s.gameOver = true; setUi({ hp: 0, score: s.score, gameOver: true, win: false }); }
          return false;
        }
        return true;
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