import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Globe, Lock, Calendar, Tag, Users, CheckCircle2, Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function StudioPublisher({ podcast, episode, onPublish }) {
  const [form, setForm] = useState({
    title: episode?.title || '',
    description: episode?.description || '',
    show_notes: episode?.show_notes || '',
    tags: episode?.tags || [],
    guests: episode?.guests || [],
    season_number: episode?.season_number || 1,
    episode_number: episode?.episode_number || 1,
    is_explicit: episode?.is_explicit || false,
    is_published: false,
    scheduled_publish_date: '',
    visibility: 'public',
  });
  const [newTag, setNewTag] = useState('');
  const [newGuest, setNewGuest] = useState('');
  const [generating, setGenerating] = useState(false);
  const [publishMode, setPublishMode] = useState('now');

  const generateShowNotes = async () => {
    if (!form.title) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Generate professional podcast show notes for an episode titled "${form.title}". 
      ${form.description ? `Episode description: ${form.description}` : ''}
      ${form.guests.length ? `Guests: ${form.guests.join(', ')}` : ''}
      ${form.tags.length ? `Topics: ${form.tags.join(', ')}` : ''}
      
      Include: Episode summary, key talking points, timestamps placeholders (e.g. [00:00] Intro), 
      resources mentioned, guest bios if applicable, call to action.
      Make it engaging, SEO-optimized and professional.`,
    });
    setForm(f => ({ ...f, show_notes: result }));
    setGenerating(false);
    toast.success('Show notes generated!');
  };

  const generateDescription = async () => {
    if (!form.title) return;
    setGenerating(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Write a compelling 2-3 sentence podcast episode description for: "${form.title}". 
      Make it hook the listener, use active voice, and include a teaser of what they'll learn/enjoy. Keep it under 200 characters for mobile display.`,
    });
    setForm(f => ({ ...f, description: result }));
    setGenerating(false);
    toast.success('Description generated!');
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm(f => ({ ...f, tags: [...f.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const addGuest = () => {
    if (newGuest.trim() && !form.guests.includes(newGuest.trim())) {
      setForm(f => ({ ...f, guests: [...f.guests, newGuest.trim()] }));
      setNewGuest('');
    }
  };

  const handlePublish = () => {
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    onPublish?.({
      ...form,
      is_published: publishMode !== 'draft',
      scheduled_publish_date: publishMode === 'schedule' ? form.scheduled_publish_date : null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Episode Title *</label>
        <input
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          placeholder="Give your episode a compelling title..."
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20"
        />
      </div>

      {/* Description */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-white/50 text-xs uppercase tracking-wide">Description</label>
          <button onClick={generateDescription} disabled={generating || !form.title} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors">
            <Sparkles className="w-3 h-3" /> AI Write
          </button>
        </div>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="Brief episode description..."
          rows={3}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20 resize-none"
        />
      </div>

      {/* Show Notes */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-white/50 text-xs uppercase tracking-wide">Show Notes</label>
          <button onClick={generateShowNotes} disabled={generating || !form.title} className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 transition-colors">
            {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            AI Generate Full Notes
          </button>
        </div>
        <textarea
          value={form.show_notes}
          onChange={e => setForm(f => ({ ...f, show_notes: e.target.value }))}
          placeholder="Full show notes with links, timestamps, resources..."
          rows={8}
          className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20 resize-none font-mono"
        />
      </div>

      {/* Episode metadata */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Season</label>
          <input type="number" min={1} value={form.season_number}
            onChange={e => setForm(f => ({ ...f, season_number: +e.target.value }))}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50"
          />
        </div>
        <div>
          <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Episode #</label>
          <input type="number" min={1} value={form.episode_number}
            onChange={e => setForm(f => ({ ...f, episode_number: +e.target.value }))}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50"
          />
        </div>
      </div>

      {/* Tags */}
      <div>
        <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Tags</label>
        <div className="flex gap-2 mb-2">
          <input
            value={newTag} onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
            placeholder="Add a tag..." className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20"
          />
          <button onClick={addTag} className="px-3 py-2 rounded-lg bg-amber-600/20 text-amber-400 text-sm hover:bg-amber-600/30 transition-colors">+</button>
        </div>
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.tags.map(t => (
              <span key={t} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                <Tag className="w-2.5 h-2.5" /> {t}
                <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))} className="ml-1 text-amber-300/50 hover:text-red-400">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Guests */}
      <div>
        <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Guests</label>
        <div className="flex gap-2 mb-2">
          <input
            value={newGuest} onChange={e => setNewGuest(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addGuest())}
            placeholder="Guest name..." className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20"
          />
          <button onClick={addGuest} className="px-3 py-2 rounded-lg bg-blue-600/20 text-blue-400 text-sm hover:bg-blue-600/30 transition-colors">+</button>
        </div>
        {form.guests.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {form.guests.map(g => (
              <span key={g} className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs">
                <Users className="w-2.5 h-2.5" /> {g}
                <button onClick={() => setForm(f => ({ ...f, guests: f.guests.filter(x => x !== g) }))} className="ml-1 text-blue-300/50 hover:text-red-400">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Explicit toggle */}
      <label className="flex items-center justify-between cursor-pointer py-3 border-t border-white/[0.06]">
        <div>
          <p className="text-white/70 text-sm">Explicit Content</p>
          <p className="text-white/30 text-xs">Contains strong language or mature themes</p>
        </div>
        <div
          onClick={() => setForm(f => ({ ...f, is_explicit: !f.is_explicit }))}
          className={`w-10 h-6 rounded-full transition-colors ${form.is_explicit ? 'bg-red-500' : 'bg-white/10'} relative`}
        >
          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form.is_explicit ? 'translate-x-5' : 'translate-x-1'}`} />
        </div>
      </label>

      {/* Publish mode */}
      <div>
        <label className="text-white/50 text-xs uppercase tracking-wide block mb-3">Publish</label>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { id: 'now', label: 'Publish Now', icon: Globe },
            { id: 'schedule', label: 'Schedule', icon: Calendar },
            { id: 'draft', label: 'Save Draft', icon: Lock },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setPublishMode(id)}
              className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-xs font-medium transition-all ${
                publishMode === id
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                  : 'bg-white/[0.02] border-white/[0.06] text-white/40 hover:border-white/20 hover:text-white/60'
              }`}
            >
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>

        {publishMode === 'schedule' && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
            <input
              type="datetime-local"
              value={form.scheduled_publish_date}
              onChange={e => setForm(f => ({ ...f, scheduled_publish_date: e.target.value }))}
              className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50"
            />
          </motion.div>
        )}
      </div>

      {/* Publish button */}
      <button
        onClick={handlePublish}
        className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
      >
        <CheckCircle2 className="w-4 h-4" />
        {publishMode === 'now' ? 'Publish Episode' : publishMode === 'schedule' ? 'Schedule Episode' : 'Save Draft'}
      </button>
    </div>
  );
}