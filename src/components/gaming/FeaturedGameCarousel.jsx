import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ChevronLeft, ChevronRight, Play, Users, Eye, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PremiumButton from '@/components/shared/PremiumButton';

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
    <div className="relative rounded-3xl overflow-hidden mb-8 border border-white/10 shadow-2xl">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={{ opacity: 0, scale: 1.05 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.6 }}
          className="relative aspect-[21/9] md:aspect-[3/1]"
        >
          <img 
            src={currentGame.image} 
            alt={currentGame.name}
            className="w-full h-full object-cover"
          />
          <div className={`absolute inset-0 bg-gradient-to-r ${currentGame.color} opacity-50`} />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
          
          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-10">
            <motion.div
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/30 to-red-500/30 backdrop-blur-sm border border-orange-500/40 px-4 py-1.5 rounded-full mb-4">
                <Flame className="w-4 h-4 text-orange-400" />
                <span className="text-orange-200 text-sm font-medium">Trending Now</span>
              </div>
              
              <h2 className="text-4xl md:text-6xl font-black text-white mb-4 drop-shadow-2xl">{currentGame.name}</h2>
              
              <div className="flex items-center gap-6 mb-6">
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
                  <Users className="w-4 h-4 text-purple-300" />
                  <span className="text-white font-medium">{gameStreams.length} Live</span>
                </div>
                <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm px-4 py-2 rounded-xl">
                  <Eye className="w-4 h-4 text-purple-300" />
                  <span className="text-white font-medium">{totalViewers.toLocaleString()} Viewers</span>
                </div>
              </div>
              
              <div className="flex gap-4">
                <Link to={createPageUrl(`TheGamingHub?game=${currentGame.id}`)}>
                  <PremiumButton variant="primary" size="lg" leftIcon={<Play className="w-5 h-5 fill-white" />}>
                    Watch Now
                  </PremiumButton>
                </Link>
                <Link to={createPageUrl('GoLive')}>
                  <PremiumButton variant="ghost" size="lg">
                    Start Streaming
                  </PremiumButton>
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <motion.button 
        whileHover={{ scale: 1.1, x: -2 }}
        whileTap={{ scale: 0.9 }}
        onClick={prevSlide}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors border border-white/20"
      >
        <ChevronLeft className="w-6 h-6" />
      </motion.button>
      <motion.button 
        whileHover={{ scale: 1.1, x: 2 }}
        whileTap={{ scale: 0.9 }}
        onClick={nextSlide}
        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-black/40 hover:bg-black/60 backdrop-blur-sm rounded-full flex items-center justify-center text-white transition-colors border border-white/20"
      >
        <ChevronRight className="w-6 h-6" />
      </motion.button>

      {/* Indicators */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-black/30 backdrop-blur-sm px-3 py-2 rounded-full">
        {FEATURED_GAMES.map((_, i) => (
          <button
            key={i}
            onClick={() => { setIsAutoPlaying(false); setCurrentIndex(i); }}
            className={`h-2 rounded-full transition-all duration-300 ${
              i === currentIndex ? 'bg-white w-8' : 'bg-white/40 w-2 hover:bg-white/60'
            }`}
          />
        ))}
      </div>
    </div>
  );
}