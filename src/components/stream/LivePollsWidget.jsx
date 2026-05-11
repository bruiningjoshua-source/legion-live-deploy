import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { 
  BarChart3, 
  Plus, 
  X,
  Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import GlassCard from '@/components/shared/GlassCard';
import PremiumButton from '@/components/shared/PremiumButton';

export default function LivePollsWidget({ streamId, creatorId, isCreator, userEmail }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newPoll, setNewPoll] = useState({ question: '', options: ['', ''], duration_seconds: 60 });
  const queryClient = useQueryClient();

  const { data: activePoll } = useQuery({
    queryKey: ['stream-poll', streamId],
    queryFn: async () => {
      const polls = await base44.entities.Poll.filter({ 
        stream_id: streamId, 
        status: 'active' 
      }, '-created_date', 1);
      return polls[0] || null;
    },
    enabled: !!streamId,
    refetchInterval: 2000
  });

  const { data: myVote } = useQuery({
    queryKey: ['my-poll-vote', activePoll?.id, userEmail],
    queryFn: async () => {
      if (!activePoll || !userEmail) return null;
      const votes = await base44.entities.PollVote.filter({
        poll_id: activePoll.id,
        user_email: userEmail
      }, null, 1);
      return votes[0] || null;
    },
    enabled: !!activePoll?.id && !!userEmail
  });

  const totalVotes = activePoll?.options?.reduce((sum, o) => sum + (o.votes || 0), 0) || 0;
  const hasVoted = !!myVote;

  const createPollMutation = useMutation({
    mutationFn: async (data) => {
      const poll = await base44.entities.Poll.create({
        stream_id: streamId,
        creator_id: creatorId,
        question: data.question,
        options: data.options.filter(o => o.trim()).map((text, i) => ({
          id: i + 1,
          text,
          votes: 0
        })),
        duration_seconds: data.duration_seconds,
        status: 'active',
        total_votes: 0,
        ends_at: new Date(Date.now() + data.duration_seconds * 1000).toISOString()
      });
      return poll;
    },
    onSuccess: () => {
      toast.success('Poll created!');
      setShowCreate(false);
      setNewPoll({ question: '', options: ['', ''], duration_seconds: 60 });
      queryClient.invalidateQueries({ queryKey: ['stream-poll'] });
    }
  });

  const voteMutation = useMutation({
    mutationFn: async (optionId) => {
      // Record vote
      await base44.entities.PollVote.create({
        poll_id: activePoll.id,
        user_email: userEmail,
        option_ids: [optionId.toString()]
      });

      // Update poll counts
      const updatedOptions = activePoll.options.map(o => 
        o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o
      );
      await base44.entities.Poll.update(activePoll.id, {
        options: updatedOptions,
        total_votes: (activePoll.total_votes || 0) + 1
      });
    },
    onSuccess: () => {
      toast.success('Vote recorded!');
      queryClient.invalidateQueries({ queryKey: ['stream-poll'] });
      queryClient.invalidateQueries({ queryKey: ['my-poll-vote'] });
    }
  });

  const addOption = () => {
    if (newPoll.options.length < 6) {
      setNewPoll({ ...newPoll, options: [...newPoll.options, ''] });
    }
  };

  const updateOption = (index, value) => {
    const options = [...newPoll.options];
    options[index] = value;
    setNewPoll({ ...newPoll, options });
  };

  const removeOption = (index) => {
    if (newPoll.options.length > 2) {
      const options = newPoll.options.filter((_, i) => i !== index);
      setNewPoll({ ...newPoll, options });
    }
  };

  return (
    <div>
      {activePoll ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-500/30 rounded-2xl p-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              <span className="text-white font-semibold">Live Poll</span>
            </div>
            <div className="flex items-center gap-2 text-white/50 text-sm">
              <Users className="w-4 h-4" />
              {totalVotes} votes
            </div>
          </div>

          {/* Question */}
          <p className="text-white font-medium mb-4">{activePoll.question}</p>

          {/* Options */}
          <div className="space-y-2">
            {activePoll.options?.map((option) => {
              const percent = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
              const isMyVote = myVote?.option_ids?.includes(option.id.toString());

              return (
                <motion.button
                  key={option.id}
                  whileHover={!hasVoted ? { scale: 1.02 } : {}}
                  whileTap={!hasVoted ? { scale: 0.98 } : {}}
                  onClick={() => !hasVoted && voteMutation.mutate(option.id)}
                  disabled={hasVoted || voteMutation.isPending}
                  className={`w-full relative overflow-hidden rounded-xl transition-colors ${
                    hasVoted ? 'cursor-default' : 'cursor-pointer hover:bg-white/10'
                  } ${isMyVote ? 'ring-2 ring-blue-400' : ''}`}
                >
                  <div className="relative z-10 flex items-center justify-between p-3">
                    <span className="text-white text-sm">{option.text}</span>
                    <span className="text-white/60 text-sm font-medium">
                      {hasVoted ? `${Math.round(percent)}%` : ''}
                    </span>
                  </div>
                  {hasVoted && (
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5 }}
                      className={`absolute inset-y-0 left-0 ${
                        isMyVote ? 'bg-blue-500/40' : 'bg-white/10'
                      }`}
                    />
                  )}
                </motion.button>
              );
            })}
          </div>

          {hasVoted && (
            <p className="text-blue-300/60 text-xs text-center mt-3">
              Thanks for voting!
            </p>
          )}
        </motion.div>
      ) : isCreator ? (
        <>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30 transition-colors"
          >
            <BarChart3 className="w-5 h-5" />
            <span className="font-medium">Create Poll</span>
          </motion.button>

          <AnimatePresence>
            {showCreate && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
                onClick={() => setShowCreate(false)}
              >
                <motion.div
                  initial={{ scale: 0.9, y: 20 }}
                  animate={{ scale: 1, y: 0 }}
                  exit={{ scale: 0.9, y: 20 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <GlassCard className="w-full max-w-md" glowColor="blue">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-xl font-bold text-white">Create Poll</h2>
                      <button onClick={() => setShowCreate(false)} className="text-white/50 hover:text-white">
                        <X className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="text-white/70 text-sm mb-2 block">Question</label>
                        <Input
                          value={newPoll.question}
                          onChange={(e) => setNewPoll({ ...newPoll, question: e.target.value })}
                          placeholder="What should I play next?"
                          className="bg-white/5 border-white/10 text-white"
                        />
                      </div>

                      <div>
                        <label className="text-white/70 text-sm mb-2 block">Options</label>
                        <div className="space-y-2">
                          {newPoll.options.map((option, i) => (
                            <div key={i} className="flex gap-2">
                              <Input
                                value={option}
                                onChange={(e) => updateOption(i, e.target.value)}
                                placeholder={`Option ${i + 1}`}
                                className="bg-white/5 border-white/10 text-white"
                              />
                              {newPoll.options.length > 2 && (
                                <button
                                  onClick={() => removeOption(i)}
                                  className="p-2 text-red-400 hover:text-red-300"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                        {newPoll.options.length < 6 && (
                          <button
                            onClick={addOption}
                            className="mt-2 text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
                          >
                            <Plus className="w-4 h-4" />
                            Add option
                          </button>
                        )}
                      </div>

                      <div>
                        <label className="text-white/70 text-sm mb-2 block">Duration</label>
                        <div className="flex gap-2">
                          {[30, 60, 120, 300].map(seconds => (
                            <button
                              key={seconds}
                              onClick={() => setNewPoll({ ...newPoll, duration_seconds: seconds })}
                              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                                newPoll.duration_seconds === seconds
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white/10 text-white/60 hover:bg-white/20'
                              }`}
                            >
                              {seconds < 60 ? `${seconds}s` : `${seconds / 60}m`}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3 mt-6">
                      <PremiumButton variant="ghost" onClick={() => setShowCreate(false)} className="flex-1">
                        Cancel
                      </PremiumButton>
                      <PremiumButton
                        onClick={() => createPollMutation.mutate(newPoll)}
                        loading={createPollMutation.isPending}
                        disabled={!newPoll.question || newPoll.options.filter(o => o.trim()).length < 2}
                        className="flex-1"
                        leftIcon={<BarChart3 className="w-4 h-4" />}
                      >
                        Start Poll
                      </PremiumButton>
                    </div>
                  </GlassCard>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}