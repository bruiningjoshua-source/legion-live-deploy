import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';
import GameAudio from './GameAudio';
import { ZELDA_LEVELS } from './GameLevelData';

const CANVAS_W = 800;
const CANVAS_H = 400;
const TILE = 40;
const COLS = CANVAS_W / TILE;
const ROWS = CANVAS_H / TILE;
const PLAYER_SPEED = 2.8;
const SWORD_RANGE = 52;

// Maps per dungeon theme
const MAPS = {
  forest: [
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
  ],
  water: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,2,2,0,0,0,0,0,0,0,0,0,2,2,0,0,1],
    [1,0,1,0,2,2,0,1,0,0,1,0,0,1,0,2,2,0,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,2,2,0,0,0,1,0,0,0,0,0,1,0,0,0,2,2,0,1],
    [1,2,2,0,1,0,0,0,0,1,1,0,0,0,0,0,2,2,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,2,2,0,0,0,0,1,0,0,0,1,1],
    [1,0,0,0,0,0,0,0,2,2,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  fire: [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,1,0,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
    [1,0,1,1,0,0,1,0,0,1,0,0,1,0,1,0,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,0,0,1,0,0,0,0,0,0,0,1,0,0,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,1,1,0,0,0,1,0,0,0,0,1],
    [1,0,1,0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1,0,0,0,0,0,0,1],
    [1,0,0,1,0,0,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
};
const defaultMap = MAPS.forest;

function getMap(theme) {
  return MAPS[theme] || MAPS[Object.keys(MAPS)[Object.keys(MAPS).length - 1]] || defaultMap;
}

const THEME_BG = {
  forest: { floor0: '#3c7a28', floor1: '#448a30', wall: '#8c7450', accent: '#5a3010' },
  water: { floor0: '#1a4a6a', floor1: '#1e5478', wall: '#1a3a5a', accent: '#0a2a4a' },
  fire: { floor0: '#4a1a08', floor1: '#5a2010', wall: '#6a2818', accent: '#8a3010' },
  shadow: { floor0: '#1a1a2e', floor1: '#22223a', wall: '#2a2a4a', accent: '#1a1a3a' },
  ice: { floor0: '#b8d8f0', floor1: '#c8e8f8', wall: '#6a90c0', accent: '#4a70a0' },
  desert: { floor0: '#c8a850', floor1: '#d8b860', wall: '#a08040', accent: '#7a6030' },
  sky: { floor0: '#4080c8', floor1: '#4898e8', wall: '#2060a8', accent: '#103080' },
  lava: { floor0: '#2a0808', floor1: '#380c08', wall: '#5a1808', accent: '#8a2010' },
  dark: { floor0: '#0a080c', floor1: '#0e0c12', wall: '#2a1a3a', accent: '#1a1028' },
  final: { floor0: '#080010', floor1: '#0c0018', wall: '#3a0050', accent: '#280040' },
};

function isWall(tx, ty, map) {
  if(ty<0||ty>=ROWS||tx<0||tx>=COLS) return true;
  const t=map[ty][tx];
  return t===1||t===2||t===3;
}
function moveWithCollision(x,y,vx,vy,w,h,map) {
  let nx=x+vx, ny=y+vy;
  const margin=2;
  const lx1=Math.floor((nx+margin)/TILE), lx2=Math.floor((nx+w-margin)/TILE);
  const yt1=Math.floor((y+margin)/TILE), yt2=Math.floor((y+h-margin)/TILE);
  if(isWall(lx1,yt1,map)||isWall(lx2,yt1,map)||isWall(lx1,yt2,map)||isWall(lx2,yt2,map)) nx=x;
  const lt1=Math.floor((nx+margin)/TILE), lt2=Math.floor((nx+w-margin)/TILE);
  const ry1=Math.floor((ny+margin)/TILE), ry2=Math.floor((ny+h-margin)/TILE);
  if(isWall(lt1,ry1,map)||isWall(lt2,ry1,map)||isWall(lt1,ry2,map)||isWall(lt2,ry2,map)) ny=y;
  return {x:nx,y:ny};
}
function dist(a,b){ return Math.hypot(a.x-b.x,a.y-b.y); }

function createStateFromLevel(lvlData, carryScore) {
  return {
    player: { x:60, y:60, w:24, h:24, hp:5, maxHp:5, attack:false, attackAngle:0, attackTimer:0, iframes:0, dir:0 },
    enemies: JSON.parse(JSON.stringify(lvlData.enemies)),
    rupees: JSON.parse(JSON.stringify(lvlData.rupees)),
    score: carryScore||0,
    rupeeCount: 0,
    gameOver: false,
    win: false,
    levelComplete: false,
    frameCount: 0,
    quests: JSON.parse(JSON.stringify(lvlData.quests)),
    isBossLevel: lvlData.isBossLevel,
    theme: lvlData.theme,
    map: getMap(lvlData.theme),
    enemiesKilled: 0,
  };
}

export default function ZeldaGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createStateFromLevel(ZELDA_LEVELS[0]));
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [ui, setUi] = useState({hp:5,score:0,rupees:0,gameOver:false,win:false,levelComplete:false,level:1,quests:[]});
  const [showLevelCard, setShowLevelCard] = useState(true);

  const loadLevel = useCallback((lvlIdx, carryScore) => {
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    stateRef.current = createStateFromLevel(ZELDA_LEVELS[lvlIdx], carryScore);
    setCurrentLevel(lvlIdx);
    setShowLevelCard(true);
    const s=stateRef.current;
    setUi({hp:5,score:s.score,rupees:0,gameOver:false,win:false,levelComplete:false,level:lvlIdx+1,quests:s.quests});
    setTimeout(()=>setShowLevelCard(false), 2500);
  }, []);

  const resetGame = useCallback(()=>{ loadLevel(0,0); },[loadLevel]);

  useEffect(()=>{
    const down=(e)=>{keysRef.current[e.code]=true;};
    const up=(e)=>{keysRef.current[e.code]=false;};
    window.addEventListener('keydown',down); window.addEventListener('keyup',up);
    return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext('2d');

    function drawTile(tx, ty, theme) {
      const t=stateRef.current.map[ty]?.[tx]??1;
      const px=tx*TILE, py=ty*TILE;
      const th=THEME_BG[theme]||THEME_BG.forest;
      switch(t){
        case 0:{
          const even=(tx+ty)%2===0;
          ctx.fillStyle=even?th.floor0:th.floor1;
          ctx.fillRect(px,py,TILE,TILE);
          ctx.fillStyle='rgba(255,255,255,0.08)';
          ctx.fillRect(px+2,py+2,4,3); ctx.fillRect(px+TILE-8,py+TILE-6,4,3);
          ctx.strokeStyle='rgba(0,0,0,0.15)'; ctx.lineWidth=0.5; ctx.strokeRect(px,py,TILE,TILE);
          break;}
        case 1:{
          ctx.fillStyle=th.wall; ctx.fillRect(px,py,TILE,TILE);
          ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.fillRect(px+2,py+2,TILE-4,TILE-4);
          ctx.fillStyle='rgba(255,255,255,0.15)'; ctx.fillRect(px,py,TILE,3); ctx.fillRect(px,py,3,TILE);
          ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.fillRect(px,py+TILE-3,TILE,3); ctx.fillRect(px+TILE-3,py,3,TILE);
          break;}
        case 2:{
          const wAnim=Math.sin(stateRef.current.frameCount*0.05+tx*0.5)*3;
          ctx.fillStyle='#1060c0'; ctx.fillRect(px,py,TILE,TILE);
          ctx.fillStyle='#1878d8'; ctx.fillRect(px+2,py+2,TILE-4,TILE-4);
          ctx.fillStyle='rgba(140,200,255,0.5)';
          ctx.fillRect(px+3,py+8+wAnim,TILE-6,4); ctx.fillRect(px+3,py+20-wAnim,TILE-10,4);
          ctx.fillStyle='rgba(200,230,255,0.3)'; ctx.fillRect(px+4,py+4,8,3);
          break;}
        case 3:{
          ctx.fillStyle=th.floor0; ctx.fillRect(px,py,TILE,TILE);
          ctx.fillStyle=th.accent; ctx.fillRect(px+TILE/2-4,py+TILE-12,8,12);
          ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE/2-2,16,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='rgba(80,160,40,0.8)'; ctx.beginPath(); ctx.arc(px+TILE/2,py+TILE/2-4,14,0,Math.PI*2); ctx.fill();
          ctx.fillStyle='rgba(120,200,60,0.6)'; ctx.beginPath(); ctx.arc(px+TILE/2-4,py+TILE/2-8,10,0,Math.PI*2); ctx.fill();
          break;}
      }
    }

    function drawPlayer(p, frame) {
      const {x,y,w,h,dir,iframes}=p;
      if(iframes>0&&Math.floor(iframes/4)%2===0) return;
      const cx=x+w/2, cy=y+h/2;
      const walk=Math.sin(frame*0.25)*3;
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx,y+h+2,10,3,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='#6b3c14'; ctx.fillRect(x+3,y+h-8+walk,8,8); ctx.fillRect(x+w-11,y+h-8-walk,8,8);
      ctx.fillStyle='#38a030'; ctx.fillRect(x+4,y+12,w-8,h-20);
      ctx.fillStyle='#2050c8'; ctx.fillRect(x-2,y+14,6,10); ctx.fillStyle='#e83030'; ctx.fillRect(x-1,y+15,4,4);
      if(!p.attack){ctx.fillStyle='#f5c0a0'; ctx.fillRect(x+w-2,y+14,5,8);}
      ctx.fillStyle='#f5c0a0'; ctx.beginPath(); ctx.arc(cx,y+8,9,0,Math.PI*2); ctx.fill();
      ctx.fillRect(x+1,y+6,3,5); ctx.fillRect(x+w-4,y+6,3,5);
      ctx.fillStyle='#d4a820'; ctx.fillRect(x+3,y+2,w-6,6); ctx.fillRect(x+2,y+6,4,6);
      ctx.fillStyle='#1a1a2e';
      if(dir===1){ctx.beginPath();ctx.arc(cx+3,y+8,2,0,Math.PI*2);ctx.fill();}
      else if(dir===3){ctx.beginPath();ctx.arc(cx-3,y+8,2,0,Math.PI*2);ctx.fill();}
      else{ctx.beginPath();ctx.arc(cx,y+8,2,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#2a8028';
      ctx.beginPath(); ctx.moveTo(x+2,y+3); ctx.lineTo(cx+4,y-10); ctx.lineTo(x+w-2,y+3); ctx.fill();
      ctx.fillStyle='#44a040';
      ctx.beginPath(); ctx.moveTo(x+4,y+2); ctx.lineTo(cx+3,y-8); ctx.lineTo(cx,y+2); ctx.fill();
      if(p.attack){
        const angle=p.attackAngle, prog=p.attackTimer/10;
        ctx.save(); ctx.translate(cx,cy); ctx.rotate(angle);
        ctx.fillStyle='#d0d8e8'; ctx.fillRect(0,-2,SWORD_RANGE*prog,4);
        ctx.fillStyle='#ffffff'; ctx.fillRect(2,-1,SWORD_RANGE*prog-4,2);
        ctx.fillStyle='#c8a800'; ctx.fillRect(-6,-6,12,12);
        ctx.fillStyle='#ffd700'; ctx.fillRect(-4,-4,8,8);
        if(prog>0.5){ctx.fillStyle='#ffffff'; ctx.beginPath(); ctx.arc(SWORD_RANGE*prog,0,4,0,Math.PI*2); ctx.fill();}
        ctx.restore();
      }
    }

    function drawEnemy(e, frame) {
      if(!e.alive) return;
      const cx=e.x+e.w/2, cy=e.y+e.h/2;
      const bob=Math.sin(frame*0.18)*2, walk=Math.sin(frame*0.22)*2;
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(cx,e.y+e.h+2,e.w/2-2,3,0,0,Math.PI*2); ctx.fill();
      if(e.type==='boss'){
        ctx.fillStyle='#4a0080'; ctx.beginPath(); ctx.arc(cx,cy+bob,e.w/2+2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#6a00b0'; ctx.beginPath(); ctx.arc(cx,cy+bob,e.w/2-3,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#8B0000';
        ctx.beginPath(); ctx.arc(cx-e.w/2,cy-2+bob,7,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+e.w/2,cy-2+bob,7,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#1a0a00'; ctx.beginPath(); ctx.arc(cx,cy-e.h/3+bob,10,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff4400'; ctx.beginPath(); ctx.arc(cx-5,cy-e.h/3+bob,4,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+5,cy-e.h/3+bob,4,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff8800'; ctx.beginPath(); ctx.arc(cx-5,cy-e.h/3+bob,2,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx+5,cy-e.h/3+bob,2,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffd700'; ctx.font='bold 12px sans-serif'; ctx.textAlign='center';
        ctx.fillText('▲',cx,cy+5+bob); ctx.textAlign='left';
        const bw=40;
        ctx.fillStyle='#1a1a1a'; ctx.fillRect(e.x-4,e.y-16,bw+4,10);
        ctx.fillStyle='#cc0000'; ctx.fillRect(e.x-2,e.y-15,bw*(e.hp/e.maxHp),8);
        ctx.fillStyle='#ff4444'; ctx.fillRect(e.x-2,e.y-15,bw*(e.hp/e.maxHp)*0.5,4);
        ctx.fillStyle='#fff'; ctx.font='bold 8px monospace'; ctx.textAlign='center';
        ctx.fillText('BOSS',cx,e.y-20); ctx.textAlign='left';
      } else {
        const color=e.type==='red'?'#cc2020':'#1a68cc';
        const light=e.type==='red'?'#e84040':'#2a88ee';
        ctx.fillStyle=color; ctx.fillRect(e.x+3,e.y+10+bob,e.w-6,e.h-16);
        ctx.fillStyle=light; ctx.fillRect(e.x+5,e.y+12+bob,6,e.h-20);
        ctx.fillStyle=color;
        ctx.fillRect(e.x-2,e.y+10+bob+walk,6,10); ctx.fillRect(e.x+e.w-4,e.y+10+bob-walk,6,10);
        ctx.fillStyle='#2a1800'; ctx.fillRect(e.x+3,e.y+e.h-10+walk,8,10); ctx.fillRect(e.x+e.w-11,e.y+e.h-10-walk,8,10);
        ctx.fillStyle=e.type==='red'?'#d04a00':'#184890';
        ctx.beginPath(); ctx.arc(cx,e.y+7+bob,10,0,Math.PI*2); ctx.fill();
        ctx.fillStyle=e.type==='red'?'#e87050':'#2860c8'; ctx.fillRect(cx-5,e.y+8+bob,10,6);
        ctx.fillStyle='#ffee00'; ctx.fillRect(e.x+4,e.y+3+bob,6,5); ctx.fillRect(e.x+e.w-10,e.y+3+bob,6,5);
        ctx.fillStyle='#000'; ctx.fillRect(e.x+5,e.y+4+bob,4,3); ctx.fillRect(e.x+e.w-9,e.y+4+bob,4,3);
        ctx.fillStyle='#c8a000'; ctx.fillRect(e.x+3,e.y-3+bob,4,6); ctx.fillRect(e.x+e.w-7,e.y-3+bob,4,6);
        // HP
        if(e.maxHp>1){
          ctx.fillStyle='#333'; ctx.fillRect(e.x,e.y-10,e.w,4);
          ctx.fillStyle=color; ctx.fillRect(e.x,e.y-10,e.w*(e.hp/e.maxHp),4);
        }
      }
    }

    function drawRupee(r, frame) {
      if(r.collected) return;
      const bob=Math.sin(frame*0.12)*3, spin=Math.abs(Math.cos(frame*0.1)), rw=6+spin*4;
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(r.x,r.y+13,8,3,0,0,Math.PI*2); ctx.fill();
      ctx.save(); ctx.translate(r.x,r.y-bob);
      ctx.fillStyle='#00aa44';
      ctx.beginPath(); ctx.moveTo(0,-12); ctx.lineTo(rw,-4); ctx.lineTo(rw,8); ctx.lineTo(0,13); ctx.lineTo(-rw,8); ctx.lineTo(-rw,-4); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#00e876';
      const iw=rw*0.6;
      ctx.beginPath(); ctx.moveTo(0,-9); ctx.lineTo(iw,-3); ctx.lineTo(iw,5); ctx.lineTo(0,9); ctx.lineTo(-iw,5); ctx.lineTo(-iw,-3); ctx.closePath(); ctx.fill();
      if(spin>0.4){ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.beginPath(); ctx.moveTo(-2,-8); ctx.lineTo(2,-8); ctx.lineTo(1,-2); ctx.lineTo(-1,-2); ctx.closePath(); ctx.fill();}
      ctx.restore();
    }

    function drawHUD(s) {
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,CANVAS_W,42);
      for(let i=0;i<s.player.maxHp;i++){
        ctx.fillStyle=i<s.player.hp?'#e53935':'#444';
        ctx.font='18px sans-serif'; ctx.fillText('♥',10+i*22,28);
      }
      ctx.fillStyle='#00e676'; ctx.font='bold 12px monospace'; ctx.fillText(`💎 ${s.rupeeCount}`,200,26);
      ctx.fillStyle='#ffd700'; ctx.fillText(`SCORE: ${s.score}`,310,26);
      ctx.fillStyle='#fff'; ctx.font='bold 11px monospace';
      const alive=s.enemies.filter(e=>e.alive).length;
      ctx.fillText(`ENEMIES: ${alive}`,480,26);
      ctx.fillStyle='#ffd700'; ctx.textAlign='center'; ctx.font='bold 10px monospace';
      ctx.fillText(`DUNGEON ${currentLevel+1} - ${(s.theme||'').toUpperCase()}`,CANVAS_W/2,14);
      ctx.textAlign='left';
      // Quest mini
      const doneQ=s.quests.filter(q=>q.done).length;
      ctx.fillStyle='rgba(255,215,0,0.1)'; ctx.fillRect(CANVAS_W-170,0,170,42);
      ctx.fillStyle='#ffd700'; ctx.font='bold 9px monospace'; ctx.textAlign='right';
      ctx.fillText(`QUESTS ${doneQ}/${s.quests.length}`,CANVAS_W-4,14);
      s.quests.slice(0,2).forEach((q,qi)=>{
        ctx.fillStyle=q.done?'#00e676':'#fff';
        ctx.font='8px monospace';
        const prog=q.done?'✓':`${Math.min(q.progress,q.target)}/${q.target}`;
        ctx.fillText(`${q.label.substring(0,18)} ${prog}`,CANVAS_W-4,26+qi*10);
      });
      ctx.textAlign='left';
    }

    function update() {
      const s=stateRef.current;
      if(s.gameOver||s.win||s.levelComplete) return;
      const keys=keysRef.current;
      const {player}=s;
      s.frameCount++;
      if(player.iframes>0) player.iframes--;
      let vx=0, vy=0;
      if(keys['ArrowLeft']||keys['KeyA']){vx=-PLAYER_SPEED;player.dir=3;}
      if(keys['ArrowRight']||keys['KeyD']){vx=PLAYER_SPEED;player.dir=1;}
      if(keys['ArrowUp']||keys['KeyW']){vy=-PLAYER_SPEED;player.dir=2;}
      if(keys['ArrowDown']||keys['KeyS']){vy=PLAYER_SPEED;player.dir=0;}
      if(vx!==0&&vy!==0){vx*=0.707;vy*=0.707;}
      const moved=moveWithCollision(player.x,player.y,vx,vy,player.w,player.h,s.map);
      player.x=moved.x; player.y=moved.y;
      if((keys['KeyZ']||keys['Space'])&&!player.attack){
        player.attack=true; player.attackTimer=10;
        const angles=[Math.PI/2,0,-Math.PI/2,Math.PI];
        player.attackAngle=angles[player.dir]??0;
        GameAudio.sword();
      }
      if(player.attack){player.attackTimer--;if(player.attackTimer<=0)player.attack=false;}

      s.enemies.forEach((e)=>{
        if(!e.alive) return;
        e.frame=(e.frame||0)+1; e.moveTimer=(e.moveTimer||0)+1;
        const dx=player.x-e.x, dy=player.y-e.y, d=Math.hypot(dx,dy);
        const spd=e.type==='boss'?1.4:1.6;
        if(d<200){e.vx=(dx/d)*spd;e.vy=(dy/d)*spd;}
        else if(e.moveTimer%60===0){e.vx=(Math.random()-0.5)*2;e.vy=(Math.random()-0.5)*2;}
        const em=moveWithCollision(e.x,e.y,e.vx,e.vy,e.w,e.h,s.map);
        if(em.x===e.x) e.vx*=-1; if(em.y===e.y) e.vy*=-1;
        e.x=em.x; e.y=em.y;
        if(player.attack&&player.attackTimer>0){
          const eCx=e.x+e.w/2, eCy=e.y+e.h/2;
          const pCx=player.x+player.w/2, pCy=player.y+player.h/2;
          const tipX=pCx+Math.cos(player.attackAngle)*SWORD_RANGE;
          const tipY=pCy+Math.sin(player.attackAngle)*SWORD_RANGE;
          if(Math.hypot(eCx-tipX,eCy-tipY)<32||Math.hypot(eCx-pCx,eCy-pCy)<SWORD_RANGE+5){
            e.hp--; e.vx=(e.x-player.x)*0.08; e.vy=(e.y-player.y)*0.08;
            if(e.hp<=0){
              e.alive=false; s.score+=e.type==='boss'?500:100; s.enemiesKilled++;
              GameAudio.stomp();
              const eq=s.quests.find(q=>q.id==='enemies');
              if(eq&&!eq.done){eq.progress++;if(eq.progress>=eq.target)eq.done=true;}
              if(e.type==='boss'){const bq=s.quests.find(q=>q.id==='boss');if(bq){bq.progress=1;bq.done=true;}}
            }
          }
        }
        if(player.iframes===0&&dist(player,e)<(player.w+e.w)/2-2){
          player.hp--; player.iframes=80; GameAudio.hit();
          if(player.hp<=0){s.gameOver=true;GameAudio.gameOver();setUi(u=>({...u,hp:0,gameOver:true}));}
        }
      });

      s.rupees.forEach((r)=>{
        if(r.collected) return;
        if(dist(player,r)<20){
          r.collected=true; s.rupeeCount++; s.score+=25; GameAudio.rupee();
          const rq=s.quests.find(q=>q.id==='rupees');
          if(rq&&!rq.done){rq.progress++;if(rq.progress>=rq.target)rq.done=true;}
        }
      });

      if(s.enemies.every(e=>!e.alive)){
        s.levelComplete=true; GameAudio.win();
        setUi(u=>({...u,score:s.score,rupees:s.rupeeCount,levelComplete:true,quests:[...s.quests]}));
        return;
      }
      setUi(u=>({...u,hp:player.hp,score:s.score,rupees:s.rupeeCount,quests:[...s.quests]}));
    }

    function render() {
      const s=stateRef.current;
      ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
      for(let ty=0;ty<ROWS;ty++) for(let tx=0;tx<COLS;tx++) drawTile(tx,ty,s.theme);
      s.rupees.forEach(r=>drawRupee(r,s.frameCount));
      s.enemies.forEach(e=>drawEnemy(e,s.frameCount));
      drawPlayer(s.player,s.frameCount);
      drawHUD(s);
      if(s.gameOver){
        ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle='#e53935'; ctx.font='bold 44px monospace'; ctx.textAlign='center';
        ctx.fillText('GAME OVER',CANVAS_W/2,CANVAS_H/2-20);
        ctx.fillStyle='#fff'; ctx.font='20px monospace'; ctx.fillText(`Score: ${s.score}`,CANVAS_W/2,CANVAS_H/2+20);
        ctx.textAlign='left';
      }
      if(s.levelComplete){
        ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle='#ffd700'; ctx.font='bold 40px monospace'; ctx.textAlign='center';
        ctx.fillText(`DUNGEON ${currentLevel+1} CLEAR!`,CANVAS_W/2,CANVAS_H/2-40);
        ctx.fillStyle='#00e676'; ctx.font='18px monospace';
        const doneQ=s.quests.filter(q=>q.done).length;
        ctx.fillText(`Quests: ${doneQ}/${s.quests.length} ⭐`,CANVAS_W/2,CANVAS_H/2);
        ctx.fillStyle='#fff'; ctx.fillText(`Score: ${s.score} | 💎 ${s.rupeeCount}`,CANVAS_W/2,CANVAS_H/2+30);
        if(currentLevel+1>=ZELDA_LEVELS.length){ctx.fillStyle='#ffd700';ctx.font='bold 24px monospace';ctx.fillText('🏆 HYRULE SAVED! 🏆',CANVAS_W/2,CANVAS_H/2+65);}
        ctx.textAlign='left';
      }
    }

    function loop(){update();render();rafRef.current=requestAnimationFrame(loop);}
    rafRef.current=requestAnimationFrame(loop);
    return()=>{if(rafRef.current)cancelAnimationFrame(rafRef.current);};
  },[currentLevel]);

  const handleNextLevel=useCallback(()=>{
    const s=stateRef.current;
    const nextIdx=currentLevel+1;
    if(nextIdx>=ZELDA_LEVELS.length) resetGame();
    else loadLevel(nextIdx, s.score);
  },[currentLevel,loadLevel,resetGame]);

  const lvlData=ZELDA_LEVELS[currentLevel];
  return (
    <div className="bg-[#1a2a1a] flex flex-col items-center">
      {showLevelCard&&(
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85">
          <div className="text-center p-6">
            <div className="text-yellow-400 font-bold text-3xl mb-2" style={{fontFamily:'monospace'}}>DUNGEON {currentLevel+1}</div>
            <div className="text-emerald-300 text-lg mb-1" style={{fontFamily:'monospace'}}>{lvlData.theme.toUpperCase()} TEMPLE{lvlData.isBossLevel?' ⚠️ BOSS':''}</div>
            <div className="text-white/70 text-xs space-y-1 mt-3" style={{fontFamily:'monospace'}}>
              {lvlData.quests.map((q,i)=>(<div key={i}>◆ {q.label}</div>))}
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        className="w-full max-w-full block" style={{aspectRatio:`${CANVAS_W}/${CANVAS_H}`}} tabIndex={0}/>
      <div className="w-full bg-black/70 border-t border-white/10">
        <GameMobileControls keysRef={keysRef} variant="zelda"/>
      </div>
      {ui.levelComplete&&(
        <div className="p-4 flex justify-center gap-3">
          <button onClick={handleNextLevel} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold text-sm hover:opacity-90">
            {currentLevel+1>=ZELDA_LEVELS.length?'Play Again':'Next Dungeon →'}
          </button>
        </div>
      )}
      {ui.gameOver&&(
        <div className="p-4 flex justify-center">
          <button onClick={resetGame} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm hover:opacity-90">Try Again</button>
        </div>
      )}
    </div>
  );
}