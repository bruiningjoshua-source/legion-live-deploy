import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart3, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function StreamPoll({ poll, onVote, hasVoted, userVote }) {
  const [selectedOption, setSelectedOption] = useState(null);

  const totalVotes = poll.options?.reduce((sum, opt) => sum + (opt.votes || 0), 0) || 0;

  const handleVote = (optionId) => {
    if (hasVoted) return;
    setSelectedOption(optionId);
    onVote(optionId);
  };

  const getPercentage = (votes) => {
    if (totalVotes === 0) return 0;
    return Math.round((votes / totalVotes) * 100);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="bg-stone-800/95 border-amber-600/30 backdrop-blur-lg">
        <CardContent className="p-4">
          <div className="flex items-start gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="text-amber-100 font-semibold mb-1">{poll.question}</h3>
              <div className="flex items-center gap-2 text-xs text-amber-400/60">
                <span>{totalVotes} votes</span>
                {poll.endsAt && (
                  <>
                    <span>•</span>
                    <span>Ends in {Math.ceil((new Date(poll.endsAt) - new Date()) / 60000)}m</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {poll.options?.map((option) => {
              const percentage = getPercentage(option.votes || 0);
              const isSelected = selectedOption === option.id || userVote === option.id;
              const isWinning = percentage > 0 && percentage === Math.max(...poll.options.map(o => getPercentage(o.votes || 0)));

              return (
                <button
                  key={option.id}
                  onClick={() => handleVote(option.id)}
                  disabled={hasVoted}
                  className={`w-full text-left transition-all ${
                    hasVoted ? 'cursor-default' : 'cursor-pointer hover:scale-[1.02]'
                  }`}
                >
                  <div className={`relative rounded-lg border-2 overflow-hidden ${
                    isSelected 
                      ? 'border-amber-500 bg-amber-600/20' 
                      : hasVoted
                        ? 'border-stone-600 bg-stone-700/30'
                        : 'border-amber-600/30 bg-stone-700/50 hover:border-amber-500/50'
                  }`}>
                    {/* Progress bar background */}
                    {hasVoted && (
                      <div 
                        className={`absolute inset-0 ${
                          isWinning ? 'bg-amber-600/30' : 'bg-stone-600/20'
                        } transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    )}

                    <div className="relative p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-amber-100 font-medium">{option.text}</span>
                        {isSelected && (
                          <CheckCircle className="w-4 h-4 text-amber-400" />
                        )}
                      </div>
                      {hasVoted && (
                        <div className="flex items-center gap-2">
                          <span className="text-amber-100 font-bold">{percentage}%</span>
                          {isWinning && percentage > 0 && (
                            <Badge className="bg-amber-600 text-white border-0 text-xs">
                              Leading
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {!hasVoted && (
            <p className="text-amber-400/60 text-xs text-center mt-3">
              Tap an option to vote
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}