/**
 * LegionSplatBackdrop — Static Gaussian Splat environments for livestream backdrops.
 * Renders pre-baked splat data as a textured background plane with cinematic drift.
 * NOT a full 3D splat renderer — uses a procedural splat-like visual as backdrop.
 *
 * Designed for: static background behind avatar, low GPU cost, mobile-safe.
 */

// Predefined backdrop themes for livestream environments
const BACKDROP_PRESETS = {
  studio: {
    name: 'Studio',
    bgColor: '#0a0a14',
    particles: { count: 200, colors: ['#f5a623', '#8b5cf6', '#3b82f6'], speed: 0.15 },
    gradient: ['#0c0c18', '#1a1030', '#0a0a14'],
    fog: 0.4,
  },
  neon_city: {
    name: 'Neon City',
    bgColor: '#050510',
    particles: { count: 300, colors: ['#ff4757', '#00ffcc', '#ff6b9d', '#45b7d1'], speed: 0.2 },
    gradient: ['#0a0520', '#150830', '#080315'],
    fog: 0.3,
  },
  nature: {
    name: 'Nature',
    bgColor: '#0a140a',
    particles: { count: 150, colors: ['#10b981', '#34d399', '#fbbf24', '#a3e635'], speed: 0.1 },
    gradient: ['#0a1a0a', '#0f2010', '#081208'],
    fog: 0.5,
  },
  cosmic: {
    name: 'Cosmic',
    bgColor: '#050508',
    particles: { count: 250, colors: ['#8b5cf6', '#ec4899', '#6366f1', '#a78bfa'], speed: 0.12 },
    gradient: ['#08051a', '#150828', '#0a0510'],
    fog: 0.35,
  },
  cyberpunk: {
    name: 'Cyberpunk',
    bgColor: '#050010',
    particles: { count: 350, colors: ['#ff0090', '#00ffcc', '#ff4400', '#0088ff'], speed: 0.25 },
    gradient: ['#0a0020', '#050015', '#000010'],
    fog: 0.2,
  },
  forest: {
    name: 'Dark Forest',
    bgColor: '#020a04',
    particles: { count: 120, colors: ['#00ff88', '#44ff44', '#88ffaa', '#ccffaa'], speed: 0.06 },
    gradient: ['#020a04', '#041208', '#030804'],
    fog: 0.6,
  },
  underwater: {
    name: 'Underwater',
    bgColor: '#001830',
    particles: { count: 200, colors: ['#0088ff', '#00aaff', '#44ccff', '#88eeff'], speed: 0.08 },
    gradient: ['#001830', '#002040', '#001525'],
    fog: 0.5,
  },
  aurora: {
    name: 'Aurora',
    bgColor: '#00050a',
    particles: { count: 180, colors: ['#00ff88', '#8800ff', '#0088ff', '#ff0088'], speed: 0.05 },
    gradient: ['#00050a', '#020810', '#010508'],
    fog: 0.35,
  },
  sunset: {
    name: 'Sunset',
    bgColor: '#140a05',
    particles: { count: 180, colors: ['#f59e0b', '#ef4444', '#f97316', '#eab308'], speed: 0.08 },
    gradient: ['#1a0f05', '#201008', '#100805'],
    fog: 0.45,
  },
};

export function getBackdropPresets() {
  return Object.entries(BACKDROP_PRESETS).map(([id, p]) => ({ id, name: p.name }));
}

/**
 * Create a backdrop group to add to the Three.js scene.
 * Returns { group, update(dt), dispose() }
 */
export async function createSplatBackdrop(presetId, THREE) {
  const preset = BACKDROP_PRESETS[presetId] || BACKDROP_PRESETS.studio;
  const group = new THREE.Group();
  group.name = 'splatBackdrop';

  // Background plane — large gradient quad behind avatar
  const bgGeo = new THREE.PlaneGeometry(8, 6);
  const bgMat = new THREE.ShaderMaterial({
    uniforms: {
      uColor1: { value: new THREE.Color(preset.gradient[0]) },
      uColor2: { value: new THREE.Color(preset.gradient[1]) },
      uColor3: { value: new THREE.Color(preset.gradient[2]) },
      uTime:   { value: 0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor1;
      uniform vec3 uColor2;
      uniform vec3 uColor3;
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        float t = vUv.y + sin(vUv.x * 3.0 + uTime * 0.1) * 0.05;
        vec3 col = mix(uColor3, uColor2, smoothstep(0.0, 0.5, t));
        col = mix(col, uColor1, smoothstep(0.5, 1.0, t));
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    depthWrite: false,
  });
  const bgMesh = new THREE.Mesh(bgGeo, bgMat);
  bgMesh.position.set(0, 0.5, -3);
  bgMesh.frustumCulled = false;
  group.add(bgMesh);

  // Splat-like particles — small emissive sprites for bokeh/splat feel
  const pConf = preset.particles;
  const positions = [];
  const colors = [];
  const sizes = [];
  const colorObjs = pConf.colors.map(c => new THREE.Color(c));

  for (let i = 0; i < pConf.count; i++) {
    positions.push(
      (Math.random() - 0.5) * 7,
      (Math.random() - 0.5) * 5 + 0.5,
      -2 - Math.random() * 2
    );
    const c = colorObjs[i % colorObjs.length];
    colors.push(c.r, c.g, c.b);
    sizes.push(0.02 + Math.random() * 0.06);
  }

  const particleGeo = new THREE.BufferGeometry();
  particleGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  particleGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  particleGeo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

  const particleMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSpeed: { value: pConf.speed },
      uOpacity: { value: 0.6 },
    },
    vertexShader: `
      attribute float size;
      attribute vec3 color;
      uniform float uTime;
      uniform float uSpeed;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vec3 pos = position;
        pos.y += sin(uTime * uSpeed + position.x * 2.0) * 0.15;
        pos.x += cos(uTime * uSpeed * 0.7 + position.y * 1.5) * 0.1;
        vAlpha = 0.3 + 0.4 * sin(uTime * 0.5 + position.x * 3.0);
        vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = size * 300.0 / -mvPosition.z;
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float uOpacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        if (d > 0.5) discard;
        float alpha = smoothstep(0.5, 0.1, d) * uOpacity * vAlpha;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const particleMesh = new THREE.Points(particleGeo, particleMat);
  particleMesh.frustumCulled = false;
  group.add(particleMesh);

  let elapsed = 0;

  return {
    group,
    update(dt) {
      elapsed += dt;
      bgMat.uniforms.uTime.value = elapsed;
      particleMat.uniforms.uTime.value = elapsed;
    },
    dispose() {
      bgGeo.dispose();
      bgMat.dispose();
      particleGeo.dispose();
      particleMat.dispose();
    },
  };
}