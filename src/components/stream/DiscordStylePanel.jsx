import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
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
  MoreVertical,
  PhoneOff,
  Headphones,
  Monitor,
  MessageSquare,
  Hand,
  VolumeX,
  Grid3X3,
  LayoutGrid,
  Pin
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Discord-style layouts
const LAYOUTS = {
  grid: 'grid',
  focus: 'focus',
  sidebar: 'sidebar'
};

export default function DiscordStylePanel({ 
  hostStream,
  hostCreator,
  currentUser,
  panelParticipants = [],
  onInviteToPanel,
  onRemoveFromPanel,
  onMuteAudio,
  onEndCamera,
  onLeaveCall,
  isHost = false,
  maxParticipants = 8
}) {
  const [layout, setLayout] = useState(LAYOUTS.grid);
  const [focusedUser, setFocusedUser] = useState(null);
  const [showChat, setShowChat] = useState(false);
  const [isSelfMuted, setIsSelfMuted] = useState(false);
  const [isSelfVideoOff, setIsSelfVideoOff] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [raisedHands, setRaisedHands] = useState(new Set());

  // Initialize participants with host
  const allParticipants = [
    { ...hostCreator, isHost: true, isSpeaking: false },
    ...panelParticipants.map(p => ({ ...p, isHost: false, isSpeaking: false }))
  ].filter(Boolean);

  const toggleLayout = () => {
    const layouts = Object.values(LAYOUTS);
    const currentIndex = layouts.indexOf(layout);
    setLayout(layouts[(currentIndex + 1) % layouts.length]);
  };

  const handleRaiseHand = () => {
    if (!currentUser) return;
    setRaisedHands(prev => {
      const newSet = new Set(prev);
      if (newSet.has(currentUser.email)) {
        newSet.delete(currentUser.email);
      } else {
        newSet.add(currentUser.email);
      }
      return newSet;
    });
  };

  const getGridClass = () => {
    const count = allParticipants.length;
    if (count <= 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count <= 4) return 'grid-cols-2 grid-rows-2';
    if (count <= 6) return 'grid-cols-3 grid-rows-2';
    return 'grid-cols-4 grid-rows-2';
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1f22]">
      {/* Header Bar */}
      <div className="h-12 bg-[#2b2d31] border-b border-[#1e1f22] flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-white/90 font-medium text-sm">{hostStream?.title || 'Live Panel'}</span>
          </div>
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
            LIVE
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-white/50 text-xs">{allParticipants.length} participants</span>
          <Button
            size="icon"
            variant="ghost"
            onClick={toggleLayout}
            className="w-8 h-8 text-white/60 hover:text-white hover:bg-white/10"
          >
            {layout === 'grid' ? <Grid3X3 className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      {/* Video Grid */}
      <div className="flex-1 p-2 overflow-hidden">
        {layout === LAYOUTS.focus && focusedUser ? (
          <FocusLayout
            focusedUser={focusedUser}
            participants={allParticipants}
            currentUser={currentUser}
            onChangeFocus={setFocusedUser}
            raisedHands={raisedHands}
            isHost={isHost}
            onMuteAudio={onMuteAudio}
            onEndCamera={onEndCamera}
            onRemoveFromPanel={onRemoveFromPanel}
          />
        ) : (
          <div className={`grid ${getGridClass()} gap-2 h-full`}>
            {allParticipants.map((participant, index) => (
              <ParticipantTile
                key={participant.user_email || participant.id || index}
                participant={participant}
                isCurrentUser={participant.user_email === currentUser?.email}
                isFocused={focusedUser?.user_email === participant.user_email}
                onFocus={() => setFocusedUser(participant)}
                hasRaisedHand={raisedHands.has(participant.user_email)}
                isHost={isHost}
                onMuteAudio={() => onMuteAudio?.(participant)}
                onEndCamera={() => onEndCamera?.(participant)}
                onRemove={() => onRemoveFromPanel?.(participant)}
              />
            ))}
            
            {/* Empty slots */}
            {allParticipants.length < maxParticipants && (
              Array(Math.min(maxParticipants - allParticipants.length, 3)).fill(null).map((_, i) => (
                <EmptySlot key={`empty-${i}`} onJoin={() => onInviteToPanel?.()} />
              ))
            )}
          </div>
        )}
      </div>

      {/* Control Bar - Discord style */}
      <div className="h-14 bg-[#232428] flex items-center justify-center gap-2 px-4">
        {/* Mute */}
        <ControlButton
          active={!isSelfMuted}
          activeIcon={<Mic className="w-5 h-5" />}
          inactiveIcon={<MicOff className="w-5 h-5" />}
          onClick={() => setIsSelfMuted(!isSelfMuted)}
          danger={isSelfMuted}
          tooltip={isSelfMuted ? 'Unmute' : 'Mute'}
        />

        {/* Deafen */}
        <ControlButton
          active={!isDeafened}
          activeIcon={<Headphones className="w-5 h-5" />}
          inactiveIcon={<VolumeX className="w-5 h-5" />}
          onClick={() => setIsDeafened(!isDeafened)}
          danger={isDeafened}
          tooltip={isDeafened ? 'Undeafen' : 'Deafen'}
        />

        {/* Video */}
        <ControlButton
          active={!isSelfVideoOff}
          activeIcon={<Video className="w-5 h-5" />}
          inactiveIcon={<VideoOff className="w-5 h-5" />}
          onClick={() => setIsSelfVideoOff(!isSelfVideoOff)}
          danger={isSelfVideoOff}
          tooltip={isSelfVideoOff ? 'Turn on camera' : 'Turn off camera'}
        />

        {/* Screen Share */}
        <ControlButton
          active={false}
          activeIcon={<Monitor className="w-5 h-5" />}
          inactiveIcon={<Monitor className="w-5 h-5" />}
          onClick={() => {}}
          tooltip="Share Screen"
        />

        {/* Raise Hand */}
        <ControlButton
          active={raisedHands.has(currentUser?.email)}
          activeIcon={<Hand className="w-5 h-5" />}
          inactiveIcon={<Hand className="w-5 h-5" />}
          onClick={handleRaiseHand}
          highlight={raisedHands.has(currentUser?.email)}
          tooltip="Raise Hand"
        />

        <div className="w-px h-8 bg-white/10 mx-2" />

        {/* Chat Toggle */}
        <ControlButton
          active={showChat}
          activeIcon={<MessageSquare className="w-5 h-5" />}
          inactiveIcon={<MessageSquare className="w-5 h-5" />}
          onClick={() => setShowChat(!showChat)}
          tooltip="Toggle Chat"
        />

        {/* Leave Call */}
        <motion.button
          onClick={onLeaveCall}
          className="ml-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium text-sm flex items-center gap-2"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <PhoneOff className="w-4 h-4" />
          Leave
        </motion.button>
      </div>
    </div>
  );
}

