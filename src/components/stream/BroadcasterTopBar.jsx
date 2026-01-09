import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Edit2, 
  Check, 
  X,
  Eye,
  Radio
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const roomIcons = ['🏛️', '🎮', '🎵', '🎙️', '💃', '👨‍🍳', '💪', '📚', '🎨', '😂', '🔥', '⚡', '🌟', '👑', '🎭', '🎪', '🎯', '🚀', '💎', '🦁'];

export default function BroadcasterTopBar({ 
  stream, 
  viewerCount = 0,
  onUpdateStream 
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(stream?.title || '');
  const [roomIcon, setRoomIcon] = useState(stream?.room_icon || '🏛️');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const inputRef = useRef(null);

  const handleSaveTitle = async () => {
    if (title.trim() && title !== stream?.title) {
      await onUpdateStream?.({ title: title.trim() });
    }
    setIsEditingTitle(false);
  };

  const handleIconSelect = async (icon) => {
    setRoomIcon(icon);
    setShowIconPicker(false);
    await onUpdateStream?.({ room_icon: icon });
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      setTitle(stream?.title || '');
      setIsEditingTitle(false);
    }
  };

  return (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-0 left-0 right-0 z-40 bg-gradient-to-b from-black/90 via-black/70 to-transparent"
    >
      <div className="flex items-center justify-between px-4 py-3 pt-safe">
        {/* Left: Room Icon + Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0">
          {/* Editable Room Icon */}
          <Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
            <PopoverTrigger asChild>
              <button className="w-12 h-12 rounded-xl bg-amber-600/20 border border-amber-500/40 flex items-center justify-center text-2xl hover:bg-amber-600/30 transition-colors flex-shrink-0">
                {roomIcon}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 bg-stone-900 border-amber-600/30 p-3" align="start">
              <p className="text-amber-200 text-xs font-semibold mb-2">Choose Room Icon</p>
              <div className="grid grid-cols-5 gap-2">
                {roomIcons.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => handleIconSelect(icon)}
                    className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-amber-600/30 transition-colors ${
                      roomIcon === icon ? 'bg-amber-600/40 ring-2 ring-amber-500' : 'bg-stone-800'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Editable Title */}
          <div className="flex-1 min-w-0">
            {isEditingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  ref={inputRef}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveTitle}
                  autoFocus
                  className="bg-stone-800/80 border-amber-500/40 text-white text-sm h-8 flex-1"
                  maxLength={100}
                  placeholder="Stream title..."
                />
                <Button
                  size="icon"
                  onClick={handleSaveTitle}
                  className="h-8 w-8 bg-green-600 hover:bg-green-700"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    setTitle(stream?.title || '');
                    setIsEditingTitle(false);
                  }}
                  className="h-8 w-8 text-amber-400 hover:bg-stone-800"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingTitle(true)}
                className="flex items-center gap-2 group text-left w-full"
              >
                <span className="text-white font-semibold text-sm truncate">
                  {stream?.title || 'Untitled Stream'}
                </span>
                <Edit2 className="w-3 h-3 text-amber-400/60 group-hover:text-amber-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            )}
            
            {/* Live Badge + Viewers - below title */}
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-red-500 text-white border-0 text-xs h-5 px-2">
                <Radio className="w-2.5 h-2.5 mr-1 animate-pulse" />
                LIVE
              </Badge>
              <span className="text-white/70 text-xs flex items-center gap-1">
                <Eye className="w-3 h-3" />
                {viewerCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}