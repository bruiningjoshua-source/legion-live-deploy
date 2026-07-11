/**
 * StreamingSettings - Video quality, AR complexity, and adaptive streaming controls
 */

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  Wifi,
  Battery,
  BatteryLow,
  Gauge,
  Video,
  Sparkles,
  Zap,
  Signal,
  SignalLow,
  SignalMedium,
  SignalHigh,
  AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

// Resolution presets
const RESOLUTION_PRESETS = [
  { id: '1080p', label: '1080p HD', width: 1920, height: 1080, recommended: 'desktop' },
  { id: '720p', label: '720p HD', width: 1280, height: 720, recommended: 'default' },
  { id: '480p', label: '480p SD', width: 854, height: 480, recommended: 'mobile' },
  { id: '360p', label: '360p Low', width: 640, height: 360, recommended: 'lowband' },
];

// Bitrate presets (kbps)
const BITRATE_PRESETS = [
  { id: 'ultra', label: 'Ultra', video: 6000, audio: 192 },
  { id: 'high', label: 'High', video: 4000, audio: 128 },
  { id: 'medium', label: 'Medium', video: 2500, audio: 96 },
  { id: 'low', label: 'Low', video: 1000, audio: 64 },
  { id: 'auto', label: 'Auto (Adaptive)', video: null, audio: null },
];

// AR complexity levels
const AR_COMPLEXITY_LEVELS = [
  { id: 'off', label: 'Off', description: 'No AR effects', gpuLoad: 0 },
  { id: 'low', label: 'Low', description: 'Basic filters only', gpuLoad: 10 },
  { id: 'medium', label: 'Medium', description: 'Filters + simple effects', gpuLoad: 30 },
  { id: 'high', label: 'High', description: 'Full AR with face mesh', gpuLoad: 60 },
  { id: 'ultra', label: 'Ultra', description: 'All effects + segmentation', gpuLoad: 90 },
];

// Network quality thresholds
const NETWORK_QUALITY = {
  excellent: { minBandwidth: 5000, color: 'text-green-400', icon: SignalHigh },
  good: { minBandwidth: 2500, color: 'text-amber-400', icon: SignalMedium },
  fair: { minBandwidth: 1000, color: 'text-yellow-400', icon: SignalLow },
  poor: { minBandwidth: 0, color: 'text-red-400', icon: Signal },
};

