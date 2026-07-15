/**
 * AdvancedFilters — 80 filter/effect definitions organized by category.
 * WebGL-accelerated where possible, canvas fallback for all others.
 * Includes VTuber, beauty, cinematic, retro, horror, anime, cyberpunk,
 * fantasy, interactive, and particle FX categories.
 */

export const FILTER_CATEGORIES = [
  { id: 'trending',    label: '🔥 Trending',    color: '#ef4444' },
  { id: 'beauty',     label: '✨ Beauty',       color: '#ec4899' },
  { id: 'cinematic',  label: '🎬 Cinematic',    color: '#f59e0b' },
  { id: 'retro',      label: '📼 Retro',        color: '#a78bfa' },
  { id: 'horror',     label: '👻 Horror',       color: '#6b7280' },
  { id: 'anime',      label: '🌸 Anime',        color: '#f472b6' },
  { id: 'cyberpunk',  label: '🌃 Cyberpunk',    color: '#06b6d4' },
  { id: 'fantasy',    label: '🔮 Fantasy',      color: '#8b5cf6' },
  { id: 'vtuber',     label: '🎭 VTuber',       color: '#a855f7' },
  { id: 'interactive',label: '🎯 Interactive',  color: '#10b981' },
  { id: 'particle',   label: '✦ Particle FX',  color: '#fbbf24' },
];

// Trending filter IDs (shown in trending tab)
const TRENDING_IDS = ['mask_dog','mask_cat','mask_flames','mask_butterfly','mask_crown','beauty_soft','beauty_glam','porcelain','teal_orange','mask_neon_outline','mask_cyborg','mask_glitter_face','anime_soft','cel_shade','sparkle_eyes','sticker_stars','noir_grade','kodak_400','cyberpunk_2','mask_sunglasses_3d','particle_hearts','particle_flowers','particle_lightning','manga_lines','vtuber_ears','mask_angel_halo','golden_hour','anime_blush_lines','synthwave','horror_blood'];

export function getTrendingFilters() {
  if (!Array.isArray(ADVANCED_FILTERS)) return [];
  return TRENDING_IDS.map(id => ADVANCED_FILTERS.find(f => f && f.id === id)).filter(Boolean);
}

export function getFilterById(id) {
  if (!Array.isArray(ADVANCED_FILTERS)) return null;
  return ADVANCED_FILTERS.find(f => f && f.id === id) || null;
}

// ── Pixel manipulation helpers ──────────────────────────────────────────────
function clamp(v) { return Math.max(0, Math.min(255, v)); }

function adjustPixels(imageData, fn) {
  const d = imageData.data;
  for (let i = 0; i < d.length; i += 4) {
    const [r,g,b] = fn(d[i], d[i+1], d[i+2], i, d);
    d[i] = clamp(r); d[i+1] = clamp(g); d[i+2] = clamp(b);
  }
  return imageData;
}

function rgbToHsl(r,g,b) {
  r/=255; g/=255; b/=255;
  const max=Math.max(r,g,b), min=Math.min(r,g,b);
  let h,s,l=(max+min)/2;
  if(max===min){h=s=0;}else{
    const d=max-min; s=l>0.5?d/(2-max-min):d/(max+min);
    switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}h/=6;
  }
  return [h,s,l];
}

function hslToRgb(h,s,l) {
  if(s===0) return [l*255,l*255,l*255];
  const q=l<0.5?l*(1+s):l+s-l*s, p=2*l-q;
  const hue2rgb=(p,q,t)=>{
    if(t<0)t+=1;if(t>1)t-=1;
    if(t<1/6)return p+(q-p)*6*t;if(t<1/2)return q;
    if(t<2/3)return p+(q-p)*(2/3-t)*6;return p;
  };
  return [hue2rgb(p,q,h+1/3)*255, hue2rgb(p,q,h)*255, hue2rgb(p,q,h-1/3)*255];
}