function ControlButton({ active, activeIcon, inactiveIcon, onClick, danger, highlight, tooltip }) {
  return (
    <motion.button
      onClick={onClick}
      className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
        danger 
          ? 'bg-red-600/80 text-white hover:bg-red-600' 
          : highlight
            ? 'bg-amber-600 text-white hover:bg-amber-700'
            : active
              ? 'bg-[#404249] text-white hover:bg-[#4a4c52]'
              : 'bg-[#2b2d31] text-white/60 hover:bg-[#404249] hover:text-white'
      }`}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      title={tooltip}
    >
      {active ? activeIcon : inactiveIcon}
    </motion.button>
  );
}

function ParticipantTile({ 
  participant, 
  isCurrentUser, 
  isFocused, 
  onFocus, 
  hasRaisedHand,
  isHost,
  onMuteAudio,
  onEndCamera,
  onRemove
}) {
  const videoRef = useRef(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    if (isCurrentUser && !localStream) {
      initCamera();
    }
    return () => {
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCurrentUser]);

  const initCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 },
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

  return (
    <motion.div
      className={`relative bg-[#2b2d31] rounded-xl overflow-hidden group ${
        isFocused ? 'ring-2 ring-green-500' : ''
      } ${participant.isSpeaking ? 'ring-2 ring-green-400' : ''}`}
      onClick={onFocus}
      whileHover={{ scale: 1.01 }}
    >
      {/* Video */}
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
        <div className="w-full h-full bg-[#313338] flex items-center justify-center">
          <div className="w-20 h-20 rounded-full bg-[#5865f2] flex items-center justify-center text-3xl font-semibold text-white">
            {participant.avatar_url ? (
              <img src={participant.avatar_url} className="w-full h-full rounded-full object-cover" alt="" />
            ) : (
              participant.display_name?.[0]?.toUpperCase() || '?'
            )}
          </div>
        </div>
      )}

      {/* Name Overlay */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {participant.isHost && (
              <Crown className="w-3.5 h-3.5 text-amber-400" />
            )}
            {hasRaisedHand && (
              <motion.span
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
                className="text-sm"
              >
                ✋
              </motion.span>
            )}
            <span className="text-white text-xs font-medium truncate max-w-[100px]">
              {participant.display_name || 'Guest'}
              {isCurrentUser && ' (You)'}
            </span>
            {isMuted && <MicOff className="w-3 h-3 text-red-400 ml-1" />}
          </div>
        </div>
      </div>

      {/* Pin button */}
      <button
        onClick={(e) => { e.stopPropagation(); onFocus(); }}
        className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 text-white/70 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
      >
        <Pin className="w-3.5 h-3.5" />
      </button>

      {/* Host Controls */}
      {isHost && !participant.isHost && (
        <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="w-7 h-7 bg-black/50 rounded-full">
                <MoreVertical className="w-4 h-4 text-white" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1e1f22] border-[#2b2d31]">
              <DropdownMenuItem onClick={onMuteAudio} className="text-white/80 hover:text-white">
                <MicOff className="w-4 h-4 mr-2" />
                Mute
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEndCamera} className="text-white/80 hover:text-white">
                <VideoOff className="w-4 h-4 mr-2" />
                Turn off camera
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-[#2b2d31]" />
              <DropdownMenuItem onClick={onRemove} className="text-red-400 hover:text-red-300">
                <X className="w-4 h-4 mr-2" />
                Remove
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </motion.div>
  );
}

function FocusLayout({ focusedUser, participants, currentUser, onChangeFocus, raisedHands, isHost, onMuteAudio, onEndCamera, onRemoveFromPanel }) {
  const others = participants.filter(p => p.user_email !== focusedUser?.user_email);
  
  return (
    <div className="flex h-full gap-2">
      {/* Main focused video */}
      <div className="flex-1">
        <ParticipantTile
          participant={focusedUser}
          isCurrentUser={focusedUser?.user_email === currentUser?.email}
          isFocused={true}
          onFocus={() => {}}
          hasRaisedHand={raisedHands.has(focusedUser?.user_email)}
          isHost={isHost}
          onMuteAudio={() => onMuteAudio?.(focusedUser)}
          onEndCamera={() => onEndCamera?.(focusedUser)}
          onRemove={() => onRemoveFromPanel?.(focusedUser)}
        />
      </div>
      
      {/* Sidebar with others */}
      <div className="w-48 flex flex-col gap-2">
        {others.slice(0, 4).map((participant, index) => (
          <ParticipantTile
            key={participant.user_email || index}
            participant={participant}
            isCurrentUser={participant.user_email === currentUser?.email}
            isFocused={false}
            onFocus={() => onChangeFocus(participant)}
            hasRaisedHand={raisedHands.has(participant.user_email)}
            isHost={isHost}
            onMuteAudio={() => onMuteAudio?.(participant)}
            onEndCamera={() => onEndCamera?.(participant)}
            onRemove={() => onRemoveFromPanel?.(participant)}
          />
        ))}
      </div>
    </div>
  );
}

function EmptySlot({ onJoin }) {
  return (
    <motion.div 
      className="bg-[#2b2d31] rounded-xl flex items-center justify-center cursor-pointer hover:bg-[#313338] transition-colors border-2 border-dashed border-[#404249]"
      onClick={onJoin}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="text-center">
        <UserPlus className="w-8 h-8 text-[#5865f2] mx-auto mb-2" />
        <span className="text-white/50 text-sm">Join</span>
      </div>
    </motion.div>
  );
}