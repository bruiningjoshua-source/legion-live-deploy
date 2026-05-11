/**
 * AREffectOverlay - Renders AR effects positioned using face mesh data
 */

import React, { useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { PARTICLE_EFFECTS } from './PremiumARProcessor';

// Effect asset mappings (emoji-based for simplicity)
const EFFECT_ASSETS = {
  puppy: { ears: '🐕', nose: '🐶', tongue: '👅' },
  cat: { ears: '🐱', nose: '😺', whiskers: '〰️' },
  bunny: { ears: '🐰', nose: '🐇' },
  fox: { ears: '🦊', nose: '🦊' },
  bear: { ears: '🐻', nose: '🐻' },
  deer: { antlers: '🦌', nose: '🦌' },
  koala: { ears: '🐨', nose: '🐨' },
  crown: { headwear: '👑' },
  halo: { headwear: '😇', wings: '👼' },
  devil: { horns: '😈' },
  sunglasses: { glasses: '😎' },
  nerd: { glasses: '🤓' },
  tiara: { headwear: '👸' },
  heart_eyes: { eyes: '😍' },
  star_eyes: { eyes: '🤩' },
  fire_eyes: { eyes: '🔥' },
  laser_eyes: { eyes: '👁️' },
  crying: { tears: '😢' },
  face_sparkle: { overlay: '✨' },
  freckles: { makeup: '🧑' },
  blush: { makeup: '😊' },
  santa: { hat: '🎅', beard: '🧔' },
  witch: { hat: '🧙‍♀️' },
  party: { hat: '🥳' },
  unicorn: { horn: '🦄', ears: '🦄' },
};

export default function AREffectOverlay({ 
  effect, 
  faceLandmarks, 
  videoWidth = 640, 
  videoHeight = 480,
  isMirrored = true 
}) {
  const [particles, setParticles] = useState([]);

  // Get particle config for this effect
  const particleConfig = useMemo(() => {
    const particleElement = effect?.elements?.find(e => e.type === 'particles');
    if (!particleElement?.effect) return null;
    return PARTICLE_EFFECTS[particleElement.effect];
  }, [effect]);

  // Animate particles
  useEffect(() => {
    if (!particleConfig) {
      setParticles([]);
      return;
    }

    const createParticle = () => ({
      id: Math.random(),
      emoji: particleConfig.emojis[Math.floor(Math.random() * particleConfig.emojis.length)],
      x: Math.random() * 100,
      y: particleConfig.spread === 'rising' ? 110 : -10,
      size: particleConfig.size.min + Math.random() * (particleConfig.size.max - particleConfig.size.min),
      speed: particleConfig.speed.min + Math.random() * (particleConfig.speed.max - particleConfig.speed.min),
      wobble: (Math.random() - 0.5) * 2,
      rotation: Math.random() * 360,
      opacity: 0.8 + Math.random() * 0.2,
    });

    setParticles(Array.from({ length: particleConfig.count }, createParticle));

    const interval = setInterval(() => {
      setParticles(prev => {
        const gravity = particleConfig.gravity || 1;
        const updated = prev
          .map(p => ({
            ...p,
            y: p.y + (p.speed * gravity),
            x: p.x + (particleConfig.wobble ? Math.sin(Date.now() / 500 + p.id * 10) * 0.5 : p.wobble * 0.2),
            rotation: particleConfig.rotation ? p.rotation + p.wobble * 3 : p.rotation,
          }))
          .filter(p => gravity > 0 ? p.y < 110 : p.y > -10);

        while (updated.length < particleConfig.count) {
          updated.push(createParticle());
        }
        return updated;
      });
    }, 40);

    return () => clearInterval(interval);
  }, [particleConfig]);

  if (!effect || effect.id === 'none') return null;

  const assets = EFFECT_ASSETS[effect.id] || {};
  const features = faceLandmarks?.features;
  const bbox = faceLandmarks?.boundingBox;
  const rotation = faceLandmarks?.rotation || { pitch: 0, yaw: 0, roll: 0 };

  // Render element at face position
  const renderElement = (element, index) => {
    if (!features) {
      // Fallback: render at default positions if no face tracking
      return renderFallbackElement(element, index);
    }

    let position = { x: 0, y: 0 };
    let scale = element.scale || 1;
    const baseSize = (bbox?.width || 200) * 0.5;

    // Determine position based on element type
    switch (element.type) {
      case 'ears':
      case 'antlers':
      case 'headwear':
      case 'hat':
      case 'horn':
      case 'horns':
        position = {
          x: features.foreheadCenter.x,
          y: features.foreheadCenter.y - baseSize * 0.3,
        };
        scale *= 1.2;
        break;

      case 'nose':
        position = features.noseTip;
        scale *= 0.6;
        break;

      case 'glasses':
      case 'eyes':
        position = {
          x: (features.leftEyeCenter.x + features.rightEyeCenter.x) / 2,
          y: (features.leftEyeCenter.y + features.rightEyeCenter.y) / 2,
        };
        break;

      case 'tears':
        position = {
          x: (features.leftEyeCenter.x + features.rightEyeCenter.x) / 2,
          y: ((features.leftEyeCenter.y + features.rightEyeCenter.y) / 2) + baseSize * 0.15,
        };
        break;

      case 'makeup':
      case 'overlay':
        position = {
          x: bbox.centerX,
          y: bbox.centerY,
        };
        scale *= 1.3;
        break;

      case 'beard':
        position = features.chin;
        break;

      case 'whiskers':
        position = {
          x: features.noseTip.x,
          y: features.noseTip.y + baseSize * 0.1,
        };
        break;

      case 'tongue':
        position = features.mouthCenter;
        break;

      default:
        position = { x: bbox?.centerX || videoWidth / 2, y: bbox?.centerY || videoHeight / 2 };
    }

    // Adjust for mirroring
    const adjustedX = isMirrored ? videoWidth - position.x : position.x;

    const asset = assets[element.type];
    if (!asset) return null;

    const finalSize = baseSize * scale;

    return (
      <motion.div
        key={`${element.type}-${index}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ 
          scale: 1, 
          opacity: element.opacity || 1,
          x: adjustedX,
          y: position.y,
          rotate: rotation.roll,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        className="absolute pointer-events-none"
        style={{
          fontSize: finalSize,
          transform: `translate(-50%, -50%) rotateY(${rotation.yaw}deg) rotateX(${rotation.pitch}deg)`,
          filter: element.glow ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))' : undefined,
          zIndex: element.type === 'headwear' || element.type === 'hat' ? 10 : 5,
        }}
      >
        <span className={element.animated ? 'animate-pulse' : ''}>{asset}</span>
      </motion.div>
    );
  };

  // Fallback rendering when face mesh isn't available
  const renderFallbackElement = (element, index) => {
    const positions = {
      ears: { top: '8%', size: 80 },
      antlers: { top: '3%', size: 90 },
      headwear: { top: '5%', size: 70 },
      hat: { top: '3%', size: 80 },
      horn: { top: '8%', size: 50 },
      horns: { top: '10%', size: 50 },
      nose: { top: '38%', size: 40 },
      glasses: { top: '28%', size: 70 },
      eyes: { top: '28%', size: 80 },
      tears: { top: '35%', size: 90 },
      overlay: { top: '25%', size: 100 },
      makeup: { top: '35%', size: 80 },
      beard: { top: '60%', size: 60 },
      whiskers: { top: '42%', size: 60 },
      tongue: { top: '55%', size: 40 },
    };

    const config = positions[element.type] || { top: '30%', size: 60 };
    const asset = assets[element.type];
    if (!asset) return null;

    return (
      <motion.div
        key={`fallback-${element.type}-${index}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: element.opacity || 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="absolute left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          top: config.top,
          fontSize: config.size * (element.scale || 1),
          filter: element.glow ? 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.8))' : undefined,
        }}
      >
        <span className={element.animated ? 'animate-pulse' : ''}>{asset}</span>
      </motion.div>
    );
  };

  // Get elements to render (exclude particles, they're handled separately)
  const visualElements = effect.elements?.filter(e => e.type !== 'particles') || [];

  return (
    <div 
      className="absolute inset-0 pointer-events-none overflow-hidden" 
      style={{ width: videoWidth, height: videoHeight }}
    >
      {/* AR Elements */}
      {visualElements.map((element, i) => renderElement(element, i))}

      {/* Particles */}
      {particles.map(p => (
        <span
          key={p.id}
          className="absolute pointer-events-none transition-none"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: p.size,
            transform: `rotate(${p.rotation}deg)`,
            opacity: p.opacity,
          }}
        >
          {p.emoji}
        </span>
      ))}

      {/* Debug: Show face landmarks */}
      {false && faceLandmarks?.features && (
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs p-2 rounded">
          <div>Face detected ✓</div>
          <div>Yaw: {rotation.yaw.toFixed(1)}°</div>
          <div>Pitch: {rotation.pitch.toFixed(1)}°</div>
          <div>Roll: {rotation.roll.toFixed(1)}°</div>
        </div>
      )}
    </div>
  );
}