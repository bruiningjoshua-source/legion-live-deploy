import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message || typeof message !== 'string') {
    return Response.json({ error: 'Message required' }, { status: 400 });
  }

  const email = user.email;

  // Fetch or create companion memory
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

  // Fetch recent creator data for context
  let creatorStats = {};
  try {
    const creators = await base44.asServiceRole.entities.Creator.filter(
      { user_email: email }, null, 1
    );
    if (creators[0]) {
      creatorStats = {
        display_name: creators[0].display_name,
        follower_count: creators[0].follower_count || 0,
        total_earnings: creators[0].total_earnings || 0,
        total_streams: creators[0].total_streams || 0,
        is_verified: creators[0].is_verified || false,
        category: creators[0].category || 'general',
      };
    }
  } catch (e) {
    console.log('No creator profile found, proceeding as viewer');
  }

  // Fetch recent streams for context
  let recentStreams = [];
  try {
    const streams = await base44.asServiceRole.entities.Stream.filter(
      { creator_id: email }, '-created_date', 5
    );
    recentStreams = streams.map(s => ({
      title: s.title,
      viewers: s.peak_viewers || 0,
      denarii: s.total_denarii_earned || 0,
      duration: s.duration_minutes || 0,
      date: s.created_date,
    }));
  } catch (e) { /* no streams */ }

  // Build the prompt with full context
  const conversationSummary = memory.conversation_summary || '';
  const goals = memory.goals || '[]';
  const personalityNotes = memory.personality_notes || '';

  const systemPrompt = `You are Legion — a personal AI companion for creators on Legion Live, a live-streaming and content platform (similar to TikTok Live / BIGO Live).

YOUR PERSONALITY:
- Warm, encouraging, and genuine — like a trusted friend who also happens to be a brilliant strategist
- Speak casually but with substance. No corporate fluff. No "as an AI" disclaimers.
- Use the creator's name naturally. Be specific, not generic.
- When giving advice, be actionable and concrete — not vague motivation
- You can be playful and use emojis sparingly
- Keep responses concise — 2-3 short paragraphs max unless they ask for detail

CREATOR CONTEXT:
- Name: ${user.full_name || 'Creator'}
- Email: ${email}
- Creator Stats: ${JSON.stringify(creatorStats)}
- Recent Streams: ${JSON.stringify(recentStreams)}
- Past Goals: ${goals}
- Personality Notes: ${personalityNotes}
- Conversation History Summary: ${conversationSummary}

YOU CAN HELP WITH:
- Stream strategy (best times, content ideas, audience growth)
- Monetization advice (tips, subscriptions, affiliate, brand deals)
- Content planning and scheduling
- Audience engagement tactics
- Emotional support and motivation
- Platform feature guidance
- Goal setting and tracking
- Analyzing past stream performance

IMPORTANT: You have real data about this creator. Reference it naturally when relevant. If they have no streams yet, encourage them to start. If they have data, analyze it and give specific insights.`;

  // Call LLM
  const llmResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `${systemPrompt}\n\nCreator says: "${message}"`,
    model: 'claude_sonnet_4_6',
  });

  const reply = typeof llmResponse === 'string' ? llmResponse : llmResponse?.response || String(llmResponse);

  // Update memory asynchronously
  const newInteractionCount = (memory.total_interactions || 0) + 1;
  const updatedSummary = conversationSummary
    ? `${conversationSummary}\n[${new Date().toISOString().split('T')[0]}] User: ${message.slice(0, 100)} | Legion: ${reply.slice(0, 150)}`
    : `[${new Date().toISOString().split('T')[0]}] User: ${message.slice(0, 100)} | Legion: ${reply.slice(0, 150)}`;

  // Keep summary from growing too large — keep last 2000 chars
  const trimmedSummary = updatedSummary.length > 2000
    ? '...' + updatedSummary.slice(-1997)
    : updatedSummary;

  await base44.asServiceRole.entities.LegionCompanionMemory.update(memory.id, {
    total_interactions: newInteractionCount,
    last_interaction_at: new Date().toISOString(),
    conversation_summary: trimmedSummary,
    companion_version: (memory.companion_version || 1) + 1,
  });

  // Log the event
  await base44.asServiceRole.entities.LegionCompanionEvent.create({
    creator_email: email,
    event_type: 'conversation',
    event_data: JSON.stringify({ user_message: message.slice(0, 200) }),
    insight_generated: reply.slice(0, 500),
    timestamp_utc: new Date().toISOString(),
  });

  return Response.json({ reply, interaction_count: newInteractionCount });
});