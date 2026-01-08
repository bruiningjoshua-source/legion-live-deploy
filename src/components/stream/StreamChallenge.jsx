import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target, Zap, TrendingUp, Gift } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StreamChallenge({ challenge, currentProgress }) {
  const percentage = Math.min((currentProgress / challenge.goal) * 100, 100);
  const isCompleted = currentProgress >= challenge.goal;

  const getChallengeIcon = () => {
    switch (challenge.type) {
      case 'gifts': return Gift;
      case 'viewers': return TrendingUp;
      case 'engagement': return Zap;
      default: return Target;
    }
  };

  const Icon = getChallengeIcon();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
    >
      <Card className={`border-2 ${
        isCompleted 
          ? 'bg-gradient-to-r from-green-900/40 to-amber-900/40 border-green-500/50' 
          : 'bg-stone-800/95 border-amber-600/30'
      } backdrop-blur-lg`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isCompleted ? 'bg-green-600/30' : 'bg-amber-600/20'
            }`}>
              <Icon className={`w-5 h-5 ${isCompleted ? 'text-green-400' : 'text-amber-400'}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-amber-100 font-semibold">{challenge.title}</h3>
                {isCompleted && (
                  <Badge className="bg-green-600 text-white border-0 text-xs">
                    ✓ Completed
                  </Badge>
                )}
              </div>
              <p className="text-amber-400/70 text-sm">{challenge.description}</p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-amber-400/70">Progress</span>
              <span className="text-amber-100 font-semibold">
                {currentProgress.toLocaleString()} / {challenge.goal.toLocaleString()}
              </span>
            </div>
            <Progress 
              value={percentage} 
              className={`h-2 ${isCompleted ? 'bg-green-900/30' : 'bg-stone-700'}`}
            />
            {challenge.reward && (
              <div className="flex items-center gap-2 mt-3 p-2 bg-amber-600/10 rounded-lg border border-amber-600/20">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-amber-200 text-xs font-medium">
                  Reward: {challenge.reward}
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}