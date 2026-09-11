import React from 'react';
import ThemeScope from '@/components/theme/ThemeScope';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Crown, 
  Users,
  CalendarDays
} from 'lucide-react';

export default function CreatorProfile() {
  const urlParams = new URLSearchParams(window.location.search);
  const creatorId = urlParams.get('id');
  const { data: creator, isLoading } = useQuery({
    queryKey: ['creator', creatorId],
    queryFn: () => base44.entities.Creator.filter({ id: creatorId }, null, 1).then(r => r[0]),
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Creator's custom theme (CustomizeTheme page) — scoped to THIS page only via
  // ThemeScope below, unless the creator opted into applyEverywhere (which
  // pushes to the global accent separately, on save, not by reading it here).
  const { data: creatorTheme } = useQuery({
    queryKey: ['creator-theme', creator?.user_email],
    queryFn: () => base44.entities.CreatorTheme.filter({ user_email: creator.user_email }, '-updated_date', 1).then(r => r[0]?.theme_data),
    enabled: !!creator?.user_email,
    staleTime: 5 * 60 * 1000,
  });

  const { data: allStreams = [] } = useQuery({
    queryKey: ['creator-streams', creatorId],
    queryFn: () => base44.entities.Stream.filter({ creator_id: creatorId }, '-created_date', 20),
    enabled: !!creatorId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const scheduledStreams = allStreams.filter(s => s.status === 'scheduled');

  const { data: profilePosts = [] } = useQuery({
    queryKey: ['creator-profile-posts', creatorId],
    queryFn: () => base44.entities.ProfilePost.filter({ creator_id: creatorId }, '-created_date', 50),
    enabled: !!creatorId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-stone-950 pb-12">
        <div className="max-w-4xl mx-auto px-4">
          <Skeleton className="h-64 rounded-2xl bg-stone-800 mb-8" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-2xl bg-stone-800" />
            <Skeleton className="h-48 rounded-2xl bg-stone-800" />
          </div>
        </div>
      </div>
    );
  }

  if (!creator) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <Users className="w-16 h-16 text-amber-400/50 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-amber-100 mb-2">Creator Not Found</h1>
          <p className="text-amber-400/70 mb-6">This profile doesn't exist.</p>
          <Link to={createPageUrl('Explore')}>
            <Button className="bg-amber-600 hover:bg-amber-700">
              Explore Creators
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <ThemeScope theme={creatorTheme} className="min-h-screen bg-[#050508] pb-24">
      {/* Hero banner */}
      <div className="relative">
        <div className="h-36 sm:h-48 bg-gradient-to-r from-amber-900/60 via-stone-800 to-amber-900/60 overflow-hidden">
          {creator.banner_url
            ? <img src={creator.banner_url} alt="" className="w-full h-full object-cover opacity-60" />
            : <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=1200')] bg-cover bg-center opacity-25" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#050508] to-transparent" />
        </div>

        <div className="max-w-2xl mx-auto px-4 relative">
          {/* Avatar — centered, overlapping banner cleanly (no cut-off) */}
          <div className="flex flex-col items-center -mt-14">
            <div className="relative">
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 p-1 shadow-xl">
                <div className="w-full h-full rounded-full overflow-hidden bg-stone-800 border-4 border-[#050508]">
                  {creator.avatar_url
                    ? <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-white">{creator.display_name?.charAt(0)?.toUpperCase() || 'L'}</div>}
                </div>
              </div>
              {creator.is_live && (
                <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full border-2 border-[#050508]">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE
                </span>
              )}
            </div>

            {/* Name and public identity */}
            <div className="flex items-center gap-2 mt-3 flex-wrap justify-center">
              <h1 className="text-2xl font-bold text-amber-100">{creator.display_name}</h1>
              {creator.is_verified && <Crown className="w-5 h-5 text-amber-400" />}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 mt-8">
        {(creator.gallery_urls || []).length > 0 && <section className="mb-8"><h2 className="text-lg font-bold text-white mb-3">Gallery</h2><div className="grid grid-cols-3 gap-2 sm:grid-cols-6">{creator.gallery_urls.slice(0, 6).map((url, index) => <img key={url} src={url} alt={`${creator.display_name} gallery image ${index + 1}`} className="aspect-square w-full rounded-md object-cover" />)}</div></section>}

        <section className="mb-8"><h2 className="text-lg font-bold text-white mb-3">Updates</h2><div className="space-y-2">{profilePosts.length ? profilePosts.map(post => <article key={post.id} className="ll-card p-4"><p className="text-xs text-white/35">{new Date(post.created_date).toLocaleDateString()}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-white/85">{post.body}</p></article>) : <p className="py-6 text-sm text-white/40">No updates yet.</p>}</div></section>

        <section className="mb-8"><h2 className="text-lg font-bold text-white mb-3">Upcoming streams</h2><div className="space-y-2">{scheduledStreams.length ? scheduledStreams.map(stream => <div key={stream.id} className="ll-card flex items-center gap-3 p-3"><CalendarDays className="w-4 h-4 text-amber-400" /><div><p className="text-sm font-medium text-white">{stream.title}</p><p className="text-xs text-white/45">{stream.scheduled_start ? new Date(stream.scheduled_start).toLocaleString() : 'Schedule to be announced'}</p></div></div>) : <p className="py-6 text-sm text-white/40">No upcoming streams scheduled.</p>}</div></section>

      </div>
    </ThemeScope>
  );
}
