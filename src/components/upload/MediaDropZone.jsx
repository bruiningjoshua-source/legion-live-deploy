import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, Video, Music, CheckCircle, AlertCircle, FileVideo, FileAudio, X } from 'lucide-react';
import { toast } from 'sonner';

const MAX_FILE_SIZE_MB = 50;
const MAX_FILE_SIZE = MAX_FILE_SIZE_MB * 1024 * 1024;

const ACCEPTED_VIDEO = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
const ACCEPTED_AUDIO = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/ogg', 'audio/aac', 'audio/x-wav'];
const ALL_ACCEPTED = [...ACCEPTED_VIDEO, ...ACCEPTED_AUDIO];

function formatSize(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  if (bytes >= 1024) return (bytes / 1024).toFixed(0) + ' KB';
  return bytes + ' B';
}

export default function MediaDropZone({ onFileSelect, file, onClear, acceptTypes = 'all' }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);

  const acceptStr = acceptTypes === 'video' ? 'video/*' : acceptTypes === 'audio' ? 'audio/*' : 'video/*,audio/*';

  const validateFile = useCallback((f) => {
    if (!f) return null;

    // Check type
    const isVideo = f.type.startsWith('video/');
    const isAudio = f.type.startsWith('audio/');
    if (!isVideo && !isAudio) {
      toast.error('Unsupported file type. Please upload MP4, MOV, MP3, or WAV.');
      return null;
    }

    if (acceptTypes === 'video' && !isVideo) {
      toast.error('Please upload a video file (MP4, MOV, WebM).');
      return null;
    }
    if (acceptTypes === 'audio' && !isAudio) {
      toast.error('Please upload an audio file (MP3, WAV).');
      return null;
    }

    // Check size
    if (f.size > MAX_FILE_SIZE) {
      toast.error(`File too large (${formatSize(f.size)}). Maximum is ${MAX_FILE_SIZE_MB}MB.`);
      return null;
    }

    return f;
  }, [acceptTypes]);

  const handleFile = useCallback((f) => {
    const validated = validateFile(f);
    if (validated) onFileSelect(validated);
  }, [validateFile, onFileSelect]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleInputChange = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // Reset input so same file can be re-selected
    if (inputRef.current) inputRef.current.value = '';
  }, [handleFile]);

  const isVideo = file?.type?.startsWith('video/');
  const isAudio = file?.type?.startsWith('audio/');

  // File selected state
  if (file) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="border-2 border-green-500/30 bg-green-500/[0.04] rounded-2xl p-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-green-500/15 flex items-center justify-center flex-shrink-0">
            {isVideo ? <FileVideo className="w-7 h-7 text-green-400" /> : <FileAudio className="w-7 h-7 text-green-400" />}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <p className="text-green-300 font-semibold text-sm truncate">{file.name}</p>
            </div>
            <div className="flex items-center gap-3 text-xs text-white/40">
              <span>{formatSize(file.size)}</span>
              <span className="uppercase">{isVideo ? 'Video' : 'Audio'}</span>
              {file.size > 20 * 1024 * 1024 && (
                <span className="text-amber-400 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Large file — upload may take a moment
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => { onClear(); }}
            className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.1] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    );
  }

  // Drop zone
  return (
    <motion.div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => inputRef.current?.click()}
      className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 ${
        isDragOver
          ? 'border-amber-400 bg-amber-500/[0.06] scale-[1.01]'
          : 'border-white/[0.12] hover:border-amber-500/40 hover:bg-white/[0.02]'
      }`}
      whileTap={{ scale: 0.99 }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptStr}
        onChange={handleInputChange}
        className="hidden"
      />

      <AnimatePresence mode="wait">
        {isDragOver ? (
          <motion.div
            key="drag"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-amber-500/15 flex items-center justify-center">
              <Upload className="w-8 h-8 text-amber-400 animate-bounce" />
            </div>
            <p className="text-amber-300 font-semibold text-lg">Drop your file here</p>
          </motion.div>
        ) : (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex flex-col items-center gap-3"
          >
            <div className="w-16 h-16 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
              <Upload className="w-8 h-8 text-white/30" />
            </div>
            <div>
              <p className="text-white font-semibold text-lg mb-1">
                Drag & drop or <span className="text-amber-400">browse</span>
              </p>
              <p className="text-white/40 text-sm">
                {acceptTypes === 'video' ? 'MP4, MOV, WebM' : acceptTypes === 'audio' ? 'MP3, WAV, OGG' : 'MP4, MOV, MP3, WAV'} · Max {MAX_FILE_SIZE_MB}MB
              </p>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className="flex items-center gap-1 text-xs text-white/25">
                <Video className="w-3.5 h-3.5" /> Video
              </span>
              <span className="flex items-center gap-1 text-xs text-white/25">
                <Music className="w-3.5 h-3.5" /> Audio
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}