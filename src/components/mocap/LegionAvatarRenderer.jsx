/**
 * LegionAvatarRenderer — Production livestream avatar system.
 * Three.js geometry. No VRM. Legion Avatar Format (LAF).
 *
 * Features: delta-time idle animations, randomized blink cycles,
 * eye gaze interpolation, shoulder micro-movement, head stabilization,
 * mic lip-sync input, PBR materials, smooth interpolation.
 */

const LEGION_SKELETON = {
  hips:         { parent:null,           pos:[0,0,0]           },
  spine:        { parent:'hips',          pos:[0,0.15,0]        },
  chest:        { parent:'spine',         pos:[0,0.15,0]        },
  neck:         { parent:'chest',         pos:[0,0.18,0]        },
  head:         { parent:'neck',          pos:[0,0.12,0]        },
  leftShoulder: { parent:'chest',         pos:[-0.10,0.14,0]    },
  leftUpperArm: { parent:'leftShoulder',  pos:[-0.12,0,0]       },
  leftLowerArm: { parent:'leftUpperArm',  pos:[-0.24,0,0]       },
  leftHand:     { parent:'leftLowerArm',  pos:[-0.22,0,0]       },
  rightShoulder:{ parent:'chest',         pos:[0.10,0.14,0]     },
  rightUpperArm:{ parent:'rightShoulder', pos:[0.12,0,0]        },
  rightLowerArm:{ parent:'rightUpperArm', pos:[0.24,0,0]        },
  rightHand:    { parent:'rightLowerArm', pos:[0.22,0,0]        },
};

// ── Per-instance idle state (reset on avatar build) ────────────────────
let _idleT = 0;
let _lastFrameTime = 0;
let _lastBlinkTime = 0;
let _nextBlinkIn = 3000;   // randomized 2–6s
let _isBlinking = false;
let _blinkPhase = 0;       // 0–1 smooth blink curve
let _eyeGazeX = 0;         // smooth eye gaze offset
let _eyeGazeY = 0;
let _eyeGazeTargetX = 0;
let _eyeGazeTargetY = 0;
let _lastGazeChange = 0;
let _micVolume = 0;         // external mic lip-sync input (0–1)

// Randomize next blink interval (2–6 seconds)
function scheduleNextBlink() {
  _nextBlinkIn = 2000 + Math.random() * 4000;
}

/** Set mic volume from external WebAudio analyser (0–1 normalized) */
export function setMicVolume(v) {
  _micVolume = Math.max(0, Math.min(1, v));
}

