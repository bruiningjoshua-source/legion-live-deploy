import React, { useState, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
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

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-950 via-stone-900 to-stone-950 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-100 mb-2">Explore</h1>
          <p className="text-amber-400/70">Discover amazing streams and creators</p>
        </div>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-amber-400/50" />
            <Input
              placeholder="Search streams, creators..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-stone-800/50 border-amber-600/20 text-amber-100 placeholder:text-amber-400/40 focus:border-amber-500 rounded-xl"
            />
          </div>

          {/* Filters & Sorting */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-40 bg-stone-800/50 border-amber-600/20 text-amber-100 text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="bg-stone-900 border-amber-600/30">
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value} className="text-amber-100 focus:bg-amber-800/30">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activeTab === 'streams' && (
                <>
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-40 bg-stone-800/50 border-amber-600/20 text-amber-100 text-sm">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent className="bg-stone-900 border-amber-600/30">
                      <SelectItem value="viewers" className="text-amber-100">Most Viewers</SelectItem>
                      <SelectItem value="trending" className="text-amber-100">Most Trending</SelectItem>
                      <SelectItem value="newest" className="text-amber-100">Newest</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="flex items-center gap-1 bg-stone-800/50 rounded-lg border border-amber-600/20 p-0.5">
                    {streamTypes.map(type => {
                      const Icon = type.icon;
                      return (
                        <Button
                          key={type.value}
                          variant={selectedType === type.value ? "default" : "ghost"}
                          size="sm"
                          onClick={() => setSelectedType(type.value)}
                          className={`${selectedType === type.value 
                            ? "bg-amber-600 text-white" 
                            : "text-amber-300 hover:bg-amber-800/20"} text-xs`}
                        >
                          <Icon className="w-3 h-3 mr-1" />
                          <span className="hidden sm:inline">{type.label}</span>
                        </Button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-stone-800/50 border border-amber-600/20 p-1 rounded-xl">
            <TabsTrigger 
              value="streams"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg px-6"
            >
              <Radio className="w-4 h-4 mr-2" />
              Live Streams
              <Badge className="ml-2 bg-red-500 text-white border-0 text-xs">{streams.length}</Badge>
            </TabsTrigger>
            <TabsTrigger 
              value="creators"
              className="data-[state=active]:bg-amber-600 data-[state=active]:text-white text-amber-300 rounded-lg px-6"
            >
              <Users className="w-4 h-4 mr-2" />
              Creators
              <Badge className="ml-2 bg-amber-500/50 text-amber-100 border-0 text-xs">{creators.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="streams" className="mt-0">
            {streamsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="aspect-video rounded-2xl bg-stone-800" />
                ))}
              </div>
            ) : filteredStreams.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                  {filteredStreams.map((stream, i) => (
                    <motion.div
                      key={stream.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <StreamCard stream={stream} creator={creatorMap[stream.creator_id]} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-amber-600/20">
                <Radio className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                <h3 className="text-amber-100 font-semibold text-lg mb-2">No Streams Found</h3>
                <p className="text-amber-400/60">Try adjusting your filters or check back later</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="creators" className="mt-0">
            {creatorsLoading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {[...Array(10)].map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-2xl bg-stone-800" />
                ))}
              </div>
            ) : filteredCreators.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                <AnimatePresence>
                  {filteredCreators.map((creator, i) => (
                    <motion.div
                      key={creator.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: i * 0.03 }}
                    >
                      <CreatorCard creator={creator} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="text-center py-20 bg-stone-800/30 rounded-2xl border border-amber-600/20">
                <Users className="w-12 h-12 text-amber-400/50 mx-auto mb-4" />
                <h3 className="text-amber-100 font-semibold text-lg mb-2">No Creators Found</h3>
                <p className="text-amber-400/60">Try adjusting your search</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}