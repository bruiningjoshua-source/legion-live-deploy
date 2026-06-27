/**
 * LegionSpringBones — Real-time physics simulation for VRM hair and clothing.
 *
 * Implements the VRM spring bone spec (VRM 0.x: secondaryAnimation, VRM 1.0: VRMC_springBone)
 * as a verlet integration chain. Each bone acts as a pendulum with configurable:
 *   - stiffness    (resistance to movement)
 *   - damping      (energy loss per frame)
 *   - dragForce    (air resistance)
 *   - gravityPower (downward pull, usually 0 for hair, >0 for skirts)
 *   - gravityDir   (direction of gravity, default Y-down)
 *   - radius       (collision sphere radius for self-collision)
 *
 * Two collision sphere types supported: head sphere + manual colliders.
 * Runs at avatar frame rate (~30fps) via delta-time integration.
 *
 * Usage:
 *   const sb = createSpringBoneSystem(vrmGltf, THREE);
 *   // Each frame:
 *   sb.update(deltaTime);
 */

export function createSpringBoneSystem(gltf, THREE) {
  if (!gltf || !THREE) return null;

  const ext = gltf.userData?.gltfExtensions;
  const isVRM1 = !!ext?.VRMC_springBone;

  const chains = [];       // Array of spring chains
  const colliders = [];    // Collision spheres

  // ── Parse VRM 0.x spring bones ──────────────────────────────────────────────
  if (!isVRM1 && ext?.VRM?.secondaryAnimation) {
    const sa = ext.VRM.secondaryAnimation;

    // Build collider groups
    const colliderGroups = (sa.colliderGroups || []).map(group => {
      const node = findNodeByIndex(gltf, group.node);
      return {
        node,
        colliders: (group.colliders || []).map(c => ({
          offset: new THREE.Vector3(c.offset?.x || 0, c.offset?.y || 0, c.offset?.z || 0),
          radius: c.radius || 0.1,
        })),
      };
    });

    (sa.boneGroups || []).forEach(group => {
      const stiffness  = group.stiffiness ?? group.stiffness ?? 1.0; // VRM 0.x typo in spec
      const damping    = group.dragForce  ?? 0.4;
      const gravity    = group.gravityPower ?? 0;
      const gravDir    = group.gravityDir
        ? new THREE.Vector3(group.gravityDir.x ?? 0, group.gravityDir.y ?? -1, group.gravityDir.z ?? 0)
        : new THREE.Vector3(0, -1, 0);
      const radius     = group.hitRadius ?? 0.02;
      const cgIndices  = group.colliderGroups || [];
      const boneColls  = cgIndices.map(i => colliderGroups[i]).filter(Boolean);

      (group.bones || []).forEach(boneIndex => {
        const rootNode = findNodeByIndex(gltf, boneIndex);
        if (!rootNode) return;
        const chain = buildChain(rootNode, THREE, { stiffness, damping, gravity, gravDir, radius, colliders: boneColls });
        if (chain.joints.length > 0) chains.push(chain);
      });
    });
  }

  // ── Parse VRM 1.0 spring bones ──────────────────────────────────────────────
  if (isVRM1 && ext?.VRMC_springBone) {
    const sb = ext.VRMC_springBone;

    const colliderMap = {};
    (sb.colliders || []).forEach((c, i) => {
      const node = findNodeByIndex(gltf, c.node);
      const shape = c.shape?.sphere || c.shape?.capsule || {};
      colliderMap[i] = {
        node,
        offset: new THREE.Vector3(shape.offset?.x || 0, shape.offset?.y || 0, shape.offset?.z || 0),
        radius: shape.radius || 0.05,
        isCapsule: !!c.shape?.capsule,
        tail: shape.tail ? new THREE.Vector3(shape.tail.x || 0, shape.tail.y || 0, shape.tail.z || 0) : null,
      };
    });

    (sb.springs || []).forEach(spring => {
      const joints = spring.joints || [];
      if (joints.length < 2) return;

      const config = {
        stiffness:  joints[0]?.stiffness  ?? 1.0,
        damping:    joints[0]?.dragForce  ?? 0.4,
        gravity:    joints[0]?.gravityPower ?? 0,
        gravDir:    new THREE.Vector3(0, -1, 0),
        radius:     joints[0]?.hitRadius  ?? 0.02,
        colliders:  (spring.colliderGroups || []).flatMap(gi =>
          (sb.colliderGroups?.[gi]?.colliders || []).map(ci => colliderMap[ci]).filter(Boolean)
        ),
      };

      const rootNode = findNodeByIndex(gltf, joints[0].node);
      if (!rootNode) return;
      const chain = buildChain(rootNode, THREE, config);
      if (chain.joints.length > 0) chains.push(chain);
    });
  }

  // ── Verlet integration ──────────────────────────────────────────────────────
  function update(dt) {
    if (dt <= 0 || dt > 0.1) return; // clamp
    chains.forEach(chain => updateChain(chain, dt, THREE));
  }

  function dispose() {
    chains.length = 0;
    colliders.length = 0;
  }

  return {
    update,
    dispose,
    chainCount: chains.length,
    isActive: chains.length > 0,
  };
}

