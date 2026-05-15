/* eslint-disable no-undef */
// ═══ CONVERTED: legionCompanionChat — Base44 → Supabase Edge Function ═══
// NOTE: This used Base44's InvokeLLM with claude_sonnet_4_6 model.
// Replace with direct Anthropic SDK call. Set ANTHROPIC_API_KEY in secrets.
// Or use OpenAI if you prefer — just change the API call below.

import { createClient } from 'npm:@supabase/supabase-js@2';
import Anthropic from 'npm:@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY') });

Deno.serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL'),
    Deno.env.get('SUPABASE_SERVICE_KEY')
  );

  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace('Bearer ', '');
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
  if (authError || !authUser) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { data: userProfile } = await supabase.from('user').select('*').eq('email', authUser.email).single();
  const user = { ...authUser, ...userProfile };

  const body = await req.json();
  const { message, action } = body;
  const email = user.email;

  if (action) {
    return await handleAction(supabase, user, action);
  }

  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Message required' }, { status: 400 });
  }

  const context = await gatherCreatorContext(supabase, email, user);

  // Fetch or create companion memory
  const { data: memories } = await supabase
    .from('legion_companion_memory')
    .select('*')
    .eq('creator_email', email)
    .limit(1);
  let memory = (memories || [])[0] || null;
  if (!memory) {
    const { data: newMem } = await supabase.from('legion_companion_memory').insert({
      creator_email: email,
      creator_dna: JSON.stringify({ name: user.full_name, joined: new Date().toISOString() }),
      total_interactions: 0,
      companion_version: 1,
      conversation_summary: '',
      goals: '[]',
      personality_notes: '',
    }).select().single();
    memory = newMem;
  }

  const conversationSummary = memory.conversation_summary || '';
  const goals = memory.goals || '[]';
  const personalityNotes = memory.personality_notes || '';
  const systemPrompt = buildSystemPrompt(user, email, context, goals, personalityNotes, conversationSummary);

  // Call Anthropic Claude directly
  const llmResponse = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `${systemPrompt}\n\nCreator says: "${message}"\n\nRespond as JSON with keys: reply (string), actions (array, optional), memory_update (object, optional with goals_update and personality_note).`
    }],
  });

  let parsed;
  try {
    const text = llmResponse.content[0].text;
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { reply: text };
  } catch {
    parsed = { reply: llmResponse.content[0].text };
  }

  const reply = parsed?.reply || 'Sorry, I had trouble responding. Try again.';
  const actions = parsed?.actions || [];
  const memoryUpdate = parsed?.memory_update || {};

  // Update memory
  const newInteractionCount = (memory.total_interactions || 0) + 1;
  const updatedSummary = conversationSummary
    ? `${conversationSummary}\n[${new Date().toISOString().split('T')[0]}] User: ${message.slice(0, 100)} | Legion: ${reply.slice(0, 150)}`
    : `[${new Date().toISOString().split('T')[0]}] User: ${message.slice(0, 100)} | Legion: ${reply.slice(0, 150)}`;
  const trimmedSummary = updatedSummary.length > 2000 ? '...' + updatedSummary.slice(-1997) : updatedSummary;

  const memUpdate = {
    total_interactions: newInteractionCount,
    last_interaction_at: new Date().toISOString(),
    conversation_summary: trimmedSummary,
    companion_version: (memory.companion_version || 1) + 1,
  };
  if (memoryUpdate.goals_update) memUpdate.goals = memoryUpdate.goals_update;
  if (memoryUpdate.personality_note) {
    memUpdate.personality_notes = ((personalityNotes || '') + '\n' + memoryUpdate.personality_note).slice(-1000);
  }

  await supabase.from('legion_companion_memory').update(memUpdate).eq('id', memory.id);

  await supabase.from('legion_companion_event').insert({
    creator_email: email,
    event_type: 'conversation',
    event_data: JSON.stringify({ user_message: message.slice(0, 200) }),
    insight_generated: reply.slice(0, 500),
    timestamp_utc: new Date().toISOString(),
  });

  return Response.json({ reply, actions, interaction_count: newInteractionCount });
});


