import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Play,
  Music,
  Flame,
  TrendingUp,
  Clock,
  Eye,
  Plus,
  Grid,
  LayoutList,
  Upload,
  Film,
  Sparkles,
  ThumbsUp,
  Users,
  Video,
  Filter,
  History,
  Heart,
  Compass,
  ShoppingBag,
  Tag,
  ExternalLink,
  Gift,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AmphitheatreVideoCard from '@/components/amphitheatre/AmphitheatreVideoCard';
import InterestSelector from '@/components/amphitheatre/InterestSelector';
import DirectMessaging from '@/components/community/DirectMessaging';
import AutoPlaylist from '@/components/amphitheatre/AutoPlaylist';

const CATEGORIES = [
  { value: 'all', label: 'All', icon: '🎬' },
  { value: 'gaming', label: 'Gaming', icon: '🎮' },
  { value: 'music', label: 'Music', icon: '🎵' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎬' },
  { value: 'education', label: 'Education', icon: '📚' },
  { value: 'howto', label: 'How-to', icon: '✨' },
  { value: 'sports', label: 'Sports', icon: '⚽' },
  { value: 'comedy', label: 'Comedy', icon: '😂' },
  { value: 'tech', label: 'Tech', icon: '💻' },
  { value: 'travel', label: 'Travel', icon: '✈️' },
  { value: 'food', label: 'Food', icon: '🍳' },
  { value: 'fitness', label: 'Fitness', icon: '💪' },
  { value: 'vlogs', label: 'Vlogs', icon: '📹' },
  { value: 'other', label: 'Other', icon: '📦' }
];

const SORT_OPTIONS = [
  { value: 'trending', label: 'Trending', icon: TrendingUp },
  { value: 'newest', label: 'Newest', icon: Clock },
  { value: 'popular', label: 'Most Viewed', icon: Eye },
  { value: 'liked', label: 'Most Liked', icon: ThumbsUp }
];

export default function TheAmphitheatre() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [viewMode, setViewMode] = useState('grid');
  const [activeSection, setActiveSection] = useState('discover');
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

  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['amphitheatre-videos'],
    queryFn: () => base44.entities.VlogVideo.filter({ 
      is_published: true, 
      review_status: 'approved',
      visibility: 'public'
    }, '-created_date', 200),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: creators = [] } = useQuery({
    queryKey: ['amphitheatre-creators'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 100),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: musicVideos = [] } = useQuery({
    queryKey: ['amphitheatre-music'],
    queryFn: () => base44.entities.Music.filter({ is_published: true }, '-created_date', 100),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  // Affiliate/Recommended Products Videos
  const { data: affiliateVideos = [] } = useQuery({
    queryKey: ['amphitheatre-affiliate-videos'],
    queryFn: () => base44.entities.AffiliateVideo.filter({ is_published: true }, '-created_date', 100),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const { data: affiliatePartners = [] } = useQuery({
    queryKey: ['affiliate-partners-map'],
    queryFn: () => base44.entities.AffiliatePartner.filter({ status: 'approved' }, null, 200),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false
  });

  const partnerMap = useMemo(() =>
    affiliatePartners.reduce((acc, p) => {
      acc[p.id] = p;
      return acc;
    }, {}), [affiliatePartners]
  );

  const creatorMap = useMemo(() =>
    creators.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {}), [creators]
  );

  // Separate shorts and long-form videos
  const shortsContent = useMemo(() => {
    return videos
      .filter(v => v.video_type === 'short')
      .map(v => ({ ...v, type: 'video', creator: creatorMap[v.creator_id] }));
  }, [videos, creatorMap]);

  const longFormContent = useMemo(() => {
    return videos
      .filter(v => v.video_type === 'long_form' || !v.video_type)
      .map(v => ({ ...v, type: 'video', creator: creatorMap[v.creator_id] }));
  }, [videos, creatorMap]);

  // Combine videos and music
  const allContent = useMemo(() => {
    const videoContent = videos.map(v => ({
      ...v,
      type: 'video',
      creator: creatorMap[v.creator_id]
    }));
    
    const musicContent = musicVideos.map(m => ({
      ...m,
      type: 'music',
      category: 'music',
      creator: creatorMap[m.creator_id]
    }));

    return [...videoContent, ...musicContent];
  }, [videos, musicVideos, creatorMap]);

  // Filter and sort content
  const filteredContent = useMemo(() => {
    let content = [...allContent];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      content = content.filter(c =>
        c.title?.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query) ||
        c.creator?.display_name?.toLowerCase().includes(query) ||
        c.tags?.some(t => t.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (selectedCategory !== 'all') {
      content = content.filter(c => c.category === selectedCategory);
    }

    // Sort
    switch (sortBy) {
      case 'trending':
        content.sort((a, b) => {
          const scoreA = (a.view_count || 0) + (a.like_count || 0) * 5;
          const scoreB = (b.view_count || 0) + (b.like_count || 0) * 5;
          return scoreB - scoreA;
        });
        break;
      case 'newest':
        content.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        break;
      case 'popular':
        content.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case 'liked':
        content.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
        break;
    }

    return content;
  }, [allContent, searchQuery, selectedCategory, sortBy]);

  // Personalized recommendations based on interests
  const recommendedContent = useMemo(() => {
    if (!userInterests?.interests?.length) return [];
    
    return allContent
      .filter(c => 
        c.interests?.some(i => userInterests.interests.includes(i)) ||
        userInterests.preferred_categories?.includes(c.category)
      )
      .slice(0, 12);
  }, [allContent, userInterests]);

  // Trending creators
  const trendingCreators = useMemo(() => {
    return creators
      .filter(c => c.is_live || (c.follower_count || 0) > 10)
      .slice(0, 8);
  }, [creators]);

  const isLoading = videosLoading;

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-amber-100 flex items-center gap-3">
                <Film className="w-7 h-7 text-red-500" />
                The Amphitheatre
              </h1>
              <p className="text-amber-400/70 text-sm">Discover videos, music, and creators</p>
            </div>
            
            {user && (
              <div className="flex flex-wrap items-center gap-2">
                <Button 
                  onClick={() => setShowMessages(true)}
                  variant="outline" 
                  size="sm"
                  className="border-cyan-600/30 text-cyan-300 h-9"
                >
                  <MessageSquare className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Messages</span>
                </Button>
                <Button 
                  onClick={() => setShowInterestPicker(true)}
                  variant="outline" 
                  size="sm"
                  className="border-amber-600/30 text-amber-300 h-9"
                >
                  <Heart className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Interests</span>
                </Button>
                <Link to={createPageUrl('CreatorStudio')}>
                  <Button variant="outline" size="sm" className="border-amber-600/30 text-amber-300 h-9">
                    <Video className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Studio</span>
                  </Button>
                </Link>
                <Link to={createPageUrl('VideoUpload')}>
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 h-9">
                    <Upload className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Upload</span>
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="relative mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { id: 'discover', label: 'Discover', icon: Compass },
              { id: 'shorts', label: 'Shorts', icon: Play },
              { id: 'longform', label: 'Long Form', icon: Film },
              { id: 'trending', label: 'Trending', icon: TrendingUp },
              { id: 'foryou', label: 'For You', icon: Sparkles },
              { id: 'recommended', label: 'Products', icon: ShoppingBag },
              { id: 'history', label: 'History', icon: History },
              { id: 'community', label: 'Community', icon: Users }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSection(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-sm whitespace-nowrap transition-all ${
                    activeSection === tab.id
                      ? 'bg-red-600 text-white font-medium'
                      : 'bg-stone-800/60 text-amber-300/80 hover:bg-stone-700/60 hover:text-amber-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-400/50" />
            <Input
              placeholder="Search videos, creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 bg-stone-800/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40 rounded-lg"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap sm:flex-nowrap">
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-32 h-10 bg-stone-800/50 border-amber-600/20 text-amber-100 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-amber-600/30">
                {CATEGORIES.map(cat => (
                  <SelectItem key={cat.value} value={cat.value} className="text-amber-100">
                    {cat.icon} {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-28 h-10 bg-stone-800/50 border-amber-600/20 text-amber-100 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-stone-900 border-amber-600/30">
                {SORT_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value} className="text-amber-100">
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Button
              onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              variant="outline"
              size="icon"
              className="h-10 w-10 border-amber-600/20 text-amber-400 shrink-0"
            >
              {viewMode === 'grid' ? <LayoutList className="w-4 h-4" /> : <Grid className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Shorts Section */}
        {activeSection === 'shorts' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-amber-100 flex items-center gap-2">
                <Play className="w-5 h-5 text-pink-400" />
                📱 Shorts
                <Badge className="bg-pink-600/20 text-pink-300 border-pink-500/30 ml-2">
                  {shortsContent.length}
                </Badge>
              </h2>
              {user && (
                <Link to={createPageUrl('VideoUpload?type=short')}>
                  <Button className="bg-pink-600 hover:bg-pink-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Short
                  </Button>
                </Link>
              )}
            </div>
            {shortsContent.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {shortsContent.map((content, i) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <AmphitheatreVideoCard content={content} viewMode="grid" isShort />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-stone-800/30 rounded-2xl border border-pink-600/20">
                <Play className="w-12 h-12 text-pink-400/50 mx-auto mb-4" />
                <h3 className="text-amber-100 font-semibold text-lg mb-2">No Shorts Yet</h3>
                <p className="text-amber-400/60 mb-4">Be the first to upload a short video!</p>
                {user && (
                  <Link to={createPageUrl('VideoUpload?type=short')}>
                    <Button className="bg-pink-600 hover:bg-pink-700">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Short
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Long Form Section */}
        {activeSection === 'longform' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-amber-100 flex items-center gap-2">
                <Film className="w-5 h-5 text-blue-400" />
                🎬 Long Form Videos
                <Badge className="bg-blue-600/20 text-blue-300 border-blue-500/30 ml-2">
                  {longFormContent.length}
                </Badge>
              </h2>
              {user && (
                <Link to={createPageUrl('VideoUpload?type=long_form')}>
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Video
                  </Button>
                </Link>
              )}
            </div>
            {longFormContent.length > 0 ? (
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {longFormContent.map((content, i) => (
                  <motion.div
                    key={content.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <AmphitheatreVideoCard content={content} viewMode={viewMode} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-stone-800/30 rounded-2xl border border-blue-600/20">
                <Film className="w-12 h-12 text-blue-400/50 mx-auto mb-4" />
                <h3 className="text-amber-100 font-semibold text-lg mb-2">No Long Form Videos Yet</h3>
                <p className="text-amber-400/60 mb-4">Share your full-length content with the community!</p>
                {user && (
                  <Link to={createPageUrl('VideoUpload?type=long_form')}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      <Upload className="w-4 h-4 mr-2" />
                      Upload Video
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}

        {/* Recommended Products & Services Section */}
        {activeSection === 'recommended' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-amber-100 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-green-400" />
                🛒 App Recommended Products & Services
                <Badge className="bg-green-600/20 text-green-300 border-green-500/30 ml-2">
                  {affiliateVideos.length}
                </Badge>
              </h2>
            </div>
            
            {/* Category Filters for Affiliate Content */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
              {['all', 'tech', 'fashion', 'beauty', 'fitness', 'gaming', 'food', 'lifestyle', 'finance', 'education', 'health'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-green-600 text-white'
                      : 'bg-stone-800/50 text-amber-300 hover:bg-stone-700/50'
                  }`}
                >
                  {cat === 'all' ? '🏛️ All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {affiliateVideos.length > 0 ? (
              <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                {affiliateVideos
                  .filter(v => selectedCategory === 'all' || v.category === selectedCategory)
                  .map((video, i) => {
                    const partner = partnerMap[video.partner_id];
                    return (
                      <motion.div
                        key={video.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                      >
                        <Link to={createPageUrl(`WatchAffiliateVideo?id=${video.id}`)}>
                          <div className="bg-stone-800/30 rounded-xl overflow-hidden border border-green-600/20 hover:border-green-500/50 transition-all cursor-pointer group">
                            <div className={`relative bg-stone-900 ${video.video_type === 'short' ? 'aspect-[9/16]' : 'aspect-video'}`}>
                              {video.thumbnail_url ? (
                                <img src={video.thumbnail_url} className="w-full h-full object-cover" alt={video.title} />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ShoppingBag className="w-10 h-10 text-green-400/30" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Play className="w-12 h-12 text-white" />
                              </div>
                              <Badge className="absolute top-2 left-2 bg-green-600 text-white text-xs">
                                {video.brand_name}
                              </Badge>
                              {video.promo_code && (
                                <Badge className="absolute top-2 right-2 bg-amber-600 text-white text-xs">
                                  <Tag className="w-3 h-3 mr-1" />
                                  {video.promo_code}
                                </Badge>
                              )}
                            </div>
                            <div className="p-3">
                              <h3 className="text-amber-100 font-semibold text-sm line-clamp-2 mb-2">{video.title}</h3>
                              <div className="flex items-center gap-2 mb-2">
                                {video.category && (
                                  <Badge className="bg-stone-700/50 text-amber-300 text-xs">{video.category}</Badge>
                                )}
                                {video.product_type && (
                                  <Badge className="bg-blue-600/20 text-blue-300 text-xs">{video.product_type.replace('_', ' ')}</Badge>
                                )}
                              </div>
                              <div className="flex items-center justify-between text-xs text-amber-400/70">
                                <span className="flex items-center gap-1">
                                  <Eye className="w-3 h-3" />
                                  {video.view_count || 0}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Gift className="w-3 h-3" />
                                  {video.gift_count || 0}
                                </span>
                                {video.price_usd > 0 && (
                                  <span className="text-green-400 font-semibold">${video.price_usd}</span>
                                )}
                              </div>
                              {partner && (
                                <p className="text-amber-400/60 text-xs mt-2">by {partner.display_name}</p>
                              )}
                            </div>
                          </div>
                        </Link>
                      </motion.div>
                    );
                  })}
              </div>
            ) : (
              <div className="text-center py-16 bg-stone-800/30 rounded-2xl border border-green-600/20">
                <ShoppingBag className="w-12 h-12 text-green-400/50 mx-auto mb-4" />
                <h3 className="text-amber-100 font-semibold text-lg mb-2">No Product Videos Yet</h3>
                <p className="text-amber-400/60 mb-4">Affiliate partners will showcase products here</p>
              </div>
            )}
          </div>
        )}

        {/* For You - Personalized Recommendations */}
        {activeSection === 'foryou' && (
          <>
            {recommendedContent.length > 0 ? (
              <div className="mb-12">
                <h2 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  Recommended For You
                </h2>
                <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
                  {recommendedContent.map((content, i) => (
                    <motion.div
                      key={content.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <AmphitheatreVideoCard content={content} viewMode={viewMode} />
                    </motion.div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-12 bg-stone-800/30 rounded-2xl border border-amber-600/20 mb-12">
                <Heart className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                <h3 className="text-amber-100 font-semibold text-lg mb-2">Personalize Your Feed</h3>
                <p className="text-amber-400/60 mb-4">Select your interests to get personalized recommendations</p>
                <Button onClick={() => setShowInterestPicker(true)} className="bg-amber-600 hover:bg-amber-700">
                  <Heart className="w-4 h-4 mr-2" />
                  Choose Interests
                </Button>
              </div>
            )}
          </>
        )}

        {/* Trending Creators Section */}
        {activeSection === 'discover' && trendingCreators.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold text-amber-100 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-purple-400" />
              Popular Creators
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-4">
              {trendingCreators.map(creator => (
                <Link
                  key={creator.id}
                  to={createPageUrl(`CreatorProfile?id=${creator.id}`)}
                  className="flex-shrink-0"
                >
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-36 bg-stone-800/50 rounded-xl p-4 border border-amber-600/20 hover:border-amber-500/50 transition-all text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 mx-auto mb-3 overflow-hidden">
                      {creator.avatar_url ? (
                        <img src={creator.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
                      )}
                    </div>
                    <p className="text-amber-100 font-semibold text-sm truncate">{creator.display_name}</p>
                    <p className="text-amber-400/60 text-xs">{(creator.follower_count || 0).toLocaleString()} followers</p>
                    {creator.is_live && (
                      <Badge className="mt-2 bg-red-500 text-white text-xs">LIVE</Badge>
                    )}
                  </motion.div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Community Section */}
        {activeSection === 'community' && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-amber-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                Community Hub
              </h2>
              <Link to={createPageUrl('CommunityForums')}>
                <Button className="bg-cyan-600 hover:bg-cyan-700">
                  <MessageSquare className="w-4 h-4 mr-2" />
                  Visit Forums
                </Button>
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Link to={createPageUrl('CommunityForums')}>
                <div className="bg-stone-800/30 rounded-xl p-6 border border-cyan-600/20 hover:border-cyan-500/50 transition-all cursor-pointer group">
                  <MessageSquare className="w-10 h-10 text-cyan-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-amber-100 font-semibold text-lg mb-2">Discussion Forums</h3>
                  <p className="text-amber-400/60 text-sm">Join conversations about gaming, music, tech, and more</p>
                </div>
              </Link>
              
              <div 
                onClick={() => user && setShowMessages(true)}
                className="bg-stone-800/30 rounded-xl p-6 border border-purple-600/20 hover:border-purple-500/50 transition-all cursor-pointer group"
              >
                <MessageSquare className="w-10 h-10 text-purple-400 mb-4 group-hover:scale-110 transition-transform" />
                <h3 className="text-amber-100 font-semibold text-lg mb-2">Direct Messages</h3>
                <p className="text-amber-400/60 text-sm">Message creators and other community members</p>
              </div>
              
              <Link to={createPageUrl('Following')}>
                <div className="bg-stone-800/30 rounded-xl p-6 border border-pink-600/20 hover:border-pink-500/50 transition-all cursor-pointer group">
                  <Heart className="w-10 h-10 text-pink-400 mb-4 group-hover:scale-110 transition-transform" />
                  <h3 className="text-amber-100 font-semibold text-lg mb-2">Following</h3>
                  <p className="text-amber-400/60 text-sm">See updates from creators you follow</p>
                </div>
              </Link>
            </div>
          </div>
        )}

        {/* Main Content Grid */}
        {isLoading ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            {[...Array(12)].map((_, i) => (
              <Skeleton key={i} className="aspect-video rounded-xl bg-stone-800" />
            ))}
          </div>
        ) : filteredContent.length > 0 ? (
          <div className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' : 'grid-cols-1'}`}>
            <AnimatePresence>
              {filteredContent.map((content, i) => (
                <motion.div
                  key={content.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                >
                  <AmphitheatreVideoCard content={content} viewMode={viewMode} />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-amber-600/20">
            <Film className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
            <h3 className="text-amber-100 font-semibold text-xl mb-2">No Content Found</h3>
            <p className="text-amber-400/60 mb-6">Try adjusting your filters or search query</p>
            <Button onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }} variant="outline" className="border-amber-600/30 text-amber-300">
              Clear Filters
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