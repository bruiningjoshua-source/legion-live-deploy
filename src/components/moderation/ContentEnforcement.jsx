import React from 'react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

// AI-powered content moderation service
export async function analyzeStreamContent(streamId, creatorId, frameData) {
  try {
    // Use LLM to analyze content for violations
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a content moderation AI for a live streaming platform called Legion Live. 
      
ALLOWED CONTENT (Monetization Eligible):
- Range shooting, target shooting, gun safety demonstrations
- Hunting content and game processing/field dressing
- Survival and outdoor skills content
- General entertainment, gaming, music, education, comedy
- Fitness, cooking, talk shows, art

PROHIBITED CONTENT:
- Nudity or sexual content
- Extreme violence, gore, or torture
- Hate speech, harassment, discrimination
- Illegal activities (drugs, weapons manufacturing)
- Threats or incitement to violence
- Copyright infringement
- Spam or scams

Analyze the following stream context and determine if there are any violations.
Stream ID: ${streamId}
Creator ID: ${creatorId}
Content indicators: ${frameData || 'Live stream frame'}

Respond with JSON only:`,
      response_json_schema: {
        type: "object",
        properties: {
          has_violation: { type: "boolean" },
          violation_type: { type: "string" },
          severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
          confidence: { type: "number" },
          description: { type: "string" },
          action_recommended: { type: "string", enum: ["none", "warning", "cut_stream", "review"] },
          is_monetization_eligible: { type: "boolean" },
          monetization_category: { type: "string" }
        }
      }
    });

    return analysis;
  } catch (error) {
    console.error('Content analysis failed:', error);
    return { has_violation: false, action_recommended: 'none', confidence: 0 };
  }
}

export async function handleViolation(streamId, creatorId, violation) {
  const { violation_type, severity, confidence, description, action_recommended } = violation;
  
  // Create violation record
  await base44.entities.ContentViolation.create({
    stream_id: streamId,
    creator_id: creatorId,
    violation_type: violation_type || 'other',
    severity: severity || 'medium',
    detected_by: 'ai',
    ai_confidence: confidence || 0,
    description: description,
    action_taken: action_recommended === 'cut_stream' ? 'stream_cut' : 
                  action_recommended === 'warning' ? 'warning_issued' : 'pending_review',
    warning_sent_at: action_recommended === 'warning' ? new Date().toISOString() : null,
    stream_cut_at: action_recommended === 'cut_stream' ? new Date().toISOString() : null
  });

  // Return action to take
  return {
    shouldWarn: action_recommended === 'warning',
    shouldCut: action_recommended === 'cut_stream',
    shouldReview: action_recommended === 'review' || severity === 'high' || severity === 'critical'
  };
}

export function useContentEnforcement() {
  const queryClient = useQueryClient();

  const reportViolationMutation = useMutation({
    mutationFn: async ({ streamId, creatorId, type, description }) => {
      return base44.entities.ContentViolation.create({
        stream_id: streamId,
        creator_id: creatorId,
        violation_type: type,
        severity: 'medium',
        detected_by: 'user_report',
        description,
        action_taken: 'pending_review'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['violations']);
      toast.success('Report submitted for review');
    }
  });

  const dismissViolationMutation = useMutation({
    mutationFn: async (violationId) => {
      return base44.entities.ContentViolation.update(violationId, {
        review_decision: 'overturned',
        action_taken: 'dismissed'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['violations']);
    }
  });

  const upholdViolationMutation = useMutation({
    mutationFn: async ({ violationId, action }) => {
      return base44.entities.ContentViolation.update(violationId, {
        review_decision: 'upheld',
        action_taken: action
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['violations']);
    }
  });

  return {
    reportViolation: reportViolationMutation.mutate,
    dismissViolation: dismissViolationMutation.mutate,
    upholdViolation: upholdViolationMutation.mutate
  };
}

// Component to show warning overlay on stream
export function ViolationWarningOverlay({ isVisible, message, onDismiss }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-red-900/90 z-[60] flex items-center justify-center">
      <div className="max-w-md bg-stone-900 rounded-2xl p-8 text-center border-2 border-red-500">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
          <span className="text-4xl">⚠️</span>
        </div>
        <h2 className="text-2xl font-bold text-red-400 mb-4">Content Warning</h2>
        <p className="text-amber-100 mb-6">{message || 'Your stream may contain content that violates our community guidelines.'}</p>
        <p className="text-amber-400/70 text-sm mb-6">
          Please ensure your content follows Legion Live guidelines. Continued violations may result in your stream being terminated.
        </p>
        <button
          onClick={onDismiss}
          className="px-8 py-3 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded-lg"
        >
          I Understand
        </button>
      </div>
    </div>
  );
}

// Component to show stream cut notification
export function StreamCutNotification({ isVisible, reason }) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black z-[70] flex items-center justify-center">
      <div className="max-w-lg bg-stone-900 rounded-2xl p-10 text-center border-2 border-red-600">
        <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-600/20 flex items-center justify-center">
          <span className="text-5xl">🛑</span>
        </div>
        <h2 className="text-3xl font-bold text-red-500 mb-4">Stream Terminated</h2>
        <p className="text-amber-100 mb-6">
          Your stream has been automatically terminated due to a detected content violation.
        </p>
        <p className="text-amber-400/70 mb-6">
          Reason: {reason || 'Content policy violation'}
        </p>
        <p className="text-amber-400/60 text-sm">
          This incident has been flagged for admin review. You will be contacted regarding next steps.
        </p>
      </div>
    </div>
  );
}