// ── Chain builder ─────────────────────────────────────────────────────────────
function buildChain(rootNode, THREE, config) {
  const joints = [];

  function traverse(node, parentWorldPos) {
    if (!node) return;
    // World position of this joint
    const worldPos = new THREE.Vector3();
    node.getWorldPosition(worldPos);

    joints.push({
      node,
      currentPos:   worldPos.clone(),
      previousPos:  worldPos.clone(),
      restPos:      worldPos.clone(),
      length:        parentWorldPos ? worldPos.distanceTo(parentWorldPos) : 0,
      parentWorldPos,
      config,
    });

    node.children.forEach(child => traverse(child, worldPos.clone()));
  }

  traverse(rootNode, null);
  return { joints, config };
}

// ── Per-frame chain update ────────────────────────────────────────────────────
function updateChain(chain, dt, THREE) {
  const { joints, config } = chain;
  if (joints.length < 2) return;

  const gravity = new THREE.Vector3(
    config.gravDir.x * config.gravity,
    config.gravDir.y * config.gravity,
    config.gravDir.z * config.gravity,
  );

  // Skip root joint (index 0) — it's anchored to the bone
  for (let i = 1; i < joints.length; i++) {
    const j = joints[i];
    const parent = joints[i - 1];

    // Verlet: new_pos = current + (current - previous) * (1 - damping) + gravity * dt²
    const vel = new THREE.Vector3()
      .copy(j.currentPos)
      .sub(j.previousPos)
      .multiplyScalar(1 - config.damping);

    j.previousPos.copy(j.currentPos);

    // Stiffness: pull toward rest position
    const stiffnessForce = new THREE.Vector3()
      .copy(j.restPos)
      .sub(j.currentPos)
      .multiplyScalar(config.stiffness * dt);

    j.currentPos
      .add(vel)
      .add(gravity.clone().multiplyScalar(dt * dt))
      .add(stiffnessForce);

    // Length constraint: maintain distance from parent
    if (j.length > 0.001) {
      const dir = new THREE.Vector3().copy(j.currentPos).sub(parent.currentPos);
      const dist = dir.length();
      if (dist > 0.0001) {
        dir.multiplyScalar(j.length / dist);
        j.currentPos.copy(parent.currentPos).add(dir);
      }
    }

    // Sphere collision
    if (config.colliders) {
      for (const coll of config.colliders) {
        if (!coll.node) continue;
        const collWorldPos = new THREE.Vector3();
        coll.node.getWorldPosition(collWorldPos);
        const offset = coll.offset ? collWorldPos.clone().add(coll.offset) : collWorldPos;
        const minDist = config.radius + coll.radius;
        const toJoint = new THREE.Vector3().copy(j.currentPos).sub(offset);
        const dist = toJoint.length();
        if (dist < minDist && dist > 0.0001) {
          j.currentPos.copy(offset).add(toJoint.multiplyScalar(minDist / dist));
        }
      }
    }

    // Write back to bone world position
    if (j.node.parent) {
      const parentInvWorld = new THREE.Matrix4().copy(j.node.parent.matrixWorld).invert();
      const localPos = j.currentPos.clone().applyMatrix4(parentInvWorld);
      // Rotate bone to look at child position
      const boneDir = localPos.clone().normalize();
      if (boneDir.length() > 0.001) {
        const quaternion = new THREE.Quaternion();
        const up = new THREE.Vector3(0, 1, 0);
        // Use lookAt-style rotation
        quaternion.setFromUnitVectors(up, boneDir);
        j.node.quaternion.copy(quaternion);
      }
    }
  }
}

// ── Node finder ───────────────────────────────────────────────────────────────
function findNodeByIndex(gltf, index) {
  if (index === undefined || index === null) return null;
  const name = gltf.parser?.json?.nodes?.[index]?.name;
  let found = null;
  gltf.scene?.traverse(n => { if (n.name === name) found = n; });
  return found;
}
