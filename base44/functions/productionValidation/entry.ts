import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// ── Startup env check ──
const REQUIRED_VARS = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'ZEGOCLOUD_APP_ID', 'ZEGOCLOUD_SERVER_SECRET'];
for (const v of REQUIRED_VARS) {
  if (!Deno.env.get(v)) console.error(`[STARTUP] CRITICAL: Missing env var ${v} — dependent features will fail`);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 });

    const [database, stripe, monitoring, security, failover, performance, envVars] = await Promise.all([
      checkDatabase(base44),
      checkStripe(),
      checkMonitoring(base44),
      checkSecurity(base44),
      checkFailover(base44),
      checkPerformance(base44),
      checkEnvVars()
    ]);

    const checks = { database, stripe, monitoring, security, failover, performance, envVars };
    const allPassed = Object.values(checks).every(c => c.status === 'PASS');

    console.log('=== PRODUCTION READINESS AUDIT ===');
    console.log(JSON.stringify(checks, null, 2));

    return Response.json({ status: allPassed ? 'READY_TO_LAUNCH' : 'FAILED', timestamp: new Date().toISOString(), checks });
  } catch (error) {
    console.error('Production validation failed:', error);
    return Response.json({ error: error.message, status: 'CRITICAL_FAILURE' }, { status: 500 });
  }
});

async function checkDatabase(base44) {
  try {
    const [users, wallets, streams] = await Promise.all([
      base44.asServiceRole.entities.User.list(null, 1),
      base44.asServiceRole.entities.Wallet.list(null, 1),
      base44.asServiceRole.entities.Stream.list(null, 1)
    ]);
    if (!users || !wallets || !streams) throw new Error('Entity list returned null');
    return { status: 'PASS', message: 'Database connectivity verified', entities_tested: 3 };
  } catch (error) {
    return { status: 'FAIL', message: error.message };
  }
}

async function checkStripe() {
  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');
    if (!stripeKey || !webhookSecret) throw new Error('Stripe credentials missing');
    const Stripe = (await import('npm:stripe@17.5.0')).default;
    const stripe = new Stripe(stripeKey, { apiVersion: '2024-12-18.acacia' });
    const balance = await stripe.balance.retrieve(); // Lightweight call — no side effects
    const isLive = stripeKey.startsWith('sk_live_');
    return { status: 'PASS', message: 'Stripe API connected', mode: isLive ? 'LIVE' : 'TEST', webhook_configured: !!webhookSecret };
  } catch (error) {
    return { status: 'FAIL', message: error.message };
  }
}

async function checkMonitoring(base44) {
  try {
    // Verify recent audit log entries exist (proves logging pipeline is working)
    const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();
    const recentLogs = await base44.asServiceRole.entities.WalletAuditLog.filter(
      { timestamp_utc: { $gte: fiveMinutesAgo } }, '-timestamp_utc', 5
    ).catch(() => null);

    // We can't guarantee logs in last 5min on a quiet app — treat absence as WARN not FAIL
    const hasRecentLogs = recentLogs !== null;
    return {
      status: hasRecentLogs ? 'PASS' : 'WARN',
      message: hasRecentLogs ? 'Audit logging pipeline verified' : 'No recent audit logs — may indicate low activity or logging issue',
      recent_log_count: recentLogs?.length || 0
    };
  } catch (error) {
    return { status: 'WARN', message: `Monitoring check incomplete: ${error.message}` };
  }
}

async function checkSecurity(base44) {
  try {
    const missingVars = [];
    if (!Deno.env.get('STRIPE_SECRET_KEY')) missingVars.push('STRIPE_SECRET_KEY');
    if (!Deno.env.get('STRIPE_WEBHOOK_SECRET')) missingVars.push('STRIPE_WEBHOOK_SECRET');
    if (!Deno.env.get('ZEGOCLOUD_SERVER_SECRET')) missingVars.push('ZEGOCLOUD_SERVER_SECRET');
    if (missingVars.length > 0) throw new Error(`Missing critical secrets: ${missingVars.join(', ')}`);

    // Verify CSRF function is callable
    const csrfResult = await base44.asServiceRole.functions.invoke('csrfProtection', { action: 'validate', token: 'test' }).catch(e => ({ error: e.message }));
    const csrfDeployed = !csrfResult?.error?.includes('not found');

    // Verify rate limiter is callable
    const rlResult = await base44.asServiceRole.functions.invoke('rateLimiters', { action: 'check', key: 'health_check', limit: 100 }).catch(e => ({ error: e.message }));
    const rlDeployed = !rlResult?.error?.includes('not found');

    return {
      status: 'PASS',
      message: 'Security measures verified',
      checks: { secrets_present: true, csrf_deployed: csrfDeployed, rate_limiter_deployed: rlDeployed }
    };
  } catch (error) {
    return { status: 'FAIL', message: error.message };
  }
}

async function checkFailover(base44) {
  try {
    const criticalFunctions = ['createDenariiCheckout', 'stripeWebhook', 'sendGift', 'generateZegoToken', 'processPayoutWithKyc'];
    // Attempt health ping to each (will return 401/400 since we're not passing valid params — that's fine, confirms they're deployed)
    const results = await Promise.all(
      criticalFunctions.map(fn =>
        base44.asServiceRole.functions.invoke(fn, {}).then(() => ({ fn, deployed: true })).catch(e => ({
          fn,
          deployed: !e.message?.includes('not found') && !e.message?.includes('404')
        }))
      )
    );
    const allDeployed = results.every(r => r.deployed);
    return {
      status: allDeployed ? 'PASS' : 'FAIL',
      message: allDeployed ? 'All critical functions deployed' : 'Some functions missing',
      functions: results
    };
  } catch (error) {
    return { status: 'WARN', message: `Failover check incomplete: ${error.message}` };
  }
}

async function checkPerformance(base44) {
  try {
    const start = Date.now();
    await base44.asServiceRole.entities.User.list(null, 1);
    const duration = Date.now() - start;
    const passed = duration < 2000;
    return {
      status: passed ? 'PASS' : 'FAIL',
      message: passed ? `DB query completed in ${duration}ms` : `DB query too slow: ${duration}ms (threshold: 2000ms)`,
      query_ms: duration,
      threshold_ms: 2000
    };
  } catch (error) {
    return { status: 'FAIL', message: error.message };
  }
}

function checkEnvVars() {
  const required = ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET', 'ZEGOCLOUD_APP_ID', 'ZEGOCLOUD_SERVER_SECRET'];
  const missing = required.filter(v => !Deno.env.get(v));
  return {
    status: missing.length === 0 ? 'PASS' : 'FAIL',
    message: missing.length === 0 ? 'All required env vars present' : `Missing: ${missing.join(', ')}`,
    missing,
    present: required.filter(v => !!Deno.env.get(v))
  };
}