import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { Users, Eye, MessageCircle, Gift, ArrowLeft, Maximize2, Camera } from 'lucide-react';

const MODES = { SOCIAL: '3d', AR: 'ar', VR: 'vr' };
const AVATAR_PALETTE = ['#f5a623','#e63946','#8b5cf6','#10b981','#3b82f6','#ec4899'];

// ── 3D ROOM COMPONENT ─────────────────────────────────────────────────────
function LegionRoom({ spaceUsers, currentUser, mode }) {
  const canvasRef   = useRef(null);
  const rendererRef = useRef(null);
  const sceneRef    = useRef(null);
  const cameraRef   = useRef(null);
  const animRef     = useRef(null);
  const avatarMeshes = useRef({});

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let destroyed = false;

    (async () => {
      const THREE = await import("three");
      if (destroyed) return;

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setSize(canvas.offsetWidth || 360, canvas.offsetHeight || 500);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      rendererRef.current = renderer;

      // Scene
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#0c0c14');
      sceneRef.current = scene;

      // Camera: isometric for Social 3D, first-person for VR/AR
      let camera;
      if (mode === MODES.SOCIAL) {
        camera = new THREE.PerspectiveCamera(45, (canvas.offsetWidth||360)/(canvas.offsetHeight||500), 0.1, 100);
        camera.position.set(9, 9, 9);
        camera.lookAt(0, 0, 0);
      } else {
        camera = new THREE.PerspectiveCamera(80, (canvas.offsetWidth||360)/(canvas.offsetHeight||500), 0.1, 100);
        camera.position.set(0, 1.7, 3);
        camera.lookAt(0, 1.0, 0);
      }
      cameraRef.current = camera;

      // Lighting
      scene.add(new THREE.AmbientLight(0xffffff, 0.55));
      const sun = new THREE.DirectionalLight(0xf5a623, 1.2);
      sun.position.set(5, 10, 5); sun.castShadow = true;
      scene.add(sun);
      const fill = new THREE.PointLight(0x8b5cf6, 0.8, 25);
      fill.position.set(-5, 3, -5);
      scene.add(fill);

      // Floor
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(18, 18),
        new THREE.MeshLambertMaterial({ color: '#1a1a2e' })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      scene.add(floor);
      scene.add(new THREE.GridHelper(18, 18, 0x2a2a3d, 0x1e1e30));

      // Room walls (back-face rendered box)
      const room = new THREE.Mesh(
        new THREE.BoxGeometry(18, 9, 18),
        new THREE.MeshLambertMaterial({ color: '#16213e', side: 1 })
      );
      room.position.y = 4.5;
      scene.add(room);

      // Stage for streaming creator
      const stage = new THREE.Mesh(
        new THREE.BoxGeometry(4.5, 0.18, 3.5),
        new THREE.MeshLambertMaterial({ color: '#f5a623', emissive: '#b87b1a', emissiveIntensity: 0.35 })
      );
      stage.position.set(0, 0.09, -5.5);
      scene.add(stage);

      // Legion LIVE branding on back wall
      const brandPanel = new THREE.Mesh(
        new THREE.PlaneGeometry(5, 1.4),
        new THREE.MeshLambertMaterial({ color: '#f5a623', emissive: '#f5a623', emissiveIntensity: 0.5 })
      );
      brandPanel.position.set(0, 6, -8.9);
      scene.add(brandPanel);

      // Ambient glow orbs on ceiling
      const orbColors = [0xf5a623, 0x8b5cf6, 0xe63946];
      orbColors.forEach((color, i) => {
        const orb = new THREE.PointLight(color, 0.6, 15);
        orb.position.set((i - 1) * 5, 7.5, -3);
        scene.add(orb);
      });

      // Seating: three rows of benches
      const benchMat = new THREE.MeshLambertMaterial({ color: '#1d1d2e' });
      for (let row = 0; row < 3; row++) {
        for (let col = -2; col <= 2; col++) {
          const bench = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.5), benchMat);
          bench.position.set(col * 1.4, 0.175, row * 1.6 + 1.2);
          bench.castShadow = true;
          scene.add(bench);
        }
      }

      // Helper to build a simple avatar blob for a user
      const buildAvatarMesh = (color) => {
        const group = new THREE.Group();
        const mat = new THREE.MeshLambertMaterial({ color });
        // Body
        const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.55, 10), mat);
        body.position.set(0, 0.275, 0);
        group.add(body);
        // Head
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 12), mat);
        head.position.set(0, 0.82, 0);
        group.add(head);
        // Eyes
        const eyeMat = new THREE.MeshLambertMaterial({ color: '#ffffff' });
        [-0.075, 0.075].forEach(x => {
          const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
          eye.position.set(x, 0.86, 0.18);
          group.add(eye);
        });
        return group;
      };

      // Place avatars for each user in the space
      const placeAvatars = () => {
        // Remove old meshes
        Object.values(avatarMeshes.current).forEach(m => scene.remove(m));
        avatarMeshes.current = {};
        (spaceUsers || []).forEach((u, i) => {
          const color = AVATAR_PALETTE[i % AVATAR_PALETTE.length];
          const mesh  = buildAvatarMesh(color);
          // Spread users in a semicircle facing the stage
          const angle = ((i / Math.max(spaceUsers.length, 1)) - 0.5) * Math.PI * 1.2;
          const radius = 3 + (i % 3) * 1.5;
          mesh.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius + 1);
          mesh.castShadow = true;
          scene.add(mesh);
          avatarMeshes.current[u.id || i] = mesh;
        });
      };
      placeAvatars();

      // Animate
      let t = 0;
      const animate = () => {
        if (destroyed) return;
        animRef.current = requestAnimationFrame(animate);
        t += 0.008;
        // Gentle avatar idle bob
        Object.values(avatarMeshes.current).forEach((m, i) => {
          m.position.y = Math.sin(t + i * 1.2) * 0.03;
          m.rotation.y = Math.sin(t * 0.3 + i) * 0.08;
        });
        // Orbit fill light slowly
        fill.position.x = Math.sin(t * 0.4) * 7;
        fill.position.z = Math.cos(t * 0.4) * 7;
        renderer.render(scene, camera);
      };
      animate();
    })();

    return () => {
      destroyed = true;
      cancelAnimationFrame(animRef.current);
      rendererRef.current?.dispose();
    };
  }, [mode, spaceUsers]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ display: "block" }}
    />
  );
}

