import React, { useState } from 'react';

const KINDS = [
  { id: 'text', label: 'Text' },
  { id: 'link', label: 'Link' },
  { id: 'tip_goal', label: 'Tip Goal' },
  { id: 'gift_goal', label: 'Gift Goal' },
];

const PRESETS = [
  { bg: 'rgba(26,21,16,0.72)', text: '#f5e6c8', accent: '#f5a623' }, // bronze
  { bg: 'rgba(10,10,20,0.75)', text: '#e0e7ff', accent: '#818cf8' }, // indigo
  { bg: 'rgba(4,20,15,0.75)', text: '#d1fae5', accent: '#34d399' },  // emerald
  { bg: 'rgba(30,6,10,0.75)', text: '#ffe4e6', accent: '#fb7185' },  // rose
  { bg: 'rgba(255,255,255,0.9)', text: '#1a1a1a', accent: '#f5a623' }, // light
];

export default function BannerEditModal({ banner, onClose, onSave, onDelete }) {
  const [kind, setKind] = useState(banner.kind || 'text');
  const [title, setTitle] = useState(banner.title || '');
  const [content, setContent] = useState(banner.content || '');
  const [linkUrl, setLinkUrl] = useState(banner.link_url || '');
  const [goalTarget, setGoalTarget] = useState(banner.goal_target || 1000);
  const [colors, setColors] = useState({
    bg: banner.bg_color || PRESETS[0].bg,
    text: banner.text_color || PRESETS[0].text,
    accent: banner.accent_color || PRESETS[0].accent,
  });

  const save = () => {
    onSave({
      kind, title: title.trim(), content: content.trim(),
      link_url: kind === 'link' ? linkUrl.trim() : null,
      goal_target: (kind === 'tip_goal' || kind === 'gift_goal') ? parseInt(goalTarget, 10) || 0 : null,
      bg_color: colors.bg, text_color: colors.text, accent_color: colors.accent,
      visible: true,
    });
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-md bg-[#141019] border-t sm:border border-amber-500/20 sm:rounded-2xl rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <h3 className="text-amber-100 font-bold text-lg mb-3" style={{ fontFamily: 'Syne, sans-serif' }}>
          {banner._new ? 'Add Banner' : 'Edit Banner'}
        </h3>

        {/* Kind */}
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {KINDS.map(k => (
            <button key={k.id} onClick={() => setKind(k.id)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold"
              style={{ background: kind === k.id ? '#f5a623' : 'rgba(255,255,255,0.06)', color: kind === k.id ? '#000' : 'rgba(255,255,255,0.6)' }}>
              {k.label}
            </button>
          ))}
        </div>

        <label className="block text-white/50 text-xs mb-1">Title (optional)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. TODAY'S GOAL"
          className="w-full mb-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />

        <label className="block text-white/50 text-xs mb-1">
          {kind === 'link' ? 'Link text' : (kind === 'tip_goal' || kind === 'gift_goal') ? 'Goal label' : 'Text'}
        </label>
        <input value={content} onChange={(e) => setContent(e.target.value)} placeholder="What shows on the banner"
          className="w-full mb-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />

        {kind === 'link' && (
          <>
            <label className="block text-white/50 text-xs mb-1">URL</label>
            <input value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..."
              className="w-full mb-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
          </>
        )}

        {(kind === 'tip_goal' || kind === 'gift_goal') && (
          <>
            <label className="block text-white/50 text-xs mb-1">Goal target (Denarii)</label>
            <input type="number" value={goalTarget} onChange={(e) => setGoalTarget(e.target.value)}
              className="w-full mb-3 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm" />
          </>
        )}

        {/* Color presets */}
        <label className="block text-white/50 text-xs mb-1.5">Style</label>
        <div className="flex gap-2 mb-4">
          {PRESETS.map((p, i) => (
            <button key={i} onClick={() => setColors({ bg: p.bg, text: p.text, accent: p.accent })}
              className="w-9 h-9 rounded-lg border-2"
              style={{ background: p.bg, borderColor: colors.accent === p.accent ? p.accent : 'transparent' }}>
              <span style={{ color: p.accent, fontSize: '13px' }}>A</span>
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button onClick={save} className="flex-1 py-2.5 rounded-xl font-bold text-black" style={{ background: '#f5a623' }}>
            {banner._new ? 'Add' : 'Save'}
          </button>
          {onDelete && (
            <button onClick={onDelete} className="px-4 py-2.5 rounded-xl font-semibold text-red-300 bg-red-500/10 border border-red-500/30">
              Delete
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl font-semibold text-white/60 bg-white/5">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
