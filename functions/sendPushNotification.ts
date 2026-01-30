import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Notification types
const NOTIFICATION_TYPES = {
  NEW_FOLLOWER: 'new_follower',
  GIFT_RECEIVED: 'gift_received',
  STREAM_STARTED: 'stream_started',
  MENTION: 'mention',
  DIRECT_MESSAGE: 'direct_message',
  SUBSCRIPTION: 'subscription',
  PAYOUT_PROCESSED: 'payout_processed',
  SYSTEM: 'system'
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const data = await req.json();
    
    const { 
      action,
      recipientEmail,
      recipientEmails, // For bulk notifications
      notificationType,
      title,
      body,
      data: notificationData,
      // For stream start notifications
      creatorId,
      streamId
    } = data;

    switch (action) {
      case 'send_single': {
        // Send notification to single user
        const users = await base44.asServiceRole.entities.User.filter(
          { email: recipientEmail }, null, 1
        );
        const user = users[0];
        
        if (!user || !user.push_notifications_enabled) {
          return Response.json({ 
            success: false, 
            reason: 'User not found or notifications disabled' 
          });
        }

        // Check user's notification preferences
        const prefs = user.notification_preferences || {};
        const prefKey = notificationType.replace('_', '_');
        
        if (prefs[prefKey] === false) {
          return Response.json({ 
            success: false, 
            reason: 'User has disabled this notification type' 
          });
        }

        // Store notification in database
        await base44.asServiceRole.entities.PlatformAnalytics.create({
          metric_type: 'notification',
          metric_name: notificationType,
          metric_value: 1,
          metadata: {
            recipient_email: recipientEmail,
            title,
            body,
            data: notificationData,
            sent_at: new Date().toISOString(),
            read: false
          }
        });

        // In production, you would send to a push notification service here
        // For now, we store it for in-app notification retrieval
        
        return Response.json({ success: true, message: 'Notification queued' });
      }

      case 'notify_followers': {
        // Notify all followers when a creator goes live
        if (!creatorId || !streamId) {
          return Response.json({ error: 'creatorId and streamId required' }, { status: 400 });
        }

        // Get creator info
        const creator = await base44.asServiceRole.entities.Creator.filter(
          { id: creatorId }, null, 1
        );
        
        if (!creator[0]) {
          return Response.json({ error: 'Creator not found' }, { status: 404 });
        }

        // Get followers
        const followers = await base44.asServiceRole.entities.Follow.filter(
          { following_id: creatorId }, null, 1000
        );

        let notified = 0;
        let skipped = 0;

        for (const follow of followers) {
          // Check if user wants stream notifications
          const users = await base44.asServiceRole.entities.User.filter(
            { email: follow.follower_email }, null, 1
          );
          const user = users[0];

          if (user?.push_notifications_enabled && 
              user?.notification_preferences?.stream_start !== false) {
            
            await base44.asServiceRole.entities.PlatformAnalytics.create({
              metric_type: 'notification',
              metric_name: NOTIFICATION_TYPES.STREAM_STARTED,
              metric_value: 1,
              metadata: {
                recipient_email: follow.follower_email,
                title: `${creator[0].display_name} is live!`,
                body: `Watch now: ${creator[0].display_name} just started streaming`,
                data: { streamId, creatorId },
                sent_at: new Date().toISOString(),
                read: false
              }
            });
            notified++;
          } else {
            skipped++;
          }
        }

        return Response.json({ 
          success: true, 
          notified, 
          skipped,
          total: followers.length 
        });
      }

      case 'get_notifications': {
        // Get user's notifications
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notifications = await base44.entities.PlatformAnalytics.filter(
          { 
            metric_type: 'notification',
            'metadata.recipient_email': user.email 
          },
          '-created_date',
          50
        );

        return Response.json({ notifications });
      }

      case 'mark_read': {
        // Mark notification as read
        const { notificationId } = data;
        const user = await base44.auth.me();
        
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notification = await base44.entities.PlatformAnalytics.filter(
          { id: notificationId }, null, 1
        );

        if (notification[0]?.metadata?.recipient_email !== user.email) {
          return Response.json({ error: 'Forbidden' }, { status: 403 });
        }

        await base44.entities.PlatformAnalytics.update(notificationId, {
          metadata: {
            ...notification[0].metadata,
            read: true,
            read_at: new Date().toISOString()
          }
        });

        return Response.json({ success: true });
      }

      case 'mark_all_read': {
        const user = await base44.auth.me();
        if (!user) {
          return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notifications = await base44.entities.PlatformAnalytics.filter(
          { 
            metric_type: 'notification',
            'metadata.recipient_email': user.email,
            'metadata.read': false
          },
          null,
          100
        );

        for (const notif of notifications) {
          await base44.entities.PlatformAnalytics.update(notif.id, {
            metadata: {
              ...notif.metadata,
              read: true,
              read_at: new Date().toISOString()
            }
          });
        }

        return Response.json({ success: true, marked: notifications.length });
      }

      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
    
  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});