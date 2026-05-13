import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { message, action } = body;

  const email = user.email;

  // ── Handle action execution (schedule, goals, etc.) ──
  if (action) {
    return await handleAction(base44, user, action);
  }

  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Message required' }, { status: 400 });
  }

  // ── Gather comprehensive creator context ──
  const context = await gatherCreatorContext(base44, email, user);

  // ── Fetch or create companion memory ──
  let memories = await base44.asServiceRole.entities.LegionCompanionMemory.filter(
    { creator_email: email }, null, 1
  );
  let memory = memories[0] || null;
  if (!memory) {
    memory = await base44.asServiceRole.entities.LegionCompanionMemory.create({
      creator_email: email,
      creator_dna: JSON.stringify({ name: user.full_name, joined: new Date().toISOString() }),
      total_interactions: 0,
      companion_version: 1,
      conversation_summary: '',
      goals: '[]',
      personality_notes: '',
    });
  }

  const conversationSummary = memory.conversation_summary || '';
  const goals = memory.goals || '[]';
  const personalityNotes = memory.personality_notes || '';

  const systemPrompt = buildSystemPrompt(user, email, context, goals, personalityNotes, conversationSummary);

  // ── Call LLM with structured response schema ──
  const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `${systemPrompt}\n\nCreator says: "${message}"`,
    response_json_schema: {
      type: 'object',
      properties: {
        reply: { type: 'string', description: 'Your conversational response to the creator' },
        actions: {
          type: 'array',
          description: 'Optional actionable items the creator can execute. Only include when the conversation naturally suggests an action.',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string', enum: ['schedule_stream', 'set_goal', 'draft_message', 'content_idea', 'analytics_insight'] },
              title: { type: 'string' },
              description: { type: 'string' },
              data: { type: 'object', description: 'Action-specific data' }
            }
          }
        },
        memory_update: {
          type: 'object',
          description: 'Any new insights to remember about this creator',
          properties: {
            goals_update: { type: 'string', description: 'Updated goals JSON if the creator mentioned new goals' },
            personality_note: { type: 'string', description: 'New personality observation' }
          }
        }
      },
      required: ['reply']
    },
    model: 'claude_sonnet_4_6',
  });

  const reply = llmResponse?.reply || 'Sorry, I had trouble responding. Try again.';
  const actions = llmResponse?.actions || [];
  const memoryUpdate = llmResponse?.memory_update || {};

  // ── Update memory ──
  const newInteractionCount = (memory.total_interactions || 0) + 1;
  const updatedSummary = conversationSummary
    ? `${conversationSummary}\n[${new Date().toISOString().split('T')[0]}] User: ${message.slice(0, 100)} | Legion: ${reply.slice(0, 150)}`
    : `[${new Date().toISOString().split('T')[0]}] User: ${message.slice(0, 100)} | Legion: ${reply.slice(0, 150)}`;

  const trimmedSummary = updatedSummary.length > 2000
    ? '...' + updatedSummary.slice(-1997)
    : updatedSummary;

  const memUpdate = {
    total_interactions: newInteractionCount,
    last_interaction_at: new Date().toISOString(),
    conversation_summary: trimmedSummary,
    companion_version: (memory.companion_version || 1) + 1,
  };

  if (memoryUpdate.goals_update) {
    memUpdate.goals = memoryUpdate.goals_update;
  }
  if (memoryUpdate.personality_note) {
    const existing = personalityNotes || '';
    memUpdate.personality_notes = (existing + '\n' + memoryUpdate.personality_note).slice(-1000);
  }

  await base44.asServiceRole.entities.LegionCompanionMemory.update(memory.id, memUpdate);

  // Log event
  await base44.asServiceRole.entities.LegionCompanionEvent.create({
    creator_email: email,
    event_type: 'conversation',
    event_data: JSON.stringify({ user_message: message.slice(0, 200) }),
    insight_generated: reply.slice(0, 500),
    timestamp_utc: new Date().toISOString(),
  });

  return Response.json({ reply, actions, interaction_count: newInteractionCount });
});


