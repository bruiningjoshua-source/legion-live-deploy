import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { RtcTokenBuilder, RtcRole } from 'npm:agora-access-token@2.0.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('Unauthorized: No user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelName, uid, role } = await req.json();

    if (!channelName || uid === undefined || !role) {
      console.error('Missing params:', { channelName, uid, role });
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId) {
      console.error('AGORA_APP_ID not configured');
      return Response.json({ error: 'Agora not configured' }, { status: 500 });
    }

    // If no certificate, return empty token (works for testing)
    if (!appCertificate) {
      console.log('No app certificate - returning test mode token');
      return Response.json({ token: '', uid });
    }

    // Generate proper token with Agora SDK
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpireTime = currentTimestamp + 3600;

    const roleValue = role === 'host' ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;

    const token = RtcTokenBuilder.buildTokenWithUid(
      appId,
      appCertificate,
      channelName,
      uid,
      roleValue,
      privilegeExpireTime
    );

    console.log('Token generated successfully for channel:', channelName);
    return Response.json({ token, uid, appId });

  } catch (error) {
    console.error('Token generation error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});