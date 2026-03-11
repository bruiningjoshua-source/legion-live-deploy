import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Dynamic Tip Suggestions
 * Shows viewers personalized tip amounts based on stream data
 * Suggests "most tipped amount" or milestone-based amounts
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streamId, creatorId } = await req.json();
    if (!streamId || !creatorId) return Response.json({ error: 'Missing fields' }, { status: 400 });

    // Get all tips for this creator (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 86400000 * 30).toISOString();
    const tipTransactions = await base44.asServiceRole.entities.GiftTransaction.filter(
      { 
        recipient_email: creatorId,
        created_date: { $gte: thirtyDaysAgo }
      }
    ).catch(() => []);

    // Calculate tip statistics
    const tipAmounts = tipTransactions
      .filter(t => t.total_as_value && t.total_as_value > 0)
      .map(t => t.total_as_value);

    let suggestions = [5, 10, 25]; // Default suggestions

    if (tipAmounts.length > 0) {
      // Most common tip amount
      const frequency = {};
      tipAmounts.forEach(amt => {
        frequency[amt] = (frequency[amt] || 0) + 1;
      });
      const mostCommon = Object.keys(frequency).reduce((a, b) => 
        frequency[a] > frequency[b] ? a : b
      );

      // Average tip
      const average = Math.round(tipAmounts.reduce((a, b) => a + b, 0) / tipAmounts.length);

      // Median tip
      const sorted = tipAmounts.sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      suggestions = [
        Math.round(Number(mostCommon)),
        average,
        median + 10,
        50
      ].filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 4);
    }

    // Get viewer's tip history with this creator
    const viewerTips = await base44.asServiceRole.entities.GiftTransaction.filter(
      { sender_email: user.email, recipient_email: creatorId },
      '-created_date',
      5
    ).catch(() => []);

    // If viewer has tipped before, suggest higher amounts
    if (viewerTips.length > 0) {
      const lastTipAmount = viewerTips[0].total_as_value || 0;
      suggestions = [
        lastTipAmount, // Repeat last amount
        lastTipAmount * 1.5,
        Math.max(...suggestions),
        100
      ].map(Math.round).filter((v, i, arr) => arr.indexOf(v) === i);
    }

    // Get stream milestone info
    const streams = await base44.asServiceRole.entities.Stream.filter(
      { id: streamId }, null, 1
    ).catch(() => []);

    const stream = streams[0];
    let milestoneAmount = null;

    if (stream) {
      // If approaching viewer milestone (100, 250, 500 viewers)
      const viewerCount = stream.viewer_count || 0;
      const nextMilestone = Math.ceil(viewerCount / 100) * 100;
      const perc = (viewerCount / nextMilestone) * 100;
      if (perc > 75 && perc < 95) {
        milestoneAmount = Math.round(nextMilestone / 10); // Suggest to help reach milestone
      }
    }

    return Response.json({
      suggestions: suggestions.sort((a, b) => a - b),
      milestoneAmount,
      totalTipsReceived: tipTransactions.length,
      averageTip: tipAmounts.length > 0 ? Math.round(tipAmounts.reduce((a, b) => a + b, 0) / tipAmounts.length) : 0
    });

  } catch (error) {
    console.error('[dynamicTipSuggestions] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});