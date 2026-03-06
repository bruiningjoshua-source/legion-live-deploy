/**
 * ChatService — Centralized chat operations.
 * Equivalent to a dedicated chat/messaging microservice.
 */
import { base44 } from '@/api/base44Client';
import { STREAM, ERROR } from './constants';
import RateLimitService from './RateLimitService';

class ChatService {
  /** Send a moderated chat message */
  async sendMessage({ streamId, user, wallet, messageData, isBroadcaster }) {
    if (!user) throw new Error('Please sign in to chat');
    
    const messageContent = typeof messageData === 'string' ? messageData : messageData.message;
    if (!messageContent?.trim()) throw new Error('Empty message');

    // Rate limit: max 5 messages per 5 seconds
    const rateCheck = RateLimitService.checkChat(user.email);
    if (!rateCheck.allowed) {
      throw new Error(`Slow down! Try again in ${Math.ceil(rateCheck.retryAfterMs / 1000)}s`);
    }

    // AI moderation
    try {
      const modResult = await base44.functions.invoke('aiModerateContent', {
        content_type: 'chat_message',
        content: messageContent,
        stream_id: streamId,
        user_email: user.email,
        user_name: user.full_name || 'Anonymous',
      });
      if (!modResult.data?.approved) {
        throw new Error(modResult.data?.reason || 'Message blocked');
      }
    } catch (modError) {
      if (modError.message?.includes('blocked') || modError.message?.includes('banned')) throw modError;
      // Fail open if moderation service is down
    }

    return base44.entities.ChatMessage.create({
      stream_id: streamId,
      sender_email: user.email,
      sender_name: user.full_name || 'Anonymous',
      message: messageContent,
      message_type: messageData.message_type || 'text',
      vip_level: wallet?.vip_level || 0,
      mentions: messageData.mentions || [],
      reply_to_id: messageData.reply_to_id || null,
      reply_to_content: messageData.reply_to_content || null,
      reply_to_sender: messageData.reply_to_sender || null,
    });
  }

  /** Create an optimistic message for instant UI feedback */
  createOptimisticMessage({ streamId, user, messageData, wallet }) {
    const messageContent = typeof messageData === 'string' ? messageData : messageData.message;
    return {
      id: `optimistic-${Date.now()}`,
      stream_id: streamId,
      sender_email: user.email,
      sender_name: user.full_name || 'Anonymous',
      message: messageContent,
      message_type: messageData.message_type || 'text',
      vip_level: wallet?.vip_level || 0,
      created_date: new Date().toISOString(),
    };
  }

  /** Subscribe to new chat messages for a stream */
  subscribe(streamId, onNewMessage) {
    return base44.entities.ChatMessage.subscribe((event) => {
      if (event.data?.stream_id === streamId && event.type === 'create') {
        onNewMessage(event.data);
      }
    });
  }

  /** Add a message to the buffer with deduplication and cap */
  addToBuffer(messages, newMessage) {
    // Skip if already exists
    if (messages.some(m => m.id === newMessage.id)) return messages;
    
    // Remove matching optimistic message
    const filtered = messages.filter(m => !(
      m.id?.startsWith('optimistic-') &&
      m.sender_email === newMessage.sender_email &&
      m.message === newMessage.message
    ));
    
    const next = [...filtered, newMessage];
    return next.length > STREAM.MAX_CHAT_BUFFER ? next.slice(-STREAM.MAX_CHAT_BUFFER) : next;
  }

  /** Extract unique recent chatters from messages */
  getRecentChatters(messages) {
    const seen = new Set();
    return messages.reduce((acc, msg) => {
      if (!seen.has(msg.sender_email)) {
        seen.add(msg.sender_email);
        acc.push({ sender_email: msg.sender_email, sender_name: msg.sender_name });
      }
      return acc;
    }, []);
  }
}

export default new ChatService();