import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Search, 
  ShoppingBag, 
  TrendingUp, 
  Users,
  Radio,
  Grid,
  List,
  Flame,
  Star,
  Play,
  Eye,
  CheckCircle,
  Sparkles,
  Gift,
  DollarSign,
  Target,
  BarChart3,
  Heart
} from 'lucide-react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

// Affiliate marketplace theme colors - emerald/green
const THEME = {
  primary: 'emerald',
  accent: 'green',
  gradient: 'from-emerald-500 to-green-600',
  gradientText: 'from-emerald-200 via-green-300 to-emerald-400',
  glow: 'emerald'
};

const PRODUCT_CATEGORIES = [
  { id: 'all', name: 'All Products', icon: '🛍️' },
  { id: 'tech', name: 'Tech & Gaming', icon: '🎮' },
  { id: 'fashion', name: 'Fashion', icon: '👗' },
  { id: 'beauty', name: 'Beauty', icon: '💄' },
  { id: 'home', name: 'Home & Living', icon: '🏠' },
  { id: 'fitness', name: 'Fitness', icon: '💪' },
  { id: 'food', name: 'Food & Drink', icon: '🍕' },
  { id: 'services', name: 'Services', icon: '⚡' }
];

function AffiliateStreamCard({ stream, partner }) {
  return (
    <Link to={createPageUrl(`WatchAffiliateVideo?id=${stream.id}`)}>
      <motion.div 
        whileHover={{ y: -6 }} 
        whileTap={{ scale: 0.98 }}
        className="group cursor-pointer"
      >
        <div className="relative aspect-video bg-white/[0.03] rounded-2xl overflow-hidden border border-white/[0.08] hover:border-emerald-500/40 transition-all shadow-xl hover:shadow-emerald-500/20">
          {stream.thumbnail_url ? (
            <img
              src={stream.thumbnail_url}
              alt={stream.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl bg-gradient-to-br from-emerald-800 to-green-900">🛍️</div>
          )}

          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
          
          {/* Play button */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <motion.div 
              className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-green-600 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/50"
            >
              <Play className="w-7 h-7 text-white fill-white ml-1" />
            </motion.div>
          </div>

          {/* Live Badge */}
          {stream.status === 'live' && (
            <div className="absolute top-3 left-3">
              <motion.div 
                className="flex items-center gap-1.5 bg-red-500 px-3 py-1.5 rounded-xl shadow-lg shadow-red-500/40"
              >
                <motion.span 
                  className="w-2 h-2 bg-white rounded-full"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-white text-xs font-bold tracking-wide">LIVE</span>
              </motion.div>
            </div>
          )}

          {/* Viewer count */}
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/10">
              <Eye className="w-3.5 h-3.5 text-white/80" />
              <span className="text-white text-xs font-medium">{stream.viewer_count || 0}</span>
            </div>
          </div>

          {/* Product badge */}
          {stream.brand_name && (
            <div className="absolute bottom-16 left-3">
              <span className="inline-flex items-center gap-1.5 bg-emerald-500/80 backdrop-blur-sm text-white px-3 py-1 rounded-lg text-xs font-medium">
                <ShoppingBag className="w-3 h-3" />
                {stream.brand_name}
              </span>
            </div>
          )}

          {/* Partner info */}
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
            <h3 className="text-white font-semibold line-clamp-1 mb-2">{stream.title}</h3>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 overflow-hidden ring-2 ring-emerald-500/40">
                {partner?.avatar_url ? (
                  <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-sm">👤</div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-white/90 text-sm font-medium truncate">{partner?.display_name}</span>
                {partner?.tier && partner.tier !== 'bronze' && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    partner.tier === 'elite' ? 'bg-purple-500/30 text-purple-300' :
                    partner.tier === 'platinum' ? 'bg-blue-500/30 text-blue-300' :
                    partner.tier === 'gold' ? 'bg-yellow-500/30 text-yellow-300' :
                    'bg-gray-500/30 text-gray-300'
                  }`}>
                    {partner.tier}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}

function ProductCard({ product }) {
  return (
    <motion.div 
      whileHover={{ y: -6 }} 
      whileTap={{ scale: 0.98 }}
      className="group cursor-pointer"
    >
      <GlassCard className="overflow-hidden" padding="p-0" glowColor="green" hover>
        <div className="relative aspect-square bg-gradient-to-br from-emerald-900/30 to-green-900/30">
          {product.product_image_url ? (
            <img
              src={product.product_image_url}
              alt={product.product_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-5xl">🛍️</div>
          )}
          
          {product.discount_percent && (
            <div className="absolute top-3 left-3 bg-red-500 text-white px-2 py-1 rounded-lg text-xs font-bold">
              -{product.discount_percent}%
            </div>
          )}
          
          <div className="absolute top-3 right-3 bg-emerald-500/90 text-white px-2 py-1 rounded-lg text-xs font-bold">
            {product.commission_rate}% Comm
          </div>
        </div>
        
        <div className="p-4">
          <p className="text-emerald-400/70 text-xs mb-1">{product.brand_name}</p>
          <h3 className="text-white font-semibold line-clamp-2 mb-2">{product.product_name}</h3>
          <div className="flex items-center justify-between">
            <span className="text-emerald-300 font-bold text-lg">${product.price}</span>
            <div className="flex items-center gap-1 text-white/50 text-xs">
              <TrendingUp className="w-3 h-3" />
              {product.conversion_count || 0} sales
            </div>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

function FeaturedPartnerCard({ partner }) {
  return (
    <Link to={createPageUrl(`CreatorProfile?id=${partner.id}`)}>
      <motion.div 
        whileHover={{ y: -4 }}
        className="group"
      >
        <GlassCard className="text-center" glowColor="green" hover>
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-400 to-green-500 overflow-hidden ring-4 ring-emerald-500/30 group-hover:ring-emerald-500/50 transition-all">
              {partner.avatar_url ? (
                <img src={partner.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>
              )}
            </div>
            {partner.status === 'approved' && (
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-[#0a0a0c]">
                <CheckCircle className="w-3 h-3 text-white" />
              </div>
            )}
          </div>
          
          <h3 className="text-white font-semibold mb-1">{partner.display_name}</h3>
          <div className="flex items-center justify-center gap-1 mb-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              partner.tier === 'elite' ? 'bg-purple-500/30 text-purple-300' :
              partner.tier === 'platinum' ? 'bg-blue-500/30 text-blue-300' :
              partner.tier === 'gold' ? 'bg-yellow-500/30 text-yellow-300' :
              partner.tier === 'silver' ? 'bg-gray-500/30 text-gray-300' :
              'bg-amber-500/30 text-amber-300'
            }`}>
              <Star className="w-3 h-3 inline mr-1" />
              {partner.tier}
            </span>
          </div>
          
          <div className="flex justify-center gap-4 text-xs text-white/50">
            <span>{partner.lifetime_conversions || 0} sales</span>
            <span>${(partner.total_earnings_usd || 0).toFixed(0)} earned</span>
          </div>
        </GlassCard>
      </motion.div>
    </Link>
  );
}

export default function AffiliateMarketplace() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [activeTab, setActiveTab] = useState('live');
  const [viewMode, setViewMode] = useState('grid');

  const { data: user } = useQuery({
    queryKey: ['current-user'],
    queryFn: () => base44.auth.me()
  });

  // Check if user is an approved partner
  const { data: myPartner } = useQuery({
    queryKey: ['my-affiliate-partner', user?.email],
    queryFn: async () => {
      if (!user?.email) return null;
      const partners = await base44.entities.AffiliatePartner.filter({ user_email: user.email }, null, 1);
      return partners[0] || null;
    },
    enabled: !!user?.email
  });

  const isVerifiedBroadcaster = myPartner?.status === 'approved';

  // Fetch live affiliate streams
  const { data: liveStreams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['affiliate-live-streams'],
    queryFn: () => base44.entities.AffiliateLiveStream.filter({ status: 'live' }, '-viewer_count', 50),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000
  });

  // Fetch affiliate videos
  const { data: videos = [], isLoading: videosLoading } = useQuery({
    queryKey: ['affiliate-videos-public'],
    queryFn: () => base44.entities.AffiliateVideo.filter({ is_published: true }, '-view_count', 50)
  });

  // Fetch active campaigns/products
  const { data: campaigns = [] } = useQuery({
    queryKey: ['active-campaigns-public'],
    queryFn: () => base44.entities.LiveCampaign.filter({ status: 'active' }, '-created_date', 100)
  });

  // Fetch partners
  const { data: partners = [] } = useQuery({
    queryKey: ['affiliate-partners-public'],
    queryFn: () => base44.entities.AffiliatePartner.filter({ status: 'approved' }, '-total_earnings_usd', 50)
  });

  const partnerMap = useMemo(() => 
    partners.reduce((acc, p) => { acc[p.id] = p; return acc; }, {}),
    [partners]
  );

  // Filter content
  const filteredStreams = useMemo(() => {
    return liveStreams.filter(stream => {
      const matchesSearch = !searchQuery || 
        stream.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        stream.brand_name?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [liveStreams, searchQuery]);

  const filteredVideos = useMemo(() => {
    return videos.filter(video => {
      const matchesSearch = !searchQuery || 
        video.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        video.brand_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || video.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [videos, searchQuery, selectedCategory]);

  const filteredProducts = useMemo(() => {
    return campaigns.filter(c => {
      const matchesSearch = !searchQuery || 
        c.product_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.brand_name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || c.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [campaigns, searchQuery, selectedCategory]);

  const totalLiveViewers = liveStreams.reduce((sum, s) => sum + (s.viewer_count || 0), 0);

  return (
    <div className="min-h-screen pt-16 pb-24">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Hero Section */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-10 rounded-3xl overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-900/90 via-green-900/80 to-emerald-900/90" />
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200')] bg-cover bg-center opacity-20" />
          
          <div className="relative px-8 py-12 md:py-16">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-500/40 px-4 py-1.5 rounded-full mb-4">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-200 text-sm font-medium">Affiliate Marketplace</span>
                </div>
                
                <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-200 via-green-300 to-emerald-400 mb-3">
                  Shop Live. Earn Big.
                </h1>
                <p className="text-emerald-100/70 text-lg max-w-xl mb-6">
                  Watch live product showcases from verified creators. Discover exclusive deals and support your favorite influencers.
                </p>
                
                <div className="flex flex-wrap gap-6 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Radio className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-emerald-100 font-bold">{liveStreams.length}</p>
                      <p className="text-emerald-300/60 text-xs">Live Now</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <Eye className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-emerald-100 font-bold">{totalLiveViewers}</p>
                      <p className="text-emerald-300/60 text-xs">Watching</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-emerald-500/20 rounded-lg">
                      <ShoppingBag className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-emerald-100 font-bold">{campaigns.length}</p>
                      <p className="text-emerald-300/60 text-xs">Products</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {isVerifiedBroadcaster ? (
                  <>
                    <Link to={createPageUrl('AffiliateGoLive')}>
                      <PremiumButton variant="premium" size="lg" leftIcon={<Radio className="w-5 h-5" />} className="w-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700">
                        Go Live
                      </PremiumButton>
                    </Link>
                    <Link to={createPageUrl('AffiliateHub')}>
                      <PremiumButton variant="secondary" size="lg" leftIcon={<BarChart3 className="w-5 h-5" />} className="w-full">
                        Partner Dashboard
                      </PremiumButton>
                    </Link>
                  </>
                ) : (
                  <Link to={createPageUrl('AffiliateHub')}>
                    <PremiumButton variant="premium" size="lg" leftIcon={<Target className="w-5 h-5" />} className="w-full bg-gradient-to-r from-emerald-500 to-green-600">
                      Become a Partner
                    </PremiumButton>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Search & Filters */}
        <GlassCard className="mb-8" padding="p-4" glowColor="green">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-400/50" />
              <Input
                placeholder="Search products, brands, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 focus:border-emerald-500/50 rounded-xl"
              />
            </div>

            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                className="p-3 rounded-xl bg-white/5 border border-white/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors"
              >
                {viewMode === 'grid' ? <List className="w-5 h-5" /> : <Grid className="w-5 h-5" />}
              </motion.button>
            </div>
          </div>

          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto pt-4 scrollbar-hide">
            {PRODUCT_CATEGORIES.map(cat => (
              <motion.button
                key={cat.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-xl whitespace-nowrap transition-all flex items-center gap-2 text-sm font-medium ${
                  selectedCategory === cat.id
                    ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30'
                    : 'bg-white/5 text-white/60 hover:bg-white/10 border border-white/10'
                }`}
              >
                <span>{cat.icon}</span>
                {cat.name}
              </motion.button>
            ))}
          </div>
        </GlassCard>

        {/* Featured Partners */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <Star className="w-6 h-6 text-emerald-400" />
              Top Partners
            </h2>
            <Link to={createPageUrl('AffiliateHub')}>
              <span className="text-emerald-400 hover:text-emerald-300 text-sm">View All →</span>
            </Link>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {partners.slice(0, 6).map((partner, i) => (
              <motion.div
                key={partner.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.04, 0.3), duration: 0.25 }}
              >
                <FeaturedPartnerCard partner={partner} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl mb-6">
            <TabsList className="bg-transparent p-0 gap-1">
              <TabsTrigger 
                value="live" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
              >
                <Flame className="w-4 h-4 mr-2" />
                Live Shopping ({liveStreams.length})
              </TabsTrigger>
              <TabsTrigger 
                value="videos" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
              >
                <Play className="w-4 h-4 mr-2" />
                Videos ({videos.length})
              </TabsTrigger>
              <TabsTrigger 
                value="products" 
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-green-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Products ({campaigns.length})
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Live Streams */}
          <TabsContent value="live" className="mt-0">
            {streamsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-white/5 overflow-hidden">
                    <Skeleton className="aspect-video bg-white/10" />
                    <div className="p-4 space-y-3">
                      <Skeleton className="h-4 w-3/4 bg-white/10" />
                      <Skeleton className="h-3 w-1/2 bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {filteredStreams.map((stream, i) => (
                    <motion.div
                      key={stream.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                    >
                      <AffiliateStreamCard 
                        stream={stream} 
                        partner={partnerMap[stream.partner_id]}
                      />
                    </motion.div>
                  ))}
              </div>
            ) : (
              <GlassCard className="text-center py-16" glowColor="green">
                <Radio className="w-16 h-16 text-emerald-400/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-xl mb-2">No Live Streams</h3>
                <p className="text-white/50 mb-6">Check back soon for live product showcases!</p>
                {isVerifiedBroadcaster && (
                  <Link to={createPageUrl('AffiliateGoLive')}>
                    <PremiumButton variant="premium" leftIcon={<Radio className="w-4 h-4" />} className="bg-gradient-to-r from-emerald-500 to-green-600">
                      Be the First to Go Live
                    </PremiumButton>
                  </Link>
                )}
              </GlassCard>
            )}
          </TabsContent>

          {/* Videos */}
          <TabsContent value="videos" className="mt-0">
            {videosLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video rounded-2xl bg-white/10" />
                ))}
              </div>
            ) : filteredVideos.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {filteredVideos.map((video, i) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                  >
                    <AffiliateStreamCard 
                      stream={video} 
                      partner={partnerMap[video.partner_id]}
                    />
                  </motion.div>
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-16" glowColor="green">
                <Play className="w-16 h-16 text-emerald-400/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-xl mb-2">No Videos Yet</h3>
                <p className="text-white/50">Product reviews and demos coming soon!</p>
              </GlassCard>
            )}
          </TabsContent>

          {/* Products */}
          <TabsContent value="products" className="mt-0">
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-5">
                {filteredProducts.map((product, i) => (
                  <motion.div
                    key={product.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.25 }}
                  >
                    <ProductCard product={product} />
                  </motion.div>
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-16" glowColor="green">
                <ShoppingBag className="w-16 h-16 text-emerald-400/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-xl mb-2">No Products Found</h3>
                <p className="text-white/50">Try adjusting your search or category filter.</p>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}