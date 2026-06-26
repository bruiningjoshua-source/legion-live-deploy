/**
 * LegionAvatarRenderer — Production livestream avatar system.
 * Three.js geometry. No VRM. Legion Avatar Format (LAF).
 *
 * Features: delta-time idle animations, randomized blink cycles,
 * eye gaze interpolation, shoulder micro-movement, head stabilization,
 * mic lip-sync input, PBR materials, smooth interpolation,
 * finger bones, expression presets, improved face geometry.
 */

const LEGION_SKELETON = {
  hips:              { parent:null,              pos:[0,0,0]            },
  spine:             { parent:'hips',             pos:[0,0.15,0]         },
  chest:             { parent:'spine',            pos:[0,0.15,0]         },
  neck:              { parent:'chest',            pos:[0,0.18,0]         },
  head:              { parent:'neck',             pos:[0,0.12,0]         },
  leftShoulder:      { parent:'chest',            pos:[-0.10,0.14,0]     },
  leftUpperArm:      { parent:'leftShoulder',     pos:[-0.12,0,0]        },
  leftLowerArm:      { parent:'leftUpperArm',     pos:[-0.24,0,0]        },
  leftHand:          { parent:'leftLowerArm',     pos:[-0.22,0,0]        },
  rightShoulder:     { parent:'chest',            pos:[0.10,0.14,0]      },
  rightUpperArm:     { parent:'rightShoulder',    pos:[0.12,0,0]         },
  rightLowerArm:     { parent:'rightUpperArm',    pos:[0.24,0,0]         },
  rightHand:         { parent:'rightLowerArm',    pos:[0.22,0,0]         },
  // Fingers — left
  leftThumb1:        { parent:'leftHand',         pos:[-0.02,-0.01,0.01] },
  leftThumb2:        { parent:'leftThumb1',        pos:[-0.02,0,0]        },
  leftIndex1:        { parent:'leftHand',         pos:[-0.03,0,0.01]     },
  leftIndex2:        { parent:'leftIndex1',        pos:[-0.02,0,0]        },
  leftMiddle1:       { parent:'leftHand',         pos:[-0.03,0,0]        },
  leftMiddle2:       { parent:'leftMiddle1',       pos:[-0.02,0,0]        },
  leftRing1:         { parent:'leftHand',         pos:[-0.03,0,-0.01]    },
  leftRing2:         { parent:'leftRing1',         pos:[-0.02,0,0]        },
  leftPinky1:        { parent:'leftHand',         pos:[-0.025,0,-0.02]   },
  leftPinky2:        { parent:'leftPinky1',        pos:[-0.015,0,0]       },
  // Fingers — right
  rightThumb1:       { parent:'rightHand',        pos:[0.02,-0.01,0.01]  },
  rightThumb2:       { parent:'rightThumb1',       pos:[0.02,0,0]         },
  rightIndex1:       { parent:'rightHand',        pos:[0.03,0,0.01]      },
  rightIndex2:       { parent:'rightIndex1',       pos:[0.02,0,0]         },
  rightMiddle1:      { parent:'rightHand',        pos:[0.03,0,0]         },
  rightMiddle2:      { parent:'rightMiddle1',      pos:[0.02,0,0]         },
  rightRing1:        { parent:'rightHand',        pos:[0.03,0,-0.01]     },
  rightRing2:        { parent:'rightRing1',        pos:[0.02,0,0]         },
  rightPinky1:       { parent:'rightHand',        pos:[0.025,0,-0.02]    },
  rightPinky2:       { parent:'rightPinky1',       pos:[0.015,0,0]        },
};

// ── Per-instance idle state ────────────────────────────────────────────
let _idleT = 0;
let _lastFrameTime = 0;
let _lastBlinkTime = 0;
let _nextBlinkIn = 3000;
let _isBlinking = false;
let _blinkPhase = 0;
let _eyeGazeX = 0;
let _eyeGazeY = 0;
let _eyeGazeTargetX = 0;
let _eyeGazeTargetY = 0;
let _lastGazeChange = 0;
let _micVolume = 0;
let _currentExpression = null;
let _expressionWeight = 0;

function scheduleNextBlink() { _nextBlinkIn = 2000 + Math.random() * 4000; }

