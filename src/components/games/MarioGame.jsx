import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';

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
      // Sky
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      sky.addColorStop(0, '#1a6bc4');
      sky.addColorStop(1, '#6eb5f7');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Clouds
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      [[200, 60, camX * 0.3], [500, 80, camX * 0.3], [900, 50, camX * 0.3], [1400, 70, camX * 0.3]].forEach(([bx, by, offset]) => {
        const cx = ((bx - offset) % CANVAS_W + CANVAS_W) % CANVAS_W;
        ctx.beginPath(); ctx.arc(cx, by, 28, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + 25, by + 8, 20, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx - 25, by + 8, 20, 0, Math.PI * 2); ctx.fill();
      });

      // Hills
      ctx.fillStyle = '#3a8c3f';
      [[150, GROUND_Y + 20, 100, camX * 0.5], [600, GROUND_Y + 10, 140, camX * 0.5], [1100, GROUND_Y + 15, 120, camX * 0.5]].forEach(([hx, hy, r, offset]) => {
        const cx = hx - offset;
        ctx.beginPath(); ctx.arc(cx, hy, r, 0, Math.PI * 2); ctx.fill();
      });
    }

    function drawPlatforms(platforms, camX) {
      platforms.forEach((p) => {
        const px = p.x - camX;
        if (px + p.w < 0 || px > CANVAS_W) return;
        if (p.h >= 50) {
          // Ground
          ctx.fillStyle = '#5c4033';
          ctx.fillRect(px, p.y, p.w, p.h);
          ctx.fillStyle = '#4caf50';
          ctx.fillRect(px, p.y, p.w, 14);
          ctx.fillStyle = '#388e3c';
          for (let bx = 0; bx < p.w; bx += 40) {
            ctx.fillRect(px + bx, p.y + 14, 38, 4);
          }
        } else {
          // Brick
          const grad = ctx.createLinearGradient(px, p.y, px, p.y + p.h);
          grad.addColorStop(0, '#e07c39'); grad.addColorStop(1, '#c0522a');
          ctx.fillStyle = grad;
          ctx.fillRect(px, p.y, p.w, p.h);
          ctx.strokeStyle = '#a0421f'; ctx.lineWidth = 1;
          ctx.strokeRect(px, p.y, p.w, p.h);
        }
      });
    }

    function drawCoins(coins, camX, frame) {
      coins.forEach((c) => {
        if (c.collected) return;
        const cx = c.x - camX;
        if (cx < -20 || cx > CANVAS_W + 20) return;
        const pulse = Math.abs(Math.sin(frame * 0.08)) * 2;
        ctx.fillStyle = '#FFD700';
        ctx.beginPath(); ctx.arc(cx, c.y - pulse, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#FFF9C4';
        ctx.beginPath(); ctx.arc(cx - 2, c.y - pulse - 2, 3, 0, Math.PI * 2); ctx.fill();
      });
    }

    function drawEnemies(enemies, camX, frame) {
      enemies.forEach((e) => {
        if (!e.alive) return;
        const ex = e.x - camX;
        if (ex < -40 || ex > CANVAS_W + 40) return;
        if (e.type === 'goomba') {
          ctx.fillStyle = '#8B4513';
          ctx.beginPath(); ctx.arc(ex + 15, e.y + 10, 14, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#FF6B35';
          ctx.fillRect(ex + 4, e.y + 16, 22, 14);
          // Eyes
          ctx.fillStyle = 'white';
          ctx.fillRect(ex + 6, e.y + 8, 7, 6); ctx.fillRect(ex + 18, e.y + 8, 7, 6);
          ctx.fillStyle = '#1a1a2e';
          ctx.fillRect(ex + 8, e.y + 10, 4, 4); ctx.fillRect(ex + 20, e.y + 10, 4, 4);
          // Feet
          const legOff = Math.sin(frame * 0.2) * 3;
          ctx.fillStyle = '#5D2E0C';
          ctx.fillRect(ex + 4, e.y + 28, 9, 5 + legOff);
          ctx.fillRect(ex + 18, e.y + 28, 9, 5 - legOff);
        } else {
          // Koopa
          ctx.fillStyle = '#2e7d32';
          ctx.beginPath(); ctx.arc(ex + 17, e.y + 14, 16, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = '#66BB6A';
          ctx.fillRect(ex + 5, e.y + 20, 24, 14);
          ctx.fillStyle = '#fff9c4';
          ctx.beginPath(); ctx.arc(ex + 17, e.y + 6, 9, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'black';
          ctx.fillRect(ex + 12, e.y + 4, 4, 5); ctx.fillRect(ex + 20, e.y + 4, 4, 5);
        }
      });
    }

    function drawPlayer(player, camX, frame) {
      const px = player.x - camX;
      const { w, h, facingRight, invincible } = player;
      if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;

      ctx.save();
      if (!facingRight) { ctx.translate(px + w / 2, player.y + h / 2); ctx.scale(-1, 1); ctx.translate(-(px + w / 2), -(player.y + h / 2)); }

      // Hat
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(px + 2, player.y, w - 4, 10);
      ctx.fillRect(px - 2, player.y + 6, w + 4, 6);
      // Head
      ctx.fillStyle = '#f5c5a0';
      ctx.fillRect(px + 4, player.y + 12, w - 8, 14);
      // Eyes / Moustache
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(px + 7, player.y + 14, 4, 5);
      ctx.fillStyle = '#5D2E0C';
      ctx.fillRect(px + 4, player.y + 20, 18, 4);
      // Body
      ctx.fillStyle = '#0000aa';
      ctx.fillRect(px + 4, player.y + 26, w - 8, 10);
      // Overalls
      ctx.fillStyle = '#cc0000';
      ctx.fillRect(px + 2, player.y + 28, 9, 8);
      ctx.fillRect(px + w - 11, player.y + 28, 9, 8);
      // Legs
      const legOff = player.onGround ? Math.sin(frame * 0.3) * 4 : 0;
      ctx.fillStyle = '#0000aa';
      ctx.fillRect(px + 4, player.y + 36, 10, 4 + legOff);
      ctx.fillRect(px + w - 14, player.y + 36, 10, 4 - legOff);

      ctx.restore();
    }

    function drawFlag(flagX, camX) {
      const fx = flagX - camX;
      if (fx < -20 || fx > CANVAS_W + 20) return;
      ctx.fillStyle = '#888';
      ctx.fillRect(fx, GROUND_Y - 180, 6, 180);
      ctx.fillStyle = '#00c853';
      ctx.beginPath(); ctx.moveTo(fx + 6, GROUND_Y - 180); ctx.lineTo(fx + 50, GROUND_Y - 155); ctx.lineTo(fx + 6, GROUND_Y - 130); ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('⛳', fx + 10, GROUND_Y - 148);
    }

    function drawHUD(s) {
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, CANVAS_W, 36);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px monospace';
      ctx.fillText(`SCORE: ${s.score}`, 12, 22);
      ctx.fillText(`🪙 ${s.coins}`, 220, 22);
      ctx.fillText(`❤️ ${s.lives}`, 380, 22);
      ctx.fillStyle = '#ffd700';
      ctx.fillText('LEGION BROS', CANVAS_W / 2 - 50, 22);
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

      if (jump && player.onGround) { player.vy = JUMP_FORCE; player.onGround = false; }

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
        if (s.lives <= 0) { s.gameOver = true; setUi({ score: s.score, lives: 0, coins: s.coins, gameOver: true, win: false }); return; }
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
            e.alive = false; s.score += 100; player.vy = JUMP_FORCE * 0.6;
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
          c.collected = true; s.coins++; s.score += 50;
        }
      });

      // Flag
      if (player.x + player.w >= s.flagX) {
        s.win = true; s.score += 1000;
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