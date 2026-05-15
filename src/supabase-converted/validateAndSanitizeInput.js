/* eslint-disable no-undef */
// ═══ CONVERTED: validateAndSanitizeInput ═══
// NOTE: This was originally an export-only module. Converted to a standalone utility edge function.

const validators = {
  paymentIntentId: (id) => id && typeof id === 'string' && /^pi_[a-zA-Z0-9]{20,}$/.test(id) ? id : null,
  email: (e) => e && typeof e === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e.toLowerCase() : null,
  usdAmount: (a) => { const n = Number(a); return !isNaN(n) && n > 0 && n <= 100000 ? n : null; },
  ipAddress: (ip) => ip && typeof ip === 'string' && /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').map(Number).every(p => p >= 0 && p <= 255) ? ip : null,
  countryCode: (c) => c && typeof c === 'string' && /^[A-Z]{2}$/.test(c) ? c : null,
  deviceFingerprint: (fp) => fp && typeof fp === 'string' && /^[a-f0-9]{32,}$/i.test(fp) ? fp : null,
};
const sanitize = {
  text: (str, maxLen = 2000) => typeof str !== 'string' ? '' : str.trim().replace(/[<>"'`]/g, '').substring(0, maxLen),
  id: (str) => typeof str !== 'string' ? '' : str.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 255),
};

Deno.serve(async (req) => {
  try {
    const { fields } = await req.json();
    if (!fields || typeof fields !== 'object') return Response.json({ error: 'fields object required' }, { status: 400 });
    const results = {};
    for (const [key, { value, type }] of Object.entries(fields)) {
      if (validators[type]) results[key] = validators[type](value);
      else if (type === 'text') results[key] = sanitize.text(value);
      else if (type === 'id') results[key] = sanitize.id(value);
      else results[key] = value;
    }
    return Response.json({ valid: true, sanitized: results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});