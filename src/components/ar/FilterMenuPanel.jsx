/**
 * FilterMenuPanel — Professional filter browser UI with categories,
 * favorites, recents, search, intensity sliders, effect stacking,
 * gesture assignments, and preset management.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Star, Layers, Hand, Save, Trash2, X, Sparkles } from 'lucide-react';
import { ADVANCED_FILTERS, FILTER_CATEGORIES, getTrendingFilters, getFilterById } from './AdvancedFilters';
import EffectStack from './EffectStack';
import EffectBudget from '@/components/engine/EffectBudget';
import GestureRecognizer from './GestureRecognizer';

export default function FilterMenuPanel({ onClose }) {
  const [activeTab, setActiveTab] = useState('trending');
  const [searchQuery, setSearchQuery] = useState('');
  const [showGestureEditor, setShowGestureEditor] = useState(false);
  const [showPresetSave, setShowPresetSave] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [stackState, setStackState] = useState({ layers: EffectStack.getLayers(), particles: EffectStack.getActiveParticles() });

  // Sync with effect stack
  React.useEffect(() => {
    const unsub = EffectStack.onChange((state) => setStackState({ layers: state.layers, particles: state.particles }));
    return unsub;
  }, []);

  const activeLayers = stackState.layers;
  const activeParticles = stackState.particles;
  const budget = EffectBudget.getBudget();
  const usage = EffectBudget.getCurrentUsage();

  const tabs = useMemo(() => [
    { id: 'trending', label: '🔥 Trending' },
    { id: 'favorites', label: '⭐ Favorites' },
    { id: 'recents', label: '🕐 Recent' },
    ...FILTER_CATEGORIES.map(c => ({ id: c.id, label: c.label })),
    { id: 'presets', label: '💾 Presets' },
  ], []);

  const filteredFilters = useMemo(() => {
    let list;
    if (activeTab === 'trending') list = getTrendingFilters();
    else if (activeTab === 'favorites') list = EffectStack.getFavorites().map(id => getFilterById(id)).filter(Boolean);
    else if (activeTab === 'recents') list = EffectStack.getRecents().map(id => getFilterById(id)).filter(Boolean);
    else list = ADVANCED_FILTERS.filter(f => f.category === activeTab);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(f => f.name.toLowerCase().includes(q) || f.category.includes(q));
    }
    return list;
  }, [activeTab, searchQuery]);

  const toggleFilter = useCallback((filter) => {
    const isActive = activeLayers.find(l => l.id === filter.id) || activeParticles.find(p => p.id === filter.id);
    if (isActive) {
      if (filter.particleType) EffectStack.removeParticleEffect(filter.id);
      else EffectStack.removeLayer(filter.id);
    } else {
      if (filter.particleType) EffectStack.addParticleEffect(filter.id);
      else EffectStack.addLayer(filter.id);
    }
  }, [activeLayers, activeParticles]);

  const isFilterActive = useCallback((id) => {
    return activeLayers.some(l => l.id === id) || activeParticles.some(p => p.id === id);
  }, [activeLayers, activeParticles]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="absolute left-0 right-0 bottom-0 z-40 max-h-[65vh] bg-black/90 backdrop-blur-2xl border-t border-white/10 rounded-t-3xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-400" />
          <span className="text-white font-bold text-sm">AR Effects Studio</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Budget indicator */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/5 border border-white/10">
            <Layers className="w-3 h-3 text-purple-400" />
            <span className={`text-[10px] font-mono ${usage > budget * 0.8 ? 'text-red-400' : 'text-white/50'}`}>
              {usage}/{budget}
            </span>
          </div>
          <button onClick={() => setShowGestureEditor(v => !v)}
            className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center">
            <Hand className="w-3.5 h-3.5 text-white/50" />
          </button>
          <button onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-white/50" />
          </button>
        </div>
      </div>

      {/* Active effects strip */}
      {activeLayers.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2 overflow-x-auto scrollbar-hide border-b border-white/5">
          {activeLayers.map(layer => (
            <div key={layer.id} className="shrink-0 flex items-center gap-1 bg-purple-500/20 border border-purple-400/30 rounded-full px-2 py-0.5">
              <span className="text-[10px]">{layer.filter.emoji}</span>
              <span className="text-[9px] text-purple-300">{layer.filter.name}</span>
              <button onClick={() => EffectStack.removeLayer(layer.id)} className="text-white/30 hover:text-white text-[10px]">×</button>
            </div>
          ))}
          <button onClick={() => setShowPresetSave(true)}
            className="shrink-0 w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
            <Save className="w-3 h-3 text-white/30" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 border border-white/5">
          <Search className="w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search effects..."
            className="flex-1 bg-transparent text-white text-xs placeholder-white/20 focus:outline-none"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex overflow-x-auto scrollbar-hide px-3 pb-2 gap-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-semibold border transition-all ${
              activeTab === tab.id
                ? 'bg-purple-500/30 border-purple-400/40 text-purple-300'
                : 'border-white/5 text-white/30'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filter grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-4">
        {activeTab === 'presets' ? (
          <PresetList />
        ) : showGestureEditor ? (
          <GestureEditor onClose={() => setShowGestureEditor(false)} />
        ) : (
          <div className="grid grid-cols-4 gap-2">
            {filteredFilters.map(filter => (
              <FilterCard
                key={filter.id}
                filter={filter}
                isActive={isFilterActive(filter.id)}
                isFavorite={EffectStack.isFavorite(filter.id)}
                onToggle={() => toggleFilter(filter)}
                onFavorite={() => EffectStack.toggleFavorite(filter.id)}
              />
            ))}
            {filteredFilters.length === 0 && (
              <p className="col-span-4 text-center text-white/20 text-xs py-8">No effects found</p>
            )}
          </div>
        )}
      </div>

      {/* Intensity slider for active layers */}
      {activeLayers.length > 0 && (
        <div className="px-4 py-2 border-t border-white/5 space-y-1">
          {activeLayers.slice(-2).map(layer => (
            <div key={layer.id} className="flex items-center gap-2">
              <span className="text-[9px] text-white/40 w-16 truncate">{layer.filter.name}</span>
              <input type="range" min={0} max={100} value={layer.intensity}
                onChange={e => EffectStack.setLayerIntensity(layer.id, Number(e.target.value))}
                className="flex-1 accent-purple-500 h-1" />
              <span className="text-[9px] text-purple-400 font-mono w-8 text-right">{layer.intensity}%</span>
            </div>
          ))}
        </div>
      )}

      {/* Reset + clear */}
      <div className="px-4 py-2 border-t border-white/5 flex gap-2">
        <button onClick={() => EffectStack.clearAll()}
          className="flex-1 py-2 rounded-xl bg-white/5 border border-white/10 text-white/30 text-xs hover:text-white transition-all">
          Clear All
        </button>
      </div>

      {/* Preset save dialog */}
      <AnimatePresence>
        {showPresetSave && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-6">
            <div className="bg-[#1a1a26] rounded-2xl p-4 w-full max-w-xs border border-white/10">
              <h3 className="text-white font-bold text-sm mb-3">Save Preset</h3>
              <input type="text" value={presetName} onChange={e => setPresetName(e.target.value)}
                placeholder="Preset name..." maxLength={30}
                className="w-full bg-white/5 text-white text-sm rounded-xl px-3 py-2 border border-white/10 focus:outline-none focus:border-purple-400 mb-3" />
              <div className="flex gap-2">
                <button onClick={() => setShowPresetSave(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 text-white/40 text-xs">Cancel</button>
                <button onClick={() => {
                  if (presetName.trim()) {
                    EffectStack.savePreset(presetName.trim());
                    setPresetName('');
                    setShowPresetSave(false);
                  }
                }} className="flex-1 py-2 rounded-xl bg-purple-500/30 text-purple-300 text-xs font-semibold">Save</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function FilterCard({ filter, isActive, isFavorite, onToggle, onFavorite }) {
  return (
    <button
      onClick={onToggle}
      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 border transition-all active:scale-95 ${
        isActive
          ? 'border-purple-400 bg-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]'
          : 'border-white/5 bg-white/[0.02] hover:bg-white/[0.04]'
      }`}
    >
      <span className="text-xl">{filter.emoji}</span>
      <span className="text-[8px] text-white/50 text-center leading-tight px-0.5 line-clamp-1">{filter.name}</span>
      {isActive && <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-purple-400" />}
      <button
        onClick={(e) => { e.stopPropagation(); onFavorite(); }}
        className="absolute top-0.5 left-0.5"
      >
        <Star className={`w-2.5 h-2.5 ${isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-white/10'}`} />
      </button>
      {filter.cost > 2 && (
        <span className="absolute bottom-0.5 right-0.5 text-[7px] text-amber-400/60">{filter.cost}⚡</span>
      )}
    </button>
  );
}

function PresetList() {
  const presets = EffectStack.getPresets();
  return (
    <div className="space-y-2">
      {presets.length === 0 && (
        <p className="text-white/20 text-xs text-center py-8">No presets saved yet. Stack effects and save a combo.</p>
      )}
      {presets.map((preset, idx) => (
        <div key={idx} className="flex items-center gap-3 bg-white/[0.03] rounded-xl p-3 border border-white/5">
          <div className="flex-1">
            <p className="text-white text-xs font-semibold">{preset.name}</p>
            <p className="text-white/30 text-[10px]">{preset.layers?.length || 0} filters, {preset.particles?.length || 0} particles</p>
          </div>
          <button onClick={() => EffectStack.loadPreset(preset)}
            className="px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[10px] font-semibold">
            Load
          </button>
          <button onClick={() => EffectStack.deletePreset(idx)}
            className="w-6 h-6 rounded-full bg-white/5 flex items-center justify-center">
            <Trash2 className="w-3 h-3 text-red-400/50" />
          </button>
        </div>
      ))}
    </div>
  );
}

function GestureEditor({ onClose }) {
  const mapping = GestureRecognizer.getMapping();
  const gestureNames = {
    fist: '✊ Fist', peace: '✌️ Peace', pointing: '👆 Point', open_hand: '🖐 Open Hand',
    thumbs_up: '👍 Thumbs Up', thumbs_down: '👎 Thumbs Down', finger_heart: '🫰 Finger Heart',
    rock: '🤘 Rock', ok_sign: '👌 OK', pinch: '🤏 Pinch',
    swipe_left: '👈 Swipe Left', swipe_right: '👉 Swipe Right', swipe_up: '☝️ Swipe Up', swipe_down: '👇 Swipe Down',
    circle_motion: '🔄 Circle', smile: '😊 Smile', blink_left: '😉 Blink L', blink_right: '😉 Blink R',
    mouth_open: '😮 Mouth Open', head_nod: '🙂 Nod', wink: '😜 Wink',
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-white text-xs font-bold">Gesture → Effect Mapping</h4>
        <button onClick={onClose} className="text-white/30 text-xs">Done</button>
      </div>
      {Object.entries(gestureNames).map(([gesture, label]) => (
        <div key={gesture} className="flex items-center gap-2 bg-white/[0.03] rounded-lg p-2 border border-white/5">
          <span className="text-[10px] text-white/60 w-24 shrink-0">{label}</span>
          <select
            value={mapping[gesture] || ''}
            onChange={e => GestureRecognizer.setMapping(gesture, e.target.value)}
            className="flex-1 bg-white/5 text-white text-[10px] rounded px-2 py-1 border border-white/10 focus:outline-none"
          >
            <option value="">None</option>
            {ADVANCED_FILTERS.map(f => (
              <option key={f.id} value={f.id}>{f.emoji} {f.name}</option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}