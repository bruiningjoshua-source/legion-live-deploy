import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare, Users, Clock, Eye, MessageCircle, Pin, Lock,
  Plus, Search, ChevronRight, Flame, Star, TrendingUp, Scroll,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = [
  { name: 'General Discussion',    icon: '💬', color: 'amber', description: 'Chat about anything'          },
  { name: 'Gaming',                icon: '🎮', color: 'purple', description: 'Gaming content and discussions' },
  { name: 'Music',                 icon: '🎵', color: 'pink',   description: 'Music production and sharing'  },
  { name: 'Tech & Tutorials',      icon: '💻', color: 'blue',   description: 'Tech tips and how-tos'         },
  { name: 'Feedback & Suggestions',icon: '💡', color: 'green',  description: 'Platform feedback'             },
  { name: 'Announcements',         icon: '📢', color: 'red',    description: 'Official announcements', isOfficial: true },
];

function PostCard({ post, creatorMap, categoryMap }) {
  const author = creatorMap[post.author_email];
  const category = categoryMap[post.category_id];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Link to={createPageUrl(`ForumPost?id=${post.id}`)}>
        <div className="group flex items-start gap-3 p-4 rounded-xl border border-amber-700/15 hover:border-amber-600/35 transition-all cursor-pointer"
          style={{ background: 'rgba(20,15,6,0.7)' }}>

          <Avatar className="w-9 h-9 shrink-0 mt-0.5">
            <AvatarImage src={author?.avatar_url} />
            <AvatarFallback className="bg-amber-900/60 text-amber-300 text-xs font-bold border border-amber-700/30">
              {post.author_email?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              {post.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
              {post.is_locked && <Lock className="w-3.5 h-3.5 text-red-400/70 shrink-0" />}
              <h3 className="text-white/90 font-semibold text-sm truncate group-hover:text-amber-200 transition-colors">{post.title}</h3>
            </div>
            <p className="text-white/35 text-xs line-clamp-1 mb-2">{post.content}</p>
            <div className="flex items-center gap-3 text-[10px] text-amber-600/50 flex-wrap">
              <span className="font-medium text-amber-500/60">{author?.display_name || post.author_email?.split('@')[0]}</span>
              {category && (
                <span className="bg-amber-900/30 border border-amber-700/20 text-amber-400/70 px-2 py-0.5 rounded-full">
                  {category.icon} {category.name}
                </span>
              )}
              <span className="flex items-center gap-1"><Eye className="w-2.5 h-2.5" />{post.view_count || 0}</span>
              <span className="flex items-center gap-1"><MessageCircle className="w-2.5 h-2.5" />{post.reply_count || 0}</span>
              <span>{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</span>
            </div>
          </div>

          <ChevronRight className="w-4 h-4 text-amber-700/30 group-hover:text-amber-500/50 shrink-0 mt-2 transition-colors" />
        </div>
      </Link>
    </motion.div>
  );
}

export default function CommunityForums() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category_id: '' });
  const [activeTab, setActiveTab] = useState('recent');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({ queryKey: ['current-user'], queryFn: () => base44.auth.me() });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: () => base44.entities.ForumCategory.list('sort_order', 50),
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['forum-posts', selectedCategory],
    queryFn: () => selectedCategory
      ? base44.entities.ForumPost.filter({ category_id: selectedCategory }, '-created_date', 100)
      : base44.entities.ForumPost.list('-created_date', 100),
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['forum-creators'],
    queryFn: () => base44.entities.Creator.list(null, 200),
    staleTime: 5 * 60 * 1000,
  });

  const creatorMap = creators.reduce((acc, c) => { acc[c.user_email] = c; return acc; }, {});
  const categoryMap = categories.reduce((acc, c) => { acc[c.id] = c; return acc; }, {});

  const initCategoriesMutation = useMutation({
    mutationFn: async () => {
      if (categories.length === 0) {
        await base44.entities.ForumCategory.bulkCreate(
          DEFAULT_CATEGORIES.map((cat, i) => ({
            name: cat.name, icon: cat.icon, color: cat.color,
            description: cat.description, is_official: cat.isOfficial || false, sort_order: i,
          }))
        );
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['forum-categories']),
  });

  React.useEffect(() => {
    if (!categoriesLoading && categories.length === 0) initCategoriesMutation.mutate();
  }, [categoriesLoading, categories.length]);

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.ForumPost.create({ ...data, author_email: user.email }),
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-posts']);
      setShowNewPostDialog(false);
      setNewPost({ title: '', content: '', category_id: '' });
      toast.success('Proclamation posted to the Senate!');
    },
  });

  const filteredPosts = posts.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const trendingPosts = [...posts]
    .sort((a, b) => ((b.view_count || 0) + (b.reply_count || 0) * 5) - ((a.view_count || 0) + (a.reply_count || 0) * 5))
    .slice(0, 10);

  const popularPosts = [...posts]
    .sort((a, b) => (b.like_count || 0) - (a.like_count || 0))
    .slice(0, 10);

  return (
    <div className="min-h-screen pt-16 pb-24" style={{ background: 'linear-gradient(180deg, #0d0a06 0%, #0f0c07 50%, #0a0804 100%)' }}>
      <div className="max-w-6xl mx-auto px-4">

        {/* ── Header ── */}
        <div className="pt-8 pb-6">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
            <Scroll className="w-3.5 h-3.5 text-amber-400/70" />
            <span className="text-amber-400/70 text-[10px] font-black uppercase tracking-[0.2em]">Senatus Populusque Romanus</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-black mb-1">
                <span className="text-transparent bg-clip-text bg-gradient-to-b from-amber-200 via-amber-400 to-amber-600">THE</span>
                <span className="text-white/90 ml-2">SENATE</span>
              </h1>
              <p className="text-amber-600/50 text-xs font-medium">Community Discussions · Debates · Proclamations</p>
            </div>

            {user && (
              <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
                <DialogTrigger asChild>
                  <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-300 text-sm font-bold transition-all shrink-0">
                    <Plus className="w-4 h-4" />
                    New Proclamation
                  </button>
                </DialogTrigger>
                <DialogContent className="border-amber-700/30 rounded-2xl" style={{ background: '#0f0c07' }}>
                  <DialogHeader>
                    <DialogTitle className="text-amber-200 font-black">Post to the Senate</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <Select value={newPost.category_id} onValueChange={(v) => setNewPost({ ...newPost, category_id: v })}>
                      <SelectTrigger className="bg-amber-900/20 border-amber-700/30 text-white rounded-xl">
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent className="border-amber-700/30 rounded-xl" style={{ background: '#0f0c07' }}>
                        {categories.filter(c => !c.is_official || user?.role === 'admin').map(cat => (
                          <SelectItem key={cat.id} value={cat.id} className="text-amber-200">
                            {cat.icon} {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Title of your proclamation..."
                      value={newPost.title}
                      onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                      className="bg-amber-900/20 border-amber-700/30 text-white placeholder:text-white/30 rounded-xl"
                    />
                    <Textarea
                      placeholder="Write your message to the Senate..."
                      value={newPost.content}
                      onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                      className="bg-amber-900/20 border-amber-700/30 text-white placeholder:text-white/30 rounded-xl min-h-[130px]"
                    />
                    <button
                      onClick={() => createPostMutation.mutate(newPost)}
                      disabled={!newPost.title || !newPost.content || !newPost.category_id || createPostMutation.isPending}
                      className="w-full py-2.5 rounded-xl bg-amber-600/30 hover:bg-amber-600/40 border border-amber-600/40 text-amber-200 font-bold text-sm transition-all disabled:opacity-40"
                    >
                      {createPostMutation.isPending ? 'Posting...' : 'Post Proclamation'}
                    </button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        </div>

        {/* ── Search ── */}
        <div className="relative mb-6">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
          <Input
            placeholder="Search Senate discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-amber-900/15 border-amber-700/25 text-white placeholder:text-white/25 rounded-xl focus:border-amber-500/40"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* ── Sidebar ── */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl border border-amber-700/20 overflow-hidden sticky top-20" style={{ background: 'rgba(20,15,6,0.8)' }}>
              <div className="px-4 py-3 border-b border-amber-700/20">
                <p className="text-amber-400/70 text-xs font-black uppercase tracking-widest">Categories</p>
              </div>
              <div className="p-2 space-y-0.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    !selectedCategory
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/25'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                  }`}
                >
                  📋 All Posts
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2 rounded-xl text-sm font-medium transition-all flex items-center justify-between ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/25'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span><span className="mr-1.5">{cat.icon}</span>{cat.name}</span>
                    {cat.post_count > 0 && (
                      <span className="text-[10px] text-amber-600/50">({cat.post_count})</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Main feed ── */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-amber-900/20 border border-amber-700/25 p-1 rounded-xl h-auto mb-5 gap-0.5">
                {[
                  { value: 'recent',   label: 'Recent',   icon: Clock      },
                  { value: 'trending', label: 'Trending', icon: Flame      },
                  { value: 'popular',  label: 'Popular',  icon: Star       },
                ].map(tab => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-300 data-[state=active]:border data-[state=active]:border-amber-500/25 rounded-lg px-4 py-2 text-white/40 hover:text-white/70 transition-all text-sm font-semibold flex items-center gap-1.5"
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="recent" className="space-y-2 mt-0">
                {postsLoading ? (
                  <div className="py-12 text-center">
                    <div className="w-6 h-6 rounded-full border-2 border-amber-500/40 border-t-amber-400 animate-spin mx-auto" />
                  </div>
                ) : filteredPosts.length > 0 ? (
                  filteredPosts.map(post => (
                    <PostCard key={post.id} post={post} creatorMap={creatorMap} categoryMap={categoryMap} />
                  ))
                ) : (
                  <div className="text-center py-16 rounded-2xl border border-amber-700/15" style={{ background: 'rgba(20,15,6,0.5)' }}>
                    <MessageSquare className="w-10 h-10 text-amber-500/20 mx-auto mb-3" />
                    <h3 className="text-white/70 font-bold mb-1">No Proclamations Yet</h3>
                    <p className="text-amber-600/40 text-sm">Be the first to address the Senate!</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trending" className="space-y-2 mt-0">
                {trendingPosts.length > 0 ? (
                  trendingPosts.map(post => (
                    <PostCard key={post.id} post={post} creatorMap={creatorMap} categoryMap={categoryMap} />
                  ))
                ) : (
                  <div className="text-center py-16 text-amber-600/40">No trending discussions yet.</div>
                )}
              </TabsContent>

              <TabsContent value="popular" className="space-y-2 mt-0">
                {popularPosts.length > 0 ? (
                  popularPosts.map(post => (
                    <PostCard key={post.id} post={post} creatorMap={creatorMap} categoryMap={categoryMap} />
                  ))
                ) : (
                  <div className="text-center py-16 text-amber-600/40">No popular posts yet.</div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}