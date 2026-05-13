import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import { createHash, randomBytes } from "node:crypto";

// Generate ZegoCloud server API signature
// Signature = md5(AppId + SignatureNonce + ServerSecret + Timestamp)
function generateZegoSignature(appId, serverSecret) {
  const signatureNonce = randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const str = String(appId) + signatureNonce + serverSecret + String(timestamp);
  const signature = createHash('md5').update(str, 'utf8').digest('hex');
  return { signature, signatureNonce, timestamp };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      console.error('[OBS] Unauthorized');
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { streamId } = body;

    if (!streamId) {
      return Response.json({ error: 'streamId is required' }, { status: 400 });
    }

    const appId = Deno.env.get('ZEGOCLOUD_APP_ID');
    const serverSecret = Deno.env.get('ZEGOCLOUD_SERVER_SECRET');

    if (!appId || !serverSecret) {
      console.error('[OBS] Missing ZEGOCLOUD env vars');
      return Response.json({ error: 'Streaming service not configured' }, { status: 500 });
    }

    // Call ZegoCloud RTMPDispatchV2 to get RTMP push URL
    const { signature, signatureNonce, timestamp } = generateZegoSignature(parseInt(appId), serverSecret);

    const params = new URLSearchParams({
      Action: 'RTMPDispatchV2',
      AppId: appId,
      Signature: signature,
      SignatureNonce: signatureNonce,
      SignatureVersion: '2.0',
      Timestamp: String(timestamp),
      StreamId: streamId,
      Sequence: String(Date.now()),
      Type: 'push',
    });

    const zegoUrl = `https://rtc-api.zego.im/?${params.toString()}`;
    console.log('[OBS] Requesting RTMP dispatch for stream:', streamId);

    const response = await fetch(zegoUrl);
    const data = await response.json();

    console.log('[OBS] ZegoCloud response:', JSON.stringify(data));

    if (data.Code !== 0) {
      console.error('[OBS] ZegoCloud error:', data.Code, data.Message);
      
      // If RTMP dispatch is not configured, provide manual fallback instructions
      if (data.Code === 1001 || data.Code === 1002 || data.Code === 1005) {
        return Response.json({
          rtmpUrl: null,
          streamKey: streamId,
          fallbackMode: true,
          message: 'RTMP dispatch requires ZegoCloud configuration. Contact support to enable RTMP ingestion for your app.',
          obsInstructions: {
            server: `Contact ZegoCloud support to get your RTMP server URL for AppID: ${appId}`,
            streamKey: streamId,
            note: 'RTMP ingestion must be enabled by ZegoCloud for your project. Use the WebRTC-based Go Live feature in the meantime.'
          }
        });
      }

      return Response.json({ error: data.Message || 'RTMP dispatch failed' }, { status: 500 });
    }

    // Data is an array of RTMP URLs
    const rtmpUrls = data.Data || [];
    const primaryUrl = rtmpUrls[0] || null;

    // Parse the RTMP URL into server + stream key for OBS
    // Format: rtmp://IP:1935/AppId/StreamId
    let obsServer = '';
    let obsStreamKey = streamId;
    
    if (primaryUrl) {
      // Split URL into server part and stream key part
      const lastSlash = primaryUrl.lastIndexOf('/');
      if (lastSlash > 0) {
        obsServer = primaryUrl.substring(0, lastSlash);
        obsStreamKey = primaryUrl.substring(lastSlash + 1);
      } else {
        obsServer = primaryUrl;
      }
    }

    return Response.json({
      rtmpUrl: primaryUrl,
      allUrls: rtmpUrls,
      obsServer,
      obsStreamKey,
      streamId,
      fallbackMode: false,
      obsInstructions: {
        server: obsServer,
        streamKey: obsStreamKey,
        note: 'In OBS: Settings → Stream → Service: Custom → paste Server and Stream Key'
      }
    });

  } catch (error) {
    console.error('[OBS] Error:', error.message, error.stack);
    return Response.json({ error: error.message }, { status: 500 });
  }
});