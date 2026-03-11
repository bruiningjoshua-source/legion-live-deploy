import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has creator subscription
    const subscriptions = await base44.asServiceRole.entities.CreatorSubscription.filter({
      user_email: user.email,
      status: 'active'
    }, null, 1);

    const hasActiveSubscription = subscriptions.length > 0;
    const isAdmin = user.role === 'admin';

    return Response.json({
      has_access: hasActiveSubscription || isAdmin,
      has_subscription: hasActiveSubscription,
      is_admin: isAdmin,
      subscription: subscriptions[0] || null
    });
  } catch (error) {
    console.error('Subscription check error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});