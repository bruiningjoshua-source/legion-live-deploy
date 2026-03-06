import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Search, Upload, Video, X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import CategoryChips from '@/components/amphitheatre/CategoryChips';
import VideoFeedCard from '@/components/amphitheatre/VideoFeedCard';
import ShortsShelf from '@/components/amphitheatre/ShortsShelf';
import InterestSelector from '@/components/amphitheatre/InterestSelector';
import DirectMessaging from '@/components/community/DirectMessaging';

export default function TheAmphitheatre() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showSearch, setShowSearch] = useState(false);
  const [showInterestPicker, setShowInterestPicker] = useState(false);
  const [showMessages, setShowMessages] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: userInterests } = useQuery({
    queryKey: ['user-interests', user?.email],
    queryFn: async () => {
      const interests = await base44.entities.UserInterest.filter({ user_email: user.email }, null, 1);
      return interests[0] || null;
    },
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: videos = [], isLoading } = useQuery({
    queryKey: ['amphitheatre-videos'],
    queryFn: async () => {
      const res = await base44.entities.VlogVideo.filter({
        is_published: true,
        review_status: 'approved',
        visibility: 'public'
      }, '-created_date', 200);
      return Array.isArray(res) ? res : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['amphitheatre-creators'],
    queryFn: async () => {
      const res = await base44.entities.Creator.list('-follower_count', 100);
      return Array.isArray(res) ? res : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: musicVideos = [] } = useQuery({
    queryKey: ['amphitheatre-music'],
    queryFn: async () => {
      const res = await base44.entities.Music.filter({ is_published: true }, '-created_date', 100);
      return Array.isArray(res) ? res : [];
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const creatorMap = useMemo(() =>
    creators.reduce((acc, c) => { acc[c.id] = c; return acc; }, {}),
    [creators]
  );

  // Normalized content pool
  const allContent = useMemo(() => {
    const videoContent = videos.map(v => ({
      ...v, _key: `video-${v.id}`, type: 'video', creator: creatorMap[v.creator_id]
    }));
    const musicContent = musicVideos.map(m => ({
      ...m, _key: `music-${m.id}`, type: 'music', category: 'music', creator: creatorMap[m.creator_id]
    }));
    return [...videoContent, ...musicContent];
  }, [videos, musicVideos, creatorMap]);

  // Shorts
  const shortsContent = useMemo(() =>
    allContent.filter(v => v.video_type === 'short'),
    [allContent]
  );

  // Filtered feed
  const feedContent = useMemo(() => {
    let content = [...allContent].filter(v => v.video_type !== 'short');
    
    // Category-based filters
    if (selectedCategory === 'live') {
      return content.filter(c => c.creator?.is_live);
    }
    if (selectedCategory === 'shorts') {
      return allContent.filter(v => v.video_type === 'short');
    }
    if (selectedCategory === 'recently_uploaded') {
      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      content = content.filter(c => new Date(c.created_date) > weekAgo);
    } else if (selectedCategory !== 'all') {
      content = content.filter(c => c.category === selectedCategory);
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      content = content.filter(c =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.creator?.display_name?.toLowerCase().includes(q) ||
        c.tags?.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort: trending by default (weighted views+likes+recency)
    content.sort((a, b) => {
      const now = Date.now();
      const ageA = (now - new Date(a.created_date).getTime()) / (1000 * 3600);
      const ageB = (now - new Date(b.created_date).getTime()) / (1000 * 3600);
      const scoreA = ((a.view_count || 0) + (a.like_count || 0) * 5) / Math.max(Math.log2(ageA + 2), 1);
      const scoreB = ((b.view_count || 0) + (b.like_count || 0) * 5) / Math.max(Math.log2(ageB + 2), 1);
      return scoreB - scoreA;
    });

    return content;
  }, [allContent, selectedCategory, searchQuery]);

  // Show shorts shelf on "all" category when not searching
  const showShortsShelf = selectedCategory === 'all' && !searchQuery && shortsContent.length > 0;
  const isShowingShorts = selectedCategory === 'shorts';

  return (
    <div className="min-h-screen bg-stone-950 pt-16 pb-24">
      <div className="max-w-[1800px] mx-auto px-4">

        {/* ── Search bar (YouTube-style toggle) ── */}
        <AnimatePresence>
          {showSearch && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="sticky top-16 z-30 bg-stone-950/95 backdrop-blur-md pb-3 pt-3 -mx-4 px-4"
            >
              <div className="flex gap-2 items-center max-w-2xl mx-auto">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-500" />
                  <Input
                    autoFocus
                    placeholder="Search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 h-10 bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500 rounded-full focus:border-blue-500"
                  />
                </div>
                <Button
                  variant="ghost" size="icon"
                  onClick={() => { setShowSearch(false); setSearchQuery(''); }}
                  className="text-stone-400 hover:text-white shrink-0"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Toolbar ── */}
        {!showSearch && (
          <div className="flex items-center justify-between py-3 sticky top-16 z-20 bg-stone-950/95 backdrop-blur-md -mx-4 px-4">
            <h1 className="text-white font-semibold text-lg">Amphitheatre</h1>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost" size="icon"
                onClick={() => setShowSearch(true)}
                className="text-stone-300 hover:text-white"
              >
                <Search className="w-5 h-5" />
              </Button>
              {user && (
                <Link to={createPageUrl('VideoUpload')}>
                  <Button variant="ghost" size="icon" className="text-stone-300 hover:text-white">
                    <Video className="w-5 h-5" />
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}

        {/* ── Category chips ── */}
        <CategoryChips selected={selectedCategory} onChange={setSelectedCategory} />

        {/* ── Shorts shelf (inline, YouTube-style) ── */}
        {showShortsShelf && (
          <div className="mt-6">
            <ShortsShelf shorts={shortsContent} />
          </div>
        )}

        {/* ── Loading ── */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-8 mt-6">
            {[...Array(12)].map((_, i) => (
              <div key={i}>
                <Skeleton className="aspect-video rounded-xl bg-stone-800 mb-3" />
                <div className="flex gap-3">
                  <Skeleton className="w-9 h-9 rounded-full bg-stone-800" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full bg-stone-800" />
                    <Skeleton className="h-3 w-2/3 bg-stone-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Video grid ── */}
        {!isLoading && (
          <div className={`mt-6 grid gap-x-4 gap-y-8 ${
            isShowingShorts
              ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
              : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {feedContent.map((content) => (
              <VideoFeedCard
                key={content._key || `${content.type}-${content.id}`}
                content={content}
                isShort={isShowingShorts}
              />
            ))}
          </div>
        )}

        {/* ── Empty state ── */}
        {!isLoading && feedContent.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-stone-700 mx-auto mb-4" />
            <h3 className="text-stone-300 font-medium text-lg mb-2">No results found</h3>
            <p className="text-stone-500 text-sm mb-4">Try a different search or category</p>
            <Button
              onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
              variant="outline"
              className="border-stone-700 text-stone-300"
            >
              Clear filters
            </Button>
          </div>
        )}

        {/* Interest Picker Modal */}
        {showInterestPicker && (
          <InterestSelector
            userInterests={userInterests}
            onClose={() => setShowInterestPicker(false)}
            onSave={() => {
              queryClient.invalidateQueries(['user-interests']);
              setShowInterestPicker(false);
            }}
          />
        )}

        {/* Direct Messaging Modal */}
        <DirectMessaging
          isOpen={showMessages}
          onClose={() => setShowMessages(false)}
        />
      </div>
    </div>
  );
}