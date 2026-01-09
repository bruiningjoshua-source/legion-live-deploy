import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Settings, 
  ChevronRight,
  ChevronLeft,
  Type,
  Tag,
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  X
} from 'lucide-react';

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

export default function BroadcasterDashboard({ 
  stream, 
  onUpdateStream,
  isExpanded,
  onToggleExpand,
  onClose
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState(stream?.title || '');
  const [description, setDescription] = useState(stream?.description || '');
  const [category, setCategory] = useState(stream?.category || '');
  const [tags, setTags] = useState(stream?.tags || []);
  const [newTag, setNewTag] = useState('');

  const handleSave = () => {
    onUpdateStream?.({
      title,
      description,
      category,
      tags
    });
  };

  const addTag = () => {
    if (newTag && !tags.includes(newTag) && tags.length < 5) {
      setTags([...tags, newTag]);
      setNewTag('');
    }
  };

  const removeTag = (tag) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Collapsed button
  if (!isOpen && !isExpanded) {
    return (
      <motion.button
        initial={{ x: -50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        onClick={() => setIsOpen(true)}
        className="absolute top-20 left-4 z-30 bg-black/70 backdrop-blur-md border border-amber-500/30 rounded-full p-3 flex items-center gap-2 hover:bg-black/80 transition-colors"
      >
        <Settings className="w-5 h-5 text-amber-400" />
        <ChevronRight className="w-4 h-4 text-amber-400" />
      </motion.button>
    );
  }

  // Expanded separate window
  if (isExpanded) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="fixed inset-4 md:inset-10 z-[60] bg-stone-900/98 backdrop-blur-xl border border-amber-500/30 rounded-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-amber-500/20">
          <h2 className="text-amber-100 font-bold flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            Stream Dashboard
          </h2>
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={onToggleExpand}
              className="text-amber-400 hover:bg-amber-800/20"
            >
              <Minimize2 className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={onClose}
              className="text-amber-400 hover:bg-amber-800/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-2xl mx-auto space-y-6">
            <DashboardContent
              title={title}
              setTitle={setTitle}
              description={description}
              setDescription={setDescription}
              category={category}
              setCategory={setCategory}
              tags={tags}
              newTag={newTag}
              setNewTag={setNewTag}
              addTag={addTag}
              removeTag={removeTag}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-amber-500/20">
          <Button onClick={handleSave} className="w-full bg-amber-600 hover:bg-amber-700">
            Save Changes
          </Button>
        </div>
      </motion.div>
    );
  }

  // Inline panel
  return (
    <motion.div
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: -300, opacity: 0 }}
      className="absolute top-20 left-4 z-30 w-72 bg-black/80 backdrop-blur-md border border-amber-500/30 rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-amber-500/20">
        <span className="text-amber-100 font-semibold text-sm flex items-center gap-2">
          <Settings className="w-4 h-4 text-amber-400" />
          Stream Settings
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={onToggleExpand}
            className="p-1.5 text-amber-400 hover:bg-amber-800/20 rounded"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 text-amber-400 hover:bg-amber-800/20 rounded"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-4 max-h-[60vh] overflow-y-auto">
        <DashboardContent
          title={title}
          setTitle={setTitle}
          description={description}
          setDescription={setDescription}
          category={category}
          setCategory={setCategory}
          tags={tags}
          newTag={newTag}
          setNewTag={setNewTag}
          addTag={addTag}
          removeTag={removeTag}
          compact
        />
        <Button onClick={handleSave} className="w-full bg-amber-600 hover:bg-amber-700 text-sm h-8">
          Save
        </Button>
      </div>
    </motion.div>
  );
}

function DashboardContent({
  title, setTitle,
  description, setDescription,
  category, setCategory,
  tags, newTag, setNewTag, addTag, removeTag,
  compact = false
}) {
  return (
    <>
      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-amber-200 text-xs flex items-center gap-1.5">
          <Type className="w-3 h-3" />
          Stream Title
        </Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter stream title..."
          className={`bg-stone-800/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40 ${compact ? 'h-8 text-sm' : ''}`}
          maxLength={100}
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label className="text-amber-200 text-xs">Category</Label>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className={`bg-stone-800/50 border-amber-600/20 text-amber-100 ${compact ? 'h-8 text-sm' : ''}`}>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent className="bg-stone-900 border-amber-600/30">
            {categories.map(cat => (
              <SelectItem key={cat.value} value={cat.value} className="text-amber-100">
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
      {!compact && (
        <div className="space-y-1.5">
          <Label className="text-amber-200 text-xs">Description</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe your stream..."
            className="bg-stone-800/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40 min-h-[80px]"
            maxLength={500}
          />
        </div>
      )}

      {/* Tags */}
      <div className="space-y-1.5">
        <Label className="text-amber-200 text-xs flex items-center gap-1.5">
          <Tag className="w-3 h-3" />
          Tags ({tags.length}/5)
        </Label>
        <div className="flex gap-2">
          <Input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add tag..."
            className={`bg-stone-800/50 border-amber-600/20 text-amber-100 flex-1 ${compact ? 'h-8 text-sm' : ''}`}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
          />
          <Button onClick={addTag} disabled={!newTag || tags.length >= 5} size={compact ? 'sm' : 'default'} className="bg-amber-600 hover:bg-amber-700">
            +
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tags.map(tag => (
              <Badge key={tag} className="bg-amber-600/20 text-amber-200 border-amber-500/30 text-xs">
                {tag}
                <button onClick={() => removeTag(tag)} className="ml-1 hover:text-white">×</button>
              </Badge>
            ))}
          </div>
        )}
      </div>
    </>
  );
}