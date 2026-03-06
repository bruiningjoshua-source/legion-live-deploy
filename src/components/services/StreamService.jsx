/**
 * StreamService — Centralized streaming operations.
 * Equivalent to a dedicated streaming microservice.
 */
import { base44 } from '@/api/base44Client';
import { STREAM, ERROR, FEES } from './constants';

class StreamService {
  /** Create a new stream record */
  async createStream({ creatorId, title, description, category, thumbnailUrl, streamType, tags, guests, pkOpponent }) {
    if (!title?.trim()) throw new Error('Stream title is required');
    if (!category) throw new Error('Please select a category');

    return base44.entities.Stream.create({
      creator_id: creatorId,
      title: title.trim().substring(0, STREAM.MAX_TITLE_LENGTH),
      description: (description || '').trim().substring(0, STREAM.MAX_DESCRIPTION_LENGTH),
      category,
      thumbnail_url: thumbnailUrl || null,
      stream_type: streamType || 'solo',
      status: 'live',
      tags: (tags || []).slice(0, STREAM.MAX_TAGS),
      guests: guests || [],
      pk_opponent_id: pkOpponent || null,
    });
  }

  /** End a stream and clean up */
  async endStream(stream, creator, pkBattle) {
    const durationMin = Math.floor((Date.now() - new Date(stream.created_date).getTime()) / 60000);

    await base44.entities.Stream.update(stream.id, {
      status: 'ended',
      duration_minutes: durationMin,
      viewer_count: 0,
    });

    await base44.entities.Creator.update(creator.id, {
      is_live: false,
      current_stream_id: null,
    });

    // Finalize PK battle if active
    if (stream.stream_type === 'pk_battle' && pkBattle && pkBattle.status !== 'completed') {
      const hostScore = pkBattle.host_score || 0;
      const opponentScore = pkBattle.opponent_score || 0;
      const isTie = hostScore === opponentScore;
      const hostWon = hostScore > opponentScore;
      await base44.entities.PKBattle.update(pkBattle.id, {
        status: 'completed',
        ended_at: new Date().toISOString(),
        winner_creator_id: isTie ? '' : (hostWon ? pkBattle.host_creator_id : pkBattle.opponent_creator_id),
      });
      // Update PK win/loss for host (only if not a tie)
      if (!isTie && pkBattle.host_creator_id) {
        const pkField = hostWon ? 'pk_wins' : 'pk_losses';
        await base44.entities.Creator.update(pkBattle.host_creator_id, {
          [pkField]: (creator[pkField] || 0) + 1,
        }).catch(e => console.error('[StreamService] PK host stat update failed:', e));
      }
      // Update PK win/loss for opponent (only if not a tie)
      if (!isTie && pkBattle.opponent_creator_id) {
        const opponentPkField = hostWon ? 'pk_losses' : 'pk_wins';
        try {
          const opponents = await base44.entities.Creator.filter({ id: pkBattle.opponent_creator_id }, null, 1);
          if (opponents[0]) {
            await base44.entities.Creator.update(opponents[0].id, {
              [opponentPkField]: (opponents[0][opponentPkField] || 0) + 1,
            });
          }
        } catch (e) {
          console.error('[StreamService] PK opponent stat update failed:', e);
        }
      }
    }

    // Finalize broadcaster earnings
    try {
      const earnings = await base44.entities.BroadcasterEarnings.filter({ creator_id: creator.id, stream_id: stream.id }, null, 1);
      if (earnings[0]) {
        await base44.entities.BroadcasterEarnings.update(earnings[0].id, {
          session_end_time: new Date().toISOString(),
          session_duration_minutes: durationMin,
          session_peak_viewers: stream.peak_viewers || 0,
        });
      }
    } catch (e) {
      console.error('[StreamService] Earnings finalize error:', e);
    }

    // Post system message
    try {
      await base44.entities.ChatMessage.create({
        stream_id: stream.id,
        sender_email: 'system',
        sender_name: 'System',
        message: `${creator.display_name || 'The host'} ended the stream. Thanks for watching!`,
        message_type: 'system',
      });
    } catch (e) {}

    return durationMin;
  }

  /** Clean up stale live streams for a creator */
  async cleanupStaleStreams(creatorId) {
    const staleStreams = await base44.entities.Stream.filter({ creator_id: creatorId, status: 'live' }, '-created_date', 5);
    for (const s of staleStreams) {
      await base44.entities.Stream.update(s.id, {
        status: 'ended',
        duration_minutes: Math.floor((Date.now() - new Date(s.created_date).getTime()) / 60000),
      });
    }
    await base44.entities.Creator.update(creatorId, { is_live: false, current_stream_id: null });
    return staleStreams.length;
  }

  /** Increment viewer count on join */
  async joinAsViewer(streamId, currentCount, peakViewers) {
    const newCount = (currentCount || 0) + 1;
    return base44.entities.Stream.update(streamId, {
      viewer_count: newCount,
      peak_viewers: Math.max(peakViewers || 0, newCount),
    });
  }

  /** Decrement viewer count on leave */
  async leaveAsViewer(streamId, currentCount) {
    return base44.entities.Stream.update(streamId, {
      viewer_count: Math.max(STREAM.VIEWER_COUNT_FLOOR, (currentCount || 1) - 1),
    });
  }

  /** Generate Zego streaming token */
  async getStreamToken(roomId, userId, role) {
    return base44.functions.invoke('generateZegoToken', { roomId, userId, role });
  }
}

export default new StreamService();