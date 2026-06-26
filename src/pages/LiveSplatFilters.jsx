import React from 'react';
import FaceStudio from '@/components/stream/FaceStudio';

/**
 * LiveSplatFilters — Snapchat-quality AR filter studio.
 * Powered by MediaPipe face + body segmentation + WebGL shaders.
 * Includes 80+ filters, 7 particle effects, 6 virtual backgrounds,
 * VTuber overlays, beauty tuning, and real-time stream integration.
 */
export default function LiveSplatFilters() {
  return <FaceStudio />;
}
