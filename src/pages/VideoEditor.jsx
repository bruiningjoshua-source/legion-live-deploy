import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, Play, Pause, SkipBack, SkipForward, Scissors, ZoomIn, ZoomOut, Plus, Undo2, Redo2,
  Upload, Globe, Lock, EyeOff, Tag, Layers, Crop,
  Settings, Sparkles, Download, Share2, Loader2, X
} from 'lucide-react';
import { toast } from 'sonner';
import VideoTimeline from '@/components/editor/VideoTimeline';
import VideoEffectsPanel from '@/components/editor/VideoEffectsPanel';
import VideoColorGrader from '@/components/editor/VideoColorGrader';

const CATEGORIES = [
  { value: 'gaming', label: '🎮 Gaming' },
  { value: 'music', label: '🎵 Music' },
  { value: 'entertainment', label: '🎬 Entertainment' },
  { value: 'education', label: '📚 Education' },
  { value: 'howto', label: '✨ How-to' },
  { value: 'sports', label: '⚽ Sports' },
  { value: 'comedy', label: '😂 Comedy' },
  { value: 'tech', label: '💻 Technology' },
  { value: 'travel', label: '✈️ Travel' },
  { value: 'fitness', label: '💪 Fitness' },
  { value: 'vlogs', label: '📹 Vlogs' },
];

