import { createSpringBoneSystem } from './LegionSpringBones';
/**
 * LegionVRMLoader — VRM 0.x / 1.0 file import for Legion Live.
 *
 * VRM is an open standard (MIT licensed) built on glTF 2.0.
 * We load it via Three.js GLTFLoader + manual VRM extension parsing.
 * No @pixiv/three-vrm dependency — pure Three.js for bundle size.
 *
 * Supports: humanoid bone mapping, blend shapes (expressions),
 * material conversion (MToon → MeshStandardMaterial), spring bones (ignored for perf).
 */

// VRM humanoid bone → our skeleton bone names
const VRM_TO_LAF = {
  hips:            'hips',
  spine:           'spine',
  chest:           'chest',
  neck:            'neck',
  head:            'head',
  leftUpperArm:    'leftUpperArm',
  leftLowerArm:    'leftLowerArm',
  leftHand:        'leftHand',
  rightUpperArm:   'rightUpperArm',
  rightLowerArm:   'rightLowerArm',
  rightHand:       'rightHand',
  leftUpperLeg:    'leftUpperLeg',
  leftLowerLeg:    'leftLowerLeg',
  leftFoot:        'leftFoot',
  rightUpperLeg:   'rightUpperLeg',
  rightLowerLeg:   'rightLowerLeg',
  rightFoot:       'rightFoot',
  // Fingers
  leftThumbProximal:        'leftThumb1',
  leftThumbIntermediate:    'leftThumb2',
  leftThumbDistal:          'leftThumb3',
  leftIndexProximal:        'leftIndex1',
  leftIndexIntermediate:    'leftIndex2',
  leftIndexDistal:          'leftIndex3',
  leftMiddleProximal:       'leftMiddle1',
  leftMiddleIntermediate:   'leftMiddle2',
  leftMiddleDistal:         'leftMiddle3',
  leftRingProximal:         'leftRing1',
  leftRingIntermediate:     'leftRing2',
  leftRingDistal:           'leftRing3',
  leftLittleProximal:       'leftPinky1',
  leftLittleIntermediate:   'leftPinky2',
  leftLittleDistal:         'leftPinky3',
  rightThumbProximal:       'rightThumb1',
  rightThumbIntermediate:   'rightThumb2',
  rightThumbDistal:         'rightThumb3',
  rightIndexProximal:       'rightIndex1',
  rightIndexIntermediate:   'rightIndex2',
  rightIndexDistal:         'rightIndex3',
  rightMiddleProximal:      'rightMiddle1',
  rightMiddleIntermediate:  'rightMiddle2',
  rightMiddleDistal:        'rightMiddle3',
  rightRingProximal:        'rightRing1',
  rightRingIntermediate:    'rightRing2',
  rightRingDistal:          'rightRing3',
  rightLittleProximal:      'rightPinky1',
  rightLittleIntermediate:  'rightPinky2',
  rightLittleDistal:        'rightPinky3',
};

// VRM blend shape group names → our expression names
const VRM_EXPRESSION_MAP = {
  // VRM 0.x
  A: 'mouthA', I: 'mouthI', U: 'mouthU', E: 'mouthE', O: 'mouthO',
  Blink: 'blinkBoth', BlinkL: 'blinkL', BlinkR: 'blinkR',
  Joy: 'happy', Angry: 'angry', Sorrow: 'sad', Fun: 'surprised',
  // VRM 1.0
  aa: 'mouthA', ih: 'mouthI', ou: 'mouthU', ee: 'mouthE', oh: 'mouthO',
  blink: 'blinkBoth', blinkLeft: 'blinkL', blinkRight: 'blinkR',
  happy: 'happy', angry: 'angry', sad: 'sad', surprised: 'surprised', relaxed: 'relaxed',
};

/**
 * Load a VRM file from a URL or File object.
 * Returns { group, bones, expressions, applyExpression, dispose }
 */
