/* eslint-disable no-undef */
// ═══ CONVERTED: aiModerateContent ═══
// NOTE: Replaces base44.integrations.Core.InvokeLLM with direct OpenAI call.
// Set OPENAI_API_KEY in Supabase secrets.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ approved: false, action: 'unauthorized' }, { status: 401 });

    const { content_type, content, stream_id, user_email, user_name, context } = await req.json();

    // Check bans
    const { data: bans } = await supabase.from('user_ban').select('*').eq('user_email', user_email).eq('is_active', true).limit(10);
    const now = new Date();
    const activeBan = (bans||[]).find(b => !b.expires_at || new Date(b.expires_at) > now);
    if (activeBan && (activeBan.ban_type === 'global' || activeBan.stream_id === stream_id)) {
      return Response.json({ approved: false, action: 'banned', reason: `Banned until ${activeBan.expires_at || 'indefinitely'}` });
    }

    const moderationPrompt = `You are an AI content moderator for a live streaming platform. Analyze: "${content}" (${content_type}). Stream: ${stream_id||'N/A'}. ${context||''}
Return JSON: { "status": "approved"|"warning"|"removed"|"ban_required", "category": "none"|"hate_speech"|"harassment"|"explicit"|"violence"|"spam"|"self_harm"|"illegal", "severity": "none"|"low"|"medium"|"high"|"critical", "confidence": 0-1, "reason": "...", "suggested_action": "none"|"warn_user"|"remove_content"|"timeout_24h"|"permanent_ban", "flagged_phrases": [], "safe_for_minors": true|false }`;

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}` },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [{ role: 'user', content: moderationPrompt }], response_format: { type: 'json_object' } })
    });
    const openaiData = await openaiRes.json();
    const result = JSON.parse(openaiData.choices?.[0]?.message?.content || '{"status":"approved","confidence":0}');

    if (result.status === 'ban_required' && result.confidence > 0.9) {
      await supabase.from('user_ban').insert({ user_email, stream_id, ban_type: result.severity === 'critical' ? 'global' : 'stream', reason: `AI: ${result.reason}`, severity: result.severity === 'critical' ? 'permanent' : 'temporary', expires_at: result.severity === 'critical' ? null : new Date(Date.now() + 86400000).toISOString(), banned_by_email: 'ai-moderator@system', is_active: true });
      await supabase.from('moderation_alert').insert({ stream_id, user_email, user_name, alert_type: result.category, severity: 'critical', content, ai_confidence: result.confidence, action_taken: 'banned', admin_decision: 'pending' }).catch(() => {});
      return Response.json({ approved: false, action: 'banned', reason: result.reason, category: result.category });
    }
    if (result.status === 'removed') {
      await supabase.from('moderation_alert').insert({ stream_id, user_email, user_name, alert_type: result.category, severity: result.severity, content, ai_confidence: result.confidence, action_taken: 'content_removed', admin_decision: 'pending' }).catch(() => {});
      return Response.json({ approved: false, action: 'removed', reason: result.reason, category: result.category });
    }
    if (result.status === 'warning') {
      await supabase.from('moderation_alert').insert({ stream_id, user_email, user_name, alert_type: 'warning', severity: 'low', content, ai_confidence: result.confidence, action_taken: 'warned', admin_decision: 'pending' }).catch(() => {});
      return Response.json({ approved: true, flagged: true, warning: result.reason });
    }
    return Response.json({ approved: true, flagged: false, safe_for_minors: result.safe_for_minors, confidence: result.confidence });
  } catch (error) {
    console.error('AI Moderation error:', error);
    return Response.json({ approved: true, flagged: true, warning: 'Moderation temporarily unavailable' });
  }
});