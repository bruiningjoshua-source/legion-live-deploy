/* eslint-disable no-undef */
// ═══ CONVERTED: assessPaymentRisk ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { paymentIntentId, amountUsd, deviceFingerprint, ipAddress, countryCode } = await req.json();
    if (!paymentIntentId || !amountUsd) return Response.json({ error: 'Missing fields' }, { status: 400 });
    let riskScore = 0; const riskFactors = [];
    if (amountUsd > 500) { riskScore += 20; riskFactors.push(`High amount: $${amountUsd}`); }
    const { data: wallet } = await supabase.from('wallet').select('total_purchased_usd').eq('user_email', user.email).limit(1);
    if ((wallet||[])[0]?.total_purchased_usd === 0) { riskScore += 25; riskFactors.push('New customer'); }
    const { data: userRec } = await supabase.from('user').select('chargeback_count').eq('email', user.email).limit(1);
    if ((userRec||[])[0]?.chargeback_count > 0) { riskScore += 40; riskFactors.push(`Chargebacks: ${userRec[0].chargeback_count}`); }
    if (countryCode) {
      const { data: recent } = await supabase.from('payment_risk_assessment').select('country_code').eq('user_email', user.email).gte('assessment_date', new Date(Date.now()-86400000).toISOString()).order('assessment_date', { ascending: false }).limit(3);
      const countries = (recent||[]).map(p => p.country_code).filter(Boolean);
      if (countries.length && !countries.includes(countryCode)) { riskScore += 30; riskFactors.push(`New country: ${countryCode}`); }
    }
    const requiresSca = riskScore > 40 || amountUsd > 1000;
    const { data: assessment } = await supabase.from('payment_risk_assessment').insert({ user_email: user.email, payment_intent_id: paymentIntentId, risk_score: Math.min(riskScore,100), risk_factors: riskFactors, requires_sca: requiresSca, amount_usd: amountUsd, device_fingerprint: deviceFingerprint, ip_address: ipAddress, country_code: countryCode, assessment_date: new Date().toISOString() }).select().single();
    return Response.json({ riskScore: Math.min(riskScore,100), requiresSca, riskFactors, assessmentId: assessment?.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});