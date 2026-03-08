import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';
import GameAudio from './GameAudio';
import { METALSLUG_LEVELS } from './GameLevelData';

const CANVAS_W = 800;
const CANVAS_H = 400;
const GRAVITY = 0.45;
const PLAYER_SPEED = 4;
const JUMP_FORCE = -10;
const GROUND_Y = CANVAS_H - 60;
const BULLET_SPEED = 10;

const BG_THEMES = {
  desert:  { sky1:'#1a2040', sky2:'#d06020', ground:'#785030', groundLine:'#c8a060' },
  jungle:  { sky1:'#0a1a08', sky2:'#1a4010', ground:'#2a4a18', groundLine:'#3a6828' },
  snow:    { sky1:'#8ab0d0', sky2:'#c8e0f0', ground:'#d8e8f0', groundLine:'#ffffff' },
  factory: { sky1:'#0a0a10', sky2:'#1a1a2a', ground:'#2a2a3a', groundLine:'#3a3a5a' },
  city:    { sky1:'#1a1030', sky2:'#2a2048', ground:'#2a2a3a', groundLine:'#3a3a5a' },
  ruins:   { sky1:'#3a2010', sky2:'#8a5030', ground:'#5a3820', groundLine:'#8a5830' },
  volcano: { sky1:'#200808', sky2:'#5a1808', ground:'#3a1008', groundLine:'#6a2010' },
  ocean:   { sky1:'#102040', sky2:'#1840a0', ground:'#0a3060', groundLine:'#1060c0' },
  space:   { sky1:'#000008', sky2:'#080820', ground:'#0a0a18', groundLine:'#1a1a30' },
  final:   { sky1:'#080008', sky2:'#280028', ground:'#1a0018', groundLine:'#3a003a' },
};

function createStateFromLevel(lvlData, carry) {
  return {
    player: { x:60, y:GROUND_Y-36, w:28, h:36, vx:0, vy:0, onGround:false, facing:1, hp:5, maxHp:5, shootCooldown:0, iframes:0, frame:0 },
    camera: { x:0 },
    bullets: [],
    enemyBullets: [],
    enemies: JSON.parse(JSON.stringify(lvlData.enemies)),
    platforms: lvlData.platforms,
    score: carry?.score||0,
    gameOver: false,
    win: false,
    levelComplete: false,
    frameCount: 0,
    worldW: lvlData.worldW,
    quests: JSON.parse(JSON.stringify(lvlData.quests)),
    bgTheme: lvlData.bgTheme,
    soldierKills: 0,
    tankKills: 0,
    isBossLevel: lvlData.isBossLevel,
  };
}

