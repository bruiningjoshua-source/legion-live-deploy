/* eslint-disable no-undef */
// ═══ CONVERTED: validateVideoMetadata ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { title, description, url } = await req.json();
    const errors = [];
    if (!title || title.length < 3 || title.length > 200) errors.push('Title must be 3-200 chars');
    if (/<script|javascript:|onerror=/i.test(title||'')) errors.push('Title contains disallowed content');
    if (description && description.length > 5000) errors.push('Description exceeds 5000 chars');
    if (description && /<script|javascript:|onerror=/i.test(description)) errors.push('Description contains disallowed content');
    if (url) { try { new URL(url); } catch { errors.push('Invalid video URL'); } }
    if (errors.length) return Response.json({ valid: false, errors }, { status: 400 });
    return Response.json({ valid: true, message: 'Metadata validated' });
  } catch (error) {
    return Response.json({ error: 'Validation failed' }, { status: 500 });
  }
});