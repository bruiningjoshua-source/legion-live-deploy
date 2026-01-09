import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Edit2,
  Eye,
  Radio,
  Upload,
  Palette,
  ImageIcon,
  Sparkles
} from 'lucide-react';
import { base44 } from '@/api/base44Client';

const roomIcons = ['🏛️', '🎮', '🎵', '🎙️', '💃', '👨‍🍳', '💪', '📚', '🎨', '😂', '🔥', '⚡', '🌟', '👑', '🎭', '🎪', '🎯', '🚀', '💎', '🦁'];

const titleThemes = [
  { id: 'minimal', name: 'Minimal', bg: 'transparent', text: 'text-white', border: 'border-transparent' },
  { id: 'glass', name: 'Glass', bg: 'bg-black/30 backdrop-blur-md', text: 'text-white', border: 'border-white/10' },
  { id: 'gold', name: 'Gold', bg: 'bg-gradient-to-r from-amber-900/60 to-yellow-800/60', text: 'text-amber-100', border: 'border-amber-500/30' },
  { id: 'fire', name: 'Fire', bg: 'bg-gradient-to-r from-red-900/60 to-orange-800/60', text: 'text-orange-100', border: 'border-orange-500/30' },
  { id: 'ocean', name: 'Ocean', bg: 'bg-gradient-to-r from-blue-900/60 to-cyan-800/60', text: 'text-cyan-100', border: 'border-cyan-500/30' },
  { id: 'neon', name: 'Neon', bg: 'bg-gradient-to-r from-purple-900/60 to-pink-800/60', text: 'text-pink-100', border: 'border-pink-500/30' },
  { id: 'forest', name: 'Forest', bg: 'bg-gradient-to-r from-green-900/60 to-emerald-800/60', text: 'text-emerald-100', border: 'border-emerald-500/30' },
  { id: 'midnight', name: 'Midnight', bg: 'bg-gradient-to-r from-slate-900/80 to-indigo-900/80', text: 'text-indigo-100', border: 'border-indigo-500/30' },
];