export async function buildAvatarFromLAF(preset, THREE) {
  const group = new THREE.Group();
  const bones = {};

  const makeMat = (color, opts = {}) => new THREE.MeshStandardMaterial({
    color,
    roughness: opts.roughness ?? 0.65,
    metalness: opts.metalness ?? 0.05,
    ...opts,
  });

  const skin = preset?.skinColor || "#e8b89a";
  const hair = preset?.hairColor || "#3d2506";
  const body = preset?.bodyColor || "#1a2742";
  const eyes = preset?.eyeColor  || "#1a5276";

  const skinMat = makeMat(skin, { roughness: 0.75 });
  const hairMat = makeMat(hair, { roughness: 0.85 });
  const bodyMat = makeMat(body, { roughness: 0.55, metalness: 0.1 });
  const eyeMat  = makeMat(eyes, { roughness: 0.3, metalness: 0.15, emissive: new THREE.Color(eyes), emissiveIntensity: 0.15 });
  const whiteMat= makeMat('#ffffff', { roughness: 0.4 });

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

  // Head
  const headGeo = new THREE.SphereGeometry(0.11, 20, 20);
  headGeo.scale(1, 1.08, 1.02);
  const headMesh = new THREE.Mesh(headGeo, skinMat);
  headMesh.position.set(0, 0.11, 0);
  headMesh.castShadow = true;
  bones.head.add(headMesh);

  // Hair
  const hairMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 20, 20, 0, Math.PI * 2, 0, Math.PI * 0.55),
    hairMat
  );
  hairMesh.position.set(0, 0.11, 0);
  bones.head.add(hairMesh);

  // Eyes (sclera + iris + pupil dot for gaze)
  const eyeGeo = new THREE.SphereGeometry(0.018, 10, 10);
  const scleraGeo = new THREE.SphereGeometry(0.025, 10, 10);

  const lScleraMesh = new THREE.Mesh(scleraGeo, whiteMat);
  lScleraMesh.position.set(-0.038, 0.12, 0.09);
  bones.head.add(lScleraMesh);
  const lEyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
  lEyeMesh.position.set(-0.038, 0.12, 0.095);
  bones.head.add(lEyeMesh);

  const rScleraMesh = new THREE.Mesh(scleraGeo, whiteMat);
  rScleraMesh.position.set(0.038, 0.12, 0.09);
  bones.head.add(rScleraMesh);
  const rEyeMesh = new THREE.Mesh(eyeGeo, eyeMat);
  rEyeMesh.position.set(0.038, 0.12, 0.095);
  bones.head.add(rEyeMesh);

  // Mouth
  const mouthGeo = new THREE.SphereGeometry(0.015, 8, 8);
  mouthGeo.scale(2.0, 0.5, 0.5);
  const mouthMat = makeMat('#c47070', { roughness: 0.7 });
  const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMesh.position.set(0, 0.065, 0.10);
  bones.head.add(mouthMesh);

  // Body
  const bodyMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 0.32, 14),
    bodyMat
  );
  bodyMesh.position.set(0, 0.10, 0);
  bodyMesh.castShadow = true;
  bones.chest.add(bodyMesh);

  // Arms
  const armGeo = new THREE.CylinderGeometry(0.028, 0.025, 0.22, 10);
  [["leftUpperArm", -1], ["leftLowerArm", -1], ["rightUpperArm", 1], ["rightLowerArm", 1]].forEach(([bone, side]) => {
    const m = new THREE.Mesh(armGeo, skinMat);
    m.rotation.z = side * Math.PI / 2;
    m.position.set(side * 0.11, 0, 0);
    m.castShadow = true;
    bones[bone].add(m);
  });

  // Hands
  const handGeo = new THREE.SphereGeometry(0.03, 8, 8);
  const lHand = new THREE.Mesh(handGeo, skinMat);
  lHand.position.set(-0.05, 0, 0);
  bones.leftHand.add(lHand);
  const rHand = new THREE.Mesh(handGeo, skinMat);
  rHand.position.set(0.05, 0, 0);
  bones.rightHand.add(rHand);

  group.add(bones.hips);
  group.scale.set(1.8, 1.8, 1.8);
  group.position.set(0, -1.2, 0);

  // Reset idle state for fresh avatar
  _idleT = 0;
  _lastFrameTime = performance.now();
  _lastBlinkTime = performance.now();
  _isBlinking = false;
  _blinkPhase = 0;
  _eyeGazeX = 0; _eyeGazeY = 0;
  _eyeGazeTargetX = 0; _eyeGazeTargetY = 0;
  _lastGazeChange = performance.now();
  scheduleNextBlink();

  return {
    group,
    bones,
    blendShapes: { lEye: lEyeMesh, rEye: rEyeMesh, lSclera: lScleraMesh, rSclera: rScleraMesh, mouth: mouthMesh },
  };
}

// ── Smooth lerp ────────────────────────────────────────────────────────
function lerp(cur, tgt, t = 0.6) {
  return cur + (tgt - cur) * t;
}

// ── Delta-time calculation ─────────────────────────────────────────────
function getDeltaTime() {
  const now = performance.now();
  const dt = Math.min((now - _lastFrameTime) / 1000, 0.05); // cap at 50ms (20fps floor)
  _lastFrameTime = now;
  return dt;
}

