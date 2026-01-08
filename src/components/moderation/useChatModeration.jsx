import { base44 } from '@/api/base44Client';
import { useMutation } from '@tanstack/react-query';

export function useChatModeration(streamId) {
  const moderateMessage = useMutation({
    mutationFn: async ({ message, senderEmail, senderName }) => {
      try {
        // Call backend moderation function
        const result = await base44.functions.invoke('moderateChat', {
          message,
          stream_id: streamId,
          user_email: senderEmail,
          user_name: senderName
        });

        return result.data;
      } catch (error) {
        console.error('Moderation error:', error);
        // Fail open on error
        return { approved: true, flagged: false };
      }
    }
  });

  return { moderateMessage };
}