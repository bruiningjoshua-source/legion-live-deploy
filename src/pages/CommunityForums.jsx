import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  MessageSquare, Users, TrendingUp, Flame, ChevronRight,
  Plus, Hash, Search, Clock, ThumbsUp, Eye, Sword,
  Pin, Star, Award
} from 'lucide-react';

const TABS = ['Trending', 'Latest', 'Following'];

const mockCategories = [
  { name: 'General',     icon: '⚔️', count: 1240 },
  { name: 'Gaming',      icon: '🎮', count: 856 },
  { name: 'Streams',     icon: '📺', count: 643 },
  { name: 'Trading',     icon: '💰', count: 421 },
  { name: 'Clips',       icon: '🎬', count: 318 },
  { name: 'Events',      icon: '🏆', count: 205 },
];

function PostCard({ post }) {
  return (
    <Link to={createPageUrl('ForumPost') + `?id=${post.id}`}>
      <div className="group flex gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.05] transition-all duration-200 active:scale-[0.99]">
        {/* Vote / score */}
        <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
          <div className="w-8 h-8 rounded-xl bg-white/[0.05] flex items-center justify-center">
            <ThumbsUp className="w-3.5 h-3.5 text-white/30 group-hover:text-amber-400 transition-colors" />
          </div>
          <span className="text-white/40 text-[10px] font-semibold">{post.like_count || 0}</span>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm line-clamp-2 mb-1.5 group-hover:text-amber-50 transition-colors">
            {post.title}
          </p>
          <div className="flex items-center gap-3 text-white/30 text-[10px]">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              {post.reply_count || 0} replies
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {post.view_count || 0} views
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {post.created_date ? new Date(post.created_date).toLocaleDateString() : 'Recent'}
            </span>
          </div>
          {post.tags && post.tags.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {post.tags.slice(0, 3).map(tag => (
                <span key={tag} className="text-[10px] text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded-lg">
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function CommunityForums() {
  const [activeTab, setActiveTab] = useState('Trending');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['forum-posts', activeTab],
    queryFn: () => base44.entities.ForumPost.list(
      activeTab === 'Latest' ? '-created_date' : '-like_count',
      20
    ),
    staleTime: 2 * 60 * 1000,
  });

  const filtered = searchQuery
    ? posts.filter(p => p.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : posts;

  return (
    <div className="min-h-screen text-white pt-16 bg-[#09090b]">
      {/* Roman cinematic bg */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-[#060810]" />
        <div className="absolute top-0 left-0 right-0 h-[40vh] bg-gradient-to-b from-[#001535]/50 via-[#000d20]/30 to-transparent" />
        <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[400px] h-[200px] rounded-full bg-[#0ea5e915] blur-[80px]" />
        <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-[#09090b] to-transparent" />
      </div>
      {/* Header */}
      <div className="sticky top-14 z-40 bg-[#09090b]/95 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="max-w-screen-xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sword className="w-4 h-4 text-amber-400" />
              <h1 className="text-white font-bold text-base">The Senate</h1>
            </div>
            <Link to={createPageUrl('ForumPost')}>
              <button className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-black font-semibold text-xs px-3 h-8 rounded-xl transition-all">
                <Plus className="w-3.5 h-3.5" />
                New Post
              </button>
            </Link>
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 bg-white/[0.06] border border-white/[0.08] rounded-xl px-3 h-9 mb-3">
            <Search className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search discussions…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="bg-transparent text-white text-sm placeholder:text-white/30 outline-none flex-1 min-w-0"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-white/[0.1] text-white'
                    : 'text-white/40 hover:text-white/70'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-screen-xl mx-auto px-4 py-5 relative z-10">
        <div className="flex gap-5">
          {/* Main feed */}
          <div className="flex-1 min-w-0 space-y-2">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-20 rounded-2xl bg-white/[0.04] animate-pulse" />
              ))
            ) : filtered.length === 0 ? (
              <div className="text-center py-20">
                <MessageSquare className="w-12 h-12 text-white/10 mx-auto mb-3" />
                <p className="text-white/30 text-sm">No posts yet — be the first!</p>
              </div>
            ) : (
              filtered.map(post => <PostCard key={post.id} post={post} />)
            )}
          </div>

          {/* Sidebar (desktop) */}
          <div className="hidden lg:flex flex-col gap-3 w-56 flex-shrink-0">
            {/* Categories */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
              <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-3">Topics</p>
              <div className="space-y-1">
                {mockCategories.map(cat => (
                  <div key={cat.name} className="flex items-center justify-between py-1.5 group cursor-pointer">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-white/70 text-xs group-hover:text-white transition-colors">{cat.name}</span>
                    </div>
                    <span className="text-white/25 text-[10px]">{cat.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Community stats */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
              <p className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-3">Senate</p>
              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Members</span>
                  <span className="text-white/70 font-semibold">12.4K</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Online now</span>
                  <span className="text-emerald-400 font-semibold">847</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Posts today</span>
                  <span className="text-amber-400 font-semibold">234</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}