import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Camera, 
  Mic, 
  Monitor, 
  Gamepad2, 
  Settings, 
  Radio,
  ChevronRight,
  Check,
  AlertCircle,
  Volume2,
  VolumeX,
  Video,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

const GAMING_CATEGORIES = [
  { value: 'fps', label: 'First Person Shooter', icon: '🎯' },
  { value: 'moba', label: 'MOBA', icon: '⚔️' },
  { value: 'rpg', label: 'RPG', icon: '🗡️' },
  { value: 'strategy', label: 'Strategy', icon: '🧠' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'racing', label: 'Racing', icon: '🏎️' },
  { value: 'fighting', label: 'Fighting', icon: '🥊' },
  { value: 'survival', label: 'Survival', icon: '🏕️' },
  { value: 'horror', label: 'Horror', icon: '👻' },
  { value: 'indie', label: 'Indie', icon: '💎' },
  { value: 'retro', label: 'Retro', icon: '👾' },
  { value: 'vr', label: 'VR', icon: '🥽' }
];

const PLATFORMS = [
  { value: 'pc', label: 'PC', icon: '💻' },
  { value: 'playstation', label: 'PlayStation', icon: '🎮' },
  { value: 'xbox', label: 'Xbox', icon: '🎯' },
  { value: 'nintendo', label: 'Nintendo Switch', icon: '🔴' },
  { value: 'mobile', label: 'Mobile', icon: '📱' }
];

