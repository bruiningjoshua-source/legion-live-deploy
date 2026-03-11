import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Suspicious Login Detection
 * Flags unusual login patterns: geo-velocity, device changes, time anomalies
 * Requires MFA if triggered
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { 
      ipAddress, 
      countryCode, 
      deviceFingerprint, 
      userAgent 
    } = await req.json();

    // Validate inputs
    if (!ipAddress || typeof ipAddress !== 'string' || !ipAddress.match(/^(\d{1,3}\.){3}\d{1,3}$/)) {
      return Response.json({ error: 'Invalid IP address', code: 'INVALID_IP' }, { status: 400 });
    }
    if (!deviceFingerprint || typeof deviceFingerprint !== 'string' || deviceFingerprint.length < 10) {
      return Response.json({ error: 'Invalid device fingerprint', code: 'INVALID_FINGERPRINT' }, { status: 400 });
    }

    let suspicionScore = 0;
    const flags = [];

    // Get user's device fingerprint from User entity
    const userRecord = await base44.asServiceRole.entities.User.filter(
      { email: user.email }, null, 1
    ).catch(() => []);

    if (userRecord.length > 0) {
      const storedFingerprint = userRecord[0].device_fingerprint;

      // Factor 1: Device fingerprint mismatch
      if (storedFingerprint && storedFingerprint !== deviceFingerprint) {
        suspicionScore += 30;
        flags.push('New device detected');
      }

      // Factor 2: Multiple login attempts in short time (brute force indicator)
      const recentLogins = await base44.asServiceRole.entities.KYCAuditLog.filter(
        { 
          creator_id: user.email, 
          action: 'login_attempt',
          timestamp_utc: { $gte: new Date(Date.now() - 900000).toISOString() } // 15 minutes
        }
      ).catch(() => []);

      if (recentLogins.length > 3) {
        suspicionScore += 40;
        flags.push(`Multiple login attempts: ${recentLogins.length} in 15 mins`);
      }
    }

    // Factor 3: Geo-velocity (impossible travel)
    if (countryCode) {
      const recentPayments = await base44.asServiceRole.entities.PaymentRiskAssessment.filter(
        { 
          user_email: user.email,
          assessment_date: { $gte: new Date(Date.now() - 3600000).toISOString() } // 1 hour
        },
        '-assessment_date',
        1
      ).catch(() => []);

      if (recentPayments.length > 0 && recentPayments[0].country_code && recentPayments[0].country_code !== countryCode) {
        suspicionScore += 50;
        flags.push(`Geo-velocity: ${recentPayments[0].country_code} → ${countryCode} in <1 hour`);
      }
    }

    // Factor 4: Unusual hour (3am-5am logins for typically daytime user)
    const hour = new Date().getHours();
    if (hour >= 2 && hour <= 5) {
      suspicionScore += 15;
      flags.push('Unusual login time (2-5am)');
    }

    // Determine action
    const requiresMfa = suspicionScore > 40;

    if (requiresMfa) {
      console.warn(`[suspiciousLoginDetection] ${user.email}: suspicious score=${suspicionScore}`);

      // Store detection event
      await base44.asServiceRole.entities.WalletAuditLog.create({
        user_email: user.email,
        action: 'suspicious_login',
        amount_denarii: 0,
        new_balance: 0,
        reason: `Suspicion score: ${suspicionScore}. Flags: ${flags.join(', ')}`,
        related_entity_id: JSON.stringify({ flags, ipAddress, countryCode }),
        timestamp_utc: new Date().toISOString()
      }).catch(() => {});

      // Send alert notification
      await base44.asServiceRole.entities.Notification.create({
        user_email: user.email,
        type: 'suspicious_login',
        title: 'Unusual Login Detected',
        message: `We noticed an unusual login from ${countryCode || 'Unknown'}. If this wasn't you, secure your account immediately.`,
        is_read: false,
        created_date: new Date().toISOString()
      }).catch(() => {});

      return Response.json({
        requiresMfa: true,
        suspicionScore,
        flags,
        message: 'Additional verification required'
      });
    }

    return Response.json({
      requiresMfa: false,
      suspicionScore,
      flags: []
    });

  } catch (error) {
    console.error('[suspiciousLoginDetection] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});