import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import {
  Play, Radio, Eye, MoreVertical, Search, Bell, Cast,
  Tv, Flame, Music2, Mic2, Shuffle, ChevronRight
} from 'lucide-react';
import VideoContextMenu from '@/components/amphitheatre/VideoContextMenu';

// ── Utility ──────────────────────────────────────────────────────────────────
function formatCount(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function fmtDuration(secs) {
  if (!secs) return '';
  const m = Math.floor(secs / 60), s = Math.floor(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function getYouTubeId(url) {
  if (!url) return null;
  const m = url.match(/[?&]v=([^&]+)/);
  return m ? m[1] : null;
}

function ytThumb(url) {
  const id = getYouTubeId(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

// ── Short card (portrait 9:16) ────────────────────────────────────────────────
function ShortCard({ item }) {
  const thumb = item.cover_url || ytThumb(item.video_url);
  return (
    <a href={item.video_url || '#'} target="_blank" rel="noopener noreferrer">
      <div className="group relative rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/20 transition-all" style={{ aspectRatio: '9/16' }}>
        {thumb ? (
          <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
            <Music2 className="w-8 h-8 text-white/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-4 h-4 text-white ml-0.5" />
          </div>
        </div>

        {/* Bottom info */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <p className="text-white text-xs font-semibold line-clamp-2 leading-tight mb-0.5">{item.title}</p>
          {item.artist && <p className="text-white/50 text-[10px]">{item.artist}</p>}
        </div>

        {/* Duration */}
        {item.duration_seconds && (
          <div className="absolute bottom-2 right-2 bg-black/80 text-white/80 text-[9px] px-1.5 py-0.5 rounded font-medium">
            {fmtDuration(item.duration_seconds)}
          </div>
        )}

        {/* More button */}
        <div className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <VideoContextMenu 
            video={item}
            onAddToWatchLater={handleAddToWatchLater}
            onAddToPlaylist={handleAddToPlaylist}
            onDownload={handleDownload}
            onShare={handleShare}
          />
        </div>
      </div>
    </a>
  );
}

// ── Full-width Mix / landscape card ──────────────────────────────────────────
function MixCard({ item, showNew = false }) {
  const thumb = item.cover_url || ytThumb(item.video_url) || item.thumbnail_url;
  const subtitle = [item.artist, item.tags?.slice(0, 3).join(', ')].filter(Boolean).join(' · ');

  return (
    <a href={item.video_url || '#'} target="_blank" rel="noopener noreferrer" className="block group">
      <div className="relative w-full rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.15] transition-all duration-200 mb-2" style={{ aspectRatio: '16/9' }}>
        {thumb ? (
          <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-400" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center">
            <Music2 className="w-12 h-12 text-white/10" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30">
            <Play className="w-5 h-5 text-white ml-0.5" />
          </div>
        </div>

        {/* Mix badge */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/80 backdrop-blur-sm text-white/80 text-[10px] px-2 py-0.5 rounded-md font-medium">
          <Shuffle className="w-2.5 h-2.5" /> Mix
        </div>

        {/* New badge */}
        {showNew && (
          <div className="absolute top-2 left-2 bg-white text-black text-[10px] font-black px-2 py-0.5 rounded-md">New</div>
        )}

        {/* More */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <VideoContextMenu 
            video={item}
            onAddToWatchLater={handleAddToWatchLater}
            onAddToPlaylist={handleAddToPlaylist}
            onDownload={handleDownload}
            onShare={handleShare}
          />
        </div>
      </div>

      {/* Info row */}
      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold line-clamp-2 leading-tight mb-0.5">{item.title}</p>
          <p className="text-white/45 text-xs line-clamp-1">{subtitle}</p>
        </div>
        <div className="shrink-0 mt-0.5">
          <VideoContextMenu 
            video={item}
            onAddToWatchLater={handleAddToWatchLater}
            onAddToPlaylist={handleAddToPlaylist}
            onDownload={handleDownload}
            onShare={handleShare}
          />
        </div>
      </div>
    </a>
  );
}

// ── Live stream card ──────────────────────────────────────────────────────────
function LiveCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`} className="block group">
      <div className="relative w-full rounded-xl overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.15] transition-all mb-2" style={{ aspectRatio: '16/9' }}>
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-red-950 to-black flex items-center justify-center">
            <Tv className="w-10 h-10 text-white/10" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-red-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
          <span className="w-1 h-1 rounded-full bg-white animate-pulse" />LIVE
        </div>
        {stream.viewer_count > 0 && (
          <div className="absolute bottom-2 right-2 flex items-center gap-0.5 bg-black/80 text-white/80 text-[9px] px-1.5 py-0.5 rounded-md">
            <Eye className="w-2.5 h-2.5" />{formatCount(stream.viewer_count)}
          </div>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-10 h-10 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center">
            <Play className="w-4 h-4 text-white ml-0.5" />
          </div>
        </div>
      </div>
      <div className="flex gap-2.5 px-0.5">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold line-clamp-2 leading-tight mb-0.5">{stream.title}</p>
          <p className="text-white/45 text-xs">{stream.creator_id}</p>
          {stream.viewer_count > 0 && <p className="text-white/30 text-[11px]">{formatCount(stream.viewer_count)} watching</p>}
        </div>
        <button className="shrink-0 w-7 h-7 flex items-center justify-center text-white/30 hover:text-white transition-colors">
          <MoreVertical className="w-4 h-4" />
        </button>
      </div>
    </Link>
  );
}

// ── Section header ────────────────────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, iconColor = 'text-red-500', onSeeAll }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <Icon className={`w-5 h-5 ${iconColor}`} />
        <h2 className="text-white font-bold text-base">{title}</h2>
      </div>
      {onSeeAll && (
        <button onClick={onSeeAll} className="flex items-center gap-0.5 text-white/40 hover:text-white text-xs transition-colors">
          See all <ChevronRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Category tabs config ──────────────────────────────────────────────────────
const TABS = [
  { id: 'all',      label: 'All' },
  { id: 'music',    label: 'Music' },
  { id: 'podcasts', label: 'Podcasts' },
  { id: 'mixes',    label: 'Mixes' },
  { id: 'gaming',   label: 'Gaming' },
  { id: 'live',     label: 'Live' },
  { id: 'shorts',   label: 'Shorts' },
  { id: 'fitness',  label: 'Fitness' },
  { id: 'comedy',   label: 'Comedy' },
];

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TheAmphitheatre() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const handleAddToWatchLater = (video) => {
    console.log('Add to Watch Later:', video.title);
    // TODO: Implement watch later functionality
  };

  const handleAddToPlaylist = (video) => {
    console.log('Add to Playlist:', video.title);
    // TODO: Implement playlist selection modal
  };

  const handleDownload = (video) => {
    console.log('Download:', video.title);
    // TODO: Implement download functionality
  };

  const handleShare = (video) => {
    const url = `${window.location.origin}/watch?id=${video.id}`;
    if (navigator.share) {
      navigator.share({ title: video.title, url });
    } else {
      navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    }
  };

  // Data fetches
  const { data: liveStreams = [] } = useQuery({
    queryKey: ['amphitheatre-live'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 30),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: musicVideos = [] } = useQuery({
    queryKey: ['amphitheatre-music'],
    queryFn: () => base44.entities.Music.filter({ is_published: true }, '-play_count', 200),
    staleTime: 5 * 60_000,
  });

  const { data: podcastEpisodes = [] } = useQuery({
    queryKey: ['amphitheatre-podcasts'],
    queryFn: () => base44.entities.PodcastEpisode.filter({ is_published: true }, '-created_date', 20),
    staleTime: 5 * 60_000,
  });

  // Derived lists
  const shorts = useMemo(() => musicVideos.filter(m => m.is_music_video).slice(0, 10), [musicVideos]);
  const mixes  = useMemo(() => musicVideos.slice(0, 20), [musicVideos]);
  const musicFiltered = useMemo(() => {
    if (!search) return musicVideos;
    return musicVideos.filter(m => m.title?.toLowerCase().includes(search.toLowerCase()) || m.artist?.toLowerCase().includes(search.toLowerCase()));
  }, [musicVideos, search]);

  const filteredLive = useMemo(() => {
    const q = search.toLowerCase();
    return liveStreams.filter(s => !q || s.title?.toLowerCase().includes(q));
  }, [liveStreams, search]);

  const showAll    = activeTab === 'all';
  const showMusic  = activeTab === 'music' || showAll;
  const showPod    = activeTab === 'podcasts' || showAll;
  const showLive   = activeTab === 'live' || showAll;
  const showShorts = activeTab === 'shorts' || showAll;
  const showMixes  = activeTab === 'mixes' || showAll;

  return (
    <div className="min-h-screen bg-[#0f0f10] text-white pb-24">

      {/* ── Sticky top bar ── */}
      <div className="sticky top-0 z-40 bg-[#0f0f10]/98 backdrop-blur-xl">
        {/* Title row */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {showSearch ? (
            <div className="flex-1 flex items-center gap-2 bg-white/[0.07] border border-white/[0.1] rounded-full px-3 h-9">
              <Search className="w-3.5 h-3.5 text-white/40 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                placeholder="Search music, streams…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-white text-sm placeholder:text-white/25 outline-none"
              />
              <button onClick={() => { setShowSearch(false); setSearch(''); }} className="text-white/40 hover:text-white text-xs">✕</button>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-md bg-red-600 flex items-center justify-center">
                  <Tv className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-white font-black text-base tracking-tight">Amphitheatre</span>
              </div>
              <div className="flex items-center gap-3">
                <button className="text-white/60 hover:text-white transition-colors"><Cast className="w-5 h-5" /></button>
                <button className="text-white/60 hover:text-white transition-colors"><Bell className="w-5 h-5" /></button>
                <button onClick={() => setShowSearch(true)} className="text-white/60 hover:text-white transition-colors"><Search className="w-5 h-5" /></button>
              </div>
            </>
          )}
        </div>

        {/* Category chips */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-black'
                  : 'bg-white/[0.1] text-white/80 hover:bg-white/[0.15]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="px-4 pt-3 space-y-8">

        {/* SHORTS shelf */}
        {showShorts && shorts.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-red-500 font-black text-lg leading-none">▶</span>
                <h2 className="text-white font-bold text-base">Shorts</h2>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {shorts.slice(0, 6).map((item, i) => (
                <ShortCard key={item.id || i} item={item} />
              ))}
            </div>
          </section>
        )}

        {/* LIVE NOW */}
        {showLive && filteredLive.length > 0 && (
          <section>
            <SectionHeader
              icon={Radio}
              title="Live Now"
              iconColor="text-red-500"
              onSeeAll={() => setActiveTab('live')}
            />
            <div className="space-y-5">
              {filteredLive.slice(0, activeTab === 'live' ? 20 : 3).map(stream => (
                <LiveCard key={stream.id} stream={stream} />
              ))}
            </div>
          </section>
        )}

        {/* MUSIC / MIXES — full width rows like YouTube Premium */}
        {(showMusic || showMixes) && musicFiltered.length > 0 && (
          <section>
            <SectionHeader
              icon={Music2}
              title={activeTab === 'mixes' ? 'Mixes' : 'Music Videos'}
              iconColor="text-purple-400"
              onSeeAll={activeTab === 'all' ? () => setActiveTab('music') : undefined}
            />
            <div className="space-y-6">
              {musicFiltered.slice(0, activeTab === 'music' || activeTab === 'mixes' ? 200 : 8).map((item, i) => (
                <MixCard key={item.id || i} item={item} showNew={i < 2} />
              ))}
            </div>
          </section>
        )}

        {/* PODCASTS */}
        {showPod && podcastEpisodes.length > 0 && (
          <section>
            <SectionHeader icon={Mic2} title="Podcasts" iconColor="text-amber-400" />
            <div className="space-y-5">
              {podcastEpisodes.slice(0, activeTab === 'podcasts' ? 20 : 3).map((ep, i) => (
                <div key={ep.id || i} className="flex gap-3">
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-white/[0.05] flex-shrink-0">
                    {ep.cover_art_url ? (
                      <img src={ep.cover_art_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-900 to-orange-950 flex items-center justify-center">
                        <Mic2 className="w-7 h-7 text-white/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold line-clamp-2 leading-tight mb-0.5">{ep.title}</p>
                    <p className="text-white/40 text-xs mb-1">{ep.podcast_id}</p>
                    {ep.duration_seconds && (
                      <span className="text-white/30 text-[11px]">{fmtDuration(ep.duration_seconds)}</span>
                    )}
                  </div>
                  <button className="shrink-0 w-7 h-7 flex items-center justify-center text-white/30 hover:text-white">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Empty state */}
        {!showAll && musicFiltered.length === 0 && filteredLive.length === 0 && podcastEpisodes.length === 0 && (
          <div className="text-center py-20">
            <Tv className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No content found</p>
            {search && <p className="text-white/25 text-xs mt-1">Try a different search</p>}
          </div>
        )}

        {/* Go Live CTA */}
        <div className="flex items-center justify-center pt-2">
          <Link to={createPageUrl('GoLive')} className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-lg shadow-red-500/20">
            <Radio className="w-4 h-4" /> Go Live
          </Link>
        </div>

      </div>
    </div>
  );
}