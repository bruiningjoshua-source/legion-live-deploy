import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({ action: 'get' }));
    const { action, endpoints } = body;

    // GET: return current restream targets
    if (action === 'get' || !action) {
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      const creator = creators[0];
      const targets = [];

      // Pull restream config from creator social_links or a dedicated field
      // For now, return empty targets with documentation
      return Response.json({
        targets,
        rtmp_docs: 'Set your stream key in each platform and paste the RTMP URL here. Legion Live will forward your stream to all configured platforms simultaneously.',
        supported: ["YouTube Live", "Twitch", "Facebook Live", "TikTok Live", "Kick", "Custom RTMP"],
      });
    }

    // SET: save restream targets
    if (action === 'set' && Array.isArray(endpoints)) {
      const creators = await base44.entities.Creator.filter({ user_email: user.email }, null, 1);
      if (creators[0]) {
        await base44.entities.Creator.update(creators[0].id, {
          social_links: JSON.stringify({ restream_endpoints: endpoints }),
        });
      }
      return Response.json({ success: true, targets: endpoints });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('[restreamForward] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});