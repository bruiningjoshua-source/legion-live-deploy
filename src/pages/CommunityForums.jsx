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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Users, TrendingUp, Clock, Eye, MessageCircle, Pin, Lock, Plus, Search, ChevronRight, Flame, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = [
  { name: 'General Discussion', icon: '💬', color: 'amber',  description: 'Chat about anything'             },
  { name: 'Gaming',             icon: '🎮', color: 'purple', description: 'Gaming content and discussions'  },
  { name: 'Music',              icon: '🎵', color: 'pink',   description: 'Music production and sharing'    },
  { name: 'Tech & Tutorials',   icon: '💻', color: 'blue',   description: 'Tech tips and how-tos'           },
  { name: 'Feedback',           icon: '💡', color: 'green',  description: 'Platform feedback & suggestions' },
  { name: 'Announcements',      icon: '📢', color: 'red',    description: 'Official announcements', isOfficial: true },
];

function PostCard({ post, creatorMap, categoryMap }) {
  const author = creatorMap[post.author_email];
  const category = categoryMap[post.category_id];

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Link to={createPageUrl(`ForumPost?id=${post.id}`)}>
        <div className="group bg-white/[0.03] hover:bg-white/[0.06] border border-amber-700/15 hover:border-amber-600/30 rounded-2xl p-4 transition-all duration-200 cursor-pointer">
          <div className="flex items-start gap-3">
            <Avatar className="w-9 h-9 shrink-0">
              <AvatarImage src={author?.avatar_url} />
              <AvatarFallback className="bg-amber-700/30 text-amber-300 text-xs font-bold">
                {post.author_email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                {post.is_pinned && <Pin className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                {post.is_locked && <Lock className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                <h3 className="text-white/90 font-semibold text-sm truncate group-hover:text-white transition-colors">{post.title}</h3>
              </div>
              <p className="text-white/40 text-xs line-clamp-2 mb-2.5 leading-relaxed">{post.content}</p>
              <div className="flex items-center gap-3 text-[10px] text-white/30 flex-wrap">
                <span className="text-amber-400/60 font-medium">{author?.display_name || post.author_email?.split('@')[0]}</span>
                {category && (
                  <span className="bg-white/[0.05] border border-white/10 rounded-full px-2 py-0.5">
                    {category.icon} {category.name}
                  </span>
                )}
                <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count || 0}</span>
                <span className="flex items-center gap-1"><MessageCircle className="w-3 h-3" />{post.reply_count || 0}</span>
                <span>{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</span>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-400/60 transition-colors shrink-0 mt-1" />
          </div>
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
    queryFn: () =>
      selectedCategory
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
      toast.success('Post created in the Senate!');
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

  const cardProps = { creatorMap, categoryMap };

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="max-w-6xl mx-auto px-4">

        {/* ── Header ── */}
        <div className="pt-8 pb-6">
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="h-px w-12 bg-gradient-to-r from-transparent to-amber-700/40" />
            <span className="text-amber-600/50 text-[10px] font-bold uppercase tracking-widest">The Senate</span>
            <div className="h-px w-12 bg-gradient-to-l from-transparent to-amber-700/40" />
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-orange-400 text-center mb-1">
            Community Forums
          </h1>
          <p className="text-white/30 text-sm text-center">Discuss, debate, and connect with the Legion</p>
        </div>

        {/* ── Search + New Post ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500/40" />
            <Input
              placeholder="Search the Senate..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 bg-white/[0.04] border-amber-700/25 text-white placeholder:text-white/25 rounded-xl focus:border-amber-500/50 focus:bg-white/[0.06]"
            />
          </div>
          {user && (
            <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
              <DialogTrigger asChild>
                <Button className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white h-11 px-5 font-bold rounded-xl shadow-lg shadow-amber-500/15 border border-amber-500/30 shrink-0">
                  <Plus className="w-4 h-4 mr-1.5" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#0f0d08] border-amber-700/30 rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="text-amber-200 font-black">Address the Senate</DialogTitle>
                </DialogHeader>
                <div className="space-y-3 mt-2">
                  <Select value={newPost.category_id} onValueChange={(v) => setNewPost({ ...newPost, category_id: v })}>
                    <SelectTrigger className="bg-white/[0.04] border-amber-700/25 text-white rounded-xl">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#0f0d08] border-amber-700/30">
                      {categories.filter(c => !c.is_official || user?.role === 'admin').map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-white/80">
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Post title"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="bg-white/[0.04] border-amber-700/25 text-white placeholder:text-white/30 rounded-xl"
                  />
                  <Textarea
                    placeholder="Write your post..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="bg-white/[0.04] border-amber-700/25 text-white placeholder:text-white/30 rounded-xl min-h-[140px]"
                  />
                  <Button
                    onClick={() => createPostMutation.mutate(newPost)}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 font-bold rounded-xl"
                    disabled={!newPost.title || !newPost.content || !newPost.category_id || createPostMutation.isPending}
                  >
                    {createPostMutation.isPending ? 'Posting...' : 'Post to Senate'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white/[0.02] border border-amber-700/15 rounded-2xl overflow-hidden sticky top-24">
              <div className="px-4 py-3 border-b border-amber-700/15">
                <p className="text-amber-600/60 text-[10px] font-bold uppercase tracking-widest">Categories</p>
              </div>
              <div className="p-2 space-y-0.5">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                    !selectedCategory
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                      : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                  }`}
                >
                  📋 All Posts
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-sm transition-all ${
                      selectedCategory === cat.id
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/25'
                        : 'text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.name}
                    <span className="text-xs ml-1.5 opacity-40">({cat.post_count || 0})</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Main content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="bg-white/[0.04] border border-amber-700/15 rounded-2xl p-1 h-auto gap-1 mb-5">
                <TabsTrigger value="recent" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl px-4 py-2 text-white/40 text-xs font-bold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> Recent
                </TabsTrigger>
                <TabsTrigger value="trending" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl px-4 py-2 text-white/40 text-xs font-bold flex items-center gap-1.5">
                  <Flame className="w-3.5 h-3.5" /> Trending
                </TabsTrigger>
                <TabsTrigger value="popular" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white rounded-xl px-4 py-2 text-white/40 text-xs font-bold flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5" /> Popular
                </TabsTrigger>
              </TabsList>

              <TabsContent value="recent" className="space-y-3 mt-0">
                {postsLoading ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="w-8 h-8 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
                  </div>
                ) : filteredPosts.length > 0 ? (
                  filteredPosts.map(post => <PostCard key={post.id} post={post} {...cardProps} />)
                ) : (
                  <div className="text-center py-16">
                    <MessageSquare className="w-12 h-12 text-amber-700/30 mx-auto mb-4" />
                    <h3 className="text-white/50 font-bold mb-2">No Posts Yet</h3>
                    <p className="text-white/25 text-sm">Be the first to address the Senate!</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="trending" className="space-y-3 mt-0">
                {trendingPosts.map(post => <PostCard key={post.id} post={post} {...cardProps} />)}
              </TabsContent>

              <TabsContent value="popular" className="space-y-3 mt-0">
                {popularPosts.map(post => <PostCard key={post.id} post={post} {...cardProps} />)}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}