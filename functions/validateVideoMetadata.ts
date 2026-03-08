import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Validates video metadata before storage
 * Prevents malicious/oversized content
 */

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, description, url, video_id } = await req.json();

    // Validation rules
    const errors = [];

    // Title validation
    if (!title || title.length < 3 || title.length > 200) {
      errors.push('Title must be 3-200 characters');
    }
    if (/<script|javascript:|onerror=/i.test(title)) {
      errors.push('Title contains disallowed content');
    }

    // Description validation
    if (description && description.length > 5000) {
      errors.push('Description exceeds 5000 characters');
    }
    if (description && /<script|javascript:|onerror=/i.test(description)) {
      errors.push('Description contains disallowed content');
    }

    // URL validation
    if (url) {
      try {
        new URL(url);
        const host = new URL(url).hostname;
        // Whitelist safe CDNs
        const safeDomains = ['youtube.com', 'vimeo.com', 's3.amazonaws.com', 'cloudflare.com'];
        if (!safeDomains.some(domain => host.includes(domain))) {
          console.warn(`Unusual video domain: ${host}`);
        }
      } catch {
        errors.push('Invalid video URL');
      }
    }

    if (errors.length > 0) {
      return Response.json({ valid: false, errors }, { status: 400 });
    }

    return Response.json({ valid: true, message: 'Metadata validated' });
  } catch (error) {
    console.error('Validation error:', error);
    return Response.json({ error: 'Validation failed' }, { status: 500 });
  }
});