// ── Gather all relevant creator data ──
async function gatherCreatorContext(base44, email, user) {
  const ctx = {
    creator: null,
    wallet: null,
    recentStreams: [],
    scheduledStreams: [],
    followerCount: 0,
    giftTransactions: [],
    subscription: null,
    earnings: { total_denarii: 0, total_usd: 0 },
    topGifters: [],
    milestones: [],
  };

  // Creator profile
  try {
    const creators = await base44.asServiceRole.entities.Creator.filter({ user_email: email }, null, 1);
    if (creators[0]) {
      ctx.creator = {
        display_name: creators[0].display_name,
        follower_count: creators[0].follower_count || 0,
        following_count: creators[0].following_count || 0,
        total_earnings_denarii: creators[0].total_earnings_denarii || 0,
        level: creators[0].level || 1,
        xp: creators[0].experience_points || 0,
        is_verified: creators[0].is_verified || false,
        category: creators[0].category || 'other',
        pk_wins: creators[0].pk_wins || 0,
        pk_losses: creators[0].pk_losses || 0,
        is_live: creators[0].is_live || false,
        bio: creators[0].bio || '',
        id: creators[0].id,
      };
    }
  } catch (e) { console.log('No creator profile:', e.message); }

  // Wallet
  try {
    const wallets = await base44.asServiceRole.entities.Wallet.filter({ user_email: email }, null, 1);
    if (wallets[0]) {
      ctx.wallet = {
        denarii: wallets[0].denarii_balance || 0,
        total_spent: wallets[0].total_spent || 0,
        total_earned: wallets[0].total_earned || 0,
        total_purchased_usd: wallets[0].total_purchased_usd || 0,
        vip_level: wallets[0].vip_level || 0,
        daily_streak: wallets[0].daily_streak || 0,
      };
    }
  } catch (e) { /* no wallet */ }

  // Recent streams (last 10)
  try {
    const creatorId = ctx.creator?.id;
    if (creatorId) {
      const streams = await base44.asServiceRole.entities.Stream.filter(
        { creator_id: creatorId }, '-created_date', 10
      );
      ctx.recentStreams = streams.map(s => ({
        title: s.title,
        peak_viewers: s.peak_viewers || 0,
        viewer_count: s.viewer_count || 0,
        denarii_earned: s.total_denarii_earned || 0,
        gifts: s.total_gifts_received || 0,
        duration: s.duration_minutes || 0,
        category: s.category,
        date: s.created_date,
        status: s.status,
      }));
    }
  } catch (e) { /* no streams */ }

  // Scheduled streams
  try {
    const creatorId = ctx.creator?.id;
    if (creatorId) {
      const scheduled = await base44.asServiceRole.entities.ScheduledStream.filter(
        { creator_id: creatorId, status: 'scheduled' }, 'scheduled_at', 5
      );
      ctx.scheduledStreams = scheduled.map(s => ({
        title: s.title,
        scheduled_at: s.scheduled_at,
        category: s.category,
        duration: s.duration_minutes,
        is_recurring: s.is_recurring,
        id: s.id,
      }));
    }
  } catch (e) { /* no scheduled */ }

  // Subscription status
  try {
    const subs = await base44.asServiceRole.entities.CreatorSubscription.filter(
      { user_email: email, status: 'active' }, '-created_date', 1
    );
    if (subs[0]) {
      ctx.subscription = {
        plan: subs[0].plan_type,
        status: subs[0].status,
        period_end: subs[0].current_period_end,
      };
    }
  } catch (e) { /* no sub */ }

  // Recent gift transactions received (last 10)
  try {
    const creatorId = ctx.creator?.id;
    if (creatorId) {
      const gifts = await base44.asServiceRole.entities.GiftTransaction.filter(
        { receiver_creator_id: creatorId }, '-created_date', 10
      );
      ctx.giftTransactions = gifts.map(g => ({
        from: g.sender_email || 'Anonymous',
        gift_name: g.gift_name || 'Gift',
        quantity: g.quantity || 1,
        value: g.total_as_value || 0,
        date: g.created_date,
      }));
      // Top gifters
      const gifterMap = {};
      gifts.forEach(g => {
        const key = g.sender_email || 'Anon';
        gifterMap[key] = (gifterMap[key] || 0) + (g.total_as_value || 0);
      });
      ctx.topGifters = Object.entries(gifterMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, total]) => ({ name, total_value: total }));
    }
  } catch (e) { /* no gifts */ }

  // Milestones
  try {
    const ms = await base44.asServiceRole.entities.CreatorMilestone.filter(
      { creator_email: email }, '-achieved_date', 5
    );
    ctx.milestones = ms.map(m => ({
      type: m.milestone_type,
      value: m.milestone_value,
      reward: m.reward_unlocked,
      date: m.achieved_date,
    }));
  } catch (e) { /* no milestones */ }

  return ctx;
}


