import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';
import GameAudio from './GameAudio';

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
      // Double Dragon - gritty 80s street night scene
      // Night sky gradient
      const sky = ctx.createLinearGradient(0, 0, 0, CANVAS_H * 0.55);
      sky.addColorStop(0, '#08081a');
      sky.addColorStop(0.5, '#1a1030');
      sky.addColorStop(1, '#2a1838');
      ctx.fillStyle = sky; ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

      // Moon
      ctx.fillStyle = 'rgba(200,200,255,0.6)';
      ctx.beginPath(); ctx.arc(80, 45, 22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(220,220,255,0.9)';
      ctx.beginPath(); ctx.arc(80, 45, 18, 0, Math.PI * 2); ctx.fill();
      // Moon shadow
      ctx.fillStyle = 'rgba(20,10,40,0.6)';
      ctx.beginPath(); ctx.arc(88, 42, 16, 0, Math.PI * 2); ctx.fill();

      // Stars
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      [[150,20],[250,15],[380,25],[480,10],[550,30],[650,18],[720,22],[760,8]].forEach(([sx,sy]) => {
        ctx.fillRect(sx, sy, 2, 2);
      });

      // Background buildings - dark silhouette
      const bldgData = [
        [0, 200, 60, 200], [80, 170, 80, 230], [200, 155, 55, 245],
        [300, 185, 70, 215], [420, 160, 65, 240], [530, 175, 75, 225],
        [660, 150, 85, 250], [780, 168, 60, 232]
      ];
      bldgData.forEach(([bx, by, bw, bh]) => {
        const rx = ((bx - camX * 0.3) % (CANVAS_W + 250) + CANVAS_W + 250) % (CANVAS_W + 250) - 100;
        ctx.fillStyle = '#140c24';
        ctx.fillRect(rx, by, bw, bh);
        // Rooftop details - water tanks, antennas
        ctx.fillStyle = '#1e1430';
        ctx.fillRect(rx + bw * 0.6, by - 15, 12, 18);
        ctx.fillRect(rx + bw * 0.2, by - 8, 5, 12);
        // Windows - varied brightness
        for (let wy = by + 15; wy < by + bh - 10; wy += 22) {
          for (let wx = rx + 8; wx < rx + bw - 8; wx += 18) {
            const litVal = (Math.floor(wx / 18) * 3 + Math.floor(wy / 22)) % 7;
            if (litVal < 2) {
              ctx.fillStyle = 'rgba(255,220,100,0.8)';
            } else if (litVal < 3) {
              ctx.fillStyle = 'rgba(100,180,255,0.6)';
            } else {
              ctx.fillStyle = '#0a0818';
            }
            ctx.fillRect(wx, wy, 9, 13);
          }
        }
      });

      // Neon signs - vibrant glow
      [[90, 42, '#ff0088', 'DANGER'], [320, 55, '#00ffcc', 'NO EXIT'], [570, 38, '#ffaa00', 'FIGHT!'], [750, 48, '#ff4444', 'GAME']].forEach(([bx, by, col, text]) => {
        const rx = ((bx - camX * 0.2) % (CANVAS_W + 300) + CANVAS_W + 300) % (CANVAS_W + 300) - 150;
        // Glow effect
        ctx.fillStyle = col + '18';
        ctx.fillRect(rx - 14, by - 10, text.length * 13 + 28, 36);
        // Sign border
        ctx.strokeStyle = col + 'cc';
        ctx.lineWidth = 2;
        ctx.strokeRect(rx - 10, by - 6, text.length * 13 + 20, 28);
        // Flicker effect using frame (not available here but sign always on)
        ctx.fillStyle = col;
        ctx.font = 'bold 15px monospace';
        ctx.fillText(text, rx, by + 15);
      });

      // Mid-ground alley floor
      ctx.fillStyle = '#1c1c30';
      ctx.fillRect(0, CANVAS_H * 0.55, CANVAS_W, CANVAS_H * 0.45);

      // Wall/floor seam
      ctx.fillStyle = '#0c0c1a';
      ctx.fillRect(0, CANVAS_H * 0.55, CANVAS_W, 4);

      // Ground - dark pavement
      ctx.fillStyle = '#1a1a28';
      ctx.fillRect(0, GROUND_Y, CANVAS_W, CANVAS_H - GROUND_Y);

      // Ground surface highlights
      ctx.fillStyle = '#282838';
      ctx.fillRect(0, GROUND_Y, CANVAS_W, 5);

      // Pavement cracks / lines
      for (let lx = -camX % 64; lx < CANVAS_W; lx += 64) {
        ctx.fillStyle = '#222232';
        ctx.fillRect(lx, GROUND_Y + 6, 30, 2);
        ctx.fillRect(lx + 32, GROUND_Y + 18, 20, 2);
      }

      // Puddle reflections
      for (let px2 = -camX % 220; px2 < CANVAS_W; px2 += 220) {
        const puddleGrad = ctx.createLinearGradient(px2, GROUND_Y + 5, px2, GROUND_Y + 25);
        puddleGrad.addColorStop(0, 'rgba(100,80,180,0.3)');
        puddleGrad.addColorStop(1, 'rgba(50,40,100,0.1)');
        ctx.fillStyle = puddleGrad;
        ctx.beginPath(); ctx.ellipse(px2 + 50, GROUND_Y + 15, 40, 10, 0, 0, Math.PI * 2); ctx.fill();
      }

      // Trash/debris on floor
      ctx.fillStyle = '#2a2038';
      for (let dx = -camX % 150; dx < CANVAS_W; dx += 150) {
        ctx.fillRect(dx, GROUND_Y - 3, 16, 6);
        ctx.fillRect(dx + 70, GROUND_Y - 2, 10, 5);
      }
    }

    function drawCharacter(ctx, x, y, w, h, facing, options = {}) {
      const { color = '#e8a030', shirtColor = '#cc2020', hitFlash = false, type = 'grunt', isPlayer = false, frame = 0, attackType = null, attackTimer = 0, kickTimer = 0 } = options;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h + 2, w / 2 - 2, 4, 0, 0, Math.PI * 2); ctx.fill();

      ctx.save();
      if (facing < 0) { ctx.translate(x + w / 2, y + h / 2); ctx.scale(-1, 1); ctx.translate(-(x + w / 2), -(y + h / 2)); }

      const legOff = Math.sin(frame * 0.24) * 5;
      const bob = Math.abs(Math.sin(frame * 0.24)) * 2;

      if (hitFlash) { ctx.globalAlpha = 0.5 + Math.abs(Math.sin(frame * 1.2)) * 0.5; }

      const scale = type === 'boss' ? 1.0 : type === 'heavy' ? 1.0 : 1.0;
      const ox = x, oy = y;
      const ow = w, oh = h;

      // -- BOOTS --
      const bootColor = isPlayer ? '#1a1a2e' : (type === 'boss' ? '#1a0808' : '#1a1008');
      ctx.fillStyle = bootColor;
      ctx.fillRect(ox + 1, oy + oh - 9 + legOff, ow * 0.38, 9);
      ctx.fillRect(ox + ow * 0.42, oy + oh - 9 - legOff, ow * 0.38, 9);
      // Boot highlight
      ctx.fillStyle = type === 'boss' ? '#3a1010' : '#2a2810';
      ctx.fillRect(ox + 2, oy + oh - 9 + legOff, ow * 0.2, 4);
      ctx.fillRect(ox + ow * 0.43, oy + oh - 9 - legOff, ow * 0.2, 4);

      // -- PANTS/LEGS --
      const pantsColor = isPlayer ? '#1e3a6e' : (type === 'boss' ? '#3a1010' : (type === 'heavy' ? '#2a2820' : '#2a2030'));
      ctx.fillStyle = pantsColor;
      ctx.fillRect(ox + 2, oy + oh * 0.56, ow * 0.35, oh * 0.32 + legOff);
      ctx.fillRect(ox + ow * 0.42, oy + oh * 0.56, ow * 0.35, oh * 0.32 - legOff);
      // Knee detail
      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(ox + 3, oy + oh * 0.64, ow * 0.28, 4);
      ctx.fillRect(ox + ow * 0.44, oy + oh * 0.64, ow * 0.28, 4);

      // -- BELT --
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(ox + 1, oy + oh * 0.53, ow - 2, 6);
      // Buckle
      ctx.fillStyle = isPlayer ? '#d4a820' : '#888';
      ctx.fillRect(ox + ow / 2 - 5, oy + oh * 0.53, 10, 6);

      // -- BODY / SHIRT --
      ctx.fillStyle = shirtColor;
      ctx.fillRect(ox + 2, oy + oh * 0.28 - bob, ow - 4, oh * 0.27 + bob);
      // Shirt shadow/detail
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(ox + ow * 0.55, oy + oh * 0.28 - bob, ow * 0.38, oh * 0.27 + bob);
      // Shirt highlight
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(ox + 3, oy + oh * 0.28 - bob, ow * 0.25, oh * 0.12);

      // -- KICK LEG --
      if (attackType === 'kick' && kickTimer > 8) {
        ctx.fillStyle = pantsColor;
        const kickExtend = (14 - kickTimer) * 5;
        ctx.fillRect(ox + ow * 0.3, oy + oh * 0.6, kickExtend, 12);
        ctx.fillStyle = bootColor;
        ctx.fillRect(ox + ow * 0.3 + kickExtend, oy + oh * 0.6, 14, 10);
      }

      // -- ARMS --
      if (type === 'boss') {
        ctx.fillStyle = '#aa3a10';
        ctx.fillRect(ox - 6, oy + oh * 0.28, 10, oh * 0.28);
        ctx.fillRect(ox + ow - 4, oy + oh * 0.28, 10, oh * 0.28);
        // Spiked shoulders
        ctx.fillStyle = '#cc4a14';
        ctx.beginPath(); ctx.arc(ox - 2, oy + oh * 0.26, 8, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(ox + ow + 2, oy + oh * 0.26, 8, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = color;
        ctx.fillRect(ox - 5, oy + oh * 0.28 - bob, 9, oh * 0.25);
        ctx.fillRect(ox + ow - 4, oy + oh * 0.28 - bob, 9, oh * 0.25);
        // Punch arm extend
        if (attackType === 'punch' && attackTimer > 6) {
          const punchExt = (12 - attackTimer) * 4;
          ctx.fillRect(ox + ow - 2, oy + oh * 0.28 - bob, punchExt, 10);
          // Fist
          ctx.beginPath(); ctx.arc(ox + ow - 2 + punchExt, oy + oh * 0.33 - bob, 8, 0, Math.PI * 2); ctx.fill();
          // Impact sparks
          if (attackTimer < 4) {
            ctx.fillStyle = '#ffee00';
            ctx.font = '14px sans-serif'; ctx.textAlign = 'center';
            ctx.fillText('✦', ox + ow + punchExt, oy + oh * 0.3 - bob);
            ctx.textAlign = 'left';
          }
        } else {
          // Resting fists
          ctx.beginPath(); ctx.arc(ox - 1, oy + oh * 0.5 - bob, 6, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(ox + ow + 1, oy + oh * 0.5 - bob, 6, 0, Math.PI * 2); ctx.fill();
        }
      }

      // -- HEAD --
      const headR = ow * 0.3;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(ox + ow / 2, oy + headR + 2 - bob, headR, 0, Math.PI * 2); ctx.fill();
      // Jaw/chin shadow
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath(); ctx.arc(ox + ow / 2, oy + headR * 1.5 - bob, headR * 0.7, 0, Math.PI); ctx.fill();

      // -- EYES --
      ctx.fillStyle = '#1a1010';
      ctx.fillRect(ox + ow / 2 + 2, oy + headR * 0.7 - bob, 5, 5);
      ctx.fillRect(ox + ow / 2 - 7, oy + headR * 0.7 - bob, 5, 5);
      // Eye shine
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(ox + ow / 2 + 3, oy + headR * 0.7 - bob + 1, 2, 2);
      if (type === 'boss') {
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(ox + ow / 2 + 3, oy + headR * 0.7 - bob, 3, 4);
        ctx.fillRect(ox + ow / 2 - 6, oy + headR * 0.7 - bob, 3, 4);
      }

      // -- HAIR / HEADBAND --
      if (isPlayer) {
        // Player headband - red ninja style
        ctx.fillStyle = '#cc2020';
        ctx.fillRect(ox + ow / 2 - headR, oy + 2 - bob, headR * 2, headR * 0.45);
        // Dark hair
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(ox + ow / 2 - headR + 2, oy - bob, headR * 2 - 4, 5);
        // Headband tails
        ctx.fillStyle = '#cc2020';
        ctx.fillRect(ox + ow - 3, oy + headR * 0.2 - bob, 8, 5);
      } else if (type === 'boss') {
        ctx.fillStyle = '#2a0808';
        ctx.fillRect(ox + ow / 2 - headR, oy - bob, headR * 2, headR * 0.5);
        // Mohawk/spikes
        ctx.fillStyle = '#ff2200';
        for (let si = 0; si < 3; si++) {
          ctx.fillRect(ox + ow / 2 - 5 + si * 6, oy - 10 - bob, 4, 12);
        }
      } else {
        ctx.fillStyle = '#8B0000';
        ctx.fillRect(ox + ow / 2 - headR, oy + headR * 0.1 - bob, headR * 2, headR * 0.4);
        ctx.fillStyle = '#400000';
        ctx.fillRect(ox + ow / 2 - headR + 2, oy - 2 - bob, headR * 2 - 4, 6);
      }

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

      if (keys['KeyZ'] && player.attackTimer === 0) { player.attackType = 'punch'; player.attackTimer = 12; GameAudio.attack(); }
      if (keys['KeyX'] && player.kickTimer === 0) { player.attackType = 'kick'; player.kickTimer = 14; player.attackTimer = 14; GameAudio.kick(); }

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
            if (e.hp <= 0) { e.alive = false; s.score += e.type === 'boss' ? 1000 : e.type === 'heavy' ? 300 : 100; GameAudio.stomp(); }
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
            if (e.hp <= 0) { e.alive = false; s.score += e.type === 'boss' ? 1500 : e.type === 'heavy' ? 400 : 150; GameAudio.stomp(); }
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
            player.hp -= dmg; player.iframes = 70; GameAudio.hit();
            if (player.hp <= 0) { s.gameOver = true; GameAudio.gameOver(); setUi({ hp: 0, score: s.score, gameOver: true, win: false }); return; }
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
        s.win = true; GameAudio.win(); setUi({ hp: player.hp, score: s.score, gameOver: false, win: true }); return;
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