import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { 
  Radio, 
  Youtube, 
  Twitch, 
  X,
  Plus,
  Play,
  Pause,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

// Platform configurations
const PLATFORMS = {
  youtube: {
    name: 'YouTube',
    icon: Youtube,
    color: 'bg-red-500',
    textColor: 'text-red-400',
    placeholder: 'rtmp://a.rtmp.youtube.com/live2',
    keyPlaceholder: 'Your YouTube Stream Key'
  },
  twitch: {
    name: 'Twitch',
    icon: Twitch,
    color: 'bg-purple-500',
    textColor: 'text-amber-400',
    placeholder: 'rtmp://live.twitch.tv/app',
    keyPlaceholder: 'Your Twitch Stream Key'
  },
  facebook: {
    name: 'Facebook',
    icon: () => <span className="text-lg">📘</span>,
    color: 'bg-blue-600',
    textColor: 'text-amber-400',
    placeholder: 'rtmps://live-api-s.facebook.com:443/rtmp',
    keyPlaceholder: 'Your Facebook Stream Key'
  },
  tiktok: {
    name: 'TikTok',
    icon: () => <span className="text-lg">🎵</span>,
    color: 'bg-black',
    textColor: 'text-white',
    placeholder: 'rtmp://push.tiktok.com/rtmp',
    keyPlaceholder: 'Your TikTok Server URL & Key'
  },
  custom: {
    name: 'Custom RTMP',
    icon: Radio,
    color: 'bg-gray-600',
    textColor: 'text-gray-400',
    placeholder: 'rtmp://your-server.com/live',
    keyPlaceholder: 'Stream Key'
  }
};

export default function MultiStreamManager({ isLive, onClose }) {
  const [destinations, setDestinations] = useState([]);
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [newDest, setNewDest] = useState({ platform: '', rtmpUrl: '', streamKey: '', enabled: true });

  const addDestination = () => {
    if (!newDest.platform || !newDest.streamKey) {
      toast.error('Please select a platform and enter stream key');
      return;
    }

    const platform = PLATFORMS[newDest.platform];
    setDestinations([...destinations, {
      id: Date.now(),
      platform: newDest.platform,
      name: platform.name,
      rtmpUrl: newDest.rtmpUrl || platform.placeholder,
      streamKey: newDest.streamKey,
      enabled: true,
      status: 'idle' // idle, connecting, live, error
    }]);
    
    setNewDest({ platform: '', rtmpUrl: '', streamKey: '', enabled: true });
    setShowAddPlatform(false);
    toast.success(`${platform.name} added!`);
  };

  const removeDestination = (id) => {
    setDestinations(destinations.filter(d => d.id !== id));
  };

  const toggleDestination = (id) => {
    setDestinations(destinations.map(d => 
      d.id === id ? { ...d, enabled: !d.enabled } : d
    ));
  };

  const simulateConnect = (id) => {
    setDestinations(destinations.map(d => 
      d.id === id ? { ...d, status: 'connecting' } : d
    ));
    
    setTimeout(() => {
      setDestinations(prev => prev.map(d => 
        d.id === id ? { ...d, status: Math.random() > 0.2 ? 'live' : 'error' } : d
      ));
    }, 2000);
  };

  const activeCount = destinations.filter(d => d.enabled && d.status === 'live').length;

  return (
    <motion.div
      initial={{ opacity: 0, x: 300 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 300 }}
      className="fixed right-0 top-0 bottom-0 w-96 bg-[#1a1a1c] border-l border-white/10 flex flex-col z-40"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-red-500 to-amber-700">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">Multi-Stream</h3>
              <p className="text-white/50 text-xs">Broadcast to multiple platforms</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-white/40 hover:text-white rounded-lg hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status */}
        {activeCount > 0 && (
          <div className="flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-xl px-3 py-2 mt-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400 text-sm font-medium">
              Live on {activeCount} platform{activeCount !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </div>

      {/* Destinations List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {destinations.map(dest => {
          const platform = PLATFORMS[dest.platform];
          const Icon = platform.icon;
          
          return (
            <motion.div
              key={dest.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-xl border transition-colors ${
                dest.status === 'live' 
                  ? 'bg-green-500/10 border-green-500/30' 
                  : dest.status === 'error'
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-white/5 border-white/10'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${platform.color}`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{dest.name}</p>
                    <p className="text-white/40 text-xs">
                      {dest.status === 'live' ? 'Connected' : 
                       dest.status === 'connecting' ? 'Connecting...' :
                       dest.status === 'error' ? 'Connection failed' : 'Ready'}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {dest.status === 'live' && (
                    <span className="flex items-center gap-1 bg-red-500 px-2 py-0.5 rounded text-white text-xs font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                      LIVE
                    </span>
                  )}
                  <Switch 
                    checked={dest.enabled}
                    onCheckedChange={() => toggleDestination(dest.id)}
                  />
                </div>
              </div>

              {/* Stream Key (masked) */}
              <div className="bg-black/30 rounded-lg px-3 py-2 mb-3">
                <p className="text-white/30 text-xs mb-1">Stream Key</p>
                <p className="text-white/60 text-sm font-mono">
                  {'•'.repeat(Math.min(dest.streamKey.length, 20))}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                {dest.status === 'idle' && isLive && (
                  <Button
                    size="sm"
                    onClick={() => simulateConnect(dest.id)}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    disabled={!dest.enabled}
                  >
                    <Play className="w-3 h-3 mr-1" /> Connect
                  </Button>
                )}
                {dest.status === 'connecting' && (
                  <Button size="sm" className="flex-1" disabled>
                    <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> Connecting...
                  </Button>
                )}
                {dest.status === 'live' && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => setDestinations(prev => prev.map(d => 
                      d.id === dest.id ? { ...d, status: 'idle' } : d
                    ))}
                    className="flex-1"
                  >
                    <Pause className="w-3 h-3 mr-1" /> Disconnect
                  </Button>
                )}
                {dest.status === 'error' && (
                  <Button
                    size="sm"
                    onClick={() => simulateConnect(dest.id)}
                    className="flex-1 bg-amber-600 hover:bg-amber-700"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> Retry
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => removeDestination(dest.id)}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          );
        })}

        {destinations.length === 0 && !showAddPlatform && (
          <div className="text-center py-12">
            <Radio className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/40 mb-1">No streaming destinations</p>
            <p className="text-white/30 text-sm">Add platforms to broadcast simultaneously</p>
          </div>
        )}

        {/* Add Platform Form */}
        <AnimatePresence>
          {showAddPlatform && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                <h4 className="text-white font-medium mb-3">Add Streaming Platform</h4>
                
                {/* Platform Selection */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {Object.entries(PLATFORMS).map(([key, platform]) => {
                    const Icon = platform.icon;
                    return (
                      <button
                        key={key}
                        onClick={() => setNewDest({ ...newDest, platform: key, rtmpUrl: platform.placeholder })}
                        className={`p-3 rounded-xl border text-center transition-all ${
                          newDest.platform === key
                            ? `${platform.color} border-white/30`
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        }`}
                      >
                        <Icon className={`w-5 h-5 mx-auto mb-1 ${newDest.platform === key ? 'text-white' : platform.textColor}`} />
                        <p className="text-white text-xs">{platform.name}</p>
                      </button>
                    );
                  })}
                </div>

                {newDest.platform && (
                  <>
                    {/* RTMP URL */}
                    <div className="mb-3">
                      <label className="text-white/60 text-xs mb-1 block">RTMP URL</label>
                      <Input
                        value={newDest.rtmpUrl}
                        onChange={(e) => setNewDest({ ...newDest, rtmpUrl: e.target.value })}
                        placeholder={PLATFORMS[newDest.platform]?.placeholder}
                        className="bg-black/30 border-white/10 text-white text-sm"
                      />
                    </div>

                    {/* Stream Key */}
                    <div className="mb-4">
                      <label className="text-white/60 text-xs mb-1 block">Stream Key</label>
                      <Input
                        type="password"
                        value={newDest.streamKey}
                        onChange={(e) => setNewDest({ ...newDest, streamKey: e.target.value })}
                        placeholder={PLATFORMS[newDest.platform]?.keyPlaceholder}
                        className="bg-black/30 border-white/10 text-white text-sm"
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setShowAddPlatform(false);
                      setNewDest({ platform: '', rtmpUrl: '', streamKey: '', enabled: true });
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={addDestination}
                    disabled={!newDest.platform || !newDest.streamKey}
                    className="flex-1 bg-gradient-to-r from-amber-500 to-amber-600"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Add
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Add Button */}
      {!showAddPlatform && (
        <div className="p-4 border-t border-white/10">
          <Button
            onClick={() => setShowAddPlatform(true)}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Platform
          </Button>
        </div>
      )}
    </motion.div>
  );
}