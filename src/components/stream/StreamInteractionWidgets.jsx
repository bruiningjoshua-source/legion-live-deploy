import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  BarChart3, 
  HelpCircle,
  Plus, 
  X,
  Check,
  Send,
  Users,
  ChevronUp,
  ChevronDown,
  Target,
  MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

// Live Poll Widget
function LivePoll({ poll, userEmail, onVote }) {
  const hasVoted = poll.voted_users?.includes(userEmail);
  const totalVotes = poll.options?.reduce((sum, o) => sum + (o.votes || 0), 0) || 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 backdrop-blur-xl border border-blue-500/30 rounded-xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <span className="text-white text-sm font-medium">Poll</span>
        </div>
        <span className="text-white/50 text-xs">{totalVotes} votes</span>
      </div>
      
      <p className="text-white text-sm font-medium mb-2">{poll.question}</p>
      
      <div className="space-y-1.5">
        {poll.options?.map((option) => {
          const percent = totalVotes > 0 ? (option.votes / totalVotes) * 100 : 0;
          const isMyVote = poll.my_vote === option.id;

          return (
            <motion.button
              key={option.id}
              whileHover={!hasVoted ? { scale: 1.01 } : {}}
              whileTap={!hasVoted ? { scale: 0.99 } : {}}
              onClick={() => !hasVoted && onVote(poll.id, option.id)}
              disabled={hasVoted}
              className={`w-full relative overflow-hidden rounded-lg transition-colors text-left ${
                hasVoted ? 'cursor-default' : 'cursor-pointer'
              } ${isMyVote ? 'ring-1 ring-blue-400' : ''}`}
            >
              <div className="relative z-10 flex items-center justify-between px-3 py-2">
                <span className="text-white text-xs">{option.text}</span>
                {hasVoted && <span className="text-white/60 text-xs">{Math.round(percent)}%</span>}
              </div>
              {hasVoted && (
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  className={`absolute inset-y-0 left-0 ${isMyVote ? 'bg-blue-500/40' : 'bg-white/10'}`}
                />
              )}
              {!hasVoted && <div className="absolute inset-0 bg-white/5 hover:bg-white/10" />}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}

// Q&A Widget
function QAWidget({ streamId, isHost, userEmail, userName }) {
  const [question, setQuestion] = useState('');
  const [showInput, setShowInput] = useState(false);
  const queryClient = useQueryClient();

  const { data: questions = [] } = useQuery({
    queryKey: ['stream-qa', streamId],
    queryFn: async () => {
      // Using Poll entity for Q&A with special type
      const qas = await base44.entities.Poll.filter({ 
        stream_id: streamId,
        poll_type: 'qa'
      }, '-upvotes', 10);
      return qas;
    },
    enabled: !!streamId,
    refetchInterval: 5000
  });

  const submitQuestion = useMutation({
    mutationFn: async (q) => {
      await base44.entities.Poll.create({
        stream_id: streamId,
        question: q,
        poll_type: 'qa',
        status: 'active',
        upvotes: 1,
        voted_users: [userEmail],
        asker_email: userEmail,
        asker_name: userName
      });
    },
    onSuccess: () => {
      setQuestion('');
      setShowInput(false);
      toast.success('Question submitted!');
      queryClient.invalidateQueries({ queryKey: ['stream-qa'] });
    }
  });

  const upvoteQuestion = useMutation({
    mutationFn: async (qa) => {
      const hasVoted = qa.voted_users?.includes(userEmail);
      await base44.entities.Poll.update(qa.id, {
        upvotes: hasVoted ? (qa.upvotes || 1) - 1 : (qa.upvotes || 0) + 1,
        voted_users: hasVoted 
          ? qa.voted_users.filter(e => e !== userEmail)
          : [...(qa.voted_users || []), userEmail]
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stream-qa'] })
  });

  const answerQuestion = useMutation({
    mutationFn: async (qa) => {
      await base44.entities.Poll.update(qa.id, { status: 'answered' });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['stream-qa'] })
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-purple-500/30 rounded-xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-purple-400" />
          <span className="text-white text-sm font-medium">Q&A</span>
        </div>
        {!isHost && (
          <button
            onClick={() => setShowInput(!showInput)}
            className="text-purple-300 text-xs hover:text-purple-200"
          >
            Ask a question
          </button>
        )}
      </div>

      {showInput && (
        <div className="flex gap-2 mb-3">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 h-8 text-xs bg-white/5 border-white/10 text-white"
            onKeyPress={(e) => e.key === 'Enter' && question.trim() && submitQuestion.mutate(question)}
          />
          <button
            onClick={() => question.trim() && submitQuestion.mutate(question)}
            className="p-2 rounded-lg bg-purple-500 text-white"
          >
            <Send className="w-3 h-3" />
          </button>
        </div>
      )}

      <div className="space-y-2 max-h-32 overflow-y-auto scrollbar-hide">
        {questions.filter(q => q.status === 'active').slice(0, 5).map((qa) => (
          <div key={qa.id} className="flex items-start gap-2 bg-white/5 rounded-lg p-2">
            <button
              onClick={() => upvoteQuestion.mutate(qa)}
              className={`flex flex-col items-center p-1 rounded ${
                qa.voted_users?.includes(userEmail) ? 'text-purple-400' : 'text-white/40'
              }`}
            >
              <ChevronUp className="w-3 h-3" />
              <span className="text-xs">{qa.upvotes || 0}</span>
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs line-clamp-2">{qa.question}</p>
              <p className="text-white/40 text-xs mt-0.5">— {qa.asker_name}</p>
            </div>
            {isHost && (
              <button
                onClick={() => answerQuestion.mutate(qa)}
                className="p-1 rounded bg-emerald-500/20 text-emerald-400"
              >
                <Check className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
        {questions.filter(q => q.status === 'active').length === 0 && (
          <p className="text-white/30 text-xs text-center py-2">No questions yet</p>
        )}
      </div>
    </motion.div>
  );
}

// Tipping Goal Widget
function TippingGoal({ goal }) {
  const progressPercent = goal 
    ? Math.min((goal.current_amount_denarii / goal.goal_amount_denarii) * 100, 100)
    : 0;
  const isCompleted = progressPercent >= 100;

  if (!goal) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-xl border border-amber-500/30 rounded-xl p-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-amber-400" />
          <span className="text-white text-sm font-medium">{goal.title}</span>
        </div>
        {isCompleted && (
          <span className="bg-emerald-500 text-white text-xs px-2 py-0.5 rounded">Complete!</span>
        )}
      </div>
      
      <div className="mb-2">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-white/60">Progress</span>
          <span className="text-amber-300">
            {goal.current_amount_denarii?.toLocaleString()} / {goal.goal_amount_denarii?.toLocaleString()} 🪙
          </span>
        </div>
        <Progress value={progressPercent} className="h-2 bg-white/10" />
      </div>
      
      {goal.reward_description && (
        <p className="text-white/50 text-xs">{goal.reward_description}</p>
      )}
    </motion.div>
  );
}

// Main Export - Container for all widgets
export default function StreamInteractionWidgets({ 
  streamId, 
  creatorId, 
  isHost, 
  userEmail,
  userName 
}) {
  const queryClient = useQueryClient();

  const { data: activePoll } = useQuery({
    queryKey: ['stream-poll', streamId],
    queryFn: async () => {
      const polls = await base44.entities.Poll.filter({ 
        stream_id: streamId, 
        status: 'active',
        poll_type: { $ne: 'qa' }
      }, '-created_date', 1);
      return polls[0] || null;
    },
    enabled: !!streamId,
    refetchInterval: 3000
  });

  const { data: tippingGoal } = useQuery({
    queryKey: ['tipping-goal', streamId],
    queryFn: async () => {
      const goals = await base44.entities.TippingGoal.filter({ 
        stream_id: streamId, 
        status: 'active' 
      }, null, 1);
      return goals[0] || null;
    },
    enabled: !!streamId,
    refetchInterval: 5000
  });

  const voteMutation = useMutation({
    mutationFn: async ({ pollId, optionId }) => {
      const polls = await base44.entities.Poll.filter({ id: pollId }, null, 1);
      const poll = polls[0];
      if (!poll) throw new Error('Poll not found');

      const updatedOptions = poll.options.map(o => 
        o.id === optionId ? { ...o, votes: (o.votes || 0) + 1 } : o
      );

      await base44.entities.Poll.update(pollId, {
        options: updatedOptions,
        voted_users: [...(poll.voted_users || []), userEmail],
        total_votes: (poll.total_votes || 0) + 1
      });
    },
    onSuccess: () => {
      toast.success('Vote recorded!');
      queryClient.invalidateQueries({ queryKey: ['stream-poll'] });
    }
  });

  // Add my_vote to poll
  const pollWithMyVote = activePoll ? {
    ...activePoll,
    my_vote: activePoll.voted_users?.includes(userEmail) 
      ? activePoll.options?.find(o => true)?.id // simplified
      : null
  } : null;

  return (
    <div className="space-y-2">
      {tippingGoal && <TippingGoal goal={tippingGoal} />}
      
      {pollWithMyVote && (
        <LivePoll 
          poll={pollWithMyVote} 
          userEmail={userEmail}
          onVote={(pollId, optionId) => voteMutation.mutate({ pollId, optionId })}
        />
      )}
      
      <QAWidget 
        streamId={streamId} 
        isHost={isHost}
        userEmail={userEmail}
        userName={userName}
      />
    </div>
  );
}

export { LivePoll, QAWidget, TippingGoal };