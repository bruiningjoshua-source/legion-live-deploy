import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Edit2,
  Eye,
  Radio
} from 'lucide-react';

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
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute top-0 left-0 right-0 z-40 flex justify-center pt-safe"
    >
      {/* Centered minimal bar */}
      <div className="flex items-center gap-2 px-3 py-2 mt-2">
        {/* Room Icon - clickable */}
        <Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
          <PopoverTrigger asChild>
            <button className="text-2xl hover:scale-110 transition-transform drop-shadow-lg">
              {roomIcon}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-64 bg-stone-900/95 backdrop-blur-md border-amber-600/30 p-3" align="center">
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

        {/* Title - inline editable */}
        {isEditingTitle ? (
          <Input
            ref={inputRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleSaveTitle}
            autoFocus
            className="bg-black/40 backdrop-blur-sm border-white/20 text-white text-sm h-7 w-48 text-center rounded-full px-3"
            maxLength={60}
            placeholder="Stream title..."
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="flex items-center gap-1.5 group"
          >
            <span className="text-white font-medium text-sm drop-shadow-lg max-w-[180px] truncate">
              {stream?.title || 'Tap to add title'}
            </span>
            <Edit2 className="w-3 h-3 text-white/40 group-hover:text-white/80 transition-colors" />
          </button>
        )}

        {/* Live indicator + viewers */}
        <div className="flex items-center gap-1.5 ml-1">
          <Badge className="bg-red-500/80 text-white border-0 text-xs h-5 px-1.5 backdrop-blur-sm">
            <Radio className="w-2 h-2 mr-0.5 animate-pulse" />
            LIVE
          </Badge>
          <span className="text-white/70 text-xs flex items-center gap-0.5 drop-shadow-lg">
            <Eye className="w-3 h-3" />
            {viewerCount.toLocaleString()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}