// ── THE 80 FILTERS ──────────────────────────────────────────────────────────
export const ADVANCED_FILTERS = [

  // ── BEAUTY (10) ──────────────────────────────────────────────────────────
  { id:'beauty_soft', name:'Soft Beauty', emoji:'✨', category:'beauty', cost:2,
    css:'brightness(1.06) contrast(0.94) saturate(0.92)',
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const isSkin=r>95&&g>40&&b>20&&r>g&&r>b;
        return isSkin?[r+10,g+5,b+3]:[r,g,b];
      });
      ctx.putImageData(img,0,0);
      ctx.filter='blur(0.5px) brightness(1.04)';
      ctx.drawImage(ctx.canvas,0,0);
      ctx.filter='none';
    }
  },
  { id:'beauty_glam', name:'Glamour', emoji:'💎', category:'beauty', cost:2,
    css:'brightness(1.10) contrast(1.05) saturate(1.15)',
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const isSkin=r>95&&g>40&&b>20&&r>g&&r>b;
        if(isSkin) return [clamp(r+18),clamp(g+8),clamp(b+5)];
        return [clamp(r*1.05),clamp(g*1.02),clamp(b*1.08)];
      });
      ctx.putImageData(img,0,0);
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle='rgba(255,220,255,0.06)';
      ctx.fillRect(0,0,w,h);
      ctx.globalCompositeOperation='source-over';
    }
  },
  { id:'porcelain', name:'Porcelain', emoji:'🎀', category:'beauty', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const l=(r+g+b)/3;
        const isSkin=r>90&&g>50&&b>30&&r>b;
        if(isSkin){
          const smooth=l*0.6+Math.max(r,g,b)*0.4;
          return [clamp(smooth+22),clamp(smooth+14),clamp(smooth+12)];
        }
        return [r,g,b];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'rosy_glow', name:'Rosy Glow', emoji:'🌸', category:'beauty', cost:2,
    apply:(ctx,w,h)=>{
      ctx.save();
      ctx.globalCompositeOperation='soft-light';
      const g=ctx.createRadialGradient(w/2,h*0.35,0,w/2,h*0.35,w*0.5);
      g.addColorStop(0,'rgba(255,160,180,0.4)');
      g.addColorStop(1,'rgba(255,100,140,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'golden_skin', name:'Golden Skin', emoji:'🌟', category:'beauty', cost:2,
    apply:(ctx,w,h)=>{
      ctx.save();
      ctx.globalCompositeOperation='soft-light';
      ctx.fillStyle='rgba(255,200,80,0.25)';
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'natural_hd', name:'Natural HD', emoji:'📺', category:'beauty', cost:1,
    css:'brightness(1.04) contrast(1.06) saturate(1.05) sharpen(1)',
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h); const d=img.data;
      // Unsharp mask
      const src=new Uint8ClampedArray(d);
      for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
        const i=(y*w+x)*4;
        for(let c=0;c<3;c++){
          const blur=(src[i-w*4+c]+src[i+w*4+c]+src[i-4+c]+src[i+4+c])/4;
          d[i+c]=clamp(src[i+c]+(src[i+c]-blur)*0.4);
        }
      }
      ctx.putImageData(img,0,0);
    }
  },
  { id:'sunset_glow', name:'Sunset Glow', emoji:'🌅', category:'beauty', cost:1,
    apply:(ctx,w,h)=>{
      ctx.save();
      const g=ctx.createLinearGradient(0,0,w,h);
      g.addColorStop(0,'rgba(255,120,60,0.12)');
      g.addColorStop(1,'rgba(255,60,120,0.08)');
      ctx.globalCompositeOperation='overlay';
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'ivory', name:'Ivory', emoji:'🤍', category:'beauty', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r+6),clamp(g+4),clamp(b+2)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'cheek_blush', name:'Cheek Blush', emoji:'💗', category:'beauty', cost:1,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      ctx.save();
      const cheeks=[[lm[234]?.x*w||w*0.25,lm[234]?.y*h||h*0.5],[lm[454]?.x*w||w*0.75,lm[454]?.y*h||h*0.5]];
      ctx.globalCompositeOperation='soft-light';
      for(const[cx,cy] of cheeks){
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,w*0.09);
        g.addColorStop(0,'rgba(255,80,120,0.5)');
        g.addColorStop(1,'rgba(255,80,120,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(cx,cy,w*0.09,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  },
  { id:'lip_tint', name:'Lip Tint', emoji:'💋', category:'beauty', cost:1,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      ctx.save();
      const mouth={x:lm[13]?.x*w||w*0.5,y:lm[13]?.y*h||h*0.65};
      ctx.globalCompositeOperation='multiply';
      const g=ctx.createRadialGradient(mouth.x,mouth.y,0,mouth.x,mouth.y,w*0.04);
      g.addColorStop(0,'rgba(200,60,80,0.6)');
      g.addColorStop(1,'rgba(200,60,80,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },

  // ── CINEMATIC (8) ────────────────────────────────────────────────────────
  { id:'cinematic_teal', name:'Teal & Orange', emoji:'🎬', category:'cinematic', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const l=r*0.299+g*0.587+b*0.114;
        if(l>128){return[clamp(r*1.06+10),clamp(g*0.98),clamp(b*0.88)];}
        else{return[clamp(r*0.82),clamp(g*0.95),clamp(b*1.08)];}
      });
      ctx.putImageData(img,0,0);
      // Letterbox
      ctx.fillStyle='#000';
      ctx.fillRect(0,0,w,h*0.08);
      ctx.fillRect(0,h*0.92,w,h*0.08);
    }
  },
  { id:'noir', name:'Film Noir', emoji:'🎩', category:'cinematic', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const gray=r*0.299+g*0.587+b*0.114;
        const contrast=((gray-128)*1.4)+128;
        return[contrast,contrast,contrast];
      });
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalCompositeOperation='multiply';
      const vg=ctx.createRadialGradient(w/2,h/2,h*0.2,w/2,h/2,h*0.8);
      vg.addColorStop(0,'rgba(0,0,0,0)');
      vg.addColorStop(1,'rgba(0,0,0,0.7)');
      ctx.fillStyle=vg; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'golden_hour', name:'Golden Hour', emoji:'🌇', category:'cinematic', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.06+8),clamp(g*1.02+3),clamp(b*0.88-6)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'moody_blue', name:'Moody Blue', emoji:'🌊', category:'cinematic', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*0.85),clamp(g*0.92),clamp(b*1.12+8)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'technicolor', name:'Technicolor', emoji:'🌈', category:'cinematic', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const [h,s,l]=rgbToHsl(r,g,b);
        const [nr,ng,nb]=hslToRgb(h,Math.min(1,s*1.5),l);
        return[nr,ng,nb];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'desaturate', name:'Desaturate', emoji:'⬜', category:'cinematic', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const gray=r*0.299+g*0.587+b*0.114;
        return[gray*0.4+r*0.6,gray*0.4+g*0.6,gray*0.4+b*0.6];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'velvet', name:'Velvet Night', emoji:'🍷', category:'cinematic', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*0.88+12),clamp(g*0.78),clamp(b*0.75)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'arctic', name:'Arctic', emoji:'🏔️', category:'cinematic', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*0.88),clamp(g*0.94),clamp(b*1.15+10)]);
      ctx.putImageData(img,0,0);
    }
  },

  // ── RETRO (8) ────────────────────────────────────────────────────────────
  { id:'vhs', name:'VHS', emoji:'📼', category:'retro', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h); const d=img.data;
      for(let i=0;i<d.length;i+=4){
        const noise=(Math.random()-0.5)*25;
        d[i]=clamp(d[i]+noise); d[i+1]=clamp(d[i+1]+noise*0.5); d[i+2]=clamp(d[i+2]+noise);
        const y=Math.floor(i/4/w);
        if(y%3===0){d[i]*=0.82;d[i+1]*=0.82;d[i+2]*=0.82;}
      }
      ctx.putImageData(img,0,0);
      // Color bleed
      ctx.save();
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle='rgba(255,0,0,0.04)';
      ctx.fillRect(2,0,w,h);
      ctx.fillStyle='rgba(0,0,255,0.04)';
      ctx.fillRect(-2,0,w,h);
      ctx.restore();
    }
  },
  { id:'dither', name:'Dither', emoji:'▪️', category:'retro', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h); const d=img.data;
      for(let i=0;i<d.length;i+=4){
        const gray=d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114;
        const px=Math.floor(i/4); const x=px%w; const y=Math.floor(px/w);
        const threshold=((x+y)%2===0)?128:96;
        const val=gray>threshold?255:0;
        d[i]=d[i+1]=d[i+2]=val;
      }
      ctx.putImageData(img,0,0);
    }
  },
  { id:'sepia_chrome', name:'Sepia Chrome', emoji:'📷', category:'retro', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        return[clamp(r*0.393+g*0.769+b*0.189),clamp(r*0.349+g*0.686+b*0.168),clamp(r*0.272+g*0.534+b*0.131)];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'gameboy', name:'Game Boy', emoji:'🟩', category:'retro', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h); const d=img.data;
      const palette=[[15,56,15],[48,98,48],[139,172,15],[155,188,15]];
      for(let i=0;i<d.length;i+=4){
        const gray=(d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114)/255;
        const idx=Math.min(3,Math.floor(gray*4));
        d[i]=palette[idx][0];d[i+1]=palette[idx][1];d[i+2]=palette[idx][2];
      }
      ctx.putImageData(img,0,0);
    }
  },
  { id:'crt', name:'CRT Screen', emoji:'📺', category:'retro', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h); const d=img.data;
      for(let y=0;y<h;y++){
        for(let x=0;x<w;x++){
          const i=(y*w+x)*4;
          const scanline=y%2===0?0.85:1.0;
          d[i]*=scanline;d[i+1]*=scanline;d[i+2]*=scanline;
          if(x%3===0) d[i]=clamp(d[i]*1.3);
          else if(x%3===1) d[i+1]=clamp(d[i+1]*1.3);
          else d[i+2]=clamp(d[i+2]*1.3);
        }
      }
      ctx.putImageData(img,0,0);
    }
  },
  { id:'neon_80s', name:'80s Neon', emoji:'🕹️', category:'retro', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const [hn,s,l]=rgbToHsl(r,g,b);
        const [nr,ng,nb]=hslToRgb(hn,Math.min(1,s*1.8),Math.min(1,l*1.15));
        return[nr,ng,nb];
      });
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle='rgba(255,0,200,0.08)';
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'polaroid', name:'Polaroid', emoji:'🖼️', category:'retro', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*0.96+12),clamp(g*0.94+8),clamp(b*0.88+6)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.strokeStyle='rgba(255,255,255,0.15)';
      ctx.lineWidth=w*0.04;
      ctx.strokeRect(w*0.02,h*0.02,w*0.96,h*0.96);
      ctx.restore();
    }
  },
  { id:'commodore', name:'Commodore 64', emoji:'💾', category:'retro', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h); const d=img.data;
      const c64=[
        [0,0,0],[255,255,255],[136,0,0],[170,255,238],[204,68,204],[0,204,85],
        [0,0,170],[238,238,119],[221,136,85],[102,68,0],[255,119,119],[51,51,51],
        [119,119,119],[170,255,102],[0,136,255],[187,187,187]
      ];
      for(let i=0;i<d.length;i+=4){
        let best=0,bestD=Infinity;
        for(let j=0;j<c64.length;j++){
          const dr=d[i]-c64[j][0],dg=d[i+1]-c64[j][1],db=d[i+2]-c64[j][2];
          const dist=dr*dr+dg*dg+db*db;
          if(dist<bestD){bestD=dist;best=j;}
        }
        d[i]=c64[best][0];d[i+1]=c64[best][1];d[i+2]=c64[best][2];
      }
      ctx.putImageData(img,0,0);
    }
  },

  // ── HORROR (6) ───────────────────────────────────────────────────────────
  { id:'horror_blood', name:'Blood Moon', emoji:'🩸', category:'horror', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.3),clamp(g*0.5),clamp(b*0.45)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'ghost', name:'Ghost', emoji:'👻', category:'horror', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const gray=r*0.299+g*0.587+b*0.114;
        return[clamp(gray+40),clamp(gray+50),clamp(gray+60)];
      });
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalAlpha=0.3;
      ctx.fillStyle='rgba(200,220,255,0.3)';
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'demon_eyes', name:'Demon Eyes', emoji:'😈', category:'horror', cost:3,
    apply:(ctx,w,h,lm)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.1),clamp(g*0.7),clamp(b*0.7)]);
      ctx.putImageData(img,0,0);
      if(!lm||lm.length<10) return;
      const eyes=[[lm[159]?.x*w,lm[159]?.y*h],[lm[386]?.x*w,lm[386]?.y*h]];
      ctx.save();
      for(const[ex,ey] of eyes){
        if(!ex||!ey) continue;
        const g=ctx.createRadialGradient(ex,ey,0,ex,ey,w*0.04);
        g.addColorStop(0,'rgba(255,0,0,0.9)');
        g.addColorStop(0.3,'rgba(200,0,0,0.6)');
        g.addColorStop(1,'rgba(150,0,0,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ex,ey,w*0.04,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  },
  { id:'infrared', name:'Infrared', emoji:'🌡️', category:'horror', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const heat=r*0.5+g*0.3+b*0.2;
        if(heat>200) return[255,clamp((heat-200)*2.5),0];
        if(heat>128) return[clamp((heat-128)*2),0,0];
        return[0,0,clamp(heat*2)];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'zombie', name:'Zombie', emoji:'🧟', category:'horror', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*0.7),clamp(g*0.85+10),clamp(b*0.6)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'void', name:'Void', emoji:'🌑', category:'horror', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const l=r*0.299+g*0.587+b*0.114;
        return[clamp(l*0.3),clamp(l*0.2),clamp(l*0.35)];
      });
      ctx.putImageData(img,0,0);
    }
  },

  // ── ANIME (8) ────────────────────────────────────────────────────────────
  { id:'anime_soft', name:'Anime Soft', emoji:'🌸', category:'anime', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.04+6),clamp(g*1.02+4),clamp(b*1.06+8)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle='rgba(255,200,220,0.08)';
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'manga_lines', name:'Manga', emoji:'📖', category:'anime', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h); const d=img.data;
      const src=new Uint8ClampedArray(d);
      for(let y=1;y<h-1;y++) for(let x=1;x<w-1;x++){
        const i=(y*w+x)*4;
        const gray=(d[i]*0.299+d[i+1]*0.587+d[i+2]*0.114);
        const n=(src[(y-1)*w*4+x*4]*0.299+src[(y-1)*w*4+x*4+1]*0.587+src[(y-1)*w*4+x*4+2]*0.114);
        const s=(src[(y+1)*w*4+x*4]*0.299+src[(y+1)*w*4+x*4+1]*0.587+src[(y+1)*w*4+x*4+2]*0.114);
        const edge=Math.abs(gray-n)+Math.abs(gray-s);
        const out=edge>30?0:255;
        d[i]=d[i+1]=d[i+2]=out;
      }
      ctx.putImageData(img,0,0);
    }
  },
  { id:'sakura_bloom', name:'Sakura Bloom', emoji:'🌺', category:'anime', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.08+5),clamp(g*0.96+3),clamp(b*1.04+8)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalCompositeOperation='screen';
      const grd=ctx.createLinearGradient(0,0,w,h);
      grd.addColorStop(0,'rgba(255,182,193,0.1)');
      grd.addColorStop(1,'rgba(255,105,180,0.08)');
      ctx.fillStyle=grd; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'shonen', name:'Shonen', emoji:'⚡', category:'anime', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.12),clamp(g*1.05),clamp(b*0.9)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle='rgba(255,255,0,0.06)';
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'shoujo', name:'Shoujo', emoji:'💕', category:'anime', cost:2,
    apply:(ctx,w,h)=>{
      ctx.save();
      const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*0.7);
      g.addColorStop(0,'rgba(255,200,220,0)');
      g.addColorStop(1,'rgba(255,150,180,0.2)');
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'neon_anime', name:'Neon Anime', emoji:'🌃', category:'anime', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const [hn,s,l]=rgbToHsl(r,g,b);
        const [nr,ng,nb]=hslToRgb(hn,Math.min(1,s*2.0),Math.min(0.95,l*1.1));
        return[nr,ng,nb];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'chibi', name:'Chibi Glow', emoji:'🎀', category:'anime', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.06+8),clamp(g*1.04+6),clamp(b*1.08+10)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'cel_shade', name:'Cel Shade', emoji:'🎨', category:'anime', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const quantize=(v)=>Math.round(v/64)*64;
        return[quantize(r),quantize(g),quantize(b)];
      });
      ctx.putImageData(img,0,0);
    }
  },

  // ── CYBERPUNK (8) ────────────────────────────────────────────────────────
  { id:'chromatic_aberration', name:'Chromatic', emoji:'🌈', category:'cyberpunk', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      const out=ctx.createImageData(w,h);
      const shift=4;
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        const rIdx=(y*w+Math.min(w-1,x+shift))*4;
        const bIdx=(y*w+Math.max(0,x-shift))*4;
        out.data[i]=img.data[rIdx]; out.data[i+1]=img.data[i+1];
        out.data[i+2]=img.data[bIdx+2]; out.data[i+3]=255;
      }
      ctx.putImageData(out,0,0);
    }
  },
  { id:'synthwave', name:'Synthwave', emoji:'🌆', category:'cyberpunk', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.1+10),clamp(g*0.75),clamp(b*1.2+15)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalCompositeOperation='screen';
      const g=ctx.createLinearGradient(0,h*0.6,0,h);
      g.addColorStop(0,'rgba(255,0,200,0.12)');
      g.addColorStop(1,'rgba(0,200,255,0.12)');
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'matrix', name:'Matrix', emoji:'💚', category:'cyberpunk', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const gray=r*0.299+g*0.587+b*0.114;
        return[0,clamp(gray*1.2),0];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'neon_dream', name:'Neon Dream', emoji:'💜', category:'cyberpunk', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.08),clamp(g*0.78),clamp(b*1.32+8)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle='rgba(180,0,255,0.06)';
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'digital_glitch', name:'Glitch', emoji:'⚡', category:'cyberpunk', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h); const d=img.data;
      // Random horizontal slice shifts
      const slices=Math.floor(Math.random()*6)+2;
      for(let s=0;s<slices;s++){
        const y0=Math.floor(Math.random()*h);
        const y1=y0+Math.floor(Math.random()*30)+5;
        const shift=(Math.random()-0.5)*40;
        for(let y=y0;y<Math.min(y1,h);y++) for(let x=0;x<w;x++){
          const src=((y*w+Math.max(0,Math.min(w-1,Math.floor(x+shift))))*4);
          const dst=(y*w+x)*4;
          d[dst]=img.data[src]; d[dst+1]=img.data[src+1]; d[dst+2]=img.data[src+2];
        }
      }
      ctx.putImageData(img,0,0);
    }
  },
  { id:'liquid_metal', name:'Liquid Metal', emoji:'🪞', category:'cyberpunk', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const l=(r+g+b)/3;
        const metallic=Math.pow(l/255,0.5)*255;
        return[clamp(metallic*1.1+r*0.1),clamp(metallic*1.05+g*0.1),clamp(metallic*1.1+b*0.1)];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'hologram', name:'Hologram', emoji:'🔷', category:'cyberpunk', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h); const d=img.data;
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){
        const i=(y*w+x)*4;
        const scan=Math.sin(y*0.3)*0.15;
        d[i]=clamp(d[i]*0.3+scan*255);
        d[i+1]=clamp(d[i+1]*0.8+scan*200);
        d[i+2]=clamp(d[i+2]*0.3+scan*255);
        if(y%4===0){d[i]*=0.7;d[i+1]*=0.7;d[i+2]*=0.7;}
      }
      ctx.putImageData(img,0,0);
    }
  },
  { id:'thermal_night', name:'Thermal Night', emoji:'🌡️', category:'cyberpunk', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const heat=r*0.5+g*0.3+b*0.2;
        if(heat>180) return[255,clamp((heat-180)*3),0];
        if(heat>100) return[clamp((heat-100)*2.5),clamp(heat*0.5),0];
        return[0,clamp(heat*0.5),clamp(180-heat)];
      });
      ctx.putImageData(img,0,0);
    }
  },

  // ── FANTASY (6) ──────────────────────────────────────────────────────────
  { id:'fairy_dust', name:'Fairy Dust', emoji:'🧚', category:'fantasy', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.04+4),clamp(g*1.06+8),clamp(b*1.08+12)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalCompositeOperation='screen';
      const g=ctx.createRadialGradient(w/2,h/3,0,w/2,h/3,w*0.6);
      g.addColorStop(0,'rgba(255,255,200,0.12)');
      g.addColorStop(1,'rgba(100,200,255,0)');
      ctx.fillStyle=g; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'enchanted', name:'Enchanted', emoji:'🔮', category:'fantasy', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*0.9+8),clamp(g*0.82+5),clamp(b*1.2+15)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'dragon_fire', name:'Dragon Fire', emoji:'🐉', category:'fantasy', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.25+15),clamp(g*0.9+5),clamp(b*0.5)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'moonlight_magic', name:'Moonlight', emoji:'🌙', category:'fantasy', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*0.82),clamp(g*0.88),clamp(b*1.15+10)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.globalCompositeOperation='screen';
      ctx.fillStyle='rgba(200,200,255,0.08)';
      ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'forest_spirit', name:'Forest Spirit', emoji:'🌿', category:'fantasy', cost:1,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*0.88),clamp(g*1.12+6),clamp(b*0.88)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'crystal_prism', name:'Crystal Prism', emoji:'💎', category:'fantasy', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      const out=ctx.createImageData(w,h);
      const t=Date.now()*0.001;
      for(let y=0;y<h;y++) for(let x=0;x<w;x++){
        const wave=Math.sin((x+y)*0.05+t)*3;
        const sx=Math.max(0,Math.min(w-1,Math.floor(x+wave)));
        const sy=Math.max(0,Math.min(h-1,Math.floor(y+wave)));
        const src=(sy*w+sx)*4; const dst=(y*w+x)*4;
        out.data[dst]=img.data[src]; out.data[dst+1]=img.data[src+1];
        out.data[dst+2]=img.data[src+2]; out.data[dst+3]=255;
      }
      ctx.putImageData(out,0,0);
    }
  },

  // ── VTUBER (8) ───────────────────────────────────────────────────────────
  { id:'vtuber_ears', name:'Cat Ears', emoji:'🐱', category:'vtuber', cost:1,
    particleType:false,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const topL=lm[109]; const topR=lm[338];
      if(!topL||!topR) return;
      const s=w*0.12;
      ctx.save();
      ctx.fillStyle='#f4a0c0';
      // Left ear
      const lx=topL.x*w, ly=topL.y*h;
      ctx.beginPath(); ctx.moveTo(lx,ly); ctx.lineTo(lx-s*0.6,ly-s); ctx.lineTo(lx+s*0.4,ly); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ff8fb1';
      ctx.beginPath(); ctx.moveTo(lx-s*0.05,ly-s*0.1); ctx.lineTo(lx-s*0.5,ly-s*0.8); ctx.lineTo(lx+s*0.28,ly-s*0.1); ctx.closePath(); ctx.fill();
      // Right ear
      ctx.fillStyle='#f4a0c0';
      const rx=topR.x*w, ry=topR.y*h;
      ctx.beginPath(); ctx.moveTo(rx,ry); ctx.lineTo(rx+s*0.6,ry-s); ctx.lineTo(rx-s*0.4,ry); ctx.closePath(); ctx.fill();
      ctx.fillStyle='#ff8fb1';
      ctx.beginPath(); ctx.moveTo(rx+s*0.05,ry-s*0.1); ctx.lineTo(rx+s*0.5,ry-s*0.8); ctx.lineTo(rx-s*0.28,ry-s*0.1); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  },
  { id:'vtuber_fox', name:'Fox Ears', emoji:'🦊', category:'vtuber', cost:1,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const topL=lm[109]; const topR=lm[338];
      if(!topL||!topR) return;
      const s=w*0.13;
      ctx.save();
      for(const[lm2,dir] of [[topL,-1],[topR,1]]){
        const bx=lm2.x*w, by=lm2.y*h;
        ctx.fillStyle='#ff8c00';
        ctx.beginPath(); ctx.moveTo(bx,by); ctx.lineTo(bx+dir*s*0.7,by-s*1.1); ctx.lineTo(bx+dir*s*1.1,by); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#fff5e0';
        ctx.beginPath(); ctx.moveTo(bx+dir*s*0.1,by-s*0.15); ctx.lineTo(bx+dir*s*0.65,by-s*0.9); ctx.lineTo(bx+dir*s*0.95,by-s*0.15); ctx.closePath(); ctx.fill();
        ctx.fillStyle='#222';
        ctx.beginPath(); ctx.arc(bx+dir*s*0.6,by-s*0.4,s*0.08,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  },
  { id:'vtuber_halo', name:'Halo', emoji:'😇', category:'vtuber', cost:1,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const head=lm[10];
      if(!head) return;
      const hx=head.x*w, hy=head.y*h-w*0.08;
      ctx.save();
      ctx.strokeStyle='rgba(255,220,50,0.9)'; ctx.lineWidth=w*0.015;
      ctx.shadowColor='rgba(255,220,50,0.8)'; ctx.shadowBlur=12;
      ctx.beginPath(); ctx.ellipse(hx,hy,w*0.1,w*0.035,0,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  },
  { id:'vtuber_glasses', name:'VTuber Glasses', emoji:'🤓', category:'vtuber', cost:1,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const le=lm[159], re=lm[386];
      if(!le||!re) return;
      const lx=le.x*w, ly=le.y*h, rx=re.x*w, ry=re.y*h;
      const d=Math.hypot(rx-lx,ry-ly); const r=d*0.38;
      ctx.save();
      const angle=Math.atan2(ry-ly,rx-lx);
      ctx.translate((lx+rx)/2,(ly+ry)/2); ctx.rotate(angle);
      ctx.strokeStyle='#00ffcc'; ctx.lineWidth=2;
      ctx.shadowColor='#00ffcc'; ctx.shadowBlur=8;
      ctx.beginPath(); ctx.arc(-d/2,0,r,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.arc(d/2,0,r,0,Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-d/2+r,0); ctx.lineTo(d/2-r,0); ctx.stroke();
      ctx.restore();
    }
  },
  { id:'vtuber_horns', name:'Demon Horns', emoji:'😈', category:'vtuber', cost:1,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const topL=lm[109], topR=lm[338];
      if(!topL||!topR) return;
      const s=w*0.08;
      ctx.save();
      for(const[lm2,dir] of [[topL,-1],[topR,1]]){
        const bx=lm2.x*w, by=lm2.y*h;
        const g=ctx.createLinearGradient(bx,by,bx+dir*s*0.3,by-s*1.2);
        g.addColorStop(0,'#8b0000'); g.addColorStop(1,'#cc2200');
        ctx.fillStyle=g;
        ctx.beginPath();
        ctx.moveTo(bx,by);
        ctx.bezierCurveTo(bx+dir*s*0.5,by-s*0.4,bx+dir*s*0.4,by-s,bx+dir*s*0.2,by-s*1.2);
        ctx.bezierCurveTo(bx,by-s*0.9,bx-dir*s*0.1,by-s*0.3,bx,by);
        ctx.fill();
      }
      ctx.restore();
    }
  },
  { id:'vtuber_tail', name:'Cat Tail', emoji:'🐈', category:'vtuber', cost:1,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const hip=lm[175] || {x:0.5,y:0.85};
      const bx=hip.x*w, by=hip.y*h;
      const t=Date.now()*0.002;
      ctx.save();
      ctx.strokeStyle='#a0522d'; ctx.lineWidth=w*0.018;
      ctx.lineCap='round';
      ctx.beginPath();
      ctx.moveTo(bx,by);
      ctx.bezierCurveTo(
        bx+Math.sin(t)*w*0.1, by+h*0.12,
        bx+Math.cos(t*0.7)*w*0.2+w*0.15, by+h*0.08,
        bx+Math.sin(t*0.5)*w*0.08+w*0.18, by-h*0.05
      );
      ctx.stroke();
      ctx.restore();
    }
  },
  { id:'vtuber_blush', name:'Anime Blush', emoji:'😊', category:'vtuber', cost:1,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const cheeks=[[lm[234]?.x*w||w*0.25,lm[234]?.y*h||h*0.55],[lm[454]?.x*w||w*0.75,lm[454]?.y*h||h*0.55]];
      ctx.save();
      for(const[cx,cy] of cheeks){
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,w*0.06);
        g.addColorStop(0,'rgba(255,100,130,0.55)');
        g.addColorStop(0.6,'rgba(255,100,130,0.25)');
        g.addColorStop(1,'rgba(255,100,130,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.ellipse(cx,cy,w*0.06,w*0.04,0,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  },
  { id:'vtuber_star_eyes', name:'Star Eyes', emoji:'🌟', category:'vtuber', cost:2,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const eyes=[[lm[159]?.x*w,lm[159]?.y*h],[lm[386]?.x*w,lm[386]?.y*h]];
      ctx.save();
      ctx.fillStyle='rgba(255,220,0,0.9)';
      ctx.shadowColor='rgba(255,220,0,0.8)'; ctx.shadowBlur=8;
      for(const[ex,ey] of eyes){
        if(!ex||!ey) continue;
        const s=w*0.025;
        ctx.beginPath();
        for(let i=0;i<10;i++){
          const a=i*Math.PI/5-Math.PI/2;
          const r=i%2===0?s:s*0.4;
          i===0?ctx.moveTo(ex+Math.cos(a)*r,ey+Math.sin(a)*r):ctx.lineTo(ex+Math.cos(a)*r,ey+Math.sin(a)*r);
        }
        ctx.closePath(); ctx.fill();
      }
      ctx.restore();
    }
  },

  // ── INTERACTIVE (3) ──────────────────────────────────────────────────────
  { id:'interactive_bg', name:'Color BG', emoji:'🎨', category:'interactive', cost:1,
    apply:(ctx,w,h)=>{
      const t=Date.now()*0.001;
      ctx.save();
      ctx.globalCompositeOperation='soft-light';
      const g=ctx.createLinearGradient(0,0,w,h);
      g.addColorStop(0,`hsl(${(t*30)%360},80%,50%)`);
      g.addColorStop(1,`hsl(${(t*30+180)%360},80%,50%)`);
      ctx.fillStyle=g; ctx.globalAlpha=0.2; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'rainbow_shift', name:'Rainbow', emoji:'🌈', category:'interactive', cost:2,
    apply:(ctx,w,h)=>{
      const t=Date.now()*0.001;
      ctx.save();
      ctx.globalCompositeOperation='overlay';
      const g=ctx.createLinearGradient(0,0,w,0);
      for(let i=0;i<=6;i++) g.addColorStop(i/6,`hsl(${(t*20+i*60)%360},90%,60%)`);
      ctx.fillStyle=g; ctx.globalAlpha=0.15; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'color_pop', name:'Color Pop', emoji:'🎯', category:'interactive', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const [h2,s,l]=rgbToHsl(r,g,b);
        if(s>0.5) return [r,g,b];
        return [clamp(l*255*0.7),clamp(l*255*0.7),clamp(l*255*0.7)];
      });
      ctx.putImageData(img,0,0);
    }
  },

  // ── PARTICLE FX (5) ──────────────────────────────────────────────────────
  { id:'particle_hearts', name:'Hearts', emoji:'💕', category:'particle', cost:2, particleType:'hearts' },
  { id:'particle_sparkle', name:'Sparkle', emoji:'✨', category:'particle', cost:2, particleType:'sparkle' },
  { id:'particle_snow', name:'Snow', emoji:'❄️', category:'particle', cost:2, particleType:'snow' },
  { id:'particle_confetti', name:'Confetti', emoji:'🎉', category:'particle', cost:3, particleType:'confetti' },
  { id:'particle_bubbles', name:'Bubbles', emoji:'🫧', category:'particle', cost:2, particleType:'bubbles' },,

  // ── FACE MASKS — Snapchat Quality (10) ────────────────────────────────────
  { id:'mask_dog', name:'Puppy', emoji:'🐶', category:'vtuber', cost:2,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const nose={x:lm[4]?.x*w||w*0.5,y:lm[4]?.y*h||h*0.55};
      const left={x:lm[234]?.x*w||w*0.25,y:lm[234]?.y*h||h*0.4};
      const right={x:lm[454]?.x*w||w*0.75,y:lm[454]?.y*h||h*0.4};
      const top={x:lm[10]?.x*w||w*0.5,y:lm[10]?.y*h||h*0.2};
      const faceW=Math.hypot(right.x-left.x,right.y-left.y);
      const s=faceW*0.18;
      ctx.save();
      // Ears
      for(const[ex,ey,side] of [[left.x,left.y,-1],[right.x,right.y,1]]){
        ctx.fillStyle='#c68642';
        ctx.beginPath(); ctx.ellipse(ex+side*s*0.5,top.y+s*0.2,s*0.7,s*1.0,side*0.3,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='#e8a87c';
        ctx.beginPath(); ctx.ellipse(ex+side*s*0.5,top.y+s*0.2,s*0.35,s*0.6,side*0.3,0,Math.PI*2); ctx.fill();
      }
      // Nose
      ctx.fillStyle='#3d1a00';
      ctx.beginPath(); ctx.ellipse(nose.x,nose.y,s*0.6,s*0.42,0,0,Math.PI*2); ctx.fill();
      ctx.fillStyle='rgba(255,255,255,0.3)';
      ctx.beginPath(); ctx.ellipse(nose.x-s*0.18,nose.y-s*0.12,s*0.14,s*0.1,0,0,Math.PI*2); ctx.fill();
      // Whiskers
      ctx.strokeStyle='rgba(255,255,255,0.85)'; ctx.lineWidth=1.5;
      for(const[side,angles] of [[-1,[-0.2,0,0.2]],[1,[-0.2,0,0.2]]]){
        for(const a of angles){
          ctx.beginPath(); ctx.moveTo(nose.x,nose.y+s*0.1);
          ctx.lineTo(nose.x+side*s*1.9,nose.y+s*0.1+Math.sin(a)*s*0.5); ctx.stroke();
        }
      }
      // Tongue wag
      const t=Date.now()*0.002;
      ctx.fillStyle='#ff6b9d';
      ctx.beginPath(); ctx.ellipse(nose.x,nose.y+s*0.7+s*0.15*Math.abs(Math.sin(t)),s*0.3,s*0.4,0,0,Math.PI*2); ctx.fill();
      ctx.restore();
    }
  },
  { id:'mask_cat', name:'Kitty', emoji:'🐱', category:'vtuber', cost:2,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const nose={x:lm[4]?.x*w||w*0.5,y:lm[4]?.y*h||h*0.55};
      const topL={x:lm[109]?.x*w||w*0.35,y:lm[109]?.y*h||h*0.25};
      const topR={x:lm[338]?.x*w||w*0.65,y:lm[338]?.y*h||h*0.25};
      const left={x:lm[234]?.x*w||w*0.25,y:lm[234]?.y*h||h*0.45};
      const right={x:lm[454]?.x*w||w*0.75,y:lm[454]?.y*h||h*0.45};
      const faceW=Math.hypot(right.x-left.x,right.y-left.y);
      const s=faceW*0.17;
      ctx.save();
      // Cat ears
      for(const[tip,side] of [[topL,-1],[topR,1]]){
        ctx.fillStyle='#f4a0c0';
        ctx.beginPath(); ctx.moveTo(tip.x,tip.y);
        ctx.lineTo(tip.x+side*s*0.7,tip.y-s*1.1);
        ctx.lineTo(tip.x+side*s*1.3,tip.y+s*0.1);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle='#ff8fb1';
        ctx.beginPath(); ctx.moveTo(tip.x+side*s*0.2,tip.y-s*0.05);
        ctx.lineTo(tip.x+side*s*0.7,tip.y-s*0.8);
        ctx.lineTo(tip.x+side*s*1.05,tip.y-s*0.05);
        ctx.closePath(); ctx.fill();
      }
      // Nose (triangle)
      ctx.fillStyle='#ffb6c1';
      ctx.beginPath(); ctx.moveTo(nose.x,nose.y-s*0.14); ctx.lineTo(nose.x-s*0.2,nose.y+s*0.14); ctx.lineTo(nose.x+s*0.2,nose.y+s*0.14); ctx.closePath(); ctx.fill();
      // Whiskers
      ctx.strokeStyle='rgba(255,255,255,0.9)'; ctx.lineWidth=1.4;
      for(const[side,angles] of [[-1,[-0.25,0,0.25]],[1,[-0.25,0,0.25]]]){
        for(const a of angles){
          ctx.beginPath(); ctx.moveTo(nose.x,nose.y);
          ctx.lineTo(nose.x+side*s*1.8,nose.y+Math.sin(a)*s*0.45); ctx.stroke();
        }
      }
      ctx.restore();
    }
  },
  { id:'mask_crown', name:'Royal Crown', emoji:'👑', category:'vtuber', cost:2,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const top={x:lm[10]?.x*w||w*0.5,y:lm[10]?.y*h||h*0.2};
      const left={x:lm[234]?.x*w||w*0.25,y:lm[234]?.y*h||h*0.45};
      const right={x:lm[454]?.x*w||w*0.75,y:lm[454]?.y*h||h*0.45};
      const faceW=Math.hypot(right.x-left.x,right.y-left.y);
      const cw=faceW*1.1, ch=faceW*0.5;
      const cx=top.x-cw/2, cy=top.y-ch*1.0;
      ctx.save();
      const gld=ctx.createLinearGradient(cx,cy,cx,cy+ch);
      gld.addColorStop(0,'#fff6a0'); gld.addColorStop(0.4,'#ffd700'); gld.addColorStop(1,'#b8860b');
      ctx.fillStyle=gld;
      ctx.strokeStyle='#8B6914'; ctx.lineWidth=2;
      ctx.beginPath();
      ctx.moveTo(cx,cy+ch); ctx.lineTo(cx,cy+ch*0.45);
      ctx.lineTo(cx+cw*0.22,cy+ch*0.72); ctx.lineTo(cx+cw*0.5,cy);
      ctx.lineTo(cx+cw*0.78,cy+ch*0.72); ctx.lineTo(cx+cw,cy+ch*0.45);
      ctx.lineTo(cx+cw,cy+ch); ctx.closePath();
      ctx.fill(); ctx.stroke();
      const gems=['#ff4466','#44ddff','#44ff88','#ff44ff','#ffaa00'];
      [[0.18,0.52],[0.5,0.18],[0.82,0.52]].forEach(([fx,fy],i)=>{
        ctx.fillStyle=gems[i];
        ctx.beginPath(); ctx.arc(cx+cw*fx,cy+ch*fy,faceW*0.05,0,Math.PI*2); ctx.fill();
        ctx.fillStyle='rgba(255,255,255,0.55)';
        ctx.beginPath(); ctx.arc(cx+cw*fx-faceW*0.015,cy+ch*fy-faceW*0.015,faceW*0.018,0,Math.PI*2); ctx.fill();
      });
      ctx.restore();
    }
  },
  { id:'mask_butterfly', name:'Butterfly Mask', emoji:'🦋', category:'vtuber', cost:3,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const noseB={x:lm[4]?.x*w||w*0.5,y:lm[4]?.y*h||h*0.52};
      const leftE={x:lm[159]?.x*w||w*0.35,y:lm[159]?.y*h||h*0.43};
      const rightE={x:lm[386]?.x*w||w*0.65,y:lm[386]?.y*h||h*0.43};
      const t=Date.now()*0.001;
      ctx.save();
      ctx.globalAlpha=0.88;
      for(const[ex,ey,side] of [[leftE.x,leftE.y,-1],[rightE.x,rightE.y,1]]){
        const flap=Math.sin(t*3)*0.08;
        ctx.save(); ctx.translate(noseB.x,noseB.y); ctx.rotate(side*flap);
        const wingW=w*0.18,wingH=h*0.12;
        const g=ctx.createRadialGradient(side*wingW*0.5,0,0,side*wingW*0.5,0,wingW);
        g.addColorStop(0,`hsl(${(t*30)%360},100%,65%)`);
        g.addColorStop(0.5,`hsl(${(t*30+60)%360},90%,50%)`);
        g.addColorStop(1,'rgba(0,0,0,0)');
        ctx.fillStyle=g;
        ctx.beginPath();
        ctx.moveTo(0,0);
        ctx.bezierCurveTo(side*wingW*0.3,-wingH*1.2,side*wingW*1.1,-wingH*0.8,side*wingW*1.0,wingH*0.1);
        ctx.bezierCurveTo(side*wingW*0.8,wingH*0.8,side*wingW*0.2,wingH*0.4,0,0);
        ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  },
  { id:'mask_sunglasses_3d', name:'3D Shades', emoji:'🕶️', category:'vtuber', cost:2,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const leftE={x:lm[159]?.x*w,y:lm[159]?.y*h};
      const rightE={x:lm[386]?.x*w,y:lm[386]?.y*h};
      if(!leftE.x||!rightE.x) return;
      const eyeD=Math.hypot(rightE.x-leftE.x,rightE.y-leftE.y);
      const angle=Math.atan2(rightE.y-leftE.y,rightE.x-leftE.x);
      const r=eyeD*0.44;
      ctx.save();
      ctx.translate((leftE.x+rightE.x)/2,(leftE.y+rightE.y)/2);
      ctx.rotate(angle);
      // Frame shadow
      ctx.fillStyle='rgba(0,0,0,0.3)';
      ctx.beginPath(); ctx.ellipse(-eyeD/2+3,3,r+3,r*0.78,0,0,Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(eyeD/2+3,3,r+3,r*0.78,0,0,Math.PI*2); ctx.fill();
      // Lens gradient
      const lensColors=[['rgba(0,80,180,0.92)','rgba(0,0,80,0.95)'],['rgba(0,80,180,0.92)','rgba(0,0,80,0.95)']];
      for(const[i,cx] of [[-eyeD/2,0],[eyeD/2,1]]){
        const lg=ctx.createRadialGradient(i,0,0,i,0,r);
        lg.addColorStop(0,'rgba(60,140,255,0.85)'); lg.addColorStop(1,'rgba(0,0,100,0.95)');
        ctx.fillStyle=lg;
        ctx.beginPath(); ctx.ellipse(i,0,r,r*0.76,0,0,Math.PI*2); ctx.fill();
        ctx.strokeStyle='#1a1a2e'; ctx.lineWidth=2.5;
        ctx.beginPath(); ctx.ellipse(i,0,r,r*0.76,0,0,Math.PI*2); ctx.stroke();
        // Lens shine
        ctx.fillStyle='rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.ellipse(i-r*0.25,-r*0.22,r*0.4,r*0.22,-0.4,0,Math.PI*2); ctx.fill();
      }
      // Bridge
      ctx.strokeStyle='#1a1a2e'; ctx.lineWidth=3;
      ctx.beginPath(); ctx.moveTo(-eyeD/2+r,-2); ctx.lineTo(eyeD/2-r,-2); ctx.stroke();
      // Arms
      ctx.strokeStyle='#1a1a2e'; ctx.lineWidth=2.5;
      ctx.beginPath(); ctx.moveTo(-eyeD/2-r,0); ctx.lineTo(-eyeD/2-r*1.5,0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(eyeD/2+r,0); ctx.lineTo(eyeD/2+r*1.5,0); ctx.stroke();
      ctx.restore();
    }
  },
  { id:'mask_flames', name:'Flame Eyes', emoji:'🔥', category:'vtuber', cost:3,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const eyes=[{x:lm[159]?.x*w,y:lm[159]?.y*h},{x:lm[386]?.x*w,y:lm[386]?.y*h}];
      const t=Date.now()*0.001;
      ctx.save();
      for(const{x:ex,y:ey} of eyes){
        if(!ex||!ey) continue;
        const r=w*0.048;
        for(let i=0;i<12;i++){
          const a=(i/12)*Math.PI*2+t*2.5;
          const flicker=0.65+0.35*Math.sin(t*7+i*1.7);
          const grd=ctx.createRadialGradient(ex,ey,0,ex+Math.cos(a)*r*0.3,ey+Math.sin(a)*r*0.3,r*1.5*flicker);
          grd.addColorStop(0,'rgba(255,250,80,1)');
          grd.addColorStop(0.25,'rgba(255,140,0,0.9)');
          grd.addColorStop(0.6,'rgba(220,30,0,0.6)');
          grd.addColorStop(1,'rgba(100,0,0,0)');
          ctx.fillStyle=grd;
          ctx.beginPath(); ctx.arc(ex,ey,r*1.5*flicker,0,Math.PI*2); ctx.fill();
        }
        // Pupil
        ctx.fillStyle='rgba(255,250,80,0.95)';
        ctx.beginPath(); ctx.arc(ex,ey,r*0.28,0,Math.PI*2); ctx.fill();
      }
      ctx.restore();
    }
  },
  { id:'mask_neon_outline', name:'Neon Face', emoji:'💜', category:'vtuber', cost:2,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<468) return;
      const t=Date.now()*0.001;
      const hue=(t*25)%360;
      ctx.save();
      ctx.strokeStyle=`hsl(${hue},100%,62%)`; ctx.lineWidth=2.2;
      ctx.shadowColor=`hsl(${hue},100%,62%)`; ctx.shadowBlur=14;
      ctx.globalAlpha=0.88;
      // Face oval from silhouette landmarks
      const silhouette=[10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];
      ctx.beginPath();
      silhouette.forEach((i,idx)=>{
        const p=lm[i]||{x:0.5,y:0.5};
        idx===0?ctx.moveTo(p.x*w,p.y*h):ctx.lineTo(p.x*w,p.y*h);
      });
      ctx.closePath(); ctx.stroke();
      // Eyes
      [[33,7,163,144,145,153,154,155],[362,382,381,380,374,373,390,249]].forEach(ring=>{
        ctx.beginPath();
        ring.forEach((i,idx)=>{
          const p=lm[i]||{x:0.5,y:0.5};
          idx===0?ctx.moveTo(p.x*w,p.y*h):ctx.lineTo(p.x*w,p.y*h);
        });
        ctx.closePath(); ctx.stroke();
      });
      ctx.restore();
    }
  },
  { id:'mask_glitter_face', name:'Glitter', emoji:'💎', category:'beauty', cost:3,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const nose={x:lm[4]?.x*w||w*0.5,y:lm[4]?.y*h||h*0.5};
      const left={x:lm[234]?.x*w||w*0.25,y:lm[234]?.y*h||h*0.45};
      const right={x:lm[454]?.x*w||w*0.75,y:lm[454]?.y*h||h*0.45};
      const faceW=Math.hypot(right.x-left.x,right.y-left.y);
      const t=Date.now()*0.003;
      ctx.save();
      ctx.globalCompositeOperation='screen';
      // Cheekbone glitter
      const cheeks=[[lm[234]?.x*w||w*0.28,lm[234]?.y*h||h*0.5],[lm[454]?.x*w||w*0.72,lm[454]?.y*h||h*0.5]];
      for(const[cx,cy] of cheeks){
        for(let i=0;i<30;i++){
          const seed=i*137.5;
          const px=cx+(Math.sin(seed)*0.5)*faceW*0.25;
          const py=cy+(Math.cos(seed*1.3)*0.5)*faceW*0.15;
          const blink=Math.abs(Math.sin(t*3+seed));
          const hue=(seed*27+t*30)%360;
          ctx.fillStyle=`hsla(${hue},100%,80%,${blink*0.9})`;
          ctx.beginPath(); ctx.arc(px,py,1.5+blink*2,0,Math.PI*2); ctx.fill();
        }
      }
      ctx.restore();
    }
  },
  { id:'mask_cyborg', name:'Cyborg', emoji:'🤖', category:'vtuber', cost:3,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const leftE={x:lm[159]?.x*w,y:lm[159]?.y*h};
      const rightE={x:lm[386]?.x*w,y:lm[386]?.y*h};
      const t=Date.now()*0.001;
      const eyeD=Math.hypot(rightE.x-leftE.x,rightE.y-leftE.y);
      ctx.save();
      // Left eye cybernetic ring
      if(leftE.x){
        const r=eyeD*0.28;
        ctx.strokeStyle=`hsl(${(t*60)%360},100%,55%)`; ctx.lineWidth=2;
        ctx.shadowColor=`hsl(${(t*60)%360},100%,55%)`; ctx.shadowBlur=10;
        ctx.beginPath(); ctx.arc(leftE.x,leftE.y,r,0,Math.PI*2); ctx.stroke();
        // Scan arc
        ctx.beginPath(); ctx.arc(leftE.x,leftE.y,r+4,t%( Math.PI*2),t%(Math.PI*2)+1); ctx.stroke();
        // Target cross
        ctx.strokeStyle=`rgba(0,255,200,0.7)`; ctx.lineWidth=1;
        ctx.beginPath(); ctx.moveTo(leftE.x-r*1.3,leftE.y); ctx.lineTo(leftE.x+r*1.3,leftE.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(leftE.x,leftE.y-r*1.3); ctx.lineTo(leftE.x,leftE.y+r*1.3); ctx.stroke();
      }
      // Face circuit lines
      const cheekR={x:lm[454]?.x*w||rightE.x+eyeD,y:lm[454]?.y*h||rightE.y};
      ctx.strokeStyle='rgba(0,200,255,0.5)'; ctx.lineWidth=1.2; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.moveTo(rightE.x+eyeD*0.3,rightE.y); ctx.lineTo(cheekR.x,cheekR.y-eyeD*0.2); ctx.lineTo(cheekR.x,cheekR.y+eyeD*0.4); ctx.stroke();
      ctx.restore();
    }
  },
  { id:'mask_angel_halo', name:'Angel Halo', emoji:'😇', category:'vtuber', cost:2,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const top={x:lm[10]?.x*w||w*0.5,y:lm[10]?.y*h||h*0.22};
      const left={x:lm[234]?.x*w||w*0.25,y:lm[234]?.y*h||h*0.45};
      const right={x:lm[454]?.x*w||w*0.75,y:lm[454]?.y*h||h*0.45};
      const faceW=Math.hypot(right.x-left.x,right.y-left.y);
      const t=Date.now()*0.001;
      const pf=Math.sin(t*2)*0.03;
      ctx.save();
      // Halo glow
      const hg=ctx.createRadialGradient(top.x,top.y-faceW*0.22,faceW*0.15,top.x,top.y-faceW*0.22,faceW*0.42);
      hg.addColorStop(0,'rgba(255,250,180,0)');
      hg.addColorStop(0.7,'rgba(255,240,100,0.3)');
      hg.addColorStop(0.88,'rgba(255,220,0,0.6)');
      hg.addColorStop(1,'rgba(255,200,0,0)');
      ctx.fillStyle=hg;
      ctx.beginPath(); ctx.arc(top.x,top.y-faceW*0.22+pf*h,faceW*0.42,0,Math.PI*2); ctx.fill();
      // Halo ring
      ctx.strokeStyle='rgba(255,230,50,0.95)'; ctx.lineWidth=faceW*0.04;
      ctx.shadowColor='rgba(255,230,50,0.8)'; ctx.shadowBlur=18;
      ctx.beginPath(); ctx.ellipse(top.x,top.y-faceW*0.22+pf*h,faceW*0.3,faceW*0.08,0,0,Math.PI*2); ctx.stroke();
      ctx.restore();
    }
  },

  // ── CINEMATIC GRADES — Premium (8) ───────────────────────────────────────
  { id:'film_bleach', name:'Bleach Bypass', emoji:'🎞️', category:'cinematic', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const l=(r*0.299+g*0.587+b*0.114);
        const blend=0.5;
        return [clamp(r*(1-blend)+l*blend*1.1),clamp(g*(1-blend)+l*blend*1.05),clamp(b*(1-blend)+l*blend*0.95)];
      });
      ctx.putImageData(img,0,0);
      ctx.save(); ctx.globalCompositeOperation='multiply';
      ctx.fillStyle='rgba(20,15,5,0.25)'; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'teal_orange', name:'Teal & Orange', emoji:'🎬', category:'cinematic', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const l=(r*0.299+g*0.587+b*0.114);
        const isSkin=r>95&&g>40&&b>20&&r>g&&r>b;
        if(isSkin) return [clamp(r*1.12+18),clamp(g*0.98),clamp(b*0.82)];
        return [clamp(r*0.85),clamp(g*1.02+5),clamp(b*1.18+15)];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'noir_grade', name:'Neo Noir', emoji:'🌃', category:'cinematic', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const g2=r*0.21+g*0.72+b*0.07;
        const c=(g2-128)*1.3+128;
        return [clamp(c+5),clamp(c),clamp(c+15)];
      });
      ctx.putImageData(img,0,0);
      ctx.save();
      const vig=ctx.createRadialGradient(w/2,h/2,h*0.2,w/2,h/2,h*0.75);
      vig.addColorStop(0,'rgba(0,0,0,0)'); vig.addColorStop(1,'rgba(0,0,30,0.65)');
      ctx.fillStyle=vig; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'kodak_400', name:'Kodak 400', emoji:'📷', category:'cinematic', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.08+12),clamp(g*1.03+5),clamp(b*0.88)]);
      ctx.putImageData(img,0,0);
      // Film grain
      const grain=ctx.getImageData(0,0,w,h);
      const d=grain.data;
      for(let i=0;i<d.length;i+=4){
        const n=(Math.random()-0.5)*18;
        d[i]=clamp(d[i]+n); d[i+1]=clamp(d[i+1]+n); d[i+2]=clamp(d[i+2]+n);
      }
      ctx.putImageData(grain,0,0);
    }
  },
  { id:'fuji_pro', name:'Fuji Pro 400H', emoji:'🌿', category:'cinematic', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*0.97+8),clamp(g*1.06+10),clamp(b*1.02+18)]);
      ctx.putImageData(img,0,0);
    }
  },
  { id:'moonlight_grade', name:'Moonlight', emoji:'🌙', category:'cinematic', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const [h2,s,l]=rgbToHsl(r,g,b);
        return hslToRgb((h2+0.58)%1,s*0.65,l*0.88);
      });
      ctx.putImageData(img,0,0);
      ctx.save(); ctx.globalCompositeOperation='screen';
      ctx.fillStyle='rgba(30,50,100,0.12)'; ctx.fillRect(0,0,w,h);
      ctx.restore();
    }
  },
  { id:'summer_haze', name:'Summer Haze', emoji:'☀️', category:'cinematic', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.06+20),clamp(g*1.04+12),clamp(b*0.88)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      ctx.filter='blur(0.6px)'; ctx.globalAlpha=0.12;
      ctx.drawImage(ctx.canvas,0,0);
      ctx.filter='none'; ctx.globalAlpha=1;
      ctx.restore();
    }
  },
  { id:'cyberpunk_2', name:'Outrun', emoji:'🌆', category:'cyberpunk', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>[clamp(r*1.15+10),clamp(g*0.7),clamp(b*1.35+20)]);
      ctx.putImageData(img,0,0);
      ctx.save();
      // Scanlines
      ctx.globalCompositeOperation='multiply';
      for(let y=0;y<h;y+=4){ ctx.fillStyle='rgba(0,0,0,0.08)'; ctx.fillRect(0,y,w,2); }
      ctx.restore();
    }
  },

  // ── ANIME/MANGA UPGRADE (5) ───────────────────────────────────────────────
  { id:'anime_pop', name:'Anime Pop', emoji:'✨', category:'anime', cost:2,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        const [h2,s,l]=rgbToHsl(r,g,b);
        return hslToRgb(h2,Math.min(1,s*1.5),l>0.5?Math.min(1,l*1.08):l*0.92);
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'cel_shade', name:'Cel Shading', emoji:'🎨', category:'anime', cost:3,
    apply:(ctx,w,h)=>{
      const img=ctx.getImageData(0,0,w,h);
      adjustPixels(img,(r,g,b)=>{
        // Posterize to 4 levels
        const snap=v=>Math.round(v/64)*64;
        return [snap(r),snap(g),snap(b)];
      });
      ctx.putImageData(img,0,0);
    }
  },
  { id:'sparkle_eyes', name:'Sparkle Eyes', emoji:'🌟', category:'anime', cost:2,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const eyes=[{x:lm[159]?.x*w,y:lm[159]?.y*h},{x:lm[386]?.x*w,y:lm[386]?.y*h}];
      const t=Date.now()*0.003;
      ctx.save();
      for(const{x:ex,y:ey} of eyes){
        if(!ex||!ey) continue;
        const r=w*0.022;
        const g=ctx.createRadialGradient(ex,ey,0,ex,ey,r*2);
        g.addColorStop(0,'rgba(255,255,255,0.95)');
        g.addColorStop(0.3,'rgba(180,220,255,0.7)');
        g.addColorStop(1,'rgba(100,150,255,0)');
        ctx.fillStyle=g; ctx.beginPath(); ctx.arc(ex,ey,r*2,0,Math.PI*2); ctx.fill();
        // Rotating sparkle
        ctx.save(); ctx.translate(ex,ey); ctx.rotate(t);
        ctx.fillStyle='rgba(255,255,255,0.9)';
        ctx.beginPath();
        for(let i=0;i<8;i++){
          const a=i*Math.PI/4; const sr=i%2===0?r*1.1:r*0.45;
          i===0?ctx.moveTo(Math.cos(a)*sr,Math.sin(a)*sr):ctx.lineTo(Math.cos(a)*sr,Math.sin(a)*sr);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      ctx.restore();
    }
  },
  { id:'anime_blush_lines', name:'Blush Lines', emoji:'😳', category:'anime', cost:1,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const cheeks=[[lm[234]?.x*w||w*0.25,lm[234]?.y*h||h*0.55],[lm[454]?.x*w||w*0.75,lm[454]?.y*h||h*0.55]];
      const left={x:lm[234]?.x*w||w*0.25,y:lm[234]?.y*h||h*0.45};
      const right={x:lm[454]?.x*w||w*0.75,y:lm[454]?.y*h||h*0.45};
      const faceW=Math.hypot(right.x-left.x,right.y-left.y);
      ctx.save();
      for(const[cx,cy] of cheeks){
        for(let i=-2;i<=2;i++){
          ctx.strokeStyle=`rgba(255,100,130,${0.45-Math.abs(i)*0.1})`;
          ctx.lineWidth=faceW*0.012;
          ctx.lineCap='round';
          ctx.beginPath();
          ctx.moveTo(cx-faceW*0.1,cy+i*faceW*0.022);
          ctx.lineTo(cx+faceW*0.1,cy+i*faceW*0.022);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
  },
  { id:'sticker_stars', name:'Star Stickers', emoji:'⭐', category:'anime', cost:2,
    apply:(ctx,w,h,lm)=>{
      if(!lm||lm.length<10) return;
      const top={x:lm[10]?.x*w||w*0.5,y:lm[10]?.y*h||h*0.2};
      const left={x:lm[234]?.x*w||w*0.25};
      const right={x:lm[454]?.x*w||w*0.75};
      const faceW=Math.abs(right.x-left.x);
      const t=Date.now()*0.001;
      const positions=[[top.x-faceW*0.55,top.y-faceW*0.1],[top.x+faceW*0.55,top.y-faceW*0.1],[top.x,top.y-faceW*0.35],[top.x-faceW*0.3,top.y+faceW*0.05],[top.x+faceW*0.3,top.y+faceW*0.05]];
      ctx.save();
      positions.forEach(([sx,sy],i)=>{
        const s=faceW*0.08;
        const pulse=0.85+0.15*Math.sin(t*2+i);
        ctx.save(); ctx.translate(sx,sy); ctx.rotate(t*0.5+i);
        ctx.fillStyle=`hsl(${(i*72+t*20)%360},100%,65%)`;
        ctx.shadowColor=`hsl(${(i*72+t*20)%360},100%,65%)`; ctx.shadowBlur=8;
        ctx.beginPath();
        for(let j=0;j<10;j++){
          const a=j*Math.PI/5-Math.PI/2; const r=j%2===0?s*pulse:s*0.42*pulse;
          j===0?ctx.moveTo(Math.cos(a)*r,Math.sin(a)*r):ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);
        }
        ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      ctx.restore();
    }
  },

  // ── MORE PARTICLES (3) ───────────────────────────────────────────────────
  { id:'particle_flowers', name:'Flowers', emoji:'🌸', category:'particle', cost:2, particleType:'flowers' },
  { id:'particle_lightning', name:'Lightning', emoji:'⚡', category:'particle', cost:3, particleType:'lightning' },
  { id:'particle_galaxy', name:'Galaxy Dust', emoji:'🌌', category:'particle', cost:2, particleType:'galaxy' },

];


// Gesture-triggered effects (used by EffectStack + GestureHUD)
export const GESTURE_EFFECTS = {
  wave:       { id: 'wave',      name: 'Wave Sparkle',   apply: (ctx, w, h) => { ctx.save(); ctx.globalCompositeOperation='screen'; const g=ctx.createLinearGradient(0,0,w,0); g.addColorStop(0,'rgba(100,200,255,0)'); g.addColorStop(0.5,'rgba(100,200,255,0.3)'); g.addColorStop(1,'rgba(100,200,255,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,w,h); ctx.restore(); } },
  peace:      { id: 'peace',     name: 'Peace Hearts',   apply: (ctx, w, h) => { ctx.save(); ctx.font=`${w*0.06}px serif`; ctx.textAlign='center'; ctx.fillStyle='rgba(255,100,150,0.8)'; ctx.fillText('💕',w*0.5,h*0.2); ctx.restore(); } },
  thumbs_up:  { id: 'thumbs_up', name: 'Gold Glow',      apply: (ctx, w, h) => { ctx.save(); ctx.globalCompositeOperation='screen'; ctx.fillStyle='rgba(255,200,0,0.12)'; ctx.fillRect(0,0,w,h); ctx.restore(); } },
  fist:       { id: 'fist',      name: 'Power Burst',    apply: (ctx, w, h) => { ctx.save(); const g=ctx.createRadialGradient(w/2,h/2,0,w/2,h/2,w*0.5); g.addColorStop(0,'rgba(255,100,0,0.15)'); g.addColorStop(1,'rgba(0,0,0,0)'); ctx.fillStyle=g; ctx.fillRect(0,0,w,h); ctx.restore(); } },
  open_hand:  { id: 'open_hand', name: 'Star Burst',     apply: (ctx, w, h) => { ctx.save(); ctx.globalCompositeOperation='screen'; ctx.fillStyle='rgba(255,255,100,0.08)'; ctx.fillRect(0,0,w,h); ctx.restore(); } },
};
