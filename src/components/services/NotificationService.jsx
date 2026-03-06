/**
 * NotificationService — In-app notification system for live alerts and engagement.
 * Handles "creator went live" toasts, notification badge counts, and sound alerts.
 */
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

class NotificationService {
  constructor() {
    this._unsubscribe = null;
    this._followedCreatorIds = new Set();
    this._notifiedStreamIds = new Set();
    this._soundEnabled = true;
  }

  /** Initialize live monitoring for followed creators going live */
  async startMonitoring(userEmail) {
    if (!userEmail || this._unsubscribe) return;

    // Load followed creators
    const follows = await base44.entities.Follow.filter({ follower_email: userEmail }).catch(() => []);
    this._followedCreatorIds = new Set(follows.map(f => f.following_creator_id));

    if (this._followedCreatorIds.size === 0) return;

    // Subscribe to stream changes
    this._unsubscribe = base44.entities.Stream.subscribe((event) => {
      if (event.type === 'create' && event.data?.status === 'live') {
        this._handleNewStream(event.data);
      }
      if (event.type === 'update' && event.data?.status === 'live') {
        this._handleNewStream(event.data);
      }
    });
  }

  _handleNewStream(stream) {
    if (!stream?.creator_id) return;
    if (!this._followedCreatorIds.has(stream.creator_id)) return;
    if (this._notifiedStreamIds.has(stream.id)) return;

    this._notifiedStreamIds.add(stream.id);

    // Play notification sound
    if (this._soundEnabled) {
      this._playSound();
    }

    // Show toast notification
    toast(`🔴 ${stream.title || 'A creator you follow'} is now live!`, {
      description: 'Tap to watch',
      duration: 8000,
      action: {
        label: 'Watch',
        onClick: () => {
          window.location.href = `/WatchStream?id=${stream.id}`;
        }
      }
    });

    // Create in-app notification record
    base44.entities.Notification.create({
      user_email: this._userEmail,
      type: 'creator_live',
      title: `${stream.title || 'Live Stream'}`,
      message: 'A creator you follow just went live!',
      link: `/WatchStream?id=${stream.id}`,
      is_read: false,
      creator_id: stream.creator_id,
    }).catch(() => {});
  }

  _playSound() {
    // Use Web Audio API for a brief notification chime
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  }

  /** Stop monitoring */
  stopMonitoring() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    this._notifiedStreamIds.clear();
  }

  /** Toggle sound */
  setSoundEnabled(enabled) {
    this._soundEnabled = enabled;
  }

  /** Update followed creators (when user follows/unfollows) */
  updateFollowedCreators(creatorIds) {
    this._followedCreatorIds = new Set(creatorIds);
  }
}

export default new NotificationService();