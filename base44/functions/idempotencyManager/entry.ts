/**
 * IDEMPOTENCY KEY MANAGER
 * Prevents duplicate charges on retries by tracking transaction fingerprints
 * Stores: email + amount + timestamp + type
 * TTL: 24 hours (production — 1 hour in memory, 24h in DB)
 */

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// In-memory cache for recent operations (fast path)
const recentOperations = new Map();
const TTL_MEMORY = 3600000; // 1 hour in memory

// Periodic cleanup of stale entries
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of recentOperations) {
    if (now - data.timestamp > TTL_MEMORY) {
      recentOperations.delete(key);
    }
  }
}, 600000); // Every 10 minutes

export async function generateIdempotencyKey(email, type, amount) {
  // Create deterministic key: email:type:amount:date (truncated to hour)
  const hourTs = Math.floor(Date.now() / 3600000);
  return `${email}:${type}:${amount}:${hourTs}`;
}

export async function checkIdempotency(base44, idempotencyKey) {
  // Fast path: check memory cache first
  if (recentOperations.has(idempotencyKey)) {
    const cached = recentOperations.get(idempotencyKey);
    return {
      isDuplicate: true,
      originalId: cached.originalId,
      cached: true,
      cachedAt: new Date(cached.timestamp).toISOString()
    };
  }

  // Slow path: check database for 24-hour persistence
  try {
    const logs = await base44.asServiceRole.entities.WalletAuditLog.filter(
      { related_entity_id: idempotencyKey },
      null,
      1
    );

    if (logs.length > 0) {
      return {
        isDuplicate: true,
        originalId: logs[0].id,
        cached: false,
        processedAt: logs[0].timestamp_utc
      };
    }
  } catch (e) {
    console.warn('[idempotencyManager] DB lookup failed:', e.message);
    // Continue on error — let transaction proceed if idempotency lookup fails
  }

  return { isDuplicate: false };
}

export async function recordIdempotency(base44, idempotencyKey, originalTransactionId) {
  // Add to memory cache
  recentOperations.set(idempotencyKey, {
    originalId: originalTransactionId,
    timestamp: Date.now()
  });

  // Also log to DB for 24-hour persistence
  try {
    await base44.asServiceRole.entities.WalletAuditLog.create({
      user_email: idempotencyKey.split(':')[0],
      action: 'idempotency_record',
      amount_denarii: 0,
      new_balance: 0,
      related_entity_id: idempotencyKey,
      reason: `Idempotency key recorded for transaction ${originalTransactionId}`,
      timestamp_utc: new Date().toISOString()
    }).catch(e => console.warn('[idempotencyManager] DB record failed:', e.message));
  } catch (e) {
    console.warn('[idempotencyManager] Failed to record idempotency:', e.message);
  }
}

/**
 * Usage in checkout functions:
 * 
 * const idempotencyKey = await generateIdempotencyKey(user.email, 'denarii_purchase', amount);
 * const idempotencyCheck = await checkIdempotency(base44, idempotencyKey);
 * 
 * if (idempotencyCheck.isDuplicate) {
 *   return Response.json({ 
 *     duplicate: true, 
 *     originalId: idempotencyCheck.originalId 
 *   }, { status: 409 });
 * }
 * 
 * // Process transaction...
 * 
 * await recordIdempotency(base44, idempotencyKey, transaction.id);
 */