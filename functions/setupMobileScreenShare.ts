import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await req.json();
    const { device_type, integration_type = 'mobile_screen_share', quality_preset = 'high' } = payload;

    // Create or update gaming integration for screen sharing
    const existing = await base44.entities.GamingIntegration.filter(
      { creator_id: user.email, integration_type, device_type },
      null,
      1
    ).catch(() => []);

    let integration;
    if (existing.length > 0) {
      integration = await base44.entities.GamingIntegration.update(existing[0].id, {
        is_active: true,
        last_used: new Date().toISOString(),
        quality_preset,
      });
    } else {
      integration = await base44.entities.GamingIntegration.create({
        creator_id: user.email,
        integration_type,
        device_type,
        quality_preset,
        is_active: true,
        bitrate_kbps: quality_preset === 'ultra' ? 5000 : quality_preset === 'high' ? 2500 : 1500,
      });
    }

    console.log(`Screen share setup for ${user.email} (${device_type}): ${quality_preset}`);

    return Response.json({
      success: true,
      integration_id: integration.id,
      device_type,
      quality_preset,
      bitrate_kbps: integration.bitrate_kbps,
      instructions: `1. Install Legion Live app on your ${device_type} device\n2. Go to Settings > Screen Sharing\n3. Select quality: ${quality_preset}\n4. Start broadcasting`,
    });
  } catch (error) {
    console.error('Screen share setup failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});