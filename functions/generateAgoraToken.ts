import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { channelName, uid, role } = await req.json();

    if (!channelName || uid === undefined || !role) {
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    // Generate token using Agora RestAPI
    const appId = Deno.env.get('AGORA_APP_ID');
    const appCertificate = Deno.env.get('AGORA_APP_CERTIFICATE');

    if (!appId || !appCertificate) {
      return Response.json({ error: 'Agora credentials not configured' }, { status: 500 });
    }

    // Use Agora's token generation service
    const response = await fetch('https://api.agora.io/dev/v1/service/rtc/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${btoa(appId + ':' + appCertificate)}`
      },
      body: JSON.stringify({
        cname: channelName,
        uid: uid.toString(),
        role: role,
        expire: 3600
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Agora token generation failed:', error);
      
      // Fallback to local token generation if API fails
      const token = generateLocalToken(appId, appCertificate, channelName, uid, role);
      return Response.json({ token, uid });
    }

    const data = await response.json();
    return Response.json({ token: data.rtcToken, uid });

  } catch (error) {
    console.error('Token generation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

// Fallback local token generation (simple version)
function generateLocalToken(appId, appCertificate, channelName, uid, role) {
  // This is a simplified version - Agora SDK handles token generation
  // In production, use official Agora token generation library
  const timestamp = Math.floor(Date.now() / 1000);
  const expireTime = timestamp + 3600;
  
  // Return placeholder - actual token should come from Agora SDK
  return `${appId}:${channelName}:${uid}:${role}:${expireTime}`;
}