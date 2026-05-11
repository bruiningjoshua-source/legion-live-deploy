/**
 * LegionAvatarRenderer — Proprietary 3D avatar system.
 * Uses Three.js for geometry only. No VRM. No @pixiv/three-vrm.
 * Legion Avatar Format (LAF) is Legion Live IP.
 *
 * Features: idle breathing, blinking, head sway, lip-sync ready,
 * PBR-lite materials, smooth interpolation, outfit presets.
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

// ── Idle animation state (runs when no tracking data) ──────────────────
let _idleT = 0;
const IDLE = {
  breathSpeed: 1.4,
  breathAmount: 0.008,
  swaySpeed: 0.7,
  swayAmount: 0.04,
  blinkInterval: 3200,  // ms between blinks
  blinkDuration: 150,   // ms per blink
};
let _lastBlinkTime = 0;
let _isBlinking = false;

export async function buildAvatarFromLAF(preset, THREE) {
  const group = new THREE.Group();
  const bones = {};

  // PBR-lite materials — MeshStandardMaterial for better light response
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

  const skinMat = makeMat(skin, { roughness: 0.75, metalness: 0.0 });
  const hairMat = makeMat(hair, { roughness: 0.85, metalness: 0.0 });
  const bodyMat = makeMat(body, { roughness: 0.55, metalness: 0.1 });
  const eyeMat  = makeMat(eyes, { roughness: 0.3,  metalness: 0.15, emissive: new THREE.Color(eyes), emissiveIntensity: 0.15 });
  const whiteMat= makeMat('#ffffff', { roughness: 0.4, metalness: 0.0 });

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

  // Head (slightly elongated sphere for more natural shape)
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

  // Eyes (with sclera)
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

  // Mouth (small elongated shape for lip-sync visual)
  const mouthGeo = new THREE.SphereGeometry(0.015, 8, 8);
  mouthGeo.scale(2.0, 0.5, 0.5);
  const mouthMat = makeMat('#c47070', { roughness: 0.7 });
  const mouthMesh = new THREE.Mesh(mouthGeo, mouthMat);
  mouthMesh.position.set(0, 0.065, 0.10);
  bones.head.add(mouthMesh);

  // Body (torso)
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

  // Hands (small spheres)
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

  // Reset idle clock for fresh avatar
  _idleT = 0;
  _lastBlinkTime = performance.now();

  return {
    group,
    bones,
    blendShapes: { lEye: lEyeMesh, rEye: rEyeMesh, lSclera: lScleraMesh, rSclera: rScleraMesh, mouth: mouthMesh },
  };
}

// ── Smooth lerp with variable damping ──────────────────────────────────
function lerp(cur, tgt, t = 0.6) {
  return cur + (tgt - cur) * t;
}

export function applyPoseToAvatar(bones, faceRig, poseRig) {
  if (!bones) return;

  const now = performance.now();
  _idleT += 0.016; // ~60fps delta

  // ── Idle breathing on spine ──
  if (bones.spine) {
    const breathOffset = Math.sin(_idleT * IDLE.breathSpeed) * IDLE.breathAmount;
    bones.spine.position.y = 0.15 + breathOffset;
  }

  // ── Head tracking OR idle sway ──
  if (faceRig && bones.head) {
    bones.head.rotation.x = lerp(bones.head.rotation.x, faceRig.pitch, 0.5);
    bones.head.rotation.y = lerp(bones.head.rotation.y, faceRig.yaw, 0.5);
    bones.head.rotation.z = lerp(bones.head.rotation.z, faceRig.roll, 0.5);
  } else if (bones.head) {
    // Subtle idle head sway
    const swayX = Math.sin(_idleT * IDLE.swaySpeed * 0.8) * IDLE.swayAmount * 0.3;
    const swayY = Math.sin(_idleT * IDLE.swaySpeed) * IDLE.swayAmount;
    bones.head.rotation.x = lerp(bones.head.rotation.x, swayX, 0.15);
    bones.head.rotation.y = lerp(bones.head.rotation.y, swayY, 0.15);
    bones.head.rotation.z = lerp(bones.head.rotation.z, 0, 0.1);
  }

  // ── Idle shoulder/posture shift ──
  if (!poseRig && bones.chest) {
    const postureShift = Math.sin(_idleT * 0.3) * 0.015;
    bones.chest.rotation.z = lerp(bones.chest.rotation.z, postureShift, 0.1);
    bones.chest.rotation.x = lerp(bones.chest.rotation.x, Math.sin(_idleT * 0.4) * 0.01, 0.1);
  }

  // ── Pose tracking ──
  if (poseRig) {
    if (bones.chest) {
      bones.chest.rotation.z = lerp(bones.chest.rotation.z, poseRig.spineRoll, 0.4);
      bones.chest.rotation.x = lerp(bones.chest.rotation.x, poseRig.spinePitch, 0.4);
    }
    if (bones.leftUpperArm)  bones.leftUpperArm.rotation.z  = lerp(bones.leftUpperArm.rotation.z,  poseRig.lUpperArmZ, 0.5);
    if (bones.rightUpperArm) bones.rightUpperArm.rotation.z = lerp(bones.rightUpperArm.rotation.z, poseRig.rUpperArmZ, 0.5);
    if (bones.leftLowerArm)  bones.leftLowerArm.rotation.z  = lerp(bones.leftLowerArm.rotation.z,  poseRig.lForeArmBend, 0.5);
    if (bones.rightLowerArm) bones.rightLowerArm.rotation.z = lerp(bones.rightLowerArm.rotation.z, poseRig.rForeArmBend, 0.5);
  } else {
    // Idle arm rest pose
    if (bones.leftUpperArm)  bones.leftUpperArm.rotation.z  = lerp(bones.leftUpperArm.rotation.z,  0.15, 0.08);
    if (bones.rightUpperArm) bones.rightUpperArm.rotation.z = lerp(bones.rightUpperArm.rotation.z, -0.15, 0.08);
    if (bones.leftLowerArm)  bones.leftLowerArm.rotation.z  = lerp(bones.leftLowerArm.rotation.z,  0.3, 0.08);
    if (bones.rightLowerArm) bones.rightLowerArm.rotation.z = lerp(bones.rightLowerArm.rotation.z, -0.3, 0.08);
  }

  // ── Auto-blink when no face tracking ──
  if (!faceRig) {
    const timeSinceBlink = now - _lastBlinkTime;
    if (!_isBlinking && timeSinceBlink > IDLE.blinkInterval + Math.random() * 1500) {
      _isBlinking = true;
      _lastBlinkTime = now;
    }
    if (_isBlinking && timeSinceBlink > IDLE.blinkDuration) {
      _isBlinking = false;
    }
  }
}

/**
 * Apply blendshapes (eyes, mouth) — call AFTER applyPoseToAvatar.
 * Separating this lets the caller decide when to apply face data.
 */
