import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Flame, Clock, TrendingUp, ArrowBigUp, Sword } from 'lucide-react';
import { toast } from 'sonner';
import ForumPostCard from '@/components/forum/ForumPostCard';
import ForumSidebar from '@/components/forum/ForumSidebar';
import CreatePostModal from '@/components/forum/CreatePostModal';

const SORT_OPTIONS = [
  { id: 'hot', label: 'Hot', icon: Flame },
  { id: 'new', label: 'New', icon: Clock },
  { id: 'top', label: 'Top', icon: TrendingUp },
  { id: 'rising', label: 'Rising', icon: ArrowBigUp },
];

export default function CommunityForums() {
  const [sortBy, setSortBy] = useState('hot');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: () => base44.entities.ForumCategory.list('sort_order', 50),
    staleTime: 5 * 60 * 1000,
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['forum-creators'],
    queryFn: () => base44.entities.Creator.list(null, 200),
    staleTime: 5 * 60 * 1000,
  });

  const sortField = sortBy === 'new' ? '-created_date'
    : sortBy === 'top' ? '-like_count'
    : sortBy === 'rising' ? '-view_count'
    : '-like_count'; // hot = top for now

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['forum-posts', sortBy, selectedCategory],
    queryFn: () => {
      if (selectedCategory) {
        return base44.entities.ForumPost.filter({ category_id: selectedCategory }, sortField, 50);
      }
      return base44.entities.ForumPost.list(sortField, 50);
    },
    staleTime: 60 * 1000,
  });

  const creatorMap = useMemo(() => creators.reduce((acc, c) => {
    acc[c.user_email] = c;
    return acc;
  }, {}), [creators]);

  const categoryMap = useMemo(() => categories.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {}), [categories]);

  const filtered = useMemo(() => {
    if (!searchQuery) return posts;
    const q = searchQuery.toLowerCase();
    return posts.filter(p =>
      p.title?.toLowerCase().includes(q) ||
      p.content?.toLowerCase().includes(q) ||
      p.tags?.some(t => t.toLowerCase().includes(q))
    );
  }, [posts, searchQuery]);

  const upvoteMutation = useMutation({
    mutationFn: async (postId) => {
      const post = posts.find(p => p.id === postId);
      if (post) await base44.entities.ForumPost.update(postId, { like_count: (post.like_count || 0) + 1 });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-posts'] }),
  });

  const downvoteMutation = useMutation({
    mutationFn: async (postId) => {
      const post = posts.find(p => p.id === postId);
      if (post) await base44.entities.ForumPost.update(postId, { downvote_count: (post.downvote_count || 0) + 1 });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['forum-posts'] }),
  });

  const memberCount = creators.length || 0;

  return (
    <div className="min-h-screen text-white pt-16 pb-24">
      {/* BG */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#0a0a0f]" />
        <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-amber-900/15 to-transparent" />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-4">
        {/* Banner */}
        <div className="relative rounded-xl overflow-hidden mb-4">
          <div className="h-20 bg-gradient-to-r from-amber-700 via-red-700 to-amber-700" />
          <div className="bg-white/[0.03] border border-white/[0.06] border-t-0 rounded-b-xl px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 -mt-8 rounded-full bg-gradient-to-br from-amber-500 to-red-600 border-4 border-[#0a0a0f] flex items-center justify-center text-2xl shadow-lg">
                <Sword className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-white font-bold text-lg leading-tight">The Senate</h1>
                <p className="text-white/40 text-xs">s/TheSenate • {memberCount.toLocaleString()} legionnaires</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => user ? setShowCreateModal(true) : toast.error('Sign in to post')}
                className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-black font-bold text-xs px-4 h-8 rounded-full transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Create Post
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          {/* Main Feed */}
          <div className="flex-1 min-w-0">
            {/* Sort & Search bar */}
            <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-2.5 mb-3 flex items-center gap-2">
              {/* Sort pills */}
              <div className="flex items-center gap-1">
                {SORT_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setSortBy(opt.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all ${
                        sortBy === opt.id
                          ? 'bg-white/[0.1] text-white'
                          : 'text-white/35 hover:text-white/60 hover:bg-white/[0.04]'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{opt.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="flex-1" />

              {/* Search */}
              <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-lg px-2 h-7 w-40 sm:w-48">
                <Search className="w-3 h-3 text-white/30 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="bg-transparent text-white text-[11px] placeholder:text-white/30 outline-none flex-1 min-w-0"
                />
              </div>
            </div>

            {/* Category filter chips (mobile) */}
            {categories.length > 0 && (
              <div className="flex gap-1.5 overflow-x-auto scrollbar-hide mb-3 lg:hidden pb-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`flex-shrink-0 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                    !selectedCategory ? 'bg-amber-500 text-black' : 'bg-white/[0.05] text-white/50 hover:text-white'
                  }`}
                >
                  All
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                    className={`flex-shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                      selectedCategory === cat.id ? 'bg-amber-500 text-black' : 'bg-white/[0.05] text-white/50 hover:text-white'
                    }`}
                  >
                    <span className="text-xs">{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
              </div>
            )}

            {/* Post feed */}
            <div className="rounded-xl overflow-hidden border border-white/[0.06]">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-24 bg-white/[0.02] border-b border-white/[0.04] animate-pulse" />
                ))
              ) : filtered.length === 0 ? (
                <div className="text-center py-20 bg-white/[0.02]">
                  <Sword className="w-12 h-12 text-white/10 mx-auto mb-3" />
                  <p className="text-white/30 text-sm mb-1">No posts yet</p>
                  <p className="text-white/20 text-xs">Be the first to start a discussion</p>
                </div>
              ) : (
                filtered.map(post => (
                  <ForumPostCard
                    key={post.id}
                    post={post}
                    category={categoryMap[post.category_id]}
                    author={creatorMap[post.author_email]}
                    onUpvote={(id) => user ? upvoteMutation.mutate(id) : toast.error('Sign in to vote')}
                    onDownvote={(id) => user ? downvoteMutation.mutate(id) : toast.error('Sign in to vote')}
                  />
                ))
              )}
            </div>
          </div>

          {/* Sidebar (desktop) */}
          <div className="hidden lg:block">
            <ForumSidebar
              categories={categories}
              stats={{ members: memberCount.toLocaleString(), online: Math.max(1, Math.floor(memberCount * 0.07)).toString() }}
            />
          </div>
        </div>
      </div>

      {/* Create Post Modal */}
      <CreatePostModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        categories={categories}
        user={user}
      />
    </div>
  );
}