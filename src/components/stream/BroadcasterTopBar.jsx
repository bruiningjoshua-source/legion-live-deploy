import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit2, Eye, Radio, Check } from 'lucide-react';

export default function BroadcasterTopBar({ 
  stream, 
  viewerCount = 0,
  onUpdateStream 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(stream?.title || '');
  const inputRef = useRef(null);

  const handleSave = async () => {
    if (title.trim() && title !== stream?.title) {
      await onUpdateStream?.({ title: title.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setTitle(stream?.title || ''); setIsEditing(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2"
    >
      {/* LIVE badge + viewer count */}
      <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-md rounded-full px-2.5 py-1.5 border border-white/10">
        <Badge className="bg-red-500 text-white border-0 text-[10px] h-4 px-1.5 rounded-full flex items-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          LIVE
        </Badge>
        <div className="w-px h-3.5 bg-white/20" />
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3 text-white/60" />
          <span className="text-white text-xs font-medium">{viewerCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Editable title */}
      <div className="bg-black/60 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 flex items-center gap-1.5 max-w-[200px]">
        {isEditing ? (
          <>
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              className="bg-transparent border-0 text-white text-xs h-5 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-32"
              maxLength={60}
            />
            <button onClick={handleSave} className="text-green-400 hover:text-green-300">
              <Check className="w-3 h-3" />
            </button>
          </>
        ) : (
          <button 
            onClick={() => { setIsEditing(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="flex items-center gap-1.5 text-left"
          >
            <span className="text-white/80 text-xs truncate max-w-[150px]">{stream?.title || 'Untitled'}</span>
            <Edit2 className="w-2.5 h-2.5 text-white/40 shrink-0" />
          </button>
        )}
      </div>
    </motion.div>
  );
}