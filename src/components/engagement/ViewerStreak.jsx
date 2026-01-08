import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame, TrendingUp, Award } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ViewerStreak({ streakDays, totalWatchTime, level, xp }) {
  const getStreakColor = () => {
    if (streakDays >= 30) return 'from-purple-500 to-pink-500';
    if (streakDays >= 14) return 'from-orange-500 to-red-500';
    if (streakDays >= 7) return 'from-amber-500 to-orange-500';
    return 'from-blue-500 to-cyan-500';
  };

  const getStreakTitle = () => {
    if (streakDays >= 30) return 'Legendary';
    if (streakDays >= 14) return 'Dedicated';
    if (streakDays >= 7) return 'Committed';
    return 'Active';
  };

  return (
    <Card className="bg-gradient-to-br from-stone-900 to-stone-950 border-amber-600/30">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-amber-100 font-semibold flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            Your Activity
          </h3>
          <Badge className={`bg-gradient-to-r ${getStreakColor()} text-white border-0`}>
            {getStreakTitle()}
          </Badge>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {/* Streak */}
          <div className="text-center">
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 2, repeat: Infinity }}
              className={`w-16 h-16 mx-auto mb-2 rounded-full bg-gradient-to-br ${getStreakColor()} flex items-center justify-center`}
            >
              <Flame className="w-8 h-8 text-white" />
            </motion.div>
            <p className="text-2xl font-bold text-amber-100">{streakDays}</p>
            <p className="text-amber-400/60 text-xs">Day Streak</p>
          </div>

          {/* Watch Time */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-blue-600/20 border-2 border-blue-500/30 flex items-center justify-center">
              <TrendingUp className="w-8 h-8 text-blue-400" />
            </div>
            <p className="text-2xl font-bold text-amber-100">{totalWatchTime}h</p>
            <p className="text-amber-400/60 text-xs">Total Time</p>
          </div>

          {/* Level */}
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-amber-600/20 border-2 border-amber-500/30 flex items-center justify-center">
              <Award className="w-8 h-8 text-amber-400" />
            </div>
            <p className="text-2xl font-bold text-amber-100">{level}</p>
            <p className="text-amber-400/60 text-xs">Level</p>
          </div>
        </div>

        {/* XP Progress */}
        <div className="mt-4 p-3 bg-stone-800/50 rounded-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="text-amber-400/70 text-xs">XP to next level</span>
            <span className="text-amber-100 text-xs font-semibold">{xp}/1000</span>
          </div>
          <div className="h-2 bg-stone-700 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(xp / 1000) * 100}%` }}
              className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}