export function setMicVolume(v) { _micVolume = Math.max(0, Math.min(1, v)); }

/** Trigger a named expression (happy, sad, angry, surprised, wink) */
export function triggerExpression(name, duration = 2000) {
  _currentExpression = name;
  _expressionWeight = 1;
  setTimeout(() => { _expressionWeight = 0; _currentExpression = null; }, duration);
}

export async function buildAvatarFromLAF(preset, THREE) {
  const group = new THREE.Group();
  const bones = {};

  const makeMat = (color, opts = {}) => new THREE.MeshStandardMaterial({
    color, roughness: opts.roughness ?? 0.65, metalness: opts.metalness ?? 0.05, ...opts,
  });

  const skin    = preset?.skinColor  || '#e8b89a';
  const hair    = preset?.hairColor  || '#3d2506';
  const body    = preset?.bodyColor  || '#1a2742';
  const eyeCol  = preset?.eyeColor   || '#1a5276';
  const lipCol  = preset?.lipColor   || '#c47070';
  const brow    = preset?.browColor  || hair;

  const skinMat  = makeMat(skin,   { roughness: 0.72 });
  const hairMat  = makeMat(hair,   { roughness: 0.88 });
  const bodyMat  = makeMat(body,   { roughness: 0.52, metalness: 0.12 });
  const eyeMat   = makeMat(eyeCol, { roughness: 0.25, metalness: 0.15, emissive: new THREE.Color(eyeCol), emissiveIntensity: 0.12 });
  const whiteMat = makeMat('#ffffff', { roughness: 0.35 });
  const pupilMat = makeMat('#050505', { roughness: 0.4 });
  const lipMat   = makeMat(lipCol, { roughness: 0.65 });
  const browMat  = makeMat(brow,   { roughness: 0.9 });
  const noseMat  = makeMat(skin,   { roughness: 0.78 });
  const fingerMat = makeMat(skin,  { roughness: 0.75 });

  // Build skeleton
  for (const [name, def] of Object.entries(LEGION_SKELETON)) {
    const bone = new THREE.Bone();
    bone.name = name;
    bone.position.set(...def.pos);
    bones[name] = bone;
  }
  for (const [name, def] of Object.entries(LEGION_SKELETON)) {
    if (def.parent) bones[def.parent].add(bones[name]);
    else group.add(bones[name]);
  }

  // ── HEAD ─────────────────────────────────────────────────────────────
  const headGeo = new THREE.SphereGeometry(0.11, 24, 24);
  headGeo.scale(1, 1.1, 1.05);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.11, 0);
  headMesh.castShadow = true;
  headMesh.name = 'head';
  bones.head.add(headMesh);

  // Jaw / lower face
  const jawGeo = new THREE.SphereGeometry(0.09, 20, 16, 0, Math.PI*2, Math.PI*0.4, Math.PI*0.6);
  const jawMesh = new THREE.Mesh(jawGeo, skinMat);
  jawMesh.position.set(0, 0.035, 0.01);
  jawMesh.name = 'jaw';
  bones.head.add(jawMesh);

  // ── HAIR ─────────────────────────────────────────────────────────────
  const hairCapGeo = new THREE.SphereGeometry(0.116, 22, 22, 0, Math.PI*2, 0, Math.PI*0.52);
  const hairCapMesh = new THREE.Mesh(hairCapGeo, hairMat);
  hairCapMesh.position.set(0, 0.11, 0);
  bones.head.add(hairCapMesh);
  // Hair sides
  for (const [sx, sz] of [[-0.08, -0.005], [0.08, -0.005]]) {
    const sideGeo = new THREE.SphereGeometry(0.055, 14, 14);
    sideGeo.scale(0.7, 1.3, 0.6);
    const sideMesh = new THREE.Mesh(sideGeo, hairMat);
    sideMesh.position.set(sx, 0.08, sz);
    bones.head.add(sideMesh);
  }

  // ── EYES ─────────────────────────────────────────────────────────────
  const eyePositions = [[-0.038, 0.125, 0.085], [0.038, 0.125, 0.085]];
  const eyeMeshes = { lSclera: null, rSclera: null, lIris: null, rIris: null, lPupil: null, rPupil: null, lLid: null, rLid: null };

  eyePositions.forEach(([ex, ey, ez], i) => {
    const side = i === 0 ? 'l' : 'r';
    // Sclera
    const scl = new THREE.Mesh(new THREE.SphereGeometry(0.025, 14, 14), whiteMat);
    scl.position.set(ex, ey, ez); scl.name = `${side}Sclera`; bones.head.add(scl);
    eyeMeshes[`${side}Sclera`] = scl;
    // Iris
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.018, 12, 12), eyeMat);
    iris.position.set(ex, ey, ez + 0.006); iris.name = `${side}Iris`; bones.head.add(iris);
    eyeMeshes[`${side}Iris`] = iris;
    // Pupil
    const pup = new THREE.Mesh(new THREE.SphereGeometry(0.009, 10, 10), pupilMat);
    pup.position.set(ex, ey, ez + 0.013); pup.name = `${side}Pupil`; bones.head.add(pup);
    eyeMeshes[`${side}Pupil`] = pup;
    // Upper eyelid
    const lidGeo = new THREE.SphereGeometry(0.027, 14, 8, 0, Math.PI*2, 0, Math.PI*0.45);
    const lid = new THREE.Mesh(lidGeo, skinMat);
    lid.position.set(ex, ey + 0.002, ez - 0.001);
    lid.name = `${side}Lid`; bones.head.add(lid);
    eyeMeshes[`${side}Lid`] = lid;
  });

  // ── EYEBROWS ─────────────────────────────────────────────────────────
  const browMeshes = [];
  for (const [bx, by, bz, rotZ] of [[-0.038, 0.155, 0.092, 0.15], [0.038, 0.155, 0.092, -0.15]]) {
    const browGeo = new THREE.CapsuleGeometry(0.005, 0.028, 4, 8);
    browGeo.rotateZ(rotZ);
    const br = new THREE.Mesh(browGeo, browMat);
    br.position.set(bx, by, bz); br.name = 'brow'; bones.head.add(br);
    browMeshes.push(br);
  }

  // ── NOSE ─────────────────────────────────────────────────────────────
  const noseGeo = new THREE.SphereGeometry(0.016, 10, 10);
  noseGeo.scale(1.2, 0.8, 1);
  const noseMesh = new THREE.Mesh(noseGeo, noseMat);
  noseMesh.position.set(0, 0.095, 0.108);
  bones.head.add(noseMesh);
  // Nostrils
  for (const nx of [-0.012, 0.012]) {
    const nGeo = new THREE.SphereGeometry(0.008, 8, 8);
    const n = new THREE.Mesh(nGeo, noseMat);
    n.position.set(nx, 0.09, 0.109); bones.head.add(n);
  }

  // ── MOUTH ────────────────────────────────────────────────────────────
  const mouthGeo = new THREE.SphereGeometry(0.015, 10, 8);
  mouthGeo.scale(2.2, 0.55, 0.55);
  const mouthMesh = new THREE.Mesh(mouthGeo, lipMat);
  mouthMesh.position.set(0, 0.068, 0.104);
  mouthMesh.name = 'mouth';
  bones.head.add(mouthMesh);
  // Upper + lower lip detail
  const ulipGeo = new THREE.SphereGeometry(0.01, 8, 8); ulipGeo.scale(2.0, 0.6, 0.6);
  const ulip = new THREE.Mesh(ulipGeo, lipMat); ulip.position.set(0, 0.075, 0.108); bones.head.add(ulip);
  const llipGeo = new THREE.SphereGeometry(0.01, 8, 8); llipGeo.scale(1.8, 0.7, 0.6);
  const llip = new THREE.Mesh(llipGeo, lipMat); llip.position.set(0, 0.061, 0.108); bones.head.add(llip);

  // ── EARS ─────────────────────────────────────────────────────────────
  for (const ex of [-0.112, 0.112]) {
    const earGeo = new THREE.SphereGeometry(0.022, 10, 10); earGeo.scale(0.5, 1, 0.4);
    const ear = new THREE.Mesh(earGeo, skinMat); ear.position.set(ex, 0.112, 0); bones.head.add(ear);
  }

  // ── NECK ─────────────────────────────────────────────────────────────
  const neckMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.048, 0.10, 12), skinMat);
  neckMesh.position.set(0, 0.05, 0); bones.neck.add(neckMesh);

  // ── BODY ─────────────────────────────────────────────────────────────
  const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.32, 14), bodyMat);
  bodyMesh.position.set(0, 0.10, 0); bodyMesh.castShadow = true; bones.chest.add(bodyMesh);
  // Collar
  const collarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.065, 0.018, 8, 18), bodyMat);
  collarMesh.position.set(0, 0.245, 0); collarMesh.rotation.x = Math.PI/2; bones.chest.add(collarMesh);

  // ── ARMS ─────────────────────────────────────────────────────────────
  const armGeo = new THREE.CylinderGeometry(0.028, 0.025, 0.22, 10);
  for (const [boneName, side] of [['leftUpperArm', -1], ['leftLowerArm', -1], ['rightUpperArm', 1], ['rightLowerArm', 1]]) {
    const m = new THREE.Mesh(armGeo, boneName.includes('Lower') ? skinMat : bodyMat);
    m.rotation.z = side * Math.PI / 2;
    m.position.set(side * 0.11, 0, 0);
    m.castShadow = true;
    bones[boneName].add(m);
  }

  // ── HANDS ────────────────────────────────────────────────────────────
  const handGeo = new THREE.SphereGeometry(0.032, 10, 10); handGeo.scale(1.2, 0.85, 0.65);
  for (const [boneName, side] of [['leftHand', -1], ['rightHand', 1]]) {
    const m = new THREE.Mesh(handGeo, fingerMat);
    m.position.set(side * 0.05, 0, 0); bones[boneName].add(m);
  }

  // ── FINGERS ──────────────────────────────────────────────────────────
  const phalGeo = new THREE.CapsuleGeometry(0.005, 0.016, 4, 6);
  const fingerBones = Object.keys(LEGION_SKELETON).filter(k => k.includes('humb') || k.includes('ndex') || k.includes('iddle') || k.includes('ing') || k.includes('inky'));
  for (const boneName of fingerBones) {
    const m = new THREE.Mesh(phalGeo, fingerMat);
    const isRight = boneName.startsWith('right');
    m.rotation.z = isRight ? Math.PI/2 : -Math.PI/2;
    m.position.set(isRight ? 0.008 : -0.008, 0, 0);
    bones[boneName].add(m);
  }

  group.add(bones.hips);
  group.scale.set(1.8, 1.8, 1.8);
  group.position.set(0, -1.2, 0);

  // Reset idle state
  _idleT = 0; _lastFrameTime = performance.now();
  _lastBlinkTime = performance.now(); _isBlinking = false; _blinkPhase = 0;
  _eyeGazeX = 0; _eyeGazeY = 0; _eyeGazeTargetX = 0; _eyeGazeTargetY = 0;
  _lastGazeChange = performance.now(); scheduleNextBlink();
  _currentExpression = null; _expressionWeight = 0;

  return {
    group,
    bones,
    blendShapes: {
      lEye: eyeMeshes.lIris, rEye: eyeMeshes.rIris,
      lSclera: eyeMeshes.lSclera, rSclera: eyeMeshes.rSclera,
      lLid: eyeMeshes.lLid, rLid: eyeMeshes.rLid,
      lPupil: eyeMeshes.lPupil, rPupil: eyeMeshes.rPupil,
      mouth: mouthMesh,
      browL: browMeshes[0], browR: browMeshes[1],
    },
    isVRM: false,
  };
}

