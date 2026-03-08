import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';
import GameAudio from './GameAudio';
import { MARIO_LEVELS } from './GameLevelData';

const CANVAS_W = 800;
const CANVAS_H = 400;
const GRAVITY = 0.5;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -11;
const GROUND_Y = CANVAS_H - 60;

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function createStateFromLevel(lvlData, carry) {
  return {
    player: { x: 80, y: GROUND_Y - 40, w: 32, h: 40, vx: 0, vy: 0, onGround: false, facingRight: true, frame: 0, invincible: 0 },
    camera: { x: 0 },
    score: carry?.score || 0,
    lives: carry?.lives || 3,
    coins: carry?.coins || 0,
    gameOver: false,
    win: false,
    levelComplete: false,
    frameCount: 0,
    platforms: lvlData.platforms,
    enemies: JSON.parse(JSON.stringify(lvlData.enemies)),
    coins_obj: JSON.parse(JSON.stringify(lvlData.coins_obj)),
    flagX: lvlData.flagX,
    worldW: lvlData.worldW,
    quests: JSON.parse(JSON.stringify(lvlData.quests)),
    enemiesKilled: 0,
    isBossLevel: lvlData.isBossLevel,
    bgTheme: lvlData.bgTheme,
  };
}

export default function MarioGame() {
  const canvasRef = useRef(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const stateRef = useRef(createStateFromLevel(MARIO_LEVELS[0]));
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [ui, setUi] = useState({ score: 0, lives: 3, coins: 0, gameOver: false, win: false, levelComplete: false, level: 1, quests: [] });
  const [showLevelCard, setShowLevelCard] = useState(true);

  const loadLevel = useCallback((lvlIdx, carry) => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const lvlData = MARIO_LEVELS[lvlIdx];
    stateRef.current = createStateFromLevel(lvlData, carry);
    setCurrentLevel(lvlIdx);
    setShowLevelCard(true);
    setUi({ score: carry?.score || 0, lives: carry?.lives || 3, coins: carry?.coins || 0, gameOver: false, win: false, levelComplete: false, level: lvlIdx + 1, quests: stateRef.current.quests });
    setTimeout(() => setShowLevelCard(false), 2500);
  }, []);

  const resetGame = useCallback(() => {
    loadLevel(0, null);
  }, [loadLevel]);

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

    const BGS = {
      plains: ['#5c94fc', '#8bb8fc'],
      cave: ['#1a1a2e', '#2a2a4e'],
      castle: ['#2a1a1a', '#4a2a2a'],
    };

    function drawBackground(camX, theme) {
      const [top, bot] = BGS[theme] || BGS.plains;
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
      sky.addColorStop(0, top); sky.addColorStop(1, bot);
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (theme === 'plains') {
        [[180,55],[480,75],[820,45],[1200,65],[1550,52]].forEach(([bx,by]) => {
          const cx = ((bx - camX * 0.25) % (CANVAS_W + 300) + CANVAS_W + 300) % (CANVAS_W + 300) - 100;
          ctx.fillStyle = 'rgba(180,210,255,0.6)'; ctx.fillRect(cx-28, by+18, 80, 12);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(cx-20, by+8, 64, 20); ctx.fillRect(cx-8, by, 42, 12); ctx.fillRect(cx+4, by-8, 24, 12);
        });
        [[120,110,camX*0.45],[480,130,camX*0.45],[900,95,camX*0.45]].forEach(([hx,hr,offset]) => {
          const cx = ((hx - offset) % (CANVAS_W+300) + CANVAS_W+300) % (CANVAS_W+300) - 100;
          ctx.fillStyle = '#5ea832'; ctx.beginPath(); ctx.arc(cx, GROUND_Y, hr, Math.PI, 0); ctx.fill();
          ctx.fillStyle = '#78c844'; ctx.beginPath(); ctx.arc(cx - hr*0.2, GROUND_Y - hr*0.55, hr*0.4, Math.PI, 0); ctx.fill();
        });
      } else if (theme === 'cave') {
        ctx.fillStyle = 'rgba(80,60,120,0.4)';
        [[100,80,60],[300,60,80],[600,90,70],[800,50,90]].forEach(([sx,sy,sr]) => {
          const cx2 = ((sx - camX * 0.2) % (CANVAS_W+300) + CANVAS_W+300) % (CANVAS_W+300) - 100;
          ctx.beginPath(); ctx.arc(cx2, sy, sr, 0, Math.PI*2); ctx.fill();
        });
        // Stalactites
        ctx.fillStyle = '#3a2a5a';
        for (let sx = -camX % 80; sx < CANVAS_W; sx += 80) {
          ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx+20, 0); ctx.lineTo(sx+10, 30+Math.sin(sx)*10); ctx.fill();
        }
      } else {
        // Castle
        ctx.fillStyle = '#6a2a2a';
        for (let sx = -camX%120; sx < CANVAS_W; sx += 120) {
          ctx.fillRect(sx, 200, 80, GROUND_Y - 200);
          ctx.fillStyle = '#4a1a1a';
          ctx.fillRect(sx, 200, 20, 20); ctx.fillRect(sx+30, 200, 20, 20); ctx.fillRect(sx+60, 200, 20, 20);
          ctx.fillStyle = '#1a1a2e'; ctx.fillRect(sx+30, 240, 20, 30);
          ctx.fillStyle = '#6a2a2a';
        }
      }
    }

    function drawPlatforms(platforms, camX) {
      platforms.forEach((p) => {
        const px = p.x - camX;
        if (px + p.w < 0 || px > CANVAS_W) return;
        if (p.h >= 50) {
          const theme = stateRef.current.bgTheme;
          if (theme === 'cave') {
            ctx.fillStyle = '#2a1a4a'; ctx.fillRect(px, p.y, p.w, p.h);
            ctx.fillStyle = '#3a2a5a'; ctx.fillRect(px, p.y, p.w, 8);
          } else if (theme === 'castle') {
            ctx.fillStyle = '#5a5a7a'; ctx.fillRect(px, p.y, p.w, p.h);
            ctx.fillStyle = '#7a7a9a'; ctx.fillRect(px, p.y, p.w, 8);
          } else {
            ctx.fillStyle = '#a05828'; ctx.fillRect(px, p.y, p.w, p.h);
            ctx.fillStyle = '#5ea832'; ctx.fillRect(px, p.y, p.w, 16);
            ctx.fillStyle = '#78c844'; ctx.fillRect(px, p.y, p.w, 8);
            for (let bx=4; bx<p.w-4; bx+=16) ctx.fillRect(px+bx, p.y-4, 8, 6);
          }
        } else {
          ctx.fillStyle = '#c84c28'; ctx.fillRect(px, p.y, p.w, p.h);
          ctx.fillStyle = '#e86030'; ctx.fillRect(px, p.y, p.w, 4);
          ctx.fillStyle = '#a03820'; ctx.fillRect(px, p.y+p.h/2, p.w, 2);
          for (let bx=0; bx<p.w; bx+=16) ctx.fillRect(px+bx, p.y, 2, p.h);
          for (let bx=8; bx<p.w; bx+=16) ctx.fillRect(px+bx, p.y+p.h/2, 2, p.h/2);
        }
      });
    }

    function drawCoins(coins, camX, frame) {
      coins.forEach((c) => {
        if (c.collected) return;
        const cx = c.x - camX;
        if (cx < -20 || cx > CANVAS_W + 20) return;
        const bob = Math.sin(frame * 0.12) * 3;
        const spinW = Math.abs(Math.cos(frame * 0.15)) * 10 + 4;
        ctx.fillStyle = 'rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.ellipse(cx, c.y+12, 7, 3, 0, 0, Math.PI*2); ctx.fill();
        ctx.fillStyle = '#e8a800'; ctx.fillRect(cx-spinW/2, c.y-11+bob, spinW, 20);
        ctx.fillStyle = '#ffd700'; ctx.fillRect(cx-spinW/2+1, c.y-11+bob, spinW-2, 14);
        if (spinW > 8) { ctx.fillStyle = '#fff9c4'; ctx.fillRect(cx-spinW/2+2, c.y-9+bob, 3, 6); }
        ctx.fillStyle = '#c88800'; ctx.font = 'bold 8px monospace'; ctx.textAlign = 'center';
        if (spinW > 7) ctx.fillText('★', cx, c.y+3+bob);
        ctx.textAlign = 'left';
      });
    }

    function drawEnemies(enemies, camX, frame) {
      enemies.forEach((e) => {
        if (!e.alive) return;
        const ex = e.x - camX;
        if (ex < -60 || ex > CANVAS_W + 60) return;
        const walk = Math.sin(frame * 0.22) * 2;

        if (e.type === 'bowser') {
          // Boss Bowser
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(ex+25, e.y+52, 24, 6, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#5a8a10'; ctx.fillRect(ex, e.y, e.w, e.h);
          ctx.fillStyle = '#7ac820'; ctx.fillRect(ex+4, e.y+4, e.w-12, e.h-14);
          ctx.fillStyle = '#3a6810'; ctx.fillRect(ex+8, e.y+8, e.w-20, e.h-22);
          // Spikes on shell
          ctx.fillStyle = '#cc8800';
          for (let s=0; s<4; s++) ctx.fillRect(ex+4+s*11, e.y-6, 6, 10);
          // Head
          ctx.fillStyle = '#4a8010'; ctx.fillRect(ex+8, e.y+e.h/2, 24, 18);
          ctx.fillStyle = '#8ac820'; ctx.beginPath(); ctx.arc(ex+20, e.y+e.h/2+9, 14, 0, Math.PI*2); ctx.fill();
          // Red eyes
          ctx.fillStyle = '#ff2020'; ctx.fillRect(ex+12, e.y+e.h/2+2, 7, 8); ctx.fillRect(ex+24, e.y+e.h/2+2, 7, 8);
          ctx.fillStyle = '#000'; ctx.fillRect(ex+14, e.y+e.h/2+4, 4, 5); ctx.fillRect(ex+26, e.y+e.h/2+4, 4, 5);
          ctx.fillStyle = '#ff8800'; ctx.fillRect(ex+11, e.y+e.h/2+14, 18, 5);
          // HP bar
          const bw = 60;
          ctx.fillStyle = '#1a1a1a'; ctx.fillRect(ex-5, e.y-18, bw+6, 10);
          ctx.fillStyle = '#cc0000'; ctx.fillRect(ex-3, e.y-17, bw*(e.hp/e.maxHp), 8);
          ctx.fillStyle = '#ff4444'; ctx.fillRect(ex-3, e.y-17, bw*(e.hp/e.maxHp)*0.5, 4);
          ctx.fillStyle = '#fff'; ctx.font = 'bold 8px monospace';
          ctx.textAlign = 'center'; ctx.fillText('BOSS', ex+25, e.y-22); ctx.textAlign = 'left';
          return;
        }

        if (e.type === 'goomba') {
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(ex+15, e.y+31, 12, 4, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#3d1a00'; ctx.fillRect(ex+3, e.y+22, 11, 9+walk); ctx.fillRect(ex+16, e.y+22, 11, 9-walk);
          ctx.fillStyle = '#a05000'; ctx.fillRect(ex+2, e.y+12, 26, 14);
          ctx.fillStyle = '#c87840'; ctx.fillRect(ex+6, e.y+14, 18, 9);
          ctx.fillStyle = '#8c3800'; ctx.fillRect(ex, e.y, 30, 14); ctx.fillRect(ex+2, e.y-4, 26, 6);
          ctx.fillStyle = 'white'; ctx.fillRect(ex+5, e.y+3, 8, 7); ctx.fillRect(ex+17, e.y+3, 8, 7);
          ctx.fillStyle = '#1a1a2e'; ctx.fillRect(ex+7, e.y+5, 4, 5); ctx.fillRect(ex+19, e.y+5, 4, 5);
          ctx.fillStyle = '#3d1a00'; ctx.fillRect(ex+4, e.y+1, 10, 3); ctx.fillRect(ex+16, e.y+1, 10, 3);
          ctx.fillStyle = '#ffffc0'; ctx.fillRect(ex+8, e.y+11, 5, 4); ctx.fillRect(ex+17, e.y+11, 5, 4);
        } else {
          const walk2 = Math.sin(frame * 0.2) * 3;
          ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(ex+17, e.y+35, 14, 4, 0, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#5a3010'; ctx.fillRect(ex+4, e.y+26, 10, 10+walk2); ctx.fillRect(ex+20, e.y+26, 10, 10-walk2);
          ctx.fillStyle = '#1e6e1e'; ctx.fillRect(ex+3, e.y+10, 28, 20);
          ctx.fillStyle = '#2ea832'; ctx.fillRect(ex+5, e.y+12, 22, 12);
          ctx.fillStyle = '#1a5a1a'; ctx.fillRect(ex+11, e.y+12, 12, 6);
          ctx.strokeStyle = '#0a3a0a'; ctx.lineWidth = 1.5; ctx.strokeRect(ex+3, e.y+10, 28, 20);
          ctx.fillStyle = '#d8b060'; ctx.fillRect(ex+11, e.y+4, 12, 8);
          ctx.fillStyle = '#d8b060'; ctx.beginPath(); ctx.arc(ex+17, e.y+4, 10, 0, Math.PI*2); ctx.fill();
          ctx.fillStyle = '#fff'; ctx.fillRect(ex+20, e.y, 6, 6);
          ctx.fillStyle = '#1a1a2e'; ctx.fillRect(ex+22, e.y+1, 3, 4);
          ctx.fillStyle = '#e08040'; ctx.fillRect(ex+24, e.y+4, 6, 3);
        }
      });
    }

    function drawPlayer(player, camX, frame) {
      const px = player.x - camX;
      const { w, h, facingRight, invincible } = player;
      if (invincible > 0 && Math.floor(invincible / 4) % 2 === 0) return;
      ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(px+w/2, player.y+h+2, 14, 4, 0, 0, Math.PI*2); ctx.fill();
      ctx.save();
      if (!facingRight) { ctx.translate(px+w/2, player.y+h/2); ctx.scale(-1,1); ctx.translate(-(px+w/2), -(player.y+h/2)); }
      const legOff = player.onGround ? Math.sin(frame*0.28)*4 : 0;
      ctx.fillStyle = '#6b3010'; ctx.fillRect(px+2, player.y+h-8+legOff, 12, 8); ctx.fillRect(px+w-14, player.y+h-8-legOff, 12, 8);
      ctx.fillStyle = '#3050cc'; ctx.fillRect(px+4, player.y+h-16, 10, 10+legOff); ctx.fillRect(px+w-14, player.y+h-16, 10, 10-legOff);
      ctx.fillStyle = '#3050cc'; ctx.fillRect(px+4, player.y+24, w-8, 14);
      ctx.fillStyle = '#dd2020'; ctx.fillRect(px+2, player.y+24, 5, 12); ctx.fillRect(px+w-7, player.y+24, 5, 12);
      ctx.fillStyle = '#3050cc'; ctx.fillRect(px+8, player.y+18, 5, 8); ctx.fillRect(px+w-13, player.y+18, 5, 8);
      ctx.fillStyle = '#dd2020'; ctx.fillRect(px, player.y+24, 5, 10); ctx.fillRect(px+w-5, player.y+24, 5, 10);
      ctx.fillStyle = '#f5c0a0'; ctx.fillRect(px-2, player.y+32, 6, 6); ctx.fillRect(px+w-4, player.y+32, 6, 6);
      ctx.fillStyle = '#f5c0a0'; ctx.fillRect(px+6, player.y+12, w-12, 14);
      ctx.fillStyle = '#7a3a10'; ctx.fillRect(px+6, player.y+18, 4, 8);
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(px+8, player.y+14, 4, 4);
      ctx.fillStyle = '#7a3a10'; ctx.fillRect(px+7, player.y+12, 7, 2);
      ctx.fillStyle = '#e09070'; ctx.fillRect(px+14, player.y+18, 5, 4);
      ctx.fillStyle = '#7a3a10'; ctx.fillRect(px+6, player.y+20, 18, 4); ctx.fillRect(px+9, player.y+22, 5, 3); ctx.fillRect(px+16, player.y+22, 5, 3);
      ctx.fillStyle = '#dd2020'; ctx.fillRect(px+4, player.y+2, w-8, 12); ctx.fillRect(px-2, player.y+10, w+4, 4);
      ctx.fillStyle = '#ff4040'; ctx.fillRect(px+6, player.y+3, 8, 4);
      ctx.fillStyle = '#ffffc0'; ctx.font = 'bold 7px monospace'; ctx.textAlign = 'center';
      ctx.fillText('M', px+w/2, player.y+10); ctx.textAlign = 'left';
      ctx.restore();
    }

    function drawFlag(flagX, camX) {
      const fx = flagX - camX;
      if (fx < -20 || fx > CANVAS_W + 20) return;
      ctx.fillStyle = '#aaaaaa'; ctx.fillRect(fx-1, GROUND_Y-190, 8, 192);
      ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(fx+3, GROUND_Y-192, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#22cc44';
      ctx.beginPath(); ctx.moveTo(fx+7, GROUND_Y-185); ctx.lineTo(fx+50, GROUND_Y-168); ctx.lineTo(fx+7, GROUND_Y-148); ctx.fill();
      ctx.fillStyle = '#ffffff'; ctx.fillRect(fx+7, GROUND_Y-175, 38, 6);
      ctx.fillStyle = '#aaaaaa'; ctx.fillRect(fx+60, GROUND_Y-90, 70, 90);
      ctx.fillStyle = '#888'; ctx.fillRect(fx+58, GROUND_Y-100, 14, 14); ctx.fillRect(fx+80, GROUND_Y-106, 14, 18); ctx.fillRect(fx+100, GROUND_Y-100, 14, 14);
      ctx.fillStyle = '#1a1a2e'; ctx.fillRect(fx+85, GROUND_Y-30, 20, 30);
    }

    function drawHUD(s, lvl) {
      ctx.fillStyle = 'rgba(0,0,0,0.75)'; ctx.fillRect(0, 0, CANVAS_W, 42);
      ctx.strokeStyle = 'rgba(255,200,0,0.3)'; ctx.lineWidth = 1; ctx.strokeRect(0, 0, CANVAS_W, 42);
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 13px monospace'; ctx.fillText('MARIO', 10, 14);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px monospace'; ctx.fillText(String(s.score).padStart(6,'0'), 10, 30);
      ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(155, 21, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff9c4'; ctx.beginPath(); ctx.arc(153, 19, 3, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 12px monospace'; ctx.fillText(`×${s.coins}`, 167, 25);
      ctx.fillStyle = '#ff3030'; ctx.beginPath(); ctx.arc(235, 21, 7, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillText(`×${s.lives}`, 247, 25);
      ctx.fillStyle = '#ffd700'; ctx.textAlign = 'center'; ctx.font = 'bold 11px monospace';
      ctx.fillText(`WORLD ${lvl}-1`, CANVAS_W/2, 15);
      ctx.fillStyle = '#ffffff'; ctx.font = 'bold 13px monospace'; ctx.fillText('LEGION BROS', CANVAS_W/2, 30);
      ctx.textAlign = 'left';
      // Quest tracker
      const doneQ = s.quests.filter(q=>q.done).length;
      ctx.fillStyle = 'rgba(255,215,0,0.15)';
      ctx.fillRect(CANVAS_W-180, 0, 180, 42);
      ctx.fillStyle = '#ffd700'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'right';
      ctx.fillText(`QUESTS ${doneQ}/${s.quests.length}`, CANVAS_W-6, 14);
      s.quests.slice(0,2).forEach((q,qi) => {
        ctx.fillStyle = q.done ? '#00e676' : '#fff';
        ctx.font = '8px monospace';
        const prog = q.done ? '✓' : `${Math.min(q.progress,q.target)}/${q.target}`;
        ctx.fillText(`${q.label.substring(0,20)} ${prog}`, CANVAS_W-6, 26+qi*10);
      });
      ctx.textAlign = 'left';
    }

    function update() {
      const s = stateRef.current;
      if (s.gameOver || s.win || s.levelComplete) return;
      const keys = keysRef.current;
      const { player } = s;
      s.frameCount++;
      player.frame = s.frameCount;
      if (player.invincible > 0) player.invincible--;

      const left = keys['ArrowLeft'] || keys['KeyA'];
      const right = keys['ArrowRight'] || keys['KeyD'];
      const jump = keys['ArrowUp'] || keys['KeyW'] || keys['Space'];

      if (left) { player.vx = -PLAYER_SPEED; player.facingRight = false; }
      else if (right) { player.vx = PLAYER_SPEED; player.facingRight = true; }
      else { player.vx *= 0.82; }

      if (jump && player.onGround) { player.vy = JUMP_FORCE; player.onGround = false; GameAudio.jump(); }
      player.vy += GRAVITY;
      player.x += player.vx; player.y += player.vy;
      if (player.x < 0) { player.x = 0; player.vx = 0; }
      if (player.x > s.worldW - player.w) { player.x = s.worldW - player.w; player.vx = 0; }

      player.onGround = false;
      for (const p of s.platforms) {
        if (player.x + player.w > p.x && player.x < p.x + p.w && player.y + player.h > p.y && player.y + player.h < p.y + p.h + 12 && player.vy >= 0) {
          player.y = p.y - player.h; player.vy = 0; player.onGround = true;
        }
      }

      if (player.y > CANVAS_H + 50) {
        s.lives--;
        if (s.lives <= 0) { s.gameOver = true; GameAudio.gameOver(); setUi(u => ({...u, gameOver: true, lives: 0})); return; }
        GameAudio.hit();
        player.x = 80; player.y = GROUND_Y - 40; player.vx = 0; player.vy = 0; s.camera.x = 0;
      }

      s.enemies.forEach((e) => {
        if (!e.alive) return;
        e.y = GROUND_Y - e.h;
        e.x += e.vx;
        if (e.x < 0 || e.x + e.w > s.worldW) e.vx *= -1;

        // Boss Bowser fires
        if (e.type === 'bowser') {
          e.fireTimer = (e.fireTimer || 0) + 1;
          if (e.fireTimer > 120) {
            e.fireTimer = 0;
            // Bowser moves toward player
            const dx = player.x - e.x;
            e.vx = dx > 0 ? 2 : -2;
          }
        }

        if (rectOverlap(player, e)) {
          if (player.vy > 0 && player.y + player.h < e.y + e.h * 0.5) {
            if (e.type === 'bowser') {
              e.hp--;
              player.vy = JUMP_FORCE * 0.6;
              GameAudio.stomp();
              if (e.hp <= 0) {
                e.alive = false; s.score += 5000; s.enemiesKilled++;
                GameAudio.win();
                const bq = s.quests.find(q=>q.id==='boss');
                if (bq) { bq.progress = 1; bq.done = true; }
              }
            } else {
              e.alive = false; s.score += 100; player.vy = JUMP_FORCE * 0.6;
              s.enemiesKilled++;
              GameAudio.stomp();
              const eq = s.quests.find(q=>q.id==='enemies');
              if (eq && !eq.done) { eq.progress++; if (eq.progress >= eq.target) eq.done = true; }
            }
          } else if (player.invincible === 0) {
            player.invincible = 90; s.lives--;
            GameAudio.hit();
            if (s.lives <= 0) { s.gameOver = true; GameAudio.gameOver(); setUi(u => ({...u, gameOver: true, lives: 0})); return; }
          }
        }
      });

      s.coins_obj.forEach((c) => {
        if (c.collected) return;
        if (Math.abs(player.x + player.w/2 - c.x) < 20 && Math.abs(player.y + player.h/2 - c.y) < 20) {
          c.collected = true; s.coins++; s.score += 50; GameAudio.coin();
          const cq = s.quests.find(q=>q.id==='coins');
          if (cq && !cq.done) { cq.progress++; if (cq.progress >= cq.target) cq.done = true; }
        }
      });

      if (player.x + player.w >= s.flagX) {
        const rq = s.quests.find(q=>q.id==='reach');
        if (rq) { rq.progress = 1; rq.done = true; }
        s.score += 1000;
        GameAudio.win();
        const allDone = s.quests.every(q=>q.done);
        if (allDone || true) { // flag always completes the level
          s.levelComplete = true;
          setUi(u => ({...u, score: s.score, levelComplete: true, quests: s.quests}));
        }
        return;
      }

      const targetCamX = player.x - CANVAS_W * 0.35;
      s.camera.x += (targetCamX - s.camera.x) * 0.12;
      s.camera.x = Math.max(0, Math.min(s.camera.x, s.worldW - CANVAS_W));
      setUi(u => ({...u, score: s.score, lives: s.lives, coins: s.coins, quests: [...s.quests]}));
    }

    function render() {
      const s = stateRef.current;
      const camX = s.camera.x;
      ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
      drawBackground(camX, s.bgTheme);
      drawPlatforms(s.platforms, camX);
      drawCoins(s.coins_obj, camX, s.frameCount);
      drawFlag(s.flagX, camX);
      drawEnemies(s.enemies, camX, s.frameCount);
      drawPlayer(s.player, camX, s.frameCount);
      drawHUD(s, currentLevel + 1);

      if (s.gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ff4444'; ctx.font = 'bold 48px monospace'; ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', CANVAS_W/2, CANVAS_H/2-30);
        ctx.fillStyle = '#fff'; ctx.font = '20px monospace';
        ctx.fillText(`Score: ${s.score}`, CANVAS_W/2, CANVAS_H/2+10);
        ctx.textAlign = 'left';
      }
      if (s.levelComplete) {
        ctx.fillStyle = 'rgba(0,0,0,0.8)'; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
        ctx.fillStyle = '#ffd700'; ctx.font = 'bold 40px monospace'; ctx.textAlign = 'center';
        ctx.fillText(`LEVEL ${currentLevel+1} CLEAR!`, CANVAS_W/2, CANVAS_H/2-40);
        ctx.fillStyle = '#00e676'; ctx.font = '18px monospace';
        const doneQ = s.quests.filter(q=>q.done).length;
        ctx.fillText(`Quests: ${doneQ}/${s.quests.length} ⭐`, CANVAS_W/2, CANVAS_H/2);
        ctx.fillStyle = '#fff';
        ctx.fillText(`Score: ${s.score}`, CANVAS_W/2, CANVAS_H/2+30);
        if (currentLevel + 1 >= MARIO_LEVELS.length) {
          ctx.fillStyle = '#ffd700'; ctx.font = 'bold 24px monospace';
          ctx.fillText('🏆 GAME COMPLETE! 🏆', CANVAS_W/2, CANVAS_H/2+65);
        }
        ctx.textAlign = 'left';
      }
    }

    function loop() { update(); render(); rafRef.current = requestAnimationFrame(loop); }
    rafRef.current = requestAnimationFrame(loop);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [currentLevel]);

  const handleNextLevel = useCallback(() => {
    const s = stateRef.current;
    const nextIdx = currentLevel + 1;
    if (nextIdx >= MARIO_LEVELS.length) {
      resetGame();
    } else {
      loadLevel(nextIdx, { score: s.score, lives: s.lives, coins: s.coins });
    }
  }, [currentLevel, loadLevel, resetGame]);

  return (
    <div className="bg-black flex flex-col items-center">
      {showLevelCard && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80">
          <div className="text-center">
            <div className="text-yellow-400 font-bold text-4xl mb-2" style={{fontFamily:'monospace'}}>WORLD {currentLevel+1}-1</div>
            <div className="text-white text-lg mb-4" style={{fontFamily:'monospace'}}>{MARIO_LEVELS[currentLevel].isBossLevel ? '⚠️ BOSS LEVEL ⚠️' : ''}</div>
            <div className="text-white/70 text-sm space-y-1" style={{fontFamily:'monospace'}}>
              {MARIO_LEVELS[currentLevel].quests.map((q,i) => (
                <div key={i}>◆ {q.label}</div>
              ))}
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        className="w-full max-w-full block" style={{ imageRendering:'pixelated', aspectRatio:`${CANVAS_W}/${CANVAS_H}` }} tabIndex={0} />
      <div className="w-full bg-black/80 border-t border-white/10">
        <GameMobileControls keysRef={keysRef} variant="platformer" />
      </div>
      {ui.levelComplete && (
        <div className="p-4 w-full flex justify-center gap-3">
          <button onClick={handleNextLevel}
            className="px-8 py-2.5 rounded-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-bold text-sm hover:opacity-90">
            {currentLevel + 1 >= MARIO_LEVELS.length ? 'Play Again' : `Next Level →`}
          </button>
        </div>
      )}
      {ui.gameOver && (
        <div className="p-4 w-full flex justify-center">
          <button onClick={resetGame}
            className="px-8 py-2.5 rounded-full bg-gradient-to-r from-red-500 to-orange-500 text-white font-bold text-sm hover:opacity-90">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}