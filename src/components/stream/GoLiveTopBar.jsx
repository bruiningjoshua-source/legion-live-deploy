import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { 
  X, ChevronDown, Check, Edit2, Tag 
} from 'lucide-react';

const CATEGORIES = [
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'talk_show', label: 'Chat', icon: '💬' },
  { value: 'dance', label: 'Dance', icon: '💃' },
  { value: 'cooking', label: 'Cooking', icon: '🍳' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'art', label: 'Art', icon: '🎨' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'other', label: 'Other', icon: '✨' }
];

export default function GoLiveTopBar({ 
  title, onTitleChange, 
  category, onCategoryChange, 
  onClose 
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);
  const inputRef = useRef(null);

  const selectedCat = CATEGORIES.find(c => c.value === category);

  const handleTitleSave = () => {
    onTitleChange(localTitle);
    setEditingTitle(false);
  };

  return (
    <>
      {/* Top-left stream info bar */}
      <div className="absolute top-0 left-0 right-0 z-20" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <div className="flex items-start justify-between px-3">
          {/* Left: Stream info + menu toggle */}
          <div className="flex-1 max-w-[75%]">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="flex items-center gap-2 bg-black/60 backdrop-blur-xl rounded-2xl px-3 py-2.5 border border-white/10 w-full"
            >
              <div className="flex-1 text-left min-w-0">
                {/* Title row */}
                <div className="flex items-center gap-1.5">
                  <p className="text-white text-sm font-semibold truncate">
                    {title || 'Add a stream title...'}
                  </p>
                  <ChevronDown className={`w-3.5 h-3.5 text-white/40 shrink-0 transition-transform ${showMenu ? 'rotate-180' : ''}`} />
                </div>
                {/* Category tag */}
                {selectedCat && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[11px]">{selectedCat.icon}</span>
                    <span className="text-white/50 text-[11px]">{selectedCat.label}</span>
                  </div>
                )}
                {!selectedCat && (
                  <span className="text-white/30 text-[11px]">Tap to set category</span>
                )}
              </div>
            </button>
          </div>

          {/* Right: Close button */}
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-xl flex items-center justify-center text-white border border-white/10 ml-2 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Dropdown menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-30"
              onClick={() => setShowMenu(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ type: 'spring', damping: 25, stiffness: 400 }}
              className="absolute left-3 right-14 z-40 bg-black/95 backdrop-blur-2xl rounded-2xl border border-white/15 overflow-hidden shadow-2xl"
              style={{ top: 'calc(max(12px, env(safe-area-inset-top)) + 56px)' }}
            >
              {/* Title edit section */}
              <div className="p-3 border-b border-white/10">
                <label className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-1.5 block">Stream Title</label>
                {editingTitle ? (
                  <div className="flex items-center gap-2">
                    <Input
                      ref={inputRef}
                      value={localTitle}
                      onChange={(e) => setLocalTitle(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                      autoFocus
                      placeholder="Enter your stream title..."
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/30 h-10 rounded-xl text-sm focus-visible:ring-amber-500/50"
                      maxLength={100}
                    />
                    <button onClick={handleTitleSave} className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                      <Check className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setLocalTitle(title); setEditingTitle(true); }}
                    className="w-full flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2.5 text-left hover:bg-white/10 transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-white/40 shrink-0" />
                    <span className={`text-sm truncate ${title ? 'text-white' : 'text-white/30'}`}>
                      {title || 'Tap to add title...'}
                    </span>
                  </button>
                )}
              </div>

              {/* Category grid */}
              <div className="p-3">
                <label className="text-white/40 text-[11px] font-medium uppercase tracking-wider mb-2 block flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Category
                </label>
                <div className="grid grid-cols-5 gap-1.5">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      onClick={() => {
                        onCategoryChange(cat.value);
                        // Don't close menu — let user also edit title
                      }}
                      className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl transition-all ${
                        category === cat.value
                          ? 'bg-amber-500/20 border border-amber-500/50 ring-1 ring-amber-500/30'
                          : 'bg-white/5 border border-transparent hover:bg-white/10'
                      }`}
                    >
                      <span className="text-lg">{cat.icon}</span>
                      <span className={`text-[10px] leading-tight ${category === cat.value ? 'text-amber-300 font-medium' : 'text-white/50'}`}>
                        {cat.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Done button */}
              <div className="p-3 pt-0">
                <button
                  onClick={() => setShowMenu(false)}
                  className="w-full py-2.5 rounded-xl bg-white/10 text-white/70 text-sm font-medium hover:bg-white/15 transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}