export default function StreamingSettings({
  onSettingsChange,
  initialSettings = {},
  isLive = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Video settings
  const [resolution, setResolution] = useState(initialSettings.resolution || '720p');
  const [bitrate, setBitrate] = useState(initialSettings.bitrate || 'auto');
  const [frameRate, setFrameRate] = useState(initialSettings.frameRate || 30);
  
  // AR settings
  const [arComplexity, setArComplexity] = useState(initialSettings.arComplexity || 'medium');
  const [faceMeshEnabled, setFaceMeshEnabled] = useState(initialSettings.faceMeshEnabled ?? true);
  const [segmentationEnabled, setSegmentationEnabled] = useState(initialSettings.segmentationEnabled ?? false);
  
  // Adaptive streaming
  const [adaptiveEnabled, setAdaptiveEnabled] = useState(initialSettings.adaptiveEnabled ?? true);
  const [lowPowerMode, setLowPowerMode] = useState(initialSettings.lowPowerMode ?? false);
  
  // Network stats
  const [networkQuality, setNetworkQuality] = useState('good');
  const [estimatedBandwidth, setEstimatedBandwidth] = useState(3000);
  const [packetLoss, setPacketLoss] = useState(0);
  const [latency, setLatency] = useState(50);
  
  // Device stats
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [isCharging, setIsCharging] = useState(true);
  const [cpuUsage, setCpuUsage] = useState(30);

  // Monitor network conditions
  useEffect(() => {
    const monitorNetwork = async () => {
      // Use Network Information API if available
      if ('connection' in navigator) {
        const conn = navigator.connection;
        const updateNetworkInfo = () => {
          const downlink = conn.downlink * 1000; // Convert to kbps
          setEstimatedBandwidth(downlink);
          
          // Determine quality
          if (downlink >= 5000) setNetworkQuality('excellent');
          else if (downlink >= 2500) setNetworkQuality('good');
          else if (downlink >= 1000) setNetworkQuality('fair');
          else setNetworkQuality('poor');
          
          // Effective type gives us RTT estimate
          if (conn.rtt) setLatency(conn.rtt);
        };
        
        updateNetworkInfo();
        conn.addEventListener('change', updateNetworkInfo);
        return () => conn.removeEventListener('change', updateNetworkInfo);
      }
    };
    
    monitorNetwork();
    
    // Simulate periodic network checks
    const interval = setInterval(() => {
      // Simulate slight variations
      setEstimatedBandwidth(prev => prev + (Math.random() - 0.5) * 500);
      setLatency(prev => Math.max(20, prev + (Math.random() - 0.5) * 20));
      setPacketLoss(Math.random() * 2);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  // Monitor battery
  useEffect(() => {
    const monitorBattery = async () => {
      if ('getBattery' in navigator) {
        const battery = await navigator.getBattery();
        
        const updateBattery = () => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);
          
          // Auto-enable low power mode if battery is low and not charging
          if (battery.level < 0.2 && !battery.charging && !lowPowerMode) {
            setLowPowerMode(true);
            toast.info('Low power mode enabled to save battery');
          }
        };
        
        updateBattery();
        battery.addEventListener('levelchange', updateBattery);
        battery.addEventListener('chargingchange', updateBattery);
        
        return () => {
          battery.removeEventListener('levelchange', updateBattery);
          battery.removeEventListener('chargingchange', updateBattery);
        };
      }
    };
    
    monitorBattery();
  }, [lowPowerMode]);

  // Adaptive quality adjustment
  useEffect(() => {
    if (!adaptiveEnabled || !isLive) return;
    
    const adjustQuality = () => {
      if (networkQuality === 'poor') {
        if (resolution !== '360p') {
          setResolution('360p');
          toast.warning('Quality reduced due to poor network');
        }
      } else if (networkQuality === 'fair') {
        if (resolution === '1080p' || resolution === '720p') {
          setResolution('480p');
        }
      } else if (networkQuality === 'excellent' && !lowPowerMode) {
        if (resolution === '360p' || resolution === '480p') {
          setResolution('720p');
        }
      }
      
      // Reduce AR complexity on poor network
      if (networkQuality === 'poor' && arComplexity === 'ultra') {
        setArComplexity('low');
      }
    };
    
    adjustQuality();
  }, [networkQuality, adaptiveEnabled, isLive, lowPowerMode]);

  // Apply low power mode
  useEffect(() => {
    if (lowPowerMode) {
      setResolution('480p');
      setFrameRate(24);
      setArComplexity('low');
      setSegmentationEnabled(false);
    }
  }, [lowPowerMode]);

  // Emit settings changes
  useEffect(() => {
    const settings = {
      resolution,
      bitrate,
      frameRate,
      arComplexity,
      faceMeshEnabled,
      segmentationEnabled,
      adaptiveEnabled,
      lowPowerMode,
      // Computed values
      resolutionData: RESOLUTION_PRESETS.find(r => r.id === resolution),
      bitrateData: BITRATE_PRESETS.find(b => b.id === bitrate),
      arData: AR_COMPLEXITY_LEVELS.find(a => a.id === arComplexity),
    };
    
    onSettingsChange?.(settings);
  }, [resolution, bitrate, frameRate, arComplexity, faceMeshEnabled, segmentationEnabled, adaptiveEnabled, lowPowerMode]);

  const getNetworkIcon = () => {
    const config = NETWORK_QUALITY[networkQuality];
    const Icon = config.icon;
    return <Icon className={`w-4 h-4 ${config.color}`} />;
  };

  const currentResolution = RESOLUTION_PRESETS.find(r => r.id === resolution);
  const currentBitrate = BITRATE_PRESETS.find(b => b.id === bitrate);
  const currentArLevel = AR_COMPLEXITY_LEVELS.find(a => a.id === arComplexity);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <motion.button
          className="relative w-10 h-10 rounded-full bg-black/50 backdrop-blur-md border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Settings className="w-5 h-5" />
          {lowPowerMode && (
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-500 rounded-full" />
          )}
        </motion.button>
      </SheetTrigger>
      
      <SheetContent 
        side="right" 
        className="w-[380px] bg-gradient-to-b from-gray-900 to-black border-l border-white/10 overflow-y-auto"
      >
        <SheetHeader className="pb-4 border-b border-white/10">
          <SheetTitle className="text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            Stream Settings
          </SheetTitle>
        </SheetHeader>

        <div className="py-6 space-y-8">
          {/* Network Status */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Wifi className="w-4 h-4" />
              Network Status
            </h4>
            <div className="bg-white/5 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Quality</span>
                <div className="flex items-center gap-2">
                  {getNetworkIcon()}
                  <span className={`text-sm capitalize ${NETWORK_QUALITY[networkQuality].color}`}>
                    {networkQuality}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Bandwidth</span>
                <span className="text-white text-sm">{Math.round(estimatedBandwidth)} kbps</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Latency</span>
                <span className="text-white text-sm">{Math.round(latency)} ms</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70 text-sm">Packet Loss</span>
                <span className={`text-sm ${packetLoss > 1 ? 'text-red-400' : 'text-green-400'}`}>
                  {packetLoss.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Video Quality */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Video className="w-4 h-4" />
              Video Quality
            </h4>
            
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Resolution</Label>
                <Select value={resolution} onValueChange={setResolution} disabled={lowPowerMode}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {RESOLUTION_PRESETS.map(res => (
                      <SelectItem key={res.id} value={res.id} className="text-white">
                        <span className="flex items-center gap-2">
                          {res.label}
                          <span className="text-white/40 text-xs">({res.width}x{res.height})</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Bitrate</Label>
                <Select value={bitrate} onValueChange={setBitrate}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {BITRATE_PRESETS.map(br => (
                      <SelectItem key={br.id} value={br.id} className="text-white">
                        <span className="flex items-center gap-2">
                          {br.label}
                          {br.video && <span className="text-white/40 text-xs">({br.video} kbps)</span>}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-white/70 text-sm">Frame Rate</Label>
                  <span className="text-white text-sm">{frameRate} fps</span>
                </div>
                <Slider
                  value={[frameRate]}
                  onValueChange={([v]) => setFrameRate(v)}
                  min={15}
                  max={60}
                  step={1}
                  disabled={lowPowerMode}
                  className="[&_[role=slider]]:bg-amber-500"
                />
              </div>
            </div>
          </div>

          {/* AR Effects */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              AR Effects
            </h4>

            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-white/70 text-sm">Effect Complexity</Label>
                <Select value={arComplexity} onValueChange={setArComplexity}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-900 border-white/20">
                    {AR_COMPLEXITY_LEVELS.map(level => (
                      <SelectItem key={level.id} value={level.id} className="text-white">
                        <span className="flex flex-col">
                          <span>{level.label}</span>
                          <span className="text-white/40 text-xs">{level.description}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentArLevel && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-white/50 text-xs">GPU Load:</span>
                    <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          currentArLevel.gpuLoad > 70 ? 'bg-red-500' :
                          currentArLevel.gpuLoad > 40 ? 'bg-amber-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${currentArLevel.gpuLoad}%` }}
                      />
                    </div>
                    <span className="text-white/50 text-xs">{currentArLevel.gpuLoad}%</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-white text-sm">Face Mesh Tracking</Label>
                  <p className="text-white/40 text-xs">Precise AR placement & expressions</p>
                </div>
                <Switch
                  checked={faceMeshEnabled}
                  onCheckedChange={setFaceMeshEnabled}
                  disabled={arComplexity === 'off' || arComplexity === 'low'}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-white text-sm">AI Background Segmentation</Label>
                  <p className="text-white/40 text-xs">Real-time virtual backgrounds</p>
                </div>
                <Switch
                  checked={segmentationEnabled}
                  onCheckedChange={setSegmentationEnabled}
                  disabled={lowPowerMode || arComplexity === 'off'}
                />
              </div>
              
              {segmentationEnabled && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                    <p className="text-amber-200/80 text-xs">
                      AI segmentation uses significant CPU/GPU resources. May affect performance on older devices.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Adaptive & Power Settings */}
          <div className="space-y-4">
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider flex items-center gap-2">
              <Gauge className="w-4 h-4" />
              Performance
            </h4>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-white text-sm">Adaptive Streaming</Label>
                  <p className="text-white/40 text-xs">Auto-adjust quality based on network</p>
                </div>
                <Switch
                  checked={adaptiveEnabled}
                  onCheckedChange={setAdaptiveEnabled}
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label className="text-white text-sm flex items-center gap-2">
                    Low Power Mode
                    {batteryLevel < 20 && !isCharging && (
                      <BatteryLow className="w-4 h-4 text-red-400" />
                    )}
                  </Label>
                  <p className="text-white/40 text-xs">Reduce quality to save battery</p>
                </div>
                <Switch
                  checked={lowPowerMode}
                  onCheckedChange={setLowPowerMode}
                />
              </div>

              {/* Battery indicator */}
              <div className="bg-white/5 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCharging ? (
                    <Zap className="w-4 h-4 text-green-400" />
                  ) : batteryLevel < 20 ? (
                    <BatteryLow className="w-4 h-4 text-red-400" />
                  ) : (
                    <Battery className="w-4 h-4 text-white/60" />
                  )}
                  <span className="text-white/70 text-sm">Battery</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        batteryLevel < 20 ? 'bg-red-500' :
                        batteryLevel < 50 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${batteryLevel}%` }}
                    />
                  </div>
                  <span className="text-white text-sm w-10 text-right">{batteryLevel}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Current Config Summary */}
          <div className="bg-white/5 rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-semibold text-white/60 uppercase tracking-wider">Current Config</h4>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                {currentResolution?.label}
              </Badge>
              <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                {frameRate} fps
              </Badge>
              <Badge variant="outline" className="border-amber-500/50 text-amber-400">
                {currentBitrate?.label}
              </Badge>
              <Badge variant="outline" className="border-pink-500/50 text-pink-400">
                AR: {currentArLevel?.label}
              </Badge>
              {faceMeshEnabled && arComplexity !== 'off' && (
                <Badge variant="outline" className="border-cyan-500/50 text-cyan-400">
                  Face Mesh
                </Badge>
              )}
              {segmentationEnabled && (
                <Badge variant="outline" className="border-green-500/50 text-green-400">
                  BG Segmentation
                </Badge>
              )}
              {lowPowerMode && (
                <Badge variant="outline" className="border-red-500/50 text-red-400">
                  Low Power
                </Badge>
              )}
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}