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

// Head rotation gains/directions. Flip a sign to invert that axis.
// pitch: nod up/down · yaw: turn left/right · roll: head tilt
export const HEAD_GAIN = { pitch: 2.5, yaw: 1.5, roll: 1.0 };

function angleBetween(a,b) {
  return Math.acos(Math.max(-1,Math.min(1,dot(norm(a),norm(b)))));
}

// ── Post-solve smoothing layer (applied after raw solve, before bone application) ──
// Provides jitter reduction and dropped-frame compensation.
let _prevFace = null;
let _prevPose = null;
let _lastFaceTime = 0;
let _lastPoseTime = 0;
const POSE_SMOOTH = 0.15;      // per-channel smoothing for pose rig
const FACE_SMOOTH = 0.15;      // per-channel smoothing for face rig
const DROP_THRESHOLD_MS = 150;  // if gap > this, hold previous values

function smoothRig(prev, next, factor, now, lastTime) {
  if (!next) return prev; // dropped frame → hold
  if (!prev) return next; // first frame
  if (now - lastTime > DROP_THRESHOLD_MS) return prev; // gap too large → hold to prevent snap
  const out = {};
  for (const k of Object.keys(next)) {
    const p = prev[k]; const n = next[k];
    if (typeof n === 'number' && typeof p === 'number') {
      out[k] = p + (n - p) * factor;
    } else {
      out[k] = n;
    }
  }
  return out;
}

export function solveFace(faceLM) {
  if (!faceLM||faceLM.length<468) return _prevFace; // hold on missing data
  const now = Date.now();
  const nose=faceLM[1], chin=faceLM[152], lEar=faceLM[234], rEar=faceLM[454];
  const upV=sub(nose,chin), rightV=sub(rEar,lEar);
  // Axis gains. Sign controls direction — flip a sign here if an axis tracks
  // the wrong way (mirrored preview vs. camera view expectations differ).
  const pitch = Math.atan2(upV.z??0, len({x:upV.x,y:upV.y,z:0})) * HEAD_GAIN.pitch;
  const yaw   = Math.atan2(rightV.z??0, rightV.x) * HEAD_GAIN.yaw;
  const roll  = Math.atan2(upV.x, upV.y) * HEAD_GAIN.roll;
  const lEyeV=len(sub(faceLM[386],faceLM[374])), lEyeH=len(sub(faceLM[362],faceLM[263]))+0.001;
  const rEyeV=len(sub(faceLM[159],faceLM[145])), rEyeH=len(sub(faceLM[33], faceLM[133]))+0.001;
  const blinkL=Math.max(0,Math.min(1,1.0-lEyeV/lEyeH*6));
  const blinkR=Math.max(0,Math.min(1,1.0-rEyeV/rEyeH*6));
  const mouthOpen=Math.max(0,Math.min(1,len(sub(faceLM[13],faceLM[14]))/(len(sub(faceLM[61],faceLM[291]))+0.001)*2));
  const raw = { pitch:clampA(pitch), yaw:clampA(yaw), roll:clampA(roll), blinkL, blinkR, mouthOpen };
  const smoothed = smoothRig(_prevFace, raw, FACE_SMOOTH, now, _lastFaceTime);
  _prevFace = smoothed;
  _lastFaceTime = now;
  return smoothed;
}

export function solvePose(poseLM) {
  if (!poseLM||poseLM.length<33) return _prevPose; // hold on missing data
  const now = Date.now();
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

  // ── Legs (landmarks: 23/24 hip, 25/26 knee, 27/28 ankle) ──
  // Only solve when the lower body is actually visible (good confidence), else
  // hold neutral so a waist-up frame doesn't flail the legs.
  const lKnee=poseLM[25], rKnee=poseLM[26], lAnk=poseLM[27], rAnk=poseLM[28];
  const legVis = Math.min(lKnee?.visibility??0, rKnee?.visibility??0, lAnk?.visibility??0, rAnk?.visibility??0);
  let legRig = { lUpperLegBend:0, rUpperLegBend:0, lLowerLegBend:0, rLowerLegBend:0, lUpperLegZ:0, rUpperLegZ:0 };
  if (legVis > 0.5) {
    // Thigh direction (hip->knee) vs. straight-down; knee bend (thigh vs shin).
    const lThigh=norm(sub(lKnee,lHip)), rThigh=norm(sub(rKnee,rHip));
    const lShin =norm(sub(lAnk,lKnee)), rShin =norm(sub(rAnk,rKnee));
    const down = v3(0,1,0);
    legRig = {
      // forward/back thigh swing (walking) from the vertical angle of the thigh
      lUpperLegBend: clampA(Math.atan2(lThigh.z??0, lThigh.y) ),
      rUpperLegBend: clampA(Math.atan2(rThigh.z??0, rThigh.y) ),
      // knee bend = angle between thigh and shin
      lLowerLegBend: clampA(angleBetween(lThigh,lShin)),
      rLowerLegBend: clampA(angleBetween(rThigh,rShin)),
      // sideways thigh spread
      lUpperLegZ: clampA(Math.atan2(lThigh.x, lThigh.y)),
      rUpperLegZ: clampA(Math.atan2(rThigh.x, rThigh.y)),
    };
  }

  const raw = { spineRoll:clampA(spineRoll*0.3), spinePitch:clampA(spinePitch), lUpperArmZ:clampA(lUArmZ), rUpperArmZ:clampA(rUArmZ), lForeArmBend:clampA(lFArmB), rForeArmBend:clampA(rFArmB), ...legRig, legVisible: legVis > 0.5 };
  const smoothed = smoothRig(_prevPose, raw, POSE_SMOOTH, now, _lastPoseTime);
  _prevPose = smoothed;
  _lastPoseTime = now;
  return smoothed;
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