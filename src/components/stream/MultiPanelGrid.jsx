import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  UserPlus,
  Crown,
  X,
  Users,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function MultiPanelGrid({ 
  hostStream,
  hostCreator,
  currentUser,
  panelParticipants = [],
  onInviteToPanel,
  onRemoveFromPanel,
  onMuteAudio,
  onEndCamera,
  isHost = false
}) {
  const [seats, setSeats] = useState([
    { id: 1, participant: null, isHost: true },
    { id: 2, participant: null, isHost: false },
    { id: 3, participant: null, isHost: false },
    { id: 4, participant: null, isHost: false }
  ]);

  // Initialize host in first seat
  useEffect(() => {
    if (hostCreator) {
      setSeats(prev => prev.map((seat, i) => 
        i === 0 ? { ...seat, participant: { ...hostCreator, isHost: true }, isHost: true } : seat
      ));
    }
  }, [hostCreator]);

  // Update seats when participants change
  useEffect(() => {
    setSeats(prev => {
      const updated = [...prev];
      panelParticipants.forEach((p, idx) => {
        if (idx + 1 < updated.length && !updated[idx + 1].participant) {
          updated[idx + 1].participant = p;
        }
      });
      return updated;
    });
  }, [panelParticipants]);

  const handleJoinSeat = (seatId) => {
    if (!currentUser) return;
    onInviteToPanel?.(seatId, currentUser);
  };

  const handleLeaveSeat = (seatId) => {
    onRemoveFromPanel?.(seatId);
    setSeats(prev => prev.map(s => 
      s.id === seatId ? { ...s, participant: null } : s
    ));
  };

  return (
    <div className="w-full h-full grid grid-cols-2 grid-rows-2 gap-1 bg-black p-1">
      {seats.map((seat) => (
        <PanelSeat
          key={seat.id}
          seat={seat}
          isHost={isHost}
          isCurrentUser={seat.participant?.user_email === currentUser?.email}
          onJoin={() => handleJoinSeat(seat.id)}
          onLeave={() => handleLeaveSeat(seat.id)}
          onMuteAudio={() => onMuteAudio?.(seat.id, seat.participant)}
          onEndCamera={() => onEndCamera?.(seat.id, seat.participant)}
          onRemove={() => handleLeaveSeat(seat.id)}
        />
      ))}
    </div>
  );
}

function PanelSeat({ 
  seat, 
  isHost, 
  isCurrentUser,
  onJoin, 
  onLeave,
  onMuteAudio,
  onEndCamera,
  onRemove
}) {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);

  // Initialize camera when user joins
  useEffect(() => {
    if (seat.participant && isCurrentUser && !localStream) {
      initCamera();
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [seat.participant, isCurrentUser]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: { echoCancellation: true, noiseSuppression: true }
      });
      setLocalStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera init failed:', error);
    }
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(!isVideoOff);
    }
  };

  // Empty seat
  if (!seat.participant) {
    return (
      <div className="relative bg-stone-900/80 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-stone-800 flex items-center justify-center mx-auto mb-3">
            <UserPlus className="w-8 h-8 text-stone-600" />
          </div>
          <p className="text-stone-500 text-sm mb-2">Empty Seat</p>
          <Button
            size="sm"
            variant="outline"
            onClick={onJoin}
            className="border-amber-600/30 text-amber-300 hover:bg-amber-800/20 text-xs"
          >
            Join Panel
          </Button>
        </div>
      </div>
    );
  }

  // Occupied seat
  return (
    <div className="relative bg-stone-900 rounded-lg overflow-hidden">
      {/* Video Feed */}
      {!isVideoOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isCurrentUser}
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />
      ) : (
        <div className="w-full h-full bg-stone-800 flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-stone-700 flex items-center justify-center">
            <span className="text-3xl">
              {seat.participant.avatar_url ? (
                <img src={seat.participant.avatar_url} className="w-full h-full rounded-full object-cover" />
              ) : (
                seat.participant.display_name?.[0] || '?'
              )}
            </span>
          </div>
        </div>
      )}

      {/* Participant Info Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {seat.isHost && (
              <Crown className="w-4 h-4 text-amber-400" />
            )}
            <span className="text-white text-sm font-medium truncate">
              {seat.participant.display_name || 'Guest'}
            </span>
            {isMuted && <MicOff className="w-3 h-3 text-red-400" />}
          </div>
        </div>
      </div>

      {/* Controls for current user */}
      {isCurrentUser && (
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-2">
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleMute}
            className={`w-8 h-8 rounded-full ${isMuted ? 'bg-red-600/80' : 'bg-black/50'}`}
          >
            {isMuted ? <MicOff className="w-4 h-4 text-white" /> : <Mic className="w-4 h-4 text-white" />}
          </Button>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleVideo}
            className={`w-8 h-8 rounded-full ${isVideoOff ? 'bg-red-600/80' : 'bg-black/50'}`}
          >
            {isVideoOff ? <VideoOff className="w-4 h-4 text-white" /> : <Video className="w-4 h-4 text-white" />}
          </Button>
          {!seat.isHost && (
            <Button
              size="icon"
              variant="ghost"
              onClick={onLeave}
              className="w-8 h-8 rounded-full bg-black/50"
            >
              <X className="w-4 h-4 text-white" />
            </Button>
          )}
        </div>
      )}

      {/* Host moderation controls */}
      {isHost && !seat.isHost && seat.participant && (
        <div className="absolute top-2 right-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="w-7 h-7 bg-black/50 rounded-full">
                <MoreVertical className="w-4 h-4 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-stone-900 border-amber-600/30">
              <DropdownMenuItem onClick={onMuteAudio} className="text-amber-100">
                <MicOff className="w-4 h-4 mr-2" />
                Mute Audio
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEndCamera} className="text-amber-100">
                <VideoOff className="w-4 h-4 mr-2" />
                End Camera
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onRemove} className="text-red-400">
                <X className="w-4 h-4 mr-2" />
                Remove from Panel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}