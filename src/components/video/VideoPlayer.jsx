import React, { useRef, useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX,
  Maximize,
  Settings
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const qualities = [
  { label: 'Auto', value: 'auto' },
  { label: '4K', value: '2160p' },
  { label: '1080p', value: '1080p' },
  { label: '720p', value: '720p' },
  { label: '480p', value: '480p' },
  { label: '360p', value: '360p' }
];

export default function VideoPlayer({ src, poster, className = '', onEnded }) {
  const videoRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [quality, setQuality] = useState('auto');
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = (e) => {
      console.error('Video error:', e);
      setError('Video playback error. Retrying...');
      
      // Retry logic
      setTimeout(() => {
        if (video.readyState < 2) {
          video.load();
          setError(null);
        }
      }, 2000);
    };

    const handleCanPlay = () => {
      setError(null);
    };

    video.addEventListener('error', handleError);
    video.addEventListener('canplay', handleCanPlay);

    return () => {
      video.removeEventListener('error', handleError);
      video.removeEventListener('canplay', handleCanPlay);
    };
  }, [src]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (playing) {
      video.pause();
    } else {
      video.play().catch(err => {
        console.error('Play error:', err);
        setError('Could not play video');
      });
    }
    setPlaying(!playing);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !muted;
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!document.fullscreenElement) {
      video.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const handleQualityChange = (newQuality) => {
    setQuality(newQuality);
    // In production, this would switch video sources
    console.log('Quality changed to:', newQuality);
  };

  return (
    <div 
      className={`relative bg-black group ${className}`}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        className="w-full h-full object-contain"
        playsInline
        onEnded={onEnded}
        preload="metadata"
      />

      {error && (
        <div className="absolute top-4 left-4 right-4 bg-red-600/90 text-white px-4 py-2 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Controls Overlay */}
      {showControls && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-3">
              <Button
                size="icon"
                variant="ghost"
                onClick={togglePlay}
                className="text-white hover:bg-white/20"
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>

              <Button
                size="icon"
                variant="ghost"
                onClick={toggleMute}
                className="text-white hover:bg-white/20"
              >
                {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </Button>

              <div className="flex-1" />

              {/* Quality Selector */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    {quality === 'auto' ? 'Auto' : quality}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-black/90 border-white/20">
                  {qualities.map(q => (
                    <DropdownMenuItem
                      key={q.value}
                      onClick={() => handleQualityChange(q.value)}
                      className={`text-white hover:bg-white/20 ${
                        quality === q.value ? 'bg-white/10' : ''
                      }`}
                    >
                      {q.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                size="icon"
                variant="ghost"
                onClick={toggleFullscreen}
                className="text-white hover:bg-white/20"
              >
                <Maximize className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}