function lerp(cur, tgt, t = 0.6) { return cur + (tgt - cur) * t; }

function getDeltaTime() {
  const now = performance.now();
  const dt = Math.min((now - _lastFrameTime) / 1000, 0.05);
  _lastFrameTime = now;
  return dt;
}

export function applyPoseToAvatar(bones, faceRig, poseRig, handRig) {
  if (!bones) return;
  const now = performance.now();
  const dt = getDeltaTime();
  _idleT += dt;

  // Breathing
  if (bones.spine) bones.spine.position.y = 0.15 + Math.sin(_idleT * 1.2) * 0.015;
  if (bones.hips) bones.hips.rotation.z = lerp(bones.hips.rotation.z, Math.sin(_idleT * 0.5) * 0.01, 0.08);

  // Idle shoulder micro-movement
  if (!poseRig) {
    if (bones.leftShoulder)  bones.leftShoulder.rotation.z  = lerp(bones.leftShoulder.rotation.z,  Math.sin(_idleT * 0.9 + 0.5) *  0.012, 0.08);
    if (bones.rightShoulder) bones.rightShoulder.rotation.z = lerp(bones.rightShoulder.rotation.z, Math.sin(_idleT * 0.9 + 2.0) * -0.012, 0.08);
  }

  // Head + neck tracking
  if (faceRig && bones.head) {
    bones.head.rotation.x = lerp(bones.head.rotation.x, faceRig.pitch, 0.15);
    bones.head.rotation.y = lerp(bones.head.rotation.y, faceRig.yaw,   0.15);
    bones.head.rotation.z = lerp(bones.head.rotation.z, faceRig.roll,  0.12);
    if (bones.neck) {
      bones.neck.rotation.x = lerp(bones.neck.rotation.x, faceRig.pitch * 0.3, 0.1);
      bones.neck.rotation.y = lerp(bones.neck.rotation.y, faceRig.yaw   * 0.3, 0.1);
    }
  } else if (bones.head) {
    const swayX = Math.sin(_idleT * 0.6) * 0.03;
    const swayY = Math.sin(_idleT * 0.4) * 0.04;
    bones.head.rotation.x = lerp(bones.head.rotation.x, swayX, 0.08);
    bones.head.rotation.y = lerp(bones.head.rotation.y, swayY, 0.08);
    bones.head.rotation.z = lerp(bones.head.rotation.z, Math.sin(_idleT * 0.3) * 0.01, 0.06);
    if (bones.neck) {
      bones.neck.rotation.x = lerp(bones.neck.rotation.x, swayX * 0.3, 0.06);
      bones.neck.rotation.y = lerp(bones.neck.rotation.y, swayY * 0.2, 0.06);
    }
  }

  // Idle chest
  if (!poseRig && bones.chest) {
    bones.chest.rotation.z = lerp(bones.chest.rotation.z, Math.sin(_idleT * 0.3) * 0.015, 0.08);
    bones.chest.rotation.x = lerp(bones.chest.rotation.x, Math.sin(_idleT * 0.4) * 0.01,  0.08);
  }

  // Pose tracking
  if (poseRig) {
    if (bones.chest) {
      bones.chest.rotation.z = lerp(bones.chest.rotation.z, poseRig.spineRoll,  0.15);
      bones.chest.rotation.x = lerp(bones.chest.rotation.x, poseRig.spinePitch, 0.15);
    }
    if (bones.leftUpperArm)  bones.leftUpperArm.rotation.z  = lerp(bones.leftUpperArm.rotation.z,  poseRig.lUpperArmZ,  0.15);
    if (bones.rightUpperArm) bones.rightUpperArm.rotation.z = lerp(bones.rightUpperArm.rotation.z, poseRig.rUpperArmZ,  0.15);
    if (bones.leftLowerArm)  bones.leftLowerArm.rotation.z  = lerp(bones.leftLowerArm.rotation.z,  poseRig.lForeArmBend,0.15);
    if (bones.rightLowerArm) bones.rightLowerArm.rotation.z = lerp(bones.rightLowerArm.rotation.z, poseRig.rForeArmBend,0.15);
  } else {
    if (bones.leftUpperArm)  bones.leftUpperArm.rotation.z  = lerp(bones.leftUpperArm.rotation.z,  0.15, 0.08);
    if (bones.rightUpperArm) bones.rightUpperArm.rotation.z = lerp(bones.rightUpperArm.rotation.z, -0.15,0.08);
    if (bones.leftLowerArm)  bones.leftLowerArm.rotation.z  = lerp(bones.leftLowerArm.rotation.z,  0.3,  0.08);
    if (bones.rightLowerArm) bones.rightLowerArm.rotation.z = lerp(bones.rightLowerArm.rotation.z, -0.3, 0.08);
  }

  // ── Hand / finger tracking ────────────────────────────────────────────
  if (handRig) {
    const applyFinger = (prefix, rig, side) => {
      const s = side === 'left' ? -1 : 1;
      for (const [name, curl] of Object.entries(rig)) {
        const b1 = bones[`${prefix}${name}1`];
        const b2 = bones[`${prefix}${name}2`];
        if (b1) b1.rotation.z = lerp(b1.rotation.z, s * curl * 0.8, 0.2);
        if (b2) b2.rotation.z = lerp(b2.rotation.z, s * curl * 0.9, 0.2);
      }
    };
    if (handRig.left)  applyFinger('left',  handRig.left,  'left');
    if (handRig.right) applyFinger('right', handRig.right, 'right');
  }

  // Idle finger subtle movement
  if (!handRig) {
    const fingerGroups = ['Thumb', 'Index', 'Middle', 'Ring', 'Pinky'];
    fingerGroups.forEach((f, i) => {
      const idleAmt = Math.sin(_idleT * 0.4 + i * 0.7) * 0.04;
      for (const side of ['left', 'right']) {
        const b = bones[`${side}${f}1`];
        if (b) b.rotation.z = lerp(b.rotation.z, idleAmt, 0.05);
      }
    });
  }

  // Blink scheduling
  if (!faceRig) {
    const timeSinceBlink = now - _lastBlinkTime;
    if (!_isBlinking && timeSinceBlink > _nextBlinkIn) {
      _isBlinking = true; _blinkPhase = 0; _lastBlinkTime = now;
    }
    if (_isBlinking) {
      _blinkPhase += dt * 8;
      if (_blinkPhase >= 1.0) { _isBlinking = false; _blinkPhase = 0; scheduleNextBlink(); }
    }
  }

  // Eye gaze
  if (!faceRig) {
    if (now - _lastGazeChange > 1500 + Math.random() * 3000) {
      _eyeGazeTargetX = (Math.random() - 0.5) * 0.008;
      _eyeGazeTargetY = (Math.random() - 0.5) * 0.004;
      _lastGazeChange = now;
    }
    _eyeGazeX += (_eyeGazeTargetX - _eyeGazeX) * 0.08;
    _eyeGazeY += (_eyeGazeTargetY - _eyeGazeY) * 0.08;
  } else {
    _eyeGazeX = lerp(_eyeGazeX, 0, 0.1);
    _eyeGazeY = lerp(_eyeGazeY, 0, 0.1);
  }
}

