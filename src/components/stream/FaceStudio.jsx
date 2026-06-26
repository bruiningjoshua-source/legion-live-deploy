/**
 * FaceStudio — Snapchat-quality AR filter panel for Legion Live.
 * Uses MediaPipe for face + body tracking, WebGL + Canvas for rendering.
 * 80 filters from AdvancedFilters.jsx, 7 particle FX, 6 virtual backgrounds.
 */
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Layers, Search, Star, Wand2, Camera, ZoomIn } from 'lucide-react';
import { ADVANCED_FILTERS, FILTER_CATEGORIES, getTrendingFilters, getFilterById } from '@/components/ar/AdvancedFilters';

const WASM_BASE  = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm';
const FACE_MODEL = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';
const SEG_MODEL  = 'https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite';

// ── Virtual Backgrounds ────────────────────────────────────────────────────
const BACKGROUNDS = [
  { id:'none',        name:'Camera',        emoji:'📷' },
  { id:'blur',        name:'Blur',          emoji:'🌫️' },
  { id:'neon_city',   name:'Neon City',     emoji:'🌆' },
  { id:'galaxy',      name:'Galaxy',        emoji:'🌌' },
  { id:'sunset',      name:'Sunset',        emoji:'🌅' },
  { id:'grid',        name:'Neon Grid',     emoji:'🔮' },
  { id:'forest',      name:'Dark Forest',   emoji:'🌲' },
  { id:'underwater',  name:'Underwater',    emoji:'🌊' },
  { id:'cyberpunk_bg',name:'Cyberpunk',     emoji:'🏙️' },
  { id:'aurora',      name:'Aurora',        emoji:'🌌' },
  { id:'studio',      name:'Studio',        emoji:'🎬' },
  { id:'lava',        name:'Lava World',    emoji:'🌋' },
];

// ── Particle Effects ───────────────────────────────────────────────────────
const PARTICLE_PRESETS = [
  { id:'none',      name:'None',        emoji:'✕' },
  { id:'hearts',    name:'Hearts',      emoji:'💕' },
  { id:'stars',     name:'Stars',       emoji:'⭐' },
  { id:'snow',      name:'Snow',        emoji:'❄️' },
  { id:'confetti',  name:'Confetti',    emoji:'🎉' },
  { id:'sparkle',   name:'Sparkle',     emoji:'✨' },
  { id:'bubbles',   name:'Bubbles',     emoji:'🫧' },
  { id:'flowers',   name:'Flowers',     emoji:'🌸' },
  { id:'lightning', name:'Lightning',   emoji:'⚡' },
  { id:'galaxy',    name:'Galaxy Dust', emoji:'🌌' },
  { id:'fire',      name:'Embers',      emoji:'🔥' },
  { id:'money',     name:'Money Rain',  emoji:'💸' },
];

function rnd(a, b) { return a + Math.random() * (b - a); }

function emitParticle(type, w, h, head) {
  const base = { x:0, y:0, vx:0, vy:0, life:1, maxLife:2, size:12, r:255, g:200, b:200 };
  switch(type) {
    case 'hearts':   return {...base, x:head.cx+rnd(-head.r,head.r), y:head.cy-head.r*0.3, vx:rnd(-25,25), vy:rnd(-100,-50), maxLife:rnd(1.5,3), size:rnd(12,24), r:255,g:rnd(80,160),b:rnd(100,180)};
    case 'stars':    return {...base, x:head.cx+rnd(-head.r*1.2,head.r*1.2), y:head.cy+rnd(-head.r*1.3,-head.r*0.2), vx:rnd(-40,40), vy:rnd(-60,-20), maxLife:rnd(1,2.5), size:rnd(8,20), r:255,g:rnd(200,255),b:rnd(0,100)};
    case 'snow':     return {...base, x:rnd(0,w), y:-10, vx:rnd(-15,15), vy:rnd(40,90), maxLife:rnd(3,6), size:rnd(4,12), r:200,g:220,b:255};
    case 'confetti': { const cols=[[255,80,80],[80,180,255],[255,220,0],[80,255,160],[220,80,255]]; const c=cols[Math.floor(Math.random()*cols.length)]; return {...base, x:rnd(0,w), y:-10, vx:rnd(-50,50), vy:rnd(80,180), maxLife:rnd(2,4), size:rnd(6,14), r:c[0],g:c[1],b:c[2]}; }
    case 'sparkle':  return {...base, x:head.cx+rnd(-head.r*1.3,head.r*1.3), y:head.cy+rnd(-head.r*1.5,head.r*0.5), vx:rnd(-20,20), vy:rnd(-30,30), maxLife:rnd(0.5,1.5), size:rnd(6,16), r:255,g:255,b:200};
    case 'bubbles':  return {...base, x:head.cx+rnd(-head.r,head.r), y:head.cy+head.r*0.4, vx:rnd(-15,15), vy:rnd(-50,-25), maxLife:rnd(2,4), size:rnd(10,28), r:120,g:200,b:255};
    case 'flowers':  { const hue=Math.floor(Math.random()*6)*60; const c=`hsl(${hue},90%,65%)`; const rgb=[[255,100,180],[255,180,100],[180,100,255],[100,200,255],[255,220,100],[200,255,100]][Math.floor(Math.random()*6)]; return {...base, x:head.cx+rnd(-head.r*1.2,head.r*1.2), y:head.cy-head.r*0.5, vx:rnd(-30,30), vy:rnd(-80,-30), maxLife:rnd(2,4), size:rnd(10,22), r:rgb[0],g:rgb[1],b:rgb[2]}; }
    case 'lightning':{ return {...base, x:rnd(0,w), y:0, vx:rnd(-10,10), vy:rnd(150,300), maxLife:rnd(0.2,0.6), size:rnd(8,20), r:200,g:220,b:255}; }
    case 'galaxy':   { const h2=Math.random()*360; return {...base, x:rnd(0,w), y:rnd(0,h*0.5), vx:rnd(-8,8), vy:rnd(-5,5), maxLife:rnd(2,6), size:rnd(1,5), r:Math.floor(150+Math.random()*105),g:Math.floor(100+Math.random()*155),b:255}; }
    case 'fire':     return {...base, x:head.cx+rnd(-head.r*0.6,head.r*0.6), y:head.cy+head.r*0.3, vx:rnd(-20,20), vy:rnd(-90,-40), maxLife:rnd(0.5,1.2), size:rnd(8,20), r:255,g:Math.floor(rnd(60,160)),b:20};
    case 'money':    { const green=Math.random()>0.5; return {...base, x:rnd(0,w), y:-10, vx:rnd(-30,30), vy:rnd(60,140), maxLife:rnd(2,5), size:rnd(14,24), r:green?50:200,g:green?180:200,b:green?80:50}; }
    default: return null;
  }
}

