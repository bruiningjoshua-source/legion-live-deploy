/**
 * LegionPoseSolver — Proprietary bone rotation solver.
 * Mathematics: Rodrigues rotation formula (public domain).
 * Smoothing: One Euro Filter (Casiez et al. CHI 2012, unpatented).
 */

class OneEuroFilter {
  constructor(freq=30, minCutoff=1.0, beta=0.007, dCutoff=1.0) {
    this.freq=freq; this.minCutoff=minCutoff; this.beta=beta; this.dCutoff=dCutoff;
    this.xPrev=null; this.dxPrev=0; this.tPrev=null;
  }
  alpha(cutoff) {
    const te=1.0/this.freq; const tau=1.0/(2*Math.PI*cutoff);
    return 1.0/(1.0+tau/te);
  }
  filter(x, timestamp=Date.now()) {
    if (this.xPrev===null) { this.xPrev=x; this.tPrev=timestamp; return x; }
    const dt=(timestamp-this.tPrev)/1000;
    if (dt>0) this.freq=1.0/dt;
    this.tPrev=timestamp;
    const dx=(x-this.xPrev)*this.freq;
    const edx=this.dxPrev+this.alpha(this.dCutoff)*(dx-this.dxPrev);
    const cutoff=this.minCutoff+this.beta*Math.abs(edx);
    const result=this.xPrev+this.alpha(cutoff)*(x-this.xPrev);
    this.xPrev=result; this.dxPrev=edx;
    return result;
  }
}

export function createFilterBank(count=543, freq=30) {
  return Array.from({length:count},()=>({
    x:new OneEuroFilter(freq), y:new OneEuroFilter(freq), z:new OneEuroFilter(freq),
  }));
}

export function smoothLandmarks(landmarks, filters, now=Date.now()) {
  if (!landmarks||!filters) return landmarks;
  return landmarks.map((lm,i)=>{
    if (!filters[i]) return lm;
    return { ...lm, x:filters[i].x.filter(lm.x??0,now), y:filters[i].y.filter(lm.y??0,now), z:filters[i].z.filter(lm.z??0,now) };
  });
}

const v3    = (x,y,z)  => ({x,y,z});
const sub   = (a,b)    => v3(a.x-b.x, a.y-b.y, a.z-b.z);
const dot   = (a,b)    => a.x*b.x + a.y*b.y + a.z*b.z;
const len   = a         => Math.sqrt(dot(a,a));
const norm  = a         => { const l=len(a); return l>0.0001?v3(a.x/l,a.y/l,a.z/l):v3(0,0,0); };
const clampA = r        => Math.max(-Math.PI,Math.min(Math.PI,r));

function angleBetween(a,b) {
  return Math.acos(Math.max(-1,Math.min(1,dot(norm(a),norm(b)))));
}

export function solveFace(faceLM) {
  if (!faceLM||faceLM.length<468) return null;
  const nose=faceLM[1], chin=faceLM[152], lEar=faceLM[234], rEar=faceLM[454];
  const upV=sub(nose,chin), rightV=sub(rEar,lEar);
  const pitch = Math.atan2(upV.z??0, len({x:upV.x,y:upV.y,z:0})) * -2.5;
  const yaw   = Math.atan2(rightV.z??0, rightV.x) * -1.5;
  const roll  = Math.atan2(upV.x, upV.y) * -1.0;
  const lEyeV=len(sub(faceLM[386],faceLM[374])), lEyeH=len(sub(faceLM[362],faceLM[263]))+0.001;
  const rEyeV=len(sub(faceLM[159],faceLM[145])), rEyeH=len(sub(faceLM[33], faceLM[133]))+0.001;
  const blinkL=Math.max(0,Math.min(1,1.0-lEyeV/lEyeH*6));
  const blinkR=Math.max(0,Math.min(1,1.0-rEyeV/rEyeH*6));
  const mouthOpen=Math.max(0,Math.min(1,len(sub(faceLM[13],faceLM[14]))/(len(sub(faceLM[61],faceLM[291]))+0.001)*2));
  return { pitch:clampA(pitch), yaw:clampA(yaw), roll:clampA(roll), blinkL, blinkR, mouthOpen };
}

export function solvePose(poseLM) {
  if (!poseLM||poseLM.length<33) return null;
  const lSh=poseLM[11],rSh=poseLM[12],lEl=poseLM[13],rEl=poseLM[14];
  const lWr=poseLM[15],rWr=poseLM[16],lHip=poseLM[23],rHip=poseLM[24];
  const shAxis=sub(rSh,lSh);
  const spineRoll=Math.atan2(shAxis.y,shAxis.x);
  const lUArm=norm(sub(lEl,lSh)), rUArm=norm(sub(rEl,rSh));
  const lUArmZ=Math.atan2(lUArm.y,lUArm.x)+Math.PI/2;
  const rUArmZ=Math.atan2(rUArm.y,rUArm.x)-Math.PI/2;
  const lFArm=norm(sub(lWr,lEl)), rFArm=norm(sub(rWr,rEl));
  const lFArmB=angleBetween(lUArm,lFArm)-Math.PI/2;
  const rFArmB=angleBetween(rUArm,rFArm)-Math.PI/2;
  const hipMid=v3((lHip.x+rHip.x)/2,(lHip.y+rHip.y)/2,(lHip.z+rHip.z)/2);
  const shMid =v3((lSh.x+rSh.x)/2,(lSh.y+rSh.y)/2,(lSh.z+rSh.z)/2);
  const spineV=norm(sub(shMid,hipMid));
  const spinePitch=Math.atan2(spineV.z??0,spineV.y)*0.5;
  return { spineRoll:clampA(spineRoll*0.3), spinePitch:clampA(spinePitch), lUpperArmZ:clampA(lUArmZ), rUpperArmZ:clampA(rUArmZ), lForeArmBend:clampA(lFArmB), rForeArmBend:clampA(rFArmB) };
}

export function solveHand(handLM) {
  if (!handLM||handLM.length<21) return null;
  const fingers={thumb:[1,2,3,4],index:[5,6,7,8],middle:[9,10,11,12],ring:[13,14,15,16],pinky:[17,18,19,20]};
  const result={};
  for (const [name,idx] of Object.entries(fingers)) {
    const v1=norm(sub(handLM[idx[1]],handLM[idx[0]]));
    const v2=norm(sub(handLM[idx[3]],handLM[idx[1]]));
    result[name]=Math.max(0,Math.min(1,angleBetween(v1,v2)/Math.PI));
  }
  return result;
}