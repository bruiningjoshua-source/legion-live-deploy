import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MessageSquare,
  Users,
  TrendingUp,
  Clock,
  Eye,
  MessageCircle,
  ThumbsUp,
  Pin,
  Lock,
  Plus,
  Search,
  Filter,
  ChevronRight,
  Flame,
  Star
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

const DEFAULT_CATEGORIES = [
  { name: 'General Discussion', icon: '💬', color: 'amber', description: 'Chat about anything' },
  { name: 'Gaming', icon: '🎮', color: 'purple', description: 'Gaming content and discussions' },
  { name: 'Music', icon: '🎵', color: 'pink', description: 'Music production and sharing' },
  { name: 'Tech & Tutorials', icon: '💻', color: 'blue', description: 'Tech tips and how-tos' },
  { name: 'Feedback & Suggestions', icon: '💡', color: 'green', description: 'Platform feedback' },
  { name: 'Announcements', icon: '📢', color: 'red', description: 'Official announcements', isOfficial: true }
];

export default function CommunityForums() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showNewPostDialog, setShowNewPostDialog] = useState(false);
  const [newPost, setNewPost] = useState({ title: '', content: '', category_id: '' });
  const [activeTab, setActiveTab] = useState('categories');
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: () => base44.entities.ForumCategory.list('sort_order', 50)
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ['forum-posts', selectedCategory],
    queryFn: () => selectedCategory 
      ? base44.entities.ForumPost.filter({ category_id: selectedCategory }, '-created_date', 100)
      : base44.entities.ForumPost.list('-created_date', 100)
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['forum-creators'],
    queryFn: () => base44.entities.Creator.list(null, 200),
    staleTime: 5 * 60 * 1000
  });

  const creatorMap = creators.reduce((acc, c) => {
    acc[c.user_email] = c;
    return acc;
  }, {});

  const categoryMap = categories.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {});

  // Initialize default categories if none exist
  const initCategoriesMutation = useMutation({
    mutationFn: async () => {
      if (categories.length === 0) {
        await base44.entities.ForumCategory.bulkCreate(
          DEFAULT_CATEGORIES.map((cat, i) => ({
            name: cat.name,
            icon: cat.icon,
            color: cat.color,
            description: cat.description,
            is_official: cat.isOfficial || false,
            sort_order: i
          }))
        );
      }
    },
    onSuccess: () => queryClient.invalidateQueries(['forum-categories'])
  });

  React.useEffect(() => {
    if (!categoriesLoading && categories.length === 0) {
      initCategoriesMutation.mutate();
    }
  }, [categoriesLoading, categories.length]);

  const createPostMutation = useMutation({
    mutationFn: (data) => base44.entities.ForumPost.create({
      ...data,
      author_email: user.email
    }),
    onSuccess: () => {
      queryClient.invalidateQueries(['forum-posts']);
      setShowNewPostDialog(false);
      setNewPost({ title: '', content: '', category_id: '' });
      toast.success('Post created!');
    }
  });

  const filteredPosts = posts.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.content?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const trendingPosts = [...posts]
    .sort((a, b) => ((b.view_count || 0) + (b.reply_count || 0) * 5) - ((a.view_count || 0) + (a.reply_count || 0) * 5))
    .slice(0, 10);

  const recentPosts = [...posts]
    .sort((a, b) => new Date(b.last_reply_at || b.created_date) - new Date(a.last_reply_at || a.created_date))
    .slice(0, 10);

  const PostCard = ({ post }) => {
    const author = creatorMap[post.author_email];
    const category = categoryMap[post.category_id];

    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Link to={createPageUrl(`ForumPost?id=${post.id}`)}>
          <Card className="bg-stone-800/30 border-amber-600/20 hover:border-amber-500/50 transition-all cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <Avatar className="w-10 h-10">
                  <AvatarImage src={author?.avatar_url} />
                  <AvatarFallback className="bg-amber-600 text-white">
                    {post.author_email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {post.is_pinned && (
                      <Pin className="w-4 h-4 text-amber-400" />
                    )}
                    {post.is_locked && (
                      <Lock className="w-4 h-4 text-red-400" />
                    )}
                    <h3 className="text-amber-100 font-semibold truncate">{post.title}</h3>
                  </div>

                  <p className="text-amber-400/70 text-sm line-clamp-2 mb-2">{post.content}</p>

                  <div className="flex items-center gap-4 text-xs text-amber-400/60">
                    <span>{author?.display_name || post.author_email?.split('@')[0]}</span>
                    {category && (
                      <Badge className="bg-stone-700/50 text-amber-300 text-xs">
                        {category.icon} {category.name}
                      </Badge>
                    )}
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {post.view_count || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-3 h-3" />
                      {post.reply_count || 0}
                    </span>
                    <span>{formatDistanceToNow(new Date(post.created_date), { addSuffix: true })}</span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-amber-400/50" />
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-amber-100 flex items-center gap-3">
              <Users className="w-8 h-8 text-amber-400" />
              Community Forums
            </h1>
            <p className="text-amber-400/70">Discuss, share, and connect with the community</p>
          </div>

          {user && (
            <Dialog open={showNewPostDialog} onOpenChange={setShowNewPostDialog}>
              <DialogTrigger asChild>
                <Button className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-stone-900 border-amber-600/30">
                <DialogHeader>
                  <DialogTitle className="text-amber-100">Create New Post</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <Select
                    value={newPost.category_id}
                    onValueChange={(v) => setNewPost({ ...newPost, category_id: v })}
                  >
                    <SelectTrigger className="bg-stone-800 border-amber-600/20 text-amber-100">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-amber-600/30">
                      {categories.filter(c => !c.is_official || user?.role === 'admin').map(cat => (
                        <SelectItem key={cat.id} value={cat.id} className="text-amber-100">
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Input
                    placeholder="Post title"
                    value={newPost.title}
                    onChange={(e) => setNewPost({ ...newPost, title: e.target.value })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100"
                  />

                  <Textarea
                    placeholder="Write your post..."
                    value={newPost.content}
                    onChange={(e) => setNewPost({ ...newPost, content: e.target.value })}
                    className="bg-stone-800 border-amber-600/20 text-amber-100 min-h-[150px]"
                  />

                  <Button
                    onClick={() => createPostMutation.mutate(newPost)}
                    className="w-full bg-amber-600 hover:bg-amber-700"
                    disabled={!newPost.title || !newPost.content || !newPost.category_id}
                  >
                    Create Post
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/50" />
          <Input
            placeholder="Search discussions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 bg-stone-800/50 border-amber-600/20 text-amber-100 rounded-xl"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <Card className="bg-stone-800/30 border-amber-600/20 sticky top-24">
              <CardHeader>
                <CardTitle className="text-amber-100 text-lg">Categories</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left p-3 rounded-lg transition-colors ${
                    !selectedCategory ? 'bg-amber-600 text-white' : 'text-amber-300 hover:bg-stone-700/50'
                  }`}
                >
                  📋 All Posts
                </button>
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      selectedCategory === cat.id ? 'bg-amber-600 text-white' : 'text-amber-300 hover:bg-stone-700/50'
                    }`}
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.name}
                    <span className="text-xs ml-2 opacity-60">({cat.post_count || 0})</span>
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
              <TabsList className="bg-stone-800/50 border border-amber-600/20">
                <TabsTrigger value="categories" className="data-[state=active]:bg-amber-600">
                  <Clock className="w-4 h-4 mr-2" />
                  Recent
                </TabsTrigger>
                <TabsTrigger value="trending" className="data-[state=active]:bg-amber-600">
                  <Flame className="w-4 h-4 mr-2" />
                  Trending
                </TabsTrigger>
                <TabsTrigger value="popular" className="data-[state=active]:bg-amber-600">
                  <Star className="w-4 h-4 mr-2" />
                  Popular
                </TabsTrigger>
              </TabsList>

              <TabsContent value="categories" className="space-y-4">
                {postsLoading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full mx-auto" />
                  </div>
                ) : filteredPosts.length > 0 ? (
                  <AnimatePresence>
                    {filteredPosts.map(post => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </AnimatePresence>
                ) : (
                  <Card className="bg-stone-800/30 border-amber-600/20">
                    <CardContent className="py-12 text-center">
                      <MessageSquare className="w-12 h-12 text-amber-400/30 mx-auto mb-4" />
                      <h3 className="text-amber-100 font-semibold mb-2">No Posts Yet</h3>
                      <p className="text-amber-400/60">Be the first to start a discussion!</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              <TabsContent value="trending" className="space-y-4">
                {trendingPosts.map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </TabsContent>

              <TabsContent value="popular" className="space-y-4">
                {[...posts].sort((a, b) => (b.like_count || 0) - (a.like_count || 0)).slice(0, 10).map(post => (
                  <PostCard key={post.id} post={post} />
                ))}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}