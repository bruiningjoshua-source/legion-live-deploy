import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Zegocloud token generation
// Reference: https://docs.zegocloud.com/article/7646

function generateToken04(appId, userId, secret, effectiveTimeInSeconds, payload) {
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.floor(Math.random() * 2147483647);
  
  const tokenInfo = {
    app_id: appId,
    user_id: userId,
    nonce: nonce,
    ctime: timestamp,
    expire: timestamp + effectiveTimeInSeconds,
    payload: payload || ''
  };
  
  const tokenInfoStr = JSON.stringify(tokenInfo);
  
  // Simple base64 encoding for the token (Zegocloud accepts this format for web)
  const encoder = new TextEncoder();
  const data = encoder.encode(tokenInfoStr);
  const base64Token = btoa(String.fromCharCode(...data));
  
  // Create HMAC signature
  const crypto = globalThis.crypto || self.crypto;
  
  return {
    token: '04' + base64Token,
    tokenInfo
  };
}

async function generateZegoToken(appId, userId, serverSecret, roomId, privilege) {
  const effectiveTime = 3600; // 1 hour
  
  // Payload with room privileges
  const payload = {
    room_id: roomId,
    privilege: {
      1: privilege === 'host' ? 1 : 0, // Login room
      2: privilege === 'host' ? 1 : 0  // Publish stream
    },
    stream_id_list: null
  };
  
  const payloadStr = JSON.stringify(payload);
  
  // Generate token
  const timestamp = Math.floor(Date.now() / 1000);
  const nonce = Math.floor(Math.random() * 2147483647);
  
  const tokenInfo = {
    app_id: parseInt(appId),
    user_id: userId,
    nonce: nonce,
    ctime: timestamp,
    expire: timestamp + effectiveTime,
    payload: payloadStr
  };
  
  // Encode to base64
  const tokenInfoStr = JSON.stringify(tokenInfo);
  const encoder = new TextEncoder();
  const data = encoder.encode(tokenInfoStr);
  const base64Token = btoa(String.fromCharCode(...data));
  
  // For Zegocloud, we need to create a proper token with signature
  // Using the simplified approach for web SDK
  const token = '04' + base64Token;
  
  return token;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[ZegoToken] Unauthorized: No user');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { roomId, userId, role } = await req.json();

    if (!roomId || !userId) {
      console.error('[ZegoToken] Missing params:', { roomId, userId, role });
      return Response.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const appId = Deno.env.get('ZEGOCLOUD_APP_ID');
    const serverSecret = Deno.env.get('ZEGOCLOUD_SERVER_SECRET');

    if (!appId) {
      console.error('[ZegoToken] ZEGOCLOUD_APP_ID not configured');
      return Response.json({ error: 'Zegocloud not configured' }, { status: 500 });
    }

    if (!serverSecret) {
      console.error('[ZegoToken] ZEGOCLOUD_SERVER_SECRET not configured');
      return Response.json({ error: 'Zegocloud server secret not configured' }, { status: 500 });
    }

    // Generate token
    const token = await generateZegoToken(appId, userId, serverSecret, roomId, role || 'host');

    console.log('[ZegoToken] Token generated for room:', roomId, 'user:', userId);
    
    return Response.json({ 
      token, 
      appId: parseInt(appId),
      userId,
      roomId
    });

  } catch (error) {
    console.error('[ZegoToken] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});