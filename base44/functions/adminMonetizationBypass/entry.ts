import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const ADMIN_EMAILS = ['admin@legionlive.io', 'support@legionlive.io', 'inthestixproductions@gmail.com', 'muggabuckerpro@gmail.com', 'rankincadence@gmail.com'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin' || !ADMIN_EMAILS.includes(user.email)) {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { creatorId } = await req.json();

    // Get creator
    const creators = await base44.asServiceRole.entities.Creator.filter({ id: creatorId }, null, 1);
    const creator = creators[0];

    if (!creator) {
      return Response.json({ error: 'Creator not found' }, { status: 404 });
    }

    // Check if already monetized
    const subscriptions = await base44.asServiceRole.entities.CreatorSubscription.filter({
      creator_id: creatorId,
      status: 'active'
    }, null, 1);

    if (subscriptions.length === 0) {
      // Auto-activate monetization for admin (no cost, lifetime)
      await base44.asServiceRole.entities.CreatorSubscription.create({
        creator_id: creatorId,
        plan_type: 'admin_lifetime',
        status: 'active',
        start_date: new Date().toISOString(),
        expiry_date: new Date(2099, 12, 31).toISOString(), // Far future
        auto_renew: false,
        admin_activated: true
      });

      console.log(`Admin monetization bypass activated for ${creator.display_name} (${user.email})`);

      return Response.json({
        success: true,
        message: 'Monetization activated with admin privileges',
        creator: creator.display_name,
        activatedBy: user.email
      });
    }

    return Response.json({
      success: true,
      message: 'Creator already monetized',
      creator: creator.display_name
    });
  } catch (error) {
    console.error('Monetization bypass error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});