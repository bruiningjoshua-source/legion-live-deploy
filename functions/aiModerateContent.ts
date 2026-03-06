import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const caller = await base44.auth.me();
    if (!caller) {
      return Response.json({ approved: false, action: 'unauthorized', reason: 'Authentication required' }, { status: 401 });
    }

    const { content_type, content, stream_id, user_email, user_name, context } = await req.json();

    console.log(`[aiModerateContent] Moderating ${content_type} from ${user_email} (caller: ${caller.email})`);

    // Check if user is banned
    const bans = await base44.asServiceRole.entities.UserBan.filter({
      user_email: user_email,
      is_active: true
    }, null, 10);

    const now = new Date();
    const activeBan = bans.find(b => !b.expires_at || new Date(b.expires_at) > now);
    
    if (activeBan) {
      if (activeBan.ban_type === 'global' || activeBan.stream_id === stream_id) {
        return Response.json({
          approved: false,
          action: 'banned',
          reason: `User is banned until ${activeBan.expires_at || 'indefinitely'}`,
          ban_reason: activeBan.reason
        });
      }
    }

    // Build comprehensive moderation prompt
    const moderationPrompt = `You are an AI content moderator for a live streaming platform. Analyze the following ${content_type} for policy violations.

CONTENT TO MODERATE:
"${content}"

CONTEXT:
- Content Type: ${content_type}
- Stream ID: ${stream_id || 'N/A'}
${context ? `- Additional Context: ${context}` : ''}

MODERATION CATEGORIES TO CHECK:
1. HATE SPEECH: Slurs, discriminatory language, attacks on protected groups
2. HARASSMENT: Personal attacks, bullying, threats, doxxing attempts
3. EXPLICIT/SEXUAL: Sexual content, graphic descriptions, NSFW material
4. VIOLENCE: Threats, glorification of violence, graphic violence descriptions
5. SPAM: Repeated messages, promotional spam, scam links, excessive caps
6. SELF-HARM: Suicide/self-harm encouragement or instructions
7. ILLEGAL: Drug dealing, weapons sales, illegal activities
8. PERSONAL INFO: Phone numbers, addresses, private information exposure
9. IMPERSONATION: Fake identities, pretending to be staff/creators

RESPONSE FORMAT (JSON):
{
  "status": "approved" | "warning" | "removed" | "ban_required",
  "category": "none" | "hate_speech" | "harassment" | "explicit" | "violence" | "spam" | "self_harm" | "illegal" | "personal_info" | "impersonation",
  "severity": "none" | "low" | "medium" | "high" | "critical",
  "confidence": 0.0 to 1.0,
  "reason": "Brief explanation",
  "suggested_action": "none" | "warn_user" | "remove_content" | "timeout_1h" | "timeout_24h" | "permanent_ban",
  "flagged_phrases": ["list", "of", "problematic", "phrases"],
  "safe_for_minors": true | false
}

MODERATION GUIDELINES:
- Be CERTAIN before flagging (confidence > 0.8 for removals)
- Context matters - sarcasm, quotes, and discussions ABOUT topics are different from promoting them
- Assume good faith for borderline cases
- Protect free speech while maintaining safety
- Gaming/streaming slang and mild profanity are generally acceptable
- Prioritize safety for serious threats, hate speech, and illegal content`;

    const modResponse = await base44.integrations.Core.InvokeLLM({
      prompt: moderationPrompt,
      response_json_schema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["approved", "warning", "removed", "ban_required"] },
          category: { type: "string" },
          severity: { type: "string", enum: ["none", "low", "medium", "high", "critical"] },
          confidence: { type: "number" },
          reason: { type: "string" },
          suggested_action: { type: "string" },
          flagged_phrases: { type: "array", items: { type: "string" } },
          safe_for_minors: { type: "boolean" }
        }
      }
    });

    const result = modResponse;
    console.log('Moderation result:', JSON.stringify(result));

    // Handle different moderation outcomes
    if (result.status === 'ban_required' && result.confidence > 0.9) {
      // Create ban
      await base44.asServiceRole.entities.UserBan.create({
        user_email: user_email,
        stream_id: stream_id,
        ban_type: result.severity === 'critical' ? 'global' : 'stream',
        reason: `AI Moderation: ${result.reason}`,
        severity: result.severity === 'critical' ? 'permanent' : 'temporary',
        expires_at: result.severity === 'critical' 
          ? null 
          : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        banned_by_email: 'ai-moderator@system',
        is_active: true
      });

      // Create high-priority alert
      await base44.asServiceRole.entities.ModerationAlert.create({
        stream_id: stream_id,
        user_email: user_email,
        user_name: user_name,
        alert_type: result.category,
        severity: 'critical',
        content: content,
        ai_confidence: result.confidence,
        action_taken: 'banned',
        admin_decision: 'pending',
        flagged_phrases: result.flagged_phrases
      });

      return Response.json({
        approved: false,
        action: 'banned',
        reason: result.reason,
        ban_duration: result.severity === 'critical' ? 'permanent' : '24 hours',
        category: result.category
      });
    }

    if (result.status === 'removed') {
      // Create alert for review
      await base44.asServiceRole.entities.ModerationAlert.create({
        stream_id: stream_id,
        user_email: user_email,
        user_name: user_name,
        alert_type: result.category,
        severity: result.severity,
        content: content,
        ai_confidence: result.confidence,
        action_taken: 'content_removed',
        admin_decision: 'pending',
        flagged_phrases: result.flagged_phrases
      });

      return Response.json({
        approved: false,
        action: 'removed',
        reason: result.reason,
        category: result.category,
        severity: result.severity
      });
    }

    if (result.status === 'warning') {
      // Create low-priority alert
      await base44.asServiceRole.entities.ModerationAlert.create({
        stream_id: stream_id,
        user_email: user_email,
        user_name: user_name,
        alert_type: 'warning',
        severity: 'low',
        content: content,
        ai_confidence: result.confidence,
        action_taken: 'warned',
        admin_decision: 'pending',
        flagged_phrases: result.flagged_phrases
      });

      return Response.json({
        approved: true,
        flagged: true,
        warning: result.reason,
        category: result.category,
        safe_for_minors: result.safe_for_minors
      });
    }

    // Approved
    return Response.json({
      approved: true,
      flagged: false,
      safe_for_minors: result.safe_for_minors,
      confidence: result.confidence
    });

  } catch (error) {
    console.error('AI Moderation error:', error);
    // Fail open with flag
    return Response.json({
      approved: true,
      flagged: true,
      error: error.message,
      warning: 'Moderation temporarily unavailable'
    });
  }
});