/* eslint-disable no-undef */
// ═══ CONVERTED: moderateChat — Base44 → Supabase Edge Function ═══
// NOTE: This function used Base44's InvokeLLM integration.
// You need to replace it with a direct OpenAI call.
// Set OPENAI_API_KEY in your Supabase secrets.

import { createClient } from 'npm:@supabase/supabase-js@2';
import OpenAI from 'npm:openai';

const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { message, stream_id, user_name } = await req.json();
    const user_email = user.email;

    // Check bans
    const { data: bans } = await supabase
      .from('user_ban')
      .select('*')
      .eq('user_email', user_email)
      .eq('is_active', true)
      .limit(10);

    const now = new Date();
    const activeBan = (bans || []).find(b => !b.expires_at || new Date(b.expires_at) > now);
    if (activeBan) {
      if (activeBan.ban_type === 'global' || activeBan.stream_id === stream_id) {
        return Response.json({ approved: false, action: 'banned', reason: 'User is banned' });
      }
    }

    // LLM moderation via OpenAI directly
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'user',
        content: `Moderate this chat message for a live streaming platform. Analyze for: harassment, explicit content, spam, or suspicious behavior.

Message: "${message}"

Respond with JSON:
{
  "status": "fine" | "suspicious" | "violation",
  "category": "none" | "spam" | "harassment" | "explicit" | "suspicious",
  "confidence": 0-1,
  "reason": "brief reason"
}

Only flag as violation if CERTAIN (confidence > 0.85). Default to fine/suspicious.`
      }],
      response_format: { type: 'json_object' }
    });

    const modResult = JSON.parse(completion.choices[0].message.content);

    if (modResult.status === 'violation') {
      await supabase.from('moderation_alert').insert({
        stream_id, user_email, user_name,
        alert_type: modResult.category || 'explicit',
        severity: modResult.confidence > 0.95 ? 'high' : 'medium',
        content: message,
        ai_confidence: modResult.confidence,
        action_taken: 'message_removed'
      });

      if (modResult.confidence > 0.95) {
        await supabase.from('user_ban').insert({
          user_email, stream_id,
          ban_type: 'stream',
          reason: `Auto-banned: ${modResult.reason}`,
          severity: 'temporary',
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          banned_by_email: 'system@ai'
        });

        await supabase.from('moderation_alert').insert({
          stream_id, user_email, user_name,
          alert_type: modResult.category || 'explicit',
          severity: 'high',
          content: message,
          ai_confidence: modResult.confidence,
          action_taken: 'banned',
          admin_decision: 'approved'
        });
      }

      return Response.json({ approved: false, action: 'message_removed', reason: modResult.reason });
    }

    if (modResult.status === 'suspicious') {
      await supabase.from('moderation_alert').insert({
        stream_id, user_email, user_name,
        alert_type: 'suspicious',
        severity: 'low',
        content: message,
        ai_confidence: modResult.confidence,
        action_taken: 'none'
      });
      return Response.json({ approved: true, flagged: true, flag_reason: modResult.reason, confidence: modResult.confidence });
    }

    return Response.json({ approved: true, flagged: false });

  } catch (error) {
    console.error('Moderation error:', error);
    return Response.json({ approved: true, flagged: false, error: error.message });
  }
});