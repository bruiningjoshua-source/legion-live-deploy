import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { motion } from 'framer-motion';
import { ScreenShare, X, Radio, Monitor, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function ScreenShareSetupModal({ onClose, gameTitle }) {
  const [screenStream, setScreenStream] = useState(null);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    startScreenShare();
    return () => {
      if (screenStream) {
        screenStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      setScreenStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      // Listen for user stopping share via browser UI
      stream.getVideoTracks()[0].onended = () => {
        setScreenStream(null);
        toast.info('Screen share ended');
      };
    } catch (e) {
      setError('Screen share was cancelled or not supported on this device.');
    }
  };

  const handleClose = () => {
    if (screenStream) {
      screenStream.getTracks().forEach(t => t.stop());
    }
    onClose();
  };

  const goLiveUrl = gameTitle
    ? createPageUrl('GoLive') + `?gameTitle=${encodeURIComponent(gameTitle)}&screenShare=true`
    : createPageUrl('GoLive') + '?screenShare=true';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-[#111114] border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2">
            <ScreenShare className="w-5 h-5 text-green-400" />
            <h2 className="text-white font-bold text-base">Screen Share Setup</h2>
          </div>
          <button onClick={handleClose} className="text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4">
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <AlertCircle className="w-12 h-12 text-red-400/50" />
              <p className="text-white/50 text-sm text-center">{error}</p>
              <button
                onClick={() => { setError(null); startScreenShare(); }}
                className="bg-green-500/20 border border-green-500/30 text-green-400 font-semibold text-sm px-4 py-2 rounded-xl"
              >
                Try Again
              </button>
            </div>
          ) : screenStream ? (
            <>
              <div className="relative rounded-xl overflow-hidden bg-black border border-white/[0.08] mb-4">
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full aspect-video object-contain"
                />
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                  <Monitor className="w-3 h-3" /> SHARING
                </div>
              </div>

              {gameTitle && (
                <p className="text-white/40 text-xs text-center mb-3">
                  Streaming: <span className="text-amber-400 font-semibold">{gameTitle}</span>
                </p>
              )}

              <p className="text-white/50 text-xs text-center mb-4">
                Your screen is being previewed. Click below to go live with this screen share.
              </p>

              <Link to={goLiveUrl} onClick={() => {
                // Stop the preview stream — GoLive will start a new one
                if (screenStream) screenStream.getTracks().forEach(t => t.stop());
              }}>
                <button className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-bold text-sm py-3 rounded-xl shadow-lg shadow-red-500/30 active:scale-[0.98] transition-transform">
                  <Radio className="w-4 h-4" />
                  Go Live with Screen Share
                </button>
              </Link>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="w-10 h-10 border-3 border-green-400/30 border-t-green-400 rounded-full animate-spin" />
              <p className="text-white/40 text-sm">Starting screen share...</p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}