// ── Build the system prompt ──
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

CAPABILITIES — You can suggest ACTIONS for the creator to execute:
1. **schedule_stream** — Suggest scheduling a stream. Include title, scheduled_at (ISO), category, duration_minutes in data.
2. **set_goal** — Help set measurable goals. Include goal_text, target_value, metric in data.
3. **draft_message** — Craft a message for social media, stream description, or announcements. Include platform, message_text in data.
4. **content_idea** — Suggest content ideas. Include idea_title, idea_description, format (stream/video/short) in data.
5. **analytics_insight** — Surface a data-driven insight. Include metric, current_value, trend, recommendation in data.

RULES FOR ACTIONS:
- Only suggest actions when naturally relevant to the conversation
- Make action data specific and ready to use (not placeholder text)
- Multiple actions can be returned at once
- For schedule_stream: suggest specific times based on their streaming history patterns
- For draft_message: craft platform-appropriate copy (short for social, detailed for descriptions)
- NEVER modify or reference the Direct Messaging feature — that is a separate private communication channel between hosts

IMPORTANT: You have REAL data about this creator. Reference it with specific numbers and insights. If they have no streams, encourage them to start and help them plan. If they have data, analyze trends and give targeted advice.`;
}


// ── Handle action execution ──
async function handleAction(base44, user, action) {
  const email = user.email;

  try {
    if (action.type === 'schedule_stream') {
      // Find creator ID
      const creators = await base44.asServiceRole.entities.Creator.filter({ user_email: email }, null, 1);
      const creatorId = creators[0]?.id;
      if (!creatorId) return Response.json({ error: 'Create a creator profile first' }, { status: 400 });

      const scheduled = await base44.asServiceRole.entities.ScheduledStream.create({
        creator_id: creatorId,
        title: action.data.title || 'Untitled Stream',
        scheduled_at: action.data.scheduled_at,
        category: action.data.category || 'talk_show',
        duration_minutes: action.data.duration_minutes || 60,
        status: 'scheduled',
      });
      return Response.json({ success: true, message: 'Stream scheduled!', data: scheduled });
    }

    if (action.type === 'set_goal') {
      const memories = await base44.asServiceRole.entities.LegionCompanionMemory.filter(
        { creator_email: email }, null, 1
      );
      if (memories[0]) {
        let existingGoals = [];
        try { existingGoals = JSON.parse(memories[0].goals || '[]'); } catch { existingGoals = []; }
        existingGoals.push({
          goal: action.data.goal_text,
          target: action.data.target_value,
          metric: action.data.metric,
          set_at: new Date().toISOString(),
          status: 'active',
        });
        await base44.asServiceRole.entities.LegionCompanionMemory.update(memories[0].id, {
          goals: JSON.stringify(existingGoals.slice(-10)), // keep last 10
        });
      }
      return Response.json({ success: true, message: 'Goal set!' });
    }

    return Response.json({ error: 'Unknown action type' }, { status: 400 });
  } catch (error) {
    console.error('Action error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}