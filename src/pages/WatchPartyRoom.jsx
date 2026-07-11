import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  Play, 
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  MessageSquare,
  Copy,
  CheckCircle,
  X,
  Send,
  Crown,
  Maximize
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { format } from 'date-fns';
import GlassCard from '@/components/shared/GlassCard';

export default function WatchPartyRoom() {
  const urlParams = new URLSearchParams(window.location.search);
  const partyId = urlParams.get('id');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const videoRef = useRef(null);
  
  const [message, setMessage] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [showChat, setShowChat] = useState(true);
  const [copied, setCopied] = useState(false);
  const [localPosition, setLocalPosition] = useState(0);
  const [chatMessages, setChatMessages] = useState([]);

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: party, isLoading } = useQuery({
    queryKey: ['watch-party', partyId],
    queryFn: () => base44.entities.WatchParty.filter({ id: partyId }, null, 1).then(r => r[0]),
    enabled: !!partyId,
    refetchInterval: 2000
  });

  const { data: video } = useQuery({
    queryKey: ['party-video', party?.video_id],
    queryFn: () => base44.entities.VlogVideo.filter({ id: party.video_id }, null, 1).then(r => r[0]),
    enabled: !!party?.video_id
  });

  const isHost = party?.host_email === user?.email;

  // Sync video position from host
  useEffect(() => {
    if (party && videoRef.current && !isHost) {
      const serverPosition = party.current_position_seconds || 0;
      const diff = Math.abs(videoRef.current.currentTime - serverPosition);
      if (diff > 2) {
        videoRef.current.currentTime = serverPosition;
      }
      if (party.status === 'playing' && videoRef.current.paused) {
        videoRef.current.play();
      } else if (party.status === 'paused' && !videoRef.current.paused) {
        videoRef.current.pause();
      }
    }
  }, [party, isHost]);

  // Host: Update position periodically
  useEffect(() => {
    if (!isHost || !videoRef.current) return;
    const interval = setInterval(() => {
      if (party && !videoRef.current.paused) {
        base44.entities.WatchParty.update(party.id, {
          current_position_seconds: Math.floor(videoRef.current.currentTime),
          status: 'playing'
        });
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isHost, party]);

  // Join party on mount
  useEffect(() => {
    if (party && user && !party.participants?.find(p => p.email === user.email)) {
      const updatedParticipants = [...(party.participants || []), {
        email: user.email,
        name: user.full_name,
        avatar_url: user.avatar_url,
        joined_at: new Date().toISOString()
      }];
      base44.entities.WatchParty.update(party.id, {
        participants: updatedParticipants,
        participant_count: updatedParticipants.length
      });
    }
  }, [party, user]);

  const updateStatus = async (status) => {
    if (!isHost || !party) return;
    await base44.entities.WatchParty.update(party.id, {
      status,
      current_position_seconds: Math.floor(videoRef.current?.currentTime || 0)
    });
  };

  const handlePlay = () => {
    if (isHost) {
      videoRef.current?.play();
      updateStatus('playing');
    }
  };

  const handlePause = () => {
    if (isHost) {
      videoRef.current?.pause();
      updateStatus('paused');
    }
  };

  const handleSeek = (seconds) => {
    if (!isHost || !videoRef.current) return;
    videoRef.current.currentTime += seconds;
    base44.entities.WatchParty.update(party.id, {
      current_position_seconds: Math.floor(videoRef.current.currentTime)
    });
  };

  const sendMessage = () => {
    if (!message.trim() || !user) return;
    setChatMessages(prev => [...prev, {
      id: Date.now(),
      sender_name: user.full_name,
      sender_email: user.email,
      content: message,
      timestamp: new Date()
    }]);
    setMessage('');
  };

  const copyInvite = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success('Invite link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const leaveParty = async () => {
    if (party && user) {
      const updatedParticipants = party.participants?.filter(p => p.email !== user.email) || [];
      await base44.entities.WatchParty.update(party.id, {
        participants: updatedParticipants,
        participant_count: updatedParticipants.length,
        ...(isHost && updatedParticipants.length === 0 ? { status: 'ended' } : {})
      });
    }
    navigate(createPageUrl('WatchParties'));
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!party) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        <GlassCard className="text-center">
          <Users className="w-16 h-16 text-amber-300/30 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-white mb-2">Party Not Found</h2>
          <p className="text-white/50 mb-4">This watch party has ended or doesn't exist</p>
          <Link to={createPageUrl('WatchParties')}>
            <Button className="bg-cyan-500 hover:bg-cyan-600">Back to Parties</Button>
          </Link>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex">
      {/* Video Area */}
      <div className={`flex-1 flex flex-col ${showChat ? 'mr-80' : ''} transition-all`}>
        {/* Header */}
        <div className="h-14 bg-black/80 backdrop-blur-xl flex items-center justify-between px-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <button onClick={leaveParty} className="p-2 hover:bg-white/10 rounded-lg">
              <X className="w-5 h-5 text-white/60" />
            </button>
            <div>
              <h1 className="text-white font-semibold">{party.title || video?.title}</h1>
              <div className="flex items-center gap-2 text-sm text-white/50">
                <Users className="w-4 h-4" />
                {party.participant_count || 1} watching
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button onClick={copyInvite} className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/20 text-amber-300 rounded-lg hover:bg-cyan-500/30">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Invite'}
            </button>
            <button 
              onClick={() => setShowChat(!showChat)} 
              className={`p-2 rounded-lg ${showChat ? 'bg-cyan-500 text-white' : 'bg-white/10 text-white/60'}`}
            >
              <MessageSquare className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Video Player */}
        <div className="flex-1 relative bg-black">
          <video
            ref={videoRef}
            src={video?.video_url}
            className="w-full h-full object-contain"
            poster={video?.thumbnail_url}
            playsInline
            muted={isMuted}
          />
          
          {/* Sync Status */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <div className={`w-2 h-2 rounded-full ${party.status === 'playing' ? 'bg-green-500' : 'bg-yellow-500'}`} />
            <span className="text-white text-sm">{party.status === 'playing' ? 'Synced' : 'Paused'}</span>
          </div>

          {/* Controls Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
            {/* Progress Bar */}
            <div className="h-1 bg-white/20 rounded-full mb-4 cursor-pointer">
              <div 
                className="h-full bg-cyan-500 rounded-full"
                style={{ width: `${video?.duration_seconds ? (localPosition / video.duration_seconds) * 100 : 0}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isHost ? (
                  <>
                    <button onClick={() => handleSeek(-10)} className="p-2 text-white/70 hover:text-white">
                      <SkipBack className="w-5 h-5" />
                    </button>
                    {party.status === 'playing' ? (
                      <button onClick={handlePause} className="p-3 bg-white rounded-full text-black">
                        <Pause className="w-6 h-6" />
                      </button>
                    ) : (
                      <button onClick={handlePlay} className="p-3 bg-white rounded-full text-black">
                        <Play className="w-6 h-6" />
                      </button>
                    )}
                    <button onClick={() => handleSeek(10)} className="p-2 text-white/70 hover:text-white">
                      <SkipForward className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <div className="flex items-center gap-2 text-white/50 text-sm">
                    <Crown className="w-4 h-4 text-amber-400" />
                    Host controls playback
                  </div>
                )}
                
                <button onClick={() => setIsMuted(!isMuted)} className="p-2 text-white/70 hover:text-white">
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
              </div>

              <button 
                onClick={() => videoRef.current?.requestFullscreen()}
                className="p-2 text-white/70 hover:text-white"
              >
                <Maximize className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Sidebar */}
      <AnimatePresence>
        {showChat && (
          <motion.div
            initial={{ x: 320 }}
            animate={{ x: 0 }}
            exit={{ x: 320 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-[#1e1f22] border-l border-white/10 flex flex-col"
          >
            {/* Participants */}
            <div className="p-4 border-b border-white/10">
              <h3 className="text-white font-semibold mb-3">Watching ({party.participant_count || 1})</h3>
              <div className="flex flex-wrap gap-2">
                {party.participants?.slice(0, 8).map((p, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white/5 rounded-full px-2 py-1">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center text-xs text-white font-medium">
                      {p.avatar_url ? (
                        <img src={p.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
                      ) : (
                        p.name?.[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    <span className="text-white/70 text-xs">{p.name?.split(' ')[0]}</span>
                    {p.email === party.host_email && <Crown className="w-3 h-3 text-amber-400" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.map(msg => (
                <div key={msg.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-amber-300 text-sm font-medium">{msg.sender_name}</span>
                    <span className="text-white/30 text-xs">{format(msg.timestamp, 'h:mm a')}</span>
                  </div>
                  <p className="text-white/80 text-sm">{msg.content}</p>
                </div>
              ))}
              {chatMessages.length === 0 && (
                <div className="text-center text-white/30 py-8">
                  <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Chat with your party!</p>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="p-4 border-t border-white/10">
              <div className="flex gap-2">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Say something..."
                  className="flex-1 bg-white/5 border-white/10 text-white"
                />
                <Button onClick={sendMessage} size="icon" className="bg-cyan-500 hover:bg-cyan-600">
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}