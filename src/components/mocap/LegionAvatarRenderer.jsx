/**
 * LegionAvatarRenderer — Proprietary 3D avatar system.
 * Uses Three.js for geometry only. No VRM. No @pixiv/three-vrm.
 * Legion Avatar Format (LAF) is Legion Live IP.
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

export async function buildAvatarFromLAF(preset, THREE) {
  const group = new THREE.Group();
  const bones = {};
  const mat   = color => new THREE.MeshLambertMaterial({ color });
  const skin  = preset?.skinColor || "#e8b89a";
  const hair  = preset?.hairColor || "#3d2506";
  const body  = preset?.bodyColor || "#1a2742";
  const eyes  = preset?.eyeColor  || "#1a5276";

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

  const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.11,16,16), mat(skin));
  headMesh.position.set(0,0.11,0); headMesh.castShadow=true;
  bones.head.add(headMesh);

  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.115,16,16,0,Math.PI*2,0,Math.PI*0.55), mat(hair));
  hairMesh.position.set(0,0.11,0);
  bones.head.add(hairMesh);

  const eyeGeo = new THREE.SphereGeometry(0.018,8,8);
  const lEyeMesh = new THREE.Mesh(eyeGeo, mat(eyes));
  lEyeMesh.position.set(-0.038,0.12,0.095); bones.head.add(lEyeMesh);
  const rEyeMesh = new THREE.Mesh(eyeGeo, mat(eyes));
  rEyeMesh.position.set( 0.038,0.12,0.095); bones.head.add(rEyeMesh);

  const bodyMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09,0.11,0.32,12), mat(body));
  bodyMesh.position.set(0,0.10,0); bodyMesh.castShadow=true;
  bones.chest.add(bodyMesh);

  const armGeo = new THREE.CylinderGeometry(0.028,0.025,0.22,8);
  [["leftUpperArm",-1],["leftLowerArm",-1],["rightUpperArm",1],["rightLowerArm",1]].forEach(([bone,side])=>{
    const m=new THREE.Mesh(armGeo,mat(skin));
    m.rotation.z=side*Math.PI/2; m.position.set(side*0.11,0,0); m.castShadow=true;
    bones[bone].add(m);
  });

  group.add(bones.hips);
  group.scale.set(1.8,1.8,1.8);
  group.position.set(0,-1.2,0);

  return { group, bones, blendShapes:{ lEye:lEyeMesh, rEye:rEyeMesh } };
}

export function applyPoseToAvatar(bones, faceRig, poseRig) {
  if (!bones) return;
  const lerp = (cur,tgt,t=0.6) => cur+(tgt-cur)*t;
  if (faceRig && bones.head) {
    bones.head.rotation.x = lerp(bones.head.rotation.x, faceRig.pitch);
    bones.head.rotation.y = lerp(bones.head.rotation.y, faceRig.yaw);
    bones.head.rotation.z = lerp(bones.head.rotation.z, faceRig.roll);
  }
  if (poseRig) {
    if (bones.chest)         bones.chest.rotation.z         = lerp(bones.chest.rotation.z,         poseRig.spineRoll,    0.4);
    if (bones.chest)         bones.chest.rotation.x         = lerp(bones.chest.rotation.x,         poseRig.spinePitch,   0.4);
    if (bones.leftUpperArm)  bones.leftUpperArm.rotation.z  = lerp(bones.leftUpperArm.rotation.z,  poseRig.lUpperArmZ,   0.5);
    if (bones.rightUpperArm) bones.rightUpperArm.rotation.z = lerp(bones.rightUpperArm.rotation.z, poseRig.rUpperArmZ,   0.5);
    if (bones.leftLowerArm)  bones.leftLowerArm.rotation.z  = lerp(bones.leftLowerArm.rotation.z,  poseRig.lForeArmBend, 0.5);
    if (bones.rightLowerArm) bones.rightLowerArm.rotation.z = lerp(bones.rightLowerArm.rotation.z, poseRig.rForeArmBend, 0.5);
  }
}