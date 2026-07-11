import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Zap, Trophy, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function HypeTrainOverlay({ streamId, creatorId }) {
  const queryClient = useQueryClient();
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [prevLevel, setPrevLevel] = useState(0);

  const { data: hype } = useQuery({
    queryKey: ['hype-train', streamId],
    queryFn: async () => {
      const hypes = await base44.entities.Hype.filter({
        stream_id: streamId,
        is_active: true
      }, null, 1);
      return hypes[0] || null;
    },
    enabled: !!streamId,
    refetchInterval: 2000
  });

  useEffect(() => {
    if (hype && hype.current_level > prevLevel && prevLevel > 0) {
      setShowLevelUp(true);
      setTimeout(() => setShowLevelUp(false), 3000);
    }
    if (hype) setPrevLevel(hype.current_level);
  }, [hype?.current_level]);

  useEffect(() => {
    if (!streamId) return;
    
    const unsubscribe = base44.entities.Hype.subscribe((event) => {
      if (event.data?.stream_id === streamId) {
        queryClient.invalidateQueries({ queryKey: ['hype-train', streamId] });
      }
    });
    
    return unsubscribe;
  }, [streamId, queryClient]);

  if (!hype || !hype.is_active) return null;

  const progress = (hype.current_progress / hype.level_threshold) * 100;
  const timeLeft = hype.expires_at ? Math.max(0, new Date(hype.expires_at) - new Date()) : 0;
  const minutesLeft = Math.floor(timeLeft / 60000);
  const secondsLeft = Math.floor((timeLeft % 60000) / 1000);

  const levelColors = [
    'from-amber-500 to-amber-700',
    'from-amber-500 to-amber-700',
    'from-amber-500 to-amber-700',
    'from-orange-500 to-orange-600',
    'from-red-500 to-red-600'
  ];

  const levelColor = levelColors[Math.min(hype.current_level - 1, levelColors.length - 1)] || levelColors[0];

  return (
    <>
      <motion.div
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -100, opacity: 0 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-30 w-80"
      >
        <div className={`bg-gradient-to-r ${levelColor} rounded-xl p-3 shadow-lg`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                <Flame className="w-5 h-5 text-white" />
              </motion.div>
              <span className="text-white font-bold">HYPE TRAIN</span>
              <Badge className="bg-white/20 text-white">
                Level {hype.current_level}
              </Badge>
            </div>
            <div className="flex items-center gap-1 text-white/80 text-sm">
              <Zap className="w-3 h-3" />
              {minutesLeft}:{secondsLeft.toString().padStart(2, '0')}
            </div>
          </div>

          <Progress value={progress} className="h-3 bg-white/20" />

          <div className="flex items-center justify-between mt-2 text-white/80 text-xs">
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {hype.contributors?.length || 0} contributors
            </div>
            <span>{Math.floor(progress)}%</span>
          </div>

          {hype.contributors?.slice(0, 3).length > 0 && (
            <div className="flex -space-x-2 mt-2">
              {hype.contributors.slice(0, 3).map((contributor, i) => (
                <div
                  key={i}
                  className="w-6 h-6 rounded-full bg-white/30 border-2 border-white flex items-center justify-center text-white text-xs"
                  title={contributor.user_name}
                >
                  {contributor.user_name?.charAt(0) || '?'}
                </div>
              ))}
              {hype.contributors.length > 3 && (
                <div className="w-6 h-6 rounded-full bg-white/30 border-2 border-white flex items-center justify-center text-white text-xs">
                  +{hype.contributors.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      {/* Level Up Animation */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <motion.div
              animate={{ 
                scale: [1, 1.2, 1],
                rotate: [0, 5, -5, 0]
              }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-8 shadow-2xl"
            >
              <div className="flex items-center gap-4">
                <Trophy className="w-16 h-16 text-white" />
                <div>
                  <p className="text-white text-3xl font-bold">LEVEL UP!</p>
                  <p className="text-white/80 text-xl">Level {hype.current_level}</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}