export function applyPoseToAvatar(bones, faceRig, poseRig) {
  if (!bones) return;

  const now = performance.now();
  const dt = getDeltaTime();
  _idleT += dt;

  // ── Idle breathing on spine + hips ──
  if (bones.spine) {
    const breathOffset = Math.sin(_idleT * 1.2) * 0.015;
    bones.spine.position.y = 0.15 + breathOffset;
  }
  // Subtle root Z-sway (posture rock)
  if (bones.hips) {
    bones.hips.rotation.z = lerp(bones.hips.rotation.z, Math.sin(_idleT * 0.5) * 0.01, 0.08);
  }

  // ── Shoulder micro-movement ──
  if (!poseRig) {
    if (bones.leftShoulder) {
      bones.leftShoulder.rotation.z = lerp(
        bones.leftShoulder.rotation.z,
        Math.sin(_idleT * 0.9 + 0.5) * 0.012,
        0.08
      );
    }
    if (bones.rightShoulder) {
      bones.rightShoulder.rotation.z = lerp(
        bones.rightShoulder.rotation.z,
        Math.sin(_idleT * 0.9 + 2.0) * -0.012,
        0.08
      );
    }
  }

  // ── Head tracking with stabilization OR idle sway ──
  if (faceRig && bones.head) {
    // Head stabilization: use slower interpolation to reduce jitter
    bones.head.rotation.x = lerp(bones.head.rotation.x, faceRig.pitch, 0.15);
    bones.head.rotation.y = lerp(bones.head.rotation.y, faceRig.yaw, 0.15);
    bones.head.rotation.z = lerp(bones.head.rotation.z, faceRig.roll, 0.12);
    // Neck absorbs 30% of head rotation for natural look
    if (bones.neck) {
      bones.neck.rotation.x = lerp(bones.neck.rotation.x, faceRig.pitch * 0.3, 0.1);
      bones.neck.rotation.y = lerp(bones.neck.rotation.y, faceRig.yaw * 0.3, 0.1);
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

  // ── Idle chest/posture shift ──
  if (!poseRig && bones.chest) {
    const postureShift = Math.sin(_idleT * 0.3) * 0.015;
    bones.chest.rotation.z = lerp(bones.chest.rotation.z, postureShift, 0.08);
    bones.chest.rotation.x = lerp(bones.chest.rotation.x, Math.sin(_idleT * 0.4) * 0.01, 0.08);
  }

  // ── Pose tracking ──
  if (poseRig) {
    if (bones.chest) {
      bones.chest.rotation.z = lerp(bones.chest.rotation.z, poseRig.spineRoll, 0.15);
      bones.chest.rotation.x = lerp(bones.chest.rotation.x, poseRig.spinePitch, 0.15);
    }
    if (bones.leftUpperArm)  bones.leftUpperArm.rotation.z  = lerp(bones.leftUpperArm.rotation.z,  poseRig.lUpperArmZ, 0.15);
    if (bones.rightUpperArm) bones.rightUpperArm.rotation.z = lerp(bones.rightUpperArm.rotation.z, poseRig.rUpperArmZ, 0.15);
    if (bones.leftLowerArm)  bones.leftLowerArm.rotation.z  = lerp(bones.leftLowerArm.rotation.z,  poseRig.lForeArmBend, 0.15);
    if (bones.rightLowerArm) bones.rightLowerArm.rotation.z = lerp(bones.rightLowerArm.rotation.z, poseRig.rForeArmBend, 0.15);
  } else {
    if (bones.leftUpperArm)  bones.leftUpperArm.rotation.z  = lerp(bones.leftUpperArm.rotation.z,  0.15, 0.08);
    if (bones.rightUpperArm) bones.rightUpperArm.rotation.z = lerp(bones.rightUpperArm.rotation.z, -0.15, 0.08);
    if (bones.leftLowerArm)  bones.leftLowerArm.rotation.z  = lerp(bones.leftLowerArm.rotation.z,  0.3, 0.08);
    if (bones.rightLowerArm) bones.rightLowerArm.rotation.z = lerp(bones.rightLowerArm.rotation.z, -0.3, 0.08);
  }

  // ── Blink scheduling (randomized 2–6s) ──
  if (!faceRig) {
    const timeSinceBlink = now - _lastBlinkTime;
    if (!_isBlinking && timeSinceBlink > _nextBlinkIn) {
      _isBlinking = true;
      _blinkPhase = 0;
      _lastBlinkTime = now;
    }
    if (_isBlinking) {
      _blinkPhase += dt * 8; // ~125ms full blink
      if (_blinkPhase >= 1.0) {
        _isBlinking = false;
        _blinkPhase = 0;
        scheduleNextBlink();
      }
    }
  }

  // ── Eye gaze interpolation (idle only) ──
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

/**
 * Apply blendshapes (eyes, mouth) — call AFTER applyPoseToAvatar.
 * Supports mic lip-sync when faceRig is null via setMicVolume().
 */
export function applyBlendShapes(blendShapes, faceRig) {
  if (!blendShapes) return;

  if (faceRig) {
    // Eye blink from tracking
    if (blendShapes.lEye) blendShapes.lEye.scale.y = Math.max(0.05, 1.0 - faceRig.blinkL);
    if (blendShapes.rEye) blendShapes.rEye.scale.y = Math.max(0.05, 1.0 - faceRig.blinkR);
    if (blendShapes.lSclera) blendShapes.lSclera.scale.y = Math.max(0.3, 1.0 - faceRig.blinkL * 0.7);
    if (blendShapes.rSclera) blendShapes.rSclera.scale.y = Math.max(0.3, 1.0 - faceRig.blinkR * 0.7);

    // Mouth: blend face tracking with mic volume (mic adds extra open)
    if (blendShapes.mouth) {
      const trackOpen = faceRig.mouthOpen ?? 0;
      const micBoost = _micVolume * 0.6; // mic adds up to 60% extra
      const combined = Math.min(1, trackOpen + micBoost);
      blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, 0.5 + combined * 2.5, 0.2);
      blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 2.0 - combined * 0.4, 0.2);
    }
  } else {
    // ── Idle auto-blink with smooth curve ──
    const blinkCurve = _isBlinking ? Math.sin(_blinkPhase * Math.PI) : 0;
    const blinkVal = 1.0 - blinkCurve * 0.95;

    if (blendShapes.lEye) blendShapes.lEye.scale.y = lerp(blendShapes.lEye.scale.y, blinkVal, 0.4);
    if (blendShapes.rEye) blendShapes.rEye.scale.y = lerp(blendShapes.rEye.scale.y, blinkVal, 0.4);
    if (blendShapes.lSclera) blendShapes.lSclera.scale.y = lerp(blendShapes.lSclera.scale.y, 0.3 + blinkVal * 0.7, 0.4);
    if (blendShapes.rSclera) blendShapes.rSclera.scale.y = lerp(blendShapes.rSclera.scale.y, 0.3 + blinkVal * 0.7, 0.4);

    // Eye gaze offset
    if (blendShapes.lEye) {
      blendShapes.lEye.position.x = -0.038 + _eyeGazeX;
      blendShapes.lEye.position.y = 0.12 + _eyeGazeY;
    }
    if (blendShapes.rEye) {
      blendShapes.rEye.position.x = 0.038 + _eyeGazeX;
      blendShapes.rEye.position.y = 0.12 + _eyeGazeY;
    }

    // Mouth: mic lip-sync when idle (no face tracking)
    if (blendShapes.mouth) {
      const micOpen = _micVolume;
      if (micOpen > 0.02) {
        // Mic-driven mouth
        blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, 0.5 + micOpen * 2.5, 0.2);
        blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 2.0 - micOpen * 0.4, 0.2);
      } else {
        // Idle breathing mouth
        const breathMouth = Math.sin(_idleT * 1.2) * 0.08 + 0.5;
        blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, breathMouth, 0.08);
        blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 2.0, 0.08);
      }
    }
  }
}