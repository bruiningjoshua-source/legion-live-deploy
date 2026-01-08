import React, { useState, useEffect } from 'react';
import { Activity, Wifi, Signal, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StreamQualityMonitor({ stats, onQualityChange }) {
  const [quality, setQuality] = useState('720p');

  const getNetworkColor = (quality) => {
    const levels = { 1: 'text-red-500', 2: 'text-orange-500', 3: 'text-yellow-500', 4: 'text-amber-400', 5: 'text-green-500', 6: 'text-green-400' };
    return levels[quality] || 'text-green-400';
  };

  const getSignalBars = (quality) => {
    return Math.min(Math.ceil(quality / 2), 3);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-stone-900/80 backdrop-blur-sm border border-amber-600/30 rounded-xl p-4 space-y-3"
    >
      {/* Network Quality */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi className={`w-4 h-4 ${getNetworkColor(stats.networkQuality)}`} />
          <span className="text-amber-200 text-sm font-semibold">Network</span>
        </div>
        <div className="flex gap-1">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className={`w-1 h-3 rounded-sm transition-colors ${
                i < getSignalBars(stats.networkQuality)
                  ? getNetworkColor(stats.networkQuality).replace('text-', 'bg-')
                  : 'bg-stone-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Video Bitrate */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-300">
          <Zap className="w-3 h-3" />
          Video Bitrate
        </div>
        <span className="text-amber-100 font-mono">{Math.round(stats.videoBitrate / 1000)}kbps</span>
      </div>

      {/* Audio Bitrate */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-300">
          <Signal className="w-3 h-3" />
          Audio Bitrate
        </div>
        <span className="text-amber-100 font-mono">{Math.round(stats.audioBitrate / 1000)}kbps</span>
      </div>

      {/* Resolution */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-300">
          <Activity className="w-3 h-3" />
          Resolution
        </div>
        <span className="text-amber-100 font-mono">{stats.videoResolution}</span>
      </div>

      {/* Latency */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-amber-300">Latency</span>
        <span className="text-amber-100 font-mono">{stats.latency}ms</span>
      </div>

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