const titlePatterns = [
  { id: 'none', name: 'None', style: {} },
  { id: 'dots', name: 'Dots', style: { backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '8px 8px' } },
  { id: 'lines', name: 'Lines', style: { backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 5px, rgba(255,255,255,0.05) 5px, rgba(255,255,255,0.05) 10px)' } },
  { id: 'grid', name: 'Grid', style: { backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '10px 10px' } },
];

export default function BroadcasterTopBar({ 
  stream, 
  viewerCount = 0,
  onUpdateStream 
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(stream?.title || '');
  const [roomIcon, setRoomIcon] = useState(stream?.room_icon || '🏛️');
  const [roomImage, setRoomImage] = useState(stream?.room_image || null);
  const [titleTheme, setTitleTheme] = useState(stream?.title_theme || 'glass');
  const [titlePattern, setTitlePattern] = useState(stream?.title_pattern || 'none');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const currentTheme = titleThemes.find(t => t.id === titleTheme) || titleThemes[1];
  const currentPattern = titlePatterns.find(p => p.id === titlePattern) || titlePatterns[0];

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setRoomImage(result.file_url);
      await onUpdateStream?.({ room_image: result.file_url });
    } catch (error) {
      console.error('Upload failed:', error);
    }
    setIsUploading(false);
  };

  const handleRemoveImage = async () => {
    setRoomImage(null);
    await onUpdateStream?.({ room_image: null });
  };

  const handleThemeSelect = async (themeId) => {
    setTitleTheme(themeId);
    await onUpdateStream?.({ title_theme: themeId });
  };

  const handlePatternSelect = async (patternId) => {
    setTitlePattern(patternId);
    await onUpdateStream?.({ title_pattern: patternId });
  };

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
      {/* Styled title bar */}
      <motion.div 
        className={`flex items-center gap-3 px-4 py-2 mt-3 rounded-2xl border ${currentTheme.bg} ${currentTheme.border}`}
        style={currentPattern.style}
        layout
      >
        {/* Room Icon/Image - clickable */}
        <Popover open={showIconPicker} onOpenChange={setShowIconPicker}>
          <PopoverTrigger asChild>
            <button className="relative w-10 h-10 rounded-xl overflow-hidden hover:scale-105 transition-transform flex-shrink-0 ring-2 ring-white/20">
              {roomImage ? (
                <img src={roomImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl bg-black/30">
                  {roomIcon}
                </div>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 bg-stone-900/95 backdrop-blur-md border-amber-600/30 p-0" align="center">
            <Tabs defaultValue="icons" className="w-full">
              <TabsList className="w-full bg-stone-800/50 rounded-none border-b border-amber-600/20">
                <TabsTrigger value="icons" className="flex-1 text-xs data-[state=active]:bg-amber-600/20">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Icons
                </TabsTrigger>
                <TabsTrigger value="upload" className="flex-1 text-xs data-[state=active]:bg-amber-600/20">
                  <Upload className="w-3 h-3 mr-1" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="style" className="flex-1 text-xs data-[state=active]:bg-amber-600/20">
                  <Palette className="w-3 h-3 mr-1" />
                  Style
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="icons" className="p-3 mt-0">
                <div className="grid grid-cols-5 gap-2">
                  {roomIcons.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => handleIconSelect(icon)}
                      className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl hover:bg-amber-600/30 transition-colors ${
                        roomIcon === icon && !roomImage ? 'bg-amber-600/40 ring-2 ring-amber-500' : 'bg-stone-800'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </TabsContent>
              
              <TabsContent value="upload" className="p-3 mt-0">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                {roomImage ? (
                  <div className="space-y-3">
                    <div className="relative w-20 h-20 mx-auto rounded-xl overflow-hidden">
                      <img src={roomImage} alt="" className="w-full h-full object-cover" />
                    </div>
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 rounded-lg text-xs text-white"
                      >
                        Change
                      </button>
                      <button
                        onClick={handleRemoveImage}
                        className="px-3 py-1.5 bg-stone-700 hover:bg-stone-600 rounded-lg text-xs text-white"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full py-6 border-2 border-dashed border-amber-600/30 rounded-xl hover:border-amber-500/50 transition-colors flex flex-col items-center gap-2"
                  >
                    {isUploading ? (
                      <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <ImageIcon className="w-8 h-8 text-amber-400/50" />
                        <span className="text-amber-200/70 text-xs">Upload room picture</span>
                      </>
                    )}
                  </button>
                )}
              </TabsContent>
              
              <TabsContent value="style" className="p-3 mt-0 space-y-3">
                <div>
                  <p className="text-amber-200/70 text-xs mb-2">Theme</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {titleThemes.map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => handleThemeSelect(theme.id)}
                        className={`p-2 rounded-lg text-xs ${theme.bg} border ${theme.border} ${theme.text} ${
                          titleTheme === theme.id ? 'ring-2 ring-amber-500' : ''
                        }`}
                      >
                        {theme.name}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-amber-200/70 text-xs mb-2">Pattern</p>
                  <div className="grid grid-cols-4 gap-1.5">
                    {titlePatterns.map((pattern) => (
                      <button
                        key={pattern.id}
                        onClick={() => handlePatternSelect(pattern.id)}
                        className={`p-2 rounded-lg text-xs bg-stone-800 text-white ${
                          titlePattern === pattern.id ? 'ring-2 ring-amber-500' : ''
                        }`}
                        style={pattern.style}
                      >
                        {pattern.name}
                      </button>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
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
            className={`bg-black/20 border-white/20 ${currentTheme.text} text-sm h-7 w-44 text-center rounded-full px-3`}
            maxLength={60}
            placeholder="Stream title..."
          />
        ) : (
          <button
            onClick={() => setIsEditingTitle(true)}
            className="flex items-center gap-1.5 group"
          >
            <span className={`${currentTheme.text} font-semibold text-sm drop-shadow-lg max-w-[160px] truncate`}>
              {stream?.title || 'Tap to add title'}
            </span>
            <Edit2 className="w-3 h-3 text-white/40 group-hover:text-white/80 transition-colors" />
          </button>
        )}

        {/* Live indicator + viewers */}
        <div className="flex items-center gap-2">
          <Badge className="bg-red-500 text-white border-0 text-xs h-5 px-2">
            <Radio className="w-2 h-2 mr-1 animate-pulse" />
            LIVE
          </Badge>
          <span className={`${currentTheme.text} text-xs flex items-center gap-1 opacity-80`}>
            <Eye className="w-3 h-3" />
            {viewerCount.toLocaleString()}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
}