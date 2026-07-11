import React, { useState } from 'react';
import { Activity, Wifi, Signal, Zap, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

/**
 * StreamQualityMonitor — displays live stats from ZegoService
 * stats shape: { videoBitrate, audioBitrate, videoResolution, networkQuality, latency, packetLoss, fps, rtt }
 */
export default function StreamQualityMonitor({ stats, onQualityChange }) {
  const [quality, setQuality] = useState(stats?.videoResolution || '720p');

  if (!stats) return null;

  const QUALITY_MAP = {
    excellent: { label: 'Excellent', color: 'text-green-400', bars: 3 },
    good:      { label: 'Good',      color: 'text-amber-400',  bars: 3 },
    fair:      { label: 'Fair',      color: 'text-amber-400', bars: 2 },
    poor:      { label: 'Poor',      color: 'text-red-400',   bars: 1 },
  };

  const nq = QUALITY_MAP[stats.networkQuality] || QUALITY_MAP.good;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-stone-900/80 backdrop-blur-sm border border-amber-600/30 rounded-xl p-4 space-y-3"
    >
      {/* Network Quality */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className={`w-4 h-4 ${nq.color}`} />
          <span className="text-amber-200 text-sm font-semibold">Network</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 items-end">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-1 rounded-sm transition-colors ${
                  i <= nq.bars
                    ? nq.color.replace('text-', 'bg-')
                    : 'bg-stone-700'
                }`}
                style={{ height: `${8 + i * 3}px` }}
              />
            ))}
          </div>
          <span className={`text-xs font-medium ${nq.color}`}>{nq.label}</span>
        </div>
      </div>

      {/* Video Bitrate */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-300">
          <Zap className="w-3 h-3" />
          Video Bitrate
        </div>
        <span className="text-amber-100 font-mono">{stats.videoBitrate || 0} kbps</span>
      </div>

      {/* Audio Bitrate */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-300">
          <Signal className="w-3 h-3" />
          Audio Bitrate
        </div>
        <span className="text-amber-100 font-mono">{stats.audioBitrate || 0} kbps</span>
      </div>

      {/* FPS */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-300">
          <Activity className="w-3 h-3" />
          FPS
        </div>
        <span className="text-amber-100 font-mono">{stats.fps || 0}</span>
      </div>

      {/* Latency */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-300">
          <Clock className="w-3 h-3" />
          Latency
        </div>
        <span className={`font-mono ${stats.latency > 200 ? 'text-red-400' : stats.latency > 100 ? 'text-amber-400' : 'text-amber-100'}`}>
          {stats.latency || 0} ms
        </span>
      </div>

      {/* Packet Loss */}
      {stats.packetLoss > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-amber-300">Packet Loss</span>
          <span className={`font-mono ${stats.packetLoss > 5 ? 'text-red-400' : 'text-amber-100'}`}>
            {(stats.packetLoss || 0).toFixed(1)}%
          </span>
        </div>
      )}

      {/* Quality Selector */}
      <div className="pt-2 border-t border-amber-600/20">
        <p className="text-amber-300 text-xs mb-2">Video Quality</p>
        <div className="grid grid-cols-4 gap-2">
          {['360p', '480p', '720p', '1080p'].map((q) => (
            <button
              key={q}
              onClick={() => {
                setQuality(q);
                onQualityChange?.(q);
              }}
              className={`text-xs py-1 px-2 rounded-lg transition-all ${
                quality === q
                  ? 'bg-amber-600 text-white'
                  : 'bg-stone-800 text-amber-400 hover:bg-stone-700'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}