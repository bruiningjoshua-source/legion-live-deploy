/* eslint-disable no-undef */
// ═══ CONVERTED: validationMiddleware ═══
// NOTE: Was export-only module. Converted to standalone validation edge function.

function validateRequest(data, schema) {
  if (!schema) return { valid: true };
  const errors = [];
  if (schema.required) for (const f of schema.required) { if (data[f] === undefined || data[f] === null || data[f] === '') errors.push(`Missing: ${f}`); }
  if (schema.properties) for (const [f, rules] of Object.entries(schema.properties)) {
    if (!data.hasOwnProperty(f)) continue;
    const v = data[f];
    if (rules.type === 'string' && typeof v !== 'string') errors.push(`${f} must be string`);
    if (rules.type === 'number' && typeof v !== 'number') errors.push(`${f} must be number`);
    if (rules.enum && !rules.enum.includes(v)) errors.push(`${f} must be: ${rules.enum.join(', ')}`);
    if (typeof v === 'string') { if (rules.minLength && v.length < rules.minLength) errors.push(`${f} min ${rules.minLength} chars`); if (rules.maxLength && v.length > rules.maxLength) errors.push(`${f} max ${rules.maxLength} chars`); }
    if (typeof v === 'number') { if (rules.minimum !== undefined && v < rules.minimum) errors.push(`${f} >= ${rules.minimum}`); if (rules.maximum !== undefined && v > rules.maximum) errors.push(`${f} <= ${rules.maximum}`); }
  }
  return { valid: errors.length === 0, errors: errors.length ? errors : undefined };
}

const SCHEMAS = {
  sendGift: { required: ['giftId','quantity','creatorId','streamId'], properties: { giftId: { type: 'string', maxLength: 100 }, quantity: { type: 'number', minimum: 1, maximum: 100 } } },
  sendTip: { required: ['amount_usd','creator_id'], properties: { amount_usd: { type: 'number', minimum: 0.99, maximum: 50000 } } },
  payout: { required: ['amount_usd'], properties: { amount_usd: { type: 'number', minimum: 10, maximum: 100000 } } },
};

Deno.serve(async (req) => {
  try {
    const { schemaName, data } = await req.json();
    if (!schemaName || !data) return Response.json({ error: 'schemaName and data required' }, { status: 400 });
    const schema = SCHEMAS[schemaName];
    if (!schema) return Response.json({ error: `Unknown schema: ${schemaName}` }, { status: 400 });
    const result = validateRequest(data, schema);
    return Response.json(result);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});