function formatTime(s) {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

const DEFAULT_TRACKS = [
  { id: 'video1', name: 'Video 1', type: 'video', muted: false, hidden: false, clips: [
    { id: 'c1', start: 0, duration: 30, label: 'Main Clip' }
  ]},
  { id: 'audio1', name: 'Audio', type: 'audio', muted: false, hidden: false, clips: [
    { id: 'c2', start: 0, duration: 30, label: 'Original Audio', waveform: Array.from({length: 60}, () => Math.random() * 0.8) }
  ]},
  { id: 'music1', name: 'Music', type: 'music', muted: false, hidden: false, clips: [] },
  { id: 'text1', name: 'Text / Titles', type: 'text', muted: false, hidden: false, clips: [] },
  { id: 'fx1', name: 'Effects', type: 'effect', muted: false, hidden: false, clips: [] },
];

export default function VideoEditor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const videoId = urlParams.get('id');

  const [videoData, setVideoData] = useState(null);
  const [activePanel, setActivePanel] = useState('details'); // details | timeline | effects | export
  const [tracks, setTracks] = useState(DEFAULT_TRACKS);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(30);
  const [zoom, setZoom] = useState(1);
  const [showEffects, setShowEffects] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [newChapter, setNewChapter] = useState({ time: '', title: '' });
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeDetailsTab, setActiveDetailsTab] = useState('info');
  const videoRef = useRef(null);
  const playRef = useRef(null);

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: video, isLoading } = useQuery({
    queryKey: ['edit-video', videoId],
    queryFn: async () => {
      const vs = await base44.entities.VlogVideo.filter({ id: videoId }, null, 1);
      return vs[0] || null;
    },
    enabled: !!videoId
  });

  useEffect(() => { if (video) { setVideoData({ ...video }); if (video.duration_seconds) setDuration(video.duration_seconds); } }, [video]);

  // Playhead animation
  useEffect(() => {
    if (isPlaying) {
      playRef.current = setInterval(() => {
        setCurrentTime(t => {
          if (t >= duration) { setIsPlaying(false); clearInterval(playRef.current); return 0; }
          return t + 0.1;
        });
      }, 100);
    } else {
      clearInterval(playRef.current);
    }
    return () => clearInterval(playRef.current);
  }, [isPlaying, duration]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.VlogVideo.update(videoId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['edit-video', videoId]);
      toast.success('Saved!');
    }
  });

  const handleSave = () => updateMutation.mutate({
    title: videoData.title, description: videoData.description,
    category: videoData.category, tags: videoData.tags,
    visibility: videoData.visibility, chapters: videoData.chapters,
    comments_enabled: videoData.comments_enabled, age_restricted: videoData.age_restricted,
  });

  const addTag = () => {
    if (newTag.trim() && !(videoData?.tags || []).includes(newTag.trim())) {
      setVideoData(v => ({ ...v, tags: [...(v.tags || []), newTag.trim()] }));
      setNewTag('');
    }
  };

  const addChapter = () => {
    if (newChapter.time && newChapter.title) {
      const parts = newChapter.time.split(':').map(Number);
      const s = parts.length === 3 ? parts[0]*3600+parts[1]*60+parts[2] : parts.length === 2 ? parts[0]*60+parts[1] : parts[0];
      const chapters = [...(videoData.chapters || []), { time_seconds: s, title: newChapter.title }].sort((a,b)=>a.time_seconds-b.time_seconds);
      setVideoData(v => ({ ...v, chapters }));
      setNewChapter({ time: '', title: '' });
    }
  };

  const handleThumbnailUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setThumbnailUploading(true);
    const res = await base44.integrations.Core.UploadFile({ file });
    setVideoData(v => ({ ...v, thumbnail_url: res.file_url }));
    setThumbnailUploading(false);
    toast.success('Thumbnail updated!');
  };

  const generateThumbnailDescription = async () => {
    if (!videoData?.title) return;
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create a highly optimized YouTube/video title for a video called "${videoData.title}". 
      Make it compelling, SEO-friendly, under 70 characters, and use power words. Return just the title.`
    });
    setVideoData(v => ({ ...v, title: result }));
    toast.success('Title optimized!');
  };

  if (isLoading || (!videoData && videoId)) {
    return (
      <div className="min-h-screen bg-[#080810] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
      </div>
    );
  }

  const panelTabs = [
    { id: 'details',  label: 'Details',    icon: Settings },
    { id: 'timeline', label: 'Edit',       icon: Layers },
    { id: 'color',    label: 'Color',      icon: Crop },
    { id: 'export',   label: 'Export',     icon: Download },
  ];

  return (
    <div className="h-screen bg-[#080810] flex flex-col overflow-hidden">

      {/* ── Top Bar ── */}
      <div className="flex items-center gap-3 px-4 py-2.5 border-b border-white/[0.06] bg-[#0d0d18] shrink-0 z-10">
        <button onClick={() => navigate(createPageUrl('CreatorStudio'))} className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="h-4 w-px bg-white/10" />
        <div className="flex-1 min-w-0">
          {videoData ? (
            <input
              value={videoData.title || ''}
              onChange={e => setVideoData(v => ({ ...v, title: e.target.value }))}
              className="bg-transparent text-white font-semibold text-sm outline-none w-full truncate"
              placeholder="Untitled Video"
            />
          ) : (
            <span className="text-white/50 text-sm">New Video</span>
          )}
        </div>

        {/* Panel switcher */}
        <div className="hidden sm:flex bg-white/[0.04] rounded-lg p-0.5">
          {panelTabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setActivePanel(id)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${activePanel === id ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>
              <Icon className="w-3 h-3" /> {label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <button onClick={handleSave} disabled={updateMutation.isPending || !videoData} className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm font-bold transition-colors disabled:opacity-50">
            {updateMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save
          </button>
        </div>
      </div>

      {/* ── Main ── */}
      <div className="flex-1 flex min-h-0">

        {/* ── DETAILS PANEL ── */}
        {activePanel === 'details' && videoData && (
          <div className="flex flex-1 min-h-0">
            {/* Preview sidebar */}
            <div className="w-72 shrink-0 border-r border-white/[0.06] p-4 space-y-4 overflow-y-auto bg-[#0a0a14]">
              <div className="relative rounded-xl overflow-hidden border border-white/[0.06] aspect-video bg-black cursor-pointer group">
                {videoData.thumbnail_url
                  ? <img src={videoData.thumbnail_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center bg-stone-900"><Play className="w-8 h-8 text-white/20" /></div>
                }
                <label className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  {thumbnailUploading ? <Loader2 className="w-5 h-5 text-white animate-spin" /> : <Upload className="w-5 h-5 text-white" />}
                  <input type="file" accept="image/*" className="hidden" onChange={handleThumbnailUpload} />
                </label>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-white/30">Views</span>
                  <span className="text-white/60">{(videoData.view_count || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/30">Likes</span>
                  <span className="text-white/60">{(videoData.like_count || 0).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/30">Duration</span>
                  <span className="text-white/60">{videoData.duration_seconds ? formatTime(videoData.duration_seconds) : '--'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/30">Visibility</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    videoData.visibility === 'public' ? 'bg-green-500/10 text-green-400'
                    : videoData.visibility === 'unlisted' ? 'bg-yellow-500/10 text-yellow-400'
                    : 'bg-red-500/10 text-red-400'
                  }`}>{videoData.visibility || 'public'}</span>
                </div>
              </div>

              {/* Quick visibility */}
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { value: 'public', icon: Globe, color: 'green' },
                  { value: 'unlisted', icon: EyeOff, color: 'yellow' },
                  { value: 'private', icon: Lock, color: 'red' },
                ].map(({ value, icon: Icon, color }) => (
                  <button key={value} onClick={() => setVideoData(v => ({ ...v, visibility: value }))}
                    className={`py-2 rounded-lg border text-xs capitalize transition-all flex flex-col items-center gap-1 ${
                      videoData.visibility === value
                        ? `bg-${color}-500/10 border-${color}-500/30 text-${color}-400`
                        : 'bg-white/[0.02] border-white/[0.06] text-white/30 hover:text-white/60'
                    }`}>
                    <Icon className="w-3 h-3" />{value}
                  </button>
                ))}
              </div>
            </div>

            {/* Details form */}
            <div className="flex-1 overflow-y-auto p-6">
              {/* Details tabs */}
              <div className="flex gap-1 mb-6 bg-white/[0.03] rounded-xl p-1 w-fit">
                {[
                  { id: 'info', label: 'Info' },
                  { id: 'chapters', label: 'Chapters' },
                  { id: 'seo', label: 'SEO & Tags' },
                  { id: 'settings', label: 'Settings' },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveDetailsTab(tab.id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeDetailsTab === tab.id ? 'bg-white text-black' : 'text-white/40 hover:text-white/70'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>

              {activeDetailsTab === 'info' && (
                <div className="space-y-5 max-w-2xl">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-white/50 text-xs uppercase tracking-wide">Title</label>
                      <button onClick={generateThumbnailDescription} className="text-purple-400 hover:text-purple-300 text-xs flex items-center gap-1 transition-colors">
                        <Sparkles className="w-3 h-3" /> AI Optimize
                      </button>
                    </div>
                    <input value={videoData.title || ''} onChange={e => setVideoData(v => ({ ...v, title: e.target.value }))} maxLength={100}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50" />
                    <p className="text-right text-white/20 text-xs mt-1">{(videoData.title?.length || 0)}/100</p>
                  </div>

                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Description</label>
                    <textarea value={videoData.description || ''} onChange={e => setVideoData(v => ({ ...v, description: e.target.value }))} rows={6} maxLength={5000}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 resize-none" />
                  </div>

                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Category</label>
                    <select value={videoData.category || 'entertainment'} onChange={e => setVideoData(v => ({ ...v, category: e.target.value }))}
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50">
                      {CATEGORIES.map(c => <option key={c.value} value={c.value} className="bg-[#111118]">{c.label}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {activeDetailsTab === 'chapters' && (
                <div className="max-w-2xl space-y-4">
                  <div className="flex gap-2">
                    <input value={newChapter.time} onChange={e => setNewChapter(c => ({ ...c, time: e.target.value }))}
                      placeholder="0:00" className="w-20 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
                    <input value={newChapter.title} onChange={e => setNewChapter(c => ({ ...c, title: e.target.value }))}
                      placeholder="Chapter title..." className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50" />
                    <button onClick={addChapter} className="px-4 py-2.5 rounded-xl bg-amber-600/20 text-amber-400 text-sm hover:bg-amber-600/40 transition-colors">+ Add</button>
                  </div>
                  {(videoData.chapters || []).length === 0 ? (
                    <div className="text-center py-12 text-white/20">
                      <Layers className="w-10 h-10 mx-auto mb-3 opacity-30" />
                      <p className="text-sm">No chapters yet. First chapter should start at 0:00</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(videoData.chapters || []).map((ch, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.05] group">
                          <span className="font-mono text-amber-400 text-sm w-14">{formatTime(ch.time_seconds)}</span>
                          <input value={ch.title} onChange={e => setVideoData(v => ({ ...v, chapters: v.chapters.map((c, j) => j === i ? { ...c, title: e.target.value } : c) }))}
                            className="flex-1 bg-transparent text-white/80 text-sm outline-none" />
                          <button onClick={() => setVideoData(v => ({ ...v, chapters: v.chapters.filter((_, j) => j !== i) }))} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 transition-all">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeDetailsTab === 'seo' && (
                <div className="max-w-2xl space-y-5">
                  <div>
                    <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Tags (max 15)</label>
                    <div className="flex gap-2 mb-3">
                      <input value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                        placeholder="Add tag..." className="flex-1 bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20" />
                      <button onClick={addTag} className="px-4 py-2.5 rounded-xl bg-amber-600/20 text-amber-400 text-sm hover:bg-amber-600/40">+ Add</button>
                    </div>
                    {(videoData.tags || []).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {(videoData.tags || []).map(tag => (
                          <span key={tag} className="flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                            <Tag className="w-2.5 h-2.5" />{tag}
                            <button onClick={() => setVideoData(v => ({ ...v, tags: v.tags.filter(t => t !== tag) }))} className="ml-1 text-amber-300/50 hover:text-red-400">×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeDetailsTab === 'settings' && (
                <div className="max-w-md space-y-4">
                  {[
                    { key: 'comments_enabled', label: 'Allow Comments', desc: 'Viewers can comment on this video' },
                    { key: 'age_restricted', label: 'Age Restricted (18+)', desc: 'Contains mature content' },
                    { key: 'made_for_kids', label: 'Made for Kids', desc: 'Restrict features for child safety' },
                  ].map(({ key, label, desc }) => (
                    <div key={key} className="flex items-center justify-between py-4 border-b border-white/[0.06]">
                      <div>
                        <p className="text-white/80 text-sm font-medium">{label}</p>
                        <p className="text-white/30 text-xs">{desc}</p>
                      </div>
                      <div
                        onClick={() => setVideoData(v => ({ ...v, [key]: !v[key] }))}
                        className={`w-10 h-6 rounded-full transition-colors cursor-pointer ${videoData[key] ? 'bg-amber-500' : 'bg-white/10'} relative`}
                      >
                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${videoData[key] ? 'translate-x-5' : 'translate-x-1'}`} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TIMELINE PANEL ── */}
        {activePanel === 'timeline' && (
          <div className="flex-1 flex min-h-0">
            {/* Canvas preview */}
            <div className="flex flex-col w-72 shrink-0 border-r border-white/[0.06] bg-black">
              <div className="flex-1 flex items-center justify-center bg-black relative">
                {videoData?.video_url
                  ? <video ref={videoRef} src={videoData.video_url} className="max-w-full max-h-full object-contain" />
                  : videoData?.thumbnail_url
                  ? <img src={videoData.thumbnail_url} className="max-w-full max-h-full object-contain opacity-60" alt="" />
                  : <div className="text-white/10 text-center"><Play className="w-12 h-12 mx-auto mb-2 opacity-30" /><p className="text-xs">No video file</p></div>
                }
                {/* Preview overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-2 flex items-center gap-2 bg-gradient-to-t from-black/80 via-transparent to-transparent">
                  <button onClick={() => setIsPlaying(p => !p)} className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center">
                    {isPlaying ? <Pause className="w-3.5 h-3.5 text-black" /> : <Play className="w-3.5 h-3.5 text-black ml-0.5" />}
                  </button>
                  <span className="text-white/60 text-xs font-mono">{formatTime(currentTime)}</span>
                </div>
              </div>

              {/* Transport */}
              <div className="flex items-center justify-center gap-3 p-3 border-t border-white/[0.06]">
                <button onClick={() => setCurrentTime(0)} className="text-white/40 hover:text-white transition-colors"><SkipBack className="w-4 h-4" /></button>
                <button onClick={() => setCurrentTime(t => Math.max(0, t - 5))} className="text-white/40 hover:text-white transition-colors"><SkipBack className="w-3.5 h-3.5" /></button>
                <button onClick={() => setIsPlaying(p => !p)} className="w-10 h-10 rounded-full bg-amber-500 hover:bg-amber-400 flex items-center justify-center transition-colors">
                  {isPlaying ? <Pause className="w-5 h-5 text-black" /> : <Play className="w-5 h-5 text-black ml-0.5" />}
                </button>
                <button onClick={() => setCurrentTime(t => Math.min(duration, t + 5))} className="text-white/40 hover:text-white transition-colors"><SkipForward className="w-3.5 h-3.5" /></button>
                <button onClick={() => setCurrentTime(duration)} className="text-white/40 hover:text-white transition-colors"><SkipForward className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Timeline + effects */}
            <div className="flex flex-col flex-1 min-w-0">
              {/* Timeline toolbar */}
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/[0.06] bg-[#0a0a14] shrink-0">
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white text-xs transition-all">
                  <Scissors className="w-3.5 h-3.5" /> Split
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white text-xs transition-all">
                  <Undo2 className="w-3.5 h-3.5" /> Undo
                </button>
                <button className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white/50 hover:text-white text-xs transition-all">
                  <Redo2 className="w-3.5 h-3.5" /> Redo
                </button>
                <div className="flex-1" />
                <button onClick={() => setZoom(z => Math.max(0.25, z - 0.25))} className="text-white/40 hover:text-white transition-colors"><ZoomOut className="w-4 h-4" /></button>
                <span className="text-white/30 text-xs w-10 text-center">{Math.round(zoom*100)}%</span>
                <button onClick={() => setZoom(z => Math.min(4, z + 0.25))} className="text-white/40 hover:text-white transition-colors"><ZoomIn className="w-4 h-4" /></button>
                <button onClick={() => setShowEffects(e => !e)} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all ${showEffects ? 'bg-amber-500/15 text-amber-300' : 'bg-white/[0.04] text-white/40'}`}>
                  <Sparkles className="w-3.5 h-3.5" /> Effects
                </button>
              </div>

              <div className="flex flex-1 min-h-0">
                <div className="flex-1 overflow-auto bg-[#080810]">
                  <VideoTimeline
                    tracks={tracks}
                    duration={duration}
                    currentTime={currentTime}
                    onSeek={setCurrentTime}
                    onTracksChange={setTracks}
                    zoom={zoom}
                  />
                  {/* Add track */}
                  <div className="flex items-center gap-2 pl-30 pr-4 py-2 border-t border-white/[0.04]" style={{ paddingLeft: 120 }}>
                    {['video','audio','music','text','effect'].map(type => (
                      <button
                        key={type}
                        onClick={() => setTracks(ts => [...ts, { id: `${type}-${Date.now()}`, name: type.charAt(0).toUpperCase() + type.slice(1), type, muted: false, hidden: false, clips: [] }])}
                        className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.04] text-white/25 hover:text-white/50 text-xs transition-all capitalize"
                      >
                        <Plus className="w-3 h-3" /> {type}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Effects panel */}
                <AnimatePresence>
                  {showEffects && (
                    <motion.div
                      initial={{ width: 0, opacity: 0 }} animate={{ width: 220, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                      className="shrink-0 overflow-hidden"
                    >
                      <VideoEffectsPanel
                        onApplyFilter={f => toast.info(`Filter applied`)}
                        onApplyTransition={t => toast.info(`Transition: ${t}`)}
                        onAddText={d => toast.info(`Text added: ${d.text}`)}
                        onAddEffect={e => toast.info(`Effect added`)}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}

        {/* ── COLOR GRADING PANEL ── */}
        {activePanel === 'color' && (
          <div className="flex-1 flex min-h-0">
            {/* Preview */}
            <div className="w-72 shrink-0 border-r border-white/[0.06] bg-black flex flex-col">
              <div className="flex-1 flex items-center justify-center relative">
                {videoData?.thumbnail_url
                  ? <img src={videoData.thumbnail_url} className="max-w-full max-h-full object-contain" alt="" style={{ filter: 'contrast(1.05) saturate(1.1)' }} />
                  : <div className="text-white/10 text-center"><Crop className="w-12 h-12 mx-auto mb-2 opacity-20" /><p className="text-xs">No preview</p></div>
                }
              </div>
              <div className="p-3 border-t border-white/[0.06] text-center">
                <p className="text-white/30 text-xs">Color Grade Preview</p>
              </div>
            </div>
            {/* Grader */}
            <div className="flex-1 overflow-hidden">
              <VideoColorGrader onGradeChange={(grade) => toast.info('Grade applied')} />
            </div>
          </div>
        )}

        {/* ── EXPORT PANEL ── */}
        {activePanel === 'export' && (
          <div className="flex-1 p-8 overflow-y-auto">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-white font-black text-2xl">Export & Share</h2>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: '4K Ultra HD', desc: '3840×2160 · 60fps', badge: 'Best', color: 'amber' },
                  { label: 'Full HD', desc: '1920×1080 · 30fps', badge: 'Recommended', color: 'blue' },
                  { label: 'Mobile', desc: '1080×1920 · 30fps', badge: 'Vertical', color: 'green' },
                ].map(q => (
                  <button key={q.label} className={`p-4 rounded-2xl border-2 border-${q.color}-500/20 bg-${q.color}-500/5 hover:border-${q.color}-500/40 transition-all text-left`}>
                    <span className={`text-xs px-2 py-0.5 rounded-full bg-${q.color}-500/10 text-${q.color}-400 font-medium`}>{q.badge}</span>
                    <p className="text-white font-bold mt-3">{q.label}</p>
                    <p className="text-white/30 text-xs">{q.desc}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 space-y-4">
                <h3 className="text-white font-bold">Share to Platforms</h3>
                {[
                  { name: 'The Amphitheatre', desc: 'Publish directly to your channel', color: '#f59e0b', ready: true },
                  { name: 'YouTube', desc: 'Cross-post to your YouTube channel', color: '#ff0000', ready: false },
                  { name: 'TikTok', desc: 'Share short clips to TikTok', color: '#000000', ready: false },
                ].map(p => (
                  <div key={p.name} className="flex items-center gap-4 py-3 border-b border-white/[0.04] last:border-0">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: p.color + '22' }}>
                      <Share2 className="w-4 h-4" style={{ color: p.color }} />
                    </div>
                    <div className="flex-1">
                      <p className="text-white/80 text-sm font-medium">{p.name}</p>
                      <p className="text-white/30 text-xs">{p.desc}</p>
                    </div>
                    <button
                      onClick={() => p.ready ? handleSave() : toast.info('Coming soon')}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition-colors ${p.ready ? 'bg-amber-600 hover:bg-amber-500 text-white' : 'bg-white/[0.05] text-white/30 cursor-default'}`}
                    >
                      {p.ready ? 'Publish' : 'Coming Soon'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}