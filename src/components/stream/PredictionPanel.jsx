import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Clock, Trophy, Coins, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

export default function PredictionPanel({ streamId, creatorId, user, isCreator }) {
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newPrediction, setNewPrediction] = useState({ title: '', options: ['', ''], duration: 120 });
  const [betAmount, setBetAmount] = useState(100);
  const [selectedOption, setSelectedOption] = useState(null);

  const { data: activePrediction } = useQuery({
    queryKey: ['active-prediction', streamId],
    queryFn: async () => {
      const predictions = await base44.entities.Prediction.filter({
        stream_id: streamId,
        status: 'active'
      }, '-created_date', 1);
      return predictions[0] || null;
    },
    enabled: !!streamId,
    refetchInterval: 5000
  });

  const { data: userPoints } = useQuery({
    queryKey: ['channel-points', user?.email, creatorId],
    queryFn: async () => {
      const points = await base44.entities.ChannelPoints.filter({
        user_email: user.email,
        creator_id: creatorId
      }, null, 1);
      return points[0] || { points_balance: 0 };
    },
    enabled: !!user?.email && !!creatorId
  });

  const { data: userBet } = useQuery({
    queryKey: ['user-bet', activePrediction?.id, user?.email],
    queryFn: async () => {
      const bets = await base44.entities.PredictionBet.filter({
        prediction_id: activePrediction.id,
        user_email: user.email
      }, null, 1);
      return bets[0] || null;
    },
    enabled: !!activePrediction?.id && !!user?.email
  });

  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (!activePrediction?.ends_at) return;
    
    const updateTime = () => {
      const remaining = Math.max(0, new Date(activePrediction.ends_at) - new Date());
      setTimeLeft(Math.floor(remaining / 1000));
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [activePrediction?.ends_at]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const options = newPrediction.options.filter(o => o.trim()).map((text, i) => ({
        id: `opt_${i}`,
        text,
        points_bet: 0,
        bettors_count: 0
      }));

      await base44.entities.Prediction.create({
        creator_id: creatorId,
        stream_id: streamId,
        title: newPrediction.title,
        options,
        duration_seconds: newPrediction.duration,
        ends_at: new Date(Date.now() + newPrediction.duration * 1000).toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-prediction'] });
      setShowCreate(false);
      setNewPrediction({ title: '', options: ['', ''], duration: 120 });
      toast.success('Prediction started!');
    }
  });

  const betMutation = useMutation({
    mutationFn: async ({ optionId, amount }) => {
      if (userPoints.points_balance < amount) {
        throw new Error('Not enough points');
      }

      // Deduct points
      await base44.entities.ChannelPoints.update(userPoints.id, {
        points_balance: userPoints.points_balance - amount
      });

      // Create bet
      await base44.entities.PredictionBet.create({
        prediction_id: activePrediction.id,
        user_email: user.email,
        option_id: optionId,
        points_bet: amount
      });

      // Update prediction totals
      const updatedOptions = activePrediction.options.map(opt => 
        opt.id === optionId 
          ? { ...opt, points_bet: (opt.points_bet || 0) + amount, bettors_count: (opt.bettors_count || 0) + 1 }
          : opt
      );

      await base44.entities.Prediction.update(activePrediction.id, {
        options: updatedOptions,
        total_points: (activePrediction.total_points || 0) + amount,
        total_participants: (activePrediction.total_participants || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-prediction'] });
      queryClient.invalidateQueries({ queryKey: ['channel-points'] });
      queryClient.invalidateQueries({ queryKey: ['user-bet'] });
      setSelectedOption(null);
      toast.success('Bet placed!');
    },
    onError: (err) => toast.error(err.message)
  });

  const resolveMutation = useMutation({
    mutationFn: async (winningOptionId) => {
      await base44.entities.Prediction.update(activePrediction.id, {
        status: 'resolved',
        winning_option_id: winningOptionId
      });

      // Distribute winnings (simplified)
      const winningBets = await base44.entities.PredictionBet.filter({
        prediction_id: activePrediction.id,
        option_id: winningOptionId
      });

      const losingTotal = activePrediction.options
        .filter(o => o.id !== winningOptionId)
        .reduce((sum, o) => sum + (o.points_bet || 0), 0);

      const winningTotal = activePrediction.options
        .find(o => o.id === winningOptionId)?.points_bet || 0;

      for (const bet of winningBets) {
        const share = bet.points_bet / winningTotal;
        const winnings = Math.floor(bet.points_bet + (losingTotal * share));

        const userPts = await base44.entities.ChannelPoints.filter({
          user_email: bet.user_email,
          creator_id: creatorId
        }, null, 1);

        if (userPts[0]) {
          await base44.entities.ChannelPoints.update(userPts[0].id, {
            points_balance: userPts[0].points_balance + winnings
          });
        }

        await base44.entities.PredictionBet.update(bet.id, {
          status: 'won',
          points_won: winnings
        });
      }

      // Mark losing bets
      const losingBets = await base44.entities.PredictionBet.filter({
        prediction_id: activePrediction.id
      });
      for (const bet of losingBets) {
        if (bet.option_id !== winningOptionId && bet.status === 'pending') {
          await base44.entities.PredictionBet.update(bet.id, { status: 'lost' });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-prediction'] });
      toast.success('Prediction resolved!');
    }
  });

  const totalPoints = activePrediction?.options?.reduce((sum, o) => sum + (o.points_bet || 0), 0) || 0;

  return (
    <Card className="bg-stone-900/80 border-amber-600/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            Predictions
          </div>
          {isCreator && !activePrediction && (
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="bg-purple-600 hover:bg-purple-700"
            >
              <Plus className="w-4 h-4 mr-1" /> Create
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <AnimatePresence mode="wait">
          {showCreate ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-3"
            >
              <Input
                placeholder="What's your prediction?"
                value={newPrediction.title}
                onChange={e => setNewPrediction(p => ({ ...p, title: e.target.value }))}
                className="bg-stone-800 border-purple-600/30 text-amber-100"
              />
              
              {newPrediction.options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder={`Option ${i + 1}`}
                    value={opt}
                    onChange={e => {
                      const opts = [...newPrediction.options];
                      opts[i] = e.target.value;
                      setNewPrediction(p => ({ ...p, options: opts }));
                    }}
                    className="bg-stone-800 border-purple-600/30 text-amber-100"
                  />
                  {i > 1 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => setNewPrediction(p => ({
                        ...p,
                        options: p.options.filter((_, idx) => idx !== i)
                      }))}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              {newPrediction.options.length < 4 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNewPrediction(p => ({ ...p, options: [...p.options, ''] }))}
                  className="border-purple-600/30"
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Option
                </Button>
              )}

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newPrediction.title || newPrediction.options.filter(o => o.trim()).length < 2}
                  className="flex-1 bg-purple-600 hover:bg-purple-700"
                >
                  Start Prediction
                </Button>
              </div>
            </motion.div>
          ) : activePrediction ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-amber-100 font-medium">{activePrediction.title}</h3>
                {timeLeft > 0 && (
                  <Badge className="bg-purple-600/30 text-amber-300">
                    <Clock className="w-3 h-3 mr-1" />
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                  </Badge>
                )}
              </div>

              <div className="space-y-2">
                {activePrediction.options?.map((option, i) => {
                  const percent = totalPoints > 0 ? ((option.points_bet || 0) / totalPoints) * 100 : 0;
                  const colors = ['bg-blue-500', 'bg-pink-500', 'bg-green-500', 'bg-orange-500'];
                  const isUserBet = userBet?.option_id === option.id;

                  return (
                    <div
                      key={option.id}
                      className={`p-3 rounded-lg border cursor-pointer transition-all ${
                        isUserBet 
                          ? 'border-yellow-500/50 bg-yellow-500/10' 
                          : selectedOption === option.id
                            ? 'border-amber-500/50 bg-amber-500/10'
                            : 'border-stone-700/50 hover:border-amber-500/30'
                      }`}
                      onClick={() => !userBet && timeLeft > 0 && setSelectedOption(option.id)}
                    >
                      <div className="flex justify-between mb-2">
                        <span className="text-amber-100">{option.text}</span>
                        <span className="text-amber-400">{percent.toFixed(0)}%</span>
                      </div>
                      <Progress value={percent} className={`h-2 ${colors[i % colors.length]}`} />
                      <div className="flex justify-between mt-1 text-xs text-amber-400/70">
                        <span>{option.bettors_count || 0} bettors</span>
                        <span>{(option.points_bet || 0).toLocaleString()} pts</span>
                      </div>
                      {isUserBet && (
                        <Badge className="mt-2 bg-yellow-600/30 text-yellow-300">
                          Your bet: {userBet.points_bet} pts
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {!userBet && timeLeft > 0 && selectedOption && (
                <div className="flex items-center gap-2 p-3 bg-stone-800/50 rounded-lg">
                  <Input
                    type="number"
                    value={betAmount}
                    onChange={e => setBetAmount(Math.max(1, parseInt(e.target.value) || 0))}
                    className="w-24 bg-stone-900 border-purple-600/30 text-amber-100"
                  />
                  <Button
                    onClick={() => betMutation.mutate({ optionId: selectedOption, amount: betAmount })}
                    disabled={betAmount > (userPoints?.points_balance || 0)}
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                  >
                    <Coins className="w-4 h-4 mr-1" />
                    Bet {betAmount} pts
                  </Button>
                </div>
              )}

              {isCreator && (
                <div className="flex gap-2 pt-2 border-t border-stone-700">
                  {activePrediction.options?.map((option, i) => (
                    <Button
                      key={option.id}
                      size="sm"
                      variant="outline"
                      onClick={() => resolveMutation.mutate(option.id)}
                      className="flex-1 border-green-600/30 text-green-400 hover:bg-green-600/20"
                    >
                      <Trophy className="w-3 h-3 mr-1" />
                      {option.text} Wins
                    </Button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <div className="text-center py-6 text-amber-400/50">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No active prediction</p>
            </div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}