import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import {
  Play, Radio, Eye, MoreVertical, Search, Bell, Cast,
  Tv, Music2, Mic2
} from 'lucide-react';

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

function LiveCard({ stream }) {
  return (
    <Link to={createPageUrl('WatchStream') + `?id=${stream.id}`} className="block group">
      <div className="relative w-full rounded-xl overflow-hidden bg-gradient-to-br from-purple-900/20 to-pink-900/20 border border-purple-500/20 hover:border-purple-400/40 transition-all mb-2" style={{ aspectRatio: '16/9' }}>
        {stream.thumbnail_url ? (
          <img src={stream.thumbnail_url} alt={stream.title} className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-950 to-black flex items-center justify-center">
            <Tv className="w-10 h-10 text-white/10" />
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
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

function SectionHeader({ icon: Icon, title, iconColor = 'text-amber-400' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`w-5 h-5 ${iconColor}`} />
      <h2 className="text-white font-bold text-base">{title}</h2>
    </div>
  );
}

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

export default function TheAmphitheatre() {
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const { data: liveStreams = [] } = useQuery({
    queryKey: ['amphitheatre-live'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 30),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const { data: musicVideos = [] } = useQuery({
    queryKey: ['amphitheatre-music'],
    queryFn: () => base44.entities.Music.filter({ is_published: true }, '-play_count', 500),
    staleTime: 5 * 60_000,
  });

  const { data: podcastEpisodes = [] } = useQuery({
    queryKey: ['amphitheatre-podcasts'],
    queryFn: () => base44.entities.PodcastEpisode.filter({ is_published: true }, '-created_date', 20),
    staleTime: 5 * 60_000,
  });

  const musicFiltered = useMemo(() => {
    if (!search) return musicVideos;
    const q = search.toLowerCase();
    return musicVideos.filter(m => m.title?.toLowerCase().includes(q) || m.artist?.toLowerCase().includes(q));
  }, [musicVideos, search]);

  const liveFiltered = useMemo(() => {
    if (!search) return liveStreams;
    const q = search.toLowerCase();
    return liveStreams.filter(s => s.title?.toLowerCase().includes(q));
  }, [liveStreams, search]);

  const showAll    = activeTab === 'all';
  const showMusic  = activeTab === 'music' || showAll;
  const showShorts = activeTab === 'shorts' || showAll;
  const showMixes  = activeTab === 'mixes' || showAll;
  const showLive   = activeTab === 'live' || showAll;
  const showPod    = activeTab === 'podcasts' || showAll;

  return (
    <div className="min-h-screen text-white pb-24">

      <div className="sticky top-14 z-40 bigo-overlay border-b border-white/10 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          {showSearch ? (
            <div className="flex-1 flex items-center gap-2 bigo-card px-3 h-9 border-purple-400/30">
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
                <Play className="w-5 h-5 text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400" />
                <span className="text-white font-bold text-base">Live</span>
              </div>
              <div className="flex items-center gap-4">
                <button className="text-white/60 hover:text-white transition-colors"><Cast className="w-5 h-5" /></button>
                <button className="text-white/60 hover:text-white transition-colors"><Bell className="w-5 h-5" /></button>
                <button onClick={() => setShowSearch(true)} className="text-white/60 hover:text-white transition-colors"><Search className="w-5 h-5" /></button>
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto scrollbar-hide items-center">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-white/[0.08] text-white/80 hover:bg-white/[0.15] border border-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-5 space-y-8">

        {(showShorts || showAll) && musicFiltered.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Play className="w-6 h-6 text-red-600" />
                <h2 className="text-white font-bold text-xl">Shorts</h2>
              </div>
              <button className="text-white/50 hover:text-white p-1"><MoreVertical className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {musicFiltered.slice(0, 6).map((item) => {
                const thumb = item.cover_url || ytThumb(item.video_url);
                const videoUrl = createPageUrl(`WatchVideo?id=${item.id}&type=music`);
                return (
                  <Link key={item.id} to={videoUrl}>
                    <div className="relative group rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]" style={{ aspectRatio: '9/16' }}>
                      {thumb && <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
                      <div className="absolute bottom-0 left-0 right-0 p-2">
                        <p className="text-white text-xs font-semibold line-clamp-2">{item.title}</p>
                        {item.artist && <p className="text-white/50 text-[10px]">{item.artist}</p>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {(showMixes || showAll) && musicFiltered.length > 0 && (
          <section>
            {musicFiltered.slice(0, 3).map((item, i) => {
              const thumb = item.cover_url || ytThumb(item.video_url);
              const videoUrl = createPageUrl(`WatchVideo?id=${item.id}&type=music`);
              return (
                <Link key={item.id} to={videoUrl} className="block mb-4">
                  <div className="relative group rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06] hover:border-white/[0.15]" style={{ aspectRatio: '16/9' }}>
                    {thumb && (
                      <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex flex-col justify-between p-3">
                      <div className="flex items-center justify-between">
                        <span className="bg-white/20 text-white text-[11px] font-semibold px-2 py-0.5 rounded">{i === 0 ? 'Mix' : 'Related'}</span>
                        <button className="text-white/50 hover:text-white"><MoreVertical className="w-4 h-4" /></button>
                      </div>
                      <div>
                        <p className="text-white text-sm font-semibold line-clamp-2 mb-1">{item.title}</p>
                        <p className="text-white/70 text-xs">{item.artist}</p>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}

        {showMusic && musicFiltered.length > 0 && (
          <section>
            <div className="grid grid-cols-2 gap-4">
              {musicFiltered.slice(0, activeTab === 'music' ? 200 : 50).map((item) => {
                const thumb = item.cover_url || ytThumb(item.video_url);
                const videoUrl = createPageUrl(`WatchVideo?id=${item.id}&type=music`);
                return (
                  <Link key={item.id} to={videoUrl}>
                    <div className="space-y-2">
                      <div className="relative group rounded-lg overflow-hidden bg-white/[0.04] border border-white/[0.06]" style={{ aspectRatio: '16/9' }}>
                        {thumb && <img src={thumb} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <Play className="w-10 h-10 text-white drop-shadow-lg" />
                        </div>
                      </div>
                      <div className="px-0.5">
                        <p className="text-white text-xs font-semibold line-clamp-2 leading-snug">{item.title}</p>
                        <p className="text-white/60 text-[11px] mt-1">{item.artist}</p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {showLive && liveFiltered.length > 0 && (
          <section>
            <SectionHeader icon={Radio} title="Live Now" iconColor="text-red-500" />
            <div className="space-y-4">
              {liveFiltered.slice(0, activeTab === 'live' ? 20 : 3).map(stream => (
                <LiveCard key={stream.id} stream={stream} />
              ))}
            </div>
          </section>
        )}

        {showPod && podcastEpisodes.length > 0 && (
          <section>
            <SectionHeader icon={Mic2} title="Podcasts" iconColor="text-amber-400" />
            <div className="space-y-3">
              {podcastEpisodes.slice(0, activeTab === 'podcasts' ? 20 : 3).map((ep) => (
                <div key={ep.id} className="flex gap-3">
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.05]">
                    {ep.cover_art_url ? (
                      <img src={ep.cover_art_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-900 to-orange-950 flex items-center justify-center">
                        <Mic2 className="w-6 h-6 text-white/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold line-clamp-2">{ep.title}</p>
                    <p className="text-white/40 text-xs mt-0.5">{ep.podcast_id}</p>
                    {ep.duration_seconds && (
                      <p className="text-white/30 text-[10px] mt-1">{fmtDuration(ep.duration_seconds)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {musicFiltered.length === 0 && liveFiltered.length === 0 && podcastEpisodes.length === 0 && (
          <div className="text-center py-20">
            <Music2 className="w-12 h-12 text-white/10 mx-auto mb-3" />
            <p className="text-white/40 text-sm">No content found</p>
          </div>
        )}

      </div>
    </div>
  );
}