function updateParticle(p, dt) {
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  if (p.life > 0.5) p.vy += 20 * dt; // gravity for some
  p.life -= dt / p.maxLife;
}

function drawParticle(ctx, p, type) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, p.life * 0.9);
  switch(type) {
    case 'hearts': {
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.translate(p.x, p.y);
      const s = p.size/20;
      ctx.beginPath();
      ctx.moveTo(0,0);
      ctx.bezierCurveTo(-10*s,-10*s,-20*s,5*s,0,20*s);
      ctx.bezierCurveTo(20*s,5*s,10*s,-10*s,0,0);
      ctx.fill(); break;
    }
    case 'stars': {
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.life*3);
      ctx.beginPath();
      for(let i=0;i<10;i++){
        const a=i*Math.PI/5-Math.PI/2; const r=i%2===0?p.size:p.size*0.45;
        i===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
      }
      ctx.closePath(); ctx.fill(); break;
    }
    case 'snow': {
      ctx.strokeStyle = 'rgba(200,230,255,0.9)'; ctx.lineWidth = p.size*0.15;
      ctx.translate(p.x, p.y);
      for(let i=0;i<6;i++){
        ctx.rotate(Math.PI/3);
        ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(p.size,0); ctx.stroke();
      }
      break;
    }
    case 'confetti': {
      ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
      ctx.translate(p.x, p.y); ctx.rotate(p.life*8);
      ctx.fillRect(-p.size/2,-p.size/4,p.size,p.size/2); break;
    }
    case 'sparkle': {
      ctx.strokeStyle = `rgb(${p.r},${p.g},${p.b})`; ctx.lineWidth = p.size*0.12;
      ctx.translate(p.x, p.y);
      for(let i=0;i<4;i++){ ctx.rotate(Math.PI/4); ctx.beginPath(); ctx.moveTo(0,-p.size); ctx.lineTo(0,p.size); ctx.stroke(); }
      break;
    }
    case 'bubbles': {
      ctx.strokeStyle = `rgba(${p.r},${p.g},${p.b},0.8)`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.stroke();
      ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},0.12)`;
      ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.35)';
      ctx.beginPath(); ctx.arc(p.x-p.size*0.28,p.y-p.size*0.28,p.size*0.18,0,Math.PI*2); ctx.fill();
      break;
    }
    case 'flowers': {
      ctx.translate(p.x,p.y); ctx.rotate(p.life*2);
      const petals=5;
      for(let i=0;i<petals;i++){
        ctx.save(); ctx.rotate((i/petals)*Math.PI*2);
        ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${Math.max(0,p.life)})`;
        ctx.beginPath(); ctx.ellipse(0,-p.size*0.55,p.size*0.28,p.size*0.5,0,0,Math.PI*2); ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle=`rgba(255,240,50,${Math.max(0,p.life)})`;
      ctx.beginPath(); ctx.arc(0,0,p.size*0.22,0,Math.PI*2); ctx.fill();
      break;
    }
    case 'lightning': {
      ctx.strokeStyle=`rgba(${p.r},${p.g},${p.b},${Math.max(0,p.life)})`;
      ctx.lineWidth=p.size*0.2; ctx.shadowColor=`rgba(150,200,255,0.8)`; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.moveTo(p.x,p.y);
      let lx=p.x,ly=p.y;
      for(let i=0;i<5;i++){ lx+=rnd(-15,15); ly+=rnd(20,40); ctx.lineTo(lx,ly); }
      ctx.stroke(); break;
    }
    case 'galaxy': {
      ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${Math.max(0,p.life*0.8)})`;
      ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      if(p.size>3){
        ctx.fillStyle=`rgba(255,255,255,${Math.max(0,p.life*0.5)})`;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size*0.35,0,Math.PI*2); ctx.fill();
      }
      break;
    }
    case 'fire': {
      const fg=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.size);
      fg.addColorStop(0,`rgba(255,250,100,${Math.max(0,p.life)})`);
      fg.addColorStop(0.4,`rgba(${p.r},${p.g},20,${Math.max(0,p.life*0.8)})`);
      fg.addColorStop(1,'rgba(150,0,0,0)');
      ctx.fillStyle=fg; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill();
      break;
    }
    case 'money': {
      ctx.translate(p.x,p.y); ctx.rotate(p.life*4);
      ctx.fillStyle=`rgba(${p.r},${p.g},${p.b},${Math.max(0,p.life)})`;
      ctx.fillRect(-p.size*0.7,-p.size*0.42,p.size*1.4,p.size*0.84);
      ctx.fillStyle=`rgba(255,255,255,0.3)`;
      ctx.font=`bold ${p.size*0.7}px sans-serif`; ctx.textAlign='center'; ctx.textBaseline='middle';
      ctx.fillText('$',0,0);
      break;
    }
  }
  ctx.restore();
}

function drawBackground(ctx, bgId, w, h, t, parallax) {
  if (bgId === 'none') return;
  if (bgId === 'neon_city') {
    ctx.fillStyle='#000010'; ctx.fillRect(0,0,w,h);
    const buildings=[[0.05,0.5,0.08,0.5],[0.14,0.38,0.07,0.62],[0.22,0.48,0.09,0.52],[0.31,0.32,0.06,0.68],[0.38,0.44,0.08,0.56],[0.47,0.28,0.07,0.72],[0.55,0.5,0.09,0.5],[0.65,0.36,0.06,0.64],[0.72,0.45,0.08,0.55],[0.8,0.3,0.07,0.7],[0.88,0.48,0.09,0.52]];
    for(const[bx,by,bw,bh] of buildings){
      const x=bx*w,y=by*h,bwidth=bw*w,bheight=bh*h;
      ctx.fillStyle='#0d0020'; ctx.fillRect(x,y,bwidth,bheight);
      const cols=Math.floor(bwidth/12),rows=Math.floor(bheight/16);
      for(let c=0;c<cols;c++) for(let r=0;r<rows;r++){
        if(Math.sin(t*0.3+c*1.7+r*2.3+bx*5)>0.2){
          const hue=(bx*360+c*30)%360;
          ctx.fillStyle=`hsl(${hue},100%,65%)`; ctx.fillRect(x+c*12+2,y+r*16+2,6,9);
        }
      }
    }
  } else if (bgId === 'galaxy') {
    ctx.fillStyle='#000010'; ctx.fillRect(0,0,w,h);
    for(let i=0;i<200;i++){
      const sx=((Math.sin(i*127.1)*0.5+0.5)*w+parallax.x*20)%w;
      const sy=((Math.sin(i*311.7)*0.5+0.5)*h+parallax.y*20)%h;
      const bright=0.4+0.6*Math.abs(Math.sin(t*0.8+i));
      ctx.fillStyle=`rgba(255,255,255,${bright})`;
      ctx.beginPath(); ctx.arc(sx,sy,0.8+Math.abs(Math.sin(i*7.3))*1.5,0,Math.PI*2); ctx.fill();
    }
    for(let i=0;i<3;i++){
      const nx=w/2+Math.cos(t*0.05+i*2.1)*w*0.2;
      const ny=h/2+Math.sin(t*0.07+i*2.1)*h*0.15;
      const hue=(i*120+t*5)%360;
      const ng=ctx.createRadialGradient(nx,ny,0,nx,ny,w*0.25);
      ng.addColorStop(0,`hsla(${hue},90%,60%,0.14)`); ng.addColorStop(1,'hsla(0,0%,0%,0)');
      ctx.fillStyle=ng; ctx.fillRect(0,0,w,h);
    }
  } else if (bgId === 'sunset') {
    const sky=ctx.createLinearGradient(0,0,0,h*0.7);
    sky.addColorStop(0,'#1a0533'); sky.addColorStop(0.3,'#c0392b'); sky.addColorStop(0.6,'#e67e22'); sky.addColorStop(1,'#f39c12');
    ctx.fillStyle=sky; ctx.fillRect(0,0,w,h*0.7);
    const sunX=w*0.5+parallax.x*30, sunY=h*0.38+parallax.y*20;
    const sunG=ctx.createRadialGradient(sunX,sunY,0,sunX,sunY,w*0.12);
    sunG.addColorStop(0,'rgba(255,240,80,1)'); sunG.addColorStop(0.4,'rgba(255,160,30,0.8)'); sunG.addColorStop(1,'rgba(255,80,0,0)');
    ctx.fillStyle=sunG; ctx.fillRect(0,0,w,h*0.7);
    ctx.fillStyle='#1a6080'; ctx.fillRect(0,h*0.7,w,h*0.3);
    ctx.fillStyle=`rgba(255,200,50,${0.15+0.05*Math.sin(t)})`; ctx.fillRect(sunX-w*0.04,h*0.7,w*0.08,h*0.3);
  } else if (bgId === 'grid') {
    ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
    const hue=(t*20)%360;
    ctx.strokeStyle=`hsla(${hue},100%,55%,0.6)`; ctx.lineWidth=1;
    const grid=40, offset=(t*20)%grid;
    for(let x=-grid+offset;x<w+grid;x+=grid){ ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke(); }
    for(let y=-grid+offset;y<h+grid;y+=grid){ ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(w,y); ctx.stroke(); }
    const grd=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*0.5);
    grd.addColorStop(0,`hsla(${(hue+180)%360},100%,40%,0.15)`); grd.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);
  } else if (bgId === 'forest') {
    const sky=ctx.createLinearGradient(0,0,0,h);
    sky.addColorStop(0,'#020a04'); sky.addColorStop(1,'#0a1a08');
    ctx.fillStyle=sky; ctx.fillRect(0,0,w,h);
    // Moon
    ctx.fillStyle='rgba(220,240,200,0.9)';
    ctx.beginPath(); ctx.arc(w*0.75+parallax.x*20,h*0.15+parallax.y*10,w*0.04,0,Math.PI*2); ctx.fill();
    // Stars
    for(let i=0;i<80;i++){
      const sx=((Math.sin(i*127.1)*0.5+0.5)*w+parallax.x*15)%w;
      const sy=((Math.sin(i*311.7)*0.5+0.5)*h*0.5+parallax.y*10)%h;
      const br=0.3+0.7*Math.abs(Math.sin(t*0.6+i));
      ctx.fillStyle=`rgba(200,240,200,${br*0.7})`;
      ctx.beginPath(); ctx.arc(sx,sy,0.7,0,Math.PI*2); ctx.fill();
    }
    // Trees
    const trees=[[0.05,1.05,0.07],[0.15,0.85,0.09],[0.25,0.9,0.06],[0.35,0.78,0.08],[0.45,0.88,0.07],[0.55,0.75,0.09],[0.65,0.82,0.06],[0.75,0.88,0.08],[0.85,0.8,0.07],[0.92,0.92,0.06]];
    for(const[tx,ty,tw] of trees){
      const x=tx*w, trunkH=(1-ty)*h, treeW=tw*w;
      ctx.fillStyle='#0d1a08';
      ctx.beginPath(); ctx.moveTo(x,h); ctx.lineTo(x-treeW,ty*h); ctx.lineTo(x+treeW,ty*h); ctx.closePath(); ctx.fill();
    }
    // Fog layer
    const fog=ctx.createLinearGradient(0,h*0.6,0,h);
    fog.addColorStop(0,'rgba(20,40,15,0)'); fog.addColorStop(1,'rgba(20,40,15,0.5)');
    ctx.fillStyle=fog; ctx.fillRect(0,0,w,h);
  } else if (bgId === 'underwater') {
    const sea=ctx.createLinearGradient(0,0,0,h);
    sea.addColorStop(0,'#001830'); sea.addColorStop(1,'#002050');
    ctx.fillStyle=sea; ctx.fillRect(0,0,w,h);
    // Caustic light rays
    for(let i=0;i<8;i++){
      const rx=w*(0.1+i*0.12)+parallax.x*30;
      const rw=w*0.04;
      const ray=ctx.createLinearGradient(rx,0,rx,h*0.7);
      ray.addColorStop(0,`rgba(0,150,255,${0.04+0.03*Math.sin(t*1.5+i)})`);
      ray.addColorStop(1,'rgba(0,100,200,0)');
      ctx.fillStyle=ray;
      ctx.beginPath(); ctx.moveTo(rx-rw,0); ctx.lineTo(rx+rw,0); ctx.lineTo(rx+rw*2,h*0.7); ctx.lineTo(rx-rw*2,h*0.7); ctx.closePath(); ctx.fill();
    }
    // Bubbles
    for(let i=0;i<20;i++){
      const bx=((i*137+parallax.x*10)%w+w)%w;
      const by=((h-(t*15+i*80)%h))%h;
      const br=2+i%5;
      ctx.strokeStyle=`rgba(100,200,255,${0.3+0.2*Math.sin(t+i)})`; ctx.lineWidth=1;
      ctx.beginPath(); ctx.arc(bx,by,br,0,Math.PI*2); ctx.stroke();
    }
    // Water surface ripple
    ctx.strokeStyle='rgba(0,180,255,0.15)'; ctx.lineWidth=1;
    for(let x=0;x<w;x+=4){
      const wy=h*0.05+Math.sin(x*0.04+t*2)*6+parallax.y*8;
      ctx.beginPath(); ctx.moveTo(x,wy); ctx.lineTo(x,wy+4); ctx.stroke();
    }
  } else if (bgId === 'cyberpunk_bg') {
    ctx.fillStyle='#050010'; ctx.fillRect(0,0,w,h);
    // Neon buildings
    const bldgs=[[0.02,0.45,0.1,0.55],[0.12,0.3,0.08,0.7],[0.2,0.5,0.09,0.5],[0.3,0.25,0.07,0.75],[0.37,0.4,0.1,0.6],[0.48,0.28,0.08,0.72],[0.57,0.45,0.09,0.55],[0.67,0.32,0.07,0.68],[0.75,0.48,0.1,0.52],[0.85,0.38,0.08,0.62],[0.93,0.5,0.07,0.5]];
    for(const[bx,by,bw,bh] of bldgs){
      ctx.fillStyle='#0a0018'; ctx.fillRect(bx*w,by*h,bw*w,bh*h);
      // Neon edge
      const hue=(bx*360+t*5)%360;
      ctx.strokeStyle=`hsla(${hue},100%,60%,0.6)`; ctx.lineWidth=1;
      ctx.strokeRect(bx*w,by*h,bw*w,bh*h);
      // Windows
      const cols=Math.floor(bw*w/10), rows=Math.floor(bh*h/14);
      for(let c=0;c<cols;c++) for(let r=0;r<rows;r++){
        if(Math.sin(t*0.2+c*2.3+r*1.7+bx*5)>0.3){
          ctx.fillStyle=`hsl(${(hue+c*20)%360},80%,65%)`;
          ctx.fillRect(bx*w+c*10+2,by*h+r*14+2,5,8);
        }
      }
    }
    // Neon ground reflection
    const refl=ctx.createLinearGradient(0,h*0.82,0,h);
    refl.addColorStop(0,'rgba(180,0,255,0.25)'); refl.addColorStop(1,'rgba(0,100,255,0.1)');
    ctx.fillStyle=refl; ctx.fillRect(0,h*0.82,w,h*0.18);
    // Flying car light
    const carX=((t*80)%w*1.3)-w*0.15+parallax.x*20;
    ctx.fillStyle='rgba(255,255,100,0.7)';
    ctx.beginPath(); ctx.arc(carX,h*0.4,2,0,Math.PI*2); ctx.fill();
    ctx.fillStyle='rgba(255,200,0,0.3)';
    ctx.beginPath(); ctx.arc(carX-15,h*0.4,8,0,Math.PI*2); ctx.fill();
  } else if (bgId === 'aurora') {
    ctx.fillStyle='#00050a'; ctx.fillRect(0,0,w,h);
    // Stars
    for(let i=0;i<120;i++){
      const sx=((Math.sin(i*127.1)*0.5+0.5)*w)%w;
      const sy=((Math.sin(i*311.7)*0.5+0.5)*h*0.6)%h;
      ctx.fillStyle=`rgba(255,255,255,${0.2+0.6*Math.abs(Math.sin(t*0.4+i))})`;
      ctx.beginPath(); ctx.arc(sx,sy,0.6,0,Math.PI*2); ctx.fill();
    }
    // Aurora bands
    for(let i=0;i<5;i++){
      const hy=h*(0.1+i*0.1)+parallax.y*20;
      const hue=(i*60+t*10)%360;
      const band=ctx.createLinearGradient(0,hy-h*0.08,0,hy+h*0.15);
      band.addColorStop(0,'rgba(0,0,0,0)');
      band.addColorStop(0.3,`hsla(${hue},90%,55%,${0.35+0.15*Math.sin(t*0.8+i)})`);
      band.addColorStop(0.7,`hsla(${(hue+30)%360},85%,45%,${0.2+0.1*Math.sin(t+i)})`);
      band.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=band;
      // Wavy shape
      ctx.beginPath(); ctx.moveTo(0,hy);
      for(let x=0;x<=w;x+=20){
        ctx.lineTo(x,hy+Math.sin(x*0.015+t*0.8+i)*h*0.04);
      }
      ctx.lineTo(w,hy+h*0.15); ctx.lineTo(0,hy+h*0.15); ctx.closePath();
      ctx.fill();
    }
  } else if (bgId === 'studio') {
    // Clean dark studio with rim lighting
    ctx.fillStyle='#0a0a0f'; ctx.fillRect(0,0,w,h);
    // Floor gradient
    const floor=ctx.createLinearGradient(0,h*0.7,0,h);
    floor.addColorStop(0,'#0f0f18'); floor.addColorStop(1,'#050508');
    ctx.fillStyle=floor; ctx.fillRect(0,h*0.7,w,h*0.3);
    // Floor line
    ctx.strokeStyle='rgba(255,255,255,0.05)'; ctx.lineWidth=1;
    ctx.beginPath(); ctx.moveTo(0,h*0.72); ctx.lineTo(w,h*0.72); ctx.stroke();
    // Left rim light
    const rimL=ctx.createRadialGradient(0,h*0.4,0,0,h*0.4,w*0.5);
    rimL.addColorStop(0,`hsla(${(t*10)%360},80%,55%,0.12)`); rimL.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rimL; ctx.fillRect(0,0,w,h);
    // Right rim light
    const rimR=ctx.createRadialGradient(w,h*0.4,0,w,h*0.4,w*0.5);
    rimR.addColorStop(0,`hsla(${(t*10+180)%360},80%,55%,0.10)`); rimR.addColorStop(1,'rgba(0,0,0,0)');
    ctx.fillStyle=rimR; ctx.fillRect(0,0,w,h);
  } else if (bgId === 'lava') {
    ctx.fillStyle='#0a0100'; ctx.fillRect(0,0,w,h);
    // Lava glow layers
    for(let i=0;i<6;i++){
      const lx=w*(0.1+i*0.17)+Math.sin(t*0.4+i)*w*0.08+parallax.x*20;
      const ly=h*(0.6+Math.sin(t*0.3+i*0.8)*0.15)+parallax.y*10;
      const hue=i%2===0?10:30;
      const lg=ctx.createRadialGradient(lx,ly,0,lx,ly,w*0.22);
      lg.addColorStop(0,`hsla(${hue},100%,60%,${0.5+0.2*Math.sin(t*2+i)})`);
      lg.addColorStop(0.4,`hsla(${hue-5},100%,35%,0.3)`);
      lg.addColorStop(1,'rgba(0,0,0,0)');
      ctx.fillStyle=lg; ctx.fillRect(0,0,w,h);
    }
    // Lava cracks
    ctx.strokeStyle='rgba(255,100,0,0.4)'; ctx.lineWidth=1;
    for(let i=0;i<8;i++){
      const startX=w*Math.random(), startY=h*0.5;
      ctx.beginPath(); ctx.moveTo(startX,startY);
      for(let j=0;j<5;j++){ ctx.lineTo(startX+rnd(-60,60),startY+j*30); }
      ctx.stroke();
    }
    // Ground glow
    const ground=ctx.createLinearGradient(0,h*0.75,0,h);
    ground.addColorStop(0,'rgba(255,40,0,0.15)'); ground.addColorStop(1,'rgba(180,20,0,0.4)');
    ctx.fillStyle=ground; ctx.fillRect(0,h*0.75,w,h*0.25);
  }
}

// ── Main Component ─────────────────────────────────────────────────────────
export default function FaceStudio({ onProcessedTrack, minimal = false }) {
  const videoRef  = useRef(null);
  const canvasRef = useRef(null);
  const bgCanvasRef = useRef(null);
  const personCanvasRef = useRef(null);
  const maskRef   = useRef(null);
  const faceRef   = useRef(null);
  const segRef    = useRef(null);
  const rafRef    = useRef(0);
  const particlesRef = useRef([]);
  const emitAccRef   = useRef(0);
  const lastTimeRef  = useRef(performance.now());
  const headRef      = useRef({ cx: 0, cy: 0, r: 100 });
  const parallaxRef  = useRef({ x: 0, y: 0 });
  const landmarksRef = useRef(null);
  const filterRef    = useRef('none');
  const particleRef  = useRef('none');
  const bgRef        = useRef('none');
  const beautyRef    = useRef({ smooth: 0, bright: 0, warm: 0 });

  const [started,    setStarted]    = useState(false);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(null);
  const [filterId,   setFilterId]   = useState('none');
  const [particleId, setParticleId] = useState('none');
  const [bgId,       setBgId]       = useState('none');
  const [tab,        setTab]        = useState('filters');
  const [category,   setCategory]   = useState('trending');
  const [search,     setSearch]     = useState('');
  const [beauty,     setBeauty]     = useState({ smooth:0, bright:0, warm:0 });
  const [showBeauty, setShowBeauty] = useState(false);
  const [activeFx,   setActiveFx]   = useState(new Set());

  // Keep refs in sync
  filterRef.current   = filterId;
  particleRef.current = particleId;
  bgRef.current       = bgId;
  beautyRef.current   = beauty;

  async function start() {
    setLoading(true); setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:{ width:1280, height:720, facingMode:'user' }, audio:false });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(WASM_BASE);
      faceRef.current = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions:{ modelAssetPath:FACE_MODEL, delegate:'GPU' },
        runningMode:'VIDEO', numFaces:1,
      });
      segRef.current = await vision.ImageSegmenter.createFromOptions(fileset, {
        baseOptions:{ modelAssetPath:SEG_MODEL, delegate:'GPU' },
        runningMode:'VIDEO', outputCategoryMask:true, outputConfidenceMasks:false,
      });

      bgCanvasRef.current = document.createElement('canvas');
      personCanvasRef.current = document.createElement('canvas');
      setStarted(true); setLoading(false);
      loop();
    } catch(e) {
      setError(e?.message || 'Camera error'); setLoading(false);
    }
  }

  function buildPerson(v, w, h) {
    const pc = personCanvasRef.current;
    if (!pc) return;
    const pctx = pc.getContext('2d', { willReadFrequently:true });
    pctx.setTransform(1,0,0,1,0,0);
    pctx.clearRect(0,0,w,h);
    pctx.drawImage(v,0,0,w,h);
    if (!segRef.current) return;
    try {
      const res = segRef.current.segmentForVideo(v, performance.now());
      const cat = res.categoryMask;
      if (!cat) return;
      const mask = cat.getAsUint8Array();
      if (!maskRef.current || maskRef.current.length !== mask.length) maskRef.current = new Uint8Array(mask.length);
      maskRef.current.set(mask);
      cat.close?.();
      const img = pctx.getImageData(0,0,w,h);
      const d = img.data, m = maskRef.current;
      for (let i=0,j=0; i<m.length; i++,j+=4) { if(m[i]!==0) d[j+3]=0; }
      pctx.putImageData(img,0,0);
    } catch {}
  }

  function loop() {
    const v = videoRef.current;
    const canvas = canvasRef.current;
    if (!v || !canvas) return;
    const ctx = canvas.getContext('2d');
    const w = v.videoWidth, h = v.videoHeight;
    if (!w || !h) { rafRef.current = requestAnimationFrame(loop); return; }
    if (canvas.width !== w) {
      canvas.width = w; canvas.height = h;
      if (bgCanvasRef.current) { bgCanvasRef.current.width=w; bgCanvasRef.current.height=h; }
      if (personCanvasRef.current) { personCanvasRef.current.width=w; personCanvasRef.current.height=h; }
    }
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTimeRef.current) / 1000);
    lastTimeRef.current = now;
    const t = now / 1000;

    // Face landmarks
    let lm = null;
    if (faceRef.current) {
      try {
        const res = faceRef.current.detectForVideo(v, now);
        if (res.faceLandmarks?.length > 0) {
          lm = res.faceLandmarks[0];
          landmarksRef.current = lm;
          let minX=1,minY=1,maxX=0,maxY=0;
          for(const p of lm){ if(p.x<minX)minX=p.x; if(p.y<minY)minY=p.y; if(p.x>maxX)maxX=p.x; if(p.y>maxY)maxY=p.y; }
          const cx=((minX+maxX)/2)*w, cy=((minY+maxY)/2)*h;
          const r=Math.max(maxX-minX,maxY-minY)*w*0.6;
          headRef.current={cx,cy,r};
          const tx=cx/w-0.5, ty=cy/h-0.5;
          parallaxRef.current.x += (tx-parallaxRef.current.x)*Math.min(1,dt*5);
          parallaxRef.current.y += (ty-parallaxRef.current.y)*Math.min(1,dt*5);
        }
      } catch {}
    }

    const bg = bgRef.current;
    const fid = filterRef.current;
    const pid = particleRef.current;
    const b = beautyRef.current;
    const needsSeg = bg !== 'none' && bg !== 'blur' ? false : (bg === 'blur');
    const needsSegForBg = ['neon_city','galaxy','sunset','grid'].includes(bg);
    if (needsSeg || needsSegForBg) buildPerson(v, w, h);

    ctx.save();
    ctx.setTransform(1,0,0,1,0,0);
    ctx.clearRect(0,0,w,h);
    ctx.translate(w,0); ctx.scale(-1,1);

    // Background
    if (bg === 'none') {
      if (b.smooth > 0) ctx.filter = `blur(${b.smooth*0.8}px)`;
      ctx.drawImage(v,0,0,w,h);
      ctx.filter = 'none';
    } else if (bg === 'blur') {
      ctx.filter = 'blur(22px) saturate(1.1)';
      ctx.drawImage(v,0,0,w,h);
      ctx.filter = b.smooth>0 ? `blur(${b.smooth*0.5}px)` : 'none';
      if (personCanvasRef.current) ctx.drawImage(personCanvasRef.current,0,0);
      ctx.filter = 'none';
    } else {
      if (bgCanvasRef.current) {
        const bctx = bgCanvasRef.current.getContext('2d');
        bctx.clearRect(0,0,w,h);
        drawBackground(bctx, bg, w, h, t, parallaxRef.current);
        ctx.drawImage(bgCanvasRef.current,0,0);
      }
      ctx.filter = 'blur(0.8px)';
      if (personCanvasRef.current) ctx.drawImage(personCanvasRef.current,0,0);
      ctx.filter = 'none';
    }

    // Beauty warm/bright
    if (b.warm > 0) {
      ctx.save(); ctx.globalCompositeOperation='soft-light';
      ctx.fillStyle=`rgba(255,${180-b.warm*20},${80-b.warm*30},${b.warm*0.12})`;
      ctx.fillRect(0,0,w,h); ctx.restore();
    }
    if (b.bright > 0) {
      ctx.save(); ctx.globalCompositeOperation='screen';
      ctx.fillStyle=`rgba(255,255,255,${b.bright*0.08})`;
      ctx.fillRect(0,0,w,h); ctx.restore();
    }

    // Face filter
    if (lm && fid !== 'none') {
      const filterDef = getFilterById(fid);
      if (filterDef?.apply) {
        try { filterDef.apply(ctx, w, h, lm); } catch {}
      } else if (filterDef?.css) {
        // CSS filter applied to a temp canvas
        const tmp = document.createElement('canvas');
        tmp.width=w; tmp.height=h;
        const tc = tmp.getContext('2d');
        tc.drawImage(canvas,0,0);
        ctx.filter = filterDef.css;
        ctx.drawImage(tmp,0,0);
        ctx.filter = 'none';
      }
    }

    // Particles
    const head = headRef.current;
    emitAccRef.current += dt;
    const RATES = { hearts:8, stars:10, snow:18, confetti:20, sparkle:14, bubbles:7 };
    const rate = RATES[pid] || 0;
    const interval = rate > 0 ? 1/rate : Infinity;
    let emitted = 0;
    while (emitAccRef.current >= interval && particlesRef.current.length < 600 && emitted < 25) {
      emitAccRef.current -= interval;
      const p = emitParticle(pid, w, h, head);
      if (p) particlesRef.current.push(p);
      emitted++;
    }
    if (rate === 0) emitAccRef.current = 0;
    const alive = [];
    for (const p of particlesRef.current) {
      updateParticle(p, dt);
      if (p.life > 0 && p.x > -80 && p.x < w+80 && p.y > -80 && p.y < h+80) {
        drawParticle(ctx, p, pid);
        alive.push(p);
      }
    }
    particlesRef.current = alive;

    ctx.restore();
    rafRef.current = requestAnimationFrame(loop);
  }

  useEffect(() => () => {
    cancelAnimationFrame(rafRef.current);
    const v = videoRef.current;
    if (v?.srcObject) v.srcObject.getTracks().forEach(t => t.stop());
    faceRef.current?.close?.();
    segRef.current?.close?.();
  }, []);

  const visibleFilters = useMemo(() => {
    let list = category === 'trending' ? getTrendingFilters() : ADVANCED_FILTERS.filter(f => f.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q));
    }
    return list;
  }, [category, search]);

  return (
    <div style={{minHeight:'100vh',background:'#0a0a14',color:'#fff',fontFamily:"'Inter',-apple-system,sans-serif",display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:'12px 16px',borderBottom:'1px solid rgba(255,255,255,0.08)',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(0,0,0,0.4)',backdropFilter:'blur(12px)',position:'sticky',top:0,zIndex:10}}>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{width:32,height:32,borderRadius:'50%',background:'linear-gradient(135deg,#a855f7,#ec4899)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16}}>✨</div>
          <div>
            <div style={{fontWeight:700,fontSize:15,letterSpacing:'-0.02em'}}>Face FX Studio</div>
            <div style={{fontSize:11,color:'rgba(255,255,255,0.4)'}}>AR Filters · Particles · Backgrounds</div>
          </div>
        </div>
        {!started ? (
          <button onClick={start} disabled={loading}
            style={{background:'linear-gradient(135deg,#a855f7,#ec4899)',border:'none',borderRadius:20,padding:'8px 20px',color:'#fff',fontWeight:600,fontSize:14,cursor:loading?'not-allowed':'pointer',opacity:loading?0.7:1}}>
            {loading ? 'Loading AI…' : '📷 Start Camera'}
          </button>
        ) : (
          <div style={{display:'flex',gap:6}}>
            {filterId!=='none' && <Chip label={ADVANCED_FILTERS.find(f=>f.id===filterId)?.name} color="#a855f7"/>}
            {particleId!=='none' && <Chip label={PARTICLE_PRESETS.find(p=>p.id===particleId)?.name} color="#ec4899"/>}
            {bgId!=='none' && <Chip label={BACKGROUNDS.find(b=>b.id===bgId)?.name} color="#3b82f6"/>}
          </div>
        )}
      </div>

      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {/* Video canvas */}
        <div style={{flex:1,position:'relative',background:'#000',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <video ref={videoRef} style={{display:'none'}} playsInline muted/>
          <canvas ref={canvasRef} style={{width:'100%',height:'100%',objectFit:'contain',maxHeight:'calc(100vh - 56px)'}}/>
          {!started && (
            <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
              {error
                ? <div style={{background:'rgba(220,50,50,0.15)',border:'1px solid rgba(220,50,50,0.4)',borderRadius:12,padding:'12px 20px',color:'#ff8080',maxWidth:300,textAlign:'center',fontSize:14}}>{error}</div>
                : <>
                    <div style={{fontSize:52}}>✨</div>
                    <div style={{color:'rgba(255,255,255,0.5)',fontSize:14,textAlign:'center',maxWidth:260,lineHeight:1.6}}>Snapchat-quality AR filters, particles & virtual backgrounds powered by MediaPipe AI.</div>
                  </>
              }
            </div>
          )}
          {/* Live badges */}
          {started && (
            <div style={{position:'absolute',top:12,left:12,display:'flex',flexDirection:'column',gap:6}}>
              {filterId!=='none' && <div style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',border:'1px solid rgba(168,85,247,0.4)',borderRadius:20,padding:'4px 10px',fontSize:11}}><span style={{color:'#a855f7',marginRight:4}}>●</span>{ADVANCED_FILTERS.find(f=>f.id===filterId)?.name}</div>}
              {particleId!=='none' && <div style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',border:'1px solid rgba(236,72,153,0.4)',borderRadius:20,padding:'4px 10px',fontSize:11}}><span style={{color:'#ec4899',marginRight:4}}>●</span>{PARTICLE_PRESETS.find(p=>p.id===particleId)?.name}</div>}
              {bgId!=='none' && <div style={{background:'rgba(0,0,0,0.6)',backdropFilter:'blur(8px)',border:'1px solid rgba(59,130,246,0.4)',borderRadius:20,padding:'4px 10px',fontSize:11}}><span style={{color:'#3b82f6',marginRight:4}}>●</span>{BACKGROUNDS.find(b=>b.id===bgId)?.name}</div>}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{width:280,background:'#0f0f18',borderLeft:'1px solid rgba(255,255,255,0.06)',display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Tabs */}
          <div style={{display:'flex',borderBottom:'1px solid rgba(255,255,255,0.06)'}}>
            {[['filters','🎭'],['particles','✨'],['backgrounds','🌆']].map(([id,icon]) => (
              <button key={id} onClick={() => setTab(id)}
                style={{flex:1,padding:'11px 0',border:'none',background:'none',color:tab===id?'#a855f7':'rgba(255,255,255,0.4)',fontSize:10,fontWeight:tab===id?700:500,textTransform:'uppercase',letterSpacing:'0.08em',cursor:'pointer',borderBottom:tab===id?'2px solid #a855f7':'2px solid transparent',transition:'all 0.2s'}}>
                <div style={{fontSize:16,marginBottom:2}}>{icon}</div>{id}
              </button>
            ))}
          </div>

          <div style={{flex:1,overflowY:'auto',padding:12}}>
            {/* FILTERS TAB */}
            {tab === 'filters' && <>
              {/* Search */}
              <div style={{position:'relative',marginBottom:10}}>
                <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search filters…"
                  style={{width:'100%',background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'8px 12px 8px 32px',color:'#fff',fontSize:13,outline:'none',boxSizing:'border-box'}}/>
                <Search style={{position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',width:14,height:14,color:'rgba(255,255,255,0.3)'}}/>
              </div>
              {/* Category pills */}
              <div style={{display:'flex',gap:5,marginBottom:12,flexWrap:'wrap'}}>
                {[{id:'trending',label:'🔥 Hot'}, ...FILTER_CATEGORIES].map(c => (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    style={{padding:'3px 9px',borderRadius:20,border:'1px solid',borderColor:category===c.id?'#a855f7':'rgba(255,255,255,0.1)',background:category===c.id?'rgba(168,85,247,0.2)':'transparent',color:category===c.id?'#c084fc':'rgba(255,255,255,0.45)',fontSize:10,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
                    {c.label}
                  </button>
                ))}
              </div>
              {/* Filter grid */}
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                <FilterCard id="none" name="No Filter" emoji="✕" active={filterId==='none'} onSelect={()=>{setFilterId('none');}} color="#666"/>
                {visibleFilters.map(f => (
                  <FilterCard key={f.id} id={f.id} name={f.name} emoji={f.emoji} active={filterId===f.id} onSelect={()=>setFilterId(f.id)} color="#a855f7"/>
                ))}
              </div>

              {/* Beauty panel */}
              <div style={{marginTop:14}}>
                <button onClick={()=>setShowBeauty(v=>!v)}
                  style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,0.04)',border:'1px solid rgba(255,255,255,0.08)',borderRadius:10,padding:'9px 12px',color:'rgba(255,255,255,0.8)',fontSize:13,fontWeight:600,cursor:'pointer',marginBottom:showBeauty?10:0}}>
                  <span>💄 Beauty Tune</span>
                  <span style={{fontSize:10,color:'#a855f7'}}>{showBeauty?'▲':'▼'}</span>
                </button>
                {showBeauty && (
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {[['smooth','Smooth','#a855f7'],['bright','Brighten','#f59e0b'],['warm','Warmth','#ec4899']].map(([key,label,color]) => (
                      <div key={key}>
                        <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                          <span style={{fontSize:12,color:'rgba(255,255,255,0.6)'}}>{label}</span>
                          <span style={{fontSize:12,color}}>{Math.round(beauty[key]*100)}%</span>
                        </div>
                        <input type="range" min={0} max={1} step={0.01} value={beauty[key]}
                          onChange={e=>setBeauty(b=>({...b,[key]:parseFloat(e.target.value)}))}
                          style={{width:'100%',accentColor:color}}/>
                      </div>
                    ))}
                    <button onClick={()=>setBeauty({smooth:0,bright:0,warm:0})}
                      style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:8,padding:'6px',color:'rgba(255,255,255,0.5)',fontSize:12,cursor:'pointer'}}>
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </>}

            {/* PARTICLES TAB */}
            {tab === 'particles' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {PARTICLE_PRESETS.map(p => (
                  <FilterCard key={p.id} id={p.id} name={p.name} emoji={p.emoji} active={particleId===p.id} onSelect={()=>setParticleId(p.id)} color="#ec4899"/>
                ))}
              </div>
            )}

            {/* BACKGROUNDS TAB */}
            {tab === 'backgrounds' && (
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {BACKGROUNDS.map(b => (
                  <FilterCard key={b.id} id={b.id} name={b.name} emoji={b.emoji} active={bgId===b.id} onSelect={()=>setBgId(b.id)} color="#3b82f6"/>
                ))}
              </div>
            )}
          </div>

          {/* Clear all */}
          {started && (filterId!=='none'||particleId!=='none'||bgId!=='none') && (
            <div style={{padding:'10px 12px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
              <button onClick={()=>{setFilterId('none');setParticleId('none');setBgId('none');setBeauty({smooth:0,bright:0,warm:0});}}
                style={{width:'100%',background:'rgba(255,255,255,0.05)',border:'1px solid rgba(255,255,255,0.1)',borderRadius:10,padding:'8px',color:'rgba(255,255,255,0.5)',fontSize:12,cursor:'pointer',fontWeight:500}}>
                Clear All Effects
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterCard({ id, name, emoji, active, onSelect, color }) {
  return (
    <button onClick={onSelect}
      style={{background:active?`${color}22`:'rgba(255,255,255,0.04)',border:`1.5px solid ${active?color:'rgba(255,255,255,0.08)'}`,borderRadius:14,padding:'12px 8px',cursor:'pointer',textAlign:'center',transition:'all 0.15s',transform:active?'scale(0.97)':'scale(1)',boxShadow:active?`0 0 16px ${color}44`:'none'}}>
      <div style={{fontSize:24,marginBottom:4}}>{emoji}</div>
      <div style={{fontSize:11,color:active?'#fff':'rgba(255,255,255,0.5)',fontWeight:active?600:400,lineHeight:1.2}}>{name}</div>
    </button>
  );
}

function Chip({ label, color }) {
  if (!label) return null;
  return (
    <div style={{background:`${color}22`,border:`1px solid ${color}44`,borderRadius:20,padding:'3px 10px',fontSize:11,color:'#fff',fontWeight:600,whiteSpace:'nowrap'}}>{label}</div>
  );
}
