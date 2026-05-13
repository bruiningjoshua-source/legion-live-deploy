import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Ban } from 'lucide-react';

const BEAUTY_TABS = ['Presets', 'Beauty', 'Make up', 'Filter'];

const MASK_CATEGORIES = ['Favorites', 'Hot', 'AI', 'Accessory', 'Love'];
const BG_CATEGORIES = ['Custom', 'Daily', 'Blur', 'Love'];

const MAKEUP_PRESETS = [
  { id: 'sakura',  label: 'Sakura Sheer',  img: '🌸' },
  { id: 'glow',    label: 'Sakura Glow',   img: '✨' },
  { id: 'star',    label: 'Lucky Star',     img: '⭐' },
  { id: 'noah',    label: 'Noah',           img: '🧔' },
  { id: 'chloe',   label: 'Chloe',          img: '👩' },
];

const FILTER_PRESETS = [
  { id: 'natural',  label: 'Natural' },
  { id: 'warm',     label: 'Warm' },
  { id: 'cool',     label: 'Cool' },
  { id: 'vintage',  label: 'Vintage' },
  { id: 'vivid',    label: 'Vivid' },
  { id: 'soft',     label: 'Soft' },
];

export default function BeautyPanel({ onClose, onApply }) {
  const [mainTab, setMainTab] = useState('Make up');
  const [maskCat, setMaskCat] = useState('Hot');
  const [bgCat, setBgCat] = useState('Daily');
  const [subView, setSubView] = useState('Mask'); // 'Mask' or 'Background' for Presets tab

  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 30, stiffness: 400 }}
      className="absolute bottom-0 left-0 right-0 z-50 bg-[#1a1a2e] rounded-t-3xl max-h-[50vh] flex flex-col"
      style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-white/20" />
      </div>

      {/* Main tabs */}
      <div className="flex items-center gap-4 px-5 pb-3">
        {BEAUTY_TABS.map(t => (
          <button
            key={t}
            onClick={() => setMainTab(t)}
            className={`text-sm font-semibold transition-colors pb-1 ${
              mainTab === t
                ? 'text-white border-b-2 border-white'
                : 'text-white/40'
            }`}
          >
            {t === 'Presets' ? '✦ Presets' : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-4">
        {mainTab === 'Presets' && (
          <div>
            {/* Sub-tabs: Mask | Background */}
            <div className="flex gap-4 mb-3">
              {['Mask', 'Background'].map(sv => (
                <button
                  key={sv}
                  onClick={() => setSubView(sv)}
                  className={`text-sm font-semibold pb-1 transition-colors ${
                    subView === sv ? 'text-white border-b-2 border-white' : 'text-white/40'
                  }`}
                >
                  {sv}
                </button>
              ))}
            </div>

            {subView === 'Mask' && (
              <>
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                  <button className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Ban className="w-4 h-4 text-white/40" />
                  </button>
                  {MASK_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setMaskCat(cat)}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        maskCat === cat ? 'text-white border-b-2 border-white' : 'text-white/40'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <button key={i} onClick={() => onApply?.({ type: 'mask', index: i })} className="aspect-square rounded-xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-2xl hover:border-purple-400 transition-all">
                      {['😺', '🐰', '🦊', '🌸', '👑', '🎭', '💫', '🦋'][i]}
                    </button>
                  ))}
                </div>
              </>
            )}

            {subView === 'Background' && (
              <>
                <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
                  <button className="shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                    <Ban className="w-4 h-4 text-white/40" />
                  </button>
                  {BG_CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setBgCat(cat)}
                      className={`shrink-0 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                        bgCat === cat ? 'text-white border-b-2 border-white' : 'text-white/40'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <button key={i} onClick={() => onApply?.({ type: 'bg', index: i })} className="aspect-[3/4] rounded-xl bg-white/[0.06] border border-white/[0.08] overflow-hidden hover:border-purple-400 transition-all">
                      <div className="w-full h-full bg-gradient-to-br from-purple-900/50 to-blue-900/50 flex items-center justify-center">
                        <span className="text-white/20 text-xs">BG {i + 1}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {mainTab === 'Beauty' && (
          <div className="space-y-4">
            {['Smooth', 'Brighten', 'Slim Face', 'Big Eyes'].map(name => (
              <div key={name} className="flex items-center gap-3">
                <span className="text-white/60 text-sm w-20">{name}</span>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" style={{ width: '60%' }} />
                </div>
                <span className="text-white/40 text-xs w-8 text-right">60</span>
              </div>
            ))}
          </div>
        )}

        {mainTab === 'Make up' && (
          <div>
            <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide">
              {['Favorites', 'New', 'Vogue', 'Ins style', 'Gorgeous'].map(cat => (
                <button key={cat} className="shrink-0 px-3 py-1 rounded-full text-xs font-medium text-white/40 hover:text-white transition-colors">
                  {cat}
                </button>
              ))}
            </div>
            <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
              {MAKEUP_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => onApply?.({ type: 'makeup', id: preset.id })}
                  className="shrink-0 flex flex-col items-center gap-1.5"
                >
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-2xl hover:border-purple-400 transition-all">
                    {preset.img}
                  </div>
                  <span className="text-white/50 text-[10px] max-w-16 truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {mainTab === 'Filter' && (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            <button className="shrink-0 flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.08] flex items-center justify-center">
                <Ban className="w-5 h-5 text-white/30" />
              </div>
              <span className="text-white/50 text-[10px]">None</span>
            </button>
            {FILTER_PRESETS.map(f => (
              <button
                key={f.id}
                onClick={() => onApply?.({ type: 'filter', id: f.id })}
                className="shrink-0 flex flex-col items-center gap-1.5"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-white/10 to-white/[0.03] border border-white/[0.08] flex items-center justify-center hover:border-purple-400 transition-all">
                  <span className="text-white/40 text-xs">{f.label.charAt(0)}</span>
                </div>
                <span className="text-white/50 text-[10px]">{f.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}