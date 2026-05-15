/* eslint-disable no-undef */
// ═══ CONVERTED: setupMobileScreenShare ═══
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { device_type, integration_type = 'mobile_screen_share', quality_preset = 'high' } = await req.json();
    const { data: existing } = await supabase.from('gaming_integration').select('*').eq('creator_id', user.email).eq('integration_type', integration_type).eq('device_type', device_type).limit(1);

    let integration;
    if ((existing||[])[0]) {
      const { data: updated } = await supabase.from('gaming_integration').update({ is_active: true, last_used: new Date().toISOString(), quality_preset }).eq('id', existing[0].id).select().single();
      integration = updated;
    } else {
      const { data: created } = await supabase.from('gaming_integration').insert({ creator_id: user.email, integration_type, device_type, quality_preset, is_active: true, bitrate_kbps: quality_preset === 'ultra' ? 5000 : quality_preset === 'high' ? 2500 : 1500 }).select().single();
      integration = created;
    }
    return Response.json({ success: true, integration_id: integration?.id, device_type, quality_preset, bitrate_kbps: integration?.bitrate_kbps });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});