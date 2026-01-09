import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Radio, 
  Users, 
  Swords, 
  Camera,
  Upload,
  Sparkles,
  Plus,
  X,
  ArrowRight,
  Video
} from 'lucide-react';
import { motion } from 'framer-motion';
import HostControls from '@/components/stream/HostControls';
import AgoraService from '@/components/stream/AgoraService';
import StreamQualityMonitor from '@/components/stream/StreamQualityMonitor';

const categories = [
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'talk_show', label: 'Talk Show', icon: '🎙️' },
  { value: 'dance', label: 'Dance', icon: '💃' },
  { value: 'cooking', label: 'Cooking', icon: '👨‍🍳' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'art', label: 'Art', icon: '🎨' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'other', label: 'Other', icon: '✨' }
];

const streamTypes = [
  { 
    value: 'solo', 
    label: 'Solo Stream', 
    description: 'Stream on your own with optional guest invites',
    icon: Radio,
    color: 'from-blue-500 to-blue-600'
  },
  { 
    value: 'multi_panel', 
    label: 'Multi-Panel', 
    description: 'Stream with multiple creators side by side',
    icon: Users,
    color: 'from-purple-500 to-purple-600'
  },
  { 
    value: 'pk_battle', 
    label: 'PK Battle', 
    description: 'Challenge another creator to a gift battle',
    icon: Swords,
    color: 'from-orange-500 to-red-600'
  }
];

