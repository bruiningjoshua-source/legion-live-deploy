import React, { useEffect, useRef, useState, useCallback } from 'react';
import GameMobileControls from './GameMobileControls';
import GameAudio from './GameAudio';
import { DOUBLEDRAGON_LEVELS } from './GameLevelData';

const CANVAS_W = 800;
const CANVAS_H = 400;
const GROUND_Y = CANVAS_H - 60;
const PLAYER_SPEED = 3.5;
const PUNCH_RANGE = 60;
const KICK_RANGE = 80;

const BG_THEMES = {
  alley:     { sky1:'#08081a', sky2:'#1a1030', ground:'#1a1a28', groundLine:'#282838' },
  warehouse: { sky1:'#0a0808', sky2:'#180c08', ground:'#2a1a10', groundLine:'#3a2820' },
  park:      { sky1:'#081408', sky2:'#102010', ground:'#1a2a10', groundLine:'#2a3818' },
  docks:     { sky1:'#080c18', sky2:'#101828', ground:'#141820', groundLine:'#202830' },
  rooftop:   { sky1:'#100818', sky2:'#201020', ground:'#1a1820', groundLine:'#2a2830' },
  subway:    { sky1:'#080808', sky2:'#141414', ground:'#181818', groundLine:'#242424' },
  factory:   { sky1:'#0c0808', sky2:'#1c1010', ground:'#201818', groundLine:'#302828' },
  slums:     { sky1:'#0a0808', sky2:'#180e08', ground:'#1e1610', groundLine:'#2e2618' },
  casino:    { sky1:'#100808', sky2:'#200c10', ground:'#201010', groundLine:'#302020' },
  lair:      { sky1:'#040408', sky2:'#0c0814', ground:'#100c18', groundLine:'#1a1428' },
};

function clamp(v,lo,hi){ return Math.max(lo,Math.min(hi,v)); }

function createStateFromLevel(lvlData, carry) {
  return {
    player: { x:80, y:GROUND_Y-44, w:30, h:44, hp:6, maxHp:6, facing:1, attackTimer:0, attackType:null, kickTimer:0, iframes:0, frame:0 },
    camera: { x:0 },
    enemies: JSON.parse(JSON.stringify(lvlData.enemies)),
    score: carry?.score||0,
    gameOver: false,
    win: false,
    levelComplete: false,
    frameCount: 0,
    worldW: lvlData.worldW,
    quests: JSON.parse(JSON.stringify(lvlData.quests)),
    bgTheme: lvlData.bgTheme,
    gruntKills: 0,
    heavyKills: 0,
    isBossLevel: lvlData.isBossLevel,
  };
}