async function gatherCreatorContext(supabase, email, user) {
  const ctx = {
    creator: null, wallet: null, recentStreams: [], scheduledStreams: [],
    followerCount: 0, giftTransactions: [], subscription: null,
    earnings: { total_denarii: 0, total_usd: 0 }, topGifters: [], milestones: [],
  };

  try {
    const { data: creators } = await supabase.from('creator').select('*').eq('user_email', email).limit(1);
    if ((creators || [])[0]) {
      const c = creators[0];
      ctx.creator = {
        display_name: c.display_name, follower_count: c.follower_count || 0,
        following_count: c.following_count || 0, total_earnings_denarii: c.total_earnings_denarii || 0,
        level: c.level || 1, xp: c.experience_points || 0, is_verified: c.is_verified || false,
        category: c.category || 'other', pk_wins: c.pk_wins || 0, pk_losses: c.pk_losses || 0,
        is_live: c.is_live || false, bio: c.bio || '', id: c.id,
      };
    }
  } catch (e) { /* no creator */ }

  try {
    const { data: wallets } = await supabase.from('wallet').select('*').eq('user_email', email).limit(1);
    if ((wallets || [])[0]) {
      const w = wallets[0];
      ctx.wallet = {
        denarii: w.denarii_balance || 0, total_spent: w.total_spent || 0,
        total_earned: w.total_earned || 0, total_purchased_usd: w.total_purchased_usd || 0,
        vip_level: w.vip_level || 0, daily_streak: w.daily_streak || 0,
      };
    }
  } catch (e) { /* no wallet */ }

  try {
    if (ctx.creator?.id) {
      const { data: streams } = await supabase.from('stream').select('*')
        .eq('creator_id', ctx.creator.id).order('created_date', { ascending: false }).limit(10);
      ctx.recentStreams = (streams || []).map(s => ({
        title: s.title, peak_viewers: s.peak_viewers || 0, viewer_count: s.viewer_count || 0,
        denarii_earned: s.total_denarii_earned || 0, gifts: s.total_gifts_received || 0,
        duration: s.duration_minutes || 0, category: s.category, date: s.created_date, status: s.status,
      }));
    }
  } catch (e) { /* no streams */ }

  try {
    if (ctx.creator?.id) {
      const { data: scheduled } = await supabase.from('scheduled_stream').select('*')
        .eq('creator_id', ctx.creator.id).eq('status', 'scheduled')
        .order('scheduled_at', { ascending: true }).limit(5);
      ctx.scheduledStreams = (scheduled || []).map(s => ({
        title: s.title, scheduled_at: s.scheduled_at, category: s.category,
        duration: s.duration_minutes, is_recurring: s.is_recurring, id: s.id,
      }));
    }
  } catch (e) { /* no scheduled */ }

  try {
    const { data: subs } = await supabase.from('creator_subscription').select('*')
      .eq('user_email', email).eq('status', 'active')
      .order('created_date', { ascending: false }).limit(1);
    if ((subs || [])[0]) {
      ctx.subscription = { plan: subs[0].plan_type, status: subs[0].status, period_end: subs[0].current_period_end };
    }
  } catch (e) { /* no sub */ }

  try {
    if (ctx.creator?.id) {
      const { data: gifts } = await supabase.from('gift_transaction').select('*')
        .eq('receiver_creator_id', ctx.creator.id).order('created_date', { ascending: false }).limit(10);
      ctx.giftTransactions = (gifts || []).map(g => ({
        from: g.sender_email || 'Anonymous', gift_name: g.gift_name || 'Gift',
        quantity: g.quantity || 1, value: g.total_as_value || 0, date: g.created_date,
      }));
      const gifterMap = {};
      (gifts || []).forEach(g => {
        const key = g.sender_email || 'Anon';
        gifterMap[key] = (gifterMap[key] || 0) + (g.total_as_value || 0);
      });
      ctx.topGifters = Object.entries(gifterMap).sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([name, total]) => ({ name, total_value: total }));
    }
  } catch (e) { /* no gifts */ }

  try {
    const { data: ms } = await supabase.from('creator_milestone').select('*')
      .eq('creator_email', email).order('achieved_date', { ascending: false }).limit(5);
    ctx.milestones = (ms || []).map(m => ({
      type: m.milestone_type, value: m.milestone_value, reward: m.reward_unlocked, date: m.achieved_date,
    }));
  } catch (e) { /* no milestones */ }

  return ctx;
}


