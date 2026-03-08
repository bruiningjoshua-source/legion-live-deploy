import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit2, Eye, Check, Camera, Image, X, Loader2, Radio } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

// ── Broadcaster Top Bar ───────────────────────────────────────────────────
// [● LIVE] [👁 count] | [Stream title — editable] | [📷 thumbnail upload]
// Title click → inline edit. Camera icon → file upload for stream thumbnail.
// ─────────────────────────────────────────────────────────────────────────

export default function BroadcasterTopBar({ stream, viewerCount = 0, onUpdateStream }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(stream?.title || '');
  const [uploadingThumb, setUploadingThumb] = useState(false);
  const [showThumbPicker, setShowThumbPicker] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(stream?.thumbnail_url || null);
  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const handleSave = async () => {
    if (title.trim() && title.trim() !== stream?.title) {
      await onUpdateStream?.({ title: title.trim() });
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') { setTitle(stream?.title || ''); setIsEditing(false); }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Image must be under 5MB'); return; }
    setUploadingThumb(true);
    setShowThumbPicker(false);
    try {
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await onUpdateStream?.({ thumbnail_url: file_url });
      toast.success('Stream thumbnail updated!');
    } catch (err) {
      toast.error('Thumbnail upload failed');
      setPreviewUrl(stream?.thumbnail_url || null);
    } finally {
      setUploadingThumb(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-2"
    >
      {/* LIVE badge + viewer count */}
      <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-full px-2.5 py-1.5 border border-white/10">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse block" />
          <span className="text-red-400 text-[10px] font-black tracking-widest">LIVE</span>
        </div>
        <div className="w-px h-3.5 bg-white/20" />
        <div className="flex items-center gap-1">
          <Eye className="w-3 h-3 text-white/50" />
          <span className="text-white text-xs font-semibold">{viewerCount.toLocaleString()}</span>
        </div>
      </div>

      {/* Editable title */}
      <div className="bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/10 flex items-center gap-1.5 max-w-[200px]">
        {isEditing ? (
          <>
            <Input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleSave}
              autoFocus
              className="bg-transparent border-0 text-white text-xs h-5 p-0 focus-visible:ring-0 focus-visible:ring-offset-0 w-28 min-w-0"
              maxLength={60}
            />
            <button onClick={handleSave} className="text-green-400 hover:text-green-300 shrink-0">
              <Check className="w-3 h-3" />
            </button>
          </>
        ) : (
          <button
            onClick={() => { setIsEditing(true); setTimeout(() => inputRef.current?.focus(), 50); }}
            className="flex items-center gap-1.5 text-left w-full"
          >
            <span className="text-white/80 text-xs truncate max-w-[140px]">{stream?.title || 'Untitled'}</span>
            <Edit2 className="w-2.5 h-2.5 text-white/40 shrink-0" />
          </button>
        )}
      </div>

      {/* Thumbnail upload button */}
      <div className="relative">
        <button
          onClick={() => setShowThumbPicker(!showThumbPicker)}
          className="w-9 h-9 bg-black/70 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:border-amber-500/40 transition-all"
          title="Update stream thumbnail"
        >
          {uploadingThumb ? (
            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
          ) : previewUrl ? (
            <div className="w-6 h-6 rounded-full overflow-hidden border border-amber-500/50">
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            </div>
          ) : (
            <Camera className="w-4 h-4" />
          )}
        </button>

        <AnimatePresence>
          {showThumbPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 4 }}
              className="absolute top-11 left-0 z-50 bg-black/95 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl p-3 w-56"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-white text-xs font-bold">Stream Thumbnail</p>
                <button onClick={() => setShowThumbPicker(false)}>
                  <X className="w-3.5 h-3.5 text-white/40" />
                </button>
              </div>

              {previewUrl && (
                <div className="rounded-xl overflow-hidden mb-2 aspect-video bg-black">
                  <img src={previewUrl} alt="Current thumbnail" className="w-full h-full object-cover" />
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailUpload}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-semibold transition-all"
              >
                <Image className="w-3.5 h-3.5" />
                Upload New Thumbnail
              </button>
              <p className="text-white/30 text-[10px] text-center mt-1.5">JPG/PNG · Max 5MB · 16:9 recommended</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}