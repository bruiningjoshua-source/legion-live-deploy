import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Radio, Monitor, Smartphone, AlertCircle } from 'lucide-react';

export default function MobileScreenShareManager({ user, onStreamReady }) {
  const [isSharing, setIsSharing] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState('android');
  const [qualityPreset, setQualityPreset] = useState('high');
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // Gaming integrations
  const { data: integrations = [] } = useQuery({
    queryKey: ['gaming-integrations', user?.email],
    queryFn: () => user?.email ? base44.entities.GamingIntegration.filter(
      { creator_id: user.email },
      null,
      100
    ) : Promise.resolve([]),
    enabled: !!user?.email,
  });

  // Setup mobile screen share
  const setupScreenShare = useMutation({
    mutationFn: () => base44.functions.invoke('setupMobileScreenShare', {
      device_type: selectedDevice,
      integration_type: 'mobile_screen_share',
      quality_preset: qualityPreset,
    }),
    onSuccess: (response) => {
      if (response.data?.success) {
        setIsSharing(true);
        onStreamReady?.({
          integration_id: response.data.integration_id,
          device_type: selectedDevice,
          quality_preset: qualityPreset,
          bitrate_kbps: response.data.bitrate_kbps,
        });
      }
    },
    onError: (err) => {
      setError(err.message || 'Failed to setup screen sharing');
    }
  });

  const handleStartSharing = async () => {
    setError(null);
    
    try {
      // Request screen capture
      if (navigator.mediaDevices?.getDisplayMedia) {
        const canvas = await navigator.mediaDevices.getDisplayMedia({
          video: {
            cursor: 'always',
            displaySurface: 'monitor'
          },
          audio: false
        });

        streamRef.current = canvas;
        if (videoRef.current) {
          videoRef.current.srcObject = canvas;
        }

        // Setup integration
        await setupScreenShare.mutateAsync();
      } else {
        setError('Screen sharing not supported on this device. Mobile games require direct screen share app.');
      }
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        setError(err.message || 'Screen sharing failed');
      }
    }
  };

  const handleStopSharing = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsSharing(false);
  };

  return (
    <div className="bigo-card p-4 space-y-4">
      <div className="flex items-center gap-2">
        <Monitor className="w-4 h-4 text-purple-400" />
        <h3 className="text-white font-semibold text-sm">Mobile Game Streaming</h3>
      </div>

      {error && (
        <div className="flex gap-2 p-3 bg-red-500/15 border border-red-500/30 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-white/80 text-xs">{error}</p>
        </div>
      )}

      {/* Device selection */}
      <div className="space-y-2">
        <label className="text-white text-xs font-semibold">Mobile Device</label>
        <div className="flex gap-2">
          {[
            { id: 'android', label: 'Android', icon: Smartphone },
            { id: 'ios', label: 'iOS', icon: Smartphone }
          ].map(device => (
            <button
              key={device.id}
              onClick={() => setSelectedDevice(device.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                selectedDevice === device.id
                  ? 'bg-purple-500/30 border border-purple-400/50 text-purple-200'
                  : 'bg-white/[0.08] border border-white/[0.1] text-white/60 hover:bg-white/[0.12]'
              }`}
            >
              <device.icon className="w-3.5 h-3.5" />
              {device.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quality preset */}
      <div className="space-y-2">
        <label className="text-white text-xs font-semibold">Stream Quality</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'low', label: 'Low', bitrate: '1500' },
            { id: 'medium', label: 'Med', bitrate: '2000' },
            { id: 'high', label: 'High', bitrate: '2500' },
            { id: 'ultra', label: 'Ultra', bitrate: '5000' }
          ].map(preset => (
            <button
              key={preset.id}
              onClick={() => setQualityPreset(preset.id)}
              className={`text-center p-2 rounded-lg text-xs font-semibold transition-all ${
                qualityPreset === preset.id
                  ? 'bg-amber-500/30 border border-amber-400/50 text-amber-200'
                  : 'bg-white/[0.08] border border-white/[0.1] text-white/60 hover:bg-white/[0.12]'
              }`}
            >
              <div>{preset.label}</div>
              <div className="text-[9px] text-white/40 mt-0.5">{preset.bitrate}k</div>
            </button>
          ))}
        </div>
      </div>

      {/* Screen preview */}
      {isSharing && (
        <div className="rounded-lg overflow-hidden bg-black" style={{ aspectRatio: '16/9' }}>
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-contain"
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 pt-2">
        {!isSharing ? (
          <button
            onClick={handleStartSharing}
            disabled={setupScreenShare.isPending}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-purple-500/30 transition-all active:scale-95 disabled:opacity-50"
          >
            <Radio className="w-4 h-4" />
            Start Streaming
          </button>
        ) : (
          <button
            onClick={handleStopSharing}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-red-500/20 border border-red-500/30 text-red-300 font-bold text-sm hover:bg-red-500/30 transition-all active:scale-95"
          >
            <Radio className="w-4 h-4" />
            Stop Streaming
          </button>
        )}
      </div>

      {/* Info */}
      <div className="p-3 bg-white/[0.05] rounded-lg border border-white/[0.1]">
        <p className="text-white/60 text-xs">
          <span className="font-semibold text-white">Pro Tip:</span> For best results, install the Legion Live companion app on your {selectedDevice === 'ios' ? 'iPhone' : 'Android'} device for native screen capture.
        </p>
      </div>
    </div>
  );
}