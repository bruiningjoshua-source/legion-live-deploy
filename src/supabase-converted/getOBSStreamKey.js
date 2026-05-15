/* eslint-disable no-undef */
// ═══ CONVERTED: getOBSStreamKey — Base44 → Supabase Edge Function ═══
import { createClient } from 'npm:@supabase/supabase-js@2';
import { createHash, randomBytes } from "node:crypto";

function generateZegoSignature(appId, serverSecret) {
  const signatureNonce = randomBytes(8).toString('hex');
  const timestamp = Math.floor(Date.now() / 1000);
  const str = String(appId) + signatureNonce + serverSecret + String(timestamp);
  const signature = createHash('md5').update(str, 'utf8').digest('hex');
  return { signature, signatureNonce, timestamp };
}

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_SERVICE_KEY')
    );

    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
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
      return Response.json({ error: 'Streaming service not configured' }, { status: 500 });
    }

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

    if (data.Code !== 0) {
      if (data.Code === 1001 || data.Code === 1002 || data.Code === 1005) {
        return Response.json({
          rtmpUrl: null,
          streamKey: streamId,
          fallbackMode: true,
          message: 'RTMP dispatch requires ZegoCloud configuration.',
          obsInstructions: {
            server: `Contact ZegoCloud support to get your RTMP server URL for AppID: ${appId}`,
            streamKey: streamId,
            note: 'Use the WebRTC-based Go Live feature in the meantime.'
          }
        });
      }
      return Response.json({ error: data.Message || 'RTMP dispatch failed' }, { status: 500 });
    }

    const rtmpUrls = data.Data || [];
    const primaryUrl = rtmpUrls[0] || null;
    let obsServer = '';
    let obsStreamKey = streamId;

    if (primaryUrl) {
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