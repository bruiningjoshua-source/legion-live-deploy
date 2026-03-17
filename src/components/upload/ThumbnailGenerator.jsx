import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Image, RefreshCw, Upload, X, Clock } from 'lucide-react';

/**
 * Generates thumbnails from a video file by capturing frames at different timestamps.
 * Falls back to manual upload if video can't be decoded.
 */
export default function ThumbnailGenerator({ videoFile, thumbnailFile, thumbnailPreview, onThumbnailSelect, onThumbnailFileSelect }) {
  const [autoThumbnails, setAutoThumbnails] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(-1);
  const [generating, setGenerating] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const thumbnailInputRef = useRef(null);

  // Auto-generate thumbnails when video file changes
  useEffect(() => {
    if (!videoFile || !videoFile.type.startsWith('video/')) {
      setAutoThumbnails([]);
      return;
    }
    generateThumbnails(videoFile);
  }, [videoFile]);

  const generateThumbnails = useCallback(async (file) => {
    setGenerating(true);
    setAutoThumbnails([]);
    setSelectedIdx(-1);

    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.crossOrigin = 'anonymous';

    const cleanup = () => { URL.revokeObjectURL(url); };

    video.onerror = () => {
      cleanup();
      setGenerating(false);
    };

    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) {
        cleanup();
        setGenerating(false);
        return;
      }

      const timestamps = [
        duration * 0.1,
        duration * 0.3,
        duration * 0.5,
        duration * 0.7,
        duration * 0.9,
      ].filter(t => t < duration && t >= 0);

      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      const thumbs = [];

      for (const ts of timestamps) {
        try {
          video.currentTime = ts;
          await new Promise((resolve, reject) => {
            const onSeeked = () => { video.removeEventListener('seeked', onSeeked); resolve(); };
            const onError = () => { video.removeEventListener('error', onError); reject(); };
            video.addEventListener('seeked', onSeeked);
            video.addEventListener('error', onError);
          });

          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          thumbs.push({ dataUrl, timestamp: ts });
        } catch {
          // Skip this frame
        }
      }

      cleanup();
      setAutoThumbnails(thumbs);

      // Auto-select the middle thumbnail
      if (thumbs.length > 0) {
        const midIdx = Math.floor(thumbs.length / 2);
        setSelectedIdx(midIdx);
        onThumbnailSelect(thumbs[midIdx].dataUrl);
      }

      setGenerating(false);
    };

    video.src = url;
  }, [onThumbnailSelect]);

  const handleManualUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onThumbnailFileSelect(file);
      setSelectedIdx(-1);
    }
  };

  const selectAutoThumb = (idx) => {
    setSelectedIdx(idx);
    onThumbnailSelect(autoThumbnails[idx].dataUrl);
  };

  const formatTs = (s) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-amber-200 text-sm font-medium">Thumbnail</label>
        <button
          onClick={() => thumbnailInputRef.current?.click()}
          className="flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 transition-colors"
        >
          <Upload className="w-3 h-3" />
          Upload custom
        </button>
        <input
          ref={thumbnailInputRef}
          type="file"
          accept="image/*"
          onChange={handleManualUpload}
          className="hidden"
        />
      </div>

      {/* Auto thumbnails */}
      {generating ? (
        <div className="flex items-center gap-2 py-6 justify-center text-white/30">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-xs">Generating thumbnails from video…</span>
        </div>
      ) : autoThumbnails.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {autoThumbnails.map((thumb, i) => (
            <button
              key={i}
              onClick={() => selectAutoThumb(i)}
              className={`relative flex-shrink-0 w-28 aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                selectedIdx === i && !thumbnailFile
                  ? 'border-amber-500 ring-2 ring-amber-500/30'
                  : 'border-white/[0.08] hover:border-white/20'
              }`}
            >
              <img src={thumb.dataUrl} alt={`Frame ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute bottom-0.5 right-0.5 bg-black/70 px-1 py-0.5 rounded text-[8px] text-white/60 flex items-center gap-0.5">
                <Clock className="w-2 h-2" />
                {formatTs(thumb.timestamp)}
              </div>
              {selectedIdx === i && !thumbnailFile && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"
                >
                  <span className="text-[8px] text-black font-bold">✓</span>
                </motion.div>
              )}
            </button>
          ))}
        </div>
      ) : !videoFile?.type?.startsWith('video/') ? (
        <div className="flex items-center gap-3 py-4 px-3 bg-white/[0.02] border border-white/[0.06] rounded-xl">
          <Image className="w-5 h-5 text-white/20" />
          <p className="text-white/30 text-xs">Upload an image for the cover art</p>
        </div>
      ) : null}

      {/* Manual thumbnail preview */}
      {thumbnailPreview && (
        <div className="relative inline-block">
          <img src={thumbnailPreview} alt="Custom thumbnail" className="w-28 aspect-video rounded-lg object-cover border-2 border-green-500/50" />
          <button
            onClick={() => onThumbnailFileSelect(null)}
            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-white"
          >
            <X className="w-3 h-3" />
          </button>
          <span className="block text-[10px] text-green-400 mt-1">Custom</span>
        </div>
      )}
    </div>
  );
}