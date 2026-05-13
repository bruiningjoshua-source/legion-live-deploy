import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Target, MessageSquare, Lightbulb, BarChart3, Check, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

const ACTION_CONFIG = {
  schedule_stream: { icon: Calendar, color: 'purple', label: 'Schedule Stream' },
  set_goal: { icon: Target, color: 'amber', label: 'Set Goal' },
  draft_message: { icon: MessageSquare, color: 'blue', label: 'Draft Message' },
  content_idea: { icon: Lightbulb, color: 'green', label: 'Content Idea' },
  analytics_insight: { icon: BarChart3, color: 'cyan', label: 'Insight' },
};

const colorMap = {
  purple: { bg: 'bg-purple-500/10', border: 'border-purple-500/20', text: 'text-purple-400', btn: 'bg-purple-500 hover:bg-purple-600' },
  amber: { bg: 'bg-amber-500/10', border: 'border-amber-500/20', text: 'text-amber-400', btn: 'bg-amber-500 hover:bg-amber-600' },
  blue: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', btn: 'bg-blue-500 hover:bg-blue-600' },
  green: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', text: 'text-emerald-400', btn: 'bg-emerald-500 hover:bg-emerald-600' },
  cyan: { bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', text: 'text-cyan-400', btn: 'bg-cyan-500 hover:bg-cyan-600' },
};

export default function LegionActionCard({ action }) {
  const [executing, setExecuting] = useState(false);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  const config = ACTION_CONFIG[action.type] || ACTION_CONFIG.content_idea;
  const colors = colorMap[config.color] || colorMap.purple;
  const Icon = config.icon;

  const handleExecute = async () => {
    if (done || executing) return;

    // For draft_message / content_idea — just copy to clipboard
    if (action.type === 'draft_message') {
      const text = action.data?.message_text || action.description;
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success('Message copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
      return;
    }

    if (action.type === 'content_idea' || action.type === 'analytics_insight') {
      // These are informational — no execution needed
      setDone(true);
      toast.success('Got it!');
      return;
    }

    // Execute server-side actions
    setExecuting(true);
    try {
      const res = await base44.functions.invoke('legionCompanionChat', { action });
      if (res.data?.success) {
        setDone(true);
        toast.success(res.data.message || 'Done!');
      } else {
        toast.error(res.data?.error || 'Action failed');
      }
    } catch (err) {
      toast.error('Failed to execute action');
    } finally {
      setExecuting(false);
    }
  };

  const getButtonLabel = () => {
    if (done) return 'Done';
    if (executing) return 'Working...';
    if (copied) return 'Copied!';
    switch (action.type) {
      case 'schedule_stream': return 'Schedule Now';
      case 'set_goal': return 'Set Goal';
      case 'draft_message': return 'Copy Message';
      case 'content_idea': return 'Save Idea';
      case 'analytics_insight': return 'Got It';
      default: return 'Execute';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`${colors.bg} border ${colors.border} rounded-xl p-3 mt-2`}
    >
      <div className="flex items-start gap-2.5">
        <div className={`w-8 h-8 rounded-lg ${colors.bg} flex items-center justify-center flex-shrink-0`}>
          <Icon className={`w-4 h-4 ${colors.text}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${colors.text}`}>
              {config.label}
            </span>
          </div>
          <h4 className="text-white text-sm font-semibold">{action.title}</h4>
          <p className="text-white/50 text-xs mt-0.5 leading-relaxed">{action.description}</p>

          {/* Show schedule time */}
          {action.type === 'schedule_stream' && action.data?.scheduled_at && (
            <p className="text-purple-300/70 text-xs mt-1">
              📅 {new Date(action.data.scheduled_at).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
            </p>
          )}

          {/* Show draft message preview */}
          {action.type === 'draft_message' && action.data?.message_text && (
            <div className="mt-2 bg-black/30 rounded-lg p-2.5 border border-white/5">
              <p className="text-white/70 text-xs leading-relaxed whitespace-pre-wrap">
                {action.data.message_text}
              </p>
              {action.data.platform && (
                <span className="text-blue-400/60 text-[10px] mt-1 block">
                  For: {action.data.platform}
                </span>
              )}
            </div>
          )}

          {/* Goal details */}
          {action.type === 'set_goal' && action.data && (
            <div className="mt-1 flex items-center gap-2">
              <span className="text-amber-300/70 text-xs">
                🎯 Target: {action.data.target_value} {action.data.metric}
              </span>
            </div>
          )}

          <button
            onClick={handleExecute}
            disabled={done || executing}
            className={`mt-2.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-all flex items-center gap-1.5 ${
              done ? 'bg-emerald-600 cursor-default' : colors.btn
            } disabled:opacity-50`}
          >
            {executing && <Loader2 className="w-3 h-3 animate-spin" />}
            {done && <Check className="w-3 h-3" />}
            {getButtonLabel()}
          </button>
        </div>
      </div>
    </motion.div>
  );
}