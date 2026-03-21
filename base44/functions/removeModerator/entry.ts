import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Remove Moderator with Idempotency & Rate Limiting
 */

async function checkRateLimit(base44, email, fnName, maxCount, windowMs) {
  const now = Date.now();
  const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
    { user_email: email, action: 'rate_limit_check', reason: `rate_limit:${fnName}` }, 
    '-timestamp_utc', 1
  ).catch(() => []);
  const record = logs[0];
  let count = 1, resetAt = now + windowMs;
  if (record) {
    const data = JSON.parse(record.related_entity_id || '{}');
    if (now < (data.resetAt || 0)) { count = (data.count || 0) + 1; resetAt = data.resetAt; }
  }
  if (count > maxCount) return { allowed: false, retryAfter: Math.ceil((resetAt - now) / 1000) };
  base44.asServiceRole.entities.WalletAuditLog.create({
    user_email: email, action: 'rate_limit_check', amount_denarii: 0, new_balance: 0,
    related_entity_id: JSON.stringify({ count, resetAt }), reason: `rate_limit:${fnName}`,
    timestamp_utc: new Date().toISOString()
  }).catch(() => {});
  return { allowed: true };
}

async function checkIdempotency(base44, key) {
  const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
    { user_email: key.split(':')[0], action: 'idempotency_record', related_entity_id: key }, null, 1
  ).catch(() => []);
  if (logs[0]) return { isDuplicate: true };
  return { isDuplicate: false };
}

async function recordIdempotency(base44, key) {
  await base44.asServiceRole.entities.WalletAuditLog.create({
    user_email: key.split(':')[0], action: 'idempotency_record', amount_denarii: 0, new_balance: 0,
    related_entity_id: key, reason: `mod_removed`, timestamp_utc: new Date().toISOString()
  }).catch(() => {});
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { streamId, moderatorEmail } = await req.json();
    if (!streamId || !moderatorEmail) return Response.json({ error: 'Missing required fields' }, { status: 400 });

    // Rate limit: 20 moderator removals per hour
    const rateCheck = await checkRateLimit(base44, user.email, 'removeModerator', 20, 3600000);
    if (!rateCheck.allowed) return Response.json({ error: 'Rate limited', retryAfter: rateCheck.retryAfter }, { status: 429 });

    // Verify stream ownership
    const streams = await base44.asServiceRole.entities.Stream.filter({ id: streamId }, null, 1);
    const stream = streams[0];
    if (!stream || stream.creator_id !== user.email) return Response.json({ error: 'Not authorized' }, { status: 403 });

    // Idempotency key
    const hourTs = Math.floor(Date.now() / 3600000);
    const idempotencyKey = `${user.email}:remove_mod_${streamId}_${moderatorEmail}:${hourTs}`;
    const idem = await checkIdempotency(base44, idempotencyKey);
    if (idem.isDuplicate) return Response.json({ duplicate: true, message: 'Already removed' }, { status: 409 });

    // Deactivate moderator
    const mods = await base44.asServiceRole.entities.StreamModerator.filter(
      { stream_id: streamId, moderator_email: moderatorEmail, is_active: true }, null, 1
    );
    
    if (mods.length === 0) {
      await recordIdempotency(base44, idempotencyKey);
      return Response.json({ duplicate: true, message: 'Not a moderator' }, { status: 409 });
    }

    await base44.asServiceRole.entities.StreamModerator.update(mods[0].id, { is_active: false });
    await recordIdempotency(base44, idempotencyKey);
    
    console.log(`[removeModerator] ${moderatorEmail} removed from stream ${streamId}`);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[removeModerator] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});