export default function DoubleDragonGame() {
  const canvasRef = useRef(null);
  const stateRef = useRef(createStateFromLevel(DOUBLEDRAGON_LEVELS[0]));
  const keysRef = useRef({});
  const rafRef = useRef(null);
  const [currentLevel, setCurrentLevel] = useState(0);
  const [ui, setUi] = useState({ hp:6, score:0, gameOver:false, levelComplete:false, level:1, quests:[] });
  const [showLevelCard, setShowLevelCard] = useState(true);

  const loadLevel = useCallback((lvlIdx, carry) => {
    if(rafRef.current) cancelAnimationFrame(rafRef.current);
    stateRef.current = createStateFromLevel(DOUBLEDRAGON_LEVELS[lvlIdx], carry);
    setCurrentLevel(lvlIdx);
    setShowLevelCard(true);
    setUi({ hp:6, score:carry?.score||0, gameOver:false, levelComplete:false, level:lvlIdx+1, quests:stateRef.current.quests });
    setTimeout(()=>setShowLevelCard(false), 2500);
  }, []);

  const resetGame = useCallback(()=>loadLevel(0,null), [loadLevel]);

  useEffect(()=>{
    const d=(e)=>{keysRef.current[e.code]=true;}; const u=(e)=>{keysRef.current[e.code]=false;};
    window.addEventListener('keydown',d); window.addEventListener('keyup',u);
    return()=>{window.removeEventListener('keydown',d); window.removeEventListener('keyup',u);};
  },[]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas) return;
    const ctx=canvas.getContext('2d');

    function drawBg(camX) {
      const s=stateRef.current;
      const th=BG_THEMES[s.bgTheme]||BG_THEMES.alley;

      const sky=ctx.createLinearGradient(0,0,0,CANVAS_H*0.55);
      sky.addColorStop(0,th.sky1); sky.addColorStop(1,th.sky2);
      ctx.fillStyle=sky; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);

      // Moon
      ctx.fillStyle='rgba(200,200,255,0.6)'; ctx.beginPath(); ctx.arc(80,45,22,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(220,220,255,0.9)'; ctx.beginPath(); ctx.arc(80,45,18,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(20,10,40,0.6)'; ctx.beginPath(); ctx.arc(88,42,16,0,Math.PI*2); ctx.fill();

      // Stars
      ctx.fillStyle='rgba(255,255,255,0.7)';
      [[150,20],[250,15],[380,25],[480,10],[550,30],[650,18],[720,22],[760,8]].forEach(([sx,sy])=>ctx.fillRect(sx,sy,2,2));

      // Background buildings
      const bldgData=[[0,200,60,200],[80,170,80,230],[200,155,55,245],[300,185,70,215],[420,160,65,240],[530,175,75,225],[660,150,85,250],[780,168,60,232]];
      bldgData.forEach(([bx,by,bw,bh])=>{
        const rx=((bx-camX*0.3)%(CANVAS_W+250)+CANVAS_W+250)%(CANVAS_W+250)-100;
        ctx.fillStyle='#140c24'; ctx.fillRect(rx,by,bw,bh);
        ctx.fillStyle='#1e1430'; ctx.fillRect(rx+bw*0.6,by-15,12,18); ctx.fillRect(rx+bw*0.2,by-8,5,12);
        for(let wy=by+15;wy<by+bh-10;wy+=22)
          for(let wx=rx+8;wx<rx+bw-8;wx+=18){
            const litVal=(Math.floor(wx/18)*3+Math.floor(wy/22))%7;
            ctx.fillStyle=litVal<2?'rgba(255,220,100,0.8)':litVal<3?'rgba(100,180,255,0.6)':'#0a0818';
            ctx.fillRect(wx,wy,9,13);
          }
      });

      // Neon signs
      [[90,42,'#ff0088','DANGER'],[320,55,'#00ffcc','NO EXIT'],[570,38,'#ffaa00','FIGHT!'],[750,48,'#ff4444','GAME']].forEach(([bx,by,col,text])=>{
        const rx=((bx-camX*0.2)%(CANVAS_W+300)+CANVAS_W+300)%(CANVAS_W+300)-150;
        ctx.fillStyle=col+'18'; ctx.fillRect(rx-14,by-10,text.length*13+28,36);
        ctx.strokeStyle=col+'cc'; ctx.lineWidth=2; ctx.strokeRect(rx-10,by-6,text.length*13+20,28);
        ctx.fillStyle=col; ctx.font='bold 15px monospace'; ctx.fillText(text,rx,by+15);
      });

      ctx.fillStyle='#1c1c30'; ctx.fillRect(0,CANVAS_H*0.55,CANVAS_W,CANVAS_H*0.45);
      ctx.fillStyle='#0c0c1a'; ctx.fillRect(0,CANVAS_H*0.55,CANVAS_W,4);
      ctx.fillStyle=th.ground; ctx.fillRect(0,GROUND_Y,CANVAS_W,CANVAS_H-GROUND_Y);
      ctx.fillStyle=th.groundLine; ctx.fillRect(0,GROUND_Y,CANVAS_W,5);
      for(let lx=-camX%64;lx<CANVAS_W;lx+=64){
        ctx.fillStyle='rgba(255,255,255,0.05)'; ctx.fillRect(lx,GROUND_Y+6,30,2); ctx.fillRect(lx+32,GROUND_Y+18,20,2);
      }
      // Puddles
      for(let px2=-camX%220;px2<CANVAS_W;px2+=220){
        const pg=ctx.createLinearGradient(px2,GROUND_Y+5,px2,GROUND_Y+25);
        pg.addColorStop(0,'rgba(100,80,180,0.3)'); pg.addColorStop(1,'rgba(50,40,100,0.1)');
        ctx.fillStyle=pg; ctx.beginPath(); ctx.ellipse(px2+50,GROUND_Y+15,40,10,0,0,Math.PI*2); ctx.fill();
      }
      // Debris
      ctx.fillStyle='#2a2038';
      for(let dx2=-camX%150;dx2<CANVAS_W;dx2+=150){ ctx.fillRect(dx2,GROUND_Y-3,16,6); ctx.fillRect(dx2+70,GROUND_Y-2,10,5); }
    }

    function drawCharacter(x, y, w, h, facing, opts={}) {
      const { color='#e8a030', shirtColor='#cc2020', hitFlash=false, type='grunt', isPlayer=false, frame=0, attackType=null, attackTimer=0, kickTimer=0 } = opts;
      ctx.fillStyle='rgba(0,0,0,0.4)'; ctx.beginPath(); ctx.ellipse(x+w/2,y+h+2,w/2-2,4,0,0,Math.PI*2); ctx.fill();
      ctx.save();
      if(facing<0){ ctx.translate(x+w/2,y+h/2); ctx.scale(-1,1); ctx.translate(-(x+w/2),-(y+h/2)); }
      const legOff=Math.sin(frame*0.24)*5;
      const bob=Math.abs(Math.sin(frame*0.24))*2;
      if(hitFlash) ctx.globalAlpha=0.5+Math.abs(Math.sin(frame*1.2))*0.5;
      // Boots
      const bootColor=isPlayer?'#1a1a2e':type==='boss'?'#1a0808':'#1a1008';
      ctx.fillStyle=bootColor;
      ctx.fillRect(x+1,y+h-9+legOff,w*0.38,9); ctx.fillRect(x+w*0.42,y+h-9-legOff,w*0.38,9);
      // Pants
      const pantsColor=isPlayer?'#1e3a6e':type==='boss'?'#3a1010':type==='heavy'?'#2a2820':'#2a2030';
      ctx.fillStyle=pantsColor;
      ctx.fillRect(x+2,y+h*0.56,w*0.35,h*0.32+legOff); ctx.fillRect(x+w*0.42,y+h*0.56,w*0.35,h*0.32-legOff);
      ctx.fillStyle='rgba(255,255,255,0.1)';
      ctx.fillRect(x+3,y+h*0.64,w*0.28,4); ctx.fillRect(x+w*0.44,y+h*0.64,w*0.28,4);
      // Belt
      ctx.fillStyle='#1a1a1a'; ctx.fillRect(x+1,y+h*0.53,w-2,6);
      ctx.fillStyle=isPlayer?'#d4a820':'#888'; ctx.fillRect(x+w/2-5,y+h*0.53,10,6);
      // Body
      ctx.fillStyle=shirtColor; ctx.fillRect(x+2,y+h*0.28-bob,w-4,h*0.27+bob);
      ctx.fillStyle='rgba(0,0,0,0.25)'; ctx.fillRect(x+w*0.55,y+h*0.28-bob,w*0.38,h*0.27+bob);
      ctx.fillStyle='rgba(255,255,255,0.12)'; ctx.fillRect(x+3,y+h*0.28-bob,w*0.25,h*0.12);
      // Kick
      if(attackType==='kick'&&kickTimer>8){
        ctx.fillStyle=pantsColor;
        const kickExt=(14-kickTimer)*5;
        ctx.fillRect(x+w*0.3,y+h*0.6,kickExt,12);
        ctx.fillStyle=bootColor; ctx.fillRect(x+w*0.3+kickExt,y+h*0.6,14,10);
      }
      // Arms
      if(type==='boss'){
        ctx.fillStyle='#aa3a10';
        ctx.fillRect(x-6,y+h*0.28,10,h*0.28); ctx.fillRect(x+w-4,y+h*0.28,10,h*0.28);
        ctx.fillStyle='#cc4a14';
        ctx.beginPath(); ctx.arc(x-2,y+h*0.26,8,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(x+w+2,y+h*0.26,8,0,Math.PI*2); ctx.fill();
      } else {
        ctx.fillStyle=color;
        ctx.fillRect(x-5,y+h*0.28-bob,9,h*0.25); ctx.fillRect(x+w-4,y+h*0.28-bob,9,h*0.25);
        if(attackType==='punch'&&attackTimer>6){
          const punchExt=(12-attackTimer)*4;
          ctx.fillRect(x+w-2,y+h*0.28-bob,punchExt,10);
          ctx.beginPath(); ctx.arc(x+w-2+punchExt,y+h*0.33-bob,8,0,Math.PI*2); ctx.fill();
          if(attackTimer<4){
            ctx.fillStyle='#ffee00'; ctx.font='14px sans-serif'; ctx.textAlign='center';
            ctx.fillText('✦',x+w+punchExt,y+h*0.3-bob); ctx.textAlign='left';
          }
        } else {
          ctx.beginPath(); ctx.arc(x-1,y+h*0.5-bob,6,0,Math.PI*2); ctx.fill();
          ctx.beginPath(); ctx.arc(x+w+1,y+h*0.5-bob,6,0,Math.PI*2); ctx.fill();
        }
      }
      // Head
      const headR=w*0.3;
      ctx.fillStyle=color; ctx.beginPath(); ctx.arc(x+w/2,y+headR+2-bob,headR,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(0,0,0,0.2)'; ctx.beginPath(); ctx.arc(x+w/2,y+headR*1.5-bob,headR*0.7,0,Math.PI); ctx.fill();
      ctx.fillStyle='#1a1010';
      ctx.fillRect(x+w/2+2,y+headR*0.7-bob,5,5); ctx.fillRect(x+w/2-7,y+headR*0.7-bob,5,5);
      ctx.fillStyle='rgba(255,255,255,0.7)'; ctx.fillRect(x+w/2+3,y+headR*0.7-bob+1,2,2);
      if(type==='boss'){ ctx.fillStyle='#ff0000'; ctx.fillRect(x+w/2+3,y+headR*0.7-bob,3,4); ctx.fillRect(x+w/2-6,y+headR*0.7-bob,3,4); }
      if(isPlayer){
        ctx.fillStyle='#cc2020'; ctx.fillRect(x+w/2-headR,y+2-bob,headR*2,headR*0.45);
        ctx.fillStyle='#1a1a2e'; ctx.fillRect(x+w/2-headR+2,y-bob,headR*2-4,5);
        ctx.fillStyle='#cc2020'; ctx.fillRect(x+w-3,y+headR*0.2-bob,8,5);
      } else if(type==='boss'){
        ctx.fillStyle='#2a0808'; ctx.fillRect(x+w/2-headR,y-bob,headR*2,headR*0.5);
        ctx.fillStyle='#ff2200';
        for(let si=0;si<3;si++) ctx.fillRect(x+w/2-5+si*6,y-10-bob,4,12);
      } else {
        ctx.fillStyle='#8B0000'; ctx.fillRect(x+w/2-headR,y+headR*0.1-bob,headR*2,headR*0.4);
        ctx.fillStyle='#400000'; ctx.fillRect(x+w/2-headR+2,y-2-bob,headR*2-4,6);
      }
      ctx.restore();
    }

    function drawHUD(s) {
      ctx.fillStyle='rgba(0,0,0,0.75)'; ctx.fillRect(0,0,CANVAS_W,42);
      for(let i=0;i<s.player.maxHp;i++){
        ctx.fillStyle=i<s.player.hp?'#e53935':'#333'; ctx.font='17px sans-serif'; ctx.fillText('♥',10+i*22,28);
      }
      ctx.fillStyle='#ffd700'; ctx.font='bold 12px monospace'; ctx.fillText(`SCORE: ${s.score}`,200,26);
      const alive=s.enemies.filter(e=>e.alive).length;
      ctx.fillStyle='#ff8080'; ctx.fillText(`THUGS: ${alive}`,400,26);
      ctx.fillStyle='#ffd700'; ctx.textAlign='center'; ctx.font='bold 10px monospace';
      ctx.fillText(`STREET ${currentLevel+1} - ${(s.bgTheme||'').toUpperCase()}`,CANVAS_W/2,14);
      ctx.textAlign='left';
      const doneQ=s.quests.filter(q=>q.done).length;
      ctx.fillStyle='rgba(255,100,100,0.1)'; ctx.fillRect(CANVAS_W-170,0,170,42);
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
      s.frameCount++; player.frame=s.frameCount;
      if(player.iframes>0) player.iframes--;
      if(player.attackTimer>0) player.attackTimer--; else player.attackType=null;
      if(player.kickTimer>0) player.kickTimer--;
      let vx=0, vy=0;
      if(keys['ArrowLeft']||keys['KeyA']){vx=-PLAYER_SPEED;player.facing=-1;}
      if(keys['ArrowRight']||keys['KeyD']){vx=PLAYER_SPEED;player.facing=1;}
      if(keys['ArrowUp']||keys['KeyW']) vy=-PLAYER_SPEED*0.6;
      if(keys['ArrowDown']||keys['KeyS']) vy=PLAYER_SPEED*0.6;
      if(keys['KeyZ']&&player.attackTimer===0){player.attackType='punch';player.attackTimer=12;GameAudio.attack();}
      if(keys['KeyX']&&player.kickTimer===0){player.attackType='kick';player.kickTimer=14;player.attackTimer=14;GameAudio.kick();}
      player.x=clamp(player.x+vx,0,s.worldW-player.w);
      player.y=clamp(player.y+vy,GROUND_Y-80,GROUND_Y-player.h);

      if(player.attackType==='punch'&&player.attackTimer>8){
        s.enemies.forEach((e)=>{
          if(!e.alive) return;
          if(Math.abs(e.x+e.w/2-(player.x+player.w/2))<PUNCH_RANGE&&Math.abs(e.y-player.y)<40){
            e.hp--; e.stateTimer=30; e.state='stagger';
            if(e.hp<=0){
              e.alive=false; s.score+=e.type==='boss'?1500:e.type==='heavy'?400:100;
              GameAudio.stomp();
              if(e.type==='grunt'){
                s.gruntKills++;
                const gq=s.quests.find(q=>q.id==='grunts');
                if(gq&&!gq.done){gq.progress++;if(gq.progress>=gq.target)gq.done=true;}
              }
              if(e.type==='heavy'){
                s.heavyKills++;
                const hq=s.quests.find(q=>q.id==='heavies');
                if(hq&&!hq.done){hq.progress++;if(hq.progress>=hq.target)hq.done=true;}
              }
              if(e.type==='boss'){const bq=s.quests.find(q=>q.id==='boss');if(bq){bq.progress=1;bq.done=true;}}
            }
          }
        });
      }
      if(player.attackType==='kick'&&player.kickTimer>10){
        s.enemies.forEach((e)=>{
          if(!e.alive) return;
          if(Math.abs(e.x+e.w/2-(player.x+player.w/2))<KICK_RANGE&&Math.abs(e.y-player.y)<50){
            e.hp-=2; e.stateTimer=40; e.state='stagger'; e.x+=player.facing*30;
            if(e.hp<=0){
              e.alive=false; s.score+=e.type==='boss'?2000:e.type==='heavy'?500:150;
              GameAudio.stomp();
              if(e.type==='grunt'){s.gruntKills++;const gq=s.quests.find(q=>q.id==='grunts');if(gq&&!gq.done){gq.progress++;if(gq.progress>=gq.target)gq.done=true;}}
              if(e.type==='heavy'){s.heavyKills++;const hq=s.quests.find(q=>q.id==='heavies');if(hq&&!hq.done){hq.progress++;if(hq.progress>=hq.target)hq.done=true;}}
              if(e.type==='boss'){const bq=s.quests.find(q=>q.id==='boss');if(bq){bq.progress=1;bq.done=true;}}
            }
          }
        });
      }

      s.enemies.forEach((e)=>{
        if(!e.alive) return;
        e.frame++; e.stateTimer--;
        if(e.stateTimer<=0){
          if(e.state==='stagger'){e.state='chase';e.stateTimer=40;}
          else if(e.state==='attack'){e.state='chase';e.stateTimer=50;}
          else{e.state='chase';e.stateTimer=30+Math.random()*40;}
        }
        const dx=player.x-e.x, dy=player.y-e.y, d=Math.hypot(dx,dy);
        e.facing=dx>0?1:-1;
        if(e.state==='chase'){
          const spd=e.type==='boss'?2.2:e.type==='heavy'?1.4:1.8;
          if(d>20){e.x+=(dx/d)*spd;e.y+=(dy/d)*spd*0.4;}
          else{e.state='attack';e.stateTimer=20;}
        }
        if(e.state==='attack'){
          const hitRange=e.type==='boss'?55:e.type==='heavy'?45:38;
          if(d<hitRange&&Math.abs(dy)<40&&player.iframes===0){
            const dmg=e.type==='boss'?2:1;
            player.hp-=dmg; player.iframes=70; GameAudio.hit();
            if(player.hp<=0){s.gameOver=true;GameAudio.gameOver();setUi(u=>({...u,hp:0,gameOver:true}));return;}
          }
        }
        e.x=clamp(e.x,0,s.worldW-e.w);
        e.y=clamp(e.y,GROUND_Y-80,GROUND_Y-e.h);
      });

      const targetCamX=player.x-CANVAS_W*0.35;
      s.camera.x+=(targetCamX-s.camera.x)*0.1;
      s.camera.x=Math.max(0,Math.min(s.camera.x,s.worldW-CANVAS_W));

      // advance quest when near end
      if(player.x>s.worldW*0.88){
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
      s.enemies.forEach((e)=>{
        if(!e.alive) return;
        const ex=e.x-camX;
        if(ex<-80||ex>CANVAS_W+80) return;
        const hitFlash=e.state==='stagger';
        drawCharacter(ex,e.y,e.w,e.h,e.facing,{
          color:e.type==='boss'?'#cc4400':e.type==='heavy'?'#cc8800':'#e8a030',
          shirtColor:e.type==='boss'?'#8B0000':e.type==='heavy'?'#333':'#1a1a7a',
          hitFlash, type:e.type, frame:e.frame,
        });
        if(e.type!=='grunt'){
          const bw=e.w+10;
          const maxHp=e.type==='boss'?DOUBLEDRAGON_LEVELS[currentLevel].enemies.find(en=>en.type==='boss')?.hp||20:e.type==='heavy'?DOUBLEDRAGON_LEVELS[currentLevel].enemies.find(en=>en.type==='heavy')?.hp||6:1;
          ctx.fillStyle='#333'; ctx.fillRect(ex-5,e.y-12,bw,6);
          ctx.fillStyle=e.type==='boss'?'#cc0000':'#e53935'; ctx.fillRect(ex-5,e.y-12,bw*(e.hp/maxHp),6);
        }
      });
      const px=s.player.x-camX;
      const hitFlash=s.player.iframes>0;
      drawCharacter(px,s.player.y,s.player.w,s.player.h,s.player.facing,{
        color:'#f5c5a0', shirtColor:'#1a4a8a', hitFlash, isPlayer:true,
        frame:s.player.frame, attackType:s.player.attackType, attackTimer:s.player.attackTimer, kickTimer:s.player.kickTimer,
      });
      drawHUD(s);
      if(s.gameOver){
        ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle='#e53935'; ctx.font='bold 54px monospace'; ctx.textAlign='center';
        ctx.fillText('K.O.!',CANVAS_W/2,CANVAS_H/2-20);
        ctx.fillStyle='#fff'; ctx.font='20px monospace'; ctx.fillText(`Score: ${s.score}`,CANVAS_W/2,CANVAS_H/2+20);
        ctx.textAlign='left';
      }
      if(s.levelComplete){
        ctx.fillStyle='rgba(0,0,0,0.85)'; ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
        ctx.fillStyle='#ffd700'; ctx.font='bold 38px monospace'; ctx.textAlign='center';
        ctx.fillText(`STREET ${currentLevel+1} CLEARED!`,CANVAS_W/2,CANVAS_H/2-40);
        ctx.fillStyle='#00e676'; ctx.font='18px monospace';
        const doneQ=s.quests.filter(q=>q.done).length;
        ctx.fillText(`Quests: ${doneQ}/${s.quests.length} ⭐`,CANVAS_W/2,CANVAS_H/2);
        ctx.fillStyle='#fff'; ctx.fillText(`Score: ${s.score}`,CANVAS_W/2,CANVAS_H/2+30);
        if(currentLevel+1>=DOUBLEDRAGON_LEVELS.length){ctx.fillStyle='#ffd700';ctx.font='bold 24px monospace';ctx.fillText('🏆 CITY SAVED! 🏆',CANVAS_W/2,CANVAS_H/2+65);}
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
    if(nextIdx>=DOUBLEDRAGON_LEVELS.length) resetGame();
    else loadLevel(nextIdx,{score:s.score});
  },[currentLevel,loadLevel,resetGame]);

  const lvlData=DOUBLEDRAGON_LEVELS[currentLevel];
  return (
    <div className="bg-black flex flex-col items-center">
      {showLevelCard&&(
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/85">
          <div className="text-center p-6">
            <div className="text-yellow-400 font-bold text-3xl mb-2" style={{fontFamily:'monospace'}}>STREET {currentLevel+1}</div>
            <div className="text-blue-300 text-lg mb-1" style={{fontFamily:'monospace'}}>{lvlData.bgTheme.toUpperCase()}{lvlData.isBossLevel?' ⚠️ BOSS FIGHT':''}</div>
            <div className="text-white/70 text-xs space-y-1 mt-3" style={{fontFamily:'monospace'}}>
              {lvlData.quests.map((q,i)=>(<div key={i}>◆ {q.label}</div>))}
            </div>
          </div>
        </div>
      )}
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
        className="w-full max-w-full block" style={{aspectRatio:`${CANVAS_W}/${CANVAS_H}`}} tabIndex={0}/>
      <div className="w-full bg-black/80 border-t border-white/10">
        <GameMobileControls keysRef={keysRef} variant="fighter"/>
      </div>
      {ui.levelComplete&&(
        <div className="p-4 flex justify-center gap-3">
          <button onClick={handleNextLevel} className="px-8 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-sm hover:opacity-90">
            {currentLevel+1>=DOUBLEDRAGON_LEVELS.length?'Play Again':'Next Street →'}
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