import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Play, Users, Eye } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const FEATURED_GAMES = [
  { id: 'fortnite', name: 'Fortnite', image: 'https://images.unsplash.com/photo-1589241062272-c0a000072dfa?w=1200', color: 'from-blue-600 to-purple-600' },
  { id: 'valorant', name: 'Valorant', image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1200', color: 'from-red-600 to-pink-600' },
  { id: 'cod', name: 'Call of Duty', image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b2b0e?w=1200', color: 'from-green-700 to-emerald-600' },
  { id: 'minecraft', name: 'Minecraft', image: 'https://images.unsplash.com/photo-1587573089734-09cb69c0f2b4?w=1200', color: 'from-emerald-600 to-green-500' },
  { id: 'league', name: 'League of Legends', image: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=1200', color: 'from-yellow-600 to-orange-600' }
];

export default function FeaturedGameCarousel({ streams = [], creators = {} }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % FEATURED_GAMES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const currentGame = FEATURED_GAMES[currentIndex];
  const gameStreams = streams.filter(s => 
    s.game_title?.toLowerCase().includes(currentGame.name.toLowerCase()) ||
    s.tags?.some(t => t.toLowerCase().includes(currentGame.id))
  );
  const totalViewers = gameStreams.reduce((sum, s) => sum + (s.viewer_count || 0), 0);

  const nextSlide = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(prev => (prev + 1) % FEATURED_GAMES.length);
  };

  const prevSlide = () => {
    setIsAutoPlaying(false);
    setCurrentIndex(prev => (prev - 1 + FEATURED_GAMES.length) % FEATURED_GAMES.length);
  };

  return (
    <div className="relative rounded-2xl overflow-hidden mb-8">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="relative aspect-[21/9] md:aspect-[3/1]"
        >
          <img 
            src={currentGame.image} 
            alt={currentGame.name}
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${currentGame.color} opacity-60`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <Badge className="bg-white/20 text-white border-0 mb-3">🔥 Trending Now</Badge>
              <h2 className="text-3xl md:text-5xl font-bold text-white mb-3">{currentGame.name}</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2 text-white/80">
                  <Users className="w-4 h-4" />
                  <span>{gameStreams.length} Live Streams</span>
                </div>
                <div className="flex items-center gap-2 text-white/80">
                  <Eye className="w-4 h-4" />
                  <span>{totalViewers.toLocaleString()} Viewers</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Link to={createPageUrl(`TheGamingHub?game=${currentGame.id}`)}>
                  <Button className="bg-white text-black hover:bg-white/90">
                    <Play className="w-4 h-4 mr-2 fill-black" />
                    Watch Now
                  </Button>
                </Link>
                <Link to={createPageUrl('GoLive')}>
                  <Button variant="outline" className="border-white/40 text-white hover:bg-white/20">
                    Start Streaming
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <button 
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
      >
        <ChevronLeft className="w-6 h-6" />
      </button>
      <button 
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
      >
        <ChevronRight className="w-6 h-6" />
      </button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
        {FEATURED_GAMES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIsAutoPlaying(false); setCurrentIndex(i); }}
            className={`w-2 h-2 rounded-full transition-all ${
              i === currentIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}