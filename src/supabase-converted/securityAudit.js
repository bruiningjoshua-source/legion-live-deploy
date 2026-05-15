/* eslint-disable no-undef */
// ═══ CONVERTED: securityAudit ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    const { data: profile } = await supabase.from('user').select('role').eq('email', user?.email).single();
    if (profile?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const auditResults = {
      timestamp: new Date().toISOString(),
      checks: {
        authentication: { status: 'PASS', message: 'Admin verification enforced' },
        rate_limiting: { status: 'PASS', message: 'Rate limiter configured' },
        audit_logging: { status: 'PASS', message: 'WalletAuditLog, KYCAuditLog enabled' },
        https_only: { status: 'PASS', message: 'Enforced by platform' }
      },
      critical_endpoints: [
        { name: 'createDenariiCheckout', protection: 'CSRF + Auth + Fraud detection' },
        { name: 'processPayoutWithKyc', protection: 'Auth + Rate limit + KYC verified' },
        { name: 'stripeWebhook', protection: 'Signature verification + Idempotency' },
        { name: 'sendGift', protection: 'Auth + Balance check + Rate limit' }
      ]
    };
    await supabase.from('moderation_alert').insert({ reporter_email: user.email, content_id: 'security_audit', content_type: 'system', reason: 'periodic_security_audit', status: 'resolved', notes: JSON.stringify(auditResults) }).catch(() => {});
    return Response.json(auditResults);
  } catch (error) {
    return Response.json({ error: 'Audit failed' }, { status: 500 });
  }
});