export function applyBlendShapes(blendShapes, faceRig) {
  if (!blendShapes) return;

  // ── Expression presets (triggered externally) ────────────────────────
  const exprScale = _expressionWeight;
  if (_currentExpression && exprScale > 0) {
    switch (_currentExpression) {
      case 'happy':
        if (blendShapes.browL) blendShapes.browL.position.y = 0.155 + 0.004 * exprScale;
        if (blendShapes.browR) blendShapes.browR.position.y = 0.155 + 0.004 * exprScale;
        if (blendShapes.mouth) { blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 2.4 + exprScale * 0.4, 0.2); blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, 1.2 + exprScale * 0.5, 0.2); }
        break;
      case 'sad':
        if (blendShapes.browL) blendShapes.browL.rotation.z =  0.3 * exprScale;
        if (blendShapes.browR) blendShapes.browR.rotation.z = -0.3 * exprScale;
        if (blendShapes.mouth) { blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 1.5, 0.2); blendShapes.mouth.rotation.z = 0.2 * exprScale; }
        break;
      case 'angry':
        if (blendShapes.browL) blendShapes.browL.rotation.z =  -0.4 * exprScale;
        if (blendShapes.browR) blendShapes.browR.rotation.z =   0.4 * exprScale;
        if (blendShapes.mouth) blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 1.8, 0.2);
        break;
      case 'surprised':
        if (blendShapes.browL) blendShapes.browL.position.y = 0.155 + 0.008 * exprScale;
        if (blendShapes.browR) blendShapes.browR.position.y = 0.155 + 0.008 * exprScale;
        if (blendShapes.lSclera) blendShapes.lSclera.scale.setScalar(1 + 0.15 * exprScale);
        if (blendShapes.rSclera) blendShapes.rSclera.scale.setScalar(1 + 0.15 * exprScale);
        if (blendShapes.mouth) { blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, 2.5, 0.2); blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 1.2, 0.2); }
        break;
      case 'wink':
        if (blendShapes.lLid) blendShapes.lLid.scale.y = lerp(blendShapes.lLid.scale.y, 3.0, 0.3);
        if (blendShapes.lEye) blendShapes.lEye.scale.y = lerp(blendShapes.lEye.scale.y, 0.05, 0.3);
        if (blendShapes.lSclera) blendShapes.lSclera.scale.y = lerp(blendShapes.lSclera.scale.y, 0.3, 0.3);
        break;
    }
  }

  if (faceRig) {
    // Tracked blink
    if (blendShapes.lEye) blendShapes.lEye.scale.y = Math.max(0.05, 1.0 - faceRig.blinkL);
    if (blendShapes.rEye) blendShapes.rEye.scale.y = Math.max(0.05, 1.0 - faceRig.blinkR);
    if (blendShapes.lSclera) blendShapes.lSclera.scale.y = Math.max(0.3, 1.0 - faceRig.blinkL * 0.7);
    if (blendShapes.rSclera) blendShapes.rSclera.scale.y = Math.max(0.3, 1.0 - faceRig.blinkR * 0.7);
    if (blendShapes.lLid) blendShapes.lLid.scale.y = 1.0 + faceRig.blinkL * 1.8;
    if (blendShapes.rLid) blendShapes.rLid.scale.y = 1.0 + faceRig.blinkR * 1.8;
    // Brow from blink
    if (blendShapes.browL && _currentExpression === null) blendShapes.browL.position.y = 0.155 - faceRig.blinkL * 0.005;
    if (blendShapes.browR && _currentExpression === null) blendShapes.browR.position.y = 0.155 - faceRig.blinkR * 0.005;
    // Mouth
    if (blendShapes.mouth) {
      const trackOpen = faceRig.mouthOpen ?? 0;
      const micBoost = _micVolume * 0.6;
      const combined = Math.min(1, trackOpen + micBoost);
      blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, 0.5 + combined * 2.5, 0.2);
      blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 2.0 - combined * 0.4, 0.2);
    }
  } else {
    // Idle auto-blink
    const blinkCurve = _isBlinking ? Math.sin(_blinkPhase * Math.PI) : 0;
    const blinkVal = 1.0 - blinkCurve * 0.95;
    if (blendShapes.lEye) blendShapes.lEye.scale.y = lerp(blendShapes.lEye.scale.y, blinkVal, 0.4);
    if (blendShapes.rEye) blendShapes.rEye.scale.y = lerp(blendShapes.rEye.scale.y, blinkVal, 0.4);
    if (blendShapes.lSclera) blendShapes.lSclera.scale.y = lerp(blendShapes.lSclera.scale.y, 0.3 + blinkVal * 0.7, 0.4);
    if (blendShapes.rSclera) blendShapes.rSclera.scale.y = lerp(blendShapes.rSclera.scale.y, 0.3 + blinkVal * 0.7, 0.4);
    if (blendShapes.lLid) blendShapes.lLid.scale.y = lerp(blendShapes.lLid.scale.y, 1.0 + blinkCurve * 1.8, 0.4);
    if (blendShapes.rLid) blendShapes.rLid.scale.y = lerp(blendShapes.rLid.scale.y, 1.0 + blinkCurve * 1.8, 0.4);
    // Eye gaze offset
    if (blendShapes.lEye) { blendShapes.lEye.position.x = -0.038 + _eyeGazeX; blendShapes.lEye.position.y = 0.125 + _eyeGazeY; }
    if (blendShapes.rEye) { blendShapes.rEye.position.x =  0.038 + _eyeGazeX; blendShapes.rEye.position.y = 0.125 + _eyeGazeY; }
    if (blendShapes.lPupil) { blendShapes.lPupil.position.x = -0.038 + _eyeGazeX * 1.2; blendShapes.lPupil.position.y = 0.125 + _eyeGazeY * 1.2; }
    if (blendShapes.rPupil) { blendShapes.rPupil.position.x =  0.038 + _eyeGazeX * 1.2; blendShapes.rPupil.position.y = 0.125 + _eyeGazeY * 1.2; }
    // Mic mouth
    if (blendShapes.mouth) {
      const micOpen = _micVolume;
      if (micOpen > 0.02) {
        blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, 0.5 + micOpen * 2.5, 0.2);
        blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 2.0 - micOpen * 0.4, 0.2);
      } else {
        blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, Math.sin(_idleT * 1.2) * 0.08 + 0.5, 0.08);
        blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 2.0, 0.08);
      }
    }
  }
}
