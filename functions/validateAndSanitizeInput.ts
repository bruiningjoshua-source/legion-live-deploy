import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Validate user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Input validation rules
    const validations = {
      email: (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      url: (val) => {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      alphanumeric: (val) => /^[a-zA-Z0-9_-]+$/.test(val),
      noScripts: (val) => !/<script|javascript:|onerror=/i.test(val),
      maxLength: (max) => (val) => typeof val === 'string' && val.length <= max,
      minLength: (min) => (val) => typeof val === 'string' && val.length >= min
    };

    // Common input patterns
    const rules = {
      creator_id: [validations.alphanumeric],
      video_id: [validations.alphanumeric],
      email: [validations.email],
      title: [validations.noScripts, validations.maxLength(500)],
      description: [validations.noScripts, validations.maxLength(5000)],
      url: [validations.url],
      username: [validations.alphanumeric, validations.minLength(3), validations.maxLength(32)]
    };

    // Validate inputs against rules
    const validateInput = (field, value, fieldRules) => {
      if (!fieldRules) return true;
      return fieldRules.every(rule => rule(value));
    };

    // Return validation utility
    return Response.json({
      validate: (field, value) => validateInput(field, value, rules[field]),
      sanitize: (str) => {
        if (typeof str !== 'string') return str;
        return str
          .replace(/[<>\"']/g, (match) => ({
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;'
          })[match])
          .trim();
      },
      rules
    });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});