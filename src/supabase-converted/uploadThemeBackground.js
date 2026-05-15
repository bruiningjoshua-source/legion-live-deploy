/* eslint-disable no-undef */
// ═══ CONVERTED: uploadThemeBackground ═══
// NOTE: Uses Supabase Storage instead of Base44 UploadFile integration.
import { createClient } from 'npm:@supabase/supabase-js@2';

Deno.serve(async (req) => {
  try {
    const supabase = createClient(Deno.env.get('SUPABASE_URL'), Deno.env.get('SUPABASE_SERVICE_KEY'));
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof File)) return Response.json({ error: 'No file provided' }, { status: 400 });
    if (!file.type.startsWith('image/')) return Response.json({ error: 'File must be an image' }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return Response.json({ error: 'File must be < 5MB' }, { status: 400 });

    const ext = file.name.split('.').pop() || 'png';
    const path = `themes/${user.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from('uploads').upload(path, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: urlData } = supabase.storage.from('uploads').getPublicUrl(path);

    return Response.json({ file_url: urlData.publicUrl, file_name: file.name });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});