export default function GamingSetup({ onStartStream }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  
  const [step, setStep] = useState(1);
  const [cameraStream, setCameraStream] = useState(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  
  const [streamConfig, setStreamConfig] = useState({
    title: '',
    description: '',
    game_title: '',
    category: 'fps',
    platform: 'pc',
    tags: [],
    mature_content: false
  });

  const [deviceStatus, setDeviceStatus] = useState({
    camera: 'checking',
    microphone: 'checking',
    connection: 'checking'
  });

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return creators[0] || null;
    },
    enabled: !!user?.email
  });

  // Check devices on mount
  useEffect(() => {
    checkDevices();
  }, []);

  const checkDevices = async () => {
    // Check camera
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setDeviceStatus(prev => ({ ...prev, camera: 'ready', microphone: 'ready' }));
      
      // Setup audio level monitoring
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);
      analyser.fftSize = 256;
      
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const checkLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setAudioLevel(avg / 255 * 100);
        requestAnimationFrame(checkLevel);
      };
      checkLevel();
    } catch (error) {
      setDeviceStatus(prev => ({ 
        ...prev, 
        camera: error.name === 'NotAllowedError' ? 'denied' : 'error',
        microphone: error.name === 'NotAllowedError' ? 'denied' : 'error'
      }));
    }

    // Check connection
    setDeviceStatus(prev => ({ ...prev, connection: navigator.onLine ? 'ready' : 'error' }));
  };

  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleStartStream = () => {
    if (!streamConfig.title) {
      toast.error('Please enter a stream title');
      return;
    }
    if (!streamConfig.game_title) {
      toast.error('Please enter the game you\'re playing');
      return;
    }
    
    // Pass config to parent or navigate with params
    if (onStartStream) {
      onStartStream(streamConfig);
    } else {
      const params = new URLSearchParams({
        title: streamConfig.title,
        game: streamConfig.game_title,
        category: streamConfig.category,
        platform: streamConfig.platform
      });
      navigate(createPageUrl(`GoLive?${params.toString()}`));
    }
  };

  const DeviceStatusIcon = ({ status }) => {
    if (status === 'checking') return <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />;
    if (status === 'ready') return <Check className="w-4 h-4 text-green-400" />;
    if (status === 'denied') return <AlertCircle className="w-4 h-4 text-yellow-400" />;
    return <AlertCircle className="w-4 h-4 text-red-400" />;
  };

  return (
    <div className="min-h-screen pt-20 pb-24">
      <div className="max-w-5xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 bg-purple-500/20 border border-purple-500/40 px-4 py-1.5 rounded-full mb-4">
            <Gamepad2 className="w-4 h-4 text-purple-400" />
            <span className="text-purple-200 text-sm font-medium">Gaming Stream Setup</span>
          </div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-200 via-purple-400 to-pink-400 mb-3">
            Prepare Your Stream
          </h1>
          <p className="text-white/60">Configure your settings before going live</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-10">
          <div className="flex items-center gap-4">
            {[1, 2, 3].map((s) => (
              <React.Fragment key={s}>
                <motion.div 
                  animate={{ scale: step === s ? 1.1 : 1 }}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                    step >= s 
                      ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white' 
                      : 'bg-white/10 text-white/40'
                  }`}
                >
                  {step > s ? <Check className="w-5 h-5" /> : s}
                </motion.div>
                {s < 3 && (
                  <div className={`w-20 h-1 rounded ${step > s ? 'bg-purple-500' : 'bg-white/10'}`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Preview */}
          <GlassCard glowColor="purple" className="aspect-video relative overflow-hidden">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: 'scaleX(-1)' }}
            />
            
            {/* Overlay info */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Title preview */}
              {streamConfig.title && (
                <div className="absolute bottom-4 left-4 right-4">
                  <div className="bg-black/70 backdrop-blur-sm rounded-lg p-3">
                    <h3 className="text-white font-semibold">{streamConfig.title}</h3>
                    {streamConfig.game_title && (
                      <p className="text-purple-300 text-sm">🎮 {streamConfig.game_title}</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Audio meter */}
              <div className="absolute top-4 right-4">
                <div className="bg-black/70 backdrop-blur-sm rounded-lg p-2 flex items-center gap-2">
                  {isMuted ? (
                    <VolumeX className="w-4 h-4 text-red-400" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-green-400" />
                  )}
                  <div className="w-20 h-2 bg-white/20 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-500"
                      animate={{ width: `${audioLevel}%` }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* Configuration */}
          <div className="space-y-6">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <GlassCard glowColor="purple">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Settings className="w-5 h-5 text-purple-400" />
                      Device Check
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Camera className="w-5 h-5 text-purple-400" />
                          <span className="text-white">Camera</span>
                        </div>
                        <DeviceStatusIcon status={deviceStatus.camera} />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Mic className="w-5 h-5 text-purple-400" />
                          <span className="text-white">Microphone</span>
                        </div>
                        <DeviceStatusIcon status={deviceStatus.microphone} />
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                        <div className="flex items-center gap-3">
                          <Monitor className="w-5 h-5 text-purple-400" />
                          <span className="text-white">Connection</span>
                        </div>
                        <DeviceStatusIcon status={deviceStatus.connection} />
                      </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                      <PremiumButton 
                        onClick={() => setStep(2)}
                        disabled={deviceStatus.camera !== 'ready'}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        Continue
                      </PremiumButton>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <GlassCard glowColor="purple">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Video className="w-5 h-5 text-purple-400" />
                      Stream Details
                    </h2>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="text-white/70 text-sm mb-2 block">Stream Title *</label>
                        <Input
                          value={streamConfig.title}
                          onChange={(e) => setStreamConfig({ ...streamConfig, title: e.target.value })}
                          placeholder="e.g., Grinding Ranked in Valorant!"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      
                      <div>
                        <label className="text-white/70 text-sm mb-2 block">Game Title *</label>
                        <Input
                          value={streamConfig.game_title}
                          onChange={(e) => setStreamConfig({ ...streamConfig, game_title: e.target.value })}
                          placeholder="e.g., Valorant, Fortnite, Minecraft"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-white/70 text-sm mb-2 block">Category</label>
                          <Select 
                            value={streamConfig.category} 
                            onValueChange={(v) => setStreamConfig({ ...streamConfig, category: v })}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GAMING_CATEGORIES.map(cat => (
                                <SelectItem key={cat.value} value={cat.value}>
                                  {cat.icon} {cat.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <label className="text-white/70 text-sm mb-2 block">Platform</label>
                          <Select 
                            value={streamConfig.platform} 
                            onValueChange={(v) => setStreamConfig({ ...streamConfig, platform: v })}
                          >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PLATFORMS.map(p => (
                                <SelectItem key={p.value} value={p.value}>
                                  {p.icon} {p.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex justify-between">
                      <PremiumButton variant="ghost" onClick={() => setStep(1)}>
                        Back
                      </PremiumButton>
                      <PremiumButton 
                        onClick={() => setStep(3)}
                        disabled={!streamConfig.title || !streamConfig.game_title}
                        rightIcon={<ChevronRight className="w-4 h-4" />}
                      >
                        Continue
                      </PremiumButton>
                    </div>
                  </GlassCard>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <GlassCard glowColor="purple">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-400" />
                      Ready to Go Live
                    </h2>
                    
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4 mb-6">
                      <h3 className="text-white font-semibold mb-2">{streamConfig.title}</h3>
                      <div className="flex flex-wrap gap-2 text-sm">
                        <span className="bg-purple-500/30 text-purple-200 px-2 py-1 rounded">
                          🎮 {streamConfig.game_title}
                        </span>
                        <span className="bg-white/10 text-white/70 px-2 py-1 rounded">
                          {GAMING_CATEGORIES.find(c => c.value === streamConfig.category)?.icon} {streamConfig.category}
                        </span>
                        <span className="bg-white/10 text-white/70 px-2 py-1 rounded">
                          {PLATFORMS.find(p => p.value === streamConfig.platform)?.icon} {streamConfig.platform}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-3 mb-6 text-sm text-white/60">
                      <p>✓ Camera and microphone ready</p>
                      <p>✓ Stream details configured</p>
                      <p>✓ Connection stable</p>
                    </div>

                    <div className="flex justify-between">
                      <PremiumButton variant="ghost" onClick={() => setStep(2)}>
                        Back
                      </PremiumButton>
                      <PremiumButton 
                        variant="premium"
                        onClick={handleStartStream}
                        leftIcon={<Radio className="w-5 h-5" />}
                        size="lg"
                      >
                        GO LIVE
                      </PremiumButton>
                    </div>
                  </GlassCard>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}