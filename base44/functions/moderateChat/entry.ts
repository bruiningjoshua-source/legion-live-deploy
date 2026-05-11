import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, stream_id, user_name } = await req.json();
    const user_email = user.email; // Always use server-side auth, never trust client-provided email

    // Check if user is banned
    const bans = await base44.asServiceRole.entities.UserBan.filter({
      user_email: user_email,
      is_active: true
    }, null, 10);

    // Check for active bans
    const now = new Date();
    const activeBan = bans.find(b => !b.expires_at || new Date(b.expires_at) > now);
    
    if (activeBan) {
      if (activeBan.ban_type === 'global' || activeBan.stream_id === stream_id) {
        return Response.json({
          approved: false,
          action: 'banned',
          reason: 'User is banned'
        });
      }
    }

    // Use LLM for content moderation - efficient single call
    const modResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `Moderate this chat message for a live streaming platform. Analyze for: harassment, explicit content, spam, or suspicious behavior.

Message: "${message}"

Respond with JSON:
{
  "status": "fine" | "suspicious" | "violation",
  "category": "none" | "spam" | "harassment" | "explicit" | "suspicious",
  "confidence": 0-1,
  "reason": "brief reason"
}

Only flag as violation if CERTAIN (confidence > 0.85). Default to fine/suspicious.`,
      response_json_schema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["fine", "suspicious", "violation"] },
          category: { type: "string" },
          confidence: { type: "number" },
          reason: { type: "string" }
        }
      }
    });

    const modResult = modResponse;
    
    // Handle violations
    if (modResult.status === 'violation') {
      // Create alert for manual review
      await base44.asServiceRole.entities.ModerationAlert.create({
        stream_id: stream_id,
        user_email: user_email,
        user_name: user_name,
        alert_type: modResult.category || 'explicit',
        severity: modResult.confidence > 0.95 ? 'high' : 'medium',
        content: message,
        ai_confidence: modResult.confidence,
        action_taken: 'message_removed'
      });

      // Auto-ban on high confidence violations
      if (modResult.confidence > 0.95) {
        // Create ban
        const ban = await base44.asServiceRole.entities.UserBan.create({
          user_email: user_email,
          stream_id: stream_id,
          ban_type: 'stream',
          reason: `Auto-banned: ${modResult.reason}`,
          severity: 'temporary',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          banned_by_email: 'system@ai'
        });

        // Create alert for action taken
        await base44.asServiceRole.entities.ModerationAlert.create({
          stream_id: stream_id,
          user_email: user_email,
          user_name: user_name,
          alert_type: modResult.category || 'explicit',
          severity: 'high',
          content: message,
          ai_confidence: modResult.confidence,
          action_taken: 'banned',
          admin_decision: 'approved'
        });
      }

      return Response.json({
        approved: false,
        action: 'message_removed',
        reason: modResult.reason
      });
    }

    // Handle suspicious behavior
    if (modResult.status === 'suspicious') {
      // Create low-priority alert for admin review
      await base44.asServiceRole.entities.ModerationAlert.create({
        stream_id: stream_id,
        user_email: user_email,
        user_name: user_name,
        alert_type: 'suspicious',
        severity: 'low',
        content: message,
        ai_confidence: modResult.confidence,
        action_taken: 'none'
      });

      // Allow message but flag it
      return Response.json({
        approved: true,
        flagged: true,
        flag_reason: modResult.reason,
        confidence: modResult.confidence
      });
    }

    // Fine - approve
    return Response.json({
      approved: true,
      flagged: false
    });

  } catch (error) {
    console.error('Moderation error:', error);
    // Fail open - allow message if moderation fails
    return Response.json({
      approved: true,
      flagged: false,
      error: error.message
    });
  }
});