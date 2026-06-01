import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { X, Loader2, ImagePlus, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const TABS = ['Theme', 'Layout', 'Background', 'Mic Decor', 'Voice Waves'];

const THEME_PRESETS = [
  { id: 'default',  label: 'Default',        color: 'from-purple-400 to-purple-600' },
  { id: 'neon',     label: 'Neon Night',      color: 'from-cyan-400 to-blue-600' },
  { id: 'sunset',   label: 'Sunset',          color: 'from-orange-400 to-rose-500' },
  { id: 'nature',   label: 'Nature',          color: 'from-green-400 to-emerald-600' },
  { id: 'galaxy',   label: 'Galaxy',          color: 'from-indigo-400 to-purple-700' },
  { id: 'gold',     label: 'Gold',            color: 'from-amber-400 to-yellow-600' },
];

const LAYOUT_OPTIONS = [
  { id: '2x2', label: '2×2', slots: 4 },
  { id: '2x3', label: '2×3', slots: 6 },
];

const BG_PRESETS = [
  { id: 'aurora',  label: 'Aurora',  url: 'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?w=200' },
  { id: 'city',    label: 'City',    url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?w=200' },
  { id: 'ocean',   label: 'Ocean',   url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=200' },
  { id: 'forest',  label: 'Forest',  url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=200' },
];

export default function ThemePanel({ activeTheme, onThemeChange, onClose }) {
  const [tab, setTab] = useState('Theme');
  const [uploading, setUploading] = useState(false);
  const [customBgs, setCustomBgs] = useState(() => {
    const saved = localStorage.getItem('ll_custom_backgrounds');
    return saved ? JSON.parse(saved) : [];
  });
  const [selectedBg, setSelectedBg] = useState(null);
  const fileInputRef = useRef(null);

  const handleBgUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error('Image must be under 10MB'); return; }
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const newBg = { id: `custom_${Date.now()}`, label: file.name.split('.')[0], url: file_url };
    const updated = [newBg, ...customBgs];
    setCustomBgs(updated);
    localStorage.setItem('ll_custom_backgrounds', JSON.stringify(updated));
    setSelectedBg(newBg.id);
    onThemeChange?.({ type: 'background', value: file_url });
    toast.success('Background uploaded!');
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteCustomBg = (id) => {
    const updated = customBgs.filter(b => b.id !== id);
    setCustomBgs(updated);
    localStorage.setItem('ll_custom_backgrounds', JSON.stringify(updated));
    if (selectedBg === id) setSelectedBg(null);
  };

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="absolute bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl max-h-[55vh] flex flex-col"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-gray-300" />
      </div>

      <div className="flex items-center justify-between px-5 pb-2">
        <h3 className="text-black font-bold text-base">Room theme</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
          <X className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Tab strip */}
      <div className="flex gap-2 px-5 pb-3 overflow-x-auto scrollbar-hide">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${
              tab === t
                ? 'bg-black text-white border-black'
                : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {tab === 'Theme' && (
          <div className="grid grid-cols-2 gap-3">
            {THEME_PRESETS.map(theme => (
              <button
                key={theme.id}
                onClick={() => onThemeChange?.({ type: 'theme', value: theme.id })}
                className={`relative rounded-2xl overflow-hidden h-24 border-2 transition-all ${
                  activeTheme === theme.id ? 'border-cyan-400' : 'border-transparent'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${theme.color}`} />
                <span className="absolute bottom-2 left-3 text-white text-xs font-semibold drop-shadow">{theme.label}</span>
              </button>
            ))}
          </div>
        )}

        {tab === 'Layout' && (
          <div className="flex gap-4">
            {LAYOUT_OPTIONS.map(layout => (
              <button
                key={layout.id}
                className="w-28 h-28 rounded-2xl bg-gray-900 border-2 border-gray-700 flex flex-col items-center justify-center gap-1 hover:border-cyan-400 transition-all"
              >
                <div className={`grid ${layout.slots === 4 ? 'grid-cols-2' : 'grid-cols-2'} gap-1`}>
                  {Array.from({ length: Math.min(layout.slots, 4) }).map((_, i) => (
                    <div key={i} className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-400 text-xs">👤</span>
                    </div>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {tab === 'Background' && (
          <div className="space-y-4">
            {/* Upload button */}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
            
            {/* Custom uploads */}
            {customBgs.length > 0 && (
              <div>
                <p className="text-gray-500 text-xs font-semibold mb-2">My Uploads</p>
                <div className="grid grid-cols-4 gap-2">
                  {customBgs.map(bg => (
                    <div key={bg.id} className="relative group">
                      <button
                        onClick={() => { setSelectedBg(bg.id); onThemeChange?.({ type: 'background', value: bg.url }); }}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all w-full ${
                          selectedBg === bg.id ? 'border-cyan-400 ring-1 ring-cyan-400/30' : 'border-transparent hover:border-cyan-400'
                        }`}
                      >
                        <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />
                      </button>
                      <button
                        onClick={() => handleDeleteCustomBg(bg.id)}
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Common backgrounds */}
            <div>
              <p className="text-gray-500 text-xs font-semibold mb-2">Common</p>
              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="aspect-square rounded-xl bg-gray-100 border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-cyan-400 hover:text-cyan-500 transition-all"
                >
                  {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImagePlus className="w-5 h-5" />}
                  <span className="text-[9px] font-medium">{uploading ? 'Uploading' : 'Upload'}</span>
                </button>
                {BG_PRESETS.map(bg => (
                  <button
                    key={bg.id}
                    onClick={() => { setSelectedBg(bg.id); onThemeChange?.({ type: 'background', value: bg.url }); }}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selectedBg === bg.id ? 'border-cyan-400 ring-1 ring-cyan-400/30' : 'border-transparent hover:border-cyan-400'
                    }`}
                  >
                    <img src={bg.url} alt={bg.label} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === 'Mic Decor' && (
          <div className="grid grid-cols-4 gap-3">
            {['🎤', '🌀', '🪐', '💜'].map((icon, i) => (
              <button key={i} className="aspect-[3/4] rounded-xl bg-gray-900 border-2 border-gray-700 flex items-center justify-center text-2xl hover:border-cyan-400 transition-all">
                {icon}
              </button>
            ))}
          </div>
        )}

        {tab === 'Voice Waves' && (
          <div className="grid grid-cols-4 gap-3">
            {['🔵', '🟣', '🟢', '🔴', '🟠', '⚪', '🌊', '✨'].map((icon, i) => (
              <button key={i} className="aspect-square rounded-xl bg-gray-900 border-2 border-gray-700 flex items-center justify-center text-2xl hover:border-cyan-400 transition-all">
                {icon}
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}