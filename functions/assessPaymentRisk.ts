import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Assess Payment Risk for 3D Secure/SCA Triggering
 * Evaluates fraud indicators and determines if SCA is required
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { 
      paymentIntentId, 
      amountUsd, 
      deviceFingerprint, 
      ipAddress, 
      countryCode 
    } = await req.json();

    if (!paymentIntentId || !amountUsd) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let riskScore = 0;
    const riskFactors = [];

    // Factor 1: Amount threshold (>$500 = higher risk)
    if (amountUsd > 500) {
      riskScore += 20;
      riskFactors.push(`High transaction amount: $${amountUsd}`);
    } else if (amountUsd > 200) {
      riskScore += 10;
    }

    // Factor 2: Check user payment history
    const wallet = await base44.asServiceRole.entities.Wallet.filter(
      { user_email: user.email }, null, 1
    ).catch(() => []);

    if (wallet.length > 0) {
      const totalSpent = wallet[0].total_purchased_usd || 0;
      if (totalSpent === 0) {
        riskScore += 25;
        riskFactors.push('New customer');
      } else if (totalSpent < 10) {
        riskScore += 15;
        riskFactors.push('Low lifetime value');
      }
    }

    // Factor 3: Chargebacks/disputes
    const userRecord = await base44.asServiceRole.entities.User.filter(
      { email: user.email }, null, 1
    ).catch(() => []);

    if (userRecord.length > 0) {
      const chargebackCount = userRecord[0].chargeback_count || 0;
      if (chargebackCount > 0) {
        riskScore += 40;
        riskFactors.push(`Previous chargebacks: ${chargebackCount}`);
      }
    }

    // Factor 4: Geo-velocity (new country)
    if (countryCode) {
      const recentPayments = await base44.asServiceRole.entities.PaymentRiskAssessment.filter(
        { user_email: user.email, assessment_date: { $gte: new Date(Date.now() - 86400000).toISOString() } },
        '-assessment_date',
        3
      ).catch(() => []);

      const recentCountries = recentPayments.map(p => p.country_code).filter(Boolean);
      if (recentCountries.length > 0 && !recentCountries.includes(countryCode)) {
        riskScore += 30;
        riskFactors.push(`Geo-velocity: payment from new country ${countryCode}`);
      }
    }

    // Factor 5: Device fingerprint mismatch
    if (deviceFingerprint) {
      const previousPayments = await base44.asServiceRole.entities.PaymentRiskAssessment.filter(
        { user_email: user.email },
        '-assessment_date',
        5
      ).catch(() => []);

      const knownDevices = previousPayments.map(p => p.device_fingerprint).filter(Boolean);
      if (knownDevices.length > 0 && !knownDevices.includes(deviceFingerprint)) {
        riskScore += 20;
        riskFactors.push('New device detected');
      }
    }

    // Determine if SCA required
    const requiresSca = riskScore > 40 || amountUsd > 1000;

    // Store assessment
    const assessment = await base44.asServiceRole.entities.PaymentRiskAssessment.create({
      user_email: user.email,
      payment_intent_id: paymentIntentId,
      risk_score: Math.min(riskScore, 100),
      risk_factors: riskFactors,
      requires_sca: requiresSca,
      amount_usd: amountUsd,
      device_fingerprint: deviceFingerprint || null,
      ip_address: ipAddress || null,
      country_code: countryCode || null,
      assessment_date: new Date().toISOString()
    });

    console.log(`[assessPaymentRisk] ${user.email}: score=${riskScore}, sca=${requiresSca}`);

    return Response.json({
      riskScore: Math.min(riskScore, 100),
      requiresSca,
      riskFactors,
      assessmentId: assessment.id
    });

  } catch (error) {
    console.error('[assessPaymentRisk] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});