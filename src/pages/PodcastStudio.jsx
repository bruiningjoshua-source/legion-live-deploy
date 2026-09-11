import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  Mic, Headphones, BarChart3, Plus, Trash2,
  Upload, Play, Users, TrendingUp, ChevronRight,
  Rss, Star, Eye, Clock, Loader2, Layers, Edit3, Globe, Wand2, Search, ExternalLink, SlidersHorizontal, X
} from 'lucide-react';
import { toast } from 'sonner';
import StudioRecorder from '@/components/podcast/StudioRecorder';
import StudioAudioEditor from '@/components/podcast/StudioAudioEditor';
import StudioPublisher from '@/components/podcast/StudioPublisher';
import PodcastAudioPlayer from '@/components/podcast/PodcastAudioPlayer';

const NAV_ITEMS = [
  { id: 'shows', label: 'My Shows', icon: Headphones },
  { id: 'studio', label: 'Recording Studio', icon: Mic },
  { id: 'episodes', label: 'Episodes', icon: Layers },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'distribution', label: 'Distribution', icon: Rss },
];

const CATEGORIES = [
  'technology','business','entertainment','education','health','sports','news','comedy','music','other'
];

const DISTRIBUTION_PLATFORMS = [
  { name: 'Apple Podcasts', color: '#fc3c44', desc: 'Submit your show through Apple Podcasts Connect', href: 'https://podcastsconnect.apple.com/' },
  { name: 'Spotify', color: '#1db954', desc: 'Claim or submit your show for Spotify', href: 'https://podcasters.spotify.com/' },
  { name: 'Amazon Music', color: '#ff9900', desc: 'Submit your podcast to Amazon Music', href: 'https://podcasters.amazon.com/' },
  { name: 'Pocket Casts', color: '#f43e37', desc: 'List your RSS feed in Pocket Casts', href: 'https://pocketcasts.com/submit/' },
];

function StatCard({ icon: Icon, label, value, sub, color = 'amber' }) {
  return (
    <div className={`rounded-2xl border border-${color}-500/10 bg-${color}-500/5 p-5`}>
      <div className={`w-10 h-10 rounded-xl bg-${color}-500/10 flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 text-${color}-400`} />
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-white/40 text-sm">{label}</p>
      {sub && <p className={`text-${color}-400 text-xs mt-1`}>{sub}</p>}
    </div>
  );
}

