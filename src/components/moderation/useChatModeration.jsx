import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

export function useChatModeration(streamId) {
  const moderateMessage = useMutation({
    mutationFn: async ({ message, senderEmail, senderName }) => {
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a content moderator for a live streaming platform. Analyze this chat message for inappropriate content including: hate speech, harassment, explicit content, spam, threats, or violations of community guidelines.

Message: "${message}"

Respond with JSON indicating if the message should be blocked and why.`,
          response_json_schema: {
            type: "object",
            properties: {
              should_block: { type: "boolean" },
              violation_type: { 
                type: "string",
                enum: ["none", "hate_speech", "harassment", "explicit_content", "spam", "threats", "other"]
              },
              severity: { 
                type: "string",
                enum: ["none", "low", "medium", "high"]
              },
              reason: { type: "string" },
              confidence: { type: "number" }
            }
          }
        });

        // Log moderation action if blocked
        if (result.should_block && result.severity !== 'none') {
          await base44.entities.ModerationAction.create({
            stream_id: streamId,
            user_email: senderEmail,
            user_name: senderName,
            action_type: result.severity === 'high' ? 'timeout' : 'message_removed',
            reason: `${result.violation_type}: ${result.reason}`,
            original_message: message,
            ai_confidence: result.confidence || 0.8
          });
        }

        return result;
      } catch (error) {
        console.error('Moderation error:', error);
        return { should_block: false, violation_type: 'none', severity: 'none' };
      }
    }
  });

  return { moderateMessage };
}