import React, { useState, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PullToRefresh from '@/components/shared/PullToRefresh';
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  Radio, 
  Users, 
  Swords,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumStreamCard from '@/components/stream/PremiumStreamCard';
import PremiumCreatorCard from '@/components/creator/PremiumCreatorCard';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'gaming', label: 'Gaming' },
  { value: 'music', label: 'Music' },
  { value: 'talk_show', label: 'Talk Show' },
  { value: 'dance', label: 'Dance' },
  { value: 'cooking', label: 'Cooking' },
  { value: 'fitness', label: 'Fitness' },
  { value: 'education', label: 'Education' },
  { value: 'art', label: 'Art' },
  { value: 'comedy', label: 'Comedy' },
  { value: 'other', label: 'Other' }
];

const streamTypes = [
  { value: 'all', label: 'All Types', icon: Radio },
  { value: 'solo', label: 'Solo', icon: Radio },
  { value: 'multi_panel', label: 'Panel', icon: Users },
  { value: 'pk_battle', label: 'PK Battle', icon: Swords }
];

export default function Explore() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('streams');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [sortBy, setSortBy] = useState('viewers');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const { data: streams = [], isLoading: streamsLoading } = useQuery({
    queryKey: ['streams-explore'],
    queryFn: () => base44.entities.Stream.filter({ status: 'live' }, '-viewer_count', 50),
    staleTime: 10 * 1000,
    refetchInterval: 15 * 1000,
    retry: 1
  });

  const { data: recordedVideos = [] } = useQuery({
    queryKey: ['recorded-streams'],
    queryFn: () => base44.entities.Music.filter({ is_published: true }, '-created_date', 30)
  });

  const { data: creators = [], isLoading: creatorsLoading } = useQuery({
    queryKey: ['creators-explore'],
    queryFn: () => base44.entities.Creator.list('-follower_count', 50),
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  const creatorMap = useMemo(() => 
    creators.reduce((acc, c) => {
      acc[c.id] = c;
      return acc;
    }, {}), 
    [creators]
  );

  const filteredStreams = useMemo(() => {
    let result = streams.filter(stream => {
      const matchesSearch = !searchQuery || 
        stream.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creatorMap[stream.creator_id]?.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || stream.category === selectedCategory;
      const matchesType = selectedType === 'all' || stream.stream_type === selectedType;

      return matchesSearch && matchesCategory && matchesType;
    });

    // Apply sorting
    switch (sortBy) {
      case 'viewers':
        result.sort((a, b) => (b.viewer_count || 0) - (a.viewer_count || 0));
        break;
      case 'trending':
        result.sort((a, b) => (b.total_gifts_received || 0) - (a.total_gifts_received || 0));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        break;
      default:
        break;
    }

    return result;
  }, [streams, searchQuery, selectedCategory, selectedType, sortBy, creatorMap]);

  const filteredCreators = useMemo(() => {
    return creators.filter(creator => {
      const matchesSearch = !searchQuery || 
        creator.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.bio?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCategory = selectedCategory === 'all' || creator.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [creators, searchQuery, selectedCategory]);

  const handleRefresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['streams-explore'] });
    await queryClient.invalidateQueries({ queryKey: ['creators-explore'] });
  }, [queryClient]);

  return (
    <div className="min-h-screen pt-20 pb-24">
      <PullToRefresh onRefresh={handleRefresh}>
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-amber-100 to-amber-300 mb-2">
            Explore
          </h1>
          <p className="text-white/60">Discover amazing streams and creators</p>
        </motion.div>

        {/* Search & Filters */}
        <GlassCard padding="p-4" className="mb-8" animate={false}>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                placeholder="Search streams, creators..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 h-12 bg-white/5 border-white/10 text-white placeholder:text-white/40 focus:border-amber-500/50 focus:bg-white/10 rounded-xl transition-all"
              />
            </div>

            {/* Filters & Sorting */}
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900/95 backdrop-blur-xl border-white/10">
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-white focus:bg-white/10">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeTab === 'streams' && (
                <>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-44 bg-white/5 border-white/10 text-white hover:bg-white/10 transition-colors">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900/95 backdrop-blur-xl border-white/10">
                      <SelectItem value="viewers" className="text-white focus:bg-white/10">Most Viewers</SelectItem>
                      <SelectItem value="trending" className="text-white focus:bg-white/10">Most Trending</SelectItem>
                      <SelectItem value="newest" className="text-white focus:bg-white/10">Newest</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 bg-white/5 rounded-xl border border-white/10 p-1">
                    {streamTypes.map(type => {
                      const Icon = type.icon;
                      const isSelected = selectedType === type.value;
                      return (
                        <button
                          key={type.value}
                          onClick={() => setSelectedType(type.value)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                            isSelected 
                              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25' 
                              : 'text-white/60 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </GlassCard>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="inline-flex bg-white/5 backdrop-blur-xl border border-white/10 p-1.5 rounded-2xl">
            <TabsList className="bg-transparent p-0 gap-1">
              <TabsTrigger 
                value="streams"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
              >
                <Radio className="w-4 h-4 mr-2" />
                Live Streams
                <Badge className="ml-2 bg-red-500/80 text-white border-0 text-[10px] px-1.5">{streams.length}</Badge>
              </TabsTrigger>
              <TabsTrigger 
                value="creators"
                className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-xl px-6 py-2.5 text-white/60 hover:text-white transition-all"
              >
                <Users className="w-4 h-4 mr-2" />
                Creators
                <Badge className="ml-2 bg-amber-500/50 text-white border-0 text-[10px] px-1.5">{creators.length}</Badge>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="streams" className="mt-0">
            {streamsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="aspect-[9/16] rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : filteredStreams.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredStreams.map((stream, i) => (
                  <PremiumStreamCard key={stream.id} stream={stream} creator={creatorMap[stream.creator_id]} index={i} />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-16">
                <Radio className="w-16 h-16 text-red-500/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">No Streams Found</h3>
                <p className="text-white/50 mb-6">Try adjusting your filters or check back later</p>
                <PremiumButton onClick={() => { setSelectedCategory('all'); setSelectedType('all'); setSearchQuery(''); }}>
                  Clear Filters
                </PremiumButton>
              </GlassCard>
            )}
          </TabsContent>

          <TabsContent value="creators" className="mt-0">
            {creatorsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />
                ))}
              </div>
            ) : filteredCreators.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {filteredCreators.map((creator, i) => (
                  <PremiumCreatorCard key={creator.id} creator={creator} index={i} />
                ))}
              </div>
            ) : (
              <GlassCard className="text-center py-16">
                <Users className="w-16 h-16 text-amber-500/30 mx-auto mb-4" />
                <h3 className="text-white font-semibold text-lg mb-2">No Creators Found</h3>
                <p className="text-white/50">Try adjusting your search</p>
              </GlassCard>
            )}
          </TabsContent>
        </Tabs>
      </div>
      </PullToRefresh>
    </div>
  );
}