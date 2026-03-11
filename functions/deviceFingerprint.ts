import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import { createHash } from 'npm:crypto';

/**
 * Device Fingerprinting for Fraud Scoring
 * Creates a hash of device characteristics for risk assessment
 */

function generateFingerprint(userAgent, acceptLanguage, timezone, screenResolution, webglRenderer) {
  const combined = `${userAgent}|${acceptLanguage}|${timezone}|${screenResolution}|${webglRenderer}`;
  return createHash('sha256').update(combined).digest('hex');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.email) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const { userAgent, acceptLanguage, timezone, screenResolution, webglRenderer } = data;

    // Validate inputs
    if (!userAgent || !acceptLanguage || !timezone) {
      return Response.json({ error: 'Missing device parameters' }, { status: 400 });
    }

    const fingerprint = generateFingerprint(userAgent, acceptLanguage, timezone, screenResolution || 'unknown', webglRenderer || 'unknown');

    // Update user record with fingerprint
    const users = await base44.entities.User.filter({ email: user.email }, null, 1);
    if (users[0]) {
      await base44.entities.User.update(users[0].id, {
        device_fingerprint: fingerprint,
        device_fingerprint_updated: new Date().toISOString()
      });
    }

    console.log(`[deviceFingerprint] Generated for ${user.email}: ${fingerprint.substring(0, 16)}...`);

    return Response.json({ 
      fingerprint,
      message: 'Device fingerprint recorded'
    });

  } catch (error) {
    console.error('[deviceFingerprint] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});