export default function MetalSlugGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createStateFromLevel(METALSLUG_LEVELS[0]));
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [ui, setUi] = useState({hp:5,score:0,gameOver:false,levelComplete:false,level:1,quests:[]});
  const [showLevelCard, setShowLevelCard] = useState(true);

  const loadLevel = useCallback((lvlIdx, carry) => {
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    stateRef.current = createStateFromLevel(METALSLUG_LEVELS[lvlIdx], carry);
    setCurrentLevel(lvlIdx);
    setShowLevelCard(true);
    setUi({hp:5,score:carry?.score||0,gameOver:false,levelComplete:false,level:lvlIdx+1,quests:stateRef.current.quests});
    setTimeout(()=>setShowLevelCard(false), 2500);
  },[]);

  const resetGame = useCallback(()=>loadLevel(0,null),[loadLevel]);

  useEffect(()=>{
    const d=(e)=>{keysRef.current[e.code]=true;}; const u=(e)=>{keysRef.current[e.code]=false;};
    window.addEventListener('keydown',d); window.addEventListener('keyup',u);
    return()=>{window.removeEventListener('keydown',d);window.removeEventListener('keyup',u);};
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext('2d');

    function drawBg(camX) {
      const s=stateRef.current;
      const th=BG_THEMES[s.bgTheme]||BG_THEMES.desert;
      const sky=ctx.createLinearGradient(0,0,0,CANVAS_H*0.7);
      sky.addColorStop(0,th.sky1); sky.addColorStop(1,th.sky2);
      ctx.fillStyle=sky; ctx.fillRect(0,0,CANVAS_W,CANVAS_H*0.7);

      // Sun/moon
      if(s.bgTheme==='space'){
        ctx.fillStyle='rgba(255,255,255,0.9)';
        [[50,30],[200,20],[400,35],[600,15],[750,40]].forEach(([sx,sy])=>ctx.fillRect(sx,sy,2,2));
        ctx.fillStyle='rgba(200,200,255,0.8)'; ctx.beginPath(); ctx.arc(100,60,20,0,Math.PI*2); ctx.fill();
      } else {
        const sunGrad=ctx.createRadialGradient(CANVAS_W*0.8,70,10,CANVAS_W*0.8,70,80);
        sunGrad.addColorStop(0,'rgba(255,220,80,0.9)'); sunGrad.addColorStop(1,'rgba(255,80,20,0)');
        ctx.fillStyle=sunGrad; ctx.fillRect(0,0,CANVAS_W,200);
        ctx.fillStyle='#ffd040'; ctx.beginPath(); ctx.arc(CANVAS_W*0.8,70,28,0,Math.PI*2); ctx.fill();
      }

      // Background ruins/structures
      ctx.fillStyle=th.sky1==='#0a0a10'?'rgba(30,30,50,0.8)':'rgba(40,20,10,0.6)';
      [[80,180,60,160,camX*0.2],[250,160,80,200,camX*0.2],[500,175,50,180,camX*0.2],[700,165,65,190,camX*0.2]].forEach(([bx,by,bw,bh,off])=>{
        const rx=((bx-off)%(CANVAS_W+300)+CANVAS_W+300)%(CANVAS_W+300)-120;
        ctx.fillRect(rx,by,bw,bh);
        ctx.fillStyle='rgba(255,180,50,0.3)';
        for(let wy=by+15;wy<by+bh-10;wy+=24)
          for(let wx=rx+8;wx<rx+bw-8;wx+=18){
            const lit=(Math.floor(wx/18)+Math.floor(wy/24))%3!==0;
            ctx.fillStyle=lit?'rgba(255,180,50,0.5)':'rgba(0,0,0,0.3)'; ctx.fillRect(wx,wy,10,14);
          }
        ctx.fillStyle=th.sky1==='#0a0a10'?'rgba(30,30,50,0.8)':'rgba(40,20,10,0.6)';
      });

      ctx.fillStyle=th.ground; ctx.fillRect(0,GROUND_Y,CANVAS_W,CANVAS_H-GROUND_Y);
      ctx.fillStyle=th.groundLine; ctx.fillRect(0,GROUND_Y,CANVAS_W,6);
      ctx.fillStyle='rgba(0,0,0,0.2)';
      for(let cx2=-camX%60;cx2<CANVAS_W;cx2+=60){ctx.fillRect(cx2,GROUND_Y+8,25,3); ctx.fillRect(cx2+30,GROUND_Y+15,15,2);}
    }

    function drawPlatforms(platforms, camX) {
      platforms.forEach((p)=>{
        const px=p.x-camX;
        if(px+p.w<0||px>CANVAS_W) return;
        if(p.h>=50) return;
        ctx.fillStyle='#5a5040'; ctx.fillRect(px,p.y,p.w,p.h);
        ctx.fillStyle='#6a6050'; ctx.fillRect(px+2,p.y+2,p.w-4,p.h-4);
        ctx.fillStyle='#b0a080'; ctx.fillRect(px,p.y,p.w,3);
        ctx.fillStyle='#888070';
        for(let rx2=px+8;rx2<px+p.w-4;rx2+=20){ctx.beginPath();ctx.arc(rx2,p.y+p.h/2,3,0,Math.PI*2);ctx.fill();}
        ctx.fillStyle='#2a2010'; ctx.fillRect(px,p.y+p.h-2,p.w,2);
      });
    }

    function drawPlayer(p, camX, frame) {
      const px=p.x-camX;
      if(p.iframes>0&&Math.floor(p.iframes/4)%2===0) return;
      const legOff=p.onGround?Math.sin(frame*0.28)*4:0;
      ctx.fillStyle='rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(px+p.w/2,p.y+p.h+2,12,4,0,0,Math.PI*2); ctx.fill();
      ctx.save();
      if(p.facing<0){ctx.translate(px+p.w,p.y+p.h/2);ctx.scale(-1,1);ctx.translate(-(px+p.w),-(p.y+p.h/2));}
      ctx.fillStyle='#2a2010'; ctx.fillRect(px+1,p.y+p.h-8+legOff,12,8); ctx.fillRect(px+p.w-13,p.y+p.h-8-legOff,12,8);
      ctx.fillStyle='#4a5a30'; ctx.fillRect(px+3,p.y+24,10,12+legOff); ctx.fillRect(px+p.w-13,p.y+24,10,12-legOff);
      ctx.fillStyle='#3a4820'; ctx.fillRect(px+5,p.y+26,4,3); ctx.fillRect(px+p.w-10,p.y+28,3,3);
      ctx.fillStyle='#4a6838'; ctx.fillRect(px+2,p.y+16,p.w-4,12);
      ctx.fillStyle='#5a7848'; ctx.fillRect(px+3,p.y+17,5,9);
      ctx.fillStyle='#8a7050'; ctx.fillRect(px+8,p.y+18,2,10);
      ctx.fillStyle='#4a6838'; ctx.fillRect(px+p.w-1,p.y+16,5,8);
      ctx.fillStyle='#2a2a2a'; ctx.fillRect(px+p.w+2,p.y+14,14,7);
      ctx.fillStyle='#404040'; ctx.fillRect(px+p.w+3,p.y+15,10,4);
      ctx.fillStyle='#1a1a1a'; ctx.fillRect(px+p.w+12,p.y+16,6,3);
      if(p.shootCooldown>8){
        ctx.fillStyle='#ffcc00'; ctx.beginPath(); ctx.arc(px+p.w+20,p.y+17,5,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff6600'; ctx.beginPath(); ctx.arc(px+p.w+20,p.y+17,3,0,Math.PI*2); ctx.fill();
      }
      ctx.fillStyle='#4a6838'; ctx.fillRect(px-3,p.y+18,6,8);
      ctx.fillStyle='#2a4a20'; ctx.fillRect(px+4,p.y+2,p.w-8,12); ctx.fillRect(px+3,p.y+8,p.w-6,6);
      ctx.fillStyle='#1a3010'; ctx.fillRect(px+2,p.y+12,p.w-4,3);
      ctx.fillStyle='#20304a'; ctx.fillRect(px+5,p.y+4,p.w-10,6);
      ctx.fillStyle='#304050'; ctx.fillRect(px+6,p.y+5,6,3);
      ctx.fillStyle='#d8b070'; ctx.fillRect(px+5,p.y+14,p.w-10,6);
      ctx.fillStyle='#1a1a2e'; ctx.fillRect(px+10,p.y+15,4,4);
      ctx.restore();
    }

    function drawEnemy(e, camX, frame) {
      if(!e.alive) return;
      const ex=e.x-camX;
      if(ex+e.w<-20||ex>CANVAS_W+20) return;
      const legOff=Math.sin(frame*0.22)*2;
      ctx.fillStyle='rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(ex+e.w/2,e.y+e.h+2,e.w/2-2,3,0,0,Math.PI*2); ctx.fill();
      ctx.save();
      if(e.facing>0){ctx.translate(ex+e.w,e.y+e.h/2);ctx.scale(-1,1);ctx.translate(-(ex+e.w),-(e.y+e.h/2));}
      if(e.type==='tank'){
        ctx.fillStyle='#2a2010'; ctx.fillRect(ex-2,e.y+e.h-14,e.w+4,14);
        ctx.fillStyle='#4a3820';
        for(let tx2=ex;tx2<ex+e.w;tx2+=10) ctx.fillRect(tx2,e.y+e.h-12,8,10);
        ctx.fillStyle='#6a5830'; ctx.fillRect(ex-2,e.y+e.h-14,e.w+4,3);
        ctx.fillStyle='#7a6830'; ctx.fillRect(ex+2,e.y+14,e.w-4,e.h-24);
        ctx.fillStyle='#9a8848'; ctx.fillRect(ex+4,e.y+16,e.w-12,8);
        ctx.fillStyle='#8a7838'; ctx.beginPath(); ctx.arc(ex+e.w/2,e.y+16,18,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#a09050'; ctx.beginPath(); ctx.arc(ex+e.w/2-2,e.y+14,14,Math.PI,0); ctx.fill();
        ctx.fillStyle='#4a4030'; ctx.fillRect(ex+e.w-4,e.y+10,24,8);
        ctx.fillStyle='#5a5030'; ctx.beginPath(); ctx.arc(ex+e.w/2,e.y+8,6,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#1a1a1a'; ctx.fillRect(ex,e.y-12,e.w,8);
        const maxHp=METALSLUG_LEVELS[currentLevel]?.enemies.find(en=>en.type==='tank')?.hp||6;
        ctx.fillStyle='#cc4400'; ctx.fillRect(ex+1,e.y-11,(e.w-2)*(e.hp/Math.max(e.hp,maxHp)),6);
      } else if(e.type==='boss'){
        ctx.fillStyle='#4a2010'; ctx.fillRect(ex+5,e.y+e.h-20,18,20); ctx.fillRect(ex+e.w-23,e.y+e.h-20,18,20);
        ctx.fillStyle='#8B2000'; ctx.fillRect(ex+2,e.y+15,e.w-4,e.h-30);
        ctx.fillStyle='#aa3010'; ctx.fillRect(ex+4,e.y+17,e.w-12,e.h-38);
        ctx.fillStyle='#3a3a3a'; ctx.fillRect(ex-12,e.y+18,16,30); ctx.fillRect(ex+e.w-4,e.y+18,16,30);
        ctx.fillStyle='#222'; ctx.fillRect(ex-14,e.y+26,4,14); ctx.fillRect(ex+e.w+10,e.y+26,4,14);
        ctx.fillStyle='#5a1000'; ctx.fillRect(ex+12,e.y,e.w-24,18);
        ctx.fillStyle='#ff2200'; ctx.fillRect(ex+14,e.y+4,e.w-28,8);
        ctx.fillStyle='#ff0000';
        for(let i=0;i<3;i++) ctx.beginPath(),ctx.arc(ex+20+i*10,e.y+8,3,0,Math.PI*2),ctx.fill();
        ctx.fillStyle='#1a1a1a'; ctx.fillRect(ex-2,e.y-14,e.w+4,10);
        ctx.fillStyle='#dd0000'; ctx.fillRect(ex,e.y-13,e.w*(e.hp/e.hp),8);
        const bossMaxHp=METALSLUG_LEVELS[currentLevel]?.enemies.find(en=>en.type==='boss')?.hp||20;
        ctx.fillStyle='#dd0000'; ctx.fillRect(ex,e.y-13,e.w*(e.hp/bossMaxHp),8);
        ctx.fillStyle='#ff3300'; ctx.fillRect(ex,e.y-13,e.w*(e.hp/bossMaxHp)*0.4,4);
        ctx.fillStyle='#fff'; ctx.font='bold 8px monospace'; ctx.textAlign='center'; ctx.fillText('BOSS',ex+e.w/2,e.y-18); ctx.textAlign='left';
      } else {
        ctx.fillStyle='#1a1408'; ctx.fillRect(ex+2,e.y+e.h-8+legOff,11,8); ctx.fillRect(ex+e.w-13,e.y+e.h-8-legOff,11,8);
        ctx.fillStyle='#4a3020'; ctx.fillRect(ex+3,e.y+22,10,12+legOff); ctx.fillRect(ex+e.w-13,e.y+22,10,12-legOff);
        ctx.fillStyle='#6a1810'; ctx.fillRect(ex+3,e.y+13,e.w-6,12);
        ctx.fillStyle='#2a2a2a'; ctx.fillRect(ex+e.w-2,e.y+17,16,5); ctx.fillStyle='#1a1a1a'; ctx.fillRect(ex+e.w+10,e.y+18,5,3);
        ctx.fillStyle='#6a1810'; ctx.fillRect(ex+e.w-2,e.y+15,5,8);
        ctx.fillStyle='#4a2808'; ctx.fillRect(ex+4,e.y+2,e.w-8,10); ctx.fillRect(ex+3,e.y+8,e.w-6,5);
        ctx.fillStyle='#3a1a04'; ctx.fillRect(ex+2,e.y+11,e.w-4,3);
        ctx.fillStyle='#c89060'; ctx.fillRect(ex+5,e.y+12,e.w-10,8);
        ctx.fillStyle='#1a1a2e'; ctx.fillRect(ex+8,e.y+14,4,4);
      }
      ctx.restore();
    }

    function drawBullets(bullets, enemyBullets, camX) {
      bullets.forEach((b)=>{
        const bx=b.x-camX; if(bx<-10||bx>CANVAS_W+10) return;
        ctx.fillStyle='rgba(255,150,0,0.4)'; ctx.beginPath(); ctx.ellipse(bx-b.vx*1.5,b.y,10,3,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffee00'; ctx.beginPath(); ctx.ellipse(bx,b.y,9,4,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ffffc0'; ctx.beginPath(); ctx.ellipse(bx-2,b.y-1,5,2,0,0,Math.PI*2); ctx.fill();
      });
      enemyBullets.forEach((b)=>{
        const bx=b.x-camX; if(bx<-10||bx>CANVAS_W+10) return;
        ctx.fillStyle='rgba(255,40,0,0.35)'; ctx.beginPath(); ctx.ellipse(bx-b.vx*1.2,b.y,8,3,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff4040'; ctx.beginPath(); ctx.ellipse(bx,b.y,8,4,0,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#ff9090'; ctx.beginPath(); ctx.ellipse(bx-1,b.y-1,4,2,0,0,Math.PI*2); ctx.fill();
      });
    }

    function drawHUD(s) {
      ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,CANVAS_W,42);
      for(let i=0;i<s.player.maxHp;i++){
        ctx.fillStyle=i<s.player.hp?'#e53935':'#444'; ctx.font='18px sans-serif'; ctx.fillText('♥',10+i*22,28);
      }
      ctx.fillStyle='#ffd700'; ctx.font='bold 12px monospace'; ctx.fillText(`SCORE: ${s.score}`,180,26);
      const alive=s.enemies.filter(e=>e.alive).length;
      ctx.fillStyle='#fff'; ctx.fillText(`ENEMIES: ${alive}`,370,26);
      ctx.fillStyle='#ffd700'; ctx.textAlign='center'; ctx.font='bold 10px monospace';
      ctx.fillText(`MISSION ${currentLevel+1} - ${(s.bgTheme||'').toUpperCase()}`,CANVAS_W/2,14);
      ctx.textAlign='left';
      const doneQ=s.quests.filter(q=>q.done).length;
      ctx.fillStyle='rgba(255,200,0,0.1)'; ctx.fillRect(CANVAS_W-170,0,170,42);
      ctx.fillStyle='#ffd700'; ctx.font='bold 9px monospace'; ctx.textAlign='right';
      ctx.fillText(`QUESTS ${doneQ}/${s.quests.length}`,CANVAS_W-4,14);
      s.quests.slice(0,2).forEach((q,qi)=>{
        ctx.fillStyle=q.done?'#00e676':'#fff'; ctx.font='8px monospace';
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
      if(player.shootCooldown>0) player.shootCooldown--;
      player.frame=s.frameCount;
      const left=keys['ArrowLeft']||keys['KeyA'];
      const right=keys['ArrowRight']||keys['KeyD'];
      const jump=keys['ArrowUp']||keys['KeyW']||keys['Space'];
      const shoot=keys['KeyZ']||keys['KeyX'];
      if(left){player.vx=-PLAYER_SPEED;player.facing=-1;}
      else if(right){player.vx=PLAYER_SPEED;player.facing=1;}
      else{player.vx*=0.8;}
      if(jump&&player.onGround){player.vy=JUMP_FORCE;player.onGround=false;GameAudio.jump();}
      if(shoot&&player.shootCooldown===0){
        player.shootCooldown=12; GameAudio.shoot();
        s.bullets.push({x:player.x+player.w/2,y:player.y+18,vx:BULLET_SPEED*player.facing,age:0});
      }
      player.vy+=GRAVITY; player.x+=player.vx; player.y+=player.vy;
      if(player.x<0){player.x=0;player.vx=0;}
      player.onGround=false;
      for(const p of s.platforms){
        if(player.x+player.w>p.x&&player.x<p.x+p.w&&player.y+player.h>p.y&&player.y+player.h<p.y+p.h+12&&player.vy>=0){
          player.y=p.y-player.h;player.vy=0;player.onGround=true;
        }
      }
      if(player.y>CANVAS_H+50){s.gameOver=true;GameAudio.gameOver();setUi(u=>({...u,gameOver:true}));return;}
      s.bullets=s.bullets.filter(b=>{
        b.x+=b.vx; b.age++;
        if(b.age>70) return false;
        let hit=false;
        s.enemies.forEach((e)=>{
          if(!e.alive||hit) return;
          if(b.x>e.x&&b.x<e.x+e.w&&b.y>e.y&&b.y<e.y+e.h){
            e.hp--;hit=true;
            if(e.hp<=0){
              e.alive=false; s.score+=e.type==='boss'?2000:e.type==='tank'?500:100;
              GameAudio.stomp();
              if(e.type==='soldier'){
                s.soldierKills++;
                const sq=s.quests.find(q=>q.id==='soldiers');
                if(sq&&!sq.done){sq.progress++;if(sq.progress>=sq.target)sq.done=true;}
              }
              if(e.type==='tank'){
                s.tankKills++;
                const tq=s.quests.find(q=>q.id==='tanks');
                if(tq&&!tq.done){tq.progress++;if(tq.progress>=tq.target)tq.done=true;}
              }
              if(e.type==='boss'){const bq=s.quests.find(q=>q.id==='boss');if(bq){bq.progress=1;bq.done=true;}}
            }
          }
        });
        return !hit;
      });
      s.enemies.forEach((e)=>{
        if(!e.alive) return;
        const dx=player.x-e.x; e.facing=dx>0?1:-1;
        e.shootTimer--;
        if(e.shootTimer<=0){
          e.shootTimer=e.type==='boss'?35:e.type==='tank'?50:75;
          const bvx=e.facing*(e.type==='boss'?7:6);
          s.enemyBullets.push({x:e.x+e.w/2,y:e.y+e.h*0.4,vx:bvx,age:0});
          if(e.type==='boss') s.enemyBullets.push({x:e.x+e.w/2,y:e.y+e.h*0.6,vx:bvx,age:0});
        }
      });
      s.enemyBullets=s.enemyBullets.filter(b=>{
        b.x+=b.vx;b.age++;
        if(b.age>80) return false;
        if(player.iframes===0&&b.x>player.x&&b.x<player.x+player.w&&b.y>player.y&&b.y<player.y+player.h){
          player.hp--;player.iframes=80;GameAudio.hit();
          if(player.hp<=0){s.gameOver=true;GameAudio.gameOver();setUi(u=>({...u,hp:0,gameOver:true}));}
          return false;
        }
        return true;
      });
      const targetCamX=player.x-CANVAS_W*0.35;
      s.camera.x+=(targetCamX-s.camera.x)*0.1;
      s.camera.x=Math.max(0,Math.min(s.camera.x,s.worldW-CANVAS_W));
      // advance quest
      if(player.x>s.worldW*0.9){
        const aq=s.quests.find(q=>q.id==='advance');
        if(aq&&!aq.done){aq.progress=1;aq.done=true;}
      }
      if(s.enemies.every(e=>!e.alive)){
        const aq=s.quests.find(q=>q.id==='advance');
        if(aq&&!aq.done){aq.progress=1;aq.done=true;}
        s.levelComplete=true; GameAudio.win();
        setUi(u=>({...u,score:s.score,levelComplete:true,quests:[...s.quests]}));
        return;
      }
      setUi(u=>({...u,hp:player.hp,score:s.score,quests:[...s.quests]}));
    }

    function render() {
      const s=stateRef.current;
      const camX=s.camera.x;
      ctx.clearRect(0,0,CANVAS_W,CANVAS_H);
      drawBg(camX);
      drawPlatforms(s.platforms,camX);
      drawBullets(s.bullets,s.enemyBullets,camX);
      s.enemies.forEach(e=>drawEnemy(e,camX,s.frameCount));
      drawPlayer(s.player,camX,s.frameCount);
      drawHUD(s);
      if(s.gameOver){
        ctx.fillStyle='rgba(0,0,0,0.8)'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle='#e53935'; ctx.font='bold 44px monospace'; ctx.textAlign='center';
        ctx.fillText('MISSION FAILED',CANVAS_W/2,CANVAS_H/2-20);
        ctx.fillStyle='#fff'; ctx.font='20px monospace'; ctx.fillText(`Score: ${s.score}`,CANVAS_W/2,CANVAS_H/2+20);
        ctx.textAlign='left';
      }
      if(s.levelComplete){
        ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle='#ffd700'; ctx.font='bold 40px monospace'; ctx.textAlign='center';
        ctx.fillText(`MISSION ${currentLevel+1} COMPLETE!`,CANVAS_W/2,CANVAS_H/2-40);
        ctx.fillStyle='#00e676'; ctx.font='18px monospace';
        const doneQ=s.quests.filter(q=>q.done).length;
        ctx.fillText(`Quests: ${doneQ}/${s.quests.length} ⭐`,CANVAS_W/2,CANVAS_H/2);
        ctx.fillStyle='#fff'; ctx.fillText(`Score: ${s.score}`,CANVAS_W/2,CANVAS_H/2+30);
        if(currentLevel+1>=METALSLUG_LEVELS.length){ctx.fillStyle='#ffd700';ctx.font='bold 24px monospace';ctx.fillText('🏆 WAR IS OVER! 🏆',CANVAS_W/2,CANVAS_H/2+65);}
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
    if(nextIdx>=METALSLUG_LEVELS.length) resetGame();
    else loadLevel(nextIdx,{score:s.score});
  },[currentLevel,loadLevel,resetGame]);

  const lvlData=METALSLUG_LEVELS[currentLevel];
  return (
    <div className="bg-black flex flex-col items-center">
      {showLevelCard&&(
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85">
          <div className="text-center p-6">
            <div className="text-yellow-400 font-bold text-3xl mb-2" style={{fontFamily:'monospace'}}>MISSION {currentLevel+1}</div>
            <div className="text-orange-300 text-lg mb-1" style={{fontFamily:'monospace'}}>{lvlData.bgTheme.toUpperCase()} ZONE{lvlData.isBossLevel?' ⚠️ BOSS BATTLE':''}</div>
            <div className="text-white/70 text-xs space-y-1 mt-3" style={{fontFamily:'monospace'}}>
              {lvlData.quests.map((q,i)=>(<div key={i}>◆ {q.label}</div>))}
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        className="w-full max-w-full block" style={{aspectRatio:`${CANVAS_W}/${CANVAS_H}`}} tabIndex={0}/>
      <div className="w-full bg-black/80 border-t border-white/10">
        <GameMobileControls keysRef={keysRef} variant="shooter"/>
      </div>
      {ui.levelComplete&&(
        <div className="p-4 flex justify-center gap-3">
          <button onClick={handleNextLevel} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-yellow-600 to-amber-500 text-white font-bold text-sm hover:opacity-90">
            {currentLevel+1>=METALSLUG_LEVELS.length?'Play Again':'Next Mission →'}
          </button>
        </div>
      )}
      {ui.gameOver&&(
        <div className="p-4 flex justify-center">
          <button onClick={resetGame} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold text-sm">Try Again</button>
        </div>
      )}
    </div>
  );
}