export function applyBlendShapes(blendShapes, faceRig) {
  if (!blendShapes) return;

  if (faceRig) {
    // Eye blink from tracking
    if (blendShapes.lEye) blendShapes.lEye.scale.y = Math.max(0.05, 1.0 - faceRig.blinkL);
    if (blendShapes.rEye) blendShapes.rEye.scale.y = Math.max(0.05, 1.0 - faceRig.blinkR);
    if (blendShapes.lSclera) blendShapes.lSclera.scale.y = Math.max(0.3, 1.0 - faceRig.blinkL * 0.7);
    if (blendShapes.rSclera) blendShapes.rSclera.scale.y = Math.max(0.3, 1.0 - faceRig.blinkR * 0.7);

    // Mouth open from tracking
    if (blendShapes.mouth) {
      const openAmount = faceRig.mouthOpen ?? 0;
      blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, 0.5 + openAmount * 2.5, 0.5);
      blendShapes.mouth.scale.x = lerp(blendShapes.mouth.scale.x, 2.0 - openAmount * 0.4, 0.5);
    }
  } else {
    // Idle auto-blink
    const blinkVal = _isBlinking ? 0.05 : 1.0;
    if (blendShapes.lEye) blendShapes.lEye.scale.y = lerp(blendShapes.lEye.scale.y, blinkVal, 0.5);
    if (blendShapes.rEye) blendShapes.rEye.scale.y = lerp(blendShapes.rEye.scale.y, blinkVal, 0.5);
    if (blendShapes.lSclera) blendShapes.lSclera.scale.y = lerp(blendShapes.lSclera.scale.y, _isBlinking ? 0.3 : 1.0, 0.5);
    if (blendShapes.rSclera) blendShapes.rSclera.scale.y = lerp(blendShapes.rSclera.scale.y, _isBlinking ? 0.3 : 1.0, 0.5);

    // Idle mouth — subtle breathing movement
    if (blendShapes.mouth) {
      const breathMouth = Math.sin(_idleT * IDLE.breathSpeed) * 0.1 + 0.5;
      blendShapes.mouth.scale.y = lerp(blendShapes.mouth.scale.y, breathMouth, 0.1);
    }
  }
}