export default function PodcastStudio() {
  const queryClient = useQueryClient();
  const [activeNav, setActiveNav] = useState('shows');
  const [selectedPodcast, setSelectedPodcast] = useState(null);
  const [showCreatePodcast, setShowCreatePodcast] = useState(false);
  const [editingPodcast, setEditingPodcast] = useState(null);
  const [playingEpisode, setPlayingEpisode] = useState(null);
  const [playlist, setPlaylist] = useState([]);
  const [episodeSearch, setEpisodeSearch] = useState('');
  const [episodeStatus, setEpisodeStatus] = useState('all');

  // Studio workflow state
  const [studioTab, setStudioTab] = useState('record'); // record | edit | publish
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [editedData, setEditedData] = useState(null);

  // Podcast form
  const [podForm, setPodForm] = useState({
    title: '', description: '', category: 'entertainment', cover_art_url: '', is_explicit: false, website_url: ''
  });

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });
  const { data: creator } = useQuery({
    queryKey: ['my-creator', user?.email],
    queryFn: async () => {
      const c = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      return c[0] || null;
    },
    enabled: !!user?.email
  });

  const { data: podcasts = [], isLoading } = useQuery({
    queryKey: ['my-podcasts', creator?.id],
    queryFn: () => base44.entities.Podcast.filter({ creator_id: creator.id }),
    enabled: !!creator?.id
  });

  const { data: allEpisodes = [] } = useQuery({
    queryKey: ['all-episodes', creator?.id],
    queryFn: async () => {
      if (!podcasts.length) return [];
      const eps = await Promise.all(podcasts.map(p => base44.entities.PodcastEpisode.filter({ podcast_id: p.id })));
      return eps.flat().sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
    },
    enabled: !!creator?.id && podcasts.length > 0
  });

  const savePodcastMutation = useMutation({
    mutationFn: (data) => editingPodcast
      ? base44.entities.Podcast.update(editingPodcast.id, data)
      : base44.entities.Podcast.create({ ...data, creator_id: creator.id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-podcasts'] });
      setShowCreatePodcast(false);
      setEditingPodcast(null);
      toast.success(editingPodcast ? 'Podcast updated!' : 'Podcast created!');
    }
  });

  const saveEpisodeMutation = useMutation({
    mutationFn: (data) => base44.entities.PodcastEpisode.create({
      ...data,
      podcast_id: selectedPodcast?.id || podcasts[0]?.id,
      creator_id: creator?.id,
      audio_url: recordedUrl,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-episodes'] });
      setRecordedUrl(null); setStudioTab('record');
      toast.success('Episode published!');
      setActiveNav('episodes');
    }
  });

  const deletePodcastMutation = useMutation({
    mutationFn: (id) => base44.entities.Podcast.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-podcasts'] })
  });

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const result = await base44.integrations.Core.UploadFile({ file });
    setPodForm(p => ({ ...p, cover_art_url: result.file_url }));
  };

  const openCreatePodcast = useCallback((pod = null) => {
    setEditingPodcast(pod);
    setPodForm(pod ? { title: pod.title || '', description: pod.description || '', category: pod.category || 'entertainment', cover_art_url: pod.cover_art_url || '', is_explicit: pod.is_explicit || false, website_url: pod.website_url || '' } : { title: '', description: '', category: 'entertainment', cover_art_url: '', is_explicit: false, website_url: '' });
    setShowCreatePodcast(true);
  }, []);

  const startEpisode = () => {
    if (!podcasts.length) {
      toast.error('Create a show before recording an episode.');
      openCreatePodcast();
      return;
    }
    setSelectedPodcast(current => current || podcasts[0]);
    setActiveNav('studio');
    setStudioTab('record');
  };

  const totalPlays = podcasts.reduce((a, p) => a + (p.total_plays || 0), 0);
  const totalSubs = podcasts.reduce((a, p) => a + (p.subscriber_count || 0), 0);
  const totalEps = allEpisodes.length;
  const publishedEpisodes = allEpisodes.filter(episode => episode.is_published);
  const filteredEpisodes = allEpisodes.filter(episode => {
    const matchesShow = !selectedPodcast || episode.podcast_id === selectedPodcast.id;
    const matchesStatus = episodeStatus === 'all' || (episodeStatus === 'published' ? episode.is_published : !episode.is_published);
    return matchesShow && matchesStatus && episode.title?.toLowerCase().includes(episodeSearch.toLowerCase());
  });
  const topEpisode = [...allEpisodes].sort((a, b) => (b.play_count || 0) - (a.play_count || 0))[0];

  // Studio workflow steps
  const studioSteps = [
    { id: 'record', label: 'Record', icon: Mic, done: !!recordedUrl },
    { id: 'edit', label: 'Edit', icon: Wand2, done: !!editedData },
    { id: 'publish', label: 'Publish', icon: Globe, done: false },
  ];

  if (user === undefined || (user && creator === undefined)) {
    return <div className="min-h-screen bg-[#080810]" />;
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#080810] px-4 flex items-center justify-center">
        <div className="ll-panel max-w-sm p-8 text-center">
          <Mic className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Sign in to use Podcast Studio</h1>
          <p className="text-sm text-white/50 mb-5">Podcast Studio is a workspace for creators.</p>
          <button onClick={() => base44.auth.redirectToLogin()} className="ll-btn ll-btn-primary w-full">Sign in</button>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-[#080810] px-4 flex items-center justify-center">
        <div className="ll-panel max-w-sm p-8 text-center">
          <Headphones className="w-10 h-10 text-amber-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Create your channel first</h1>
          <p className="text-sm text-white/50 mb-5">Podcast Studio is available after you set up a public creator profile.</p>
          <Link to={createPageUrl('CreatorOnboarding')} className="ll-btn ll-btn-primary w-full">Set up creator profile</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080810] pb-28 flex">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-56 shrink-0 pt-6 pl-4 pr-3 gap-1">
        <div className="flex items-center gap-2 px-3 py-3 mb-3">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
            <Mic className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm">Podcast Studio</span>
        </div>
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveNav(id)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              activeNav === id
                ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'
            }`}
          >
            <Icon className="w-4 h-4" /> {label}
          </button>
        ))}

        {podcasts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            <p className="text-white/20 text-xs uppercase tracking-wide px-3 mb-2">Your Shows</p>
            {podcasts.slice(0, 5).map(p => (
              <button
                key={p.id}
                onClick={() => { setSelectedPodcast(p); setActiveNav('episodes'); }}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/40 hover:text-white/70 hover:bg-white/[0.03] text-xs w-full text-left transition-colors"
              >
                {p.cover_art_url
                  ? <img src={p.cover_art_url} className="w-6 h-6 rounded object-cover" alt="" />
                  : <div className="w-6 h-6 rounded bg-amber-500/20 flex items-center justify-center"><Mic className="w-3 h-3 text-amber-400" /></div>
                }
                <span className="truncate">{p.title}</span>
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto pb-6">
          <button
            onClick={() => openCreatePodcast()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> New Show
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 min-w-0 px-4 lg:px-6 pt-6">

        <div className="max-w-4xl mb-6 flex flex-col gap-3 border-b border-white/[0.08] pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-amber-300 text-xs font-semibold uppercase tracking-[0.16em]">Creator workspace</p>
            <p className="text-white/45 text-sm mt-1">Manage your show, episodes, and distribution from one place.</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => openCreatePodcast()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/10 hover:border-white/25 transition-colors">
              <Plus className="w-4 h-4" /> New Show
            </button>
            <button onClick={startEpisode} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-black hover:bg-amber-400 transition-colors">
              <Mic className="w-4 h-4" /> New Episode
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        <div className="lg:hidden flex gap-1 overflow-x-auto scrollbar-hide pb-3 mb-4">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveNav(id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition-all shrink-0 ${
                activeNav === id ? 'bg-amber-500/15 text-amber-300 border border-amber-500/20' : 'bg-white/[0.04] text-white/40'
              }`}
            >
              <Icon className="w-3.5 h-3.5" /> {label}
            </button>
          ))}
        </div>

        {/* ── SHOWS ── */}
        {activeNav === 'shows' && (
          <motion.div key="shows" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6 max-w-2xl">
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={Headphones} label="Shows" value={podcasts.length} color="amber" />
              <StatCard icon={Layers} label="Episodes" value={totalEps} color="blue" />
              <StatCard icon={Users} label="Subscribers" value={totalSubs.toLocaleString()} color="green" />
              <StatCard icon={Eye} label="Total Plays" value={totalPlays.toLocaleString()} color="purple" />
            </div>

            {/* Show grid */}
            {isLoading ? (
              <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 text-amber-400 animate-spin" /></div>
            ) : podcasts.length === 0 ? (
              <div className="text-center py-24">
                <div className="w-20 h-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-5">
                  <Mic className="w-10 h-10 text-amber-400/40" />
                </div>
                <h2 className="text-white font-bold text-xl mb-2">Start Your First Show</h2>
                <p className="text-white/30 mb-6 max-w-xs mx-auto">Create a podcast show, then start recording episodes in the studio.</p>
                <button onClick={() => openCreatePodcast()} className="px-6 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors">
                  <Plus className="w-4 h-4 inline mr-2" />Create Show
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {podcasts.map((p, i) => (
                  <motion.div
                    key={p.id}
                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                    className="group relative rounded-2xl border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.05] transition-all overflow-hidden cursor-pointer"
                    onClick={() => { setSelectedPodcast(p); setActiveNav('episodes'); }}
                  >
                    <div className="aspect-square relative overflow-hidden">
                      {p.cover_art_url
                        ? <img src={p.cover_art_url} className="w-full h-full object-cover" alt={p.title} />
                        : <div className="w-full h-full bg-gradient-to-br from-amber-900/30 to-orange-900/30 flex items-center justify-center"><Mic className="w-12 h-12 text-amber-400/30" /></div>
                      }
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-4">
                        <span className="text-white text-sm font-bold flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /> Open Studio</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="text-white font-bold text-sm line-clamp-1">{p.title}</h3>
                      <p className="text-white/40 text-xs mt-1 line-clamp-2">{p.description || 'No description'}</p>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-white/30 text-xs capitalize">{p.category}</span>
                        <div className="flex items-center gap-3 text-white/30 text-xs">
                          <span>{p.total_episodes || 0} eps</span>
                          <span>{p.subscriber_count || 0} subs</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={e => { e.stopPropagation(); openCreatePodcast(p); }} className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-white hover:bg-amber-600/80 transition-colors">
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button onClick={e => { e.stopPropagation(); if (confirm('Delete this podcast?')) deletePodcastMutation.mutate(p.id); }} className="w-7 h-7 rounded-full bg-black/60 flex items-center justify-center text-white/60 hover:text-red-400 hover:bg-red-600/20 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </motion.div>
                ))}

                {/* Add new */}
                <button
                  onClick={() => openCreatePodcast()}
                  className="rounded-2xl border-2 border-dashed border-white/[0.08] hover:border-amber-500/30 flex flex-col items-center justify-center gap-2 min-h-[220px] text-white/20 hover:text-amber-400 transition-all group"
                >
                  <div className="w-12 h-12 rounded-xl border-2 border-dashed border-current flex items-center justify-center">
                    <Plus className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium">New Show</span>
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── RECORDING STUDIO ── */}
        {activeNav === 'studio' && (
          <motion.div key="studio" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-white font-black text-2xl">Recording Studio</h1>
              {podcasts.length > 0 && (
                <select
                  value={selectedPodcast?.id || ''}
                  onChange={e => setSelectedPodcast(podcasts.find(p => p.id === e.target.value) || null)}
                  className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2 text-white text-sm outline-none"
                >
                  <option value="">Select a show</option>
                  {podcasts.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              )}
            </div>

            {/* Workflow steps */}
            <div className="flex items-center gap-2">
              {studioSteps.map((step, i) => {
                const Icon = step.icon;
                const isActive = studioTab === step.id;
                const isDone = step.done;
                return (
                  <React.Fragment key={step.id}>
                    <button
                      onClick={() => setStudioTab(step.id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        isActive ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : isDone ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-white/[0.03] text-white/30 border border-white/[0.06]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" /> {step.label}
                      {isDone && <span className="text-green-400 text-xs">✓</span>}
                    </button>
                    {i < studioSteps.length - 1 && <ChevronRight className="w-4 h-4 text-white/20 shrink-0" />}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Step content */}
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
              {studioTab === 'record' && (
                <StudioRecorder
                  onRecordingReady={(url) => {
                    setRecordedUrl(url);
                    setTimeout(() => setStudioTab('edit'), 500);
                  }}
                />
              )}
              {studioTab === 'edit' && (
                <StudioAudioEditor
                  audioUrl={recordedUrl}
                  onExport={(data) => { setEditedData(data); setStudioTab('publish'); }}
                />
              )}
              {studioTab === 'publish' && (
                <StudioPublisher
                  podcast={selectedPodcast}
                  onPublish={(data) => saveEpisodeMutation.mutate(data)}
                />
              )}
            </div>

            {/* Also allow audio upload */}
            {studioTab === 'record' && (
              <div className="text-center">
                <p className="text-white/20 text-sm mb-3">or upload an existing audio file</p>
                <label className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-white/[0.08] text-white/40 hover:text-white hover:border-white/20 text-sm cursor-pointer transition-colors">
                  <Upload className="w-4 h-4" /> Upload Audio
                  <input
                    type="file" accept="audio/*" className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]; if (!file) return;
                      toast.loading('Uploading...');
                      const result = await base44.integrations.Core.UploadFile({ file });
                      toast.dismiss(); toast.success('Uploaded!');
                      setRecordedUrl(result.file_url);
                      setStudioTab('edit');
                    }}
                  />
                </label>
              </div>
            )}
          </motion.div>
        )}

        {/* ── EPISODES ── */}
        {activeNav === 'episodes' && (
          <motion.div key="episodes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h1 className="text-white font-black text-2xl">Episodes</h1>
              <button onClick={startEpisode} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-sm font-bold transition-colors">
                <Mic className="w-4 h-4" /> New Episode
              </button>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.02] p-3">
              <label className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/25" />
                <input
                  value={episodeSearch}
                  onChange={event => setEpisodeSearch(event.target.value)}
                  placeholder="Search episodes"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-amber-500/50 placeholder:text-white/20"
                />
              </label>
              <select
                value={episodeStatus}
                onChange={event => setEpisodeStatus(event.target.value)}
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
              >
                <option value="all" className="bg-[#111118]">All statuses</option>
                <option value="published" className="bg-[#111118]">Published</option>
                <option value="draft" className="bg-[#111118]">Drafts</option>
              </select>
              <select
                value={selectedPodcast?.id || ''}
                onChange={event => setSelectedPodcast(podcasts.find(podcast => podcast.id === event.target.value) || null)}
                aria-label="Filter episodes by show"
                className="bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white outline-none focus:border-amber-500/50"
              >
                <option value="" className="bg-[#111118]">All shows</option>
                {podcasts.map(podcast => <option key={podcast.id} value={podcast.id} className="bg-[#111118]">{podcast.title}</option>)}
              </select>
              {(episodeSearch || episodeStatus !== 'all' || selectedPodcast) && (
                <button
                  onClick={() => { setEpisodeSearch(''); setEpisodeStatus('all'); setSelectedPodcast(null); }}
                  className="inline-flex items-center justify-center gap-1 rounded-xl border border-white/[0.08] px-3 py-2.5 text-sm text-white/60 hover:border-white/20 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" /> Clear
                </button>
              )}
            </div>

            {selectedPodcast && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                {selectedPodcast.cover_art_url && <img src={selectedPodcast.cover_art_url} className="w-10 h-10 rounded-lg object-cover" alt="" />}
                <div>
                  <p className="text-white text-sm font-medium">{selectedPodcast.title}</p>
                  <p className="text-white/30 text-xs capitalize">{selectedPodcast.category}</p>
                </div>
                <button onClick={() => setSelectedPodcast(null)} className="ml-auto text-white/30 hover:text-white text-xs">Show All</button>
              </div>
            )}

            {allEpisodes.length === 0 ? (
              <div className="text-center py-20 text-white/20">
                <Layers className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>No episodes yet. Start recording in the Studio!</p>
              </div>
            ) : filteredEpisodes.length === 0 ? (
              <div className="text-center py-16 text-white/25">
                <Search className="w-9 h-9 mx-auto mb-3 opacity-40" />
                <p>No episodes match those filters.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredEpisodes.map((ep, i) => (
                  <motion.div
                    key={ep.id}
                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                    className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] transition-all group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-900/40 to-orange-900/40 flex items-center justify-center shrink-0">
                      {ep.cover_art_url ? <img src={ep.cover_art_url} className="w-full h-full rounded-xl object-cover" alt="" /> : <Headphones className="w-5 h-5 text-amber-400/50" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-white font-medium text-sm truncate">{ep.title}</p>
                        {ep.is_published ? (
                          <span className="text-green-400 text-xs bg-green-500/10 px-1.5 py-0.5 rounded-full border border-green-500/20">Live</span>
                        ) : (
                          <span className="text-amber-400 text-xs bg-amber-500/10 px-1.5 py-0.5 rounded-full border border-amber-500/20">Draft</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-white/25 text-xs">
                        {ep.duration_seconds && <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{Math.round(ep.duration_seconds / 60)}m</span>}
                        <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{ep.play_count || 0} plays</span>
                        {ep.episode_number && <span>Ep. {ep.episode_number}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => setPlayingEpisode(ep)}
                        aria-label={`Play ${ep.title}`}
                        title={`Play ${ep.title}`}
                        className="w-9 h-9 rounded-xl border border-amber-400/30 bg-amber-500/15 hover:bg-amber-400 flex items-center justify-center text-amber-300 hover:text-black transition-all"
                      >
                        <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* ── ANALYTICS ── */}
        {activeNav === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-2xl space-y-6">
            <h1 className="text-white font-black text-2xl">Analytics</h1>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <StatCard icon={Eye} label="Total Plays" value={totalPlays.toLocaleString()} color="blue" />
              <StatCard icon={Users} label="Subscribers" value={totalSubs.toLocaleString()} color="green" />
              <StatCard icon={TrendingUp} label="Avg Plays/Ep" value={totalEps ? Math.round(totalPlays / totalEps) : 0} color="purple" />
              <StatCard icon={Star} label="Shows" value={podcasts.length} color="amber" />
            </div>
            <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-white font-bold text-sm">Episode performance</h2>
                  <p className="text-white/30 text-xs mt-1">Based on published episode play counts.</p>
                </div>
                <span className="text-white/30 text-xs">{publishedEpisodes.length} live</span>
              </div>
              {topEpisode ? (
                <div className="flex items-center gap-3 rounded-xl bg-white/[0.03] p-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0"><Play className="w-4 h-4 text-amber-400 fill-current" /></div>
                  <div className="min-w-0 flex-1">
                    <p className="text-white text-sm font-medium truncate">{topEpisode.title}</p>
                    <p className="text-white/30 text-xs mt-1">Top episode by plays</p>
                  </div>
                  <span className="text-amber-300 text-sm font-bold">{(topEpisode.play_count || 0).toLocaleString()}</span>
                </div>
              ) : (
                <p className="py-5 text-center text-white/25 text-sm">Publish an episode to begin tracking performance.</p>
              )}
            </div>
            <button onClick={() => setActiveNav('episodes')} className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2.5 text-sm font-medium text-white/70 hover:border-amber-400/40 hover:text-white transition-colors">
              <SlidersHorizontal className="w-4 h-4" /> Manage episodes
            </button>
          </motion.div>
        )}

        {/* ── DISTRIBUTION ── */}
        {activeNav === 'distribution' && (
          <motion.div key="distribution" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-3xl space-y-6">
            <h1 className="text-white font-black text-2xl">Distribution</h1>
            <div className="rounded-xl border border-amber-500/15 bg-amber-500/[0.05] p-4">
              <p className="text-amber-200 text-sm font-medium">External distribution</p>
              <p className="text-white/40 text-xs mt-1">Legion Live does not generate an RSS feed yet. Publish your show here first, then use your hosting provider&apos;s RSS URL to submit it to a platform.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {DISTRIBUTION_PLATFORMS.map(platform => (
                <div key={platform.name} className="flex items-center gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02]">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: platform.color + '22', border: `1px solid ${platform.color}40` }}>
                    <Rss className="w-5 h-5" style={{ color: platform.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-white text-sm font-medium">{platform.name}</p>
                    <p className="text-white/30 text-xs">{platform.desc}</p>
                  </div>
                  <a href={platform.href} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] text-white/50 hover:text-white hover:bg-white/10 transition-colors">
                    Open <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </main>

      {/* ── Create Podcast Modal ── */}
      <AnimatePresence>
        {showCreatePodcast && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
            onClick={() => setShowCreatePodcast(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111118] p-6 space-y-5 max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <h2 className="text-white font-bold text-lg">{editingPodcast ? 'Edit Show' : 'Create New Show'}</h2>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Title *</label>
                <input value={podForm.title} onChange={e => setPodForm(p => ({ ...p, title: e.target.value }))}
                  placeholder="My Awesome Podcast" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20" />
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Description</label>
                <textarea value={podForm.description} onChange={e => setPodForm(p => ({ ...p, description: e.target.value }))}
                  rows={3} placeholder="What's your podcast about?" className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 placeholder:text-white/20 resize-none" />
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Category</label>
                <select value={podForm.category} onChange={e => setPodForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-amber-500/50 capitalize">
                  {CATEGORIES.map(c => <option key={c} value={c} className="capitalize bg-[#111118]">{c}</option>)}
                </select>
              </div>

              <div>
                <label className="text-white/50 text-xs uppercase tracking-wide block mb-2">Cover Art</label>
                <div className="flex items-center gap-4">
                  {podForm.cover_art_url
                    ? <div className="relative w-20 h-20 rounded-xl overflow-hidden">
                        <img src={podForm.cover_art_url} className="w-full h-full object-cover" alt="" />
                        <button onClick={() => setPodForm(p => ({ ...p, cover_art_url: '' }))} className="absolute top-1 right-1 w-5 h-5 bg-black/70 rounded-full flex items-center justify-center text-white text-xs">×</button>
                      </div>
                    : <label className="w-20 h-20 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-amber-500/40 transition-colors">
                        <Upload className="w-5 h-5 text-white/20" /><span className="text-white/20 text-xs mt-1">Upload</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                      </label>
                  }
                  <p className="text-white/20 text-xs">Recommended 1400×1400px</p>
                </div>
              </div>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-white/50 text-sm">Explicit Content</span>
                <div onClick={() => setPodForm(p => ({ ...p, is_explicit: !p.is_explicit }))}
                  className={`w-10 h-6 rounded-full transition-colors ${podForm.is_explicit ? 'bg-red-500' : 'bg-white/10'} relative`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${podForm.is_explicit ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </label>

              <div className="flex gap-3">
                <button onClick={() => setShowCreatePodcast(false)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:text-white text-sm transition-colors">Cancel</button>
                <button
                  onClick={() => savePodcastMutation.mutate(podForm)}
                  disabled={!podForm.title.trim() || savePodcastMutation.isPending}
                  className="flex-1 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition-colors disabled:opacity-50"
                >
                  {savePodcastMutation.isPending ? 'Saving...' : editingPodcast ? 'Save Changes' : 'Create Show'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Audio Player */}
      {playingEpisode && (
        <PodcastAudioPlayer
          episode={playingEpisode}
          onNext={() => {
            const idx = allEpisodes.findIndex(e => e.id === playingEpisode.id);
            if (idx < allEpisodes.length - 1) setPlayingEpisode(allEpisodes[idx + 1]);
          }}
          onPrev={() => {
            const idx = allEpisodes.findIndex(e => e.id === playingEpisode.id);
            if (idx > 0) setPlayingEpisode(allEpisodes[idx - 1]);
          }}
          onClose={() => setPlayingEpisode(null)}
        />
      )}
    </div>
  );
}