export default function GoLive() {
  const [streamType, setStreamType] = useState('solo');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [tags, setTags] = useState([]);
  const [newTag, setNewTag] = useState('');
  const [guestEmail, setGuestEmail] = useState('');
  const [pkOpponent, setPkOpponent] = useState('');
  const [cameraStream, setCameraStream] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [streamStats, setStreamStats] = useState(null);
  const [agoraToken, setAgoraToken] = useState(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const videoPreviewRef = React.useRef(null);

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

  const { data: allCreators = [] } = useQuery({
    queryKey: ['all-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 50)
  });

  const createCreatorMutation = useMutation({
    mutationFn: () => base44.entities.Creator.create({
      user_email: user.email,
      display_name: user.full_name || 'New Creator',
      category: category || 'other'
    })
  });

  React.useEffect(() => {
    // Attach stream to video element when it becomes available
    if (cameraStream && videoPreviewRef.current) {
      videoPreviewRef.current.srcObject = cameraStream;
      videoPreviewRef.current.muted = true;
      videoPreviewRef.current.playsInline = true;
      
      // Ensure video plays on mobile
      const playVideo = async () => {
        try {
          await videoPreviewRef.current.play();
        } catch (e) {
          console.log('Play blocked, retrying...', e);
          setTimeout(() => playVideo(), 500);
        }
      };
      playVideo();
    }
  }, [cameraStream]);

  React.useEffect(() => {
    // Apply mirror effect immediately
    if (videoPreviewRef.current) {
      if (isMirrored) {
        videoPreviewRef.current.style.transform = 'scaleX(-1)';
      } else {
        videoPreviewRef.current.style.transform = 'scaleX(1)';
      }
    }
  }, [isMirrored]);

  React.useEffect(() => {
    // Apply initial mirror on mount
    if (videoPreviewRef.current && isMirrored) {
      videoPreviewRef.current.style.transform = 'scaleX(-1)';
    }
  }, [cameraStream]);

  // Monitor stream quality
  React.useEffect(() => {
    const unsubscribe = AgoraService.onQualityChange((stats) => {
      setStreamStats(stats);
    });
    return () => unsubscribe?.();
  }, []);

  React.useEffect(() => {
    return () => {
      // Cleanup camera stream on unmount
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const requestCameraPermissions = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 1080 },
          height: { ideal: 1920 },
          frameRate: { ideal: 30, max: 30 }
        }, 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      setCameraStream(stream);
      setHasPermissions(true);
      
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = stream;
        videoPreviewRef.current.muted = true;
        videoPreviewRef.current.playsInline = true;
        
        // Force play for mobile
        try {
          await videoPreviewRef.current.play();
        } catch (playError) {
          console.log('Autoplay prevented, waiting for user interaction');
        }
      }
    } catch (error) {
      alert('Camera and microphone access is required to go live. Please allow permissions and try again.');
      console.error('Media error:', error);
    }
  };

  const goLiveMutation = useMutation({
    mutationFn: async () => {
      if (!hasPermissions) {
        throw new Error('Camera permissions required');
      }

      // Check if creator already has a live stream
      if (creator?.is_live) {
        throw new Error('You already have a live stream. End it before starting a new one.');
      }

      let creatorId = creator?.id;

      // Create creator profile if doesn't exist
      if (!creatorId) {
        const newCreator = await createCreatorMutation.mutateAsync();
        creatorId = newCreator.id;
      }

      // Create stream
      const stream = await base44.entities.Stream.create({
        creator_id: creatorId,
        title,
        description,
        category,
        thumbnail_url: thumbnailUrl,
        stream_type: streamType,
        status: 'live',
        tags,
        guests: guestEmail ? [guestEmail] : [],
        pk_opponent_id: pkOpponent || null
      });

      // Initialize Agora
      const AGORA_APP_ID = '497c36af191647579fb65a825dd22b42';
      await AgoraService.initialize(AGORA_APP_ID);

      // Get Agora token from backend (optional for testing)
      try {
        const tokenResponse = await base44.functions.invoke('generateAgoraToken', {
          channelName: stream.id,
          uid: Math.floor(Math.random() * 1000000),
          role: 'host'
        });
        setAgoraToken(tokenResponse.data.token);
      } catch (error) {
        console.log('Token generation skipped:', error.message);
        setAgoraToken('');
      }

      // Update creator to live status
      await base44.entities.Creator.update(creatorId, {
        is_live: true,
        current_stream_id: stream.id
      });

      // Create PK battle if applicable
      if (streamType === 'pk_battle' && pkOpponent) {
        await base44.entities.PKBattle.create({
          stream_id: stream.id,
          host_creator_id: creatorId,
          opponent_creator_id: pkOpponent,
          status: 'pending',
          duration_minutes: 5
        });
      }

      return stream;
    },
    onSuccess: (stream) => {
      window.location.href = createPageUrl(`WatchStream?id=${stream.id}`);
    },
    onError: (error) => {
      alert(error.message);
    }
  });

  const addTag = () => {
    if (newTag && !tags.includes(newTag) && tags.length < 5) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const result = await base44.integrations.Core.UploadFile({ file });
      setThumbnailUrl(result.file_url);
    }
  };

  const isFormValid = title.trim() && category;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-red-600/20 border border-red-500/30 rounded-full px-4 py-2 mb-4">
            <Radio className="w-4 h-4 text-red-400 animate-pulse" />
            <span className="text-red-200 text-sm font-medium">Go Live</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Start Your Stream</h1>
          <p className="text-amber-400/70">Set up your stream and go live to your audience</p>
        </div>

        {/* Stream Type Selection */}
        <div className="mb-8">
          <Label className="text-amber-100 text-lg mb-4 block">Choose Stream Type</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {streamTypes.map((type) => {
              const Icon = type.icon;
              return (
                <motion.div
                  key={type.value}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Card
                    className={`cursor-pointer transition-all ${
                      streamType === type.value
                        ? `bg-gradient-to-br ${type.color} border-0 ring-2 ring-amber-400`
                        : 'bg-stone-800/50 border-amber-600/20 hover:border-amber-500/50'
                    }`}
                    onClick={() => setStreamType(type.value)}
                  >
                    <CardContent className="p-4 text-center">
                      <div className={`w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center ${
                        streamType === type.value ? 'bg-white/20' : `bg-gradient-to-br ${type.color}`
                      }`}>
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <h3 className={`font-bold mb-1 ${streamType === type.value ? 'text-white' : 'text-amber-100'}`}>
                        {type.label}
                      </h3>
                      <p className={`text-xs ${streamType === type.value ? 'text-white/70' : 'text-amber-400/60'}`}>
                        {type.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Camera Preview & Quality Monitor */}
        {!hasPermissions ? (
          <Card className="bg-stone-800/30 border-amber-600/20">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-xl font-bold text-amber-100 mb-2">Camera & Microphone Required</h3>
              <p className="text-amber-400/70 mb-6">Allow access to start broadcasting to your audience</p>
              <Button 
                onClick={requestCameraPermissions}
                size="lg"
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white"
              >
                <Camera className="w-5 h-5 mr-2" />
                Enable Camera & Microphone
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 mb-8">
            <div className="relative w-full bg-black rounded-2xl overflow-hidden" style={{ aspectRatio: '9/16', maxWidth: '500px', margin: '0 auto' }}>
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                preload="auto"
                webkit-playsinline="true"
                className="w-full h-full object-cover"
                style={{ backgroundColor: '#000' }}
              />
              <div className="absolute top-4 left-4 flex items-center gap-2 z-10">
                <Badge className="bg-red-500 text-white border-0 animate-pulse">
                  <span className="w-2 h-2 bg-white rounded-full mr-2 animate-ping" />
                  PREVIEW
                </Badge>
              </div>
              <div className="absolute top-4 right-4 z-10">
                <HostControls 
                  videoRef={videoPreviewRef}
                  onMirrorChange={setIsMirrored}
                  initialMirror={isMirrored}
                />
              </div>
            </div>

            {/* Stream Quality Monitor */}
            {streamStats && (
              <div style={{ maxWidth: '500px', margin: '0 auto' }}>
                <StreamQualityMonitor 
                  stats={streamStats}
                  onQualityChange={(quality) => AgoraService.setVideoQuality(quality)}
                />
              </div>
            )}
          </div>
        )}

        {/* Stream Setup Form */}
        <Card className="bg-stone-800/30 border-amber-600/20">
          <CardHeader>
            <CardTitle className="text-amber-100 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              Stream Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <Label className="text-amber-200">Stream Title *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give your stream an exciting title..."
                className="bg-stone-900/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40"
                maxLength={100}
              />
              <p className="text-amber-400/50 text-xs text-right">{title.length}/100</p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-amber-200">Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-stone-900/50 border-amber-600/20 text-amber-100">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-600/30">
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-amber-100 focus:bg-amber-800/30">
                      <span className="flex items-center gap-2">
                        <span>{cat.icon}</span>
                        {cat.label}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label className="text-amber-200">Description</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell viewers what your stream is about..."
                className="bg-stone-900/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40 min-h-[100px]"
                maxLength={500}
              />
            </div>

            {/* Thumbnail */}
            <div className="space-y-2">
              <Label className="text-amber-200">Thumbnail</Label>
              <div className="flex items-center gap-4">
                {thumbnailUrl ? (
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden">
                    <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setThumbnailUrl('')}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/60 rounded-full flex items-center justify-center text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="w-32 h-20 border-2 border-dashed border-amber-600/30 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/50 transition-colors">
                    <Upload className="w-5 h-5 text-amber-400/50" />
                    <span className="text-amber-400/50 text-xs mt-1">Upload</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                  </label>
                )}
                <p className="text-amber-400/50 text-xs">Recommended: 16:9 aspect ratio</p>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-amber-200">Tags (up to 5)</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                />
                <Button onClick={addTag} disabled={!newTag || tags.length >= 5} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map(tag => (
                    <Badge key={tag} className="bg-amber-600/20 text-amber-200 border-amber-500/30">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="ml-1">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* PK Opponent Selection */}
            {streamType === 'pk_battle' && (
              <div className="space-y-2 p-4 bg-orange-900/20 rounded-xl border border-orange-500/30">
                <Label className="text-orange-200 flex items-center gap-2">
                  <Swords className="w-4 h-4" />
                  Select Your Opponent
                </Label>
                <Select value={pkOpponent} onValueChange={setPkOpponent}>
                  <SelectTrigger className="bg-stone-900/50 border-orange-600/30 text-amber-100">
                    <SelectValue placeholder="Choose a creator to battle" />
                  </SelectTrigger>
                  <SelectContent className="bg-stone-900 border-amber-600/30">
                    {allCreators.filter(c => c.id !== creator?.id).map(c => (
                      <SelectItem key={c.id} value={c.id} className="text-amber-100 focus:bg-amber-800/30">
                        <span className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-full bg-amber-600 flex items-center justify-center text-xs">
                            {c.display_name?.[0] || '?'}
                          </span>
                          {c.display_name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Guest Invite */}
            {streamType === 'solo' && (
              <div className="space-y-2">
                <Label className="text-amber-200">Invite a Guest (optional)</Label>
                <Input
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="Enter guest's email..."
                  type="email"
                  className="bg-stone-900/50 border-amber-600/20 text-amber-100"
                />
              </div>
            )}

            {/* Go Live Button */}
            <Button
              onClick={() => goLiveMutation.mutate()}
              disabled={!isFormValid || !hasPermissions || goLiveMutation.isPending}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white py-6 text-lg font-bold disabled:opacity-50"
            >
              {goLiveMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Starting...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Radio className="w-5 h-5 animate-pulse" />
                  Go Live Now
                  <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}