export async function loadVRM(source, THREE, onProgress) {
  const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();

  // If source is a File, convert to object URL
  let url = source;
  let blobUrl = null;
  if (source instanceof File) {
    blobUrl = URL.createObjectURL(source);
    url = blobUrl;
  }

  onProgress?.('Parsing VRM file…');

  const gltf = await new Promise((resolve, reject) => {
    loader.load(url, resolve, e => onProgress?.(`Loading… ${Math.round(e.loaded/e.total*100)}%`), reject);
  });

  if (blobUrl) URL.revokeObjectURL(blobUrl);

  onProgress?.('Building VRM skeleton…');

  const vrmExt = gltf.userData?.gltfExtensions?.VRM ||
                 gltf.userData?.gltfExtensions?.VRMC_vrm;
  const isVRM1 = !!gltf.userData?.gltfExtensions?.VRMC_vrm;

  const scene = gltf.scene;

  // Convert MToon materials to MeshStandardMaterial for proper lighting
  scene.traverse(obj => {
    if (obj.isMesh && obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
      mats.forEach((mat, i) => {
        if (mat.type === 'ShaderMaterial' || mat.name?.includes('MToon') || mat.userData?.gltfExtensions?.KHR_materials_unlit) {
          const std = new THREE.MeshStandardMaterial({
            map: mat.map || mat.uniforms?.mainTex?.value || null,
            color: mat.color || new THREE.Color(1,1,1),
            roughness: 0.75,
            metalness: 0.0,
            transparent: mat.transparent || false,
            alphaTest: mat.alphaTest || 0,
            side: mat.side ?? THREE.FrontSide,
          });
          if (Array.isArray(obj.material)) obj.material[i] = std;
          else obj.material = std;
        }
        // Enable skinning on all mesh materials
        if (obj.material) obj.material.skinning = false; // Three r159+ handles automatically
        obj.castShadow = true;
      });
    }
  });

  // ── Extract humanoid bone map ──────────────────────────────────────────
  const bones = {};
  const humanBones = isVRM1
    ? vrmExt?.humanoid?.humanBones
    : vrmExt?.humanoid?.humanBones?.reduce((acc, b) => { acc[b.bone] = b; return acc; }, {});

  if (humanBones) {
    const nodeIndexToObj = {};
    gltf.scene.traverse(obj => {
      if (obj.userData?.nodeIndex !== undefined) nodeIndexToObj[obj.userData.nodeIndex] = obj;
    });

    // Build node index map from gltf parser
    if (gltf.parser) {
      const nodeCount = gltf.parser.json?.nodes?.length || 0;
      for (let i = 0; i < nodeCount; i++) {
        gltf.scene.traverse(obj => {
          if (obj.name && gltf.parser.json?.nodes?.[i]?.name === obj.name) {
            nodeIndexToObj[i] = obj;
          }
        });
      }
    }

    for (const [vrmBone, lafBone] of Object.entries(VRM_TO_LAF)) {
      const boneData = humanBones[vrmBone];
      if (!boneData) continue;
      const nodeIdx = isVRM1 ? boneData.node : boneData.node;
      if (nodeIdx === undefined) continue;

      // Find by node index, then by name fallback
      let obj = nodeIndexToObj[nodeIdx];
      if (!obj) {
        const nodeName = gltf.parser?.json?.nodes?.[nodeIdx]?.name;
        if (nodeName) scene.traverse(n => { if (n.name === nodeName) obj = n; });
      }
      if (obj) bones[lafBone] = obj;
    }
  }

  // Fallback: find bones by common naming conventions if VRM extension missing
  if (Object.keys(bones).length < 5) {
    const boneNameMap = {
      hips: ['Hips','hip','pelvis','Root'],
      spine: ['Spine','spine','torso'],
      chest: ['Chest','chest','Spine1','spine1'],
      neck: ['Neck','neck'],
      head: ['Head','head'],
      leftUpperArm: ['LeftUpperArm','LeftArm','l_arm','Arm_L'],
      rightUpperArm: ['RightUpperArm','RightArm','r_arm','Arm_R'],
      leftLowerArm: ['LeftLowerArm','LeftForeArm','l_forearm'],
      rightLowerArm: ['RightLowerArm','RightForeArm','r_forearm'],
      leftHand: ['LeftHand','l_hand'],
      rightHand: ['RightHand','r_hand'],
    };
    scene.traverse(obj => {
      for (const [lafBone, names] of Object.entries(boneNameMap)) {
        if (!bones[lafBone] && names.some(n => obj.name?.includes(n))) {
          bones[lafBone] = obj;
        }
      }
    });
  }

  // ── Extract blend shapes / morph targets ──────────────────────────────
  const expressions = {}; // name → [{mesh, morphIndex}]

  const blendShapeGroups = isVRM1
    ? vrmExt?.expressions?.preset
    : vrmExt?.blendShapeMaster?.blendShapeGroups;

  if (blendShapeGroups) {
    const meshes = [];
    scene.traverse(obj => { if (obj.isMesh && obj.morphTargetInfluences) meshes.push(obj); });

    const processGroup = (vrmName, binds) => {
      const lafName = VRM_EXPRESSION_MAP[vrmName] || vrmName.toLowerCase();
      if (!expressions[lafName]) expressions[lafName] = [];
      (binds || []).forEach(bind => {
        const idx = isVRM1 ? bind.node : bind.mesh;
        const morphIdx = bind.index;
        const weight = (bind.weight ?? 1.0) / (isVRM1 ? 1 : 100);
        const mesh = meshes[idx] || meshes.find((m, i) => i === idx);
        if (mesh && morphIdx !== undefined) {
          expressions[lafName].push({ mesh, morphIdx, weight });
        }
      });
    };

    if (isVRM1) {
      for (const [name, expr] of Object.entries(blendShapeGroups)) {
        processGroup(name, expr?.morphTargetBinds);
      }
    } else {
      (blendShapeGroups || []).forEach(g => processGroup(g.presetName || g.name, g.binds));
    }
  }

  // ── applyExpression helper ─────────────────────────────────────────────
  function applyExpression(name, value = 1.0) {
    const targets = expressions[name];
    if (!targets) return;
    targets.forEach(({ mesh, morphIdx, weight }) => {
      if (mesh.morphTargetInfluences && morphIdx < mesh.morphTargetInfluences.length) {
        mesh.morphTargetInfluences[morphIdx] = value * weight;
      }
    });
  }

  function resetAllExpressions() {
    for (const name of Object.keys(expressions)) applyExpression(name, 0);
  }

  // Scale and orient: VRM models are in meters, Y-up — same as our LAF
  // Most VRMs are roughly 1.5–1.8m tall; scale to fit our camera
  const box = new THREE.Box3().setFromObject(scene);
  const height = box.max.y - box.min.y;
  const targetHeight = 1.6; // metres in scene units
  if (height > 0) scene.scale.setScalar(targetHeight / height);
  scene.position.y = -box.min.y * (targetHeight / height) - 0.9;

  onProgress?.('Initialising physics…');
  let springBones = null;
  try {
    springBones = createSpringBoneSystem(gltf, THREE);
    if (springBones?.isActive) {
      console.log('[VRM] Spring bones:', springBones.chainCount, 'chains');
    }
  } catch (e) {
    console.warn('[VRM] Spring bones init failed:', e.message);
  }

  return {
    group: scene,
    bones,
    expressions,
    applyExpression,
    resetAllExpressions,
    springBones,
    isVRM: true,
    update: (dt) => { springBones?.update(dt); },
    dispose: () => {
      springBones?.dispose();
      scene.traverse(obj => {
        if (obj.isMesh) {
          obj.geometry?.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          mats.forEach(m => { m?.map?.dispose(); m?.dispose(); });
        }
      });
    },
  };
}

/** Check if a file is a VRM file by extension or MIME type */
export function isVRMFile(file) {
  return file?.name?.toLowerCase().endsWith('.vrm') ||
         file?.type === 'model/gltf-binary';
}