function buildSystemPrompt(user, email, ctx, goals, personalityNotes, conversationSummary) {
  return `You are Legion — the ultimate AI companion for creators on Legion Live, a live-streaming platform.

YOUR PERSONALITY:
- Warm, encouraging, direct — like a trusted friend who is also a brilliant business strategist
- Speak casually but with substance. No corporate fluff. Never say "as an AI".
- Use the creator's first name naturally. Be specific, never generic.
- Give actionable, concrete advice — not vague motivation
- Use emojis sparingly. Keep responses concise (2-3 paragraphs max unless detail is asked)

CREATOR PROFILE:
- Name: ${user.full_name || 'Creator'}
- Email: ${email}
- Creator Stats: ${JSON.stringify(ctx.creator || { status: 'No creator profile yet' })}
- Wallet: ${JSON.stringify(ctx.wallet || { status: 'No wallet yet' })}
- Subscription: ${JSON.stringify(ctx.subscription || { status: 'No active subscription' })}

STREAMING DATA:
- Recent Streams (last 10): ${JSON.stringify(ctx.recentStreams)}
- Upcoming Scheduled Streams: ${JSON.stringify(ctx.scheduledStreams)}

MONETIZATION DATA:
- Recent Gifts Received: ${JSON.stringify(ctx.giftTransactions)}
- Top Gifters: ${JSON.stringify(ctx.topGifters)}
- Milestones Achieved: ${JSON.stringify(ctx.milestones)}

MEMORY:
- Past Goals: ${goals}
- Personality Notes: ${personalityNotes}
- Conversation History: ${conversationSummary}

CAPABILITIES — You can suggest ACTIONS:
1. **schedule_stream** — Include title, scheduled_at (ISO), category, duration_minutes in data.
2. **set_goal** — Include goal_text, target_value, metric in data.
3. **content_idea** — Include idea_title, idea_description, format in data.
4. **analytics_insight** — Include metric, current_value, trend, recommendation in data.

Only suggest actions when naturally relevant. Make data specific and ready to use.`;
}


async function handleAction(supabase, user, action) {
  const email = user.email;
  try {
    if (action.type === 'schedule_stream') {
      const { data: creators } = await supabase.from('creator').select('id').eq('user_email', email).limit(1);
      const creatorId = (creators || [])[0]?.id;
      if (!creatorId) return Response.json({ error: 'Create a creator profile first' }, { status: 400 });

      const { data: scheduled } = await supabase.from('scheduled_stream').insert({
        creator_id: creatorId,
        title: action.data.title || 'Untitled Stream',
        scheduled_at: action.data.scheduled_at,
        category: action.data.category || 'talk_show',
        duration_minutes: action.data.duration_minutes || 60,
        status: 'scheduled',
      }).select().single();
      return Response.json({ success: true, message: 'Stream scheduled!', data: scheduled });
    }

    if (action.type === 'set_goal') {
      const { data: mems } = await supabase.from('legion_companion_memory').select('*').eq('creator_email', email).limit(1);
      if ((mems || [])[0]) {
        let existingGoals = [];
        try { existingGoals = JSON.parse(mems[0].goals || '[]'); } catch { existingGoals = []; }
        existingGoals.push({
          goal: action.data.goal_text, target: action.data.target_value,
          metric: action.data.metric, set_at: new Date().toISOString(), status: 'active',
        });
        await supabase.from('legion_companion_memory').update({
          goals: JSON.stringify(existingGoals.slice(-10)),
        }).eq('id', mems[0].id);
      }
      return Response.json({ success: true, message: 'Goal set!' });
    }

    return Response.json({ error: 'Unknown action type' }, { status: 400 });
  } catch (error) {
    console.error('Action error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}