// ── CHAT BUBBLE ───────────────────────────────────────────────────────────
function ChatBubble({ msg }) {
  return (
    <div className="flex items-start gap-2 mb-2">
      <div
        className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[9px] font-black text-white"
        style={{ backgroundColor: AVATAR_PALETTE[Math.abs((msg.sender_name || "").charCodeAt(0) || 0) % AVATAR_PALETTE.length] }}
      >
        {msg.sender_name?.[0] || "?"}
      </div>
      <div>
        <span className="text-amber-400 text-[10px] font-bold mr-1">{msg.sender_name}</span>
        <span className="text-white/70 text-[11px]">{msg.content}</span>
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────
export default function LegionSpaces() {
  const navigate    = useNavigate();
  const [mode,     setMode]     = useState(MODES.SOCIAL);
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [showChat, setShowChat] = useState(true);
  const [spaceUsers] = useState([
    { id: '1', name: 'WarriorX',    avatar_color: AVATAR_PALETTE[0] },
    { id: '2', name: 'NeonStar',    avatar_color: AVATAR_PALETTE[1] },
    { id: '3', name: 'ShadowFox',   avatar_color: AVATAR_PALETTE[2] },
    { id: '4', name: 'FrostQueen',  avatar_color: AVATAR_PALETTE[3] },
    { id: '5', name: 'EmberRose',   avatar_color: AVATAR_PALETTE[4] },
  ]);

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn:  () => base44.auth.me(),
    staleTime: 300000,
  });

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender_name: user?.full_name || user?.email?.split("@")[0] || "You",
      content: input.trim(),
    }]);
    setInput('');
  };

  return (
    <div className="fixed inset-0 bg-[#0c0c14] flex flex-col overflow-hidden">

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 py-3 z-10 shrink-0"
        style={{ background: "rgba(5,5,8,0.85)", backdropFilter: "blur(16px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
      >
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4 text-white/70" />
          </button>
          <div>
            <h1 className="text-white font-black text-base leading-none" style={{ fontFamily: "Syne, sans-serif" }}>Legion Spaces</h1>
            <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.40)" }}>{spaceUsers.length} users in space</p>
          </div>
        </div>

        {/* Mode selector */}
        <div className="flex gap-1.5">
          {[
            { id: MODES.SOCIAL, label: "3D",  icon: Eye     },
            { id: MODES.AR,     label: "AR",  icon: Camera  },
            { id: MODES.VR,     label: "VR",  icon: Maximize2 },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMode(id)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all"
              style={{
                background:   mode === id ? "rgba(245,166,35,0.20)" : "rgba(255,255,255,0.06)",
                borderColor:  mode === id ? "rgba(245,166,35,0.50)" : "rgba(255,255,255,0.10)",
                border:       "1px solid",
                color:        mode === id ? "#f5a623" : "rgba(255,255,255,0.50)",
              }}
            >
              <Icon className="w-3 h-3" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* 3D Canvas */}
      <div className="flex-1 relative overflow-hidden">
        <LegionRoom spaceUsers={spaceUsers} currentUser={user} mode={mode} />

        {/* AR mode overlay notice */}
        {mode === MODES.AR && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          >
            <div className="text-center px-6">
              <div className="text-5xl mb-4">📷</div>
              <h2 className="text-white font-black text-xl mb-2" style={{ fontFamily: "Syne, sans-serif" }}>AR Mode</h2>
              <p className="text-white/50 text-sm mb-5">Point your camera at a flat surface to place your Legion Space in your real world.</p>
              <p className="text-amber-400/60 text-xs">Full AR requires WebXR support (Android Chrome 90+)</p>
            </div>
          </div>
        )}

        {/* VR mode overlay notice */}
        {mode === MODES.VR && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          >
            <div className="text-center px-6">
              <div className="text-5xl mb-4">🥽</div>
              <h2 className="text-white font-black text-xl mb-2" style={{ fontFamily: "Syne, sans-serif" }}>VR Mode</h2>
              <p className="text-white/50 text-sm mb-5">Put on your headset and enter the Legion Space in full virtual reality.</p>
              <button
                className="px-6 py-3 rounded-2xl font-black text-black text-sm"
                style={{ background: "linear-gradient(135deg,#f5a623,#d97706)" }}
                onClick={() => { if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen(); }}
              >
                Enter VR
              </button>
            </div>
          </div>
        )}

        {/* User presence list */}
        <div
          className="absolute top-3 left-3 rounded-2xl px-3 py-2"
          style={{ background: "rgba(5,5,8,0.75)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)" }}
        >
          <div className="flex items-center gap-1.5 mb-1.5">
            <Users className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400 text-[10px] font-bold">{spaceUsers.length} Online</span>
          </div>
          <div className="flex -space-x-1.5">
            {spaceUsers.slice(0, 6).map((u, i) => (
              <div
                key={u.id}
                className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[8px] font-black text-white"
                style={{ backgroundColor: AVATAR_PALETTE[i % AVATAR_PALETTE.length], borderColor: "#0c0c14" }}
                title={u.name}
              >
                {u.name?.[0]}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat panel */}
      <div
        className="shrink-0 border-t"
        style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(5,5,8,0.92)", backdropFilter: "blur(16px)" }}
      >
        {/* Chat toggle */}
        <button
          onClick={() => setShowChat(v => !v)}
          className="w-full flex items-center justify-between px-4 py-2"
        >
          <div className="flex items-center gap-2">
            <MessageCircle className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-white/60 text-xs font-semibold">Space Chat</span>
          </div>
          <span className="text-white/30 text-xs">{showChat ? "▼" : "▲"}</span>
        </button>

        <AnimatePresence>
          {showChat && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {/* Messages */}
              <div className="h-28 overflow-y-auto px-4 py-2 scrollbar-hide">
                {messages.length === 0 ? (
                  <p className="text-white/20 text-xs text-center py-4">No messages yet. Say hello!</p>
                ) : (
                  messages.map(m => <ChatBubble key={m.id} msg={m} />)
                )}
              </div>
              {/* Input */}
              <div className="flex gap-2 px-3 pb-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendMessage()}
                  placeholder="Say something…"
                  className="flex-1 rounded-xl px-3 py-2 text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.10)", caretColor: "#f5a623" }}
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim()}
                  className="px-4 py-2 rounded-xl font-bold text-sm text-black disabled:opacity-40"
                  style={{ background: "linear-gradient(135deg,#f5a623,#d97706)" }}
                >
                  Send
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}